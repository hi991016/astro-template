import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export let lenis = null
gsap.registerPlugin(ScrollTrigger)

let _preventResizeObserver = null
let _scrollTimer = null
let _scrollbarEl = null
let _scrollbarThumb = null
let _thumbTravel = 0
let _thumbObserver = null
let _onceBound = false

// -- cache the thumb travel distance so the scroll handler never reads layout
const updateThumbSize = () => {
  if (!_scrollbarEl || !_scrollbarThumb) return
  const ratio = window.innerHeight / document.body.scrollHeight
  // -- nothing to scroll: no bar, not even on hover
  _scrollbarEl.hidden = ratio >= 1
  const thumbH = Math.max(ratio * window.innerHeight, 44)
  _scrollbarThumb.style.height = thumbH + 'px'
  _thumbTravel = _scrollbarEl.clientHeight - thumbH
}

const initScrollbar = () => {
  // -- astro swaps <body> on every navigation: watch the new one
  if (_onceBound) {
    _thumbObserver.disconnect()
    _thumbObserver.observe(document.body)
    updateThumbSize()
    return
  }

  _scrollbarEl = document.querySelector('[data-scrollbar]')
  _scrollbarThumb = document.querySelector('[data-scrollbar-thumb]')
  if (!_scrollbarEl || !_scrollbarThumb) return

  _onceBound = true

  updateThumbSize()
  _thumbObserver = new ResizeObserver(updateThumbSize)
  _thumbObserver.observe(document.body)
  window.addEventListener('resize', updateThumbSize)

  // -- drag thumb to scroll
  let isDragging = false
  let dragStartY = 0
  let dragStartScroll = 0

  _scrollbarThumb.addEventListener('mousedown', (e) => {
    isDragging = true
    dragStartY = e.clientY
    dragStartScroll = lenis?.scroll ?? 0
    document.body.classList.add('is-dragging')
    e.preventDefault()
  })

  document.addEventListener('mousemove', (e) => {
    if (!isDragging || !lenis) return
    const trackH = _scrollbarEl.clientHeight
    const thumbH = _scrollbarThumb.clientHeight
    const ratio = (e.clientY - dragStartY) / (trackH - thumbH)
    const maxScroll = document.body.scrollHeight - window.innerHeight
    lenis.scrollTo(dragStartScroll + ratio * maxScroll, { immediate: true })
  })

  document.addEventListener('mouseup', () => {
    if (!isDragging) return
    isDragging = false
    document.body.classList.remove('is-dragging')
  })

  // -- drive lenis from gsap's ticker; registered once, always reads whichever
  // -- instance `lenis` currently points to
  gsap.ticker.add((time) => lenis?.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
}

export const initLenis = () => {
  if (lenis) lenis.destroy()

  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    prevent: (node) => node.closest('[data-lenis-prevent]') !== null
  })

  // -- init data-lenis-prevent
  const lenisPreventEls = [...document.querySelectorAll('[data-lenis-prevent-auto]')]
  const syncLenisPrevent = () => {
    lenisPreventEls.forEach((el) => {
      // -- if content is taller than the container => add data-lenis-prevent so the element can scroll
      el.toggleAttribute('data-lenis-prevent', el.scrollHeight > el.clientHeight)
    })
  }
  syncLenisPrevent()

  // -- disconnect the previous page's observer before watching the new elements
  _preventResizeObserver?.disconnect()
  _preventResizeObserver = new ResizeObserver(syncLenisPrevent)
  lenisPreventEls.forEach((el) => _preventResizeObserver.observe(el))

  const setupBoundaryScroll = (el) => {
    el.addEventListener(
      'wheel',
      (e) => {
        // -- content fits inside the container - nothing to scroll, skip
        if (el.scrollHeight <= el.clientHeight) return

        const { scrollTop, scrollHeight, clientHeight } = el
        const atTop = scrollTop <= 0
        const atBottom = scrollTop + clientHeight >= scrollHeight - 1

        // -- block element scrolling when atTop/atBottom, change to Lenis.
        if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
          e.stopPropagation()
          e.preventDefault()
          lenis.scrollTo(lenis.targetScroll + e.deltaY, { immediate: false })
        }
      },
      { passive: false }
    )
  }
  lenisPreventEls.forEach(setupBoundaryScroll)

  // -- custom scrollbar: binds drag/ticker listeners on the first call only
  initScrollbar()

  lenis.on('scroll', ({ scroll, limit, isScrolling }) => {
    if (_scrollbarThumb && limit > 0) {
      _scrollbarThumb.style.transform = `translateY(${(scroll / limit) * _thumbTravel}px)`
    }

    // -- lenis also emits on stop(), start() and resets (page transitions):
    // -- only a real scroll on a page that can scroll shows the bar
    if (!isScrolling || limit <= 0) return

    // -- show when scroll, hide after 1s when stop
    document.body.classList.add('is-scrolling')
    clearTimeout(_scrollTimer)
    _scrollTimer = setTimeout(() => document.body.classList.remove('is-scrolling'), 1000)
  })

  lenis.on('scroll', ScrollTrigger.update)

  return lenis
}

export const stopScroll = () => {
  if (lenis) {
    lenis.stop()
    document.body.style.overflow = 'hidden'
  }
}

export const startScroll = () => {
  if (lenis) {
    lenis.start()
    document.body.style.overflow = ''
  }
}

// -- smooth scroll to the element a "#hash" points to, false if it is not on the page
// -- space above the target (e.g. a fixed header) comes from its CSS scroll-margin-top
export const scrollToHash = (hash) => {
  const target = hash && document.getElementById(decodeURIComponent(hash.slice(1)))
  if (!target || !lenis) return false

  lenis.scrollTo(target, {
    offset: -(parseFloat(getComputedStyle(target).scrollMarginTop) || 0),
    duration: 1.4,
    easing: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
  })
  return true
}
