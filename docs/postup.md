# Postup a rozhodnutí

## Stav fází

| Fáze | Stav |
| --- | --- |
| 1. Kostra | hotovo |
| 2. Data | hotovo |
| 3. Karta | hotovo |
| 4. Úvod, šablony, přihlášení, profil | hotovo |
| 5. Dílna | hotovo |
| 6. Detail karty, lajky, remix, balíčky | hotovo |
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

### Komponenta karty (fáze 3)

- **Věrnost návrhu ověřuju dvakrát.** `web/src/card/prototype.test.ts` spouští skutečný kód z
  `design/Karta.dc.html` a porovnává cesty, barvy, texty i hodnoty pohybu s přepisem. Pixelové porovnání deseti
  variant s vykresleným návrhem dalo rozdíl nejvýš 0,38 % pixelů (vyhlazení textu). Porovnávací skript není
  v repozitáři, protože potřebuje běhové prostředí návrhu `support.js`, které k předání nepatří.
- `CardFace` a `CardBack` mají styly inline, ne v CSS Modules. Export serializuje jejich DOM do SVG obrázku a tam
  externí styly neplatí.
- `prefers-reduced-motion` vypíná i otáčení tažením (režim `drag`), protože zadání říká „vypne náklon, otáčení
  i animaci obrácení". Líc a rub lze dál přepínat tlačítky, jen bez animace.
- Prototyp bere prázdný text jako „použij výchozí" (`txt()`). Zachoval jsem to, protože na tom stojí návrh: prázdný
  „Popis bytosti" zobrazí text podle elementu. Vrácení výchozího textu ukazuje v dílně `placeholder` pole.
- Na kartě bestie je „ÚR. 2" s mezerou, jak je to ve zdroji návrhu. Běhové prostředí návrhu mezeru při vykreslení
  zahazuje, jde o jeho chybu.
- **Prázdná karta** není v návrhu, geometrii jsem odvodil z tarotu (`buildBlank`). Přizpůsobuje se libovolnému
  poměru stran, rám i okno se při extrémních formátech zmenšují.
- Vlastní parametry navíc oproti návrhu: `artwork`, `formatW`, `formatH`, `backPalette`. Parametr `pad` z prototypu
  odpadl, odsazení řeší rodič.
- `artworkTransform` je `{ x, y, zoom, layers: [{ x, y, zoom }] }`. `x` a `y` jsou procenta velikosti okna. Vrstvy
  v `artworkLayers` jdou od pozadí k popředí a hloubku určuje jejich počet (1: pozadí, 2: pozadí a popředí,
  3: pozadí, střed a popředí). Obrázek přesahuje okno o 16 jednotek, aby paralaxa neodhalila okraj.

### Úvod, šablony, přihlášení, profil (fáze 4)

- Pixelové porovnání s návrhem při 1440 px: `/sablony` 0,62 % pixelů, horní část `/` 0,17 % pixelů. Zbytek je
  vyhlazení textu.
- **Bez globálního `box-sizing: border-box`.** Návrh počítá s výchozím `content-box` (šířka 1280 px je bez
  odsazení), `border-box` mají jen pole formulářů. S globálním resetem by byl obsah o 96 px užší.
- **Vlastní `web/src/styles/fonts.css`** místo importů z `@fontsource`. Tamní soubory po jednotlivých subsetech
  nemají `unicode-range`, takže `latin-ext` přebíjel základní latinku (špatně se kreslilo „Á" a měřily `ch`).
  Soubor se odkazuje na písma v `node_modules/@fontsource`, jen woff2 a použité řezy.
- Trasa `/@:handle` je v React Routeru `/:atHandle` s kontrolou `@` ve stránce, částečné segmenty router neumí.
- `/dilna` bez id otevře naposledy upravenou kartu uživatele, případně pošle na `/sablony`.
- Hledání v hlavičce je rozbalovací pole, na `/` filtruje galerii podle názvu, na `/sablony` šablony. Filtr
  a řazení galerie jsou v adrese, aby šly sdílet.
- Návrh používá pro „Použít šablonu" odkaz. Protože akce vytváří záznam, je to skutečné tlačítko.
- Stránky bez návrhu (přihlášení, registrace, obnova hesla, ověření e-mailu, profil, 404) jsem odvodil
  z vizuálního jazyka ostatních obrazovek. Přibyla stránka `/zmena-emailu/:token`, protože na ni míří e-mail.

### Dílna (fáze 5)

- Pixelové porovnání s návrhem při 1440 × 1000: 1,5 % pixelů, hlavně ukázkové avatary spoluautorů, které návrh
  kreslí napevno. Mobil při 390 × 844 sedí na rozložení, liší se jen výchozí fólie v prototypu a tlačítka navíc.
- **Přítomnost spoluautorů:** PocketBase realtime ji neumí, proto je tu vlastní trasa
  `POST/DELETE /api/arkanum/presence/{card}` a vlastní realtime téma `arkanum/presence/<id>`. Stav je jen v paměti
  serveru, což stačí pro jednu binárku. Odběr tématu je povolený jen tomu, kdo smí kartu upravovat.
- **Odesílání do realtime kanálu běží na pozadí.** `client.Send` blokuje, dokud si klient zprávu nepřečte, takže
  pomalé spojení by jinak zdrželo cizí požadavek. Odhalil to test, který se zasekl.
- **Zpět a znovu** obsluhuje aplikace i uvnitř textových polí, protože jsou řízená Reactem a nativní zpět v nich
  nefunguje spolehlivě. Série rychlých změn stejného pole je jeden krok (800 ms). Nahrávání souborů do historie
  nepatří, vrací se jen jejich umístění.
- **Změny od spoluautora** se do historie nezapisují. Má-li uživatel neuložené změny, vyhrává jeho zápis.
- **Přepnutí šablony** resetuje jen hodnoty z `VDEF`, zbytek (tloušťka, povrch, písmo…) zůstává. Navíc oproti `VDEF`
  tarot resetuje význam, jinak by po přepnutí přes orákulum zůstal v tarotu výklad orákula. Dotaz se ukáže, jen když
  se změnil text, který daná rodina opravdu používá.
- Tlačítko „Prázdná" se v levém panelu ukazuje jen u prázdné karty, návrh počítá se čtyřmi šablonami.
- Vrstvy v levém panelu po kliknutí otevřou odpovídající záložku, prototyp je jen zvýrazňoval.
- **Rozšíření oproti návrhu, bez kterých by šlo něco nastavit jen na desktopu nebo vůbec:**
  - Účinek schopností bestie, návrh má pole jen pro název a sílu. Text karty by jinak nešel změnit.
  - Na mobilu jsou všechna nastavení z desktopu, ne jen podmnožina z `Mobil.dc.html`. Návrhové pořadí je
    zachované, navíc přibyla ilustrace, vrstvy, povrch a zaoblení.
  - Na mobilu přibylo zpět, znovu a sdílet, protože telefon nemá klávesové zkratky.
- „Přidat prvek" a „3D model" jsou podle fáze 8 vypnuté tlačítka s vysvětlením.
- Ovládání vrstev paralaxy se ukazuje až po nahrání ilustrace, aby výchozí panel odpovídal návrhu. Vrstvy jdou
  přeskládat šipkami.
- Soubory karet nejsou v PocketBase `protected`, protože by je host bez tokenu nenačetl. Názvy souborů mají
  náhodnou příponu, takže je nejde uhodnout.

### Detail karty a balíčky (fáze 6)

- `/karta/:id` a `/balicky/:id` návrh nemají, odvodil jsem je z dílny a galerie.
- Remix kopíruje kartu na klientu včetně ilustrací. Kopie je vždy soukromá, náhled se vytvoří až při publikování.
- Na detailu přibylo mazání karty pro vlastníka, protože jinde v aplikaci mazání není. Pravidlo API ho povoluje.
- Spoluautor má na detailu „Upravit" také, „Export" podle zadání jen vlastník.
- `decks.back` je `{ palette, edge }`. Paleta a ořízka platí pro všechny karty v balíčku, a to i pro bestie a hrdiny,
  jejichž rub má jinak pevné barvy. Karty, které divák nesmí vidět, se v balíčku vynechají a stránka je spočítá.
- Pořadí karet se mění tlačítky, aby to šlo i klávesnicí a na telefonu. Skryté karty si drží své místo.
- Na vlastním profilu přibyl formulář „Nový balíček", aby balíček nešlo založit jen přes kartu.

### Lajky

`likesCount` přepočítává jediný SQL příkaz, ne `app.Save`. Souběžné lajky tak nemůžou přepsat jeden druhý
a lajk nemění `updated` karty ani nebudí realtime odběratele v dílně.

### Ukázková data

`make seed` používá známé heslo `arkanum-dev`. Samotná binárka bez `SEED_PASSWORD` heslo vygeneruje a vypíše,
aby spuštění v produkci nezaložilo účty se známým heslem. Přihlášení: `demo@arkanum.example`.
