# luns.se

A web app that displays and filters lunch menus from restaurants around Lindholmen Science Park in Gothenburg, Sweden.

## Features

- **Lunch menu scraping** from restaurants' official websites
- **Filtering** by food type, search terms, restaurant, and location
- **Responsive UI** with animations and dark mode
- **Automated updates** via GitHub Actions (weekdays at 07:00, 08:00, and 10:00 CET)
- **Static hosting** on GitHub Pages — no server required

## How It Works

1. **Scrapers** (`scripts/scrape_menus.py`) fetch menus from ~6 restaurant websites
2. Menu data is written as static JSON to `nextjs-luns-se/public/data/`
3. **Next.js** builds a static site that reads the JSON at runtime
4. **GitHub Actions** runs the scrapers on a schedule and deploys to GitHub Pages

## Project Structure

```
luns.se/
├── scripts/
│   └── scrape_menus.py          # Standalone scraper script
├── app/
│   ├── restaurant_data.py       # Restaurant metadata (links, locations)
│   ├── scrapers/                # Individual restaurant scrapers
│   │   ├── base_scraper.py
│   │   └── restaurants/         # One scraper per restaurant
│   └── utils/
│       └── translation.py       # Swedish day/food type translation
├── nextjs-luns-se/              # Next.js frontend
│   ├── src/app/
│   │   ├── page.tsx             # Main page
│   │   └── components/          # React components
│   └── public/                  # Static assets + generated data
├── .github/workflows/
│   └── scrape-and-deploy.yml    # Scheduled scrape + deploy
└── requirements.txt             # Python dependencies (scrapers only)
```

## Local Development

```bash
# Run scrapers to generate menu data
pip install -r requirements.txt
python scripts/scrape_menus.py

# Start frontend dev server
cd nextjs-luns-se
npm install
npm run dev
```

See [DEV_SETUP.md](DEV_SETUP.md) for more details.

## Adding a New Restaurant

1. Create a new scraper in `app/scrapers/restaurants/` (extend `BaseScraper`)
2. Add restaurant metadata to `app/restaurant_data.py`
3. Register the scraper in `scripts/scrape_menus.py`

## Deployment

Fully automated via GitHub Actions. Push to `main` or wait for the scheduled cron. To trigger manually: Actions > "Scrape and Deploy" > Run workflow.
