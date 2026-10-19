import type { TransitionName } from '@/transitions'

// -- the page transition in use: change this name to switch, nothing else needs editing.
// -- its own file (no .astro imports) so app.js can read it: the build then keeps only this
// -- transition's js
export const TRANSITION: TransitionName = 'parallax'
