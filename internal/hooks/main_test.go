package hooks_test

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"testing"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tests"

	"arkanum/internal/hooks"
	_ "arkanum/migrations"
)

// Fixture ids. PocketBase ids are exactly 15 lowercase alphanumeric characters.
const (
	alice = "aliceaaaaaaaaaa" // owns the cards below
	bob   = "bobbbbbbbbbbbbb" // a stranger
	eve   = "eveeeeeeeeeeeee" // an editor of cardShared

	cardPrivate  = "cardprivate0000"
	cardUnlisted = "cardunlisted000"
	cardPublic   = "cardpublic00000"
	cardShared   = "cardshared00000"

	deckPrivate = "deckprivate0000"
	deckPublic  = "deckpublic00000"

	bobLike = "boblike00000000"

	templatePrivate = "tplprivate00000"
)

var (
	fixtureDir string
	tokens     = map[string]string{}
)

func TestMain(m *testing.M) {
	dir, err := os.MkdirTemp("", "arkanum-fixture-")
	if err != nil {
		panic(err)
	}
	fixtureDir = dir

	if err := buildFixture(dir); err != nil {
		panic(err)
	}

	code := m.Run()
	_ = os.RemoveAll(dir)
	os.Exit(code)
}

func buildFixture(dir string) error {
	app := core.NewBaseApp(core.BaseAppConfig{DataDir: dir, EncryptionEnv: "pb_test_env"})
	if err := app.Bootstrap(); err != nil {
		return err
	}
	defer app.ClearBootstrap()
	if err := app.RunAllMigrations(); err != nil {
		return err
	}
	hooks.Register(app)

	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return err
	}
	for id, handle := range map[string]string{alice: "alice", bob: "bob", eve: "eve"} {
		record := core.NewRecord(users)
		record.Id = id
		record.Set("handle", handle)
		record.SetEmail(handle + "@example.com")
		record.SetPassword("correct-horse-battery")
		if err := app.Save(record); err != nil {
			return fmt.Errorf("user %s: %w", id, err)
		}
		token, err := record.NewAuthToken()
		if err != nil {
			return err
		}
		tokens[id] = token
	}

	cards, err := app.FindCollectionByNameOrId("cards")
	if err != nil {
		return err
	}
	for _, fixture := range []struct {
		id, visibility string
		editors        []string
	}{
		{cardPrivate, "private", nil},
		{cardUnlisted, "unlisted", nil},
		{cardPublic, "public", nil},
		{cardShared, "private", []string{eve}},
	} {
		record := core.NewRecord(cards)
		record.Id = fixture.id
		record.Set("owner", alice)
		record.Set("title", fixture.id)
		record.Set("family", "tarot")
		record.Set("formatW", 70)
		record.Set("formatH", 120)
		record.Set("visibility", fixture.visibility)
		record.Set("editors", fixture.editors)
		if err := app.Save(record); err != nil {
			return fmt.Errorf("card %s: %w", fixture.id, err)
		}
	}

	decks, err := app.FindCollectionByNameOrId("decks")
	if err != nil {
		return err
	}
	for id, visibility := range map[string]string{deckPrivate: "private", deckPublic: "public"} {
		record := core.NewRecord(decks)
		record.Id = id
		record.Set("owner", alice)
		record.Set("name", id)
		record.Set("visibility", visibility)
		if err := app.Save(record); err != nil {
			return fmt.Errorf("deck %s: %w", id, err)
		}
	}

	likes, err := app.FindCollectionByNameOrId("likes")
	if err != nil {
		return err
	}
	like := core.NewRecord(likes)
	like.Id = bobLike
	like.Set("user", bob)
	like.Set("card", cardPublic)
	if err := app.Save(like); err != nil {
		return fmt.Errorf("like: %w", err)
	}

	templates, err := app.FindCollectionByNameOrId("templates")
	if err != nil {
		return err
	}
	template := core.NewRecord(templates)
	template.Id = templatePrivate
	template.Set("name", "Soukromá")
	template.Set("slug", "alice-private")
	template.Set("family", "tarot")
	template.Set("formatW", 70)
	template.Set("formatH", 120)
	template.Set("author", alice)
	template.Set("visibility", "private")
	if err := app.Save(template); err != nil {
		return fmt.Errorf("template: %w", err)
	}

	return nil
}

func newApp(t testing.TB) *tests.TestApp {
	t.Helper()
	app, err := tests.NewTestApp(fixtureDir)
	if err != nil {
		t.Fatal(err)
	}
	hooks.Register(app)
	return app
}

// call describes one API request made by a fixture user ("" stands for a guest).
type call struct {
	name   string
	as     string
	method string
	url    string
	body   string
	status int
	has    []string
	hasNot []string
	after  func(t testing.TB, app *tests.TestApp)
}

func runCalls(t *testing.T, calls []call) {
	t.Helper()
	for _, c := range calls {
		scenario := tests.ApiScenario{
			Name:               c.name,
			Method:             c.method,
			URL:                c.url,
			ExpectedStatus:     c.status,
			ExpectedContent:    c.has,
			NotExpectedContent: c.hasNot,
			TestAppFactory:     newApp,
		}
		if c.method == "" {
			scenario.Method = http.MethodGet
		}
		if len(c.has) == 0 && len(c.hasNot) == 0 && c.status != http.StatusNoContent {
			// The harness requires an expectation for non-empty bodies.
			scenario.ExpectedContent = []string{"{"}
		}
		if c.body != "" {
			scenario.Body = strings.NewReader(c.body)
			scenario.Headers = map[string]string{"Content-Type": "application/json"}
		}
		if c.as != "" {
			if scenario.Headers == nil {
				scenario.Headers = map[string]string{}
			}
			scenario.Headers["Authorization"] = tokens[c.as]
		}
		if c.after != nil {
			after := c.after
			scenario.AfterTestFunc = func(t testing.TB, app *tests.TestApp, _ *http.Response) {
				after(t, app)
			}
		}
		scenario.Test(t)
	}
}

func cardURL(id string) string {
	return "/api/collections/cards/records/" + id
}

func likesCount(t testing.TB, app *tests.TestApp, cardID string) int {
	t.Helper()
	record, err := app.FindRecordById("cards", cardID)
	if err != nil {
		t.Fatal(err)
	}
	return record.GetInt("likesCount")
}
