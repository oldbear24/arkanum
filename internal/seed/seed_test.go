package seed_test

import (
	"io"
	"strings"
	"testing"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/tests"

	"arkanum/internal/hooks"
	"arkanum/internal/seed"
	_ "arkanum/migrations"
)

func TestRunIsRepeatable(t *testing.T) {
	app, err := tests.NewTestApp(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer app.Cleanup()
	hooks.Register(app)

	if err := seed.Run(app, "demo-password", io.Discard); err != nil {
		t.Fatal(err)
	}

	counts := func() map[string]int64 {
		result := map[string]int64{}
		for _, name := range []string{"users", "cards", "decks", "likes"} {
			total, err := app.CountRecords(name)
			if err != nil {
				t.Fatal(err)
			}
			result[name] = total
		}
		return result
	}

	first := counts()
	if first["cards"] < 25 {
		t.Errorf("expected enough cards for more than one gallery page, got %d", first["cards"])
	}

	if err := seed.Run(app, "demo-password", io.Discard); err != nil {
		t.Fatal(err)
	}
	for name, total := range counts() {
		if total != first[name] {
			t.Errorf("%s: %d records after the first run, %d after the second", name, first[name], total)
		}
	}

	// The most liked card from the design has a like from every demo account.
	bludicka, err := app.FindFirstRecordByData("cards", "title", "Bludička")
	if err != nil {
		t.Fatal(err)
	}
	if got := bludicka.GetInt("likesCount"); got != 8 {
		t.Errorf("Bludička: expected 8 likes, got %d", got)
	}

	var names []string
	records, err := app.FindRecordsByFilter("cards", "visibility = 'public'", "-likesCount", 3, 0, dbx.Params{})
	if err != nil {
		t.Fatal(err)
	}
	for _, record := range records {
		names = append(names, record.GetString("title"))
	}
	if got := strings.Join(names, ", "); got != "Bludička, Hvězda, Strážkyně brány" {
		t.Errorf("unexpected most liked cards: %s", got)
	}
}

func TestRunGeneratesAPasswordWhenNoneIsGiven(t *testing.T) {
	app, err := tests.NewTestApp(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer app.Cleanup()
	hooks.Register(app)

	var out strings.Builder
	if err := seed.Run(app, "", &out); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out.String(), "generated password") {
		t.Errorf("expected the generated password in the output, got: %s", out.String())
	}

	demo, err := app.FindFirstRecordByData("users", "handle", "demo")
	if err != nil {
		t.Fatal(err)
	}
	if demo.ValidatePassword("arkanum-dev") {
		t.Error("the production path must not use the development password")
	}
}
