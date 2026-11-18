// The worker: fetch the plan the app would have injected, then inject it.
//
// Everything here is the app's answer, nothing is the extension's opinion —
// the rules, the stylesheet, the script list and the runtime all come from the
// engine that filters the rest of the machine, so a page served from a service
// worker cache is treated exactly like one that crossed the wire.
//
// The extension cannot hand the page a snippet of HTML and let it parse: the
// nodes have to be created from the extension's side, in the page's own world,
// which is what `chrome.scripting.executeScript` with `world: "MAIN"` does.
// That path is not subject to the page's `script-src`, so a strict policy
// cannot drop what the app decided to inject.

const BASE = 'https://yuuki-kagura.github.io/local';
const PLAN_PATH = '/adfree-plan.json';

/** Runs in the page: the payload the runtime reads, and the hiding rules. */
function seed(cosmetics, css) {
  if (cosmetics) {
    window.__adfree_page = cosmetics;
  }
  if (!css) {
    return;
  }
  // A constructable stylesheet, the same choice the runtime makes: no node for
  // a page sanitizer to remove and no `style-src` to satisfy.
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  } catch {
    const style = document.createElement('style');
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }
}

/** Runs in the page: the user scripts, in the page's own world. */
function runScripts(scripts) {
  for (const [url, body] of scripts) {
    try {
      // The page allows `unsafe-eval` more often than not, and a body run this
      // way keeps the world the page's scripts run in.
      (0, eval)(body);
    } catch {
      // Otherwise the tag is the only way in, and it needs the page's policy
      // to permit the app's origin. The body carries its own one-run guard, so
      // the two paths cannot both take effect.
      const tag = document.createElement('script');
      tag.src = url;
      (document.head || document.documentElement).appendChild(tag);
    }
  }
}

/** The engine's plan for one host, or `null` when the app is not answering. */
async function planFor(host) {
  const url = `${BASE}${PLAN_PATH}?dmn=${encodeURIComponent(host)}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

/** The bytes of a local asset the plan points at. */
async function bodyOf(url) {
  const response = await fetch(url, { cache: 'no-store' });
  return response.ok ? response.text() : null;
}

async function apply(tabId, frameId, host) {
  const plan = await planFor(host);
  if (!plan || !plan.runtime) {
    return;
  }
  const css = plan.css ? await bodyOf(plan.css) : null;
  const scripts = [];
  for (const url of plan.scripts || []) {
    const body = await bodyOf(url);
    if (body) {
      scripts.push([url, body]);
    }
  }

  const target = { tabId, frameIds: [frameId] };
  const world = 'MAIN';
  await chrome.scripting.executeScript({
    target,
    world,
    func: seed,
    args: [plan.cosmetics || null, css || ''],
  });
  // The runtime reads the payload first thing, so it has to come after it and
  // before the scripts, which build on the helpers the runtime installs.
  await chrome.scripting.executeScript({ target, world, files: ['runtime.js'] });
  if (scripts.length) {
    await chrome.scripting.executeScript({ target, world, func: runScripts, args: [scripts] });
  }
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.kind !== 'adfree-plan') {
    return false;
  }
  const tabId = sender.tab?.id;
  if (tabId === undefined) {
    return false;
  }
  apply(tabId, sender.frameId ?? 0, message.host).catch((error) => {
    // A page that navigated away, or an app that stopped answering: nothing to
    // do about it and nothing to say on the console of a page we do not own.
    void error;
  });
  return false;
});
