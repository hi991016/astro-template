import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(CustomEase)
CustomEase.create('page-transition', '0.76, 0, 0.24, 1')

const getScreen = () => document.querySelector('[data-transition-screen]')
const getInner = () => document.querySelector('[data-transition-inner]')

export const pageTransitionIn = (onStart) =>
  new Promise((resolve) => {
    const screen = getScreen()
    const inner = getInner()
    const tl = gsap.timeline({ onComplete: resolve })

    screen.classList.add('is-blocking')
    tl.call(() => onStart?.(), null, 0)
    tl.set(screen, { yPercent: 0 }, 0)
    tl.set(inner, { yPercent: 100 }, 0)
    tl.to(inner, { yPercent: 0, duration: 0.9, ease: 'page-transition' }, 0)
  })

export const pageTransitionOut = (onComplete) =>
  new Promise((resolve) => {
    const screen = getScreen()
    gsap
      .timeline({
        onComplete: () => {
          resetTransitionScreen({ visible: false })
          onComplete?.()
          resolve()
        }
      })
      .to(screen, { yPercent: -100, duration: 1, ease: 'page-transition' }, 0)
  })

export const resetTransitionScreen = ({ visible }) => {
  const screen = getScreen()
  const inner = getInner()
  if (!screen || !inner) return
  gsap.set(screen, { yPercent: 0 })
  gsap.set(inner, { yPercent: visible ? 0 : 100 })
  if (!visible) screen.classList.remove('is-blocking')
}
