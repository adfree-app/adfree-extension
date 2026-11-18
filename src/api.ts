// The browser surface this extension actually uses, and nothing more.
//
// Chromium exposes it as `chrome`, Firefox as `browser`; both are the same
// shape for these two namespaces, so one interface describes them and the
// build picks whichever the running browser provides. Declaring it by hand
// keeps the type honest about how little of the platform is in play.

export interface NavigationDetails {
  tabId: number
  frameId: number
  url: string
}

export interface NavigationEvent {
  addListener(listener: (details: NavigationDetails) => void): void
}

export interface Injection {
  target: { tabId: number; frameIds: number[] }
  world: 'MAIN'
  injectImmediately: boolean
  func: (...args: never[]) => void
  args: unknown[]
}

export interface BrowserApi {
  webNavigation: {
    onBeforeNavigate: NavigationEvent
    onCommitted: NavigationEvent
  }
  scripting: {
    executeScript(injection: Injection): Promise<unknown>
  }
}

const globals = globalThis as { browser?: BrowserApi; chrome?: BrowserApi }

/** Firefox first, because it is the one that refuses `chrome` a promise. */
export const api: BrowserApi | undefined = globals.browser ?? globals.chrome
