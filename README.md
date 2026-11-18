# AdFree — browser extension

The app filters traffic at the network layer, so it reaches every browser and
every app on the machine. One case escapes it: a page a **service worker**
answers from its cache. The document never crosses the wire, the proxy never
sees its HTML, and nothing gets injected into it.

This extension fills that hole and knows nothing else. It carries **no AdFree
code**: not the rules, not the page runtime, not the YouTube userscript. It
asks the app and applies the answer.

## How it works

```
navigation starts        chrome.webNavigation.onBeforeNavigate
   │                       GET /adfree-plan.json?dmn=<host>   ← prefetched,
   │                                                            so the answer
   │                                                            is in memory
   ▼                                                            before the
document commits         chrome.webNavigation.onCommitted        document exists
   │
   └─ chrome.scripting.executeScript(world: "MAIN", injectImmediately)
        window.__adfree_base   = plan.base
        window.__adfree_page   = plan.cosmetics
        CSSStyleSheet(plan.css)
        plan.runtime           ← eval, or a tag where the page forbids eval
        plan.scripts[]         ← every enabled user script, the same body
                                 the proxy serves
```

The plan is the engine's own answer, built by the same code that writes the
snippet into pages the proxy does see:

```json
{
  "base": "https://yuuki-kagura.github.io/local",
  "runtime": "…/adfree-page.js?dmn=<host>&h=…",
  "css": "…/adfree-hide.css?dmn=<host>&h=…",
  "cosmetics": { "hide": […], "procedural": […], "dynamic": true },
  "scripts": ["…/adfree-user.js?h=…"]
}
```

Every field is optional and every URL is content-addressed, so a filter or
script change changes the URL and the browser refetches.

## Why this needs no "did the app already inject this?" question

A page that went through the proxy carries the app's tags; a page served from a
cache carries nothing. The extension applies the plan either way, and the
app's own guards make the second application a no-op: the runtime returns early
after the first copy (`__adfree_runtime`) and the user scripts run once
(`__adfree_scripts_ran`).

## Build

```sh
cd extension
bun install
bun run build          # -> extension/dist (background.js + manifest.json)
```

## Load it

`chrome://extensions` → enable **Developer mode** → **Load unpacked** →
`extension/dist`.

Chrome 137 and later ignores `--load-extension` in Google-branded builds, so
this is the install path even for testing. For an automated run, the DevTools
protocol method `Extensions.loadUnpacked` works on a browser started with
`--enable-unsafe-extension-debugging`.

## The tunnel endpoint

`/adfree-plan.json?dmn=…` is one of the app's local answers (`take_local_request`
in `rust/src/mitm/proxy.rs`). Same access path, same trust, no
extension-specific registration: the tunnel already answers the hiding
stylesheet and the cosmetics JSON that injected pages fetch, so the plan needs
no new channel and no native-messaging host manifest.

## Verified

YouTube watch page in Chrome 157, the extension loaded unpacked:

| | value |
| --- | --- |
| `window.__adfree_base` | the plan's origin |
| `window.__adfree_runtime` | `"page"` (runtime evaluated) |
| `window.__adfreeYoutube` | `true` (module came from the plan) |
| `__adfree_scripts_ran` | `1` |
| hiding rules applied | 2 stylesheets + 5 `<style>` rules |
| ads in `ytInitialData` | none |

`cargo test --lib` covers the endpoint itself
(`the_plan_endpoint_describes_what_the_proxy_would_have_injected`).
