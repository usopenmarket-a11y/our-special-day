# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
## **Hosting on GitHub Pages**

- **Project type:** This repository is a Vite + React + TypeScript app. To host on GitHub Pages you will build the app and deploy the generated `dist` output.

- **Set the Vite `base` path**: if you will host at `https://<username>.github.io/our-special-day/` set the `base` option in `vite.config.ts` to '/our-special-day/'. For a user/organization site (i.e. `https://<username>.github.io/`) keep `base` as '/'.

  Example (`vite.config.ts`):

  ```ts
  import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react-swc'
  import path from 'path'

  export default defineConfig(({ mode }) => ({
    base: '/our-special-day/', // <-- update when deploying to repo pages
    server: { host: '::', port: 8080 },
    plugins: [react(), mode === 'development' && componentTagger()].filter(Boolean),
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  }))
  ```

- **Option A — Quick deploy with `gh-pages`**

  1. Install `gh-pages` as a dev dependency:

     ```powershell
     npm install --save-dev gh-pages
     ```

  2. Add these scripts to `package.json` (merge into existing `scripts`):

     ```json
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
     ```

  3. Deploy (PowerShell):

     ```powershell
     npm run deploy
     ```

  4. In GitHub ? Settings ? Pages, set the source to the `gh-pages` branch (root). The site will be at `https://<username>.github.io/our-special-day/`.

- **Option B — Automatic deploy with GitHub Actions**

  Create `.github/workflows/deploy.yml` with the following (builds on push to `main` and publishes `dist` to `gh-pages`):

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

  After the workflow completes, set Pages source to the `gh-pages` branch (or use the Actions deployment option) in the repository settings.

- **Notes & troubleshooting**:
  - Ensure `base` in `vite.config.ts` matches the hosting path; incorrect `base` is the most common cause of broken asset URLs.
  - If client-side routes return 404 on refresh, add a `404.html` that redirects to `index.html`, or configure Pages rewrite behavior.
  - For a user/org site (repo name `<username>.github.io`) use `base: '/'` and deploy to that repository.
  - Alternatively build into a `docs/` folder (`vite build --outDir docs`) and set GitHub Pages to serve from `main` branch `/docs`.

