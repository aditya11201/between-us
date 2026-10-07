# Between Us

A personal macOS-inspired experience in the browser.

## Purpose

Between Us preserves a desktop-style macOS-inspired simulation as a personal browser experience.

## Features

- App windows open centered at viewport-safe sizes and support mouse/touch dragging and resizing
- Finder, Safari, Terminal, Music, and Settings experiences
- Below 1024 px, portrait shows a rotate-to-landscape prompt; landscape keeps the desktop workspace available

## Local setup

Install the project dependencies with:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Run the test suite:

```bash
npm test
```

Create a production build:

```bash
npm run build
```

## Deployment

The production site is available at [aditya11201.github.io/between-us](https://aditya11201.github.io/between-us/).

Pushes to `code-root` run the GitHub Actions workflow, which builds the Vite app and publishes `dist/` to the `gh-pages` branch.

## Scope and disclaimer

Between Us is intentionally macOS-inspired and keeps Apple UI language as part of its theme. It is not an operating system or a replacement for macOS.

Between Us is an independent project and is not affiliated with, endorsed by, or sponsored by Apple Inc. Apple, macOS, and related marks belong to their respective owners.

## Attribution

Between Us is based on [macweb.dev](https://github.com/gaminghackintosh/macweb.dev) by `gaminghackintosh`.
