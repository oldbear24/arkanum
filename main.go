// Command arkanum is the Arkánum server: PocketBase used as a library, with the
// schema and hooks defined in Go and the built frontend embedded in the binary.
package main

import (
	"log"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"

	"arkanum/internal/hooks"
	"arkanum/internal/seed"
	"arkanum/internal/server"
	_ "arkanum/migrations"
	"arkanum/web"
)

func main() {
	app := pocketbase.NewWithConfig(pocketbase.Config{
		DefaultEncryptionEnv: "PB_ENCRYPTION_KEY",
	})

	// The schema is code first, so changes made in the admin UI never turn into
	// migration files on their own.
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		TemplateLang: migratecmd.TemplateLangGo,
		Automigrate:  false,
		Dir:          "migrations",
	})

	hooks.Register(app)
	server.Register(app, web.Dist())
	app.RootCmd.AddCommand(seed.Command(app))

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
