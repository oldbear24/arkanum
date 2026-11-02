package migrations

import (
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"

	"arkanum/cardspec"
)

// Changing the defaults in cardspec/templates.json later on needs a new migration
// that updates the existing rows, this one only runs once per database.
func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("templates")
		if err != nil {
			return err
		}

		for _, tpl := range cardspec.Templates() {
			record := core.NewRecord(collection)
			record.Set("name", tpl.Name)
			record.Set("slug", tpl.Slug)
			record.Set("family", tpl.Family)
			record.Set("formatW", tpl.FormatW)
			record.Set("formatH", tpl.FormatH)
			record.Set("defaults", tpl.Defaults)
			record.Set("system", true)
			record.Set("visibility", "public")

			if err := app.Save(record); err != nil {
				return err
			}
		}
		return nil
	}, func(app core.App) error {
		records, err := app.FindAllRecords("templates", dbx.HashExp{"system": true})
		if err != nil {
			return err
		}
		for _, record := range records {
			if err := app.Delete(record); err != nil {
				return err
			}
		}
		return nil
	})
}
