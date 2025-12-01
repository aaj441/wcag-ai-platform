// InfinitySoul Scanner - Type Definitions

export interface ScanConfig {
  url: string
  scanType: 'QUICK' | 'FULL' | 'DEEP'
  wcagLevel: 'A' | 'AA' | 'AAA'
  includeScreenshots?: boolean
  includeHTML?: boolean
  followLinks?: boolean
  maxPages?: number
}

export interface ViolationResult {
  id: string
  wcagCode: string
  wcagLevel: 'A' | 'AA' | 'AAA'
  severity: 'CRITICAL' | 'SERIOUS' | 'MODERATE' | 'MINOR'
  category: 'PERCEIVABLE' | 'OPERABLE' | 'UNDERSTANDABLE' | 'ROBUST'
  description: string
  impact: string
  selector?: string
  html?: string
  help: string
  helpUrl: string
  tags: string[]
}

export interface ConfidenceMetrics {
  score: number // 0-1
  factors: {
    elementVisibility: number
    dynamicContent: number
    browserCompatibility: number
    sampleSize: number
  }
}

export interface ScanResult {
  url: string
  timestamp: string
  scanType: ScanConfig['scanType']
  wcagLevel: ScanConfig['wcagLevel']
  violations: ViolationResult[]
  complianceScore: number // 0-100
  totalViolations: number
  violationsByLevel: {
    A: number
    AA: number
    AAA: number
  }
  violationsBySeverity: {
    CRITICAL: number
    SERIOUS: number
    MODERATE: number
    MINOR: number
  }
  violationsByCategory: {
    PERCEIVABLE: number
    OPERABLE: number
    UNDERSTANDABLE: number
    ROBUST: number
  }
  metadata: {
    scanDuration: number
    pagesScanned: number
    browser: string
    viewport: string
  }
}
