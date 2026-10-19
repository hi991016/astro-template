import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'

// -- screen: a black screen slides up from the bottom and covers the page, then leaves at
// -- the top to show the next one. it also covers the first load and plays as an intro
// -- needs: markup src/components/transitions/Screen.astro, styles _screen.scss

gsap.registerPlugin(CustomEase)
CustomEase.create('page-transition', '0.76, 0, 0.24, 1')

const getScreen = () => document.querySelector('[data-transition-screen]')
const getInner = () => document.querySelector('[data-transition-inner]')

const reset = ({ visible }) => {
  const screen = getScreen()
  const inner = getInner()
  if (!screen || !inner) return
  gsap.set(screen, { yPercent: 0 })
  gsap.set(inner, { yPercent: visible ? 0 : 100 })
  if (!visible) screen.classList.remove('is-blocking')
}

const reveal = () =>
  gsap
    .to(getScreen(), { yPercent: -100, duration: 1, ease: 'page-transition' })
    .then(() => reset({ visible: false }))

export default {
  // -- first load: the screen already covers the page (css), reveal it
  once() {
    reset({ visible: true })
    return reveal()
  },

  // -- runs while the next page loads: resolve once the screen covers it
  leave() {
    const screen = getScreen()
    screen.classList.add('is-blocking')
    gsap.set(screen, { yPercent: 0 })

    return gsap
      .fromTo(
        getInner(),
        { yPercent: 100 },
        { yPercent: 0, duration: 0.9, ease: 'page-transition' }
      )
      .then()
  },

  // -- runs on the new page
  enter: reveal,

  // -- back/forward cache restore: never come back covered
  reset: () => reset({ visible: false })
}
