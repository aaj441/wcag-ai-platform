#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function updateEvidenceVault() {
  console.log('\n📂 Updating Evidence Vault...\n');
  
  const vaultPath = path.join(__dirname, '../evidence-vault');
  const scansPath = path.join(vaultPath, 'scans');
  const attestationsPath = path.join(vaultPath, 'attestations');
  const reportsPath = path.join(vaultPath, 'reports');
  
  // Create vault structure
  fs.mkdirSync(scansPath, { recursive: true });
  fs.mkdirSync(attestationsPath, { recursive: true });
  fs.mkdirSync(reportsPath, { recursive: true });
  
  console.log('✅ Created directory structure:');
  console.log(`   - ${scansPath}`);
  console.log(`   - ${attestationsPath}`);
  console.log(`   - ${reportsPath}\n`);
  
  // Get all scan files
  let scanFiles = [];
  if (fs.existsSync(scansPath)) {
    scanFiles = fs.readdirSync(scansPath).filter(f => f.endsWith('.json'));
  }
  
  // Generate index
  const index = {
    lastUpdated: new Date().toISOString(),
    totalScans: scanFiles.length,
    scans: scanFiles.map(f => {
      const filePath = path.join(scansPath, f);
      const stats = fs.statSync(filePath);
      const timestampMatch = f.match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
      
      return {
        file: f,
        timestamp: timestampMatch ? timestampMatch[0].replace(/-/g, ':') : null,
        size: stats.size,
        created: stats.birthtime
      };
    }).sort((a, b) => new Date(b.created) - new Date(a.created))
  };
  
  // Write index
  const indexPath = path.join(vaultPath, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  
  console.log('📊 Evidence Vault Index:');
  console.log(`   Total Scans: ${index.totalScans}`);
  console.log(`   Last Updated: ${index.lastUpdated}`);
  console.log(`   Index File: ${indexPath}\n`);
  
  // Create README for the vault
  const readmePath = path.join(vaultPath, 'README.md');
  const readmeContent = `# Evidence Vault

This directory stores accessibility scan results and compliance evidence.

## Structure

- \`scans/\` - Automated accessibility scan results (axe-core, pa11y)
- \`attestations/\` - Compliance attestations and certifications
- \`reports/\` - Generated VPAT and compliance reports

## Retention Policy

- Scan results are retained for 90 days
- Reports are retained indefinitely
- Attestations are retained per compliance requirements

## Latest Scan Summary

- **Total Scans**: ${index.totalScans}
- **Last Updated**: ${index.lastUpdated}

## Recent Scans

${index.scans.slice(0, 5).map(scan => `- ${scan.file} (${new Date(scan.created).toLocaleString()})`).join('\n')}

For the complete index, see \`index.json\`.
`;
  
  fs.writeFileSync(readmePath, readmeContent);
  
  console.log('✅ Evidence Vault updated successfully');
  console.log(`📄 View index at: ${indexPath}\n`);
}

try {
  updateEvidenceVault();
} catch (error) {
  console.error('❌ Error updating evidence vault:', error.message);
  process.exit(1);
}
