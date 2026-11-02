// Package seed creates demo accounts, cards and decks for local development.
package seed

import (
	"database/sql"
	"errors"
	"fmt"
	"io"
	"maps"
	"os"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/security"
	"github.com/spf13/cobra"

	"arkanum/cardspec"
)

// Handles of the demo accounts. Likes are handed out in this order, so a card
// with `likes: 3` is liked by the first three of them.
var handles = []string{"demo", "noctua", "bludny_kamen", "sudicka", "kovarna", "lada", "alchymista", "vrana"}

type obj = map[string]any

type demoCard struct {
	owner      string
	title      string
	family     string
	look       obj
	content    obj
	meaning    obj
	likes      int
	visibility string
	editors    []string
	format     [2]int
}

// demoCards go from the oldest to the newest, the last ones lead the gallery.
// The eight at the end are the examples from the design.
var demoCards = []demoCard{
	{owner: "demo", title: "Rozpracovaná karta", family: "tarot", visibility: "private", look: obj{"art": "mesic", "palette": "krev"}},
	{owner: "demo", title: "Pro přátele", family: "orakulum", visibility: "unlisted", content: obj{"subtitle": "Sdílená radost je dvojnásobná."}},
	{owner: "noctua", title: "Společná práce", family: "hrdina", visibility: "private", editors: []string{"demo"}, content: obj{"subtitle": "Dvě hlavy, jeden meč.", "cls": "Bard · Vzácná"}},
	{owner: "demo", title: "Pozvánka", family: "prazdna", visibility: "public", format: [2]int{70, 70}, content: obj{"subtitle": "Sejdeme se o slunovratu.", "elements": []any{
		obj{"id": "slunce", "type": "symbol", "kind": "slunce", "x": 50, "y": 22, "size": 22},
		obj{"id": "linka", "type": "ornament", "kind": "linka", "x": 50, "y": 68, "size": 62},
		obj{"id": "stin", "type": "symbol", "kind": "mesic", "x": 12, "y": 12, "size": 10, "rotate": -20, "opacity": 70},
	}}, look: obj{"palette": "smaragd", "edge": "zlata"}},

	tarot("noctua", "Velekněžka", "II", "knezka", "smaragd", "minimal", "zlata"),
	tarot("sudicka", "Císařovna", "III", "slunce", "pulnoc", "secese", "duha"),
	tarot("alchymista", "Císař", "IV", "mag", "krev", "deco", "zlata"),
	tarot("sudicka", "Poustevník", "IX", "poustevnik", "pergamen", "gotika", "zadna"),
	tarot("noctua", "Kolo štěstí", "X", "kolo", "smaragd", "luna", "galaxie"),
	tarot("alchymista", "Síla", "VIII", "mag", "pulnoc", "secese", "duha"),
	tarot("sudicka", "Soud", "XX", "hvezda", "krev", "gotika", "zlata"),
	tarot("noctua", "Svět", "XXI", "svet", "ametyst", "baroko", "kosmos"),

	beast("bludny_kamen", "Mlžný jelen", "mlha", "duch hvozdu · Mlha", 90, 4, 3, "Zatmění", 30, "Bytost se na jedno kolo skryje.", "Parohy", 60, "Zasáhne bytost v první řadě."),
	beast("bludny_kamen", "Žhavý mlok", "ohen", "podzemní plaz · Oheň", 50, 2, 1, "Jiskra", 10, "Sousední bytost získá +1 útok.", "Výheň", 40, "Odhoď kartu a zasáhni všechny."),
	beast("kovarna", "Kapradinový skřet", "les", "lesní rošťák · Les", 60, 2, 2, "Šlahoun", 20, "Soupeř příště nezaútočí.", "Výhonek", 30, "Vyléč jedné bytosti 20 životů."),
	beast("kovarna", "Bouřňák", "blesk", "strážce hřebene · Blesk", 80, 3, 2, "Výboj", 30, "Přeskočí na další bytost.", "Hrom", 70, "Omráčí bytost na jedno kolo."),
	beast("bludny_kamen", "Stínokočka", "stin", "noční lovec · Stín", 70, 5, 1, "Plížení", 20, "Nelze ji zaměřit první kolo.", "Drápy tmy", 50, "Zasáhne bytost bez obrany."),

	hero("kovarna", "Kovář run", "Řemeslník · Vzácná", "Co ukuješ dnes, ponese někdo zítra.", 4, 5, 3, 4, "Runová čepel", "Zbraň tvé bytosti získá +2 sílu."),
	hero("vrana", "Lovkyně stínů", "Zvěd · Vzácná", "Tma má oči, stačí se dívat.", 3, 5, 2, 3, "Tichá stopa", "Příští útok nelze zablokovat."),
	hero("vrana", "Bratr Ambrož", "Kněz · Běžná", "Ticho odpoví, když se ptáš správně.", 2, 1, 4, 5, "Požehnání", "Vyléč všechny své bytosti o 1."),
	hero("lada", "Jasnovidka Ludmila", "Věštkyně · Legenda", "Budoucnost nečeká, ale nechá se číst.", 6, 2, 3, 8, "Předtucha", "Podívej se na tři horní karty balíčku."),

	oracle("lada", "Důvěra", "Nech věci dozrát.", "pulnoc", "secese", "zlata", "bila"),
	oracle("lada", "Odvaha", "První krok stačí.", "krev", "gotika", "duha", "zlata"),
	oracle("sudicka", "Klid", "Dýchej. Všechno má svůj čas.", "smaragd", "minimal", "kosmos", "ram"),
	oracle("sudicka", "Vděčnost", "Všimni si, co už máš.", "pergamen", "deco", "zadna", "bila"),
	oracle("lada", "Naděje", "Za každou zimou přijde tání.", "pergamen", "secese", "zlata", "bila"),

	{owner: "alchymista", title: "Mág", family: "tarot", likes: 1, visibility: "public", look: obj{"art": "mag", "palette": "pulnoc", "frame": "gotika", "foil": "zlata"}, content: obj{"numeral": "I"}},
	{owner: "bludny_kamen", title: "Světlonoška", family: "bestie", likes: 2, visibility: "public", look: obj{"element": "ohen", "foil": "duha"}, content: obj{
		"subtitle":  "lampová víla · Oheň",
		"hp":        60,
		"rarity":    4,
		"abilities": []any{obj{"name": "Jiskření", "power": 20, "text": "Sousední bytost získá +1 útok."}, obj{"name": "Ohnivý vír", "power": 40, "text": "Zasáhne všechny bytosti soupeře."}},
	}},
	{owner: "noctua", title: "Měsíc", family: "tarot", likes: 4, visibility: "public", look: obj{"art": "mesic", "palette": "smaragd", "frame": "gotika", "foil": "kosmos"}, content: obj{"numeral": "XVIII"}},
	{owner: "lada", title: "Trpělivost", family: "orakulum", likes: 3, visibility: "public"},
	{owner: "kovarna", title: "Strážkyně brány", family: "hrdina", likes: 6, visibility: "public"},
	{owner: "sudicka", title: "Slunce", family: "tarot", likes: 5, visibility: "public", look: obj{"art": "slunce", "palette": "krev", "frame": "deco", "foil": "zlata"}, content: obj{"numeral": "XIX"}},
	{owner: "bludny_kamen", title: "Bludička", family: "bestie", likes: 8, visibility: "public", look: obj{"element": "mlha", "foil": "kosmos"}},
	{owner: "noctua", title: "Hvězda", family: "tarot", likes: 7, visibility: "public", look: obj{"art": "hvezda", "palette": "pulnoc", "frame": "secese", "foil": "duha"}, content: obj{"numeral": "XVII"}},
}

func tarot(owner, title, numeral, art, palette, frame, foil string) demoCard {
	return demoCard{owner: owner, title: title, family: "tarot", visibility: "public",
		look:    obj{"art": art, "palette": palette, "frame": frame, "foil": foil},
		content: obj{"numeral": numeral},
		meaning: obj{"upright": "Ukázkový význam karty " + title + ".", "reversed": "", "keywords": []any{}},
	}
}

func beast(owner, title, element, subtitle string, hp, s1, s2 int, ab1 string, ab1p int, ab1t, ab2 string, ab2p int, ab2t string) demoCard {
	return demoCard{owner: owner, title: title, family: "bestie", visibility: "public",
		look: obj{"element": element, "foil": "duha"},
		content: obj{
			"subtitle": subtitle, "hp": hp, "s1": s1, "s2": s2,
			"abilities": []any{obj{"name": ab1, "power": ab1p, "text": ab1t}, obj{"name": ab2, "power": ab2p, "text": ab2t}},
		},
	}
}

func hero(owner, title, cls, quote string, cost, s1, s2, s3 int, ability, effect string) demoCard {
	return demoCard{owner: owner, title: title, family: "hrdina", visibility: "public",
		content: obj{
			"subtitle": quote, "cls": cls, "cost": cost, "s1": s1, "s2": s2, "s3": s3,
			"abilities": []any{obj{"name": ability, "power": 20, "text": effect}, obj{"name": "", "power": 50, "text": ""}},
		},
	}
}

func oracle(owner, title, subtitle, palette, frame, foil, edge string) demoCard {
	return demoCard{owner: owner, title: title, family: "orakulum", visibility: "public",
		look:    obj{"palette": palette, "frame": frame, "foil": foil, "edge": edge},
		content: obj{"subtitle": subtitle},
	}
}

var demoDecks = []struct {
	owner, name, description, visibility string
	back                                 obj
	cards                                []string
}{
	{
		owner: "noctua", name: "Noční arkána", visibility: "public",
		description: "Měsíční a hvězdné karty z dílny @noctua.",
		back:        obj{"palette": "pulnoc", "edge": "zlata"},
		cards:       []string{"Hvězda", "Měsíc", "Velekněžka", "Kolo štěstí", "Svět"},
	},
	{
		owner: "demo", name: "Moje první sada", visibility: "private",
		description: "Soukromý balíček pro zkoušení.",
		back:        obj{"palette": "krev", "edge": "cerna"},
		cards:       []string{"Rozpracovaná karta", "Pro přátele", "Pozvánka"},
	},
}

// Command returns the `seed` console command.
func Command(app core.App) *cobra.Command {
	return &cobra.Command{
		Use:          "seed",
		Short:        "Creates demo accounts, cards and decks (safe to run repeatedly)",
		SilenceUsage: true,
		RunE: func(cmd *cobra.Command, _ []string) error {
			if err := app.RunAllMigrations(); err != nil {
				return err
			}
			return Run(app, os.Getenv("SEED_PASSWORD"), cmd.OutOrStdout())
		},
	}
}

// Run creates whatever demo data is still missing. Without a password it generates
// one, because a binary running in production must not get accounts with a known one.
func Run(app core.App, password string, out io.Writer) error {
	generated := password == ""
	if generated {
		password = security.RandomString(20)
	}

	users := map[string]*core.Record{}
	created := 0
	for _, handle := range handles {
		user, isNew, err := ensureUser(app, handle, password)
		if err != nil {
			return fmt.Errorf("user %s: %w", handle, err)
		}
		users[handle] = user
		if isNew {
			created++
		}
	}

	templates := map[string]cardspec.Template{}
	for _, tpl := range cardspec.Templates() {
		templates[tpl.Family] = tpl
	}

	cards := map[string]*core.Record{}
	for _, demo := range demoCards {
		card, err := ensureCard(app, demo, users, templates[demo.family])
		if err != nil {
			return fmt.Errorf("card %s: %w", demo.title, err)
		}
		cards[demo.title] = card

		for _, handle := range handles[:demo.likes] {
			if err := ensureLike(app, users[handle], card); err != nil {
				return fmt.Errorf("like of %s: %w", demo.title, err)
			}
		}
	}

	for _, demo := range demoDecks {
		if err := ensureDeck(app, demo.owner, demo.name, demo.description, demo.visibility, demo.back, demo.cards, users, cards); err != nil {
			return fmt.Errorf("deck %s: %w", demo.name, err)
		}
	}

	_, _ = fmt.Fprintf(out, "Seeded %d demo accounts (%d new), %d cards and %d decks.\n", len(handles), created, len(demoCards), len(demoDecks))
	if created > 0 {
		_, _ = fmt.Fprintf(out, "Sign in as demo@arkanum.example")
		if generated {
			_, _ = fmt.Fprintf(out, " with the generated password %s", password)
		} else {
			_, _ = fmt.Fprint(out, " with the password from SEED_PASSWORD")
		}
		_, _ = fmt.Fprintln(out, ".")
	}
	return nil
}

func ensureUser(app core.App, handle, password string) (*core.Record, bool, error) {
	existing, err := app.FindFirstRecordByData("users", "handle", handle)
	if err == nil {
		return existing, false, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, false, err
	}

	collection, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return nil, false, err
	}
	user := core.NewRecord(collection)
	user.Set("handle", handle)
	user.Set("displayName", handle)
	user.SetEmail(handle + "@arkanum.example")
	user.SetPassword(password)
	user.SetVerified(true)
	if err := app.Save(user); err != nil {
		return nil, false, err
	}
	return user, true, nil
}

func ensureCard(app core.App, demo demoCard, users map[string]*core.Record, tpl cardspec.Template) (*core.Record, error) {
	owner := users[demo.owner]

	existing, err := app.FindFirstRecordByFilter(
		"cards",
		"owner = {:owner} && title = {:title}",
		dbx.Params{"owner": owner.Id, "title": demo.title},
	)
	if err == nil {
		return existing, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	collection, err := app.FindCollectionByNameOrId("cards")
	if err != nil {
		return nil, err
	}
	template, err := app.FindFirstRecordByData("templates", "slug", tpl.Slug)
	if err != nil {
		return nil, err
	}

	formatW, formatH := tpl.FormatW, tpl.FormatH
	if demo.format != [2]int{} {
		formatW, formatH = demo.format[0], demo.format[1]
	}

	card := core.NewRecord(collection)
	card.Set("owner", owner.Id)
	card.Set("title", demo.title)
	card.Set("template", template.Id)
	card.Set("family", demo.family)
	card.Set("formatW", formatW)
	card.Set("formatH", formatH)
	card.Set("look", merged(tpl.Defaults["look"], demo.look))
	card.Set("content", merged(tpl.Defaults["content"], demo.content))
	card.Set("meaning", merged(tpl.Defaults["meaning"], demo.meaning))
	card.Set("visibility", demo.visibility)

	editors := make([]string, 0, len(demo.editors))
	for _, handle := range demo.editors {
		editors = append(editors, users[handle].Id)
	}
	card.Set("editors", editors)

	if err := app.Save(card); err != nil {
		return nil, err
	}
	return card, nil
}

func merged(defaults any, overrides obj) obj {
	result := obj{}
	if base, ok := defaults.(obj); ok {
		maps.Copy(result, base)
	}
	maps.Copy(result, overrides)
	return result
}

func ensureLike(app core.App, user, card *core.Record) error {
	_, err := app.FindFirstRecordByFilter(
		"likes",
		"user = {:user} && card = {:card}",
		dbx.Params{"user": user.Id, "card": card.Id},
	)
	if err == nil {
		return nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}

	collection, err := app.FindCollectionByNameOrId("likes")
	if err != nil {
		return err
	}
	like := core.NewRecord(collection)
	like.Set("user", user.Id)
	like.Set("card", card.Id)
	return app.Save(like)
}

func ensureDeck(
	app core.App,
	ownerHandle, name, description, visibility string,
	back obj,
	cardTitles []string,
	users, cards map[string]*core.Record,
) error {
	owner := users[ownerHandle]

	_, err := app.FindFirstRecordByFilter(
		"decks",
		"owner = {:owner} && name = {:name}",
		dbx.Params{"owner": owner.Id, "name": name},
	)
	if err == nil {
		return nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}

	collection, err := app.FindCollectionByNameOrId("decks")
	if err != nil {
		return err
	}
	cardIDs := make([]string, 0, len(cardTitles))
	for _, title := range cardTitles {
		cardIDs = append(cardIDs, cards[title].Id)
	}

	deck := core.NewRecord(collection)
	deck.Set("owner", owner.Id)
	deck.Set("name", name)
	deck.Set("description", description)
	deck.Set("visibility", visibility)
	deck.Set("back", back)
	deck.Set("cards", cardIDs)
	return app.Save(deck)
}
