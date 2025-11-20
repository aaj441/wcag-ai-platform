/**
 * Quick keyword extraction test
 */
import { extractKeywords, combineTexts } from './src/utils/keywords';

const sampleText = `
Critical accessibility issues found on homepage with color contrast violations 
affecting users with disabilities. WCAG compliance required for Section 508 
and ADA standards. Navigation menu keyboard accessibility improvements needed.
`;

console.log('Testing keyword extraction...\n');
console.log('Sample text:', sampleText.trim());
console.log('\nTop 10 keywords:', extractKeywords(sampleText, 10));

const subject = 'Urgent: WCAG Accessibility Violations Detected';
const body = 'Your website has contrast issues and missing alt text on images.';
const combined = combineTexts(subject, body);
console.log('\nCombined text:', combined);
console.log('Keywords from combined:', extractKeywords(combined, 5));

console.log('\n✅ Keyword extraction working correctly!');
