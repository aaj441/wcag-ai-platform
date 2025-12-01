// InfinitySoul Scanner - WCAG Analysis Engine
import { GoogleGenerativeAI } from '@google/generative-ai'
import { ViolationResult } from './types'

export class WCAGAnalyzer {
  private gemini: GoogleGenerativeAI | null = null

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey) {
      this.gemini = new GoogleGenerativeAI(apiKey)
    }
  }

  async enrichViolation(violation: ViolationResult): Promise<{
    aiSuggestion: string
    confidenceScore: number
    remediation: string[]
  }> {
    if (!this.gemini) {
      return {
        aiSuggestion: 'AI analysis not available',
        confidenceScore: 0.5,
        remediation: [],
      }
    }

    try {
      const model = this.gemini.getGenerativeModel({ model: 'gemini-pro' })

      const prompt = `Analyze this WCAG ${violation.wcagCode} violation:

Description: ${violation.description}
Impact: ${violation.impact}
Severity: ${violation.severity}

Provide:
1. Clear explanation for non-technical stakeholders
2. Confidence score (0-1) that this is genuine
3. Top 3 remediation steps

Format as JSON:
{
  "explanation": "...",
  "confidence": 0.95,
  "remediation": ["step1", "step2", "step3"]
}`

      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      const parsed = JSON.parse(text)

      return {
        aiSuggestion: parsed.explanation,
        confidenceScore: parsed.confidence,
        remediation: parsed.remediation,
      }
    } catch (error) {
      console.error('Error enriching violation:', error)
      return {
        aiSuggestion: 'Error generating AI analysis',
        confidenceScore: 0.5,
        remediation: [],
      }
    }
  }

  async generateExecutiveSummary(violations: ViolationResult[]): Promise<string> {
    if (!this.gemini || violations.length === 0) {
      return 'No violations found. Site meets basic accessibility standards.'
    }

    const criticalCount = violations.filter(v => v.severity === 'CRITICAL').length
    const seriousCount = violations.filter(v => v.severity === 'SERIOUS').length

    try {
      const model = this.gemini.getGenerativeModel({ model: 'gemini-pro' })

      const prompt = `Generate executive summary for WCAG compliance report:

Total Violations: ${violations.length}
Critical: ${criticalCount}
Serious: ${seriousCount}

Top 5 issues:
${violations.slice(0, 5).map((v, i) => `${i + 1}. ${v.wcagCode}: ${v.description}`).join('\n')}

Write 2-paragraph summary focusing on business impact and priority recommendations.`

      const result = await model.generateContent(prompt)
      const response = await result.response
      return response.text()
    } catch (error) {
      console.error('Error generating summary:', error)
      return 'Unable to generate executive summary.'
    }
  }
}
