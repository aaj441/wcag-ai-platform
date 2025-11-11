# ADHD-Friendly UI Design System

**Version:** 1.0.0
**Author:** WCAG AI Platform Team
**Last Updated:** 2025-11-11

---

## Overview

This design system provides Tailwind CSS utilities and components specifically optimized for users with ADHD (Attention Deficit Hyperactivity Disorder). It addresses common challenges including:

- **Difficulty focusing** on complex interfaces
- **Visual overwhelm** from cluttered layouts
- **Distractibility** from animations and movement
- **Information processing** challenges
- **Executive function** support needs

---

## Quick Start

### 1. Installation

```bash
# Copy Tailwind ADHD config
cp tailwind.adhd.config.js tailwind.config.js

# Install dependencies
npm install @tailwindcss/forms
```

### 2. View Demo

```bash
# Open demo in browser
open docs/adhd-ui-demo.html
```

### 3. Use in Your Project

```html
<button class="btn-adhd btn-adhd-primary">
  Start Scan
</button>

<input type="text" class="input-adhd" placeholder="Enter URL">

<div class="card-adhd">
  <h2>Card Title</h2>
  <p>Card content goes here</p>
</div>
```

---

## Core Principles

### 1. 🎯 **Clear Visual Hierarchy**

**Problem:** Users with ADHD struggle to identify what's important on a page.

**Solution:**
- Bold, large headings (700 weight)
- Generous whitespace (2rem+ between sections)
- Consistent heading structure (h1 → h2 → h3)
- Visual "chunking" with borders and spacing

**Implementation:**
```html
<div class="visual-hierarchy">
  <h1 class="text-4xl font-bold mb-4">Main Title</h1>
  <h2 class="text-2xl font-bold mb-3">Section Title</h2>
  <p class="mb-4">Paragraph with clear spacing</p>
</div>
```

---

### 2. 🔍 **High Contrast**

**Problem:** Low contrast text is harder to process and maintain focus on.

**Solution:**
- Minimum 4.5:1 contrast ratio for all text
- 7:1 for important information
- High-contrast mode option (1.3x filter)
- Strong color differentiation

**Color Palette:**
| Color | Use Case | Contrast Ratio |
|-------|----------|----------------|
| Primary Blue (#0080ff) | Primary actions | 4.5:1+ on white |
| Secondary Green (#00af4b) | Success states | 4.5:1+ on white |
| Accent Orange (#ff9900) | Highlights | 3:1+ on white (large text) |
| Neutral Gray | Text | 7:1+ on white |

**Implementation:**
```html
<button class="bg-primary-500 text-white">
  High contrast button
</button>

<!-- Enable high contrast mode -->
<body class="high-contrast">
  <!-- All content gets 1.3x contrast boost -->
</body>
```

---

### 3. ⚡ **Reduced Distractions**

**Problem:** Animations, movement, and visual noise cause distraction and attention loss.

**Solution:**
- Minimal animations (0.15-0.3s max)
- Respect `prefers-reduced-motion`
- Optional "Focus Mode" to dim non-active content
- No auto-playing media
- No infinite scroll without opt-in

**Implementation:**
```html
<!-- Focus Mode: dims everything except focused elements -->
<body class="focus-mode">
  <button>This button is bright when focused</button>
  <p>This text dims when not in focus</p>
</body>

<!-- Reduced motion CSS -->
<style>
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
```

---

### 4. 👆 **Large Touch Targets**

**Problem:** Small buttons are hard to click accurately, causing frustration.

**Solution:**
- Minimum 44x44px for all interactive elements
- Generous padding (1rem+ on all sides)
- Clear hover/focus states
- Spacing between adjacent targets

**Button Sizes:**
```html
<!-- Small (still 44x44px minimum) -->
<button class="btn-adhd px-6 py-3">
  Small Button
</button>

<!-- Medium (default) -->
<button class="btn-adhd px-8 py-4">
  Medium Button
</button>

<!-- Large -->
<button class="btn-adhd px-10 py-5 text-xl">
  Large Button
</button>
```

---

### 5. 💬 **Clear Feedback**

**Problem:** Unclear feedback causes uncertainty and repeated actions.

**Solution:**
- Immediate visual response (< 100ms)
- Progress indicators for all async actions
- Success/error messages with icons
- Loading states for every action
- Confirmation for destructive actions

**Progress Example:**
```html
<div class="progress-adhd">
  <div class="progress-adhd-bar" style="width: 67%"></div>
</div>
<p class="text-sm mt-2">Processing... 67% complete</p>
```

---

## Components

### Buttons

**Types:**
- **Primary:** Main actions (blue)
- **Secondary:** Secondary actions (gray)
- **Success:** Positive actions (green)
- **Danger:** Destructive actions (red)

**All buttons include:**
- ✅ Minimum 44x44px size
- ✅ 3px focus outline
- ✅ Hover lift effect
- ✅ Icon support
- ✅ Loading states

```html
<!-- Primary Button -->
<button class="btn-adhd btn-adhd-primary">
  ✅ Start Scan
</button>

<!-- With Icon -->
<button class="btn-adhd btn-adhd-primary">
  <svg><!-- icon --></svg>
  Start Scan
</button>

<!-- Loading State -->
<button class="btn-adhd btn-adhd-primary" disabled>
  <svg class="animate-spin"><!-- spinner --></svg>
  Loading...
</button>
```

---

### Forms

**Features:**
- Clear labels above inputs
- Help text below inputs
- Visible focus states
- Error messages with icons
- Large input fields (1rem padding)

```html
<div class="space-y-6">
  <div>
    <label class="block text-lg font-semibold mb-2" for="url">
      🔗 Website URL
    </label>
    <input
      type="url"
      id="url"
      class="input-adhd"
      placeholder="https://example.com"
      aria-describedby="url-help"
    >
    <p id="url-help" class="mt-2 text-sm text-gray-600">
      Enter the full URL including https://
    </p>
  </div>

  <!-- Error State -->
  <div>
    <label class="block text-lg font-semibold mb-2 text-red-700">
      ❌ Email Address
    </label>
    <input
      type="email"
      class="input-adhd border-red-500"
      aria-invalid="true"
      aria-describedby="email-error"
    >
    <p id="email-error" class="mt-2 text-sm text-red-700">
      Please enter a valid email address
    </p>
  </div>
</div>
```

---

### Cards

**Features:**
- Generous padding (1.5rem+)
- Soft shadows
- Rounded corners (1.25rem)
- Hover effects
- Clear borders

```html
<div class="card-adhd">
  <div class="flex items-start gap-4">
    <div class="text-4xl">🎨</div>
    <div>
      <h3 class="text-xl font-bold mb-2">Color Contrast</h3>
      <p class="text-gray-700 mb-4">
        All text meets WCAG AA standards.
      </p>
      <div class="badge-adhd bg-blue-100 text-blue-700">
        17 issues found
      </div>
    </div>
  </div>
</div>
```

---

### Progress Indicators

**Types:**
- Progress bars
- Step indicators
- Loading spinners
- Status badges

```html
<!-- Progress Bar -->
<div class="mb-2 flex justify-between text-sm font-medium">
  <span>Analyzing page...</span>
  <span>67%</span>
</div>
<div class="progress-adhd">
  <div class="progress-adhd-bar" style="width: 67%"></div>
</div>

<!-- Status Badge -->
<div class="badge-adhd bg-green-100 text-green-700 border-green-700">
  ✅ Passed
</div>
```

---

## Advanced Features

### 1. Focus Mode

Dims all non-focused elements to reduce distraction.

**Enable:**
```html
<body class="focus-mode">
  <!-- Content -->
</body>
```

**Keyboard Shortcut:** `Ctrl+Shift+F` (or `Cmd+Shift+F` on Mac)

**How it works:**
- Active element stays at 100% opacity
- Everything else fades to 30% opacity
- Smooth transition (0.2s)
- Automatically respects focus-within

---

### 2. High Contrast Mode

Boosts contrast by 30% for better readability.

**Enable:**
```html
<body class="high-contrast">
  <!-- Content -->
</body>
```

**Keyboard Shortcut:** `Ctrl+Shift+C`

**Effect:**
- Applies `filter: contrast(1.3)`
- Makes all colors more vivid
- Increases text legibility

---

### 3. Content Chunking

Breaks content into digestible sections with visual separators.

```html
<section class="content-chunk">
  <h2>Section 1</h2>
  <p>Content here</p>
</section>

<section class="content-chunk">
  <h2>Section 2</h2>
  <p>More content</p>
</section>
```

**Visual effect:**
- 2rem bottom margin
- 2rem bottom padding
- 1px bottom border
- Last section has no border

---

## Accessibility Features

### Keyboard Navigation

✅ All interactive elements are keyboard accessible
✅ Visible focus indicators (3px blue outline)
✅ Logical tab order
✅ Skip links for main content
✅ Keyboard shortcuts documented

**Focus Styles:**
```css
.btn-adhd:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 128, 255, 0.3);
  border-color: #0080ff;
}
```

---

### Screen Reader Support

✅ Semantic HTML (heading hierarchy)
✅ ARIA labels for icons and complex widgets
✅ ARIA live regions for dynamic updates
✅ Descriptive link text (no "click here")
✅ Alt text for all images

**Example:**
```html
<button aria-label="Start accessibility scan">
  <svg aria-hidden="true"><!-- icon --></svg>
  Start
</button>

<div role="status" aria-live="polite">
  Scan completed successfully
</div>
```

---

### Motion Preferences

✅ Respects `prefers-reduced-motion`
✅ All animations can be disabled
✅ No auto-playing videos
✅ Smooth scroll can be disabled

**Implementation:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## Color System

### Primary Colors

| Color | Hex | Use Case |
|-------|-----|----------|
| Primary 500 | `#0080ff` | Primary actions, links |
| Primary 600 | `#0066cc` | Primary hover states |
| Secondary 500 | `#00af4b` | Success, positive actions |
| Accent 500 | `#ff9900` | Highlights, warnings |

### Semantic Colors

| Color | Hex | Use Case |
|-------|-----|----------|
| Success | `#10b981` | Success messages, passed tests |
| Warning | `#f59e0b` | Warnings, best practices |
| Error | `#ef4444` | Errors, failed tests |
| Info | `#3b82f6` | Informational messages |

### Neutral Grays

| Color | Hex | Use Case |
|-------|-----|----------|
| Gray 900 | `#111827` | Primary text |
| Gray 700 | `#374151` | Secondary text |
| Gray 500 | `#6b7280` | Tertiary text |
| Gray 300 | `#d1d5db` | Borders |
| Gray 100 | `#f3f4f6` | Backgrounds |

---

## Typography

### Font Sizes

| Size | Rem | Use Case |
|------|-----|----------|
| xs | 0.875rem | Fine print, captions |
| sm | 0.9375rem | Labels, help text |
| base | 1rem | Body text |
| lg | 1.125rem | Emphasized text, buttons |
| xl | 1.25rem | Subheadings |
| 2xl | 1.5rem | Section titles |
| 3xl | 1.875rem | Page titles |
| 4xl | 2.25rem | Hero titles |

### Line Height

All text has increased line-height for better readability:
- Body text: **1.7**
- Headings: **1.4-1.5**

### Letter Spacing

Slight positive letter-spacing (0.01em) for improved word recognition.

---

## Spacing System

### Base Unit: 0.25rem (4px)

| Class | Size | Use Case |
|-------|------|----------|
| p-2 | 0.5rem | Tight padding |
| p-4 | 1rem | Standard padding |
| p-6 | 1.5rem | Comfortable padding |
| p-8 | 2rem | Generous padding |
| mb-4 | 1rem | Paragraph spacing |
| mb-8 | 2rem | Section spacing |

### Content Spacing

- **Between paragraphs:** 1rem (mb-4)
- **Between sections:** 2rem (mb-8)
- **Between major sections:** 3rem (mb-12)

---

## Testing Guidelines

### ADHD User Testing Checklist

**Visual Hierarchy:**
- [ ] Can you identify the most important element within 3 seconds?
- [ ] Is the heading structure clear and logical?
- [ ] Are sections visually separated?

**Distractibility:**
- [ ] Can you complete a task without getting distracted?
- [ ] Are animations minimal and necessary?
- [ ] Does focus mode help you concentrate?

**Clarity:**
- [ ] Are buttons clearly labeled with their action?
- [ ] Is feedback immediate and obvious?
- [ ] Are error messages clear and actionable?

**Ease of Use:**
- [ ] Can you navigate using only keyboard?
- [ ] Are touch targets large enough (44x44px)?
- [ ] Do you feel overwhelmed by the interface?

---

## Best Practices

### DO ✅

- **Use large, clear buttons** with descriptive labels
- **Provide progress indicators** for all async actions
- **Chunk content** into digestible sections
- **Use icons** to reinforce text meaning
- **Allow customization** (focus mode, contrast)
- **Respect user preferences** (reduced motion, etc.)
- **Keep layouts simple** and consistent
- **Provide immediate feedback** for all interactions

### DON'T ❌

- **Don't use small text** (<16px for body)
- **Don't overuse animations** or auto-play media
- **Don't hide important actions** in menus
- **Don't use low contrast** text (< 4.5:1)
- **Don't use tiny click targets** (< 44x44px)
- **Don't rely on color alone** for meaning
- **Don't create complex multi-step flows** without progress indicators
- **Don't use jargon** or unclear labels

---

## Resources

### Research & Guidelines

- [ADHD and Web Design (WebAIM)](https://webaim.org/articles/cognitive/adhd/)
- [Cognitive Accessibility (W3C)](https://www.w3.org/WAI/cognitive/)
- [Making Content Usable for People with Cognitive and Learning Disabilities](https://www.w3.org/TR/coga-usable/)

### Tools

- **Focus Mode:** `Ctrl+Shift+F` (built-in)
- **High Contrast:** `Ctrl+Shift+C` (built-in)
- **Color Contrast Checker:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- **Screen Reader:** NVDA (free), JAWS (commercial), VoiceOver (Mac/iOS)

### Support

- **Demo:** `docs/adhd-ui-demo.html`
- **Config:** `tailwind.adhd.config.js`
- **GitHub Issues:** Report bugs or request features

---

## Changelog

### v1.0.0 (2025-11-11)

- ✨ Initial release
- 🎨 Complete color system with high contrast
- 🔘 ADHD-optimized button styles
- 📝 Form components with clear labels
- 📊 Progress indicators and badges
- 🎯 Focus mode for reduced distraction
- 🔍 High contrast mode
- ⌨️ Full keyboard accessibility
- 📖 Comprehensive documentation

---

**License:** MIT
**Maintainer:** WCAG AI Platform Team
**Questions?** Open an issue on GitHub
