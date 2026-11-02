package hooks_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tests"
)

const oauthURL = "/api/collections/users/auth-with-oauth2"
const oauthBody = `{"provider":"discord","code":"code","codeVerifier":"verifier","redirectURL":"http://localhost/api/oauth2-redirect"}`

// fakeDiscord answers like Discord does, so the real provider code runs against it.
func fakeDiscord(t testing.TB, user map[string]any) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("POST /token", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"access_token":"token","token_type":"bearer","expires_in":3600}`))
	})
	mux.HandleFunc("GET /me", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(user)
	})
	server := httptest.NewServer(mux)
	t.Cleanup(server.Close)
	return server
}

func appWithDiscord(t testing.TB, user map[string]any) *tests.TestApp {
	t.Helper()
	app := newApp(t)
	server := fakeDiscord(t, user)

	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		t.Fatal(err)
	}
	users.OAuth2.Enabled = true
	users.OAuth2.Providers = []core.OAuth2ProviderConfig{{
		Name:         "discord",
		ClientId:     "id",
		ClientSecret: "secret",
		AuthURL:      server.URL + "/authorize",
		TokenURL:     server.URL + "/token",
		UserInfoURL:  server.URL + "/me",
	}}
	if err := app.Save(users); err != nil {
		t.Fatal(err)
	}
	return app
}

func discordUser(overrides map[string]any) map[string]any {
	user := map[string]any{
		"id":            "1234567890",
		"username":      "fake_user",
		"global_name":   "Žofie Nováková",
		"discriminator": "0",
		"email":         "fake@example.com",
		"verified":      true,
	}
	for key, value := range overrides {
		user[key] = value
	}
	return user
}

func TestDiscordCreatesAnAccount(t *testing.T) {
	scenarios := []struct {
		name  string
		user  map[string]any
		has   []string
		after func(t testing.TB, app *tests.TestApp)
	}{
		{
			name: "the handle and name come from the Discord profile",
			user: discordUser(nil),
			has:  []string{`"handle":"fake_user"`, `"displayName":"Žofie Nováková"`, `"verified":true`, `"isNew":true`, `"emailVisibility":false`},
		},
		{
			name: "a username with dots fits the handle pattern",
			user: discordUser(map[string]any{"username": "john.doe"}),
			has:  []string{`"handle":"john_doe"`},
		},
		{
			name: "capitals become lowercase",
			user: discordUser(map[string]any{"username": "OldSchool"}),
			has:  []string{`"handle":"oldschool"`},
		},
		{
			name: "a taken handle gets a suffix",
			user: discordUser(map[string]any{"username": "alice"}),
			has:  []string{`"handle":"alice_`},
		},
		{
			name: "a two letter username falls back to the name",
			user: discordUser(map[string]any{"username": "ab"}),
			has:  []string{`"handle":"zofie_novakova"`},
		},
		{
			name: "a long username is cut to the limit",
			user: discordUser(map[string]any{"username": strings.Repeat("a", 32)}),
			has:  []string{`"handle":"` + strings.Repeat("a", 24) + `"`},
		},
		{
			name: "nothing usable gives a neutral handle, never the address",
			user: discordUser(map[string]any{"username": "ab", "global_name": "★", "email": "tajny.uzivatel@example.com"}),
			has:  []string{`"handle":"tvurce"`},
		},
		{
			name: "an unusually long name does not block signing in",
			user: discordUser(map[string]any{"global_name": strings.Repeat("ž", 100)}),
			has:  []string{`"displayName":"` + strings.Repeat("ž", 60) + `"`},
		},
		{
			name: "an unverified address is not stored but the account still works",
			user: discordUser(map[string]any{"email": "neovereny@example.com", "verified": false}),
			has:  []string{`"handle":"fake_user"`, `"isNew":true`},
			after: func(t testing.TB, app *tests.TestApp) {
				t.Helper()
				record, err := app.FindFirstRecordByData("users", "handle", "fake_user")
				if err != nil {
					t.Fatal(err)
				}
				if record.Email() != "" {
					t.Errorf("expected no address, got %q", record.Email())
				}
			},
		},
	}

	for _, s := range scenarios {
		user := s.user
		scenario := tests.ApiScenario{
			Name:            s.name,
			Method:          http.MethodPost,
			URL:             oauthURL,
			Body:            strings.NewReader(oauthBody),
			Headers:         map[string]string{"Content-Type": "application/json"},
			ExpectedStatus:  http.StatusOK,
			ExpectedContent: s.has,
			TestAppFactory: func(t testing.TB) *tests.TestApp {
				return appWithDiscord(t, user)
			},
		}
		if s.after != nil {
			after := s.after
			scenario.AfterTestFunc = func(t testing.TB, app *tests.TestApp, _ *http.Response) {
				after(t, app)
			}
		}
		scenario.Test(t)
	}
}

func TestDiscordLinksAnAccountWithTheSameAddress(t *testing.T) {
	for _, s := range []struct {
		name          string
		verified      bool
		keepsPassword bool
	}{
		{"a verified account keeps its password", true, true},
		// Anyone could have registered an unverified account with somebody else's address.
		{"an unverified account loses its password", false, false},
	} {
		scenario := tests.ApiScenario{
			Name:            s.name,
			Method:          http.MethodPost,
			URL:             oauthURL,
			Body:            strings.NewReader(oauthBody),
			Headers:         map[string]string{"Content-Type": "application/json"},
			ExpectedStatus:  http.StatusOK,
			ExpectedContent: []string{`"handle":"alice"`, `"isNew":false`, alice},
			TestAppFactory: func(t testing.TB) *tests.TestApp {
				app := appWithDiscord(t, discordUser(map[string]any{"email": "alice@example.com"}))
				record, err := app.FindRecordById("users", alice)
				if err != nil {
					t.Fatal(err)
				}
				record.SetVerified(s.verified)
				if err := app.Save(record); err != nil {
					t.Fatal(err)
				}
				return app
			},
			AfterTestFunc: func(t testing.TB, app *tests.TestApp, _ *http.Response) {
				record, err := app.FindRecordById("users", alice)
				if err != nil {
					t.Fatal(err)
				}
				if !record.Verified() {
					t.Error("the address should count as verified now")
				}
				if record.ValidatePassword("correct-horse-battery") != s.keepsPassword {
					t.Errorf("expected the password to stay valid: %v", s.keepsPassword)
				}
				links, err := app.FindAllExternalAuthsByRecord(record)
				if err != nil {
					t.Fatal(err)
				}
				if len(links) != 1 || links[0].Provider() != "discord" {
					t.Errorf("expected one link to Discord, got %v", links)
				}
			},
		}
		scenario.Test(t)
	}
}

func TestDiscordSignsBackIntoTheSameAccount(t *testing.T) {
	scenario := tests.ApiScenario{
		Name:            "a linked Discord account keeps its handle even after renaming on Discord",
		Method:          http.MethodPost,
		URL:             oauthURL,
		Body:            strings.NewReader(oauthBody),
		Headers:         map[string]string{"Content-Type": "application/json"},
		ExpectedStatus:  http.StatusOK,
		ExpectedContent: []string{`"handle":"bob"`, `"isNew":false`, bob},
		TestAppFactory: func(t testing.TB) *tests.TestApp {
			app := appWithDiscord(t, discordUser(map[string]any{"username": "new_name", "email": "jiny@example.com"}))
			link := core.NewExternalAuth(app)
			link.SetCollectionRef("_pb_users_auth_")
			link.SetRecordRef(bob)
			link.SetProvider("discord")
			link.SetProviderId("1234567890")
			if err := app.Save(link); err != nil {
				t.Fatal(err)
			}
			return app
		},
		AfterTestFunc: func(t testing.TB, app *tests.TestApp, _ *http.Response) {
			total, err := app.CountRecords("users", dbx.HashExp{"handle": "new_name"})
			if err != nil {
				t.Fatal(err)
			}
			if total != 0 {
				t.Error("a second account was created")
			}
		},
	}
	scenario.Test(t)
}

func TestDiscordFillsInTheAddressOnceItIsVerified(t *testing.T) {
	scenario := tests.ApiScenario{
		Name:            "an account created without an address gets it at the next sign-in",
		Method:          http.MethodPost,
		URL:             oauthURL,
		Body:            strings.NewReader(oauthBody),
		Headers:         map[string]string{"Content-Type": "application/json"},
		ExpectedStatus:  http.StatusOK,
		ExpectedContent: []string{`"handle":"bez_adresy"`, `"isNew":false`},
		TestAppFactory: func(t testing.TB) *tests.TestApp {
			app := appWithDiscord(t, discordUser(nil))
			users, err := app.FindCollectionByNameOrId("users")
			if err != nil {
				t.Fatal(err)
			}
			record := core.NewRecord(users)
			record.Set("handle", "bez_adresy")
			record.SetRandomPassword()
			if err := app.Save(record); err != nil {
				t.Fatal(err)
			}
			link := core.NewExternalAuth(app)
			link.SetCollectionRef(users.Id)
			link.SetRecordRef(record.Id)
			link.SetProvider("discord")
			link.SetProviderId("1234567890")
			if err := app.Save(link); err != nil {
				t.Fatal(err)
			}
			return app
		},
		AfterTestFunc: func(t testing.TB, app *tests.TestApp, _ *http.Response) {
			record, err := app.FindFirstRecordByData("users", "handle", "bez_adresy")
			if err != nil {
				t.Fatal(err)
			}
			if record.Email() != "fake@example.com" {
				t.Errorf("expected the verified address, got %q", record.Email())
			}
		},
	}
	scenario.Test(t)
}

func TestDiscordIsOffUntilConfigured(t *testing.T) {
	runCalls(t, []call{
		{
			name:   "no provider is offered by default",
			url:    "/api/collections/users/auth-methods",
			status: 200,
			has:    []string{`"oauth2":{"providers":[],"enabled":false}`},
		},
		{
			name:   "signing in with it is refused",
			method: http.MethodPost,
			url:    oauthURL,
			body:   oauthBody,
			status: http.StatusForbidden,
		},
	})
}

func TestPasswordRegistrationNeedsAnEmail(t *testing.T) {
	const password = `"password":"correct-horse-battery","passwordConfirm":"correct-horse-battery"`

	runCalls(t, []call{
		{
			name:   "registering without an address fails",
			method: http.MethodPost,
			url:    "/api/collections/users/records",
			body:   `{"handle":"bez_emailu",` + password + `}`,
			status: 400,
			has:    []string{`"email"`, `validation_required`},
		},
		{
			name:   "an empty address fails too",
			method: http.MethodPost,
			url:    "/api/collections/users/records",
			body:   `{"handle":"bez_emailu","email":"",` + password + `}`,
			status: 400,
			has:    []string{`"email"`},
		},
	})
}
