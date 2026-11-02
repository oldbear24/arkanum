package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"

	"arkanum/cardspec"
)

// Images of the freely placed elements. They are separate from the illustration and its
// parallax layers, which take their meaning from the order of the files.
func init() {
	m.Register(func(app core.App) error {
		cards, err := app.FindCollectionByNameOrId("cards")
		if err != nil {
			return err
		}
		cards.Fields.Add(&core.FileField{
			Name:      "itemImages",
			MaxSelect: cardspec.Limits().Counts["itemImages"],
			MaxSize:   10 * megabyte,
			MimeTypes: imageMimeTypes,
		})
		return app.Save(cards)
	}, func(app core.App) error {
		cards, err := app.FindCollectionByNameOrId("cards")
		if err != nil {
			return err
		}
		cards.Fields.RemoveByName("itemImages")
		return app.Save(cards)
	})
}
