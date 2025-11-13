// Quick keyword extraction test
import { extractKeywords } from './src/utils/keywords';

// Test keyword extraction
const testText = "accessibility violation color contrast critical button WCAG AA compliance high priority screen reader users";
const keywords = extractKeywords(testText, 5);

console.log('Input:', testText);
console.log('Keywords:', keywords);

// Test empty input
console.log('Empty input keywords:', extractKeywords('', 5));