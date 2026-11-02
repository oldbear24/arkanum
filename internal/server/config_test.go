package server

import (
	"testing"

	"github.com/pocketbase/pocketbase/tests"
)

func TestApplyEnvConfig(t *testing.T) {
	for _, key := range []string{
		"APP_URL", "SMTP_HOST", "SMTP_PORT", "SMTP_USERNAME", "SMTP_PASSWORD", "SMTP_TLS", "SMTP_SENDER_ADDRESS", "SMTP_SENDER_NAME",
		"GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET",
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
		users, err := app.FindCollectionByNameOrId(usersCollection)
		if err != nil {
			t.Fatal(err)
		}
		if users.OAuth2.Enabled || len(users.OAuth2.Providers) != 0 {
			t.Error("OAuth2 should stay disabled")
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
		t.Setenv("GITHUB_CLIENT_ID", "id")
		t.Setenv("GITHUB_CLIENT_SECRET", "secret")
		t.Setenv("GOOGLE_CLIENT_ID", "only-half-of-the-pair")

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

		users, err := app.FindCollectionByNameOrId(usersCollection)
		if err != nil {
			t.Fatal(err)
		}
		if !users.OAuth2.Enabled {
			t.Fatal("OAuth2 should be enabled")
		}
		if len(users.OAuth2.Providers) != 1 || users.OAuth2.Providers[0].Name != "github" {
			t.Errorf("only the complete provider should be enabled, got %+v", users.OAuth2.Providers)
		}
	})

	t.Run("whitespace around the keys is ignored", func(t *testing.T) {
		t.Setenv("DISCORD_CLIENT_ID", " id\r")
		t.Setenv("DISCORD_CLIENT_SECRET", "secret\r")
		t.Setenv("GOOGLE_CLIENT_ID", "id")
		t.Setenv("GOOGLE_CLIENT_SECRET", " \r")

		if err := applyEnvConfig(app); err != nil {
			t.Fatal(err)
		}

		users, err := app.FindCollectionByNameOrId(usersCollection)
		if err != nil {
			t.Fatal(err)
		}
		if len(users.OAuth2.Providers) != 1 {
			t.Fatalf("only Discord should be enabled, got %+v", users.OAuth2.Providers)
		}
		discord := users.OAuth2.Providers[0]
		if discord.Name != "discord" || discord.DisplayName != "Discord" || discord.ClientId != "id" || discord.ClientSecret != "secret" {
			t.Errorf("unexpected provider %+v", discord)
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
