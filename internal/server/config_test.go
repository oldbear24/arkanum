package server

import (
	"testing"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tests"
)

func TestApplyEnvConfig(t *testing.T) {
	for _, key := range []string{
		"APP_URL", "SMTP_HOST", "SMTP_PORT", "SMTP_USERNAME", "SMTP_PASSWORD", "SMTP_TLS", "SMTP_SENDER_ADDRESS", "SMTP_SENDER_NAME",
	} {
		t.Setenv(key, "")
	}

	app, err := tests.NewTestApp(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer app.Cleanup()

	t.Run("without any configuration nothing is enabled", func(t *testing.T) {
		if err := applyEnvConfig(app); err != nil {
			t.Fatal(err)
		}
		if app.Settings().SMTP.Enabled {
			t.Error("SMTP should stay disabled")
		}
		if app.Settings().Meta.AppName != "Arkánum" {
			t.Errorf("unexpected app name %q", app.Settings().Meta.AppName)
		}
	})

	t.Run("the environment configures the app", func(t *testing.T) {
		t.Setenv("APP_URL", "https://karty.example/")
		t.Setenv("SMTP_HOST", "smtp.example")
		t.Setenv("SMTP_PORT", "2525")
		t.Setenv("SMTP_USERNAME", "uzivatel")
		t.Setenv("SMTP_PASSWORD", "heslo")
		t.Setenv("SMTP_TLS", "true")
		t.Setenv("SMTP_SENDER_ADDRESS", "dilna@karty.example")

		if err := applyEnvConfig(app); err != nil {
			t.Fatal(err)
		}

		settings := app.Settings()
		if settings.Meta.AppURL != "https://karty.example" {
			t.Errorf("unexpected app URL %q", settings.Meta.AppURL)
		}
		if !settings.SMTP.Enabled || settings.SMTP.Host != "smtp.example" || settings.SMTP.Port != 2525 || !settings.SMTP.TLS {
			t.Errorf("unexpected SMTP settings %+v", settings.SMTP)
		}
		if settings.Meta.SenderAddress != "dilna@karty.example" || settings.Meta.SenderName != "Arkánum" {
			t.Errorf("unexpected sender %q %q", settings.Meta.SenderName, settings.Meta.SenderAddress)
		}
	})

	t.Run("sign-in providers from the admin UI survive a start, whatever the environment says", func(t *testing.T) {
		t.Setenv("DISCORD_CLIENT_ID", "from-the-environment")
		t.Setenv("DISCORD_CLIENT_SECRET", "from-the-environment")

		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			t.Fatal(err)
		}
		users.OAuth2.Enabled = true
		users.OAuth2.Providers = []core.OAuth2ProviderConfig{{Name: "github", ClientId: "id", ClientSecret: "secret"}}
		if err := app.Save(users); err != nil {
			t.Fatal(err)
		}

		if err := applyEnvConfig(app); err != nil {
			t.Fatal(err)
		}

		users, err = app.FindCollectionByNameOrId("users")
		if err != nil {
			t.Fatal(err)
		}
		if !users.OAuth2.Enabled {
			t.Error("OAuth2 should stay enabled")
		}
		if len(users.OAuth2.Providers) != 1 || users.OAuth2.Providers[0].Name != "github" || users.OAuth2.Providers[0].ClientSecret != "secret" {
			t.Errorf("the providers should stay as they were, got %+v", users.OAuth2.Providers)
		}
	})

	t.Run("a broken port is reported", func(t *testing.T) {
		t.Setenv("SMTP_HOST", "smtp.example")
		t.Setenv("SMTP_PORT", "ne")
		if err := applyEnvConfig(app); err == nil {
			t.Error("expected an error")
		}
	})
}
