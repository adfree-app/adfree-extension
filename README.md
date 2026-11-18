# AdFree — browser extension

The app filters traffic at the network layer, so it reaches every browser and
every app on the machine. One case escapes it: a page a **service worker**
answers from its cache. The document never crosses the wire, the proxy never
sees its HTML, and nothing gets injected into it.

This extension fills that hole, but it has no opinions of its own: everything
it injects is the **app's answer**. When a page starts, it asks the app over
the tunnel what the proxy would have injected, and it applies the answer
itself.

## How it works

```
page starts (document_start)
   │
   ├─ MAIN world, from the bundle, immediately:
   │    prelude.js     hands the runtime the app's local origin
   │    youtube.js     intercepts ytInitialData/playerResponse, fetch/XHR
   │                   (the one piece that cannot wait one round-trip)
   │
   ├─ isolated world, immediately:
   │    content.js     "a page is starting, host H"
   │
   └─ the worker then:
        GET https://yuuki-kagura.github.io/local/adfree-plan.json?dmn=H
        ── the same engine that filters everything else answers with ──▶
            { runtime, css, cosmetics, scripts }   (or nothing)
        and injects it with chrome.scripting.executeScript(world: "MAIN"):
            window.__adfree_page = cosmetics
            CSSStyleSheet(css)                      ← constructable, no CSP
            runtime.js                              ← the app's own file
            the user scripts, as the app listed them
```

Every part of the answer — the rules, the stylesheet URLs, the script list —
is produced by the same code that writes the snippet into pages the proxy
does see; the extension only turns that answer into DOM. A store script you
install in the app is injected this way too: the plan lists it, the worker
fetches its body from the app and runs it in the page's world (`unsafe-eval`
where the page allows, a `<script src>` tag otherwise).

A page the proxy did inject carries its own tags, and doubly-injected parts
are structurally neutral: the runtime returns early after the first copy
(`__adfree_runtime`) and the user scripts run once (`__adfree_scripts_ran`).

It does **not** filter requests. That stays on the wire, in the app.

## Build

```sh
cd extension
bun install
bun run build          # -> extension/dist
```

`vite.config.js` bundles `src/prelude.js` and copies the app's files — the
page runtime and the YouTube userscript straight out of `rust/` — into
`dist/`, so the bundle and the core can never drift.

## Load it

`chrome://extensions` → enable **Developer mode** → **Load unpacked** →
`extension/dist`.

Chrome 137 and later ignores `--load-extension` in Google-branded builds, so
this is the install path even for testing. For an automated run, the DevTools
protocol method `Extensions.loadUnpacked` works on a browser started with
`--enable-unsafe-extension-debugging`.

## The tunnel endpoint

`/adfree-plan.json?dmn=…` is one of the app's local answers (see
`take_local_request` in `rust/src/mitm/proxy.rs`). Same access path, same
trust, no extension-specific registration: the tunnel already answers the
hiding stylesheet and the cosmetics JSON the injected pages fetch, so the
plan needs no new channel, no native-messaging host manifest and no fixed
extension id.

## Verified

On a YouTube watch page a service worker served (`workerStart ≈ 13 ms`):

| | plain Chrome | with the extension |
| --- | --- | --- |
| `window.__adfree_runtime` | `undefined` | `"page"` |
| user scripts ran | — | once (`__adfree_scripts_ran = 1`) |
| hiding rules applied | 0 | several |
| ads in `ytInitialData` / `ytInitialPlayerResponse` | — | none |

and `cargo test --lib` covers the plan endpoint (`the_plan_
endpoint_describes_what_the_proxy_would_have_injected`).