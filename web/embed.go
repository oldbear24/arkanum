// Package web holds the built frontend so that one binary can serve API and UI.
package web

import (
	"embed"
	"io/fs"
)

// `web/public/.gitkeep` is copied into dist by Vite, which keeps the directory
// embeddable (and go vet happy) even before the first frontend build.
//
//go:embed all:dist
var dist embed.FS

// Dist returns the contents of web/dist.
func Dist() fs.FS {
	sub, err := fs.Sub(dist, "dist")
	if err != nil {
		panic(err)
	}
	return sub
}
