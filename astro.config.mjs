// @ts-check
import { fileURLToPath, pathToFileURL } from 'node:url'
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

const srcDir = fileURLToPath(new URL('./src/', import.meta.url))

export default defineConfig({
  base: '/',
  site: 'https://yourdomain.com',
  integrations: [sitemap()],
  trailingSlash: 'ignore',
  scopedStyleStrategy: 'where',
  build: {
    inlineStylesheets: 'auto'
  },
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
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
    },
    build: {
      rollupOptions: {}
    }
  },
  prefetch: {
    // prefetchAll: true,
    defaultStrategy: 'viewport'
  },
  devToolbar: {
    enabled: false
  }
})
