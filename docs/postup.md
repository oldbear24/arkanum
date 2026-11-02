# Postup a rozhodnutí

## Stav fází

| Fáze | Stav |
| --- | --- |
| 1. Kostra | hotovo |
| 2. Data | hotovo |
| 3. Karta | čeká |
| 4. Úvod, šablony, přihlášení, profil | čeká |
| 5. Dílna | čeká |
| 6. Detail karty, lajky, remix, balíčky | čeká |
| 7. Export | čeká |
| 8. Později | mimo tuto iteraci |

## Prostředí

- PocketBase je ve verzi **v0.40.6** (poslední stabilní k 2. 11. 2026, vyžaduje Go 1.27). API jsem ověřil
  přímo ve zdrojácích modulu.
- `typescript-eslint` zatím nepodporuje TypeScript 7, proto je TypeScript připnutý na `~6.0`.
- `eslint-plugin-jsx-a11y` zatím nepodporuje ESLint 10, proto je ESLint připnutý na `^9`.
- Na vývojovém stroji není `make` jako takový, jen `mingw32-make` z MSYS2. Makefile proto spouští jen
  `go` a `npm` a nespoléhá na konkrétní shell. Ověřeno přes `mingw32-make`.
- Na vývojovém stroji není Docker, takže **Dockerfile není ověřený skutečným buildem**.
- Repozitář zatím nemá vzdálený `origin`, commity zůstávají lokálně a `push` se neprovádí.

## Rozhodnutí oproti zadání

### Server

- **Spuštění aplikace neotevírá prohlížeč.** PocketBase při prvním startu bez správce otevře instalační
  stránku v prohlížeči. Nahradil jsem to výpisem odkazu do konzole (`printInstallerLink`).

### Pravidla API (fáze 2)

Testy odhalily, že některá pravidla ze zadání jsou v PocketBase v0.40 děravá. Všechny níže uvedené úpravy
pravidla jen zpřísňují a pokrývají je testy v `internal/hooks/rules_test.go`.

- **`cards`: ochrana před nepřihlášenými.** Pro hosta se `@request.auth.id` vyhodnotí jako `NULL` a PocketBase
  bere `NULL ?= NULL` jako pravdu. U karty bez spoluautorů tak `editors.id ?= @request.auth.id` projde, takže
  podle znění ze zadání mohl **host číst i přepisovat soukromé karty**. Přidal jsem podmínku
  `@request.auth.id != ""` do `list`, `view` a `update`.
- **`templates`: stejná ochrana.** `author` je u systémových šablon prázdný, proto i tady je `@request.auth.id != ""`.
- **`templates.update`** navíc zakazuje měnit `system` a `author`. Podle zadání by si uživatel mohl vlastní
  šablonu sám povýšit na systémovou.
- **`likes`:** hook navíc odmítne lajk karty, kterou uživatel nesmí vidět, aby lajk neprozradil existenci
  soukromé karty.
- **`users`:** `emailVisibility` hook vždy vrací na `false`, protože zadání chce e-mail skrytý trvale. Filtrování
  podle e-mailu pro cizí uživatele blokuje už sám PocketBase, ověřeno testem.
- **`users.handle`:** při registraci přes OAuth2 hook handle vygeneruje z e-mailu. Výchozí pole `name` jsem
  nahradil polem `displayName`.
- **`visibility`** je povinné a prázdnou hodnotu hook nahradí `private`. Prázdná hodnota by jinak prošla přes
  `visibility != "private"`.

### Data karty

- Meze a výčty jsou v `cardspec/spec.json` a výchozí hodnoty šablon v `cardspec/templates.json`. Soubory čte
  Go hook i `normalizeCard()`, takže meze nemůžou mezi serverem a klientem ujet.
- Výčet `variant` má navíc hodnotu `prazdna`, protože návrh prázdnou kartu nekreslí, ale zadání ji chce.
- `content` má navíc volitelné `setNo` (číslo v sadě), které karta bestie a hrdiny zobrazuje.
- Meze, které návrh neurčuje (`subtitle` 120, `abilityText` 200, `upright`/`reversed` 1000, 12 klíčových slov
  po 24 znacích), jsem zvolil sám.
- `template.defaults` obsahuje kromě `look` a `content` i `title` a `meaning`, aby nová karta měla výchozí význam.

### Lajky

`likesCount` přepočítává jediný SQL příkaz, ne `app.Save`. Souběžné lajky tak nemůžou přepsat jeden druhý
a lajk nemění `updated` karty ani nebudí realtime odběratele v dílně.

### Ukázková data

`make seed` používá známé heslo `arkanum-dev`. Samotná binárka bez `SEED_PASSWORD` heslo vygeneruje a vypíše,
aby spuštění v produkci nezaložilo účty se známým heslem. Přihlášení: `demo@arkanum.example`.
