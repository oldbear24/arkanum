package server

import (
	"testing"
	"time"
)

func TestPresenceHub(t *testing.T) {
	now := time.Date(2026, 11, 2, 12, 0, 0, 0, time.UTC)
	hub := newPresenceHub()
	hub.now = func() time.Time { return now }

	handles := func(users []presenceUser) []string {
		result := []string{}
		for _, user := range users {
			result = append(result, user.Handle)
		}
		return result
	}
	expect := func(t *testing.T, users []presenceUser, want ...string) {
		t.Helper()
		got := handles(users)
		if len(got) != len(want) {
			t.Fatalf("expected %v, got %v", want, got)
		}
		for i := range want {
			if got[i] != want[i] {
				t.Fatalf("expected %v, got %v", want, got)
			}
		}
	}

	vrana := presenceUser{ID: "v", Handle: "vrana"}
	lada := presenceUser{ID: "l", Handle: "lada"}

	expect(t, hub.touch("card", vrana), "vrana")
	expect(t, hub.touch("card", lada), "lada", "vrana")
	expect(t, hub.touch("other", lada), "lada")

	// A repeated heartbeat keeps one entry per user.
	expect(t, hub.touch("card", lada), "lada", "vrana")

	expect(t, hub.leave("card", "l"), "vrana")

	// Someone who stopped sending heartbeats expires for the others.
	now = now.Add(presenceTTL + time.Second)
	expect(t, hub.touch("card", lada), "lada")

	// A card nobody watches is forgotten.
	expect(t, hub.leave("card", "l"))
	now = now.Add(presenceTTL + time.Second)
	expect(t, hub.leave("other", "nobody"))
	if len(hub.cards) != 0 {
		t.Errorf("expected no cards left, got %v", hub.cards)
	}
}
