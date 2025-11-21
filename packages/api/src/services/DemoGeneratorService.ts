/**
 * Demo Generator Service
 *
 * Generates before/after compliance demos for sales pitches
 * Takes scan results and creates interactive HTML demos showing violations
 * Perfect for client presentations and screenshots
 */

import { Transformation } from './SiteTransformationService';
import { log } from '../utils/logger';

export interface DemoGenerationOptions {
  includeViolationCount?: boolean;
  includeFixedBadge?: boolean;
  customBranding?: {
    primaryColor?: string;
    companyName?: string;
    logo?: string;
  };
}

export class DemoGeneratorService {
  /**
   * Generate an interactive before/after demo from transformation results
   */
  async generateDemo(
    transformation: Transformation,
    options: DemoGenerationOptions = {}
  ): Promise<string> {
    log.info('Generating compliance demo', {
      transformationId: transformation.id,
      violationCount: transformation.violations.length,
    });

    const violationCount = transformation.violations.length;
    const fixedCount = transformation.violations.filter(v => v.fixed).length;
    const primaryColor = options.customBranding?.primaryColor || '#4CAF50';
    const companyName = options.customBranding?.companyName || 'Your Company';

    // Generate the demo HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WCAG Compliance Demo - ${transformation.url}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
        }

        /* Demo Controls */
        .demo-controls {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #1a1a1a;
            color: white;
            padding: 1rem;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .demo-info {
            display: flex;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .demo-controls h1 {
            font-size: 1.2rem;
            font-weight: 600;
        }

        .demo-url {
            font-size: 0.85rem;
            color: #888;
        }

        .toggle-button {
            background: ${primaryColor};
            color: white;
            border: none;
            padding: 12px 24px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            border-radius: 8px;
            transition: all 0.3s;
            white-space: nowrap;
        }

        .toggle-button:hover {
            transform: scale(1.05);
            opacity: 0.9;
        }

        .state-indicator {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 0.9rem;
            font-weight: 600;
        }

        .state-before {
            background: #f44336;
            color: white;
        }

        .state-after {
            background: ${primaryColor};
            color: white;
        }

        .violation-count {
            background: #f44336;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 600;
        }

        .fixed-count {
            background: ${primaryColor};
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 600;
        }

        .compliance-score {
            display: flex;
            gap: 1rem;
            align-items: center;
        }

        .score-item {
            text-align: center;
        }

        .score-value {
            font-size: 1.5rem;
            font-weight: bold;
            display: block;
        }

        .score-label {
            font-size: 0.75rem;
            color: #888;
        }

        .score-before {
            color: #f44336;
        }

        .score-after {
            color: ${primaryColor};
        }

        /* Main Content */
        .main-content {
            margin-top: 120px;
            padding: 2rem;
        }

        /* Violation List */
        .violations-section {
            max-width: 1200px;
            margin: 0 auto;
        }

        .violations-section h2 {
            font-size: 2rem;
            margin-bottom: 2rem;
            text-align: center;
        }

        .violation-card {
            background: white;
            border: 3px solid #f44336;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.2);
            position: relative;
        }

        .violation-card::before {
            content: '⚠ VIOLATION';
            position: absolute;
            top: -12px;
            left: 20px;
            background: #f44336;
            color: white;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 700;
        }

        .violation-card.fixed {
            border-color: ${primaryColor};
            box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2);
        }

        .violation-card.fixed::before {
            content: '✓ FIXED';
            background: ${primaryColor};
        }

        .violation-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 1rem;
        }

        .violation-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: #333;
        }

        .violation-wcag {
            font-size: 0.9rem;
            color: #666;
            font-family: monospace;
        }

        .severity-badge {
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
        }

        .severity-critical {
            background: #f44336;
            color: white;
        }

        .severity-high {
            background: #ff9800;
            color: white;
        }

        .severity-medium {
            background: #ffc107;
            color: #333;
        }

        .severity-low {
            background: #8bc34a;
            color: white;
        }

        .violation-description {
            color: #555;
            margin-bottom: 1rem;
            line-height: 1.6;
        }

        .violation-element {
            background: #f5f5f5;
            padding: 1rem;
            border-radius: 6px;
            border-left: 4px solid #666;
            margin-bottom: 1rem;
        }

        .violation-element code {
            font-family: 'Courier New', monospace;
            color: #c7254e;
            font-size: 0.9rem;
        }

        .violation-fix {
            background: #e8f5e9;
            padding: 1rem;
            border-radius: 6px;
            border-left: 4px solid ${primaryColor};
        }

        .violation-fix h4 {
            color: ${primaryColor};
            font-size: 0.9rem;
            margin-bottom: 0.5rem;
        }

        /* Site Preview Frame */
        .site-preview {
            margin: 2rem auto;
            max-width: 1200px;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .site-preview iframe {
            width: 100%;
            min-height: 600px;
            border: none;
        }

        /* Hide/Show elements based on state */
        body.before .after-only {
            display: none;
        }

        body.after .before-only {
            display: none;
        }

        body.before .violation-card {
            border-color: #f44336;
            box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.2);
        }

        body.before .violation-card::before {
            content: '⚠ VIOLATION';
            background: #f44336;
        }

        body.after .violation-card.fixed {
            border-color: ${primaryColor};
            box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2);
        }

        body.after .violation-card.fixed::before {
            content: '✓ FIXED';
            background: ${primaryColor};
        }

        body.after .violation-card:not(.fixed) {
            opacity: 0.5;
        }

        .summary-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            max-width: 1200px;
            margin: 2rem auto;
        }

        .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
        }

        .stat-value {
            font-size: 2.5rem;
            font-weight: bold;
            display: block;
            margin-bottom: 0.5rem;
        }

        .stat-label {
            color: #666;
            font-size: 0.9rem;
        }
    </style>
</head>
<body class="before">
    <!-- Demo Controls -->
    <div class="demo-controls">
        <div class="demo-info">
            <div>
                <h1>WCAG Compliance Demo</h1>
                <div class="demo-url">${transformation.url}</div>
            </div>

            <div class="compliance-score before-only">
                <div class="score-item">
                    <span class="score-value score-before">${transformation.complianceScore.before}%</span>
                    <span class="score-label">Current Score</span>
                </div>
            </div>

            <div class="compliance-score after-only">
                <div class="score-item">
                    <span class="score-value score-before">${transformation.complianceScore.before}%</span>
                    <span class="score-label">Before</span>
                </div>
                <div class="score-item">
                    <span style="font-size: 2rem;">→</span>
                </div>
                <div class="score-item">
                    <span class="score-value score-after">${transformation.complianceScore.after}%</span>
                    <span class="score-label">After</span>
                </div>
                <div class="score-item">
                    <span class="score-value" style="color: ${primaryColor};">+${transformation.complianceScore.improvement}%</span>
                    <span class="score-label">Improvement</span>
                </div>
            </div>

            <span class="violation-count before-only">${violationCount} Violation${violationCount !== 1 ? 's' : ''} Found</span>
            <span class="fixed-count after-only">${fixedCount}/${violationCount} Fixed</span>

            <span class="state-indicator state-before before-only">BEFORE: With Violations</span>
            <span class="state-indicator state-after after-only">AFTER: Fixed & Compliant</span>
        </div>

        <button class="toggle-button" onclick="toggleState()">
            <span class="before-only">Show Fixed Version →</span>
            <span class="after-only">← Show Violations</span>
        </button>
    </div>

    <!-- Main Content -->
    <div class="main-content">
        <!-- Summary Stats -->
        <div class="summary-stats">
            <div class="stat-card">
                <span class="stat-value" style="color: #f44336;">${violationCount}</span>
                <span class="stat-label">Total Violations</span>
            </div>
            <div class="stat-card after-only">
                <span class="stat-value" style="color: ${primaryColor};">${fixedCount}</span>
                <span class="stat-label">Violations Fixed</span>
            </div>
            <div class="stat-card">
                <span class="stat-value" style="color: #666;">${transformation.violations.filter(v => v.severity === 'critical').length}</span>
                <span class="stat-label">Critical Issues</span>
            </div>
            <div class="stat-card after-only">
                <span class="stat-value" style="color: ${primaryColor};">+${transformation.complianceScore.improvement}%</span>
                <span class="stat-label">Compliance Improvement</span>
            </div>
        </div>

        <!-- Violations List -->
        <section class="violations-section">
            <h2>Accessibility Violations</h2>

            ${transformation.violations.map(violation => `
            <div class="violation-card ${violation.fixed ? 'fixed' : ''}">
                <div class="violation-header">
                    <div>
                        <div class="violation-title">${this.getViolationTitle(violation.wcagCriteria)}</div>
                        <div class="violation-wcag">WCAG ${violation.wcagCriteria}</div>
                    </div>
                    <span class="severity-badge severity-${violation.severity}">${violation.severity}</span>
                </div>

                <p class="violation-description">${violation.description}</p>

                ${violation.elementSelector ? `
                <div class="violation-element">
                    <strong>Element:</strong><br>
                    <code>${this.escapeHtml(violation.elementSelector)}</code>
                </div>
                ` : ''}

                ${violation.codeSnippet ? `
                <div class="violation-element">
                    <strong>Code:</strong><br>
                    <code>${this.escapeHtml(violation.codeSnippet)}</code>
                </div>
                ` : ''}

                ${violation.fixed ? `
                <div class="violation-fix after-only">
                    <h4>✓ How We Fixed It</h4>
                    <p>${this.getFixDescription(violation.wcagCriteria)}</p>
                </div>
                ` : ''}
            </div>
            `).join('\n')}
        </section>
    </div>

    <script>
        function toggleState() {
            const body = document.body;
            if (body.classList.contains('before')) {
                body.classList.remove('before');
                body.classList.add('after');
            } else {
                body.classList.remove('after');
                body.classList.add('before');
            }
        }

        // Keyboard shortcut: Space to toggle
        document.addEventListener('keydown', function(e) {
            if (e.key === ' ' && e.target === document.body) {
                e.preventDefault();
                toggleState();
            }
        });
    </script>
</body>
</html>`;

    log.info('Demo generated successfully', {
      transformationId: transformation.id,
      htmlLength: html.length,
    });

    return html;
  }

  /**
   * Get a human-readable title for a WCAG criteria
   */
  private getViolationTitle(wcagCriteria: string): string {
    const titles: Record<string, string> = {
      '1.1.1': 'Non-text Content (Missing Alt Text)',
      '1.3.1': 'Info and Relationships (Missing Labels)',
      '1.4.3': 'Contrast (Minimum)',
      '1.4.11': 'Non-text Contrast',
      '2.1.1': 'Keyboard Accessible',
      '2.4.1': 'Bypass Blocks',
      '2.4.2': 'Page Titled',
      '2.4.3': 'Focus Order',
      '2.4.4': 'Link Purpose',
      '2.4.6': 'Headings and Labels',
      '2.4.7': 'Focus Visible',
      '2.5.5': 'Target Size (Touch Targets)',
      '3.1.1': 'Language of Page',
      '3.2.1': 'On Focus',
      '3.2.2': 'On Input',
      '3.3.1': 'Error Identification',
      '3.3.2': 'Labels or Instructions',
      '4.1.1': 'Parsing',
      '4.1.2': 'Name, Role, Value',
    };

    return titles[wcagCriteria] || `WCAG ${wcagCriteria}`;
  }

  /**
   * Get a fix description for a WCAG criteria
   */
  private getFixDescription(wcagCriteria: string): string {
    const fixes: Record<string, string> = {
      '1.1.1': 'Added descriptive alt text to all images, providing context for screen reader users.',
      '1.3.1': 'Added proper form labels and semantic HTML to establish clear relationships between elements.',
      '1.4.3': 'Adjusted color contrast to meet 4.5:1 ratio for normal text and 3:1 for large text.',
      '1.4.11': 'Improved contrast for UI components and graphical objects to meet 3:1 ratio.',
      '2.1.1': 'Converted clickable divs to proper button elements, enabling full keyboard navigation.',
      '2.4.1': 'Added skip navigation link to bypass repetitive content.',
      '2.4.2': 'Added descriptive page title that clearly identifies the page purpose.',
      '2.4.3': 'Corrected tab order to follow logical content flow.',
      '2.4.4': 'Made link text descriptive and meaningful out of context.',
      '2.4.6': 'Added clear, descriptive headings and form labels.',
      '2.4.7': 'Added visible focus indicators with sufficient contrast.',
      '2.5.5': 'Increased touch target size to minimum 44x44 pixels for mobile accessibility.',
      '3.1.1': 'Added lang attribute to html element specifying page language.',
      '3.2.1': 'Ensured no context changes occur on focus.',
      '3.2.2': 'Prevented automatic context changes on input.',
      '3.3.1': 'Added clear error messages that identify and describe input errors.',
      '3.3.2': 'Added visible labels and instructions for all form inputs.',
      '4.1.1': 'Fixed HTML parsing errors and ensured valid markup.',
      '4.1.2': 'Added proper ARIA roles, names, and states to custom components.',
    };

    return fixes[wcagCriteria] || 'Applied appropriate accessibility fixes to resolve this violation.';
  }

  /**
   * Escape HTML for safe rendering
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

export const demoGeneratorService = new DemoGeneratorService();
