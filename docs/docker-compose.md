# Provoz přes Docker Compose

Návod pro trvalý provoz Arkána na vlastním serveru. Potřebujete Docker s pluginem Compose ve verzi 2.24 nebo novější
(`docker compose version`). Image je k dispozici pro `linux/amd64` a `linux/arm64`.

## 1. Stažení

```bash
mkdir arkanum && cd arkanum
```

```bash
curl -fsSLO https://raw.githubusercontent.com/oldbear24/arkanum/main/compose.yaml
```

```bash
curl -fsSL https://raw.githubusercontent.com/oldbear24/arkanum/main/.env.example -o .env
```

## 2. Konfigurace

Otevřete `.env` a nastavte aspoň tyto hodnoty:

| Proměnná | Co do ní patří |
| --- | --- |
| `APP_URL` | veřejná adresa aplikace, například `https://karty.example.cz`. Míří na ni odkazy v e-mailech |
| `PB_ENCRYPTION_KEY` | 32 znaků, kterými se šifruje nastavení. Vygenerujete je příkazem `openssl rand -hex 16` |

Klíč `PB_ENCRYPTION_KEY` si uložte, po změně nejde dosavadní nastavení přečíst.

Pro ověřování e-mailů a obnovu hesla vyplňte `SMTP_*`, pro přihlášení přes Google, GitHub nebo Discord dvojice
`*_CLIENT_ID` a `*_CLIENT_SECRET`. Založení aplikace na Discordu popisuje
[návod v README](../README.md#přihlášení-přes-discord). Význam všech proměnných popisuje
[README](../README.md#konfigurace). Pro Compose jsou navíc tyto dvě:

| Proměnná | Výchozí hodnota | Význam |
| --- | --- | --- |
| `ARKANUM_VERSION` | `latest` | značka image. Na serveru doporučujeme konkrétní verzi, například `0.1.1` |
| `ARKANUM_PORT` | `8090` | port na hostiteli. Hodnota `127.0.0.1:8090` zpřístupní aplikaci jen místně, typicky pro reverzní proxy |

## 3. Spuštění

```bash
docker compose up -d --wait
```

Příkaz skončí, až healthcheck hlásí, že aplikace běží, což může trvat půl minuty. Aplikace pak běží na portu 8090
a data jsou ve svazku `arkanum-data`.

## 4. Založení správce

```bash
docker compose exec arkanum arkanum superuser upsert EMAIL HESLO --dir=/pb_data
```

Administrace je na adrese `/_/`. Heslo musí mít aspoň 8 znaků.

## Ukázková data

Pro vyzkoušení můžete založit ukázkové účty, karty a balíčky. Heslo se vypíše a účty se přihlašují jako
`demo@arkanum.example`. Na veřejném serveru to nedělejte.

```bash
docker compose exec arkanum arkanum seed --dir=/pb_data
```

## Aktualizace

Nastavte novou verzi v `ARKANUM_VERSION`, případně nechte `latest`, a spusťte:

```bash
docker compose pull
```

```bash
docker compose up -d --wait
```

Migrace databáze proběhnou samy při startu. Před aktualizací si udělejte zálohu.

Běžící verzi vypíše příkaz níže. Verze 0.1.1 a starší místo čísla vypisují `(untracked)`.

```bash
docker compose exec arkanum arkanum --version
```

## Záloha a obnova

Vše podstatné je ve svazku `arkanum-data`. Aplikaci před zálohou zastavte, aby byla databáze v konzistentním stavu:

```bash
docker compose stop
```

```bash
docker run --rm -v arkanum-data:/data -v "$PWD":/backup alpine tar czf /backup/arkanum-zaloha.tar.gz -C /data .
```

```bash
docker compose start
```

Obnova ze zálohy přepíše všechna současná data. Na novém serveru nejdřív stáhněte `compose.yaml` a vložte `.env`,
kontejner a prázdný svazek založí první příkaz:

```bash
docker compose create
```

```bash
docker compose stop
```

```bash
docker run --rm -v arkanum-data:/data -v "$PWD":/backup alpine sh -c "rm -rf /data/* && tar xzf /backup/arkanum-zaloha.tar.gz -C /data"
```

```bash
docker compose up -d --wait
```

Zálohovat a plánovat zálohy umí i administrace v části Settings → Backups, včetně ukládání do S3.

## HTTPS a reverzní proxy

Aplikace sama HTTPS neřeší. V provozu ji dejte za reverzní proxy, například Caddy, Traefik nebo nginx, a nastavte:

- `APP_URL` na veřejnou adresu s `https://`,
- `ARKANUM_PORT=127.0.0.1:8090`, pokud proxy běží na stejném stroji,
- v proxy vypnuté bufferování odpovědí pro `/api/realtime` (v nginx `proxy_buffering off`). Jinak se změny od spoluautorů
  nezobrazí živě,
- v administraci v části Settings → Application, v oddílu „IP proxy headers", hlavičku se skutečnou adresou klienta.

Limit velikosti požadavku v proxy nastavte aspoň na 40 MB, ilustrace může mít až 10 MB a karta několik vrstev.

## Řešení problémů

- **Kontejner se nerozběhne:** `docker compose logs arkanum` ukáže důvod, `docker compose ps` stav healthchecku.
- **`required` v `env_file` hlásí chybu:** máte Compose starší než 2.24, aktualizujte ho.
- **Port je obsazený:** nastavte jiný `ARKANUM_PORT`.
- **Změny v `.env` se neprojevily:** spusťte `docker compose up -d`. Příkaz `docker compose restart` nové hodnoty
  nenačte.
- **Discord hlásí neplatné přesměrování:** v jeho nastavení chybí adresa přesně tak, jak ji vidíte v prohlížeči, včetně
  `https://` a doplněná o `/api/oauth2-redirect`.
- **Vlastní adresář místo svazku:** image běží jako uživatel s UID 10001, takže adresář mu musí patřit
  (`sudo chown -R 10001 ./pb_data`).
