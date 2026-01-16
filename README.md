# j-ly-space-game

This repository now hosts the Phaser 3 infinite runner template scaffolded from the Ourcade base.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run start
   ```

The game will be available at `http://localhost:8000`.

## Production Build

```bash
npm run build
```

The build output lives in `dist/` and is configured for GitHub Pages with the `/j-ly-space-game/` base path.

## Deployment (GitHub Pages)

This repo uses the official GitHub Pages workflow under `.github/workflows/deploy-pages.yml`. On every push to `main`, GitHub Actions will:

1. Run `npm ci`.
2. Build the production bundle with `npm run build`.
3. Upload `dist/` as the Pages artifact and deploy it.

The webpack production build and HTML template are configured with a `/j-ly-space-game/` base path so asset URLs resolve correctly when served from the repository subpath on GitHub Pages.
