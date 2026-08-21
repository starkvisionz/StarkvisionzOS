import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { cn } from '../lib/utils.js'

const globals = readFileSync(join(__dirname, '..', 'app', 'globals.css'), 'utf8')

describe('brand tokens', () => {
  it('defines the Starkvisionz palette as CSS custom properties', () => {
    expect(globals).toContain('--void-black: #0A0A0A;')
    expect(globals).toContain('--sovereign-gold: #C9A227;')
  })

  it('exposes the tokens to Tailwind as theme colours', () => {
    expect(globals).toContain('--color-void-black: var(--void-black)')
    expect(globals).toContain('--color-sovereign-gold: var(--sovereign-gold)')
  })
})

describe('cn', () => {
  it('merges conflicting Tailwind classes, last one winning', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('drops falsy values', () => {
    expect(cn('text-sm', false, undefined, 'font-medium')).toBe('text-sm font-medium')
  })
})
