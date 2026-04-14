# Instagram Recipe Inspo (Scraping MVP)

Liten backend-tjanst som scraper publika Instagram-inlagg, tolkar captions till recept och ger forslag baserat pa ingredienser + preferenser.

## Funktioner
- Scraper poster fran ett publikt konto utan Graph API integration.
- Bygger lokal cache i `data/recipes.json` for snabbare svar.
- Sok/ranking pa:
  - ingredienser
  - proteinpreferens (`all`, `meat`, `fish`, `vegetarian`)
  - fritext
  - exkludera ingredienser
- Exponerar API:
  - `GET /api/refresh` - uppdatera cache fran Instagram
  - `GET /api/recipes` - lista alla recept
  - `GET /api/random` - slumpat recept
  - `GET /api/search?...` - sok och fa forslag
  - `GET /api/suggestions?...` - alias till `/api/search`

## Krav
- Node.js 18+

## Setup
1. Kopiera `.env.example` till `.env`
2. Justera `IG_USERNAME` vid behov
3. Starta:

```powershell
node src/server.js
```

## Deploy pa Render (gratisplan)
1. Lagg mappen i ett GitHub-repo.
2. I Render: `New +` -> `Web Service` -> valj repot.
3. Om du deployar denna mapp direkt:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Satt env vars (minst `IG_USERNAME`).
5. Testa efter deploy:
   - `https://<din-render-url>/api/search?count=1`

## Miljovariabler
- `PORT` default `8787`
- `IG_USERNAME` konto att scrapa, default `the.real.cg.lagar.mat`
- `IG_MEDIA_LIMIT` max antal inlagg, default `40`
- `IG_SCRAPE_USER_AGENT` user agent header
- `IG_SCRAPE_APP_ID` default `936619743392459`
- `IG_SESSION_ID` optional (kan forbattra robusthet)
- `CACHE_FILE` default `./data/recipes.json`
- `CACHE_TTL_MINUTES` default `120`

## API exempel

```powershell
# Uppdatera cache manuellt
curl "http://localhost:8787/api/refresh?force=1"

# Sok pa ingredienser + preferens
curl "http://localhost:8787/api/search?count=3&ingredients=lax,citron&protein=fish"

# Exkludera ingrediens och lagg till fritext
curl "http://localhost:8787/api/search?ingredients=pasta&excludeIngredients=gradd&query=snabb"
```

## Viktigt
Scraping kan sluta fungera om Instagram andrar sitt webgranssnitt eller blockerar trafik. Om det hander, uppdatera headers/flode eller anvand officiell API-lina igen.
