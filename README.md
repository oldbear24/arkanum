# Arkánum

Dílna vlastních sběratelských karet s plně 3D náhledem. Tarot, orákulum, bestie, hrdinové i prázdná
karta s vlastním formátem. Karty se ukládají, sdílejí v galerii a exportují k tisku.

- **Backend:** Go + [PocketBase](https://pocketbase.io) jako knihovna (v0.40). Schéma a hooky jsou v Go.
- **Frontend:** React, TypeScript, Vite v adresáři `web/`. Vestavěný do binárky přes `embed`.
- **Zadání a návrh:** [docs/zadani.md](docs/zadani.md), [design/](design/README.md).
- **Stav prací a rozhodnutí:** [docs/postup.md](docs/postup.md).

## Lokální vývoj

Potřebujete Go 1.27+, Node 22+ a GNU Make. Na Windows s MSYS2 je Make k dispozici jako `mingw32-make`.

```bash
make seed
```

```bash
make dev
```

Spustí PocketBase na `http://127.0.0.1:8090` a Vite na `http://localhost:5173`. Vite přeposílá `/api`
a `/_` na PocketBase. Administrace je na `http://127.0.0.1:8090/_/`. Dokud neexistuje správce, vypíše
server do konzole odkaz na jeho založení. Prohlížeč sám neotevírá.

`make seed` založí ukázkové účty, karty a balíčky a jde spustit opakovaně. Přihlásíte se jako
`demo@arkanum.example` s heslem `arkanum-dev`. Stránka se všemi variantami karty a ovládáním parametrů je
na `/dev/karty`.

| Příkaz | Co dělá |
| --- | --- |
| `make dev` | PocketBase na :8090 a Vite na :5173 |
| `make build` | build frontendu a `go build` do `bin/arkanum` |
| `make test` | Go testy a Vitest |
| `make test-e2e` | Playwright testy proti postavené binárce (poprvé `npx playwright install chromium` ve `web/`) |
| `make lint` | `go vet`, `gofmt`, ESLint a typecheck |
| `make seed` | ukázková data pro vývoj |

## Struktura

| Cesta | Obsah |
| --- | --- |
| `main.go` | vstupní bod, skládá PocketBase, hooky, frontend a příkaz `seed` |
| `migrations/` | schéma kolekcí, pravidla API a systémové šablony |
| `cardspec/` | meze, výčty a výchozí hodnoty karty, sdílené mezi Go a frontendem |
| `internal/hooks/` | validace karet, přepočet lajků, handle a skrytý e-mail |
| `internal/server/` | servírování frontendu, konfigurace z prostředí, přítomnost spoluautorů |
| `internal/seed/` | ukázková data |
| `web/src/card/` | `CardFace`, `CardBack`, `Card3D`, `LazyCard`, `normalizeCard()` |
| `web/src/pages/` | stránky aplikace, `workshop/` je dílna |
| `web/src/export/` | PNG, PDF k tisku a náhledy |
| `web/src/i18n/cs.ts` | všechny texty UI |
| `web/src/styles/tokens.css` | barvy, písma a rozměry z návrhu |
| `web/e2e/` | Playwright testy |

## Build

```bash
make build
./bin/arkanum serve --http=127.0.0.1:8090
```

Výsledná binárka servíruje API i frontend. Data ukládá do `pb_data` vedle binárky, jiný adresář určí
přepínač `--dir`. Na Windows se binárka jmenuje `bin/arkanum.exe`.

## Konfigurace

Všechno se nastavuje proměnnými prostředí, vzor je v [.env.example](.env.example). Binárka soubor `.env`
sama nečte, předává ho například `docker run --env-file`.

| Proměnná | Význam |
| --- | --- |
| `PB_ENCRYPTION_KEY` | 32 znaků, šifruje nastavení PocketBase (heslo SMTP, tajné klíče OAuth2) |
| `APP_URL` | veřejná adresa aplikace, použije se v odkazech v e-mailech a pro OAuth2 |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_TLS`, `SMTP_SENDER_ADDRESS`, `SMTP_SENDER_NAME` | odesílání e-mailů. Bez `SMTP_HOST` se nastavení nemění |
| `GOOGLE_CLIENT_ID`/`_SECRET`, `GITHUB_CLIENT_ID`/`_SECRET`, `DISCORD_CLIENT_ID`/`_SECRET` | přihlášení přes OAuth2. Poskytovatel se zapne, až když má obě hodnoty |
| `SEED_PASSWORD` | heslo ukázkových účtů pro `arkanum seed`. Bez něj se vygeneruje a vypíše |

OAuth2 se nastavuje při každém startu z prostředí, takže změny poskytovatelů v administraci přepíše.
Adresa pro přesměrování u poskytovatele je `APP_URL/api/oauth2-redirect`.

## Docker

```bash
docker build -t arkanum .
```

```bash
docker run --name arkanum -p 8090:8090 -v arkanum-data:/pb_data --env-file .env arkanum
```

Image běží pod neprivilegovaným uživatelem, data ukládá do svazku `/pb_data` a healthcheck volá
`/api/health`.

## Záloha `pb_data`

Vše podstatné je v adresáři `pb_data`: databáze `data.db`, pomocná `auxiliary.db` a nahrané soubory
ve `storage/`. Nejjednodušší jsou zálohy vestavěné v administraci (Settings → Backups), které umí běžet
i podle plánu a ukládat do S3. Ručně zálohujte až po zastavení serveru:

```bash
docker stop arkanum
```

```bash
docker run --rm -v arkanum-data:/data -v "$PWD":/backup alpine tar czf /backup/pb_data.tar.gz -C /data .
```

```bash
docker start arkanum
```
