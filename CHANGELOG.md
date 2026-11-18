# Changelog

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
