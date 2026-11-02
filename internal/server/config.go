package server

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/pocketbase/pocketbase/core"
)

// applyEnvConfig copies the deployment configuration from the environment into
// the PocketBase settings, so that a container needs no manual admin UI setup.
// OAuth2 providers are the exception: they are set up in the admin UI and only there.
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
	return nil
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
