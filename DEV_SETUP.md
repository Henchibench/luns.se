# Local Development Setup for Luns.se

## Quick Start

### 1. Run the scrapers

Generate the static menu data that the frontend reads:

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run scrapers — writes JSON to nextjs-luns-se/public/data/
python scripts/scrape_menus.py
```

### 2. Start the frontend

```bash
cd nextjs-luns-se
npm install
npm run dev  # Development server at http://localhost:3000
```

### 3. Build a static export (optional)

To test the production build locally:

```bash
cd nextjs-luns-se
npm run build     # Produces the out/ directory
npx serve out     # Serve it locally
```

## How It Works

- **Scrapers** (`scripts/scrape_menus.py`) fetch lunch menus from ~6 restaurant websites and write static JSON files to `nextjs-luns-se/public/data/`
- **Frontend** (Next.js) is exported as a static site that reads those JSON files at runtime
- **GitHub Actions** (`.github/workflows/scrape-and-deploy.yml`) runs the scrapers and deploys the static site to GitHub Pages on weekdays at 07:00, 08:00, and 10:00 CET

## Production Deployment

Deployment is fully automated via GitHub Actions — no manual steps needed.

To trigger a deploy manually, go to Actions > "Scrape and Deploy" > Run workflow.

The site is hosted on GitHub Pages at https://luns.se.
