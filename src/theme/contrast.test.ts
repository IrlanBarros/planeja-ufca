/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

function palette(block: string) {
  return Object.fromEntries(
    [...block.matchAll(/--color-([\w-]+):\s*(#[\da-f]+);/g)]
      .map((match) => [match[1], match[2]]),
  )
}

function luminance(hex: string) {
  const [r, g, b] = hex.slice(1).match(/../g)!.map((value) => {
    const channel = parseInt(value, 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

const light = palette(css.match(/:root \{([^}]+)\}/)![1])
const dark = { ...light, ...palette(css.match(/:root\[data-theme="dark"\] \{([^}]+)\}/)![1]) }

describe.each([['claro', light], ['escuro', dark]] as const)('contraste do tema %s', (_name, colors) => {
  it.each([
    ['text-primary', 'background'],
    ['text-primary', 'surface'],
    ['text-secondary', 'surface'],
    ['text-secondary', 'selected-surface'],
    ['text-muted', 'background'],
    ['text-muted', 'surface-secondary'],
    ['text-muted', 'input-background'],
    ['text-muted', 'warning-background'],
    ['link', 'surface'],
    ['on-primary', 'primary'],
    ['on-primary', 'primary-hover'],
    ['academic-text', 'academic-background'],
    ['academic-text', 'surface'],
    ['danger-text', 'background'],
    ['danger-text', 'danger-background'],
    ['warning-text', 'warning-badge'],
    ['warning-text', 'warning-background'],
    ['success-text', 'success-background'],
    ['text-secondary', 'surface-secondary'],
  ])('%s sobre %s atende 4,5:1', (foreground, background) => {
    expect(contrast(colors[foreground], colors[background])).toBeGreaterThanOrEqual(4.5)
  })

  it('identifica o contorno dos campos com pelo menos 3:1', () => {
    expect(contrast(colors['input-border'], colors['input-background'])).toBeGreaterThanOrEqual(3)
  })
})
