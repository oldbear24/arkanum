// Package hooks holds the server side rules that API rules alone cannot express.
package hooks

import (
	"errors"
	"strings"

	"github.com/pocketbase/dbx"
	validation "github.com/pocketbase/ozzo-validation/v4"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/security"

	"arkanum/cardspec"
)

// Register attaches all hooks to the app.
func Register(app core.App) {
	registerUsers(app)
	registerCards(app)
	registerTemplates(app)
	registerDecks(app)
	registerLikes(app)
}

func registerUsers(app core.App) {
	app.OnRecordCreate("users").BindFunc(func(e *core.RecordEvent) error {
		// OAuth2 sign-ups arrive without a handle.
		if e.Record.GetString("handle") == "" {
			handle, err := generateHandle(e.App, e.Record)
			if err != nil {
				return err
			}
			e.Record.Set("handle", handle)
		}
		if e.Record.GetString("displayName") == "" {
			e.Record.Set("displayName", e.Record.GetString("handle"))
		}
		e.Record.SetEmailVisibility(false)
		return e.Next()
	})

	// Profiles are public, so the address stays hidden whatever the client asks for.
	app.OnRecordUpdate("users").BindFunc(func(e *core.RecordEvent) error {
		e.Record.SetEmailVisibility(false)
		return e.Next()
	})
}

// generateHandle derives a free handle from the e-mail address.
func generateHandle(app core.App, user *core.Record) (string, error) {
	local, _, _ := strings.Cut(user.Email(), "@")

	var b strings.Builder
	for _, r := range strings.ToLower(local) {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9', r == '_':
			b.WriteRune(r)
		case b.Len() > 0 && r == '.', b.Len() > 0 && r == '-':
			b.WriteByte('_')
		}
	}

	base := b.String()
	if len(base) < 3 {
		base = "tvurce"
	}
	if len(base) > 18 {
		base = base[:18]
	}

	handle := base
	for attempt := 0; attempt < 10; attempt++ {
		total, err := app.CountRecords("users", dbx.HashExp{"handle": handle})
		if err != nil {
			return "", err
		}
		if total == 0 {
			return handle, nil
		}
		handle = base + "_" + security.RandomStringWithAlphabet(5, "abcdefghijklmnopqrstuvwxyz0123456789")
	}
	return "", errors.New("could not find a free handle")
}

func registerCards(app core.App) {
	app.OnRecordCreate("cards").BindFunc(func(e *core.RecordEvent) error {
		defaultVisibility(e.Record)
		return e.Next()
	})

	app.OnRecordValidate("cards").BindFunc(func(e *core.RecordEvent) error {
		errs := validation.Errors{}
		checkJSON(errs, e.Record, "look", cardspec.ValidateLook)
		checkJSON(errs, e.Record, "content", cardspec.ValidateContent)
		checkJSON(errs, e.Record, "meaning", cardspec.ValidateMeaning)
		checkJSON(errs, e.Record, "artworkTransform", cardspec.ValidateArtworkTransform)

		var look map[string]any
		if e.Record.UnmarshalJSONField("look", &look) == nil {
			if variant, ok := look["variant"].(string); ok && variant != e.Record.GetString("family") {
				errs["look"] = validation.NewError("validation_card_family", "look.variant must match family")
			}
		}

		if len(errs) > 0 {
			return errs
		}
		return e.Next()
	})
}

func registerTemplates(app core.App) {
	app.OnRecordCreate("templates").BindFunc(func(e *core.RecordEvent) error {
		defaultVisibility(e.Record)
		return e.Next()
	})

	app.OnRecordValidate("templates").BindFunc(func(e *core.RecordEvent) error {
		var defaults map[string]any
		if err := e.Record.UnmarshalJSONField("defaults", &defaults); err != nil {
			return e.Next() // an empty value, the field's own validator rejects malformed JSON
		}

		var problems cardspec.Problems
		for key, validate := range map[string]func(map[string]any) cardspec.Problems{
			"look":    cardspec.ValidateLook,
			"content": cardspec.ValidateContent,
			"meaning": cardspec.ValidateMeaning,
		} {
			if part, ok := defaults[key].(map[string]any); ok {
				problems = append(problems, validate(part)...)
			}
		}
		if len(problems) > 0 {
			return validation.Errors{"defaults": problemsError(problems)}
		}
		return e.Next()
	})
}

func registerDecks(app core.App) {
	app.OnRecordCreate("decks").BindFunc(func(e *core.RecordEvent) error {
		defaultVisibility(e.Record)
		return e.Next()
	})

	app.OnRecordValidate("decks").BindFunc(func(e *core.RecordEvent) error {
		errs := validation.Errors{}
		checkJSON(errs, e.Record, "back", cardspec.ValidateDeckBack)
		if len(errs) > 0 {
			return errs
		}
		return e.Next()
	})
}

func registerLikes(app core.App) {
	// A private card stays private: liking it must not confirm that it exists.
	app.OnRecordCreateRequest("likes").BindFunc(func(e *core.RecordRequestEvent) error {
		cardID := e.Record.GetString("card")
		if cardID == "" {
			return e.Next() // the required relation fails with a regular validation error
		}

		card, err := e.App.FindRecordById("cards", cardID)
		if err != nil {
			return e.NotFoundError("", err)
		}
		info, err := e.RequestInfo()
		if err != nil {
			return e.BadRequestError("", err)
		}
		canView, err := e.App.CanAccessRecord(card, info, card.Collection().ViewRule)
		if err != nil || !canView {
			return e.NotFoundError("", err)
		}
		return e.Next()
	})

	recount := func(e *core.RecordEvent) error {
		if err := recountLikes(e.App, e.Record.GetString("card")); err != nil {
			e.App.Logger().Error("Failed to recount likes", "card", e.Record.GetString("card"), "error", err)
		}
		return e.Next()
	}
	app.OnRecordAfterCreateSuccess("likes").BindFunc(recount)
	app.OnRecordAfterDeleteSuccess("likes").BindFunc(recount)
}

// recountLikes stores the number of likes of a card. It is a single statement so
// that concurrent likes cannot lose an update, and it goes straight to SQL because
// a like must not bump the card's `updated` date or notify its editors.
func recountLikes(app core.App, cardID string) error {
	_, err := app.DB().NewQuery(`
		UPDATE {{cards}}
		SET [[likesCount]] = (SELECT COUNT(*) FROM {{likes}} WHERE [[card]] = {:id})
		WHERE [[id]] = {:id}
	`).Bind(dbx.Params{"id": cardID}).Execute()
	return err
}

// defaultVisibility makes new records private. An empty value must never survive,
// because the view rules compare against "private".
func defaultVisibility(record *core.Record) {
	if record.GetString("visibility") == "" {
		record.Set("visibility", "private")
	}
}

func checkJSON(errs validation.Errors, record *core.Record, field string, validate func(map[string]any) cardspec.Problems) {
	var value any
	if err := record.UnmarshalJSONField(field, &value); err != nil || value == nil {
		return // empty, normalizeCard() fills in the defaults
	}

	object, ok := value.(map[string]any)
	if !ok {
		errs[field] = validation.NewError("validation_card_json", "must be a JSON object")
		return
	}
	if problems := validate(object); len(problems) > 0 {
		errs[field] = problemsError(problems)
	}
}

func problemsError(problems cardspec.Problems) validation.Error {
	return validation.NewError("validation_card_data", strings.Join(problems, "; "))
}
