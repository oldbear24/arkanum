# Arkánum – zadání

## 1. Cíl

- Uživatelé si v prohlížeči (desktop i telefon) navrhují vlastní karty, ukládají je, sdílejí
  v galerii a exportují k tisku.
- Karty jsou plně 3D: tloušťka, ořízka, ražba, fólie, lesk a hloubka ilustrace. Dají se naklánět,
  otáčet dokola a obracet na rub.
- Web je laděný do stylu tarotu: půlnoční indigo, antické zlato, slonovinový text.
- Šablony: Tarot, Orákulum, Bestie, Hrdina a prázdná karta s vlastním formátem.

## 2. Návrh a routy

| Soubor v `design/` | Routa / komponenta | Poznámka |
| --- | --- | --- |
| `Main.dc.html` | `/` | úvod, ukázka šablon, galerie |
| `Sablony.dc.html` | `/sablony` | výběr šablony, prázdná karta s formátem |
| `Dilna.dc.html` | `/dilna/:id` | editor, desktop a tablet |
| `Mobil.dc.html` | `/dilna/:id` pod 768 px | editor na telefonu |
| `Karta.dc.html` | komponenty `Card3D`, `CardFace`, `CardBack` | vykreslení karty – přepiš věrně |

Bez návrhu (odvoď z vizuálního jazyka ostatních obrazovek): `/karta/:id` detail,
`/prihlaseni`, `/registrace`, `/@:handle` profil a sbírka, `/balicky/:id`.

### Vizuální tokeny (z návrhu)

- Pozadí `#0f0d1e`, panely `#13112a` a `#16132b`, zvýšené plochy `#1d1936`, linky `#2b2650` a `#3a3468`.
- Text `#efe6d0`, sekundární `#c4bbd6`, terciární `#a49cbd`.
- Zlato `#d6b067` (text na zlatém tlačítku `#1b1405`), hover odkazu `#f6dfa8`.
- Stav „Uloženo“: tečka `#7fd3a6`, text `#a6e3c2` na `#14261f`.
- Písma: Cinzel (nadpisy, čísla), Cormorant Garamond (názvy karet, citace), Jost (UI).
- Pozadí stránek je jemné hvězdné pole z několika vrstev bodových `radial-gradient` (viz kořen `Main.dc.html`).

## 3. Komponenta karty

Přepiš z `design/Karta.dc.html`. Názvy parametrů zachovej:
`variant, art, frame, palette, element, foil, foilI, surface, emboss, edge, thick, radius, depth,
light, font, cardTitle, numeral, subtitle, cls, hp, level, ab1, ab1p, ab1t, ab2, ab2p, ab2t,
rarity, cost, s1, s2, s3, author, setNo, showArt, showFrame, showText, showFoil, flip, spin,
interactive (tilt | drag | none), resetKey`.

### Konstrukce

- Scéna s `perspective`, karta s `transform-style: preserve-3d`, 10 vrstev hrany mezi lícem a rubem
  (tloušťka a barva ořízky), líc a rub s `backface-visibility: hidden`.
- Líc je jedno SVG – `viewBox` 300 × 514 pro tarot a orákulum (70 × 120 mm), 300 × 419 pro bestii
  a hrdinu (63 × 88 mm). Okno ilustrace je `clipPath`, nad ním rám, ornamenty a plakety.
  Texty jsou HTML vrstvy v jednotkách `em`, kde 1 em = šířka karty / 18,75.
- Zlatý lesk: `linearGradient` v `userSpaceOnUse`, jehož poloha se posouvá podle světla nebo kurzoru.
- Fólie: duhová (vrstva s `color-dodge`), kosmická (jiskry s `screen`), odlesk (`soft-light`
  radial). Ražba je SVG stín pod rámem.
- Paralaxa: ilustrace ve dvou skupinách (pozadí, popředí) posouvaných podle náklonu × hloubka.
- Režimy: `tilt` (náklon pod kurzorem a návrat), `drag` (tažením otáčení dokola s pointer capture),
  `none`. `spin` plynule otáčí, `flip` ukáže rub, změna `resetKey` kartu vyrovná.

### Povinná vylepšení oproti prototypu

- Pohyb nesmí překreslovat React: pointermove → `requestAnimationFrame` → CSS proměnné na elementu
  (`--rx`, `--ry`, `--gx`, `--gy` …). React se překreslí jen při změně parametrů karty.
- Cesty SVG memoizuj podle parametrů. Id gradientů a clipPath generuj přes `useId`.
- Rozděl na `CardFace` (plochý líc bez 3D, použije se i pro náhledy a export), `CardBack` a `Card3D`.
- Vlastní ilustrace: má-li karta nahraný obrázek, okno místo vestavěné kresby ukáže `<image>`
  oříznutý oknem, s posunem a zoomem z `artworkTransform`. Až 3 vrstvy pro paralaxu
  (pozadí, střed, popředí).
- V galerii běží živé 3D jen u karet ve výřezu (IntersectionObserver), ostatní ukazují náhled.
- `prefers-reduced-motion` vypne náklon, otáčení i animaci obrácení.

## 4. Data karty (JSON)

```json
{
  "look": {
    "variant": "tarot", "art": "hvezda", "frame": "secese", "palette": "pulnoc", "element": "mlha",
    "foil": "zlata", "foilI": 70, "surface": "saten", "emboss": true, "edge": "zlata",
    "thick": 4, "radius": 14, "depth": 60, "font": "cinzel",
    "visible": { "art": true, "frame": true, "text": true, "foil": true }
  },
  "content": {
    "numeral": "XVII", "subtitle": "", "cls": "Paladin · Legenda",
    "hp": 70, "level": 2, "cost": 5, "s1": 4, "s2": 6, "s3": 2, "rarity": 3,
    "abilities": [
      { "name": "Mámení", "power": 20, "text": "" },
      { "name": "Bažinné světlo", "power": 50, "text": "" }
    ],
    "elements": []
  },
  "meaning": { "arcana": "velka", "upright": "", "reversed": "", "keywords": ["naděje"] }
}
```

Výchozí hodnoty a povolené hodnoty výčtů vezmi z `Karta.dc.html` (`pick(...)`) a z `VDEF`
v `Dilna.dc.html`. Validaci a doplnění výchozích hodnot dělej v jedné funkci `normalizeCard()`
s unit testy. Stejné meze (rozsahy čísel, výčty, délky textů) hlídej i v Go hooku před uložením.

## 5. Datový model PocketBase

### `users` (auth)

Pole navíc: `handle` (text, unikátní, `^[a-z0-9_]{3,24}$`), `displayName`, `avatar` (obrázek, max 2 MB).
Profily jsou veřejné, e-mail zůstává skrytý. Upravit může jen vlastník.

### `templates`

Pole: `name`, `slug` (unikátní), `family` (select: tarot, orakulum, bestie, hrdina, prazdna),
`formatW`, `formatH` (mm), `defaults` (json – look a content), `system` (bool),
`author` (relation users), `visibility` (private, public).

- list/view: `system = true || visibility = "public" || author = @request.auth.id`
- create: `@request.auth.id != "" && @request.body.author = @request.auth.id && @request.body.system:isset = false`
- update/delete: `system = false && author = @request.auth.id`

Systémové šablony vlož migrací: Tarot 70 × 120, Orákulum 70 × 120, Bestie 63 × 88,
Hrdina 63 × 88, Prázdná.

### `cards`

Pole: `owner` (relation users, povinné), `title` (text, max 28), `template` (relation),
`family` (select), `formatW`, `formatH`, `look`, `content`, `meaning` (json),
`artwork` (obrázek, max 10 MB, thumb `600x0`), `artworkLayers` (obrázky, max 3),
`artworkTransform` (json), `thumbnail` (png), `visibility` (private, unlisted, public; výchozí private),
`remixOf` (relation cards), `editors` (relation users, více), `likesCount` (number, mění jen hook),
`created`, `updated`.

- list: `visibility = "public" || owner = @request.auth.id || editors.id ?= @request.auth.id`
- view: `visibility != "private" || owner = @request.auth.id || editors.id ?= @request.auth.id`
- create: `@request.auth.id != "" && @request.body.owner = @request.auth.id && @request.body.likesCount:isset = false`
- update: `(owner = @request.auth.id || editors.id ?= @request.auth.id) && @request.body.owner:isset = false && @request.body.likesCount:isset = false && (owner = @request.auth.id || (@request.body.editors:isset = false && @request.body.visibility:isset = false))`
- delete: `owner = @request.auth.id`

Indexy: `(visibility, created)`, `(visibility, likesCount)`, `owner`.

### `decks`

Pole: `owner`, `name`, `description`, `cards` (relation cards, více, pořadí = pořadí v balíčku),
`back` (json – vzhled rubu celého balíčku), `visibility`. Pravidla jako u `cards`, bez `editors`.

### `likes`

Pole: `user`, `card`, unikátní index `(user, card)`.

- list/view: veřejné
- create: `@request.auth.id != "" && @request.body.user = @request.auth.id`
- delete: `user = @request.auth.id`
- update: zakázáno

Go hook po vytvoření a smazání přepočítá `cards.likesCount`.

### Realtime

Dílna odebírá `cards/<id>`. Změny od spoluautora se promítnou do stavu (vyhrává poslední zápis)
a v hlavičce se ukáže, kdo kartu upravuje.

## 6. Obrazovky a chování

### Úvod `/`

- Hlavička: Galerie, Šablony, Dílna, hledání, „Nová karta“ → `/sablony`, účet.
- Hero s vějířem tří karet (tilt) a astrolábem. „Začít tvořit“ → `/sablony`, „Procházet galerii“ → kotva.
- Pás čtyř šablon.
- Galerie: filtr Vše / Tarot / Bestie / Hrdinové / Orákulum, řazení Nejnovější (`-created`) a
  Nejoblíbenější (`-likesCount`), stránkování po 24 s načítáním při posunu. Srdíčko funguje
  optimisticky, nepřihlášeného pošle na přihlášení.

### Šablony `/sablony`

- Rodiny šablon s vějíři karet, filtr Vše / Věštecké / Herní. „Použít šablonu“ vytvoří kartu
  z `defaults` šablony a otevře ji v dílně.
- Prázdná karta: formáty Tarot 70 × 120, Sběratelská 63 × 88, Mini 44 × 68, Čtvercová 70 × 70,
  Vlastní (30–200 mm), orientace a náhled poměru stran.

### Dílna `/dilna/:id`

- Desktop: levý panel (šablona, vrstvy se skrýváním, přidat prvek), střed (3D náhled v režimu
  `drag`, zoom 70–140 %, líc a rub, otáčení, vyrovnání, světlo), pravý panel se záložkami
  Vzhled / Materiál / Text / Význam (tarot), Výklad (orákulum) nebo Hra (bestie, hrdina) a export.
- Mobil: karta nahoře, nastavení ve spodním panelu se záložkami (viz `Mobil.dc.html`).
- Zpět a znovu (Ctrl+Z, Ctrl+Shift+Z). Automatické ukládání 800 ms po poslední změně, v hlavičce
  stav „Ukládám…“, „Uloženo“ nebo „Offline“.
- Přepnutí šablony nastaví její výchozí hodnoty. Pokud uživatel ručně upravil texty, nejdřív se zeptá.
- Nahrání ilustrace (přetažením i výběrem), posun a zoom v okně, až 3 vrstvy pro paralaxu.
- „Publikovat“ přepne kartu na veřejnou a vygeneruje náhled. „Sdílet“ dá odkaz na `/karta/:id`
  a umožní přidat spoluautory (`editors`).

### Detail karty `/karta/:id`

Velká karta (`drag`), název, autor, šablona, význam nebo statistiky. Akce: Líbí se mi,
Remixovat (kopie do mých karet s `remixOf`), Přidat do balíčku, Sdílet. Vlastník navíc Upravit a Export.

### Profil `/@:handle`

Mřížka karet a balíčků uživatele. Na vlastním profilu i soukromé karty.

### Přihlášení

E-mail a heslo, ověření e-mailu, obnova hesla. OAuth2 (Google, GitHub, Discord) volitelně,
zapnuté proměnnými prostředí.

## 7. Export

- PNG: `CardFace` ve dvojnásobném rozlišení.
- PDF k tisku: skutečný rozměr v mm, spadávka 3 mm, ořezové značky, líc a rub na zvláštních
  stranách (pdf-lib).
- Náhled 600 px se generuje při publikování a ukládá do `thumbnail`.
- 3D model GLB (three.js, zaoblený kvádr s texturami líce a rubu) až v pozdější fázi.

## 8. Fáze

1. **Kostra** – Go modul s PocketBase, `web/` (Vite, React, TS), Makefile, Dockerfile,
   GitHub Actions (lint, typecheck, test, build), README.
   Hotovo, když `make build` vyrobí jednu binárku, která servíruje API i frontend.
2. **Data** – migrace všech kolekcí, pravidla, hook lajků, seed šablon, `make seed` s ukázkovými
   kartami. Go testy pravidel: cizí soukromá karta je nedostupná, nejde změnit `owner` ani
   `likesCount`, spoluautor nezmění `visibility`, dvojitý lajk selže.
3. **Karta** – `CardFace`, `CardBack`, `Card3D`, `normalizeCard()` a stránka `/dev/karty`
   se všemi variantami a ovládáním parametrů. Vizuálně odpovídá `design/Karta.dc.html`.
4. **Úvod, šablony, přihlášení, profil.**
5. **Dílna** – desktop i mobil, všechna nastavení z návrhu, autosave, realtime, zpět a znovu,
   nahrání ilustrace.
6. **Detail karty, lajky, remix, balíčky.**
7. **Export** – PNG, PDF, náhledy.
8. **Později** – volné prvky z „Přidat prvek“ (text, obrázek, symbol, ornament, statistika, tvar,
   volně umístěné na kartě a uložené v `content.elements`), GLB, nahlašování a moderace galerie.

Na konci každé fáze aktualizuj `docs/postup.md` a README.

## 9. Nasazení

- Vícestupňový Dockerfile (build frontendu → `go build` → malý runtime image), svazek `/pb_data`,
  port 8090, healthcheck na `/api/health`.
- Proměnné prostředí: `PB_ENCRYPTION_KEY`, SMTP, OAuth klíče, `APP_URL`. Vzor v `.env.example`.
- README: lokální vývoj, build, Docker, záloha `pb_data`.

## 10. Mimo rozsah

Platby, tisk na zakázku, nativní mobilní aplikace, generování ilustrací pomocí AI.
