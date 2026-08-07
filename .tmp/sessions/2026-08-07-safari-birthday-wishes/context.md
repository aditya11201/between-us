# Task Context: Safari Birthday Wishes Same-Origin Iframe Integration

Session ID: 2026-08-07-safari-birthday-wishes
Created: 2026-08-07T00:00:00Z
Status: completed

## Current Request
Implement the approved plan to render `https://aditya11201.github.io/birthday-wishes/` as a fully interactive, trusted same-origin iframe inside the Safari clone at `https://aditya11201.github.io/karenjourney/`, preserving local Safari pages, tabs, browser chrome, window controls, themes, and other macOS applications.

## Context Files (Standards to Follow)
- `/Users/adityaramadhan/.config/opencode/context/core/standards/code-quality.md`
- `/Users/adityaramadhan/.config/opencode/context/core/standards/test-coverage.md`
- `/Users/adityaramadhan/.config/opencode/context/ui/web/react-patterns.md`
- `/Users/adityaramadhan/.config/opencode/context/core/standards/security-patterns.md`
- `/Users/adityaramadhan/.config/opencode/context/core/workflows/feature-breakdown.md`
- `/Users/adityaramadhan/.config/opencode/context/core/workflows/code-review.md`
- `/Users/adityaramadhan/.config/opencode/context/development/principles/clean-code.md`
- `/Users/adityaramadhan/.config/opencode/context/ui/web/ui-styling-standards.md`

## Reference Files (Source Material)
- `vite.config.js`
- `.github/workflows/deploy.yml`
- `src/features/safari/SafariContent.jsx`
- `src/features/safari/safariModel.js`
- `src/features/safari/safariModel.test.js`
- `src/styles/components/Safari/SafariBrowser.scss`
- `/Users/adityaramadhan/Documents/dokumen-coding/karenjourney/docs/superpowers/plans/2026-08-07-safari-birthday-wishes-same-origin-iframe.md`

## External Docs Fetched
- Vite GitHub Pages base/build guidance: `.tmp/external-context/vite/github-pages-base-build-assets.md`; official sources: `https://vite.dev/guide/static-deploy`, `https://vite.dev/guide/build`, `https://vite.dev/config/shared-options`.
- Sass/iframe guidance: `.tmp/external-context/sass/iframe-scss-safari.md`; official sources: `https://sass-lang.com/documentation/`, `https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe`.

## Components
- GitHub Pages prerequisite verification and production base path.
- Pure Safari URL policy and exact target allowlist.
- Same-origin iframe document inspection and navigation bridge.
- External iframe component with loading timeout and unsupported state.
- Safari tab/history/address-bar/reload integration.
- Iframe layout and loading/unsupported styles.
- Automated, local-shell, and deployed same-origin verification.

## Constraints
- Work in isolated worktree: `/private/var/folders/89/f5t6tyb96fz6ht3y8zg0dr0h0000gp/T/opencode/karenjourney-safari-birthday-wishes` on branch `feature/safari-birthday-wishes`.
- Do not commit or stage changes unless separately requested.
- Do not modify the `birthday-wishes` repository or add dependencies.
- Parent URL is `/karenjourney/`; target URL is `/birthday-wishes/` on the exact HTTPS origin `https://aditya11201.github.io`.
- Reject unsafe protocols, credentials, other origins, and non-target paths before iframe rendering.
- Use a direct iframe without `sandbox`; allow only `autoplay; fullscreen`.
- Keep Safari state local to `SafariContent`; do not modify Mail, Finder, Dock, WindowManagerProvider, WindowList, or AppWindow.
- Use TDD for production behavior: write a focused failing test, verify the expected failure, implement minimally, then rerun tests.
- GitHub Pages enablement/deployed verification is deferred until external settings are available; local iframe readiness is not treated as proof because localhost is cross-origin with the deployed target. Verify full iframe behavior only from the deployed same-origin Pages URL.

## Exit Criteria
- [x] Production Vite assets use `/karenjourney/`.
- [x] Navigation policy accepts only the target origin/path and preserves local commands/history behavior.
- [x] Same-origin frame bridge handles ready, unsupported, inaccessible, hashchange, popstate, timeout, and cleanup states.
- [x] Safari renders and preserves external target tabs while retaining existing local pages and chrome.
- [x] Iframe permissions and security boundary match the approved constraints.
- [x] `npm test` and `npm run build` pass in the isolated worktree.
- [x] Remaining deployment/browser checks are clearly reported as deferred or verified.
