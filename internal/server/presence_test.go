package server_test

import (
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tests"
	"github.com/pocketbase/pocketbase/tools/subscriptions"

	"arkanum/internal/hooks"
	"arkanum/internal/server"
)

const presenceCard = "presencecard000"

type presenceFixture struct {
	dir                  string
	owner, editor, other string
}

func buildPresenceFixture(t *testing.T) presenceFixture {
	t.Helper()
	dir, err := os.MkdirTemp("", "arkanum-presence-")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(dir) })

	app := core.NewBaseApp(core.BaseAppConfig{DataDir: dir, EncryptionEnv: "pb_test_env"})
	if err := app.Bootstrap(); err != nil {
		t.Fatal(err)
	}
	defer app.ClearBootstrap()
	if err := app.RunAllMigrations(); err != nil {
		t.Fatal(err)
	}
	hooks.Register(app)

	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		t.Fatal(err)
	}
	ids := map[string]string{}
	tokens := map[string]string{}
	for _, handle := range []string{"owner", "editor", "other"} {
		record := core.NewRecord(users)
		record.Set("handle", handle)
		record.SetEmail(handle + "@example.com")
		record.SetPassword("correct-horse-battery")
		if err := app.Save(record); err != nil {
			t.Fatal(err)
		}
		token, err := record.NewAuthToken()
		if err != nil {
			t.Fatal(err)
		}
		ids[handle] = record.Id
		tokens[handle] = token
	}

	cards, err := app.FindCollectionByNameOrId("cards")
	if err != nil {
		t.Fatal(err)
	}
	card := core.NewRecord(cards)
	card.Id = presenceCard
	card.Set("owner", ids["owner"])
	card.Set("title", "Karta")
	card.Set("family", "tarot")
	card.Set("formatW", 70)
	card.Set("formatH", 120)
	card.Set("visibility", "private")
	card.Set("editors", []string{ids["editor"]})
	if err := app.Save(card); err != nil {
		t.Fatal(err)
	}

	return presenceFixture{dir: dir, owner: tokens["owner"], editor: tokens["editor"], other: tokens["other"]}
}

func TestPresenceRoutes(t *testing.T) {
	fixture := buildPresenceFixture(t)
	url := "/api/arkanum/presence/" + presenceCard

	factory := func(t testing.TB) *tests.TestApp {
		t.Helper()
		app, err := tests.NewTestApp(fixture.dir)
		if err != nil {
			t.Fatal(err)
		}
		server.Register(app, ui)
		return app
	}

	scenarios := []tests.ApiScenario{
		{Name: "guest is refused", Method: http.MethodPost, URL: url, ExpectedStatus: 401, ExpectedContent: []string{`"status":401`}},
		{
			Name:            "a stranger gets the same answer as for a missing card",
			Method:          http.MethodPost,
			URL:             url,
			Headers:         map[string]string{"Authorization": fixture.other},
			ExpectedStatus:  404,
			ExpectedContent: []string{`"status":404`},
		},
		{
			Name:            "unknown card",
			Method:          http.MethodPost,
			URL:             "/api/arkanum/presence/missing00000000",
			Headers:         map[string]string{"Authorization": fixture.owner},
			ExpectedStatus:  404,
			ExpectedContent: []string{`"status":404`},
		},
		{
			Name:            "the owner announces themselves",
			Method:          http.MethodPost,
			URL:             url,
			Headers:         map[string]string{"Authorization": fixture.owner},
			ExpectedStatus:  200,
			ExpectedContent: []string{`"handle":"owner"`},
		},
		{
			Name:            "an editor announces themselves",
			Method:          http.MethodPost,
			URL:             url,
			Headers:         map[string]string{"Authorization": fixture.editor},
			ExpectedStatus:  200,
			ExpectedContent: []string{`"handle":"editor"`},
		},
		{
			Name:           "leaving works",
			Method:         http.MethodDelete,
			URL:            url,
			Headers:        map[string]string{"Authorization": fixture.editor},
			ExpectedStatus: 204,
		},
	}

	for _, scenario := range scenarios {
		scenario.TestAppFactory = factory
		scenario.Test(t)
	}
}

func TestPresenceIsBroadcastToSubscribers(t *testing.T) {
	fixture := buildPresenceFixture(t)
	topic := "arkanum/presence/" + presenceCard

	listener := subscriptions.NewDefaultClient()
	listener.Subscribe(topic)
	stranger := subscriptions.NewDefaultClient()

	scenario := tests.ApiScenario{
		Name:            "a heartbeat reaches clients subscribed to the card",
		Method:          http.MethodPost,
		URL:             "/api/arkanum/presence/" + presenceCard,
		Headers:         map[string]string{"Authorization": fixture.owner},
		ExpectedStatus:  200,
		ExpectedContent: []string{`"handle":"owner"`},
		TestAppFactory: func(t testing.TB) *tests.TestApp {
			t.Helper()
			app, err := tests.NewTestApp(fixture.dir)
			if err != nil {
				t.Fatal(err)
			}
			server.Register(app, ui)
			app.SubscriptionsBroker().Register(listener)
			app.SubscriptionsBroker().Register(stranger)
			return app
		},
		AfterTestFunc: func(t testing.TB, _ *tests.TestApp, _ *http.Response) {
			t.Helper()
			select {
			case message := <-listener.Channel():
				if message.Name != topic || !strings.Contains(string(message.Data), `"handle":"owner"`) {
					t.Errorf("unexpected message %s: %s", message.Name, message.Data)
				}
			case <-time.After(5 * time.Second):
				t.Error("the subscribed client got no message")
			}
			select {
			case message := <-stranger.Channel():
				t.Errorf("a client without the subscription got %s", message.Name)
			case <-time.After(100 * time.Millisecond):
			}
		},
	}
	scenario.Test(t)
}
