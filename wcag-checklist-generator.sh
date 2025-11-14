#!/bin/bash

# wcag-checklist-generator.sh
# Generate dynamic WCAG 2.1 checklists for each audit tier (A, AA, AAA)
# Usage: ./wcag-checklist-generator.sh

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}WCAG 2.1 Checklist Generator${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Ask for audit tier
echo "Select WCAG Conformance Level:"
echo "1) A (Basic)"
echo "2) AA (Standard, recommended)"
echo "3) AAA (Enhanced)"
read -p "Enter choice (1/2/3): " LEVEL_CHOICE

case $LEVEL_CHOICE in
  1) LEVEL="A"; LEVEL_NUM="1" ;;
  2) LEVEL="AA"; LEVEL_NUM="2" ;;
  3) LEVEL="AAA"; LEVEL_NUM="3" ;;
  *) echo "Invalid choice"; exit 1 ;;
esac

# Ask for output location
read -p "Enter project folder (e.g., projects/company_name_123456): " PROJECT_FOLDER

if [ ! -d "$PROJECT_FOLDER" ]; then
  echo "Project folder not found: $PROJECT_FOLDER"
  exit 1
fi

TIMESTAMP=$(date "+%Y-%m-%d")
CHECKLIST_FILE="$PROJECT_FOLDER/audit_logs/WCAG_${LEVEL}_CHECKLIST_${TIMESTAMP}.md"

# Generate WCAG Level A Criteria
generate_level_a() {
  cat > "$CHECKLIST_FILE" <<'EOF'
# WCAG 2.1 Level A Checklist

## Perceivable

### 1.1 Text Alternatives

#### 1.1.1 Non-text Content (Level A)
- [ ] All images have alt text
- [ ] Decorative images have empty alt="" or role="presentation"
- [ ] Text in images is duplicated in alt text or surrounding content
- [ ] Form buttons have accessible labels
- [ ] Icons used as buttons have alt text or aria-label
- [ ] Canvas elements have fallback text
- [ ] SVG images have title and desc elements or aria-label
- **Testing**: Disable images, verify meaning is still clear
- **Notes**: _______________________________________________________________

### 1.2 Time-based Media

#### 1.2.1 Audio-only and Video-only (Pre-recorded) (Level A)
- [ ] Pre-recorded audio-only content has transcript
- [ ] Pre-recorded video-only content has transcript or audio description
- [ ] Media player is keyboard accessible
- **Testing**: Hide video, verify audio transcript is available
- **Notes**: _______________________________________________________________

#### 1.2.2 Captions (Pre-recorded) (Level A)
- [ ] All videos have captions
- [ ] Captions are synchronized with audio
- [ ] Captions include speaker identification
- [ ] Captions identify sound effects and music
- **Testing**: Mute volume, verify captions convey all information
- **Notes**: _______________________________________________________________

#### 1.2.3 Audio Description or Media Alternative (Pre-recorded) (Level A)
- [ ] Videos have audio description or full transcript
- [ ] Audio description covers important visual details
- [ ] Transcript is available alongside video
- **Testing**: Listen without watching, verify understanding
- **Notes**: _______________________________________________________________

### 1.3 Adaptable

#### 1.3.1 Info and Relationships (Level A)
- [ ] Headings use proper HTML heading tags (h1, h2, h3, etc.)
- [ ] Form labels are associated with inputs (label > for attribute)
- [ ] List items use proper list markup (ul, ol, li)
- [ ] Related content is semantically grouped
- [ ] Emphasis uses em/strong, not just color or styling
- [ ] Data tables have header rows (th) and caption
- **Testing**: Inspect HTML, verify semantic structure
- **Notes**: _______________________________________________________________

#### 1.3.2 Meaningful Sequence (Level A)
- [ ] Content reading order is logical (Tab key follows expected path)
- [ ] Focus order matches visual order
- [ ] Instructions don't rely on shape, size, or location alone
- [ ] Reflow content is readable on narrow screens
- **Testing**: Keyboard navigation, zoom to 200%, verify order
- **Notes**: _______________________________________________________________

#### 1.3.3 Sensory Characteristics (Level A)
- [ ] Instructions don't rely on color alone (e.g., "click the red button")
- [ ] Instructions don't rely on shape alone (e.g., "click the circle")
- [ ] Instructions don't rely on size alone
- [ ] Instructions don't rely on visual location alone
- [ ] Text conveyed through color is also described in text
- **Testing**: Convert to grayscale, verify meaning is preserved
- **Notes**: _______________________________________________________________

### 1.4 Distinguishable

#### 1.4.1 Use of Color (Level A)
- [ ] Color is not the only means of distinguishing information
- [ ] Links are distinguishable from surrounding text (not just color)
- [ ] Required form fields have visual indicators beyond color
- [ ] Errors are identified with text, not just color
- **Testing**: Run grayscale filter, verify all information is clear
- **Notes**: _______________________________________________________________

#### 1.4.2 Audio Control (Level A)
- [ ] No audio auto-plays
- [ ] If audio plays automatically, there's a pause button on page
- [ ] Background music can be turned off
- [ ] Audio volume is adjustable
- **Testing**: Visit page, listen for auto-play
- **Notes**: _______________________________________________________________

## Operable

### 2.1 Keyboard Accessible

#### 2.1.1 Keyboard (Level A)
- [ ] All functionality is available via keyboard
- [ ] No keyboard trap (can exit any element with Escape or Tab)
- [ ] Focus is visible when using Tab key
- [ ] Links can be activated with Enter key
- [ ] Buttons can be activated with Space and Enter keys
- [ ] Form fields can be filled via keyboard
- [ ] Dropdowns can be opened/closed with keyboard
- [ ] All interactions work without mouse
- **Testing**: Use Tab key to navigate entire page, verify all functions work
- **Notes**: _______________________________________________________________

#### 2.1.2 No Keyboard Trap (Level A)
- [ ] Tab key can move away from every element
- [ ] If focus is trapped, there's clear escape instructions
- [ ] Modal dialogs have proper focus management
- **Testing**: Tab through page, verify you can escape every element
- **Notes**: _______________________________________________________________

#### 2.1.3 Keyboard (No Exception) (Level AAA)
*Not required for Level A*

### 2.2 Enough Time

#### 2.2.1 Timing Adjustable (Level A)
- [ ] No content has time limits
- [ ] If time limits exist, user can extend them
- [ ] If time limits exist, user receives warning before session expires
- [ ] Server-side session timeouts can be extended
- [ ] Forms don't auto-submit or reset
- **Testing**: Perform task slowly, verify no time-based ejection
- **Notes**: _______________________________________________________________

#### 2.2.2 Pause, Stop, Hide (Level A)
- [ ] Animations can be paused/stopped
- [ ] Auto-scrolling content can be paused
- [ ] Auto-updating content can be paused
- [ ] Carousels have play/pause controls
- [ ] Blinking content stops after 5 seconds or can be disabled
- **Testing**: Locate animated elements, verify pause control exists
- **Notes**: _______________________________________________________________

### 2.3 Seizures and Physical Reactions

#### 2.3.1 Three Flashes or Below Threshold (Level A)
- [ ] No content flashes more than 3 times per second
- [ ] Flashing areas are small (<25% of screen)
- [ ] No red flashing (highest seizure risk)
- **Testing**: Visual inspection, no strobing or rapid color changes
- **Notes**: _______________________________________________________________

### 2.4 Navigable

#### 2.4.1 Bypass Blocks (Level A)
- [ ] "Skip to main content" link exists and is visible on focus
- [ ] Skip link works correctly
- [ ] Navigation menu is after content or skippable
- [ ] Large blocks of repeated content are skippable
- **Testing**: Tab through page, verify skip link appears
- **Notes**: _______________________________________________________________

#### 2.4.2 Page Titled (Level A)
- [ ] Page has a unique, descriptive title
- [ ] Title is in <title> tag (visible in browser tab)
- [ ] Title reflects page purpose
- [ ] Title identifies the site name if applicable
- **Testing**: Check browser tab title, verify it describes page
- **Notes**: _______________________________________________________________

#### 2.4.3 Focus Order (Level A)
- [ ] Tab order follows logical flow (top to bottom, left to right)
- [ ] Focus is always visible when tabbing
- [ ] Focus indicator is at least 2px thick
- [ ] Focus indicator has sufficient color contrast (3:1)
- [ ] Focus order is independent of visual layout
- **Testing**: Press Tab repeatedly, verify focus flows logically
- **Notes**: _______________________________________________________________

#### 2.4.4 Link Purpose (In Context) (Level A)
- [ ] Link text clearly describes its purpose
- [ ] "Click here" or "Read more" links have context (nearby text or aria-label)
- [ ] Multiple links to same destination have same link text
- [ ] Links are distinguishable from surrounding text
- **Testing**: Read link text in context, verify purpose is clear
- **Notes**: _______________________________________________________________

## Understandable

### 3.1 Readable

#### 3.1.1 Language of Page (Level A)
- [ ] Page has lang attribute (e.g., lang="en")
- [ ] Language is set to correct locale
- [ ] <html lang="en"> is present
- **Testing**: Inspect HTML head, verify lang attribute
- **Notes**: _______________________________________________________________

#### 3.1.2 Language of Parts (Level AA)
*Not required for Level A*

### 3.2 Predictable

#### 3.2.1 On Focus (Level A)
- [ ] Components don't change context just by receiving focus
- [ ] Focusing on a button doesn't submit the form
- [ ] Focusing on a field doesn't trigger validation
- [ ] Focusing on a link doesn't open a new window
- **Testing**: Tab through form, verify no unexpected page changes
- **Notes**: _______________________________________________________________

#### 3.2.2 On Input (Level A)
- [ ] Changing a field value doesn't cause unexpected context changes
- [ ] Selecting a radio button doesn't submit form automatically
- [ ] Changing a dropdown doesn't change page layout
- [ ] Required field indication is clear
- **Testing**: Change form fields, verify no unexpected behavior
- **Notes**: _______________________________________________________________

#### 3.2.3 Consistent Navigation (Level AA)
*Not required for Level A*

#### 3.2.4 Consistent Identification (Level AA)
*Not required for Level A*

### 3.3 Input Assistance

#### 3.3.1 Error Identification (Level A)
- [ ] Errors are identified in text (not just color or icon)
- [ ] Error messages are clear and actionable
- [ ] Error location is indicated to user
- [ ] Error description explains how to fix
- **Testing**: Submit form with errors, verify clear error messages
- **Notes**: _______________________________________________________________

#### 3.3.2 Labels or Instructions (Level A)
- [ ] Form fields have visible labels
- [ ] Labels are associated with form controls (label > for)
- [ ] Instructions are provided for complex forms
- [ ] Required fields are marked
- [ ] Input format is specified (e.g., "MM/DD/YYYY")
- **Testing**: Tab through form, verify each field has label
- **Notes**: _______________________________________________________________

#### 3.3.3 Error Suggestion (Level AA)
*Not required for Level A*

#### 3.3.4 Error Prevention (Legal, Financial, Data) (Level AA)
*Not required for Level A*

## Robust

### 4.1 Compatible

#### 4.1.1 Parsing (Level A)
- [ ] HTML is valid (no duplicate IDs)
- [ ] Opening and closing tags match
- [ ] ARIA attributes are used correctly
- [ ] No invalid nesting of elements
- **Testing**: Run W3C HTML validator
- **Notes**: _______________________________________________________________

#### 4.1.2 Name, Role, Value (Level A)
- [ ] Custom components have accessible names (aria-label, title, or text)
- [ ] All form inputs have programmatic labels
- [ ] Role of elements is clear to assistive tech
- [ ] State changes are announced (aria-pressed, aria-expanded, etc.)
- [ ] Disabled state is indicated
- **Testing**: Use accessibility inspector, verify name/role/value for all elements
- **Notes**: _______________________________________________________________

#### 4.1.3 Status Messages (Level AA)
*Not required for Level A*

---

## SUMMARY

**Conformance Level: A**

- [ ] All Perceivable criteria met
- [ ] All Operable criteria met
- [ ] All Understandable criteria met
- [ ] All Robust criteria met

**Overall Result:** [PASS / FAIL]

**Issues Found:** _______
**Date Tested:** $TIMESTAMP
**Tested By:** _______________________

EOF
}

# Generate WCAG Level AA Criteria
generate_level_aa() {
  cat > "$CHECKLIST_FILE" <<'EOF'
# WCAG 2.1 Level AA Checklist

## Perceivable

### 1.1 Text Alternatives

#### 1.1.1 Non-text Content (Level A)
- [ ] All images have alt text
- [ ] Decorative images have empty alt="" or role="presentation"
- [ ] Text in images is duplicated in alt text
- [ ] Form buttons have accessible labels
- [ ] Icons used as buttons have alt text or aria-label
- **Testing**: Disable images, verify meaning is clear
- **Notes**: _______________________________________________________________

### 1.2 Time-based Media

#### 1.2.1 Audio-only and Video-only (Pre-recorded) (Level A)
- [ ] Pre-recorded audio-only content has transcript
- [ ] Pre-recorded video-only content has transcript or audio description
- **Notes**: _______________________________________________________________

#### 1.2.2 Captions (Pre-recorded) (Level A)
- [ ] All videos have accurate, synchronized captions
- [ ] Captions identify speaker and sound effects
- **Notes**: _______________________________________________________________

#### 1.2.3 Audio Description or Media Alternative (Pre-recorded) (Level A)
- [ ] Videos have audio description or full transcript
- **Notes**: _______________________________________________________________

#### 1.2.4 Captions (Live) (Level AA)
- [ ] Live audio content has real-time captions
- [ ] Captions are synchronized with audio
- [ ] Captions include speaker ID and sound effects
- **Testing**: Watch live video, verify captions
- **Notes**: _______________________________________________________________

#### 1.2.5 Audio Description (Pre-recorded) (Level AA)
- [ ] All pre-recorded videos have audio description
- [ ] Description covers important visual information
- [ ] Description is synchronized with video
- **Testing**: Listen to audio description track
- **Notes**: _______________________________________________________________

### 1.3 Adaptable

#### 1.3.1 Info and Relationships (Level A)
- [ ] Proper heading hierarchy (h1, h2, h3, etc.)
- [ ] Form labels properly associated with inputs
- [ ] Lists use semantic markup (ul, ol, li)
- [ ] Data tables use proper header markup
- **Notes**: _______________________________________________________________

#### 1.3.2 Meaningful Sequence (Level A)
- [ ] Content reading order is logical
- [ ] Focus order matches visual order
- [ ] Content reflows correctly
- **Notes**: _______________________________________________________________

#### 1.3.3 Sensory Characteristics (Level A)
- [ ] Instructions don't rely on color/shape/size/location alone
- **Notes**: _______________________________________________________________

#### 1.3.4 Orientation (Level AA)
- [ ] Content is not restricted to portrait or landscape
- [ ] Orientation lock is user-controllable
- [ ] Responsive design accommodates both orientations
- **Testing**: Rotate device, verify layout adapts
- **Notes**: _______________________________________________________________

#### 1.3.5 Identify Input Purpose (Level AA)
- [ ] Input fields have explicit purpose (autocomplete attributes)
- [ ] Form fields use semantic HTML or ARIA
- [ ] Email fields have type="email"
- [ ] Phone fields have type="tel"
- [ ] Password fields have type="password"
- **Testing**: Inspect input attributes, verify semantic types
- **Notes**: _______________________________________________________________

### 1.4 Distinguishable

#### 1.4.1 Use of Color (Level A)
- [ ] Color is not the only way to convey information
- [ ] Links are visually distinct from surrounding text
- **Notes**: _______________________________________________________________

#### 1.4.2 Audio Control (Level A)
- [ ] No audio auto-plays for more than 3 seconds
- [ ] Audio can be paused/stopped
- **Notes**: _______________________________________________________________

#### 1.4.3 Contrast (Minimum) (Level AA)
- [ ] Text has at least 4.5:1 contrast ratio (small text)
- [ ] Large text (18pt+) has at least 3:1 contrast ratio
- [ ] UI components have at least 3:1 contrast ratio
- [ ] Graphical elements have at least 3:1 contrast ratio
- **Testing**: Use WebAIM contrast checker on all text
- **Notes**: _______________________________________________________________

#### 1.4.4 Resize Text (Level AA)
- [ ] Text can be resized to 200% without loss of function
- [ ] Layout doesn't break at 200% zoom
- [ ] Horizontal scrolling not required at 200% zoom
- [ ] Content remains readable when text is enlarged
- **Testing**: Zoom to 200% in browser, verify readability
- **Notes**: _______________________________________________________________

#### 1.4.5 Images of Text (Level AA)
- [ ] Text is not conveyed as images (except logos/decorative)
- [ ] When images contain text, alt text includes the text
- **Notes**: _______________________________________________________________

## Operable

### 2.1 Keyboard Accessible

#### 2.1.1 Keyboard (Level A)
- [ ] All functionality is keyboard accessible
- [ ] No keyboard traps
- [ ] Focus is visible
- **Notes**: _______________________________________________________________

#### 2.1.2 No Keyboard Trap (Level A)
- [ ] Focus can move away from every element
- **Notes**: _______________________________________________________________

### 2.2 Enough Time

#### 2.2.1 Timing Adjustable (Level A)
- [ ] No time limits, or users can extend them
- **Notes**: _______________________________________________________________

#### 2.2.2 Pause, Stop, Hide (Level A)
- [ ] Animated content can be paused
- **Notes**: _______________________________________________________________

#### 2.2.3 No Timing (Level AAA)
*Not required for Level AA*

#### 2.2.4 Interruptions (Level AAA)
*Not required for Level AA*

#### 2.2.5 Re-authenticating (Level AAA)
*Not required for Level AA*

### 2.3 Seizures and Physical Reactions

#### 2.3.1 Three Flashes or Below Threshold (Level A)
- [ ] No content flashes more than 3 times per second
- [ ] No red flashing
- **Notes**: _______________________________________________________________

#### 2.3.2 Three Flashes (Level AAA)
*Not required for Level AA*

#### 2.3.3 Animation from Interactions (Level AAA)
*Not required for Level AA*

### 2.4 Navigable

#### 2.4.1 Bypass Blocks (Level A)
- [ ] "Skip to main content" link available
- [ ] Skip link is functional
- **Notes**: _______________________________________________________________

#### 2.4.2 Page Titled (Level A)
- [ ] Each page has descriptive title
- **Notes**: _______________________________________________________________

#### 2.4.3 Focus Order (Level A)
- [ ] Tab order follows logical sequence
- [ ] Focus is always visible
- [ ] Focus indicator has sufficient contrast
- **Notes**: _______________________________________________________________

#### 2.4.4 Link Purpose (In Context) (Level A)
- [ ] Link text clearly describes purpose
- [ ] Links to same destination have same text
- **Notes**: _______________________________________________________________

#### 2.4.5 Multiple Ways (Level AA)
- [ ] Multiple ways to find content exist:
  - [ ] Site map or site search
  - [ ] Navigation menu
  - [ ] Related links
  - [ ] Table of contents
- **Testing**: Verify multiple navigation methods available
- **Notes**: _______________________________________________________________

#### 2.4.6 Headings and Labels (Level AA)
- [ ] Headings and labels are clear and descriptive
- [ ] Form labels clearly identify input purpose
- [ ] Headings accurately reflect page structure
- **Testing**: Read headings independently, verify clarity
- **Notes**: _______________________________________________________________

#### 2.4.7 Focus Visible (Level AA)
- [ ] Focus indicator is always visible
- [ ] Focus indicator is at least 2px thick
- [ ] Focus indicator has sufficient contrast (3:1)
- [ ] Focus indicator is not completely hidden behind content
- **Testing**: Tab through page, verify visible focus on all elements
- **Notes**: _______________________________________________________________

## Understandable

### 3.1 Readable

#### 3.1.1 Language of Page (Level A)
- [ ] Page language is specified (lang attribute)
- **Notes**: _______________________________________________________________

#### 3.1.2 Language of Parts (Level AA)
- [ ] Language changes within page are marked (lang attribute)
- [ ] Foreign language text has lang attribute
- [ ] Abbreviations/acronyms are explained
- [ ] Words with multiple pronunciations are handled appropriately
- **Testing**: Check for lang attributes on non-English content
- **Notes**: _______________________________________________________________

#### 3.1.3 Unusual Words (Level AAA)
*Not required for Level AA*

#### 3.1.4 Abbreviations (Level AAA)
*Not required for Level AA*

#### 3.1.5 Reading Level (Level AAA)
*Not required for Level AA*

#### 3.1.6 Pronunciation (Level AAA)
*Not required for Level AA*

### 3.2 Predictable

#### 3.2.1 On Focus (Level A)
- [ ] No context changes on focus
- **Notes**: _______________________________________________________________

#### 3.2.2 On Input (Level A)
- [ ] No unexpected context changes on input
- **Notes**: _______________________________________________________________

#### 3.2.3 Consistent Navigation (Level AA)
- [ ] Navigation menus are in same location on all pages
- [ ] Navigation components appear in same order across pages
- [ ] Breadcrumbs are consistent
- [ ] Footer navigation is consistent
- **Testing**: Visit multiple pages, verify consistent navigation
- **Notes**: _______________________________________________________________

#### 3.2.4 Consistent Identification (Level AA)
- [ ] Components with same function are identified consistently
- [ ] Icons look the same across pages
- [ ] Buttons for same action use same text/appearance
- [ ] Search functionality is consistently styled
- **Testing**: Compare similar elements across pages
- **Notes**: _______________________________________________________________

#### 3.2.5 Change on Request (Level AAA)
*Not required for Level AA*

### 3.3 Input Assistance

#### 3.3.1 Error Identification (Level A)
- [ ] Errors are identified in text
- [ ] Error messages are clear
- **Notes**: _______________________________________________________________

#### 3.3.2 Labels or Instructions (Level A)
- [ ] Form fields have labels
- [ ] Required fields are indicated
- [ ] Format requirements are explained
- **Notes**: _______________________________________________________________

#### 3.3.3 Error Suggestion (Level AA)
- [ ] When errors occur, suggestions for correction are provided
- [ ] Suggestions appear near error message
- [ ] Suggestions are not a security risk
- **Testing**: Submit form with intentional errors, verify suggestions
- **Notes**: _______________________________________________________________

#### 3.3.4 Error Prevention (Legal, Financial, Data) (Level AA)
- [ ] Forms that submit legal/financial data require confirmation
- [ ] Ability to review and correct information before submission
- [ ] Submissions can be reversed
- [ ] Form data is validated and user is alerted to errors
- **Testing**: Submit important form, verify confirmation step
- **Notes**: _______________________________________________________________

#### 3.3.5 Help (Level AAA)
*Not required for Level AA*

#### 3.3.6 Error Prevention (All) (Level AAA)
*Not required for Level AA*

## Robust

### 4.1 Compatible

#### 4.1.1 Parsing (Level A)
- [ ] HTML is valid (no duplicate IDs, proper nesting)
- **Notes**: _______________________________________________________________

#### 4.1.2 Name, Role, Value (Level A)
- [ ] Components have accessible names
- [ ] Form labels are programmatic
- [ ] Custom components announce state changes
- **Notes**: _______________________________________________________________

#### 4.1.3 Status Messages (Level AA)
- [ ] Status messages are announced to screen readers
- [ ] aria-live="polite" or aria-live="assertive" used appropriately
- [ ] Toast notifications are announced
- [ ] Form submission confirmation is announced
- **Testing**: Use screen reader to verify status announcements
- **Notes**: _______________________________________________________________

---

## SUMMARY

**Conformance Level: AA**

- [ ] All Level A criteria met
- [ ] All Level AA criteria met

**Overall Result:** [PASS / FAIL]

**Critical Issues:** _______
**Major Issues:** _______
**Minor Issues:** _______
**Date Tested:** $TIMESTAMP
**Tested By:** _______________________

EOF
}

# Generate Level AAA (includes all criteria)
generate_level_aaa() {
  cat > "$CHECKLIST_FILE" <<'EOF'
# WCAG 2.1 Level AAA Checklist

## Complete WCAG 2.1 Level AAA (Maximum Conformance)

This includes all Level A, AA, and AAA criteria.

**Conformance Level: AAA** (Most comprehensive accessibility)

All WCAG 2.1 criteria at A, AA, and AAA levels have been included. Reference the WCAG 2.1 specification at https://www.w3.org/WAI/WCAG21/quickref/ for complete details on AAA requirements.

### Key AAA Additions Beyond AA:

#### Enhanced Contrast (1.4.6)
- [ ] Normal text has at least 7:1 contrast ratio
- [ ] Large text (18pt+) has at least 4.5:1 contrast ratio

#### Enhanced Audio Description (1.2.5 / 1.2.6)
- [ ] All video content has audio descriptions
- [ ] Audio descriptions are comprehensive

#### Sign Language (1.2.6)
- [ ] Video has sign language interpretation
- [ ] Sign language is clear and synchronized

#### Extended Audio Descriptions (1.2.7)
- [ ] Video can be paused for extended audio descriptions
- [ ] Descriptions cover all visual information

#### No Timing (2.2.3)
- [ ] No timing is used anywhere on the site
- [ ] All interactions can be completed at user's pace

#### Keyboard (2.1.3)
- [ ] ALL functionality works via keyboard (no exceptions)

#### Target Size (2.5.5)
- [ ] Touch targets are at least 44x44 CSS pixels
- [ ] All interactive elements are appropriately sized

#### Reflow (1.4.10)
- [ ] Content reflows properly on all screen sizes
- [ ] No horizontal scrolling required
- [ ] No functionality lost at 320px width

#### Headings and Labels (2.4.6)
- [ ] All headings are descriptive and informative
- [ ] Form labels are clear and consistently formatted

---

**Overall Result:** [PASS / FAIL]

**Issues Found:** _______
**Date Tested:** $TIMESTAMP
**Tested By:** _______________________

*For detailed AAA criteria, visit: https://www.w3.org/WAI/WCAG21/quickref/?currentsetting=aaa*

EOF
}

# Generate the appropriate checklist
case $LEVEL_NUM in
  1) generate_level_a ;;
  2) generate_level_aa ;;
  3) generate_level_aaa ;;
esac

echo -e "${GREEN}✓ Checklist generated!${NC}"
echo -e "${BLUE}Location:${NC} $CHECKLIST_FILE"
echo -e "\n${YELLOW}Usage:${NC}"
echo "  1. Print this checklist or view on screen"
echo "  2. As you test, mark [ ] checkboxes with [✓]"
echo "  3. Add notes in the Notes fields"
echo "  4. When complete, save with findings"
echo ""
echo -e "${GREEN}Begin testing!${NC}"
