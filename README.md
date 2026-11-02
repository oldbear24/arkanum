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
make dev
```

Spustí PocketBase na `http://127.0.0.1:8090` a Vite na `http://localhost:5173`. Vite přeposílá `/api`
a `/_` na PocketBase. Administrace je na `http://127.0.0.1:8090/_/`. Při prvním spuštění vypíše server
do konzole odkaz na založení správce.

| Příkaz | Co dělá |
| --- | --- |
| `make dev` | PocketBase na :8090 a Vite na :5173 |
| `make build` | build frontendu a `go build` do `bin/arkanum` |
| `make test` | Go testy a Vitest |
| `make test-e2e` | Playwright smoke test proti postavené binárce |
| `make lint` | `go vet`, `gofmt`, ESLint a typecheck |
| `make seed` | ukázková data pro vývoj |

## Build

```bash
make build
./bin/arkanum serve --http=127.0.0.1:8090
```

Výsledná binárka servíruje API i frontend. Data ukládá do `pb_data` vedle binárky, jiný adresář určí
přepínač `--dir`.

## Docker

```bash
docker build -t arkanum .
docker run -p 8090:8090 -v arkanum-data:/pb_data --env-file .env arkanum
```

Image běží pod neprivilegovaným uživatelem, data ukládá do svazku `/pb_data` a healthcheck volá
`/api/health`. Vzor konfigurace je v [.env.example](.env.example).

## Záloha `pb_data`

Vše podstatné je v adresáři `pb_data`: databáze `data.db`, pomocná `auxiliary.db` a nahrané soubory
ve `storage/`. Nejjednodušší jsou zálohy vestavěné v administraci (Settings → Backups), které umí běžet
i podle plánu a ukládat do S3. Ručně zálohujte až po zastavení serveru:

```bash
docker stop arkanum
docker run --rm -v arkanum-data:/data -v "$PWD":/backup alpine tar czf /backup/pb_data.tar.gz -C /data .
docker start arkanum
```
