# Arkánum

Webová aplikace, ve které si uživatelé tvoří vlastní sběratelské karty s plně 3D náhledem.
Web je laděný do stylu tarotu. Šablony: Tarot, Orákulum, Bestie (bytosti pro vlastní karetní hru),
Hrdina a prázdná karta.

- **Kompletní zadání:** `docs/zadani.md` – přečti ho celé před začátkem práce.
- **Grafický návrh:** `design/` (popis v `design/README.md`). Je závazný pro rozložení, barvy,
  písma, texty v UI a chování 3D karty.
- **Postup a rozhodnutí:** průběžně zapisuj do `docs/postup.md` (co je hotové, co zbývá, proč
  ses rozhodl jinak než zadání).

## Stack

- **Backend:** Go + PocketBase použitý jako knihovna (ne samostatná binárka). Schéma v Go
  migracích (`migrations/`), hooky v Go. Jedna binárka servíruje API i postavený frontend
  (`embed`).
- **Frontend:** `web/` – React + TypeScript + Vite, React Router, PocketBase JS SDK.
  Styly přes CSS Modules a CSS proměnné v `web/src/styles/tokens.css`. Žádná UI knihovna.
- **Písma** hostuj lokálně přes `@fontsource` (Cinzel, Cormorant Garamond, Jost, Aboreto,
  Grenze Gotisch). Nenačítej nic z Google Fonts.
- **Testy:** Go testy (pravidla API, hooky), Vitest (logika karty), Playwright smoke test.
- Ověř si API aktuální stabilní verze PocketBase z jeho dokumentace – syntaxe pravidel a
  migrací se mezi verzemi měnila.

## Příkazy (založ je v první fázi a udržuj funkční)

- `make dev` – PocketBase na :8090 a Vite na :5173 (proxy `/api` a `/_` na :8090)
- `make build` – build frontendu a `go build` do `bin/arkanum`
- `make test`, `make lint`
- `make seed` – ukázková data pro vývoj

## Pravidla práce

- Pracuj samostatně po fázích ze zadání. Po každé fázi: build, typecheck a testy zelené,
  commit (Conventional Commits, anglicky), push. Ptej se jen u nevratných rozhodnutí.
- UI je česky (texty v `web/src/i18n/cs.ts`). Kód, identifikátory a commity anglicky.
- Přístupnost: skutečné `<button>`, `<a href>`, `<input>` s `<label>`, cíle dotyku aspoň 44 px,
  kontrast textu aspoň 4.5:1, `prefers-reduced-motion` vypíná náklon a otáčení karty.
- Šablona Bestie je vlastní design. Nekopíruj vzhled karet Pokémon ani jiných chráněných her
  a nepoužívej jejich postavy, loga ani názvy – ani ve výchozích šablonách, ani v ukázkových datech.
- Žádné tajné klíče v repu. Konfigurace přes proměnné prostředí, vzor v `.env.example`.
- Když síť v prostředí něco zablokuje (stažení prohlížečů pro Playwright apod.), krok přeskoč,
  zapiš to do `docs/postup.md` a pokračuj.
