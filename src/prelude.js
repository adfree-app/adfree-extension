// The app's local origin, which the proxy normally writes into the runtime's
// own `<script src>` tag. The extension has no such tag: it runs in the page's
// world, and it hands the base over this global before `runtime.js` loads.
//
// The same address the proxy already serves — `adfree-hide.css`,
// `adfree-cosmetics.json`, `adfree-page.js` — so the runtime asks the app it
// has always asked, and a page served from a service worker cache gets the
// same rules as one that went through the MITM.
window.__adfree_base = 'https://yuuki-kagura.github.io/local';
