# Arkánum

Dílna vlastních sběratelských karet s plně 3D náhledem. Tarot, orákulum, bestie, hrdinové i prázdná
karta s vlastním formátem. Karty se ukládají, sdílejí v galerii a exportují k tisku.

- **Backend:** Go + [PocketBase](https://pocketbase.io) jako knihovna (v0.40). Schéma a hooky jsou v Go.
- **Frontend:** React, TypeScript, Vite v adresáři `web/`. Vestavěný do binárky přes `embed`.
- **Zadání a návrh:** [docs/zadani.md](docs/zadani.md), [design/](design/README.md).
- **Stav prací a rozhodnutí:** [docs/postup.md](docs/postup.md).

## Stažení

Nejjednodušší je Docker image pro `linux/amd64` a `linux/arm64`:

```bash
docker run --name arkanum -p 8090:8090 -v arkanum-data:/pb_data ghcr.io/oldbear24/arkanum:latest
```

Aplikace pak běží na `http://localhost:8090`. Pro trvalý provoz je tu [návod pro Docker Compose](docs/docker-compose.md),
další podrobnosti jsou v části [Docker](#docker). Hotové binárky pro Linux,
macOS a Windows jsou v [Releases](https://github.com/oldbear24/arkanum/releases). Stačí archiv rozbalit a spustit
`./arkanum serve --http=127.0.0.1:8090`.

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
server do konzole odkaz na jeho založení. Prohlížeč sám neotevírá. Konfiguraci si `make dev` a `make seed` načtou
ze souboru `.env`, pokud existuje. Ostatní příkazy ho nečtou, takže testy nikdy nesahají na skutečnou poštu ani
přihlašovací služby.

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
sama nečte, předává ho například Docker Compose, `docker run --env-file` nebo `make dev`.

| Proměnná | Význam |
| --- | --- |
| `PB_ENCRYPTION_KEY` | 32 znaků, šifruje nastavení PocketBase (heslo SMTP, tajné klíče OAuth2) |
| `APP_URL` | veřejná adresa aplikace, použije se v odkazech v e-mailech |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_TLS`, `SMTP_SENDER_ADDRESS`, `SMTP_SENDER_NAME` | odesílání e-mailů. Bez `SMTP_HOST` se nastavení nemění |
| `GOOGLE_CLIENT_ID`/`_SECRET`, `GITHUB_CLIENT_ID`/`_SECRET`, `DISCORD_CLIENT_ID`/`_SECRET` | přihlášení přes OAuth2. Poskytovatel se zapne, až když má obě hodnoty |
| `SEED_PASSWORD` | heslo ukázkových účtů pro `arkanum seed`. Bez něj se vygeneruje a vypíše |

OAuth2 se nastavuje při každém startu z prostředí, takže změny poskytovatelů v administraci přepíše.
Adresa pro přesměrování u poskytovatele je adresa, na které aplikaci otevíráte v prohlížeči, doplněná
o `/api/oauth2-redirect`.

### Přihlášení přes Discord

1. V [Discord Developer Portalu](https://discord.com/developers/applications) založte aplikaci tlačítkem
   **New Application**.
2. V části **OAuth2** si zkopírujte **Client ID** a tlačítkem **Reset Secret** vytvořte **Client Secret**.
3. Tamtéž do **Redirects** přidejte adresy, na kterých aplikaci otevíráte. Discord je porovnává znak po znaku, takže
   `localhost` a `127.0.0.1` jsou pro něj dvě různé adresy.

   | Kde aplikace běží | Adresa pro přesměrování |
   | --- | --- |
   | veřejný server | `https://karty.example.cz/api/oauth2-redirect` |
   | `make dev` | `http://localhost:5173/api/oauth2-redirect` |
   | binárka nebo Docker na vlastním počítači | `http://localhost:8090/api/oauth2-redirect` |

4. Do souboru `.env` doplňte oba klíče. Git tento soubor ignoruje, klíče do repozitáře nepatří.

   ```bash
   DISCORD_CLIENT_ID=...
   DISCORD_CLIENT_SECRET=...
   ```

5. Restartujte aplikaci. Na stránkách přihlášení a registrace přibude tlačítko Discord.

Jak se přihlášení chová:

- **Nový účet** převezme z Discordu uživatelské jméno jako `handle`, zobrazované jméno a avatar. Všechno jde později
  změnit na profilu. Je-li `handle` obsazený, dostane příponu.
- **Existující účet** se stejnou adresou se s Discordem propojí a další přihlášení už na něj vede. Jde to jen tehdy,
  když je adresa na Discordu ověřená. Pokud ji dosud neověřil účet v aplikaci, jeho heslo přestane platit, protože
  takový účet mohl založit kdokoli s cizí adresou. Nové heslo si uživatel nastaví přes „Zapomenuté heslo“.
- **Bez ověřené adresy** Discord e-mail nepředá. Vznikne účet bez e-mailu, který funguje běžně, jen si nemůže nechat
  poslat obnovu hesla. Adresa se doplní při prvním přihlášení poté, co ji uživatel na Discordu ověří.

## Docker

Image se publikuje do `ghcr.io/oldbear24/arkanum` při každém tagu `v*`, se značkami podle verze (například `0.1.0`
a `0.1`) a `latest`. Pro trvalý provoz doporučujeme [Docker Compose](docs/docker-compose.md) a přiložený
[compose.yaml](compose.yaml), jednorázově stačí:

```bash
docker run --name arkanum -p 8090:8090 -v arkanum-data:/pb_data --env-file .env ghcr.io/oldbear24/arkanum:latest
```

Image běží pod neprivilegovaným uživatelem, data ukládá do svazku `/pb_data` a healthcheck volá
`/api/health`. Správce založíte takto:

```bash
docker exec arkanum arkanum superuser upsert EMAIL HESLO --dir=/pb_data
```

Vlastní image sestavíte z kořene repozitáře:

```bash
docker build -t arkanum .
```

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
