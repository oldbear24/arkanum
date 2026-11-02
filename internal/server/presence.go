package server

import (
	"encoding/json"
	"net/http"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/routine"
	"github.com/pocketbase/pocketbase/tools/subscriptions"
)

const (
	// presenceTTL is how long a user counts as editing after the last heartbeat.
	// The workshop sends one every 20 seconds.
	presenceTTL = 45 * time.Second

	presenceRoute       = "/api/arkanum/presence/{card}"
	presenceTopicPrefix = "arkanum/presence/"
)

// presenceUser is one person with the workshop of a card open.
type presenceUser struct {
	ID          string `json:"id"`
	Handle      string `json:"handle"`
	DisplayName string `json:"displayName"`

	seen time.Time
}

// presenceHub remembers who edits which card. PocketBase realtime has no presence of
// its own. It is deliberately in memory: it lives and dies with the single binary.
type presenceHub struct {
	mu    sync.Mutex
	cards map[string]map[string]presenceUser
	now   func() time.Time
}

func newPresenceHub() *presenceHub {
	return &presenceHub{cards: map[string]map[string]presenceUser{}, now: time.Now}
}

func (h *presenceHub) touch(cardID string, user presenceUser) []presenceUser {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.cards[cardID] == nil {
		h.cards[cardID] = map[string]presenceUser{}
	}
	user.seen = h.now()
	h.cards[cardID][user.ID] = user
	return h.listLocked(cardID)
}

func (h *presenceHub) leave(cardID, userID string) []presenceUser {
	h.mu.Lock()
	defer h.mu.Unlock()

	delete(h.cards[cardID], userID)
	return h.listLocked(cardID)
}

// listLocked drops expired users. Every heartbeat comes through here, so people who
// closed the tab without saying goodbye disappear for those who are still there.
func (h *presenceHub) listLocked(cardID string) []presenceUser {
	users := make([]presenceUser, 0, len(h.cards[cardID]))
	for id, user := range h.cards[cardID] {
		if h.now().Sub(user.seen) > presenceTTL {
			delete(h.cards[cardID], id)
			continue
		}
		users = append(users, user)
	}
	if len(h.cards[cardID]) == 0 {
		delete(h.cards, cardID)
	}

	slices.SortFunc(users, func(a, b presenceUser) int { return strings.Compare(a.Handle, b.Handle) })
	return users
}

func (h *presenceHub) register(app core.App) {
	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		auth := apis.RequireAuth("users")
		e.Router.POST(presenceRoute, h.heartbeat).Bind(auth)
		e.Router.DELETE(presenceRoute, h.goodbye).Bind(auth)
		return e.Next()
	})

	// Only people who may edit the card can watch who else is editing it.
	app.OnRealtimeSubscribeRequest().BindFunc(func(e *core.RealtimeSubscribeRequestEvent) error {
		allowed := make([]string, 0, len(e.Subscriptions))
		for _, topic := range e.Subscriptions {
			name, _, _ := strings.Cut(topic, "?")
			if cardID, isPresence := strings.CutPrefix(name, presenceTopicPrefix); isPresence {
				if e.Auth == nil || !canEditCard(e.App, cardID, e.Auth.Id) {
					continue
				}
			}
			allowed = append(allowed, topic)
		}
		e.Subscriptions = allowed
		return e.Next()
	})
}

func (h *presenceHub) heartbeat(e *core.RequestEvent) error {
	cardID := e.Request.PathValue("card")
	if !canEditCard(e.App, cardID, e.Auth.Id) {
		return e.NotFoundError("", nil)
	}

	users := h.touch(cardID, presenceUser{
		ID:          e.Auth.Id,
		Handle:      e.Auth.GetString("handle"),
		DisplayName: e.Auth.GetString("displayName"),
	})
	h.broadcast(e.App, cardID, users)
	return e.JSON(http.StatusOK, map[string]any{"users": users})
}

func (h *presenceHub) goodbye(e *core.RequestEvent) error {
	cardID := e.Request.PathValue("card")
	h.broadcast(e.App, cardID, h.leave(cardID, e.Auth.Id))
	return e.NoContent(http.StatusNoContent)
}

func (h *presenceHub) broadcast(app core.App, cardID string, users []presenceUser) {
	data, err := json.Marshal(map[string]any{"users": users})
	if err != nil {
		app.Logger().Error("Failed to encode presence", "error", err)
		return
	}

	topic := presenceTopicPrefix + cardID
	message := subscriptions.Message{Name: topic, Data: data}
	for _, client := range app.SubscriptionsBroker().Clients() {
		if client.HasSubscription(topic) {
			// Send blocks until the client reads, a slow one must not hold up the request.
			routine.FireAndForget(func() { client.Send(message) })
		}
	}
}

func canEditCard(app core.App, cardID, userID string) bool {
	card, err := app.FindRecordById("cards", cardID)
	if err != nil {
		return false
	}
	return card.GetString("owner") == userID || slices.Contains(card.GetStringSlice("editors"), userID)
}
