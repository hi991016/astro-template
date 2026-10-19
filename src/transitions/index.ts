import type { TransitionAnimationValue } from 'astro'
import type { AstroComponentFactory } from 'astro/runtime/server/index.js'

import Curve from '@/components/transitions/Curve.astro'
import Fade from '@/components/transitions/Fade.astro'
import Screen from '@/components/transitions/Screen.astro'
import { TRANSITION } from '@/transitions/config'

// -- the page transition in use is set in src/transitions/config.ts
export { TRANSITION }

// -- two kinds of transition:
// --   native  (stack, parallax): a view transition. the browser animates snapshots of the
// --           old and new page, so both are on screen at once. keyframes in
// --           src/styles/imports/transitions/_<name>.scss, no js
// --   overlay (curve, fade, screen): gsap covers the page while the next one loads, then reveals
// --           it. hooks in src/transitions/<name>.js, markup in src/components/transitions/
interface Transition {
  // -- the view transition on <html>: 'none' when an overlay does the animation
  animate: TransitionAnimationValue
  // -- overlay markup, rendered once in Layout.astro and persisted across pages
  markup?: AstroComponentFactory
}

// -- both directions play the same animation: the old page leaves, the new one comes over it
const native = (name: string, duration: number, easing: string): TransitionAnimationValue => {
  const pair = {
    old: { name: `${name}-old`, duration, easing, fillMode: 'both' },
    new: { name: `${name}-new`, duration, easing, fillMode: 'both' }
  }
  return { forwards: pair, backwards: pair }
}

export const transitions = {
  stack: { animate: native('stack', 1250, 'cubic-bezier(0.62, 0.05, 0.01, 0.99)') },
  parallax: { animate: native('parallax', 1200, 'cubic-bezier(0.7, 0.05, 0.13, 1)') },
  curve: { animate: 'none', markup: Curve },
  fade: { animate: 'none', markup: Fade },
  screen: { animate: 'none', markup: Screen }
} satisfies Record<string, Transition>

export type TransitionName = keyof typeof transitions

export const transition: Transition = transitions[TRANSITION]
