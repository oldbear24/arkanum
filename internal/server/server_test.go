package server_test

import (
	"net/http"
	"reflect"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tests"

	"arkanum/internal/server"
	_ "arkanum/migrations"
)

var ui = fstest.MapFS{
	"index.html":    {Data: []byte("<title>Shell</title>")},
	"assets/app.js": {Data: []byte("console.log(1)")},
	"favicon.svg":   {Data: []byte("<svg></svg>")},
}

func newApp(t testing.TB) *tests.TestApp {
	t.Helper()
	app, err := tests.NewTestApp(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	server.Register(app, ui)
	return app
}

func TestStartupNeverOpensABrowser(t *testing.T) {
	app := newApp(t)
	defer app.Cleanup()

	router, err := apis.NewRouter(app)
	if err != nil {
		t.Fatal(err)
	}

	event := &core.ServeEvent{Router: router, InstallerFunc: apis.DefaultInstallerFunc}
	event.App = app
	if err := app.OnServe().Trigger(event); err != nil {
		t.Fatal(err)
	}

	if event.InstallerFunc == nil {
		t.Fatal("the console hint with the first superuser link is missing")
	}
	got := reflect.ValueOf(event.InstallerFunc).Pointer()
	if got == reflect.ValueOf(apis.DefaultInstallerFunc).Pointer() {
		t.Error("the default installer is still active and it launches a browser")
	}
}

func TestServesTheApp(t *testing.T) {
	cacheHeader := func(want string) func(testing.TB, *tests.TestApp, *http.Response) {
		return func(t testing.TB, _ *tests.TestApp, res *http.Response) {
			t.Helper()
			if got := res.Header.Get("Cache-Control"); !strings.Contains(got, want) {
				t.Errorf("Cache-Control: expected %q, got %q", want, got)
			}
		}
	}

	scenarios := []tests.ApiScenario{
		{
			Name:            "the root serves the shell",
			Method:          http.MethodGet,
			URL:             "/",
			ExpectedStatus:  200,
			ExpectedContent: []string{"Shell"},
			AfterTestFunc:   cacheHeader("no-cache"),
		},
		{
			Name:            "deep links fall back to the shell",
			Method:          http.MethodGet,
			URL:             "/dilna/abc",
			ExpectedStatus:  200,
			ExpectedContent: []string{"Shell"},
			AfterTestFunc:   cacheHeader("no-cache"),
		},
		{
			Name:            "hashed assets are cached for long",
			Method:          http.MethodGet,
			URL:             "/assets/app.js",
			ExpectedStatus:  200,
			ExpectedContent: []string{"console.log"},
			AfterTestFunc:   cacheHeader("immutable"),
		},
		{
			Name:               "unknown API paths stay a JSON 404",
			Method:             http.MethodGet,
			URL:                "/api/nope",
			ExpectedStatus:     404,
			ExpectedContent:    []string{`"status":404`},
			NotExpectedContent: []string{"Shell"},
		},
		{
			Name:            "health check works",
			Method:          http.MethodGet,
			URL:             "/api/health",
			ExpectedStatus:  200,
			ExpectedContent: []string{"API is healthy"},
		},
	}

	for _, scenario := range scenarios {
		scenario.TestAppFactory = newApp
		scenario.Test(t)
	}
}
