# Astro Template

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── images
│   ├── components
│   │   └── Header.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command          | Action                                           |
| :--------------- | :----------------------------------------------- |
| `yarn install`   | Installs dependencies                            |
| `yarn dev`       | Starts local dev server at `localhost:4321`      |
| `yarn build`     | Build your production site to `./dist/`          |
| `yarn preview`   | Preview your build locally, before deploying     |
| `yarn astro ...` | Run CLI commands like `astro add`, `astro check` |

## Page Transitions

Astro's `<ClientRouter />` swaps pages without a full reload. There is no Barba: every transition is set up in `src/transitions/index.ts`, and the one in use is picked in `src/transitions/config.ts`.

| Name       | Kind    | Effect                                                                                                                                                                 |
| :--------- | :------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stack`    | native  | The next page slides up from the bottom and stacks over the current one, which shrinks, lifts and dims over a dark background.                                         |
| `parallax` | native  | The current page drifts up slowly and darkens while the next page slides up over it.                                                                                   |
| `curve`    | overlay | A dark panel with curved edges sweeps up through the screen. It covers the current page, then exits at the top while the next page rises in.                           |
| `fade`     | overlay | An overlay fades in, the page is swapped under it, then it fades out while the next page rises in. Add `data-fade-reveal` to elements to make them rise in one by one. |
| `screen`   | overlay | A black screen slides up over the page, then leaves at the top. It also covers the first load and plays as an intro.                                                   |

- **Native**: a [view transition](https://docs.astro.build/en/guides/view-transitions/). The browser animates snapshots of the old and new page, so both are on screen at once. The `transition:animate` timing is in `src/transitions/index.ts`, the keyframes in `src/styles/imports/transitions/_<name>.scss`. No JS. Browsers without view transitions do a normal page load (`fallback="none"`).
- **Overlay**: GSAP covers the page while the next one loads, then reveals it. Hooks in `src/transitions/<name>.js`, markup in `src/components/transitions/`, styles in `src/styles/imports/transitions/_<name>.scss`.

### Switching the transition

Change one line in `src/transitions/config.ts`:

```ts
export const TRANSITION: TransitionName = 'stack'
```

`Layout.astro` reads it for the `<html>` view transition and the overlay markup, and `app.js` loads the matching hooks. All transition styles are loaded but scoped, so nothing else needs editing.

### Adding a transition

**Native**: add `native('<name>', duration, easing)` to `transitions` in `src/transitions/index.ts`, then the `@keyframes <name>-old` / `<name>-new` in `src/styles/imports/transitions/_<name>.scss` and `@use` it in `style.scss`.

**Overlay**: add `{ animate: 'none', markup: <Component> }` to `transitions`, the markup component (keep `transition:persist="transition"` so its GSAP state survives the swap), the styles, a `TRANSITION === '<name>'` branch in `loadTransition()` in `src/app.js` (only the branch in use is built), and `src/transitions/<name>.js`:

```js
export default {
  once() {}, // optional: first load
  leave(container) {}, // runs while the next page loads, resolve when the page is covered
  enter(container) {}, // runs on the new page, resolve when it is revealed
  reset() {} // optional: back/forward cache restore
}
```

`container` is the page's `<main>`. Return a promise (`gsap.timeline(...).then()`).

Rules that keep the rest of the site working:

- **Do not start or stop Lenis.** `app.js` stops scroll in `astro:before-preparation` and starts it once the transition ends.
- **The header stays still.** It has its own view transition name (`transition:name="header"`), so it is drawn on top and never animates.
- **Links to the current page do nothing.** A `#hash` link smooth scrolls with Lenis (`src/modules/nav.js`). A link to another page with a `#hash` shows the page from the top, then smooth scrolls to the section.

### Writing page code in `app.js`

`app.js` runs once. On every navigation Astro replaces the whole `<body>`, so:

- elements queried earlier belong to the old page and are gone
- listeners on `window` / `document`, timers, GSAP tweens and observers keep running, and pile up if they are created again for each page

Split each feature in two:

1. **`initX()`**: query the DOM inside it and call it from `initScripts()`. It runs on the first load and after every swap (`astro:after-swap`).
2. **Cleanup**: remove what outlives the page in `destroyAll()`. It runs before the swap (`astro:before-swap`).

```js
//* ==================== ACCORDION ====================
let _accordionController = null

const initAccordion = () => {
  _accordionController = new AbortController()
  const { signal } = _accordionController

  // -- query inside init: after a swap the old page's elements are gone
  document.querySelectorAll('[data-accordion]').forEach((item) => {
    const btn = item.querySelector('[data-accordion-btn]')
    btn.addEventListener('click', () => item.classList.toggle('is-open'), { signal })
  })

  // -- window/document listeners outlive the page: { signal } lets destroyAll remove them
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Escape') return
      document
        .querySelectorAll('[data-accordion].is-open')
        .forEach((el) => el.classList.remove('is-open'))
    },
    { signal }
  )
}

//* ==================== FADE TITLES ====================
let _fadeTitlesCtx = null

const initFadeTitles = () => {
  // -- every tween / ScrollTrigger made inside the context is reverted together
  _fadeTitlesCtx = gsap.context(() => {
    gsap.utils.toArray('[data-fade-title]').forEach((el) => {
      gsap.from(el, {
        y: 40,
        autoAlpha: 0,
        duration: 1,
        scrollTrigger: { trigger: el, start: 'top 85%' }
      })
    })
  })
}
```

```js
const destroyAll = () => {
  _fadeTitlesCtx?.revert()
  ScrollTrigger.getAll().forEach((t) => t.kill())
  ScrollTrigger.clearScrollMemory()
  _accordionController?.abort()
  _fadeTitlesCtx = _accordionController = null
}

const initScripts = () => {
  // ...
  initAccordion()
  initFadeTitles()
}
```

| Created in init                           | Clean up?                              | How                                     |
| :---------------------------------------- | :------------------------------------- | :-------------------------------------- |
| Listener on an element of the page        | Not required, it goes with the element | `{ signal }` anyway, for consistency    |
| Listener on `window` / `document`         | **Yes**                                | `{ signal }`, then `controller.abort()` |
| GSAP tween / timeline                     | **Yes**                                | `gsap.context()`, then `ctx.revert()`   |
| ScrollTrigger                             | Already done                           | `destroyAll` kills them all             |
| `setInterval` / `setTimeout`              | **Yes**                                | `clearInterval` / `clearTimeout`        |
| `IntersectionObserver` / `ResizeObserver` | **Yes**                                | `.disconnect()`                         |
| Library (Swiper, …)                       | **Yes**                                | its `.destroy()`                        |

- **Code that does not depend on the page** (e.g. the `resize` listener for `initAppHeight`) stays at the top level and runs once.
- **Elements with `transition:persist`** (the custom scrollbar) are never replaced: init them once, as `_onceBound` does in `customLenis.js`.
- **The header is not persisted**: it is replaced on every page, so its code goes in `initHeader()` / `initMenu()` with cleanup.
- **Animations that need the page fully shown** (intros, counters): `initScripts` runs before the transition ends. Put them in the `astro:page-load` handler, after `startScroll()`.
- **`<script>` tags in `.astro` files** also run only once. Wrap the code in `document.addEventListener('astro:page-load', () => { ... })`, or move it to `app.js` as above.
