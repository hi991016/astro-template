import { scrollToHash } from '@/modules/customLenis'

// -- same origin + path + query, ignoring #hash, index.html and the trailing slash,
// -- so "/about", "/about/" and "/about/index.html" are the same page
export const pageKey = (url) => {
  const { origin, pathname, search } = new URL(url, location.href)
  const path = pathname.replace(/\/index\.html?$/, '/').replace(/(.)\/$/, '$1')
  return origin + path + search
}

// -- a link to the page already shown: no reload, no transition. a #hash link smooth scrolls
// -- to its section. runs in the capture phase, before astro's router sees the click
export const initNav = () => {
  window.addEventListener(
    'click',
    (e) => {
      const link = e.target.closest('a[href]')
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      if (pageKey(link.href) !== pageKey(location.href)) return

      e.preventDefault()
      if (scrollToHash(link.hash)) history.replaceState(history.state, '', link.hash)
    },
    true
  )
}
