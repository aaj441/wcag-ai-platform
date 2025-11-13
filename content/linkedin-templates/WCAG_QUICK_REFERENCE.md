# WCAG 2.1 Quick Reference for AI Tool Audits

## Purpose
Quick lookup guide for mapping accessibility violations to WCAG 2.1 guidelines. Use this when creating LinkedIn teardown posts.

---

## WCAG Structure

### Conformance Levels
- **Level A** - Minimum (must meet)
- **Level AA** - Industry standard (recommended)
- **Level AAA** - Enhanced (gold standard)

### Principles (POUR)
1. **Perceivable** - Information must be presentable to users
2. **Operable** - Interface must be navigable and functional
3. **Understandable** - Information and operation must be clear
4. **Robust** - Content must work across technologies

---

## Most Common AI Tool Violations

### 🎯 Top 10 for LinkedIn Posts

#### 1. Keyboard Trap (WCAG 2.1.2) - Level A
**Issue:** User gets stuck in a UI element, can't navigate out with keyboard.

**Common in AI Tools:**
- Chat windows that trap focus
- Code suggestion popups
- Modal dialogs without Esc key handler

**Example Language:**
```
❌ **Keyboard Trap:** Users can't navigate out of the chat window using only keyboard. (WCAG 2.1.2 No Keyboard Trap)
```

**Impact:** Critical - Completely blocks keyboard users

---

#### 2. Keyboard Access (WCAG 2.1.1) - Level A
**Issue:** Feature requires mouse; no keyboard alternative exists.

**Common in AI Tools:**
- Drag-and-drop interfaces
- Hover-only tooltips
- Mouse-only buttons

**Example Language:**
```
❌ **No Keyboard Access:** The "regenerate" button only works with mouse clicks. Keyboard users can't access this feature. (WCAG 2.1.1 Keyboard)
```

**Impact:** Critical - Excludes all keyboard users

---

#### 3. Missing Labels (WCAG 4.1.2) - Level A
**Issue:** Interactive elements lack proper names/labels for assistive tech.

**Common in AI Tools:**
- Unlabeled buttons (icons only)
- Input fields without labels
- Dynamic content updates

**Example Language:**
```
❌ **No ARIA Labels:** The "thumbs up" feedback button isn't labeled for screen readers. (WCAG 4.1.2 Name, Role, Value)
```

**Impact:** High - Screen reader users don't know what buttons do

---

#### 4. Color Contrast (WCAG 1.4.3) - Level AA
**Issue:** Text doesn't have sufficient contrast against background.

**Requirements:**
- Normal text: 4.5:1 minimum
- Large text (18pt+): 3:1 minimum

**Common in AI Tools:**
- Dark mode grey text
- Placeholder text too light
- Status indicators

**Example Language:**
```
❌ **Poor Contrast:** Grey AI responses on dark background fail WCAG 1.4.3 (2.8:1 ratio, needs 4.5:1). Users with low vision can't read output.
```

**Impact:** High - Affects users with low vision, colorblindness

**Testing:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

#### 5. Missing Alt Text (WCAG 1.1.1) - Level A
**Issue:** Images lack text descriptions for screen readers.

**Common in AI Tools:**
- AI-generated images
- Icon buttons
- Diagrams and charts

**Example Language:**
```
❌ **No Alt Text:** AI-generated images have no descriptions. Blind users don't know what was created. (WCAG 1.1.1 Non-text Content)
```

**Impact:** Medium-High - Screen reader users miss visual content

---

#### 6. Heading Structure (WCAG 1.3.1) - Level A
**Issue:** Content lacks proper heading hierarchy (H1, H2, H3).

**Common in AI Tools:**
- AI-generated documents without structure
- Chat interfaces without landmarks
- Dashboard sections unlabeled

**Example Language:**
```
❌ **No Heading Structure:** AI-generated content lacks H1/H2/H3 hierarchy. Screen readers can't navigate efficiently. (WCAG 1.3.1 Info and Relationships)
```

**Impact:** Medium - Makes navigation difficult for screen reader users

---

#### 7. Focus Visible (WCAG 2.4.7) - Level AA
**Issue:** Keyboard focus indicator not visible or too subtle.

**Common in AI Tools:**
- Custom UI components without focus styles
- Focus outline removed for aesthetics
- Thin focus indicators

**Example Language:**
```
❌ **Invisible Focus:** When tabbing through options, there's no visual indicator of keyboard focus. Users can't tell where they are. (WCAG 2.4.7 Focus Visible)
```

**Impact:** High - Keyboard users can't track position

---

#### 8. Time Limits (WCAG 2.2.1) - Level A
**Issue:** Actions require rapid response without adjustment option.

**Common in AI Tools:**
- Auto-dismissing notifications
- Timed chat sessions
- Quick action prompts

**Example Language:**
```
❌ **Rapid Response Required:** AI suggestions disappear after 3 seconds with no way to extend time. Users with cognitive disabilities can't process fast enough. (WCAG 2.2.1 Timing Adjustable)
```

**Impact:** High - Excludes users who need more processing time

---

#### 9. Error Identification (WCAG 3.3.1) - Level A
**Issue:** Errors not clearly described or announced.

**Common in AI Tools:**
- Vague error messages ("Something went wrong")
- Color-only error indicators
- Errors not announced to screen readers

**Example Language:**
```
❌ **Vague Errors:** When AI fails, error message just says "Try again." No explanation of what went wrong. (WCAG 3.3.1 Error Identification)
```

**Impact:** Medium - Users can't understand or fix errors

---

#### 10. Status Messages (WCAG 4.1.3) - Level AA
**Issue:** Dynamic updates not announced to screen readers.

**Common in AI Tools:**
- "AI is typing" indicators
- Token usage updates
- Completion notifications

**Example Language:**
```
❌ **Silent Updates:** When AI starts generating, screen readers don't announce it. Users don't know if tool is working or frozen. (WCAG 4.1.3 Status Messages)
```

**Impact:** Medium-High - Screen reader users miss important state changes

---

## Full WCAG 2.1 Reference by Principle

### 1. Perceivable

#### 1.1 Text Alternatives
- **1.1.1 Non-text Content (A)** - Alt text for images, icons

#### 1.2 Time-based Media
- **1.2.1 Audio-only and Video-only (A)** - Transcripts required
- **1.2.2 Captions (A)** - Captions for videos
- **1.2.3 Audio Description or Media Alternative (A)** - Describe visual content
- **1.2.4 Captions (Live) (AA)** - Live captions
- **1.2.5 Audio Description (AA)** - Audio descriptions for videos

#### 1.3 Adaptable
- **1.3.1 Info and Relationships (A)** - Semantic HTML structure
- **1.3.2 Meaningful Sequence (A)** - Logical reading order
- **1.3.3 Sensory Characteristics (A)** - Don't rely on shape/color/position alone
- **1.3.4 Orientation (AA)** - Support portrait and landscape
- **1.3.5 Identify Input Purpose (AA)** - Autocomplete attributes on inputs

#### 1.4 Distinguishable
- **1.4.1 Use of Color (A)** - Don't use color as only indicator
- **1.4.2 Audio Control (A)** - Control for auto-playing audio
- **1.4.3 Contrast (Minimum) (AA)** - 4.5:1 for text, 3:1 for large text
- **1.4.4 Resize Text (AA)** - Text can scale to 200%
- **1.4.5 Images of Text (AA)** - Use real text, not images
- **1.4.10 Reflow (AA)** - No horizontal scrolling at 320px width
- **1.4.11 Non-text Contrast (AA)** - 3:1 for UI components
- **1.4.12 Text Spacing (AA)** - Support text spacing adjustments
- **1.4.13 Content on Hover or Focus (AA)** - Dismissible, hoverable, persistent

---

### 2. Operable

#### 2.1 Keyboard Accessible
- **2.1.1 Keyboard (A)** - All functions available via keyboard
- **2.1.2 No Keyboard Trap (A)** - Users can navigate away with keyboard
- **2.1.4 Character Key Shortcuts (A)** - Can disable or remap shortcuts

#### 2.2 Enough Time
- **2.2.1 Timing Adjustable (A)** - Users can extend time limits
- **2.2.2 Pause, Stop, Hide (A)** - Control moving content

#### 2.3 Seizures and Physical Reactions
- **2.3.1 Three Flashes or Below Threshold (A)** - No flashing content

#### 2.4 Navigable
- **2.4.1 Bypass Blocks (A)** - Skip navigation links
- **2.4.2 Page Titled (A)** - Descriptive page titles
- **2.4.3 Focus Order (A)** - Logical tab order
- **2.4.4 Link Purpose (A)** - Links make sense out of context
- **2.4.5 Multiple Ways (AA)** - Multiple ways to find pages
- **2.4.6 Headings and Labels (AA)** - Descriptive headings/labels
- **2.4.7 Focus Visible (AA)** - Visible keyboard focus indicator

#### 2.5 Input Modalities
- **2.5.1 Pointer Gestures (A)** - No complex gestures required
- **2.5.2 Pointer Cancellation (A)** - Can cancel pointer actions
- **2.5.3 Label in Name (A)** - Visual label matches accessible name
- **2.5.4 Motion Actuation (A)** - Can disable motion-triggered actions

---

### 3. Understandable

#### 3.1 Readable
- **3.1.1 Language of Page (A)** - Page language declared
- **3.1.2 Language of Parts (AA)** - Language changes marked

#### 3.2 Predictable
- **3.2.1 On Focus (A)** - Focus doesn't trigger unexpected changes
- **3.2.2 On Input (A)** - Input doesn't trigger unexpected changes
- **3.2.3 Consistent Navigation (AA)** - Navigation consistent across pages
- **3.2.4 Consistent Identification (AA)** - Icons/buttons consistent meaning

#### 3.3 Input Assistance
- **3.3.1 Error Identification (A)** - Errors clearly identified
- **3.3.2 Labels or Instructions (A)** - Clear input labels
- **3.3.3 Error Suggestion (AA)** - Suggest fixes for errors
- **3.3.4 Error Prevention (AA)** - Prevent errors on important forms

---

### 4. Robust

#### 4.1 Compatible
- **4.1.1 Parsing (A)** - Valid HTML (deprecated in WCAG 2.2)
- **4.1.2 Name, Role, Value (A)** - Proper ARIA for custom components
- **4.1.3 Status Messages (AA)** - Dynamic updates announced

---

## AI Tool Specific Patterns

### Chat Interfaces
| Violation | WCAG | Common Issue |
|-----------|------|--------------|
| Chat window keyboard trap | 2.1.2 | Can't Tab out |
| Messages not announced | 4.1.3 | Screen reader silent |
| No "AI typing" indicator | 4.1.3 | Users don't know status |
| Poor contrast in dark mode | 1.4.3 | Grey on black text |

### Code Editors / IDEs
| Violation | WCAG | Common Issue |
|-----------|------|--------------|
| Autocomplete trap | 2.1.2 | Stuck in suggestion list |
| No focus indicator | 2.4.7 | Can't see selection |
| Syntax colors only | 1.4.1 | Colorblind can't read |
| Code language not marked | 3.1.2 | Screen reader mispronounces |

### Content Generators
| Violation | WCAG | Common Issue |
|-----------|------|--------------|
| No heading structure | 1.3.1 | Wall of text |
| Generated images no alt | 1.1.1 | Screen reader skips images |
| Dense paragraphs | 1.3.1 | Cognitive overload |
| Regenerate button unlabeled | 4.1.2 | Icon-only button |

### Voice Interfaces
| Violation | WCAG | Common Issue |
|-----------|------|--------------|
| No visual transcript | 1.2.1 | Deaf users excluded |
| Can't control speed | 2.2.1 | Too fast for cognitive disabilities |
| Visual-only status | 4.1.3 | Blind users don't know state |

---

## Testing Quick Checklist

### Keyboard Testing (5 min)
- [ ] Can navigate to all features with Tab/Shift+Tab?
- [ ] Can activate buttons with Enter/Space?
- [ ] Can escape modals with Esc?
- [ ] Can see where keyboard focus is?
- [ ] Can navigate away from all elements?

### Screen Reader Testing (10 min)
- [ ] Are all buttons labeled?
- [ ] Does it announce page changes?
- [ ] Does it announce errors?
- [ ] Can navigate by headings?
- [ ] Are images described?

### Visual Testing (5 min)
- [ ] Text contrast 4.5:1+? ([Test here](https://webaim.org/resources/contrastchecker/))
- [ ] Can zoom to 200% without horizontal scroll?
- [ ] Focus indicator visible?
- [ ] Don't use color alone for info?

---

## Severity Guidelines

### Critical (Must Fix Immediately)
- Keyboard traps (2.1.2)
- No keyboard access (2.1.1)
- Missing form labels (3.3.2)

### High (Fix Before Launch)
- Poor contrast (1.4.3)
- Missing alt text (1.1.1)
- Unlabeled buttons (4.1.2)
- No focus indicator (2.4.7)

### Medium (Fix in Sprint)
- No heading structure (1.3.1)
- Status updates not announced (4.1.3)
- Error messages vague (3.3.1)

### Low (Nice to Have)
- Complex language (3.1.5 AAA)
- No help text (3.3.5 AAA)
- Enhanced contrast (1.4.6 AAA)

---

## LinkedIn Post Language Templates

### For Level A Violations (Critical)
```
❌ **[Issue Title]:** [Description]. This is a Level A violation—the most critical tier. (WCAG [Reference])
```

### For Level AA Violations (Standard)
```
❌ **[Issue Title]:** [Description]. Fails WCAG 2.1 AA—the industry compliance standard. (WCAG [Reference])
```

### For AAA Nice-to-Haves
```
⚠️ **[Issue Title]:** [Description]. Doesn't meet AAA enhanced accessibility. (WCAG [Reference])
```

---

## Additional Resources

### Official WCAG
- [WCAG 2.1 Full Spec](https://www.w3.org/TR/WCAG21/)
- [WCAG Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [Understanding WCAG 2.1](https://www.w3.org/WAI/WCAG21/Understanding/)

### Testing Tools
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Learning
- [WebAIM Articles](https://webaim.org/articles/)
- [A11y Project](https://www.a11yproject.com/)
- [Deque University](https://dequeuniversity.com/)

---

## Pro Tips

### Citing WCAG in Posts
✅ **Good:** "This violates WCAG 2.1.2 (No Keyboard Trap), a Level A requirement."
❌ **Bad:** "This breaks accessibility rules."

### Explaining Impact
✅ **Good:** "This prevents blind users from using the feature."
❌ **Bad:** "This is bad for accessibility."

### Suggesting Fixes
✅ **Good:** "Add aria-label='Regenerate response' to the button."
❌ **Bad:** "Just make it accessible."

---

**Use this guide when writing LinkedIn teardowns to ensure accuracy and credibility.**
