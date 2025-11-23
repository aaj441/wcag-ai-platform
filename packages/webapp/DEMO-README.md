# WCAG Compliance Demo - Sales Pitch Guide

## Quick Start

1. **Open the demo**: Open `compliance-demo.html` in your browser
2. **Capture "BEFORE" screenshot**: The page loads showing violations highlighted in red
3. **Click "Show Fixed Version"**: Toggle to the compliant version
4. **Capture "AFTER" screenshot**: Get your comparison shot

## What It Shows

### Before State (With Violations)
- **7 violations** highlighted with red borders and warning labels
- Violation counter shows "7 Violations Found"
- Red indicator badge at top

### After State (Fixed & Compliant)
- Same page, all violations fixed
- Green indicator badge showing "Fixed & Compliant"
- Clean, professional appearance

## Violations Demonstrated

1. **Low Contrast Text** (WCAG 1.4.3)
   - Purple text on purple background
   - Fixed to white on purple (proper contrast)

2. **Non-Keyboard Accessible Button** (WCAG 2.1.1)
   - Clickable `<div>` that doesn't work with keyboard
   - Fixed to proper `<button>` element with focus indicator

3. **Missing Alt Text** (WCAG 1.1.1) - 3 instances
   - Feature icons without descriptions
   - Fixed with proper `role` and `aria-label`

4. **Missing Form Labels** (WCAG 3.3.2) - 2 instances
   - Name and email inputs without labels
   - Fixed with visible, properly associated labels

5. **Touch Target Too Small** (WCAG 2.5.5)
   - Submit button only 6px padding (hard to tap on mobile)
   - Fixed to 44x44px minimum touch target

## Sales Pitch Talking Points

### The Hook
"Let me show you what we found on a typical business website..."

### The Problem (BEFORE Screenshot)
- "These red markers show 7 compliance violations we detected"
- "Each one is a potential lawsuit under the ADA"
- "Your competitors' sites probably look like this too"

### The Solution (AFTER Screenshot)
- "Here's the same page after our fixes"
- "All violations resolved, fully WCAG 2.1 AA compliant"
- "We can do this for your site in days, not months"

### The Value
- "Each violation could cost $5,000-$20,000 in legal fees"
- "We fix all of these issues for a fraction of that cost"
- "Plus, you'll reach 15% more customers (people with disabilities)"

## Customization

To make this more relevant to your prospect:

1. **Add their branding**: Change colors in the CSS to match their site
2. **Use their content**: Replace placeholder text with their actual copy
3. **Show their violations**: If you scan their site first, highlight their specific issues

## Integration with Workflow

This demo should be the **final deliverable** of your scanning workflow:

1. ✅ Scan client's website
2. ✅ Identify violations
3. ✅ Generate AI-powered fixes
4. ✅ **Generate before/after demo** ← This step
5. ✅ Send to client or consultant for approval

## Tips for Screenshots

- **Full page screenshots**: Use browser extensions like "Full Page Screen Capture"
- **Side-by-side comparison**: Take both screenshots and put them side-by-side in PowerPoint/Google Slides
- **Annotate**: Add arrows or circles to highlight specific fixes
- **Mobile view**: Toggle browser to mobile view to show responsive fixes

## Next Steps

Want to automate this? We can:
- Automatically generate these demos from scan results
- Inject actual violations from real scans
- Customize colors/branding per client
- Host demos with unique URLs for each prospect
