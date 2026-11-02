# Postup a rozhodnutí

## Stav fází

| Fáze | Stav |
| --- | --- |
| 1. Kostra | hotovo |
| 2. Data | čeká |
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

Průběžně doplňuji u jednotlivých fází.
