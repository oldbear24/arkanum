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
| 7. Export | hotovo |
| 8. Později | nezačato, patří sem volné prvky z „Přidat prvek", GLB a moderace galerie |

## Prostředí

- PocketBase je ve verzi **v0.40.6** (poslední stabilní k 2. 11. 2026, vyžaduje Go 1.27). API jsem ověřil
  přímo ve zdrojácích modulu.
- `typescript-eslint` zatím nepodporuje TypeScript 7, proto je TypeScript připnutý na `~6.0`.
- `eslint-plugin-jsx-a11y` zatím nepodporuje ESLint 10, proto je ESLint připnutý na `^9`.
- Na vývojovém stroji není `make` jako takový, jen `mingw32-make` z MSYS2. Makefile proto spouští jen
  `go` a `npm` a nespoléhá na konkrétní shell. Ověřeno přes `mingw32-make`.
- Na vývojovém stroji není Docker. Image proto staví a spouští CI (job `docker`), který čeká na healthcheck, ověří
  API a frontend a zkontroluje, že data ve svazku přežijí restart.
- Repozitář je veřejný na <https://github.com/oldbear24/arkanum>. CI běží na každý push do `main` a na pull requesty.

## Vydání

Vydání spouští tag `v*`. Workflow `.github/workflows/release.yml` postaví Docker image pro `linux/amd64` a `linux/arm64`,
publikuje ho do `ghcr.io/oldbear24/arkanum` (značky jako `0.1.2`, `0.1` a `latest`) a ověří, že běží. Na obou architekturách
kontroluje, že `--version` vypíše číslo z tagu. Na amd64 navíc kontroluje healthcheck, API a frontend přes `compose.yaml`,
na arm64 běží pod emulací a kontroluje se jen tenhle výpis.

Provoz přes Compose popisuje [docker-compose.md](docker-compose.md). CI (job `docker`) prochází jeho příkazy s image z daného
commitu: spuštění, založení správce, ukázková data, záloha a obnova. Nastavení reverzní proxy z návodu ověřené není.

Binárky se zatím staví ručně z čistého commitu (`CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X main.version=X.Y.Z"`
pro Linux, macOS a Windows) a nahrávají se do GitHub Releases spolu s `checksums.txt`. U dosavadních vydání je přímo spuštěná
jen binárka pro Windows, ostatní se jen kompilují.

Verze `v0.1.1` a starší vypisují `(untracked)` místo čísla. Build bez čísla, tedy `make build` nebo `docker build` bez
`--build-arg VERSION`, vypíše `dev`.

Aktualizaci dat jsem před vydáním `v0.1.1` a `v0.1.2` ověřil na binárce pro Windows: ukázková data založená starší verzí
zůstala po spuštění nové verze beze změny, migrace proběhla a přihlášení heslem funguje. Návrat na starší verzi nad
stejnými daty také funguje, verze do `v0.1.1` při něm ale smažou poskytovatele OAuth2 nastavené v administraci. Aktualizace
Docker image se takhle nezkoušela, lokálně tu Docker není.

## Co není ověřené

- **Skutečné Safari.** Playwright WebKit na Windows neumí 3D skládání vůbec: rub prosvítá zrcadlově i na nejjednodušší
  testovací stránce a i u původního návrhu, takže o 3D kartě v Safari nic neříká. Export v něm funguje. Před ostrým
  provozem je potřeba 3D kartu prohlédnout na iPhonu nebo Macu.
- **Firefox.** Prohlížeč se na tomhle stroji nepodařilo spustit (systém odmítá `firefox.exe` s `Permission denied`).
- **E-maily** jsou nastavené a konfigurace je otestovaná, ale nic se reálně neodeslalo.
- **Skutečný Discord.** Přihlášení prochází celé proti falešnému serveru, včetně kódu poskytovatele v PocketBase
  a vyskakovacího okna v prohlížeči (`web/e2e/discord.spec.ts`), a falešný server jen napodobuje odpovědi Discordu.
  Se skutečným se nezkoušelo, protože tu nejsou přístupové údaje. Nevyzkoušené je i stažení avataru, falešný server
  žádný nevrací. Google a GitHub se nezkoušely vůbec.

## Rozhodnutí oproti zadání

### Server

- **Spuštění aplikace neotevírá prohlížeč.** PocketBase při prvním startu bez správce otevře instalační
  stránku v prohlížeči. Nahradil jsem to výpisem odkazu do konzole (`printInstallerLink`).
- **OAuth2 se nastavuje v administraci PocketBase,** ne proměnnými prostředí, jak chce zadání. Rozhodl o tom zadavatel:
  PocketBase na to má vlastní místo a přihlašovací stránka nabízí to, co vrátí `listAuthMethods`. Vyzkoušené ručně
  v administraci s falešnými klíči: tlačítko se objeví bez restartu a restart nastavení nezmění. Verze do `v0.1.1`
  poskytovatele při každém startu přepisovaly z prostředí, a tím mazaly nastavení z administrace. Klíče, které tak
  uložily, po aktualizaci zůstávají. Tajný klíč je v `_collections.options` nešifrovaně, `PB_ENCRYPTION_KEY` šifruje
  jen nastavení v `_params`.

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
- **`users.handle`:** při registraci přes OAuth2 hook handle odvodí z uživatelského jména u poskytovatele, potom
  z jeho zobrazovaného jména, a když ani jedno nestačí, použije `tvurce`. Z e-mailu ho neodvozuje, protože veřejný
  profil by prozradil část skryté adresy. Výchozí pole `name` jsem nahradil polem `displayName`.
- **`users.email`** není v databázi povinné (migrace `1793600002`). Discord neověřenou adresu nepředá a s povinným
  polem by přihlášení skončilo chybou. Registraci heslem bez adresy dál odmítá hook.
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
  `design/Karta.dc.html` a porovnává cesty, barvy, texty i hodnoty pohybu s přepisem. Pixelové porovnání s vykresleným
  návrhem dalo u karty v klidu nejvýš 0,05 % pixelů a u naklopené karty pod stejným kurzorem 0,00 %. Porovnávací skript
  není v repozitáři, protože potřebuje běhové prostředí návrhu `support.js`, které k předání nepatří.
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

- Pixelové porovnání s návrhem při 1440 px: `/sablony` 0,08 % pixelů, horní část `/` 0,21 % pixelů. Zbytek je
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

### Export (fáze 7)

- PNG i PDF se vykreslují v prohlížeči. `CardFace` se serializuje do SVG obrázku s `foreignObject`, písma a ilustrace
  jsou v něm vložené jako data URL a výsledek se nakreslí na canvas. Díky tomu je výstup stejný jako náhled,
  včetně fólie a ražby. Vyzkoušeno v Chromiu a ve WebKitu, kde se kvůli načítání kreslí opakovaně.
- PNG má šířku 1200 px (dvojnásobek náhledu 600 px), rohy jsou průhledné.
- **PDF:** skutečný rozměr v mm, 3 mm spadávka, ořezové značky, `TrimBox` a `BleedBox`, líc a rub na zvláštních
  stranách. Rastr má 450 DPI a nejdelší strana je omezená na 4096 px, aby to zvládly telefony. Text je součástí
  rastru a barvy jsou RGB. Převod do CMYK, který některé tiskárny chtějí, je mimo prohlížeč.
- **Spadávka** vzniká protažením krajních pixelů, ne jednobarevným pruhem. Fólie mění barvu okraje podél karty,
  takže rovný pruh by při nepřesném ořezu ukázal šev. Rohy v PDF jsou rovné, zaoblení je věc tiskárny.
- **Náhled** se vytvoří při publikování. Navíc oproti zadání se u sdílené karty obnoví 5 s po poslední úpravě, jinak
  by galerie ukazovala starou podobu. Když se náhled nepovede, publikování přesto proběhne a galerie kartu nakreslí sama.
- GLB je podle zadání až v pozdější fázi, tlačítko je vypnuté.

### Přístupnost

Playwright spouští `axe-core` nad veřejnými stránkami a dílnou a na telefonu měří cíle dotyku (aspoň 44 px). Z kontroly
kontrastu je vyjmutá samotná karta, protože její text leží na přechodech a fóliích. Oproti návrhu jsou proto větší
odebírání klíčového slova a zavírání hledání (návrh 40 a 36 px) a posuvníky mají větší aktivní plochu při stejném rozložení.

### Lajky

`likesCount` přepočítává jediný SQL příkaz, ne `app.Save`. Souběžné lajky tak nemůžou přepsat jeden druhý
a lajk nemění `updated` karty ani nebudí realtime odběratele v dílně.

### Ukázková data

`make seed` používá známé heslo `arkanum-dev`. Samotná binárka bez `SEED_PASSWORD` heslo vygeneruje a vypíše,
aby spuštění v produkci nezaložilo účty se známým heslem. Přihlášení: `demo@arkanum.example`.
