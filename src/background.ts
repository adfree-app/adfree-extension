// The whole extension: ask the app, then apply what it answers.
//
// Nothing of AdFree's logic is in this file — not the rules, not the runtime,
// not the YouTube userscript. The engine decides all of that, and this asks it
// the one question it cannot answer by itself: "a page is loading here, and
// you never saw it".
//
// A page that went through the proxy carries the app's tags already; a page a
// service worker answered from its cache carries nothing, because no HTML ever
// crossed the wire. Both look the same from here, so the plan is applied and
// the app's own guards (`__adfree_runtime`, `__adfree_scripts_ran`) make the
// second application a no-op.

import { api, type NavigationDetails } from './api'

/** Where the app answers. Its address, not its logic. */
const BASE = 'https://yuuki-kagura.github.io/local'
const PLAN_PATH = '/adfree-plan.json'

/** How long a prefetched plan may be trusted for the navigation that follows. */
const PLAN_TTL_MS = 15_000

/** The engine's answer for one URL. */
interface Plan {
  base?: string
  css?: string
  runtime?: string
  cosmetics?: unknown
  scripts?: string[]
}

/** A user script's address and its body, both the app's. */
type Script = [url: string, source: string]

interface Prefetched {
  at: number
  plan: Plan
}

/** Prefetched plans, by `tabId:frameId:url`. */
const prefetched = new Map<string, Prefetched>()

const keyOf = (details: NavigationDetails): string =>
  `${details.tabId}:${details.frameId}:${details.url}`

/** The engine's plan for one URL, or `null` when the app is not answering. */
async function planFor(url: string): Promise<Plan | null> {
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    return null
  }
  const endpoint = `${BASE}${PLAN_PATH}?dmn=${encodeURIComponent(host)}`
  try {
    const response = await fetch(endpoint, { cache: 'no-store' })
    return response.ok ? ((await response.json()) as Plan) : null
  } catch {
    // The tunnel is down, or the app is not running: nothing to apply.
    return null
  }
}

/** The bytes of one of the app's own assets. */
async function bodyOf(url: string | undefined): Promise<string | null> {
  if (!url) {
    return null
  }
  try {
    const response = await fetch(url, { cache: 'no-store' })
    return response.ok ? await response.text() : null
  } catch {
    return null
  }
}

/**
 * Runs in the page, in its own world, once per navigation.
 *
 * The order is the app's: the origin the runtime asks its questions at, the
 * payload it reads first thing, the hiding rules, the runtime itself, then the
 * user scripts, which are written against the helpers the runtime installs.
 *
 * The browser stringifies this function, so it must not reach outside itself.
 */
function boot(
  base: string,
  cosmetics: unknown,
  css: string,
  runtime: string,
  runtimeUrl: string,
  scripts: Script[],
): void {
  const page = window as unknown as Record<string, unknown>
  page.__adfree_base = base
  if (cosmetics) {
    page.__adfree_page = cosmetics
  }
  if (css) {
    // A constructable stylesheet, the same choice the runtime makes: no node
    // for a page sanitizer to remove and no `style-src` to satisfy.
    try {
      const sheet = new CSSStyleSheet()
      sheet.replaceSync(css)
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
    } catch {
      const style = document.createElement('style')
      style.textContent = css
      ;(document.head || document.documentElement).appendChild(style)
    }
  }
  // `eval` where the page allows it, which keeps the app's code in the world
  // the page's own scripts run in; a tag where it does not, which needs the
  // page's policy to permit the app's origin.
  const run = (url: string, source: string | null): void => {
    if (!source) {
      return
    }
    try {
      ;(0, eval)(source)
    } catch {
      const tag = document.createElement('script')
      tag.src = url
      ;(document.head || document.documentElement).appendChild(tag)
    }
  }
  run(runtimeUrl, runtime)
  for (const [url, source] of scripts) {
    run(url, source)
  }
}

/** Applies one plan to one frame. */
async function apply(details: NavigationDetails, plan: Plan | null): Promise<void> {
  if (!plan?.runtime) {
    return
  }
  const scripts: Script[] = []
  const addresses = plan.scripts ?? []
  const [css, runtime, ...bodies] = await Promise.all([
    bodyOf(plan.css),
    bodyOf(plan.runtime),
    ...addresses.map((address) => bodyOf(address)),
  ])
  addresses.forEach((address, index) => {
    const body = bodies[index]
    if (body) {
      scripts.push([address, body])
    }
  })
  await api!.scripting.executeScript({
    target: { tabId: details.tabId, frameIds: [details.frameId] },
    world: 'MAIN',
    injectImmediately: true,
    func: boot as (...args: never[]) => void,
    args: [plan.base || BASE, plan.cosmetics ?? null, css ?? '', runtime ?? '', plan.runtime, scripts],
  })
}

if (!api) {
  // No scripting or navigation API to hold onto: the browser refused the whole
  // surface, and there is nothing this file can do about it.
  console.warn('adfree: this browser does not expose webNavigation and scripting')
} else {
  // The navigation is only known about here, and its plan can be built while
  // the request is still on its way: by the time the document exists, the
  // answer is a memory read.
  api.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId !== 0) {
      return
    }
    void planFor(details.url).then((plan) => {
      if (plan) {
        prefetched.set(keyOf(details), { at: Date.now(), plan })
      }
    })
  })

  api.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0) {
      return
    }
    const key = keyOf(details)
    const ready = prefetched.get(key)
    prefetched.delete(key)
    const fresh = ready && Date.now() - ready.at < PLAN_TTL_MS ? ready.plan : null
    void (fresh ? Promise.resolve(fresh) : planFor(details.url))
      .then((plan) => apply(details, plan))
      // A page that navigated away, or an app that stopped answering: nothing
      // to do about it and nothing to say on a page we do not own.
      .catch(() => {})
  })
}
