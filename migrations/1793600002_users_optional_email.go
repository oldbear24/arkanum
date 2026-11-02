package migrations

import (
	"errors"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

// Discord hides the address of accounts that have not verified it. With a required field
// such people could not sign in at all, so a hook now asks for the address only when
// someone registers with a password.
func init() {
	m.Register(func(app core.App) error {
		return setUserEmailRequired(app, false)
	}, func(app core.App) error {
		return setUserEmailRequired(app, true)
	})
}

func setUserEmailRequired(app core.App, required bool) error {
	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return err
	}
	email, ok := users.Fields.GetByName(core.FieldNameEmail).(*core.EmailField)
	if !ok {
		return errors.New("the users collection has no e-mail field")
	}
	email.Required = required
	return app.Save(users)
}
