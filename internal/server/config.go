package server

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/pocketbase/pocketbase/core"
)

const usersCollection = "users"

// oauthProviders lists the optional sign-in providers and their env var prefix.
var oauthProviders = []struct{ name, displayName, env string }{
	{"google", "Google", "GOOGLE"},
	{"github", "GitHub", "GITHUB"},
	{"discord", "Discord", "DISCORD"},
}

// applyEnvConfig copies the deployment configuration from the environment into
// the PocketBase settings, so that a container needs no manual admin UI setup.
func applyEnvConfig(app core.App) error {
	settings := app.Settings()
	settings.Meta.AppName = "Arkánum"

	if appURL := strings.TrimRight(os.Getenv("APP_URL"), "/"); appURL != "" {
		settings.Meta.AppURL = appURL
	}

	if host := os.Getenv("SMTP_HOST"); host != "" {
		port, err := strconv.Atoi(envOr("SMTP_PORT", "587"))
		if err != nil {
			return fmt.Errorf("SMTP_PORT: %w", err)
		}
		settings.SMTP.Enabled = true
		settings.SMTP.Host = host
		settings.SMTP.Port = port
		settings.SMTP.Username = os.Getenv("SMTP_USERNAME")
		settings.SMTP.Password = os.Getenv("SMTP_PASSWORD")
		settings.SMTP.TLS = os.Getenv("SMTP_TLS") == "true"
		settings.Meta.SenderAddress = envOr("SMTP_SENDER_ADDRESS", settings.Meta.SenderAddress)
		settings.Meta.SenderName = envOr("SMTP_SENDER_NAME", "Arkánum")
	}

	if err := app.Save(settings); err != nil {
		return fmt.Errorf("saving settings: %w", err)
	}

	return applyOAuthConfig(app)
}

func applyOAuthConfig(app core.App) error {
	users, err := app.FindCollectionByNameOrId(usersCollection)
	if err != nil {
		return err
	}

	providers := make([]core.OAuth2ProviderConfig, 0, len(oauthProviders))
	for _, p := range oauthProviders {
		// A stray space or line ending from .env would only show up as a sign-in the provider refuses.
		id, secret := strings.TrimSpace(os.Getenv(p.env+"_CLIENT_ID")), strings.TrimSpace(os.Getenv(p.env+"_CLIENT_SECRET"))
		if id == "" || secret == "" {
			continue
		}
		providers = append(providers, core.OAuth2ProviderConfig{
			Name:         p.name,
			DisplayName:  p.displayName,
			ClientId:     id,
			ClientSecret: secret,
		})
	}

	users.OAuth2.Enabled = len(providers) > 0
	users.OAuth2.Providers = providers

	if err := app.Save(users); err != nil {
		return fmt.Errorf("saving OAuth2 configuration: %w", err)
	}
	return nil
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
