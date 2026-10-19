import gsap from 'gsap'

// -- fade: fades through the page background. a solid overlay fades in over the current
// -- page, the page is swapped underneath, then the overlay fades out while the next page
// -- rises in. elements with [data-fade-reveal] in the next page rise in one by one
// -- needs: markup src/components/transitions/Fade.astro, styles _fade.scss

const FADE = 0.4
const RISE = 1

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

export default {
  // -- runs while the next page loads: resolve once the overlay hides the page
  leave(container) {
    if (reducedMotion.matches) return

    return gsap
      .timeline({ defaults: { duration: FADE, ease: 'power1.inOut' } })
      .fromTo('[data-fade]', { autoAlpha: 0 }, { autoAlpha: 1 }, 0)
      .to(container, { y: '-2rem', ease: 'power2.in' }, 0)
      .then()
  },

  // -- runs on the new page: the overlay fades out while the page rises in
  enter(container) {
    if (reducedMotion.matches) return

    const reveals = container.querySelectorAll('[data-fade-reveal]')

    const tl = gsap
      .timeline({ defaults: { duration: RISE, ease: 'expo.out' } })
      .to('[data-fade]', { autoAlpha: 0, duration: FADE, ease: 'power1.inOut' }, 0.05)
      .from(container, { y: '3rem', clearProps: 'transform' }, 0.05)

    if (reveals.length) {
      tl.from(
        reveals,
        { y: '2rem', autoAlpha: 0, stagger: 0.05, clearProps: 'transform,opacity,visibility' },
        0.1
      )
    }

    return tl.then()
  }
}
