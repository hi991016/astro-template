import gsap from 'gsap'

// -- curve: a dark panel with curved edges sweeps up through the viewport. it rises over
// -- the current page (curved top edge swells), then it keeps rising off the top (curved bottom
// -- edge flattens) while the next page comes up behind it
// -- needs: markup src/components/transitions/Curve.astro, styles _curve.scss
// --        ease primary-ease, created in app.js

const DURATION = 1

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

const parts = () => {
  const wrap = document.querySelector('[data-curve]')
  if (!wrap) return null

  return {
    panel: wrap.querySelector('[data-curve-panel]'),
    top: wrap.querySelector('[data-curve-panel-top]'),
    bottom: wrap.querySelector('[data-curve-panel-bottom]')
  }
}

export default {
  // -- runs while the next page loads: resolve once the panel covers the screen
  leave(container) {
    const p = parts()
    if (!p || reducedMotion.matches) return

    return gsap
      .timeline({ defaults: { duration: DURATION, ease: 'primary-ease' } })
      .set(p.panel, { autoAlpha: 1, yPercent: 0 }, 0)
      .set(p.top, { scaleY: 0, height: '15vw' }, 0)
      .set(p.bottom, { scaleY: 1, height: '20vw' }, 0)
      .to(p.panel, { yPercent: -100 }, 0)
      .to(p.top, { scaleY: 1 }, 0)
      .to(container, { y: '-15dvh' }, 0)
      .then()
  },

  // -- runs on the new page: the panel leaves at the top while the page rises in
  enter(container) {
    const p = parts()
    if (!p || reducedMotion.matches) return

    return gsap
      .timeline({
        defaults: { duration: DURATION, ease: 'primary-ease' },
        onComplete: () => gsap.set(p.panel, { autoAlpha: 0 })
      })
      .to(p.panel, { yPercent: -200 }, 0)
      .to(p.bottom, { scaleY: 0 }, 0)
      .from(container, { y: '25dvh', clearProps: 'transform' }, 0)
      .then()
  }
}
