import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { prisma } from '@/utils/database';
import { logger } from '@/utils/logger';
import { NotFoundError } from '@/middleware/errorHandler';

interface ReportData {
  id: string;
  name: string;
  description?: string;
  format: 'PDF' | 'HTML' | 'CSV' | 'JSON';
  scan: {
    id: string;
    url: string;
    title?: string;
    description?: string;
    score: number;
    totalIssues: number;
    criticalIssues: number;
    seriousIssues: number;
    moderateIssues: number;
    minorIssues: number;
    completedAt: Date;
    project?: {
      id: string;
      name: string;
    };
    user: {
      id: string;
      email: string;
      username: string;
      firstName?: string;
      lastName?: string;
    };
    issues: Array<{
      id: string;
      type: string;
      severity: string;
      rule: string;
      message: string;
      impact?: string;
      help?: string;
      helpUrl?: string;
      selector?: string;
      xpath?: string;
      wcagLevel?: string;
      wcagSection?: string;
      createdAt: Date;
    }>;
  };
}

export async function generateReport(reportId: string, template?: string): Promise<{ fileUrl: string; fileSize: number }> {
  // Get report with scan data
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
      scan: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          issues: {
            orderBy: [
              { severity: 'desc' },
              { createdAt: 'desc' },
            ],
          },
        },
      },
    },
  });

  if (!report) {
    throw new NotFoundError('Report');
  }

  if (report.status !== 'PENDING') {
    throw new Error('Report is not in pending state');
  }

  if (!report.scan || report.scan.status !== 'COMPLETED') {
    throw new Error('Cannot generate report for incomplete scan');
  }

  // Update report status to processing
  await prisma.report.update({
    where: { id: reportId },
    data: { status: 'PROCESSING' },
  });

  try {
    let fileUrl: string;
    let fileSize: number;

    // Generate report based on format
    switch (report.format) {
      case 'PDF':
        const pdfBuffer = await generatePDFReport(report as ReportData, template);
        fileUrl = await saveReportFile(reportId, pdfBuffer, 'pdf');
        fileSize = pdfBuffer.length;
        break;
      
      case 'HTML':
        const htmlContent = await generateHTMLReport(report as ReportData, template);
        const htmlBuffer = Buffer.from(htmlContent, 'utf-8');
        fileUrl = await saveReportFile(reportId, htmlBuffer, 'html');
        fileSize = htmlBuffer.length;
        break;
      
      case 'CSV':
        const csvContent = await generateCSVReport(report as ReportData);
        const csvBuffer = Buffer.from(csvContent, 'utf-8');
        fileUrl = await saveReportFile(reportId, csvBuffer, 'csv');
        fileSize = csvBuffer.length;
        break;
      
      case 'JSON':
        const jsonContent = await generateJSONReport(report as ReportData);
        const jsonBuffer = Buffer.from(JSON.stringify(jsonContent, null, 2), 'utf-8');
        fileUrl = await saveReportFile(reportId, jsonBuffer, 'json');
        fileSize = jsonBuffer.length;
        break;
      
      default:
        throw new Error(`Unsupported report format: ${report.format}`);
    }

    // Update report with file info
    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'COMPLETED',
        fileUrl,
        fileSize,
      },
    });

    logger.info(`Report generated successfully: ${reportId} (${report.format})`);

    return { fileUrl, fileSize };

  } catch (error) {
    logger.error(`Failed to generate report ${reportId}:`, error);

    // Update report status to failed
    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'FAILED' },
    });

    throw error;
  }
}

async function generatePDFReport(reportData: ReportData, template?: string): Promise<Buffer> {
  // Create PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
  
  // Load fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Set up page
  const { width, height } = page.getSize();
  const margin = 50;
  let yPosition = height - margin;
  
  // Helper function to add text with word wrapping
  const addText = (text: string, fontSize: number, x: number, y: number, maxWidth: number, fontType: any = font) => {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const testWidth = fontType.widthOfTextAtSize(testLine, fontSize);
      
      if (testWidth > maxWidth && line) {
        page.drawText(line, { x, y: currentY, size: fontSize, font: fontType });
        line = word;
        currentY -= fontSize * 1.5;
      } else {
        line = testLine;
      }
    }
    
    if (line) {
      page.drawText(line, { x, y: currentY, size: fontSize, font: fontType });
    }
    
    return currentY;
  };
  
  // Title
  yPosition = addText(reportData.name, 24, margin, yPosition, width - 2 * margin, boldFont);
  yPosition -= 30;
  
  // Report info
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  addText(`Generated on: ${reportDate}`, 12, margin, yPosition, width - 2 * margin);
  yPosition -= 20;
  
  addText(`Website: ${reportData.scan.url}`, 12, margin, yPosition, width - 2 * margin);
  yPosition -= 20;
  
  if (reportData.scan.title) {
    addText(`Page Title: ${reportData.scan.title}`, 12, margin, yPosition, width - 2 * margin);
    yPosition -= 20;
  }
  
  addText(`Scan Date: ${new Date(reportData.scan.completedAt).toLocaleDateString()}`, 12, margin, yPosition, width - 2 * margin);
  yPosition -= 40;
  
  // Summary section
  addText('Accessibility Summary', 18, margin, yPosition, width - 2 * margin, boldFont);
  yPosition -= 25;
  
  const score = reportData.scan.score.toFixed(1);
  addText(`Overall Accessibility Score: ${score}%`, 14, margin, yPosition, width - 2 * margin);
  yPosition -= 20;
  
  addText(`Total Issues Found: ${reportData.scan.totalIssues}`, 14, margin, yPosition, width - 2 * margin);
  yPosition -= 20;
  
  addText(`Critical Issues: ${reportData.scan.criticalIssues}`, 14, margin, yPosition, width - 2 * margin, font);
  yPosition -= 20;
  
  addText(`Serious Issues: ${reportData.scan.seriousIssues}`, 14, margin, yPosition, width - 2 * margin, font);
  yPosition -= 20;
  
  addText(`Moderate Issues: ${reportData.scan.moderateIssues}`, 14, margin, yPosition, width - 2 * margin, font);
  yPosition -= 20;
  
  addText(`Minor Issues: ${reportData.scan.minorIssues}`, 14, margin, yPosition, width - 2 * margin, font);
  yPosition -= 40;
  
  // Issues section
  if (reportData.scan.issues.length > 0) {
    // Check if we need a new page
    if (yPosition < 200) {
      page.drawText('Issues Found', { x: margin, y: yPosition, size: 18, font: boldFont });
      yPosition -= 25;
    } else {
      yPosition = height - margin;
      page.drawText('Issues Found', { x: margin, y: yPosition, size: 18, font: boldFont });
      yPosition -= 25;
    }
    
    // Group issues by severity
    const issuesBySeverity = reportData.scan.issues.reduce((acc, issue) => {
      if (!acc[issue.severity]) {
        acc[issue.severity] = [];
      }
      acc[issue.severity].push(issue);
      return acc;
    }, {} as Record<string, typeof reportData.scan.issues>);
    
    for (const severity of ['CRITICAL', 'SERIOUS', 'MODERATE', 'MINOR']) {
      const issues = issuesBySeverity[severity];
      if (issues && issues.length > 0) {
        addText(`${severity} Issues (${issues.length})`, 16, margin, yPosition, width - 2 * margin, boldFont);
        yPosition -= 20;
        
        for (const issue of issues.slice(0, 10)) { // Limit to first 10 issues of each severity
          if (yPosition < 100) {
            // Add new page
            const newPage = pdfDoc.addPage([595.28, 841.89]);
            yPosition = newPage.getSize().height - margin;
          }
          
          addText(`• ${issue.rule}: ${issue.message}`, 12, margin + 10, yPosition, width - 2 * margin - 10, font);
          yPosition -= 15;
          
          if (issue.selector) {
            addText(`  Selector: ${issue.selector}`, 10, margin + 20, yPosition, width - 2 * margin - 20, font);
            yPosition -= 12;
          }
          
          if (issue.wcagSection) {
            addText(`  WCAG: ${issue.wcagSection}`, 10, margin + 20, yPosition, width - 2 * margin - 20, font);
            yPosition -= 12;
          }
          
          yPosition -= 8;
        }
        
        if (issues.length > 10) {
          addText(`... and ${issues.length - 10} more ${severity} issues`, 12, margin + 10, yPosition, width - 2 * margin - 10, font);
          yPosition -= 20;
        }
        
        yPosition -= 10;
      }
    }
  } else {
    addText('No accessibility issues found!', 14, margin, yPosition, width - 2 * margin, font);
  }
  
  // Footer
  const footerY = 30;
  page.drawText(`Generated by WCAG AI Platform - Page 1`, {
    x: margin,
    y: footerY,
    size: 10,
    font,
  });
  
  // Serialize PDF
  return await pdfDoc.save();
}

async function generateHTMLReport(reportData: ReportData, template?: string): Promise<string> {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${reportData.name} - Accessibility Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            color: #34495e;
            margin-top: 30px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .summary-card {
            background: #ecf0f1;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .score {
            font-size: 48px;
            font-weight: bold;
            margin: 10px 0;
        }
        .score.excellent { color: #27ae60; }
        .score.good { color: #f39c12; }
        .score.poor { color: #e74c3c; }
        .issue {
            border-left: 4px solid #e74c3c;
            padding: 15px;
            margin: 10px 0;
            background: #fdf2f2;
        }
        .issue.critical { border-left-color: #e74c3c; }
        .issue.serious { border-left-color: #f39c12; }
        .issue.moderate { border-left-color: #f39c12; }
        .issue.minor { border-left-color: #95a5a6; }
        .issue-title {
            font-weight: bold;
            color: #2c3e50;
        }
        .issue-details {
            margin-top: 10px;
            font-size: 14px;
            color: #7f8c8d;
        }
        .severity-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            margin-left: 10px;
        }
        .severity-critical { background: #e74c3c; color: white; }
        .severity-serious { background: #f39c12; color: white; }
        .severity-moderate { background: #f39c12; color: white; }
        .severity-minor { background: #95a5a6; color: white; }
        .metadata {
            background: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .metadata dt {
            font-weight: bold;
            color: #2c3e50;
        }
        .metadata dd {
            margin-left: 20px;
            color: #7f8c8d;
        }
        @media print {
            body { background: white; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${reportData.name}</h1>
        
        <div class="metadata">
            <dl>
                <dt>Generated on</dt>
                <dd>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</dd>
                
                <dt>Website</dt>
                <dd><a href="${reportData.scan.url}" target="_blank">${reportData.scan.url}</a></dd>
                
                ${reportData.scan.title ? `<dt>Page Title</dt><dd>${reportData.scan.title}</dd>` : ''}
                
                <dt>Scan Date</dt>
                <dd>${new Date(reportData.scan.completedAt).toLocaleDateString()}</dd>
                
                <dt>Generated by</dt>
                <dd>${reportData.scan.user.firstName || reportData.scan.user.username} (${reportData.scan.user.email})</dd>
                
                ${reportData.scan.project ? `<dt>Project</dt><dd>${reportData.scan.project.name}</dd>` : ''}
            </dl>
        </div>
        
        <h2>Accessibility Summary</h2>
        <div class="summary">
            <div class="summary-card">
                <div>Overall Score</div>
                <div class="score ${getScoreClass(reportData.scan.score)}">${reportData.scan.score.toFixed(1)}%</div>
            </div>
            <div class="summary-card">
                <div>Total Issues</div>
                <div class="score">${reportData.scan.totalIssues}</div>
            </div>
            <div class="summary-card">
                <div>Critical Issues</div>
                <div class="score" style="color: #e74c3c;">${reportData.scan.criticalIssues}</div>
            </div>
            <div class="summary-card">
                <div>Serious Issues</div>
                <div class="score" style="color: #f39c12;">${reportData.scan.seriousIssues}</div>
            </div>
        </div>
        
        ${reportData.scan.issues.length > 0 ? `
        <h2>Issues Found</h2>
        ${generateIssuesHTML(reportData.scan.issues)}
        ` : '<h2>🎉 No accessibility issues found!</h2>'}
        
        <footer style="margin-top: 50px; text-align: center; color: #7f8c8d; font-size: 12px;">
            <p>Generated by WCAG AI Platform</p>
            <p>Report ID: ${reportData.id}</p>
        </footer>
    </div>
</body>
</html>`;

  return html;
}

function generateIssuesHTML(issues: ReportData['scan']['issues']): string {
  // Group issues by severity
  const issuesBySeverity = issues.reduce((acc, issue) => {
    if (!acc[issue.severity]) {
      acc[issue.severity] = [];
    }
    acc[issue.severity].push(issue);
    return acc;
  }, {} as Record<string, ReportData['scan']['issues']>);

  let html = '';
  
  for (const severity of ['CRITICAL', 'SERIOUS', 'MODERATE', 'MINOR']) {
    const severityIssues = issuesBySeverity[severity];
    if (severityIssues && severityIssues.length > 0) {
      html += `<h3>${severity} Issues (${severityIssues.length})</h3>`;
      
      for (const issue of severityIssues) {
        html += `
        <div class="issue ${severity.toLowerCase()}">
            <div class="issue-title">
                ${issue.rule}: ${issue.message}
                <span class="severity-badge severity-${severity.toLowerCase()}">${severity}</span>
            </div>
            <div class="issue-details">
                ${issue.impact ? `<strong>Impact:</strong> ${issue.impact}<br>` : ''}
                ${issue.selector ? `<strong>Selector:</strong> <code>${issue.selector}</code><br>` : ''}
                ${issue.wcagSection ? `<strong>WCAG:</strong> ${issue.wcagSection}<br>` : ''}
                ${issue.wcagLevel ? `<strong>Level:</strong> ${issue.wcagLevel}<br>` : ''}
                ${issue.helpUrl ? `<strong>Learn more:</strong> <a href="${issue.helpUrl}" target="_blank">${issue.help}</a>` : ''}
            </div>
        </div>`;
      }
    }
  }
  
  return html;
}

async function generateCSVReport(reportData: ReportData): Promise<string> {
  const headers = [
    'ID',
    'Severity',
    'Type',
    'Rule',
    'Message',
    'Impact',
    'Selector',
    'WCAG Level',
    'WCAG Section',
    'Created At',
  ];

  const rows = reportData.scan.issues.map(issue => [
    issue.id,
    issue.severity,
    issue.type,
    issue.rule,
    `"${issue.message.replace(/"/g, '""')}"`,
    issue.impact || '',
    `"${issue.selector || ''}"`,
    issue.wcagLevel || '',
    issue.wcagSection || '',
    new Date(issue.createdAt).toISOString(),
  ]);

  const csvContent = [
    `# ${reportData.name}`,
    `# Website: ${reportData.scan.url}`,
    `# Generated: ${new Date().toISOString()}`,
    `# Score: ${reportData.scan.score}%`,
    `# Total Issues: ${reportData.scan.totalIssues}`,
    '',
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  return csvContent;
}

async function generateJSONReport(reportData: ReportData): Promise<any> {
  return {
    metadata: {
      report: {
        id: reportData.id,
        name: reportData.name,
        description: reportData.description,
        format: reportData.format,
        generatedAt: new Date().toISOString(),
      },
      scan: {
        id: reportData.scan.id,
        url: reportData.scan.url,
        title: reportData.scan.title,
        description: reportData.scan.description,
        score: reportData.scan.score,
        completedAt: reportData.scan.completedAt,
      },
      user: {
        id: reportData.scan.user.id,
        email: reportData.scan.user.email,
        username: reportData.scan.user.username,
        firstName: reportData.scan.user.firstName,
        lastName: reportData.scan.user.lastName,
      },
      project: reportData.scan.project,
    },
    summary: {
      score: reportData.scan.score,
      totalIssues: reportData.scan.totalIssues,
      criticalIssues: reportData.scan.criticalIssues,
      seriousIssues: reportData.scan.seriousIssues,
      moderateIssues: reportData.scan.moderateIssues,
      minorIssues: reportData.scan.minorIssues,
    },
    issues: reportData.scan.issues,
    statistics: {
      issuesBySeverity: {
        critical: reportData.scan.criticalIssues,
        serious: reportData.scan.seriousIssues,
        moderate: reportData.scan.moderateIssues,
        minor: reportData.scan.minorIssues,
      },
      issuesByType: reportData.scan.issues.reduce((acc, issue) => {
        acc[issue.type] = (acc[issue.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      topRules: reportData.scan.issues
        .reduce((acc, issue) => {
          const existing = acc.find(item => item.rule === issue.rule);
          if (existing) {
            existing.count++;
          } else {
            acc.push({ rule: issue.rule, message: issue.message, count: 1 });
          }
          return acc;
        }, [] as Array<{ rule: string; message: string; count: number }>)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    },
  };
}

async function saveReportFile(reportId: string, buffer: Buffer, extension: string): Promise<string> {
  // In a real implementation, you would save this to a file storage service like S3, Google Cloud Storage, etc.
  // For now, we'll simulate the file URL
  
  const filename = `report-${reportId}.${extension}`;
  const fileUrl = `https://storage.example.com/reports/${filename}`;
  
  // Log the file creation
  logger.info(`Report file saved: ${filename} (${buffer.length} bytes)`);
  
  return fileUrl;
}

function getScoreClass(score: number): string {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  return 'poor';
}

// Queue processing function
export async function processReportQueue(): Promise<void> {
  const { getNextJob, addToQueue } = await import('@/utils/redis');
  
  while (true) {
    try {
      const job = await getNextJob('reports');
      
      if (job && job.data && job.data.reportId) {
        logger.info(`Processing report job: ${job.id} for report: ${job.data.reportId}`);
        
        try {
          await generateReport(job.data.reportId, job.data.template);
        } catch (error) {
          logger.error(`Failed to process report job ${job.id}:`, error);
          
          // Optionally retry failed jobs
          if (job.retryCount < 3) {
            job.retryCount = (job.retryCount || 0) + 1;
            await addToQueue('reports', job, 1);
            logger.info(`Retrying report job: ${job.id} (attempt ${job.retryCount})`);
          }
        }
      } else {
        // No jobs available, wait before checking again
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      logger.error('Error processing report queue:', error);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

// Start queue processor
if (process.env.NODE_ENV !== 'test') {
  processReportQueue().catch(error => {
    logger.error('Failed to start report queue processor:', error);
  });
}

export { ReportData };