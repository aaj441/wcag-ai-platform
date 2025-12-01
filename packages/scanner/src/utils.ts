// InfinitySoul Scanner - Utility Functions
import { ViolationResult } from './types'

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/$/, '')
  } catch {
    return url
  }
}

export function calculateComplianceScore(violations: ViolationResult[]): number {
  if (violations.length === 0) return 100

  const weights = {
    CRITICAL: 10,
    SERIOUS: 5,
    MODERATE: 2,
    MINOR: 1,
  }

  const totalPenalty = violations.reduce((sum, v) => {
    return sum + (weights[v.severity] || 1)
  }, 0)

  const score = Math.max(0, 100 - totalPenalty)
  return Math.round(score * 10) / 10
}

export function mapSeverity(axeImpact?: string): 'CRITICAL' | 'SERIOUS' | 'MODERATE' | 'MINOR' {
  switch (axeImpact?.toLowerCase()) {
    case 'critical':
      return 'CRITICAL'
    case 'serious':
      return 'SERIOUS'
    case 'moderate':
      return 'MODERATE'
    case 'minor':
    default:
      return 'MINOR'
  }
}

export function mapCategory(tags: string[]): 'PERCEIVABLE' | 'OPERABLE' | 'UNDERSTANDABLE' | 'ROBUST' {
  if (tags.some(t => t.includes('text-alternatives') || t.includes('time-based-media'))) {
    return 'PERCEIVABLE'
  }
  if (tags.some(t => t.includes('keyboard') || t.includes('navigable'))) {
    return 'OPERABLE'
  }
  if (tags.some(t => t.includes('readable') || t.includes('predictable'))) {
    return 'UNDERSTANDABLE'
  }
  return 'ROBUST'
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname
  } catch {
    return url
  }
}
