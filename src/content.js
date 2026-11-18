// Asks the app for the plan, for one page.
//
// The proxy rewrites the documents it sees, so the pages that carry AdFree's
// tags need nothing from here. A page a service worker answered from its cache
// never crossed the wire: no HTML was rewritten and nothing was injected. This
// content script says "a page is starting, host H" and the worker does the
// rest — it cannot do it itself, because the plan has to be injected into the
// page's own world from the extension's context.
//
// Runs at `document_start`, in the isolated world, main frame only.

chrome.runtime.sendMessage({ kind: 'adfree-plan', host: location.hostname });
