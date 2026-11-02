package hooks_test

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/pocketbase/pocketbase/tests"
)

func newCardBody(owner, extra string) string {
	return fmt.Sprintf(`{"owner":%q,"title":"Nová","family":"tarot","formatW":70,"formatH":120%s}`, owner, extra)
}

func TestCardsAccess(t *testing.T) {
	const notFound = http.StatusNotFound

	runCalls(t, []call{
		{name: "guest cannot view a private card", url: cardURL(cardPrivate), status: notFound},
		{name: "stranger cannot view a private card", as: bob, url: cardURL(cardPrivate), status: notFound},
		{name: "owner views a private card", as: alice, url: cardURL(cardPrivate), status: 200},
		{name: "guest cannot view a private shared card", url: cardURL(cardShared), status: notFound},
		{name: "stranger cannot view a private shared card", as: bob, url: cardURL(cardShared), status: notFound},
		{name: "editor views a private shared card", as: eve, url: cardURL(cardShared), status: 200},
		{name: "editor cannot view other private cards", as: eve, url: cardURL(cardPrivate), status: notFound},

		{name: "guest views an unlisted card", url: cardURL(cardUnlisted), status: 200},
		{name: "guest views a public card", url: cardURL(cardPublic), status: 200},

		{
			name:   "guest lists only public cards",
			url:    "/api/collections/cards/records",
			status: 200,
			has:    []string{`"totalItems":1`, cardPublic},
			hasNot: []string{cardPrivate, cardUnlisted, cardShared},
		},
		{
			name:   "stranger lists only public cards",
			as:     bob,
			url:    "/api/collections/cards/records",
			status: 200,
			has:    []string{`"totalItems":1`, cardPublic},
			hasNot: []string{cardPrivate, cardUnlisted, cardShared},
		},
		{
			name:   "editor also lists the shared card",
			as:     eve,
			url:    "/api/collections/cards/records",
			status: 200,
			has:    []string{`"totalItems":2`, cardPublic, cardShared},
			hasNot: []string{cardPrivate, cardUnlisted},
		},
		{
			name:   "owner lists everything",
			as:     alice,
			url:    "/api/collections/cards/records",
			status: 200,
			has:    []string{`"totalItems":4`},
		},
	})
}

func TestCardsCreate(t *testing.T) {
	const url = "/api/collections/cards/records"

	runCalls(t, []call{
		{name: "guest cannot create", method: http.MethodPost, url: url, body: newCardBody("", ""), status: 400},
		{name: "cannot create for someone else", as: bob, method: http.MethodPost, url: url, body: newCardBody(alice, ""), status: 400},
		{name: "cannot preset likesCount", as: bob, method: http.MethodPost, url: url, body: newCardBody(bob, `,"likesCount":9`), status: 400},
		{name: "cannot preset likesCount with a modifier", as: bob, method: http.MethodPost, url: url, body: newCardBody(bob, `,"likesCount+":9`), status: 400},
		{
			name:   "a new card defaults to private",
			as:     bob,
			method: http.MethodPost,
			url:    url,
			body:   newCardBody(bob, ""),
			status: 200,
			has:    []string{`"visibility":"private"`, `"likesCount":0`},
		},
		{name: "empty visibility cannot be forced", as: bob, method: http.MethodPost, url: url, body: newCardBody(bob, `,"visibility":""`), status: 200, has: []string{`"visibility":"private"`}},
	})
}

func TestCardsUpdate(t *testing.T) {
	patch := func(name, as, id, body string, status int, has ...string) call {
		return call{name: name, as: as, method: http.MethodPatch, url: cardURL(id), body: body, status: status, has: has}
	}
	const notFound = http.StatusNotFound

	runCalls(t, []call{
		patch("guest cannot update a card without editors", "", cardPrivate, `{"title":"x"}`, notFound),
		patch("guest cannot update a public card", "", cardPublic, `{"title":"x"}`, notFound),
		patch("stranger cannot update", bob, cardPublic, `{"title":"x"}`, notFound),
		patch("owner updates the title", alice, cardPrivate, `{"title":"Nový název"}`, 200, `"title":"Nový název"`),
		patch("editor updates the title", eve, cardShared, `{"title":"Od spoluautora"}`, 200, `"title":"Od spoluautora"`),

		patch("owner cannot change the owner", alice, cardPrivate, fmt.Sprintf(`{"owner":%q}`, bob), notFound),
		patch("editor cannot change the owner", eve, cardShared, fmt.Sprintf(`{"owner":%q}`, eve), notFound),
		patch("owner cannot change likesCount", alice, cardPublic, `{"likesCount":99}`, notFound),
		patch("owner cannot change likesCount with +", alice, cardPublic, `{"likesCount+":99}`, notFound),
		patch("owner cannot change likesCount with -", alice, cardPublic, `{"likesCount-":1}`, notFound),
		patch("editor cannot change likesCount", eve, cardShared, `{"likesCount":99}`, notFound),

		patch("owner publishes", alice, cardShared, `{"visibility":"public"}`, 200, `"visibility":"public"`),
		patch("editor cannot change visibility", eve, cardShared, `{"visibility":"public"}`, notFound),
		patch("editor cannot change editors", eve, cardShared, fmt.Sprintf(`{"editors":[%q,%q]}`, eve, bob), notFound),
		patch("editor cannot append to editors", eve, cardShared, fmt.Sprintf(`{"editors+":%q}`, bob), notFound),
		patch("editor cannot prepend to editors", eve, cardShared, fmt.Sprintf(`{"+editors":%q}`, bob), notFound),
		patch("editor cannot remove from editors", eve, cardShared, fmt.Sprintf(`{"editors-":%q}`, eve), notFound),
		patch("owner adds an editor", alice, cardShared, fmt.Sprintf(`{"editors+":%q}`, bob), 200, bob),
		patch("visibility cannot be emptied", alice, cardPrivate, `{"visibility":""}`, 400),
	})
}

func TestCardsDelete(t *testing.T) {
	del := func(name, as, id string, status int) call {
		return call{name: name, as: as, method: http.MethodDelete, url: cardURL(id), status: status}
	}

	runCalls(t, []call{
		del("guest cannot delete", "", cardPublic, http.StatusNotFound),
		del("stranger cannot delete", bob, cardPublic, http.StatusNotFound),
		del("editor cannot delete", eve, cardShared, http.StatusNotFound),
		del("owner deletes", alice, cardPublic, http.StatusNoContent),
	})
}

func TestCardsValidation(t *testing.T) {
	patch := func(name, body string, status int, has ...string) call {
		return call{name: name, as: alice, method: http.MethodPatch, url: cardURL(cardPrivate), body: body, status: status, has: has}
	}

	runCalls(t, []call{
		patch("valid data", `{"look":{"variant":"tarot","foil":"duha","thick":4},"content":{"hp":70},"meaning":{"arcana":"mala"}}`, 200),
		patch("unknown enum value", `{"look":{"foil":"chrom"}}`, 400, `"look"`),
		patch("number out of range", `{"look":{"thick":99}}`, 400, `"look"`),
		patch("look of a wrong type", `{"look":[1,2]}`, 400, `"look"`),
		patch("content out of range", `{"content":{"hp":1000}}`, 400, `"content"`),
		patch("text too long", `{"content":{"numeral":"XXXXXXXXXXXX"}}`, 400, `"content"`),
		patch("meaning out of range", `{"meaning":{"arcana":"nic"}}`, 400, `"meaning"`),
		patch("transform out of range", `{"artworkTransform":{"zoom":9}}`, 400, `"artworkTransform"`),
		patch("variant must match family", `{"look":{"variant":"bestie"}}`, 400, `"look"`),
		patch("title too long", `{"title":"12345678901234567890123456789"}`, 400, `"title"`),
		patch("format out of range", `{"formatW":20}`, 400, `"formatW"`),
		patch("unknown family", `{"family":"sachy"}`, 400, `"family"`),
	})
}

func TestLikes(t *testing.T) {
	const url = "/api/collections/likes/records"
	body := func(user, card string) string {
		return fmt.Sprintf(`{"user":%q,"card":%q}`, user, card)
	}
	expectCount := func(card string, want int) func(testing.TB, *tests.TestApp) {
		return func(t testing.TB, app *tests.TestApp) {
			t.Helper()
			if got := likesCount(t, app, card); got != want {
				t.Errorf("likesCount of %s: expected %d, got %d", card, want, got)
			}
		}
	}

	runCalls(t, []call{
		{name: "anyone lists likes", url: url, status: 200, has: []string{bobLike}},
		{name: "guest cannot like", method: http.MethodPost, url: url, body: body("", cardPublic), status: 400},
		{name: "cannot like as someone else", as: alice, method: http.MethodPost, url: url, body: body(bob, cardPublic), status: 400},
		{
			name:   "double like fails",
			as:     bob,
			method: http.MethodPost,
			url:    url,
			body:   body(bob, cardPublic),
			status: 400,
			after:  expectCount(cardPublic, 1),
		},
		{
			name:   "a like increases the count",
			as:     eve,
			method: http.MethodPost,
			url:    url,
			body:   body(eve, cardPublic),
			status: 200,
			after:  expectCount(cardPublic, 2),
		},
		{
			name:   "an unlike decreases the count",
			as:     bob,
			method: http.MethodDelete,
			url:    url + "/" + bobLike,
			status: http.StatusNoContent,
			after:  expectCount(cardPublic, 0),
		},
		{name: "cannot delete someone else's like", as: eve, method: http.MethodDelete, url: url + "/" + bobLike, status: http.StatusNotFound},
		{name: "likes cannot be updated", as: bob, method: http.MethodPatch, url: url + "/" + bobLike, body: `{"card":"x"}`, status: http.StatusForbidden},
		{name: "a private card cannot be liked by a stranger", as: bob, method: http.MethodPost, url: url, body: body(bob, cardPrivate), status: http.StatusNotFound},
		{
			name:   "an editor can like a private shared card",
			as:     eve,
			method: http.MethodPost,
			url:    url,
			body:   body(eve, cardShared),
			status: 200,
			after:  expectCount(cardShared, 1),
		},
	})
}

func TestLikesCountSurvivesCardEdits(t *testing.T) {
	runCalls(t, []call{{
		name:   "saving a card keeps its likes",
		as:     alice,
		method: http.MethodPatch,
		url:    cardURL(cardPublic),
		body:   `{"title":"Přejmenovaná"}`,
		status: 200,
		has:    []string{`"likesCount":1`},
	}})
}

func TestDeletingACardRemovesItsLikes(t *testing.T) {
	runCalls(t, []call{{
		name:   "owner deletes a liked card",
		as:     alice,
		method: http.MethodDelete,
		url:    cardURL(cardPublic),
		status: http.StatusNoContent,
		after: func(t testing.TB, app *tests.TestApp) {
			t.Helper()
			total, err := app.CountRecords("likes")
			if err != nil {
				t.Fatal(err)
			}
			if total != 0 {
				t.Errorf("expected the like to be removed, %d left", total)
			}
		},
	}})
}

func TestUsers(t *testing.T) {
	const url = "/api/collections/users/records"
	register := func(handle string) string {
		return fmt.Sprintf(`{"handle":%q,"email":"new@example.com","password":"correct-horse-battery","passwordConfirm":"correct-horse-battery"}`, handle)
	}

	runCalls(t, []call{
		{name: "profiles are public", url: url, status: 200, has: []string{`"handle":"alice"`}, hasNot: []string{"alice@example.com"}},
		{name: "a profile is public", url: url + "/" + alice, status: 200, has: []string{`"handle":"alice"`}, hasNot: []string{"alice@example.com"}},
		{name: "email cannot be probed with a filter", url: url + `?filter=email~'alice'`, status: 200, has: []string{`"totalItems":0`}},
		{name: "cards expand the owner without the email", url: cardURL(cardPublic) + "?expand=owner", status: 200, has: []string{`"handle":"alice"`}, hasNot: []string{"alice@example.com"}},

		{name: "registration works", method: http.MethodPost, url: url, body: register("nova_uzivatelka"), status: 200, has: []string{`"handle":"nova_uzivatelka"`}},
		{name: "a handle cannot have capitals", method: http.MethodPost, url: url, body: register("Alice"), status: 400, has: []string{`"handle"`}},
		{name: "a handle cannot be too short", method: http.MethodPost, url: url, body: register("ab"), status: 400, has: []string{`"handle"`}},
		{name: "a handle cannot be too long", method: http.MethodPost, url: url, body: register("abcdefghijklmnopqrstuvwxy"), status: 400, has: []string{`"handle"`}},
		{name: "a handle must be unique", method: http.MethodPost, url: url, body: register("alice"), status: 400, has: []string{`"handle"`}},
		{
			name:   "a missing handle is generated",
			method: http.MethodPost,
			url:    url,
			body:   `{"email":"oauth.user@example.com","password":"correct-horse-battery","passwordConfirm":"correct-horse-battery"}`,
			status: 200,
			has:    []string{`"handle":"oauth_user"`, `"displayName":"oauth_user"`},
		},

		{name: "a stranger cannot edit a profile", as: bob, method: http.MethodPatch, url: url + "/" + alice, body: `{"displayName":"x"}`, status: http.StatusNotFound},
		{name: "the owner edits a profile", as: alice, method: http.MethodPatch, url: url + "/" + alice, body: `{"displayName":"Alice"}`, status: 200, has: []string{`"displayName":"Alice"`}},
		{
			name:   "emailVisibility cannot be turned on",
			as:     alice,
			method: http.MethodPatch,
			url:    url + "/" + alice,
			body:   `{"emailVisibility":true}`,
			status: 200,
			has:    []string{`"emailVisibility":false`},
			after: func(t testing.TB, app *tests.TestApp) {
				t.Helper()
				record, err := app.FindRecordById("users", alice)
				if err != nil {
					t.Fatal(err)
				}
				if record.EmailVisibility() {
					t.Error("emailVisibility was stored as true")
				}
			},
		},
	})
}

func TestTemplates(t *testing.T) {
	const url = "/api/collections/templates/records"
	newTemplate := func(author, extra string) string {
		return fmt.Sprintf(`{"name":"Moje","slug":"moje","family":"tarot","formatW":70,"formatH":120,"author":%q,"visibility":"private"%s}`, author, extra)
	}

	runCalls(t, []call{
		{
			name:   "guest sees the five system templates only",
			url:    url,
			status: 200,
			has:    []string{`"totalItems":5`, `"slug":"tarot"`, `"slug":"orakulum"`, `"slug":"bestie"`, `"slug":"hrdina"`, `"slug":"prazdna"`},
			hasNot: []string{templatePrivate},
		},
		{name: "stranger cannot view a private template", as: bob, url: url + "/" + templatePrivate, status: http.StatusNotFound},
		{name: "author views a private template", as: alice, url: url + "/" + templatePrivate, status: 200},
		{name: "guest cannot create", method: http.MethodPost, url: url, body: newTemplate("", ""), status: 400},
		{name: "cannot create for someone else", as: bob, method: http.MethodPost, url: url, body: newTemplate(alice, ""), status: 400},
		{name: "cannot create a system template", as: bob, method: http.MethodPost, url: url, body: newTemplate(bob, `,"system":true`), status: 400},
		{name: "creates an own template", as: bob, method: http.MethodPost, url: url, body: newTemplate(bob, ""), status: 200},
		{name: "defaults are validated", as: bob, method: http.MethodPost, url: url, body: newTemplate(bob, `,"defaults":{"look":{"foil":"chrom"}}`), status: 400, has: []string{`"defaults"`}},
		{name: "author updates an own template", as: alice, method: http.MethodPatch, url: url + "/" + templatePrivate, body: `{"name":"Nová"}`, status: 200},
		{name: "author cannot promote to a system template", as: alice, method: http.MethodPatch, url: url + "/" + templatePrivate, body: `{"system":true}`, status: http.StatusNotFound},
		{name: "author cannot give a template away", as: alice, method: http.MethodPatch, url: url + "/" + templatePrivate, body: fmt.Sprintf(`{"author":%q}`, bob), status: http.StatusNotFound},
		{name: "stranger cannot update", as: bob, method: http.MethodPatch, url: url + "/" + templatePrivate, body: `{"name":"x"}`, status: http.StatusNotFound},
		{name: "author deletes", as: alice, method: http.MethodDelete, url: url + "/" + templatePrivate, status: http.StatusNoContent},
	})
}

func TestSystemTemplatesAreReadOnly(t *testing.T) {
	const url = "/api/collections/templates/records"

	app := newApp(t)
	defer app.Cleanup()
	tarot, err := app.FindFirstRecordByData("templates", "slug", "tarot")
	if err != nil {
		t.Fatal(err)
	}

	runCalls(t, []call{
		{name: "nobody updates a system template", as: alice, method: http.MethodPatch, url: url + "/" + tarot.Id, body: `{"name":"x"}`, status: http.StatusNotFound},
		{name: "nobody deletes a system template", as: alice, method: http.MethodDelete, url: url + "/" + tarot.Id, status: http.StatusNotFound},
	})
}

func TestDecks(t *testing.T) {
	const url = "/api/collections/decks/records"
	newDeck := func(owner, extra string) string {
		return fmt.Sprintf(`{"owner":%q,"name":"Balíček"%s}`, owner, extra)
	}

	runCalls(t, []call{
		{name: "guest lists only public decks", url: url, status: 200, has: []string{`"totalItems":1`, deckPublic}, hasNot: []string{deckPrivate}},
		{name: "guest cannot view a private deck", url: url + "/" + deckPrivate, status: http.StatusNotFound},
		{name: "stranger cannot view a private deck", as: bob, url: url + "/" + deckPrivate, status: http.StatusNotFound},
		{name: "owner views a private deck", as: alice, url: url + "/" + deckPrivate, status: 200},
		{name: "guest cannot create", method: http.MethodPost, url: url, body: newDeck("", ""), status: 400},
		{name: "cannot create for someone else", as: bob, method: http.MethodPost, url: url, body: newDeck(alice, ""), status: 400},
		{name: "a new deck defaults to private", as: bob, method: http.MethodPost, url: url, body: newDeck(bob, ""), status: 200, has: []string{`"visibility":"private"`}},
		{name: "the back is validated", as: bob, method: http.MethodPost, url: url, body: newDeck(bob, `,"back":{"palette":"modra"}`), status: 400, has: []string{`"back"`}},
		{name: "owner updates", as: alice, method: http.MethodPatch, url: url + "/" + deckPublic, body: `{"name":"Nový název"}`, status: 200},
		{name: "owner cannot give a deck away", as: alice, method: http.MethodPatch, url: url + "/" + deckPublic, body: fmt.Sprintf(`{"owner":%q}`, bob), status: http.StatusNotFound},
		{name: "stranger cannot update", as: bob, method: http.MethodPatch, url: url + "/" + deckPublic, body: `{"name":"x"}`, status: http.StatusNotFound},
		{name: "guest cannot update", method: http.MethodPatch, url: url + "/" + deckPublic, body: `{"name":"x"}`, status: http.StatusNotFound},
		{name: "stranger cannot delete", as: bob, method: http.MethodDelete, url: url + "/" + deckPublic, status: http.StatusNotFound},
		{name: "owner deletes", as: alice, method: http.MethodDelete, url: url + "/" + deckPublic, status: http.StatusNoContent},
	})
}
