# Hosting on GitHub Pages (for this project)

This repository is a Vite + React + TypeScript app. Below are step-by-step instructions to host it on GitHub Pages.

## Set Vite base path

- If you will host at `https://<username>.github.io/our-special-day/` set `base` in `vite.config.ts` to `/our-special-day/`.
- If you will host on a user/org site (`https://<username>.github.io/`), keep `base` as `/`.

Example (`vite.config.ts`):

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/our-special-day/', // <-- update when deploying to repo pages
  plugins: [react()],
})
```

## Option A — Quick deploy using `gh-pages`

1. Install `gh-pages` as a dev dependency:

```powershell
npm install --save-dev gh-pages
```

2. Add scripts to `package.json`:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
}
```

3. Deploy (PowerShell):

```powershell
npm run deploy
```

4. In GitHub → Settings → Pages, ensure the source is the `gh-pages` branch (root). Your site will be at `https://<username>.github.io/our-special-day/`.

## Option B — Deploy via GitHub Actions (CI)

Create `.github/workflows/deploy.yml` containing a workflow that builds and publishes `dist` using `peaceiris/actions-gh-pages`.

Example workflow:

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          publish_branch: gh-pages
```

After the workflow completes, set Pages source to the `gh-pages` branch (or use the Actions deployment option). The site URL will be `https://<username>.github.io/our-special-day/`.

## Notes & troubleshooting

- Ensure `base` in `vite.config.ts` matches your repo path or assets will fail to load.
- For route 404s, add a `404.html` redirecting to `index.html` or configure rewrites in Pages settings.
- For a user/org site (`<username>.github.io`), deploy to a repo named `<username>.github.io` and use `base: '/'`.

---

If you'd like, I can append this content into `README.md` now (or create a merged README). Tell me to proceed and I'll update the file for you.