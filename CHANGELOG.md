# Changelog

## [0.3.1](https://github.com/adfree-app/adfree-extension/compare/v0.3.0...v0.3.1) (2026-11-18)


### Bug Fixes

* the release config is the file that runs ([075b187](https://github.com/adfree-app/adfree-extension/commit/075b1872b4b60775ea940d9bff031a6b8f737243))
* the zips land beside the release, not inside the folder they pack ([e841cb9](https://github.com/adfree-app/adfree-extension/commit/e841cb93342b77e2c505be068a16a2a2acdffb01))
* verify knows which browser it is holding ([08f1dbb](https://github.com/adfree-app/adfree-extension/commit/08f1dbb14e0f5cbd9f2fd68bf696e1ee390baf81))

## [0.3.1](https://github.com/adfree-app/adfree-extension/compare/v0.3.0...v0.3.1) (2026-11-18)


### Bug Fixes

* the release config is the file that runs ([075b187](https://github.com/adfree-app/adfree-extension/commit/075b1872b4b60775ea940d9bff031a6b8f737243))
* verify knows which browser it is holding ([08f1dbb](https://github.com/adfree-app/adfree-extension/commit/08f1dbb14e0f5cbd9f2fd68bf696e1ee390baf81))

The extension is versioned on its own: it talks to the app over one endpoint
whose answer is a document, so a new background script does not need a new app
and the other way round. Releases are tags on this repository, and the zip on
each release is what the website's install page links to.

## 0.3.0

- TypeScript source, `tsc` in CI, and `src/api.ts` declaring the two browser
  namespaces the extension uses.
- Firefox: manifest v3 with an event page, its own `gecko` id and a Firefox
  zip beside the Chromium one on every release.
- The build writes `dist/chrome` and `dist/firefox`; `verify` checks both.

## 0.2.0

- The icons are the app's own, at the four sizes a browser asks for.
- The description says what the extension is for, in one sentence.

## 0.1.0

- First build: a service worker that asks the app what it would have injected
  and applies the answer in the page's own world.
