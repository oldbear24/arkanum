# Návrh – Arkánum

Soubory `*.dc.html` jsou zdroj artboardů z návrhového plátna (formát Design Component).
Samostatně se nespustí – odkazují na běhové prostředí `support.js`, které tu není.
Čti je jako přesnou referenci rozložení, barev, rozměrů, textů a logiky:

- `<x-dc>…</x-dc>` je markup obrazovky. `{{cesta}}` jsou hodnoty z `renderVals()`,
  `<sc-for>` je opakování, `<sc-if>` podmínka, `<dc-import name="Karta" …>` vkládá komponentu karty
  (atributy v kebab-case odpovídají parametrům v camelCase, např. `card-title` → `cardTitle`).
- `<script type="text/x-dc">` obsahuje třídu `Component`: stav, obsluhu událostí a `renderVals()`
  s daty a výchozími hodnotami.
- Inline `style` nese přesné rozměry, barvy a písma.

| Soubor | Obsah |
| --- | --- |
| `Main.dc.html` | úvod, ukázka šablon a galerie (plynulé rozložení, navrženo na 1440 px) |
| `Sablony.dc.html` | výběr šablony a prázdná karta s formátem |
| `Dilna.dc.html` | editor na desktopu – všechny ovládací prvky a výchozí hodnoty šablon (`VDEF`) |
| `Mobil.dc.html` | editor na telefonu (390 × 844) |
| `Karta.dc.html` | kompletní 3D karta: geometrie rámů a ilustrací (`build()`), palety, elementy, ořízky, fólie, odlesk, paralaxa, náklon a otáčení |

Online podoba návrhu (soukromý odkaz vlastníka): https://claude.ai/artifact/GgRU8zZtjiwQfEkVYe7aMs
