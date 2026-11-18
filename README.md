# AdFree page runtime — browser extension

The app filters traffic at the network layer, so it reaches every browser and
every app on the machine. One case escapes it: a page a **service worker**
answers from its cache. The document never crosses the wire, the proxy never
sees its HTML, and nothing is injected — `window.__adfree_runtime` is
`undefined` on that tab while every other page has it.

This extension fills that hole the only way a page can be reached when it is
not on the wire: from inside the document.

## What it does

Two plain classic scripts, declared `world: "MAIN"` at `document_start`:

- `runtime.js` — the app's page runtime, byte for byte, so a page served from a
  cache gets the same cosmetic rules as one that went through the MITM. It asks
  the app for them at `https://yuuki-kagura.github.io/local/…`, the address the
  proxy already serves.
- `youtube.js` — the AdFree YouTube userscript: it scrubs `ytInitialData`,
  `ytInitialPlayerResponse` and `/youtubei/v1/` responses before YouTube renders
  them. This one genuinely needs `document_start` and the page's own world —
  a loader that arrives over `import()` is a frame too late.

`prelude.js` hands the runtime the base the proxy would have put in its tag.

It does **not** filter requests: that stays in the app, which sees the wire.
A store script you install in the app is not injected here yet; only the two
built-ins above are.

## Build

```sh
cd extension
bun install
bun run build          # -> extension/dist
```

`vite.config.js` copies `runtime.js` and `youtube.js` straight out of `rust/`,
which is their single source of truth; Vite bundles only `src/prelude.js`.

## Load it

`chrome://extensions` → enable **Developer mode** → **Load unpacked** →
`extension/dist`.

Chrome 137 and later ignores `--load-extension` in Google-branded builds, so
this is the install path even for testing. For an automated run, the DevTools
protocol method `Extensions.loadUnpacked` works on a browser started with
`--enable-unsafe-extension-debugging`.

## Verified

On a YouTube watch page that a service worker answered (`workerStart ≈ 57 ms`):

| | without the extension | with it |
| --- | --- | --- |
| `window.__adfree_runtime` | `undefined` | `"page"` |
| hiding rules in the document | 0 | 6 |
| ad entries in `ytInitialData` / `ytInitialPlayerResponse` | — | none |

## One runtime per page

`page_runtime.js` now returns early when `window.__adfree_runtime` is already
set. Two injectors exist — the proxy's tag and this extension — and a page can
carry both; the second copy would stack a second stylesheet and a second
observer on the same document.
