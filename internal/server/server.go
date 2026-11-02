// Package server wires the HTTP side of Arkánum on top of PocketBase.
package server

import (
	"io/fs"
	"net/http"
	"strings"

	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/hook"
)

// Register attaches the frontend and the runtime configuration to the app.
func Register(app core.App, ui fs.FS) {
	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
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
