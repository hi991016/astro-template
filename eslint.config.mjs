// @ts-check
import { defineConfig } from 'eslint/config'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintPluginAstro from 'eslint-plugin-astro'
import eslintConfigPrettier from 'eslint-config-prettier'
import globals from 'globals'

export default defineConfig(
  {
    ignores: ['dist/**', '.astro/**', 'node_modules/**', 'public/**']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    files: ['**/*.astro'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.astro']
      }
    }
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'warn'
    }
  },
  eslintConfigPrettier
)
