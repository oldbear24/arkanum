// Package hooks holds the server side rules that API rules alone cannot express.
package hooks

import (
	"errors"
	"strings"
	"unicode"

	"github.com/pocketbase/dbx"
	validation "github.com/pocketbase/ozzo-validation/v4"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/security"
	"golang.org/x/text/unicode/norm"

	"arkanum/cardspec"
)

const (
	fallbackHandle  = "tvurce"
	handleMinLen    = 3
	handleMaxLen    = 24
	handleSuffixLen = 5
	displayNameMax  = 60
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
	// A new account from an OAuth2 provider takes its handle from the provider's username.
	app.OnRecordAuthWithOAuth2Request("users").BindFunc(func(e *core.RecordAuthWithOAuth2RequestEvent) error {
		if !e.IsNewRecord {
			return e.Next()
		}
		if e.CreateData == nil {
			e.CreateData = map[string]any{}
		}
		if handle, _ := e.CreateData["handle"].(string); handle == "" {
			handle, err := freeHandle(e.App, e.OAuth2User.Username, e.OAuth2User.Name)
			if err != nil {
				return e.InternalServerError("", err)
			}
			e.CreateData["handle"] = handle
		}
		// An unusually long name from the provider must not stand in the way of signing in.
		e.OAuth2User.Name = clipRunes(e.OAuth2User.Name, displayNameMax)
		return e.Next()
	})

	// The e-mail field is optional only because a provider may not give a verified
	// address, as Discord does for accounts without one. Everyone else has to enter it.
	app.OnRecordCreateRequest("users").BindFunc(func(e *core.RecordRequestEvent) error {
		info, err := e.RequestInfo()
		if err != nil {
			return e.BadRequestError("", err)
		}
		if e.Record.Email() == "" && info.Context != core.RequestInfoContextOAuth2 {
			return e.BadRequestError("Failed to create record.", validation.Errors{
				core.FieldNameEmail: validation.NewError("validation_required", "Cannot be blank."),
			})
		}
		return e.Next()
	})

	app.OnRecordCreate("users").BindFunc(func(e *core.RecordEvent) error {
		// The last resort for a record saved without a handle. It never uses the e-mail
		// address, because handles are public.
		if e.Record.GetString("handle") == "" {
			handle, err := freeHandle(e.App)
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

// freeHandle turns the first usable candidate into a handle nobody has taken yet.
func freeHandle(app core.App, candidates ...string) (string, error) {
	base := fallbackHandle
	for _, candidate := range candidates {
		if slug := slugifyHandle(candidate); len(slug) >= handleMinLen {
			base = slug
			break
		}
	}
	if len(base) > handleMaxLen {
		base = strings.TrimRight(base[:handleMaxLen], "_")
	}

	// Room for the suffix when the handle is taken.
	prefix := strings.TrimRight(base[:min(len(base), handleMaxLen-handleSuffixLen-1)], "_")

	handle := base
	for attempt := 0; attempt < 10; attempt++ {
		total, err := app.CountRecords("users", dbx.HashExp{"handle": handle})
		if err != nil {
			return "", err
		}
		if total == 0 {
			return handle, nil
		}
		handle = prefix + "_" + security.RandomStringWithAlphabet(handleSuffixLen, "abcdefghijklmnopqrstuvwxyz0123456789")
	}
	return "", errors.New("could not find a free handle")
}

// slugifyHandle reduces a name to what the handle pattern allows: "Žofie Nováková" and
// "zofie.novakova" both become "zofie_novakova".
func slugifyHandle(name string) string {
	var b strings.Builder
	for _, r := range norm.NFD.String(strings.ToLower(name)) {
		switch {
		case unicode.Is(unicode.Mn, r):
			// A combining accent, the letter itself comes separately.
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9', r == '_':
			b.WriteRune(r)
		case b.Len() > 0 && !strings.HasSuffix(b.String(), "_"):
			b.WriteByte('_')
		}
	}
	return strings.Trim(b.String(), "_")
}

func clipRunes(text string, limit int) string {
	runes := []rune(text)
	if len(runes) <= limit {
		return text
	}
	return string(runes[:limit])
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
