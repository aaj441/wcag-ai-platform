// InfinitySoul Scanner - Confidence Scoring Engine
import { ViolationResult, ConfidenceMetrics } from './types'

export class ConfidenceScorer {
  calculateScore(violation: ViolationResult, context: any): ConfidenceMetrics {
    const factors = {
      elementVisibility: this.assessElementVisibility(violation),
      dynamicContent: this.assessDynamicContent(context),
      browserCompatibility: this.assessBrowserCompatibility(violation),
      sampleSize: this.assessSampleSize(context),
    }

    // Weighted average
    const score =
      factors.elementVisibility * 0.3 +
      factors.dynamicContent * 0.25 +
      factors.browserCompatibility * 0.25 +
      factors.sampleSize * 0.2

    return { score, factors }
  }

  private assessElementVisibility(violation: ViolationResult): number {
    if (violation.selector && violation.html) return 0.95
    if (violation.selector) return 0.85
    return 0.7
  }

  private assessDynamicContent(context: any): number {
    const hasDynamicContent = context?.hasDynamicContent || false
    return hasDynamicContent ? 0.75 : 0.9
  }

  private assessBrowserCompatibility(violation: ViolationResult): number {
    const highConfidenceCodes = ['1.1.1', '2.4.1', '3.1.1', '4.1.1']
    return highConfidenceCodes.includes(violation.wcagCode) ? 0.95 : 0.85
  }

  private assessSampleSize(context: any): number {
    const pagesScanned = context?.pagesScanned || 1
    return Math.min(0.95, 0.6 + (pagesScanned * 0.05))
  }
}
