# Fady & Sandra Wedding Invitation

A beautiful wedding invitation website for Fady & Sandra's special day on February 14, 2026.

## Features

- 💒 Church & Venue Details with Maps
- 📅 Countdown Timer
- 📝 RSVP with Guest Search (Google Sheets)
- 📸 Photo Gallery (Google Drive)
- 📤 Photo Upload for Guests
- 📖 Bible Verse Display

## Local Installation

### Prerequisites

- Node.js 18+ (install via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm or bun

### Steps

```sh
# 1. Clone the repository
git clone <YOUR_GIT_URL>

# 2. Navigate to the project directory
cd <YOUR_PROJECT_NAME>

  PowerShell (if you're on Windows):
  ```powershell
  npm install -D gh-pages
  # Add the same script to package.json, then:
  npm run deploy
  ```

  Notes:
  - If your repo is published at `https://<username>.github.io/<repo>/` you should set `base` in `vite.config.ts` to `'/<repo>/'`.
    Example:
    ```ts
    import { defineConfig } from 'vite'
    export default defineConfig({
      base: '/our-special-day/',
      // ...other config
    })
    ```
  - Alternatively, you can build with an explicit base without changing `vite.config.ts`:
    ```bash
    npm run build -- --base=/our-special-day/
    ```
  - If you prefer relative assets (so a `base` change isn't required), set `base: './'` in `vite.config.ts` and deploy the `dist` contents to the `docs/` folder or to the root of the `gh-pages` branch.
# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Hosting on GitHub Pages

### Option 1: Manual Deployment

1. **Build the project:**
   ```sh
   npm run build
   ```

2. **Configure base path** - Edit `vite.config.ts` and add base:
   ```ts
   export default defineConfig({
     base: '/<REPO_NAME>/',
     // ... rest of config
   });
   ```

3. **Deploy the `dist` folder:**
   ```sh
   # Install gh-pages
   npm install -D gh-pages

   # Add to package.json scripts:
   # "deploy": "gh-pages -d dist"

   # Run deploy
   npm run deploy
   ```

### Option 2: GitHub Actions (Automated)

1. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
### Quick Checklist
- Set `base` in `vite.config.ts` or pass `--base` during `vite build`.
- Add any runtime environment variables to **Settings → Secrets → Actions** (Supabase keys, service account JSON if needed).
- If using the `gh-pages` package, add the `deploy` script to `package.json` and run `npm run deploy` locally to push `dist` to the `gh-pages` branch.
  contents: read
### Troubleshooting
- If homepage loads but assets 404, ensure your `base` matches the repo path (`/REPO_NAME/`) or use `base: './'` for relative assets.
- If GitHub Actions fails with permissions, confirm the workflow has `pages: write` and `id-token: write` under `permissions`.
- When deploying Supabase functions or accessing private Google resources, ensure secrets are stored in GitHub and service accounts are shared with the Google resources (Sheets/Drive).
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

2. Go to your repo **Settings → Pages → Source** and select **GitHub Actions**.

3. Add secrets in **Settings → Secrets → Actions** for any environment variables.

## Configuration

Edit `src/lib/weddingConfig.ts` to customize:
- Couple names
- Wedding date
- Church & Venue details
- Google Sheet ID for guest list
- Google Drive folder IDs

## Technologies

- React + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Supabase (Backend)
