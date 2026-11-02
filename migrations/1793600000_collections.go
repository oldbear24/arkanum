package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"

	"arkanum/cardspec"
)

const (
	jsonMaxSize  = 1 << 16
	megabyte     = 1 << 20
	maxEditors   = 20
	maxDeckCards = 200
)

var imageMimeTypes = []string{"image/png", "image/jpeg", "image/webp"}

func init() {
	m.Register(func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		if err := extendUsers(app, users); err != nil {
			return err
		}

		templates, err := createTemplates(app, users)
		if err != nil {
			return err
		}
		cards, err := createCards(app, users, templates)
		if err != nil {
			return err
		}
		if err := createDecks(app, users, cards); err != nil {
			return err
		}
		return createLikes(app, users, cards)
	}, func(app core.App) error {
		for _, name := range []string{"likes", "decks", "cards", "templates"} {
			collection, err := app.FindCollectionByNameOrId(name)
			if err != nil {
				return err
			}
			if err := app.Delete(collection); err != nil {
				return err
			}
		}
		return nil
	})
}

func timestamps(c *core.Collection) {
	c.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
	c.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
}

func formatFields(c *core.Collection) {
	bounds := cardspec.Limits().Ranges["format"]
	c.Fields.Add(&core.SelectField{
		Name:      "family",
		Required:  true,
		MaxSelect: 1,
		Values:    cardspec.Limits().Enums["family"],
	})
	c.Fields.Add(&core.NumberField{Name: "formatW", Required: true, OnlyInt: true, Min: &bounds[0], Max: &bounds[1]})
	c.Fields.Add(&core.NumberField{Name: "formatH", Required: true, OnlyInt: true, Min: &bounds[0], Max: &bounds[1]})
}

func visibilityField(values ...string) *core.SelectField {
	return &core.SelectField{Name: "visibility", Required: true, MaxSelect: 1, Values: values}
}

func extendUsers(app core.App, users *core.Collection) error {
	users.ListRule = types.Pointer("")
	users.ViewRule = types.Pointer("")

	users.Fields.RemoveByName("name")
	users.Fields.Add(&core.TextField{
		Name:        "handle",
		Required:    true,
		Presentable: true,
		Pattern:     `^[a-z0-9_]{3,24}$`,
	})
	users.Fields.Add(&core.TextField{Name: "displayName", Max: 60})

	avatar, ok := users.Fields.GetByName("avatar").(*core.FileField)
	if !ok {
		avatar = &core.FileField{Name: "avatar", MaxSelect: 1}
		users.Fields.Add(avatar)
	}
	avatar.MaxSize = 2 * megabyte
	avatar.MimeTypes = imageMimeTypes
	avatar.Thumbs = []string{"96x96"}

	users.AddIndex("idx_users_handle", true, "handle", "")

	users.OAuth2.MappedFields.Name = "displayName"
	users.OAuth2.MappedFields.AvatarURL = "avatar"

	localizeAuthEmails(users)

	return app.Save(users)
}

// localizeAuthEmails translates the transactional e-mails and points their links
// to the app's own pages instead of the PocketBase admin UI.
func localizeAuthEmails(users *core.Collection) {
	mail := func(lead, link, action, note string) string {
		return `<p>Dobrý den,</p>
<p>` + lead + `</p>
<p><a class="btn" href="{APP_URL}/` + link + `/{TOKEN}" target="_blank" rel="noopener">` + action + `</a></p>
<p><i>` + note + `</i></p>
<p>Tým {APP_NAME}</p>`
	}

	users.VerificationTemplate.Subject = "Potvrďte svůj e-mail v aplikaci {APP_NAME}"
	users.VerificationTemplate.Body = mail(
		"Děkujeme za registraci. Potvrďte prosím svou e-mailovou adresu.",
		"overeni", "Potvrdit e-mail",
		"Pokud jste se neregistrovali, tento e-mail ignorujte.",
	)

	users.ResetPasswordTemplate.Subject = "Obnova hesla v aplikaci {APP_NAME}"
	users.ResetPasswordTemplate.Body = mail(
		"Tlačítkem níže si nastavíte nové heslo.",
		"obnova-hesla", "Nastavit nové heslo",
		"Pokud jste o obnovu nežádali, tento e-mail ignorujte.",
	)

	users.ConfirmEmailChangeTemplate.Subject = "Potvrďte novou e-mailovou adresu v aplikaci {APP_NAME}"
	users.ConfirmEmailChangeTemplate.Body = mail(
		"Tlačítkem níže potvrdíte změnu e-mailové adresy.",
		"zmena-emailu", "Potvrdit novou adresu",
		"Pokud jste o změnu nežádali, tento e-mail ignorujte.",
	)
}

func createTemplates(app core.App, users *core.Collection) (*core.Collection, error) {
	c := core.NewBaseCollection("templates")

	// `author` is empty on system templates, hence the guards for guests.
	c.ListRule = types.Pointer(`system = true || visibility = "public" || (@request.auth.id != "" && author = @request.auth.id)`)
	c.ViewRule = c.ListRule
	c.CreateRule = types.Pointer(`@request.auth.id != "" && @request.body.author = @request.auth.id && @request.body.system:isset = false`)
	c.UpdateRule = types.Pointer(`@request.auth.id != "" && system = false && author = @request.auth.id && @request.body.system:isset = false && @request.body.author:isset = false`)
	c.DeleteRule = types.Pointer(`@request.auth.id != "" && system = false && author = @request.auth.id`)

	c.Fields.Add(&core.TextField{Name: "name", Required: true, Presentable: true, Max: 60})
	c.Fields.Add(&core.TextField{Name: "slug", Required: true, Pattern: `^[a-z0-9-]{2,60}$`})
	formatFields(c)
	c.Fields.Add(&core.JSONField{Name: "defaults", MaxSize: jsonMaxSize})
	c.Fields.Add(&core.BoolField{Name: "system"})
	c.Fields.Add(&core.RelationField{Name: "author", CollectionId: users.Id, MaxSelect: 1})
	c.Fields.Add(visibilityField("private", "public"))
	timestamps(c)

	c.AddIndex("idx_templates_slug", true, "slug", "")

	if err := app.Save(c); err != nil {
		return nil, err
	}
	return c, nil
}

func createCards(app core.App, users, templates *core.Collection) (*core.Collection, error) {
	c := core.NewBaseCollection("cards")

	// The `@request.auth.id != ""` guards matter. For a guest the id resolves to NULL,
	// and PocketBase treats `NULL ?= NULL` as true, so without them every card with
	// no editors would be readable and writable by anyone. See docs/postup.md.
	c.ListRule = types.Pointer(`visibility = "public" || owner = @request.auth.id || (@request.auth.id != "" && editors.id ?= @request.auth.id)`)
	c.ViewRule = types.Pointer(`visibility != "private" || owner = @request.auth.id || (@request.auth.id != "" && editors.id ?= @request.auth.id)`)
	c.CreateRule = types.Pointer(`@request.auth.id != "" && @request.body.owner = @request.auth.id && @request.body.likesCount:isset = false`)
	c.UpdateRule = types.Pointer(`@request.auth.id != "" && (owner = @request.auth.id || editors.id ?= @request.auth.id) && @request.body.owner:isset = false && @request.body.likesCount:isset = false && (owner = @request.auth.id || (@request.body.editors:isset = false && @request.body.visibility:isset = false))`)
	c.DeleteRule = types.Pointer(`owner = @request.auth.id`)

	limits := cardspec.Limits()
	c.Fields.Add(&core.RelationField{Name: "owner", Required: true, CollectionId: users.Id, MaxSelect: 1, CascadeDelete: true})
	c.Fields.Add(&core.TextField{Name: "title", Presentable: true, Max: limits.Text["title"]})
	c.Fields.Add(&core.RelationField{Name: "template", CollectionId: templates.Id, MaxSelect: 1})
	formatFields(c)
	c.Fields.Add(&core.JSONField{Name: "look", MaxSize: jsonMaxSize})
	c.Fields.Add(&core.JSONField{Name: "content", MaxSize: jsonMaxSize})
	c.Fields.Add(&core.JSONField{Name: "meaning", MaxSize: jsonMaxSize})
	c.Fields.Add(&core.FileField{
		Name:      "artwork",
		MaxSelect: 1,
		MaxSize:   10 * megabyte,
		MimeTypes: imageMimeTypes,
		Thumbs:    []string{"600x0"},
	})
	c.Fields.Add(&core.FileField{
		Name:      "artworkLayers",
		MaxSelect: limits.Counts["artworkLayers"],
		MaxSize:   10 * megabyte,
		MimeTypes: imageMimeTypes,
		Thumbs:    []string{"600x0"},
	})
	c.Fields.Add(&core.JSONField{Name: "artworkTransform", MaxSize: jsonMaxSize})
	c.Fields.Add(&core.FileField{
		Name:      "thumbnail",
		MaxSelect: 1,
		MaxSize:   5 * megabyte,
		MimeTypes: []string{"image/png"},
	})
	c.Fields.Add(visibilityField(limits.Enums["visibility"]...))
	c.Fields.Add(&core.RelationField{Name: "editors", CollectionId: users.Id, MaxSelect: maxEditors})
	zero := 0.0
	c.Fields.Add(&core.NumberField{Name: "likesCount", OnlyInt: true, Min: &zero})
	timestamps(c)

	c.AddIndex("idx_cards_visibility_created", false, "visibility, created", "")
	c.AddIndex("idx_cards_visibility_likes", false, "visibility, likesCount", "")
	c.AddIndex("idx_cards_owner", false, "owner", "")

	if err := app.Save(c); err != nil {
		return nil, err
	}

	// A relation to itself needs the collection to exist first.
	c.Fields.Add(&core.RelationField{Name: "remixOf", CollectionId: c.Id, MaxSelect: 1})
	if err := app.Save(c); err != nil {
		return nil, err
	}
	return c, nil
}

func createDecks(app core.App, users, cards *core.Collection) error {
	c := core.NewBaseCollection("decks")

	c.ListRule = types.Pointer(`visibility = "public" || owner = @request.auth.id`)
	c.ViewRule = types.Pointer(`visibility != "private" || owner = @request.auth.id`)
	c.CreateRule = types.Pointer(`@request.auth.id != "" && @request.body.owner = @request.auth.id`)
	c.UpdateRule = types.Pointer(`owner = @request.auth.id && @request.body.owner:isset = false`)
	c.DeleteRule = types.Pointer(`owner = @request.auth.id`)

	c.Fields.Add(&core.RelationField{Name: "owner", Required: true, CollectionId: users.Id, MaxSelect: 1, CascadeDelete: true})
	c.Fields.Add(&core.TextField{Name: "name", Required: true, Presentable: true, Max: 60})
	c.Fields.Add(&core.TextField{Name: "description", Max: 500})
	c.Fields.Add(&core.RelationField{Name: "cards", CollectionId: cards.Id, MaxSelect: maxDeckCards})
	c.Fields.Add(&core.JSONField{Name: "back", MaxSize: jsonMaxSize})
	c.Fields.Add(visibilityField(cardspec.Limits().Enums["visibility"]...))
	timestamps(c)

	c.AddIndex("idx_decks_visibility_created", false, "visibility, created", "")
	c.AddIndex("idx_decks_owner", false, "owner", "")

	return app.Save(c)
}

func createLikes(app core.App, users, cards *core.Collection) error {
	c := core.NewBaseCollection("likes")

	c.ListRule = types.Pointer("")
	c.ViewRule = types.Pointer("")
	c.CreateRule = types.Pointer(`@request.auth.id != "" && @request.body.user = @request.auth.id`)
	c.DeleteRule = types.Pointer(`user = @request.auth.id`)
	c.UpdateRule = nil

	c.Fields.Add(&core.RelationField{Name: "user", Required: true, CollectionId: users.Id, MaxSelect: 1, CascadeDelete: true})
	c.Fields.Add(&core.RelationField{Name: "card", Required: true, CollectionId: cards.Id, MaxSelect: 1, CascadeDelete: true})
	timestamps(c)

	c.AddIndex("idx_likes_user_card", true, "user, card", "")
	c.AddIndex("idx_likes_card", false, "card", "")

	return app.Save(c)
}
