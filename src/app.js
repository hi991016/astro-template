import LazyLoad from 'vanilla-lazyload'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'

// MODULES
import { initLenis, stopScroll, startScroll, scrollToHash } from '@/modules/customLenis'
import { initNav } from '@/modules/nav'
import { TRANSITION } from '@/transitions/config'

// TRANSITIONS: the one set in src/transitions/config.ts, loaded as its own chunk. TRANSITION is
// a constant, so the build drops the other branches and their files. native view transitions
// (stack, parallax) have no js: they resolve to null
const loadTransition = () =>
  TRANSITION === 'curve'
    ? import('@/transitions/curve')
    : TRANSITION === 'fade'
      ? import('@/transitions/fade')
      : TRANSITION === 'screen'
        ? import('@/transitions/screen')
        : null
const _transitionReady = Promise.resolve(loadTransition()).then((mod) => mod?.default ?? null)

//* ==================== CONFIGURATION ====================
const mw = 1024
const CONFIG = {
  isMobile: window.matchMedia(`(max-width: ${mw}px)`)
}

//* ==================== UTILITIES ====================
gsap.registerPlugin(ScrollTrigger, CustomEase)
CustomEase.create('primary-ease', '0.62, 0.05, 0.01, 0.99')
CustomEase.create('primary-ease-out', '0.17, 0.84, 0.44, 1')

let _ll = null
let _pendingHash = null
let _resizeRaf = null
let _isFirstLoad = true
let _viewTransition = null

//* ==================== LAZY LOAD ====================
_ll = new LazyLoad({ threshold: 300, elements_selector: '.lazy' })

//* ==================== FONT LOADING ====================
const waitForFonts = (hardTimeout = 3000) =>
  new Promise((resolve) => {
    const html = document.documentElement
    if (html.classList.contains('wf-active')) return resolve()
    const done = () => {
      observer.disconnect()
      resolve()
    }
    const observer = new MutationObserver(() => {
      if (html.classList.contains('wf-active')) done()
    })
    observer.observe(html, { attributes: true, attributeFilter: ['class'] })
    setTimeout(done, hardTimeout)
  })

//* ==================== APP HEIGHT ====================
const initAppHeight = () => {
  const doc = document.documentElement

  if (CONFIG.isMobile.matches) {
    const menuH = Math.max(doc.clientHeight, window.innerHeight || 0)
    doc.style.setProperty('--app-height', `${doc.clientHeight}px`)
    doc.style.setProperty('--menu-height', `${menuH}px`)
  } else {
    doc.style.removeProperty('--app-height')
    doc.style.removeProperty('--menu-height')
  }
}

window.addEventListener('resize', () => {
  cancelAnimationFrame(_resizeRaf)
  _resizeRaf = requestAnimationFrame(initAppHeight)
})

//* ==================== INIT HEADER / MENU ====================
const initHeader = () => {}
const initMenu = () => {}

//* ==================== DESTROY ALL ====================
const destroyAll = () => {
  // -- destroy gsap / observers / libraries
  // destroyFadeTitles()

  // -- reset scrollTrigger
  ScrollTrigger.getAll().forEach((t) => t.kill())
  ScrollTrigger.clearScrollMemory()

  // -- remove all listeners by attaching { signal }
  // _menuController?.abort()

  // -- reset refs
  // _menuController = _popupController = _tabsController = null
}

//* ==================== INIT SCRIPTS ====================
const initScripts = () => {
  _ll?.update()
  initLenis()
  initAppHeight()
  initHeader()
  initMenu()
}

//* ==================== ASTRO LIFECYCLE ====================
/**
 * flowchart:
 *
 * [FIRST LOAD]
 *   astro:page-load → initScripts() + waitForFonts → transition.once() (screen intro)
 *
 * [NAVIGATE]
 *   astro:before-preparation → stopScroll → transition.leave() (overlay covers the page),
 *                              in parallel with fetching the next page
 *   astro:before-swap        → destroyAll()
 *                              (native: the browser holds a snapshot of the old page)
 *   astro:after-swap         → initScripts() on the new DOM, scroll stays stopped
 *   astro:page-load          → transition.enter() (overlay reveals) / view transition ends
 *                            → startScroll → ScrollTrigger.refresh() → scrollToHash
 */

const container = () => document.querySelector('main')

//? --- BEFORE FETCHING A NEW PAGE
document.addEventListener('astro:before-preparation', (event) => {
  stopScroll()

  // -- keep the #hash out of the navigation: the page shows from the top, then smooth
  // -- scrolls to it. back/forward restores its own scroll position instead
  _pendingHash = null
  if (event.to.hash && event.navigationType !== 'traverse') {
    _pendingHash = event.to.hash
    event.to.hash = ''
  }

  // -- overrride loader: run the animation in parallel with fetching the new page
  // -- once both are finished, Astro will proceed with swapping the DOM
  const originalLoader = event.loader
  event.loader = async () => {
    const transition = await _transitionReady
    await Promise.all([
      transition?.leave?.(container()), // overlay covers the page
      originalLoader() // fetch HTML for the next page
    ])
  }
})

//? --- BEFORE SWAPING THE DOM
document.addEventListener('astro:before-swap', (event) => {
  // -- native transitions animate after the swap: page-load waits for them to finish
  _viewTransition = event.viewTransition
  destroyAll()
})

//? --- AFTER SWAP DOM
document.addEventListener('astro:after-swap', () => {
  // -- reinit all scripts with the new DOM, still hidden by the overlay or the snapshots.
  // -- the new lenis stays stopped until the transition ends
  initScripts()
  stopScroll()
})

//? --- PAGE IS COMPLETELY READY
document.addEventListener('astro:page-load', async () => {
  const transition = await _transitionReady

  if (_isFirstLoad) {
    _isFirstLoad = false

    initScripts()
    stopScroll()

    // -- wait for the font and video to preload before the intro
    // await Promise.all([waitForFonts()])
    await transition?.once?.()
    startScroll()
    return
  }

  await Promise.all([
    _viewTransition?.finished.catch(() => {}), // native: snapshots animating
    transition?.enter?.(container()) // overlay: reveal the new page
  ])
  _viewTransition = null
  startScroll()

  ScrollTrigger.refresh()
  if (scrollToHash(_pendingHash)) {
    // -- put the hash back in the address bar, keeping astro's history state
    history.replaceState(history.state, '', location.pathname + location.search + _pendingHash)
  }
  _pendingHash = null
})

//? --- DEV: KEEP CSS HOT RELOAD WORKING ACROSS NAVIGATIONS
// -- vite hot-updates the <style data-vite-dev-id> element it found on first load. the next
// -- page's html (often prefetched before the edit) carries an older copy of the same css, so
// -- astro swaps in that stale <style> and vite keeps updating the removed one. give the next
// -- page the live css: astro then keeps the live element, and later edits still apply
if (import.meta.env.DEV) {
  document.addEventListener('astro:before-swap', (event) => {
    const live = new Map(
      [...document.head.querySelectorAll('style[data-vite-dev-id]')].map((el) => [
        el.dataset.viteDevId,
        el.textContent
      ])
    )
    event.newDocument.head.querySelectorAll('style[data-vite-dev-id]').forEach((el) => {
      if (live.has(el.dataset.viteDevId)) el.textContent = live.get(el.dataset.viteDevId)
    })
  })
}

//? --- SAME-PAGE LINKS: no transition, a #hash smooth scrolls
initNav()

//? --- BACK/FORWARD CACHE RESTORE
window.addEventListener('pageshow', async (event) => {
  if (event.persisted) (await _transitionReady)?.reset?.()
})
