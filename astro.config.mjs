// @ts-check
import { fileURLToPath, pathToFileURL } from 'node:url'
import { defineConfig } from 'astro/config'

const srcDir = fileURLToPath(new URL('./src/', import.meta.url))

// https://astro.build/config
export default defineConfig({
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          // Vite's `resolve.alias` isn't reliable for `@use`/`@import` in Sass,
          // so resolve `@/...` ourselves via a custom Sass importer.
          importers: [
            {
              findFileUrl(url) {
                if (!url.startsWith('@/')) return null
                return new URL(url.slice(2), pathToFileURL(srcDir))
              }
            }
          ]
        }
      }
    }
  },

  // prefetch links as they enter the viewport
  // pairs with <ClientRouter /> for near-instant page swaps
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport'
  }
})
