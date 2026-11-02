// Package server wires the HTTP side of Arkánum on top of PocketBase.
package server

import (
	"fmt"
	"io/fs"
	"net/http"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/hook"
)

// Register attaches the frontend, the custom routes and the runtime configuration to the app.
func Register(app core.App, ui fs.FS) {
	newPresenceHub().register(app)

	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		e.InstallerFunc = printInstallerLink

		if err := applyEnvConfig(e.App); err != nil {
			return err
		}
		return e.Next()
	})

	// Priority 999 runs last, after PocketBase and our own routes are registered.
	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			if !e.Router.HasRoute(http.MethodGet, "/{path...}") {
				e.Router.GET("/{path...}", serveUI(ui))
			}
			return e.Next()
		},
		Priority: 999,
	})
}

// printInstallerLink replaces apis.DefaultInstallerFunc, which opens a browser
// window on every start until the first superuser exists. Starting the app must
// not open anything, so the link only goes to the console.
func printInstallerLink(_ core.App, systemSuperuser *core.Record, baseURL string) error {
	token, err := systemSuperuser.NewStaticAuthToken(30 * time.Minute)
	if err != nil {
		return err
	}

	fmt.Printf(
		"\nNo superuser yet. Create one at %s/_/#/pbinstall/%s\nor run: arkanum superuser upsert EMAIL PASS\n\n",
		strings.TrimRight(baseURL, "/"),
		token,
	)
	return nil
}

// serveUI serves the single page app with a fallback to index.html. Unknown API
// paths stay a JSON 404 instead of turning into the app shell.
func serveUI(ui fs.FS) func(*core.RequestEvent) error {
	static := apis.Static(ui, true)

	return func(e *core.RequestEvent) error {
		path := e.Request.URL.Path
		if path == "/api" || strings.HasPrefix(path, "/api/") {
			return e.NotFoundError("", nil)
		}

		header := e.Response.Header()
		if strings.HasPrefix(path, "/assets/") {
			// Vite puts a content hash in these file names.
			header.Set("Cache-Control", "public, max-age=31536000, immutable")
		} else {
			header.Set("Cache-Control", "no-cache")
		}

		return static(e)
	}
}
