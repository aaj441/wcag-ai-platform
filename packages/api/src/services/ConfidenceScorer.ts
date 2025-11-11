import { log } from "../utils/logger";

/**
 * WCAGI Confidence Scoring Service
 *
 * Scores WCAG violations using AI to determine confidence level (0.0-1.0)
 * Helps consultants prioritize review efforts on uncertain violations
 */

export interface ViolationData {
  wcagCriteria: string;
  description: string;
  elementSelector?: string;
  codeSnippet?: string;
  screenshot?: string;
}

export interface ConfidenceViolation {
  wcagCriteria: string;
  confidence: number;
  reasoning: string;
}

export interface ConfidenceResult {
  overallScore: number;
  violations: ConfidenceViolation[];
  falsePositiveRisk: "low" | "medium" | "high";
  recommendedAction: "approve" | "review_manually" | "reject";
}

/**
 * ConfidenceScorer Service
 *
 * Uses mock/local scoring for MVP
 * Can be replaced with OpenAI integration when API key is available
 */
export class ConfidenceScorer {
  /**
   * Mock confidence scoring based on WCAG criteria patterns
   * In production, this would call GPT-4 via OpenAI API
   */
  async scoreViolations(violations: ViolationData[]): Promise<ConfidenceResult> {
    try {
      log.info(
        `Scoring ${violations.length} violations for confidence`,
        { service: "ConfidenceScorer" }
      );

      // Score individual violations
      const scoredViolations: ConfidenceViolation[] = violations.map((v) =>
        this.scoreViolation(v)
      );

      // Calculate overall score
      const overallScore =
        scoredViolations.reduce((sum, v) => sum + v.confidence, 0) /
        scoredViolations.length;

      // Determine false positive risk
      const lowConfidenceCount = scoredViolations.filter(
        (v) => v.confidence < 0.7
      ).length;
      const falsePositiveRisk =
        lowConfidenceCount / scoredViolations.length > 0.3
          ? "high"
          : lowConfidenceCount / scoredViolations.length > 0.1
            ? "medium"
            : "low";

      // Determine recommended action
      const recommendedAction =
        overallScore >= 0.85
          ? "approve"
          : overallScore >= 0.6
            ? "review_manually"
            : "reject";

      return {
        overallScore,
        violations: scoredViolations,
        falsePositiveRisk,
        recommendedAction,
      };
    } catch (error) {
      log.error(`Failed to score violations`, error instanceof Error ? error : new Error(String(error)), { service: "ConfidenceScorer" });
      throw error;
    }
  }

  /**
   * Score individual WCAG violation
   *
   * Confidence factors:
   * - Detection reliability (0.0-1.0)
   * - False positive risk (-0.2 to 0.0)
   * - WCAG severity factor (0.0-0.3)
   * - Code evidence strength (0.0-0.4)
   */
  private scoreViolation(violation: ViolationData): ConfidenceViolation {
    const criteria = violation.wcagCriteria;
    let detectionReliability = 0.6; // Default moderate reliability
    let falsePositiveRisk = 0.0;
    let severityFactor = 0.2;
    let evidenceStrength = 0.0;

    // Pattern: Objectively measurable criteria get high confidence
    // Pattern: Subjective criteria get lower confidence

    // Color Contrast (1.4.3, 1.4.11) - Highly reliable, measurable
    if (criteria === "1.4.3" || criteria === "1.4.11") {
      detectionReliability = 0.95;
      severityFactor = 0.3;
    }
    // Focus Visible (2.4.7) - Reliable in most cases
    else if (criteria === "2.4.7") {
      detectionReliability = 0.85;
      severityFactor = 0.3;
    }
    // Form Labels (1.3.1, 3.3.2) - Usually reliable
    else if (criteria === "1.3.1" || criteria === "3.3.2") {
      detectionReliability = 0.85;
      severityFactor = 0.25;
    }
    // Alternative Text (1.1.1) - Detectable but requires context
    else if (criteria === "1.1.1") {
      detectionReliability = 0.8;
      severityFactor = 0.3;
    }
    // Keyboard Accessible (2.1.1) - Harder to detect reliably
    else if (criteria === "2.1.1") {
      detectionReliability = 0.7;
      severityFactor = 0.3;
    }
    // Touch Target Size (2.5.5) - Measurable
    else if (criteria === "2.5.5") {
      detectionReliability = 0.85;
      severityFactor = 0.25;
    }
    // Heading Structure (2.4.1) - Very reliable
    else if (criteria === "2.4.1") {
      detectionReliability = 0.9;
      severityFactor = 0.2;
    }
    // Text Alternatives (1.4.5) - Harder to detect
    else if (criteria === "1.4.5") {
      detectionReliability = 0.6;
      severityFactor = 0.2;
    }

    // Adjust based on evidence
    if (violation.screenshot) evidenceStrength += 0.15;
    if (violation.codeSnippet) evidenceStrength += 0.15;
    if (violation.elementSelector) evidenceStrength += 0.1;

    // Calculate final confidence
    const confidence = Math.min(
      1.0,
      (detectionReliability +
        Math.max(falsePositiveRisk, 0) +
        severityFactor +
        evidenceStrength) /
        4
    );

    return {
      wcagCriteria: criteria,
      confidence: Math.round(confidence * 100) / 100, // Round to 2 decimals
      reasoning: this.generateReasoning(criteria, confidence, violation),
    };
  }

  /**
   * Generate human-readable explanation of confidence score
   */
  private generateReasoning(
    criteria: string,
    confidence: number,
    violation: ViolationData
  ): string {
    const level =
      confidence >= 0.9
        ? "very high"
        : confidence >= 0.7
          ? "high"
          : confidence >= 0.5
            ? "moderate"
            : "low";

    const reasonPatterns: Record<string, string> = {
      "1.4.3": `Color contrast detection has ${level} confidence. This criterion is objectively measurable using precise algorithms.`,
      "1.1.1": `Alt text detection has ${level} confidence. Requires context to verify alternatives are appropriate.`,
      "2.4.7": `Focus visibility detection has ${level} confidence. Usually reliable, though focus styles vary by design.`,
      "2.1.1": `Keyboard accessibility has ${level} confidence. Harder to detect automatically; may require manual testing.`,
      "3.3.2": `Form label detection has ${level} confidence. Analyzes label-to-input associations programmatically.`,
    };

    return (
      reasonPatterns[criteria] ||
      `WCAG ${criteria} detection has ${level} confidence. ${violation.screenshot ? "Evidence includes screenshot. " : ""}${violation.codeSnippet ? "Code snippet available for review." : ""}`
    );
  }

  /**
   * Get human-readable badge for confidence score
   */
  static getBadge(score: number): string {
    if (score >= 0.9) return "✅ High Confidence";
    if (score >= 0.7) return "⚠️ Medium Confidence";
    if (score >= 0.5) return "❓ Low Confidence";
    return "❌ Very Low Confidence";
  }

  /**
   * Get recommended action color
   */
  static getColor(score: number): string {
    if (score >= 0.9) return "green";
    if (score >= 0.7) return "yellow";
    if (score >= 0.5) return "orange";
    return "red";
  }

  /**
   * Filter violations by confidence threshold
   */
  static filterByConfidence(
    violations: ConfidenceViolation[],
    threshold: number = 0.7
  ): {
    highConfidence: ConfidenceViolation[];
    needsReview: ConfidenceViolation[];
  } {
    return {
      highConfidence: violations.filter((v) => v.confidence >= threshold),
      needsReview: violations.filter((v) => v.confidence < threshold),
    };
  }
}

// Export singleton instance
export const confidenceScorer = new ConfidenceScorer();
