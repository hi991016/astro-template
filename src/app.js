import LazyLoad from 'vanilla-lazyload'
import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { initLenis, stopScroll, startScroll } from '@/modules/customLenis'

//* ==================== CONFIGURATION ====================
const mw = 1024
const CONFIG = {
  isMobile: window.matchMedia(`(max-width: ${mw}px)`)
}

//* ==================== UTILITIES ====================
gsap.registerPlugin(ScrollTrigger, CustomEase)
CustomEase.create('page-transition', '0.76, 0, 0.24, 1')

let _ll = null
let _lenis = null
let _pendingHash = null
let _isFirstLoad = true

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

//* ==================== LAZY LOAD ====================
_ll = new LazyLoad({ threshold: 0, elements_selector: '.lazy' })

//* ==================== APP HEIGHT ====================
const initAppHeight = () => {
  const doc = document.documentElement
  const menuH = Math.max(doc.clientHeight, window.innerHeight || 0)

  if (CONFIG.isMobile.matches) {
    doc.style.setProperty('--app-height', `${doc.clientHeight}px`)
    doc.style.setProperty('--menu-height', `${menuH}px`)
  } else {
    doc.style.removeProperty('--app-height')
    doc.style.removeProperty('--menu-height')
  }
}
window.addEventListener('resize', initAppHeight)

//* ==================== INIT HEADER ====================
const initHeader = () => {}

//* ==================== INIT MENU ====================
const initMenu = () => {}

//* ==================== TRANSITION SCREEN ====================
const getScreen = () => document.querySelector('[data-transition-screen]')
const getInner = () => document.querySelector('[data-transition-inner]')

const pageTransitionIn = () =>
  new Promise((resolve) => {
    const screen = getScreen()
    const inner = getInner()
    const tl = gsap.timeline({ onComplete: resolve })

    screen.classList.add('is-blocking')
    tl.call(() => stopScroll(), null, 0)
    tl.set(screen, { yPercent: 0 }, 0)
    tl.set(inner, { yPercent: 100 }, 0)
    tl.to(inner, { yPercent: 0, duration: 0.9, ease: 'page-transition' }, 0)
  })

const pageTransitionOut = () =>
  new Promise((resolve) => {
    const screen = getScreen()
    const inner = getInner()

    const tl = gsap.timeline({
      onComplete: () => {
        screen.classList.remove('is-blocking')
        gsap.set(screen, { yPercent: 0 })
        gsap.set(inner, { yPercent: 100 })
        startScroll()
        resolve()
      }
    })
    tl.to(screen, { yPercent: -100, duration: 1, ease: 'page-transition' }, 0)
  })

//* ==================== HASH SCROLL ====================
const scrollToHash = (hash) => {
  setTimeout(() => {
    try {
      const target = document.querySelector(hash)
      if (target && _lenis) {
        _lenis.scrollTo(target, { offset: 0, duration: 1.2, immediate: false })
      }
    } catch (e) {
      console.warn('[astro] hash scroll failed:', hash, e)
    } finally {
      _pendingHash = null
    }
  }, 150)
}

//* ==================== DESTROY ALL ====================
const destroyAll = () => {
  // -- destroy gsap / observers / libraries
  // destroyMarquee()
  // destroyBgVideo()
  // destroyFadeTitles()
  // destroyRecipeSvg()

  // -- reset scrollTrigger / lenis
  ScrollTrigger.getAll().forEach((t) => t.kill())
  ScrollTrigger.clearScrollMemory()

  if (_lenis) {
    _lenis.destroy()
    _lenis = null
  }

  // -- abort all AbortController: remove all listeners by attaching { signal }
  // _menuController?.abort()
  // _popupController?.abort()
  // _tabsController?.abort()

  // -- reset refs
  // _menuController = _popupController = _tabsController = null
}

//* ==================== INIT SCRIPTS ====================
const initScripts = () => {
  _ll?.update()
  _lenis = initLenis()
  initAppHeight()
  initHeader()
  initMenu()
}

//* ==================== ASTRO LIFECYCLE ====================
/**
 * flowchart:
 *
 * [FIRST LOAD]
 *   astro:page-load → initAll() + waitForFonts + preloadVideos → pageTransitionOut()
 *
 * [NAVIGATE]
 *   astro:before-preparation → pageTransitionIn() in parallel with fetching a new page
 *   astro:before-swap        → destroyAll()
 *   astro:after-swap         → initAll() (new DOM is available, overlay is true)
 *   astro:page-load          → preloadVideos → initBgVideo → pageTransitionOut()
 *                              → ScrollTrigger.refresh() → scrollToHash
 */

//? ─── BEFORE FETCHING A NEW PAGE ─────────────────────────────────────────────
document.addEventListener('astro:before-preparation', (event) => {
  // -- get pending hash, ex: #about
  const href = event.to?.href ?? ''
  const hashIdx = href.indexOf('#')
  _pendingHash = hashIdx !== -1 ? href.slice(hashIdx) : null

  if (_isFirstLoad) return

  // -- overrride loader: run the animation in parallel with fetching the new page
  // -- once both are finished, Astro will proceed with swapping the DOM
  const originalLoader = event.loader
  event.loader = async () => {
    await Promise.all([
      pageTransitionIn(), // animation overlay
      originalLoader() // fetch HTML for the next page
    ])
    // -- is here: overlay is covered + HTML has been fetched → ready to swap
  }
})

//? ─── BEFORE SWAPING THE DOM ────────────────────────────────────────────────────
document.addEventListener('astro:before-swap', () => {
  if (_isFirstLoad) return
  destroyAll()
  window.scrollTo({ top: 0, behavior: 'instant' })
})

//? ─── AFTER SWAP DOM (NEW DOM IS NOW AVAILABLE) ─────────────────────────────────
document.addEventListener('astro:after-swap', () => {
  if (_isFirstLoad) return
  // -- reinit all scripts with the new DOM
  // -- overlay is still hiding → user cannot see layout shift
  initScripts()
})

//? ─── PAGE IS COMPLETELY READY ──────────────────────────────────────────────
document.addEventListener('astro:page-load', async () => {
  if (_isFirstLoad) {
    _isFirstLoad = false

    // -- init transition screen in hidden state (CSS default to hiddng it)
    const screen = getScreen()
    const inner = getInner()
    if (screen) gsap.set(screen, { yPercent: 0 })
    if (inner) gsap.set(inner, { yPercent: 0 })

    initScripts()
    stopScroll()

    // -- wait for the font and video to preload before pageTransitionOut
    await Promise.all([waitForFonts()])
    await pageTransitionOut()
    return
  }

  await pageTransitionOut()

  ScrollTrigger.refresh()
  if (_pendingHash) scrollToHash(_pendingHash)
})

//? ─── BFCACHE RESTORE (back/forward cache) ──────────────────────────────────
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    const screen = getScreen()
    const inner = getInner()
    if (screen) gsap.set(screen, { yPercent: 0 })
    if (inner) gsap.set(inner, { yPercent: 100 })
  }
})
