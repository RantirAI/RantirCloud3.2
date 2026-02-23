'use client'

import { useState } from 'react'
import { cn } from 'ui'

/**
 * Parse an HSL string like "0deg 0% 98%" or "152.9deg 60% 52.9%" into {h, s, l}.
 */
function parseHSL(hsl: string): { h: number; s: number; l: number } | null {
  const match = hsl.match(/([\d.]+)deg\s+([\d.]+)%\s+([\d.]+)%/)
  if (!match) return null
  return { h: parseFloat(match[1]), s: parseFloat(match[2]), l: parseFloat(match[3]) }
}

/**
 * Convert HSL to RGB (all values 0-255).
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  s /= 100
  l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0,
    g = 0,
    b = 0

  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

/**
 * Convert an sRGB channel (0-255) to linear RGB.
 */
function sRGBtoLinear(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

/**
 * Calculate relative luminance per WCAG 2.1.
 */
function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b)
}

/**
 * Calculate WCAG contrast ratio between two colors.
 */
function contrastRatio(
  fg: { r: number; g: number; b: number },
  bg: { r: number; g: number; b: number }
): number {
  const l1 = relativeLuminance(fg.r, fg.g, fg.b)
  const l2 = relativeLuminance(bg.r, bg.g, bg.b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((c) => {
        const hex = c.toString(16)
        return hex.length === 1 ? '0' + hex : hex
      })
      .join('')
  )
}

type WCAGLevel = 'AAA' | 'AA' | 'Fail'

function getNormalTextLevel(ratio: number): WCAGLevel {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  return 'Fail'
}

function getLargeTextLevel(ratio: number): WCAGLevel {
  if (ratio >= 4.5) return 'AAA'
  if (ratio >= 3) return 'AA'
  return 'Fail'
}

const levelColors: Record<WCAGLevel, string> = {
  AAA: 'text-brand-600 bg-brand-200',
  AA: 'text-warning-600 bg-warning-200',
  Fail: 'text-destructive-600 bg-destructive-200',
}

interface ColorToken {
  label: string
  variable: string
  light: string
  dark: string
}

// Color tokens from the Supabase design system
// Each has a label, the CSS variable name, and values for light and dark themes
const colorTokens: { group: string; tokens: ColorToken[] }[] = [
  {
    group: 'Foreground',
    tokens: [
      { label: 'foreground', variable: '--foreground-default', light: '0deg 0% 9%', dark: '0deg 0% 98%' },
      { label: 'foreground-light', variable: '--foreground-light', light: '0deg 0% 32.2%', dark: '0deg 0% 70.6%' },
      { label: 'foreground-lighter', variable: '--foreground-lighter', light: '0deg 0% 43.9%', dark: '0deg 0% 53.7%' },
      { label: 'foreground-muted', variable: '--foreground-muted', light: '0deg 0% 69.8%', dark: '0deg 0% 30.2%' },
      { label: 'foreground-contrast', variable: '--foreground-contrast', light: '0deg 0% 98.4%', dark: '0deg 0% 8.6%' },
    ],
  },
  {
    group: 'Background',
    tokens: [
      { label: 'background', variable: '--background-default', light: '0deg 0% 98.8%', dark: '0deg 0% 7.1%' },
      { label: 'background-200', variable: '--background-200', light: '0deg 0% 96.9%', dark: '0deg 0% 9%' },
      { label: 'surface-75', variable: '--background-surface-75', light: '0deg 0% 100%', dark: '0deg 0% 9%' },
      { label: 'surface-100', variable: '--background-surface-100', light: '0deg 0% 98.8%', dark: '0deg 0% 12.2%' },
      { label: 'surface-200', variable: '--background-surface-200', light: '0deg 0% 95.3%', dark: '0deg 0% 12.9%' },
      { label: 'surface-300', variable: '--background-surface-300', light: '0deg 0% 92.9%', dark: '0deg 0% 16.1%' },
      { label: 'surface-400', variable: '--background-surface-400', light: '0deg 0% 89.8%', dark: '0deg 0% 16.1%' },
      { label: 'overlay', variable: '--background-overlay-default', light: '0deg 0% 98.8%', dark: '0deg 0% 14.1%' },
      { label: 'alternative', variable: '--background-alternative-default', light: '0deg 0% 99.2%', dark: '0deg 0% 5.9%' },
    ],
  },
  {
    group: 'Brand',
    tokens: [
      { label: 'brand', variable: '--brand-default', light: '152.9deg 60% 52.9%', dark: '153.1deg 60.2% 52.7%' },
      { label: 'brand-600', variable: '--brand-600', light: '156.5deg 86.5% 26.1%', dark: '154.9deg 59.5% 70%' },
      { label: 'brand-500', variable: '--brand-500', light: '155.3deg 78.4% 40%', dark: '154.9deg 100% 19.2%' },
      { label: 'brand-400', variable: '--brand-400', light: '151.3deg 66.9% 66.9%', dark: '155.5deg 100% 9.6%' },
    ],
  },
  {
    group: 'Status',
    tokens: [
      { label: 'warning', variable: '--warning-default', light: '30.3deg 80.3% 47.8%', dark: '38.9deg 100% 42.9%' },
      { label: 'destructive', variable: '--destructive-default', light: '10.2deg 77.9% 53.9%', dark: '10.2deg 77.9% 53.9%' },
    ],
  },
]

type ThemeMode = 'light' | 'dark'

function getTokenRgb(token: { light: string; dark: string }, mode: ThemeMode) {
  const hslStr = mode === 'light' ? token.light : token.dark
  const hsl = parseHSL(hslStr)
  if (!hsl) return { r: 0, g: 0, b: 0 }
  return hslToRgb(hsl.h, hsl.s, hsl.l)
}

function RatingBadge({ level }: { level: WCAGLevel }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        levelColors[level]
      )}
    >
      {level}
    </span>
  )
}

function ColorSwatch({ rgb, label }: { rgb: { r: number; g: number; b: number }; label: string }) {
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b)
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-6 w-6 rounded border border-default shrink-0"
        style={{ backgroundColor: hex }}
      />
      <div className="flex flex-col">
        <span className="text-xs font-mono text-foreground-light">{label}</span>
        <span className="text-xs font-mono text-foreground-muted">{hex}</span>
      </div>
    </div>
  )
}

const ContrastChecker = () => {
  const allTokens = colorTokens.flatMap((g) => g.tokens)
  const [fgIndex, setFgIndex] = useState(0)
  const [bgIndex, setBgIndex] = useState(
    allTokens.findIndex((t) => t.label === 'background')
  )
  const [mode, setMode] = useState<ThemeMode>('light')

  const fgToken = allTokens[fgIndex]
  const bgToken = allTokens[bgIndex]

  const fgRgb = getTokenRgb(fgToken, mode)
  const bgRgb = getTokenRgb(bgToken, mode)
  const ratio = contrastRatio(fgRgb, bgRgb)
  const normalLevel = getNormalTextLevel(ratio)
  const largeLevel = getLargeTextLevel(ratio)

  const fgHex = rgbToHex(fgRgb.r, fgRgb.g, fgRgb.b)
  const bgHex = rgbToHex(bgRgb.r, bgRgb.g, bgRgb.b)

  return (
    <div className="space-y-6">
      {/* Theme toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('light')}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            mode === 'light'
              ? 'bg-foreground text-background border-foreground'
              : 'bg-surface-200 text-foreground-light border-default hover:bg-surface-300'
          )}
        >
          Light
        </button>
        <button
          onClick={() => setMode('dark')}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            mode === 'dark'
              ? 'bg-foreground text-background border-foreground'
              : 'bg-surface-200 text-foreground-light border-default hover:bg-surface-300'
          )}
        >
          Dark
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Foreground picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Text color</label>
          <select
            value={fgIndex}
            onChange={(e) => setFgIndex(Number(e.target.value))}
            className="w-full rounded-md border border-default bg-surface-100 px-3 py-2 text-sm text-foreground"
          >
            {colorTokens.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.tokens.map((token) => {
                  const idx = allTokens.indexOf(token)
                  return (
                    <option key={token.label} value={idx}>
                      {token.label}
                    </option>
                  )
                })}
              </optgroup>
            ))}
          </select>
          <ColorSwatch rgb={fgRgb} label={fgToken.label} />
        </div>

        {/* Background picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Background color</label>
          <select
            value={bgIndex}
            onChange={(e) => setBgIndex(Number(e.target.value))}
            className="w-full rounded-md border border-default bg-surface-100 px-3 py-2 text-sm text-foreground"
          >
            {colorTokens.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.tokens.map((token) => {
                  const idx = allTokens.indexOf(token)
                  return (
                    <option key={token.label} value={idx}>
                      {token.label}
                    </option>
                  )
                })}
              </optgroup>
            ))}
          </select>
          <ColorSwatch rgb={bgRgb} label={bgToken.label} />
        </div>
      </div>

      {/* Preview */}
      <div
        className="rounded-lg border border-default p-6 flex flex-col items-center gap-3"
        style={{ backgroundColor: bgHex }}
      >
        <span className="text-2xl font-semibold" style={{ color: fgHex }}>
          The quick brown fox
        </span>
        <span className="text-sm" style={{ color: fgHex }}>
          jumps over the lazy dog — 0123456789
        </span>
      </div>

      {/* Results */}
      <div className="rounded-lg border border-default overflow-hidden">
        <div className="grid grid-cols-3 gap-px bg-border-default">
          <div className="bg-surface-100 p-4 text-center">
            <div className="text-2xl font-bold text-foreground tabular-nums">
              {ratio.toFixed(2)}
              <span className="text-sm font-normal text-foreground-lighter">:1</span>
            </div>
            <div className="text-xs text-foreground-muted mt-1">Contrast ratio</div>
          </div>
          <div className="bg-surface-100 p-4 text-center">
            <div className="mb-1">
              <RatingBadge level={normalLevel} />
            </div>
            <div className="text-xs text-foreground-muted mt-1">
              Normal text
              <span className="block text-[10px]">(min 4.5:1 AA, 7:1 AAA)</span>
            </div>
          </div>
          <div className="bg-surface-100 p-4 text-center">
            <div className="mb-1">
              <RatingBadge level={largeLevel} />
            </div>
            <div className="text-xs text-foreground-muted mt-1">
              Large text
              <span className="block text-[10px]">(min 3:1 AA, 4.5:1 AAA)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Common pairs table */}
      <ContrastTable mode={mode} />
    </div>
  )
}

/**
 * Pre-computed table of common foreground/background pairs used in the design system.
 */
function ContrastTable({ mode }: { mode: ThemeMode }) {
  const pairs = [
    { fg: 'foreground', bg: 'background' },
    { fg: 'foreground', bg: 'surface-100' },
    { fg: 'foreground', bg: 'surface-200' },
    { fg: 'foreground', bg: 'surface-300' },
    { fg: 'foreground-light', bg: 'background' },
    { fg: 'foreground-light', bg: 'surface-100' },
    { fg: 'foreground-light', bg: 'surface-200' },
    { fg: 'foreground-lighter', bg: 'background' },
    { fg: 'foreground-lighter', bg: 'surface-100' },
    { fg: 'foreground-muted', bg: 'background' },
    { fg: 'foreground-contrast', bg: 'brand' },
    { fg: 'foreground-contrast', bg: 'destructive' },
    { fg: 'foreground-contrast', bg: 'warning' },
  ]

  const allTokens = colorTokens.flatMap((g) => g.tokens)

  const results = pairs.map(({ fg, bg }) => {
    const fgToken = allTokens.find((t) => t.label === fg)
    const bgToken = allTokens.find((t) => t.label === bg)
    if (!fgToken || !bgToken) return null

    const fgRgb = getTokenRgb(fgToken, mode)
    const bgRgb = getTokenRgb(bgToken, mode)
    const ratio = contrastRatio(fgRgb, bgRgb)

    return {
      fg,
      bg,
      fgHex: rgbToHex(fgRgb.r, fgRgb.g, fgRgb.b),
      bgHex: rgbToHex(bgRgb.r, bgRgb.g, bgRgb.b),
      ratio,
      normalLevel: getNormalTextLevel(ratio),
      largeLevel: getLargeTextLevel(ratio),
    }
  }).filter(Boolean) as {
    fg: string
    bg: string
    fgHex: string
    bgHex: string
    ratio: number
    normalLevel: WCAGLevel
    largeLevel: WCAGLevel
  }[]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-default">
            <th className="text-left py-2 px-3 text-foreground-light font-medium">Text</th>
            <th className="text-left py-2 px-3 text-foreground-light font-medium">Background</th>
            <th className="text-center py-2 px-3 text-foreground-light font-medium">Preview</th>
            <th className="text-right py-2 px-3 text-foreground-light font-medium">Ratio</th>
            <th className="text-center py-2 px-3 text-foreground-light font-medium">Normal</th>
            <th className="text-center py-2 px-3 text-foreground-light font-medium">Large</th>
          </tr>
        </thead>
        <tbody>
          {results.map((row, i) => (
            <tr key={i} className="border-b border-default last:border-b-0">
              <td className="py-2 px-3">
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-3 w-3 rounded-sm border border-default shrink-0"
                    style={{ backgroundColor: row.fgHex }}
                  />
                  <code className="text-xs">{row.fg}</code>
                </div>
              </td>
              <td className="py-2 px-3">
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-3 w-3 rounded-sm border border-default shrink-0"
                    style={{ backgroundColor: row.bgHex }}
                  />
                  <code className="text-xs">{row.bg}</code>
                </div>
              </td>
              <td className="py-2 px-3 text-center">
                <span
                  className="inline-block rounded px-2 py-0.5 text-xs font-medium border border-default"
                  style={{ color: row.fgHex, backgroundColor: row.bgHex }}
                >
                  Aa
                </span>
              </td>
              <td className="py-2 px-3 text-right font-mono text-xs tabular-nums">
                {row.ratio.toFixed(2)}:1
              </td>
              <td className="py-2 px-3 text-center">
                <RatingBadge level={row.normalLevel} />
              </td>
              <td className="py-2 px-3 text-center">
                <RatingBadge level={row.largeLevel} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { ContrastChecker }
