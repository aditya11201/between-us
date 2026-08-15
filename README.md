# Between Us

> A personal macOS-inspired experience in the browser.

Between Us is an interactive desktop-style web experience inspired by the
familiar visual language and interaction patterns of macOS. It is designed as
a personal, self-contained environment where visitors can explore a desktop,
open applications, browse included content, and try lightweight local
interactions.

## Live Experience

Visit the deployed application at:

https://aditya11201.github.io/between-us/

The source repository is available at:

https://github.com/aditya11201/between-us

## Repository Branches

| Branch      | Purpose                                     |
| ----------- | ------------------------------------------- |
| `main`      | Documentation and project overview          |
| `code-root` | Current application source and development  |
| `gh-pages`  | Production build published by GitHub Pages |

Changes to `main` update the project documentation. Application deployments
are built from `code-root` and published to `gh-pages` by GitHub Actions.

## Current Experience

### Desktop

- Menu bar with live clock
- Dock interactions and desktop icons
- Draggable and resizable windows
- Finder-style file navigation
- Wallpaper, display, and theme settings
- Responsive fallback for smaller or unsupported screens

### Applications

- Finder
- Safari
- Photos
- Music
- Notes
- Mail
- Calendar
- Calculator
- Terminal
- System Settings

The applications provide curated local interactions. They are not intended to
represent a complete operating system or a connected productivity platform.

## Tech Stack

- React 19
- Vite 5
- SCSS / Sass
- Node.js test runner
- GitHub Actions and GitHub Pages

## Local Development

The `main` branch contains this documentation. To run the application, check
out the current source branch:

```bash
git clone https://github.com/aditya11201/between-us.git
cd between-us
git checkout code-root
npm install
```

Start the development server:

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

## Contributing

Development changes should start from `code-root`. Documentation changes for
the project overview should start from `main`.

For a new feature, create a focused branch from `code-root`, register the
application through the existing app structure, and verify the test suite and
production build before opening a pull request.

## Attribution

Between Us is based on
[macweb.dev](https://github.com/gaminghackintosh/macweb.dev) by
`gaminghackintosh`.

Between Us is an independent project and is not affiliated with, endorsed by,
or sponsored by Apple Inc. Apple, macOS, and related marks belong to their
respective owners.

## License

Released under the [MIT License](LICENSE).
