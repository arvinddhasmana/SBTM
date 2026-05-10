# UI Design Guidelines

- Document owner: Product and Engineering
- Last reviewed: 2026-05-10
- Primary use: UI/UX design standards for web applications and mobile apps (Android and iOS)

## Purpose

Define user interface design principles and conventions for SBTM's web applications (Admin Dashboard, Parent Portal) and mobile applications (Driver App, Parent Mobile App). These guidelines ensure consistency, accessibility, and optimal user experience across all platforms while addressing the specific needs of child safety and transportation management.

## Core UI/UX Principles

### 1. User-Centered Design

- **Know Your Users**: Design for the specific needs of each user role (Super Admin, School Admin, Driver, Parent).
- **Task-Oriented**: Optimize UI for the primary tasks users need to accomplish efficiently.
- **Context-Aware**: Consider the environment where the app is used (drivers on the road, parents at home, admins at desks).
- **Error Prevention**: Design to prevent errors before they occur rather than just handling them gracefully.

### 2. Consistency

- **Visual Consistency**: Use consistent colors, typography, spacing, and visual elements across the entire system.
- **Functional Consistency**: Similar actions should work the same way throughout the application.
- **Cross-Platform Consistency**: Maintain recognizable patterns across web and mobile platforms while respecting platform conventions.
- **Layout Consistency**: Keep navigation, button placement, and UI element positions consistent across all screens.

### 3. Simplicity and Clarity

- **Progressive Disclosure**: Show only essential information initially; reveal advanced options as needed.
- **Minimize Cognitive Load**: Reduce the mental effort required to use the interface.
- **Clear Visual Hierarchy**: Use size, color, spacing, and typography to guide user attention.
- **Meaningful Labels**: Use clear, descriptive labels instead of technical jargon or internal codes.

### 4. Efficiency

- **Minimize Clicks**: Design workflows to accomplish tasks with the fewest possible interactions.
- **Keyboard Accessibility**: Support keyboard navigation and shortcuts for power users.
- **Batch Operations**: Allow users to perform actions on multiple items simultaneously where appropriate.
- **Smart Defaults**: Pre-select the most common or logical options to reduce user input.

### 5. Feedback and Communication

- **Immediate Feedback**: Provide instant visual or haptic feedback for all user actions.
- **Clear Status Indicators**: Always communicate system state, loading progress, and operation results.
- **Meaningful Error Messages**: Use plain language to explain what went wrong and how to fix it.
- **Confirmation Only When Necessary**: Avoid unnecessary confirmation dialogs; use them only for destructive or irreversible actions.

## Data Display Standards

### Identity and Reference Rules

**Critical Rule: Never Display Internal IDs**

- ❌ **NEVER**: Display database IDs, UUIDs, or internal system identifiers to end users.
- ✅ **ALWAYS**: Show human-readable names, labels, or user-friendly reference codes.

| Entity | Don't Show | Show Instead |
|---|---|---|
| Student | `student_id: "550e8400-..."` | "Emma Johnson - Grade 3" |
| Route | `route_id: "7c9e6679-..."` | "Route 12A - Oakwood Elementary" |
| Vehicle | `vehicle_id: "123456"` | "Bus #42 - Blue Bird 2022" |
| School | `school_id: "987654"` | "Oakwood Elementary School" |
| Driver | `driver_id: "abc123"` | "John Smith - Employee #8341" |

**Implementation Notes**:
- Use composite labels that combine multiple meaningful attributes (name + number, name + grade).
- For references in URLs or APIs, use UUIDs or IDs internally but never expose them in the UI.
- When a unique identifier is necessary for users (e.g., employee number), assign a human-friendly code.

### Data Formatting Standards

| Data Type | Format | Example |
|---|---|---|
| **Dates** | Use locale-aware formatting | "May 10, 2026" or "10/05/2026" |
| **Time** | 12-hour with AM/PM or 24-hour based on locale | "2:30 PM" or "14:30" |
| **Timestamps** | Relative for recent, absolute for older | "2 minutes ago", "Yesterday at 3:45 PM" |
| **Phone Numbers** | Format with spacing/dashes | "(555) 123-4567" |
| **Distances** | Use appropriate units with precision | "2.5 km", "1.6 mi" |
| **Status** | Visual indicators + text | 🟢 Active, 🔴 Offline, 🟡 Warning |

## Navigation and Interaction Patterns

### Navigation Hierarchy

**Web Applications**:
- **Primary Navigation**: Persistent sidebar or top navigation bar with main sections.
- **Secondary Navigation**: Contextual tabs or sub-menus within each section.
- **Breadcrumbs**: Show hierarchy on deep pages (Home > Routes > Route 12A > Edit).
- **Back Navigation**: Always provide a clear way to return to the previous screen.

**Mobile Applications**:
- **Tab Bar**: Bottom navigation for primary sections (3-5 items maximum).
- **Stack Navigation**: Use for hierarchical flows with header back button.
- **Drawer Navigation**: Optional for admin functions or settings (avoid for primary navigation).
- **Gestures**: Support swipe-back gesture on iOS, hardware back button on Android.

### Keyboard Navigation and Shortcuts

**Essential Keyboard Support**:

| Action | Shortcut | Applies To |
|---|---|---|
| Close dialog/modal | `Escape` | All platforms |
| Submit form | `Enter` | Forms with single action |
| Navigate forward | `Tab` | All interactive elements |
| Navigate backward | `Shift + Tab` | All interactive elements |
| Select/activate | `Space` or `Enter` | Buttons, checkboxes, links |
| Search | `Ctrl/Cmd + F` or `/` | List views, dashboards |
| Save | `Ctrl/Cmd + S` | Forms and editors |
| Cancel/Undo | `Ctrl/Cmd + Z` | Editable content |

**Advanced Shortcuts** (web applications):
- `Ctrl/Cmd + K`: Command palette or quick search
- `Alt + 1-9`: Navigate to primary sections
- `Ctrl/Cmd + ,`: Open settings
- `?`: Display keyboard shortcuts help

**Implementation Rules**:
- All interactive elements must be reachable via keyboard.
- Focus indicators must be clearly visible (not just browser defaults).
- Skip links for screen readers to bypass repetitive navigation.
- Test keyboard navigation on every new feature.

### Dialog and Modal Windows

**When to Use Dialogs**:
- ✅ **Use for**: Capturing focused input, confirming destructive actions, displaying critical alerts.
- ❌ **Avoid for**: Non-critical information, complex multi-step workflows, content that needs scrolling.

**Dialog Design Rules**:
- **Escape Key**: Always close dialogs with `Escape` key.
- **Overlay**: Use semi-transparent backdrop (backdrop-blur or dim) to focus attention.
- **Focus Trap**: Prevent keyboard navigation from leaving the dialog.
- **Primary Action**: Highlight the primary action button; make it the default.
- **Position**: Center on screen for small dialogs, full-screen for complex forms on mobile.
- **Animation**: Smooth open/close animation (fade + scale recommended).

**Confirmation Dialogs - Use Sparingly**:

Show confirmation dialogs ONLY for:
1. **Destructive Actions**: Deleting data, removing students, canceling routes.
2. **Irreversible Operations**: Actions that cannot be undone.
3. **High-Risk Changes**: Modifying critical safety settings, deactivating alerts.
4. **Unsaved Work**: Navigating away from forms with unsaved changes.

Do NOT show confirmations for:
- Saving data (just show success feedback)
- Viewing or reading information
- Routine, reversible operations
- Actions with clear intent and low risk

**Confirmation Dialog Structure**:
```
[Icon: Warning/Question]
Title: Clear, action-oriented question
  "Delete Student Record?"

Body: Explain consequences in 1-2 sentences
  "Emma Johnson will be permanently removed from
   the system. This action cannot be undone."

Actions:
  [Cancel (secondary)]  [Delete (primary, destructive)]
```

### Unsaved Changes Handling

**Implementation Strategy**:

1. **Detect Changes**: Track form dirty state from initial load.
2. **Warn Before Navigation**: Show confirmation dialog when user attempts to navigate away with unsaved changes.
3. **Auto-Save (preferred)**: Implement automatic draft saving for long forms when feasible.
4. **Visual Indicator**: Show asterisk (*) or "Unsaved changes" badge on navigation items.

**Warning Message Example**:
```
Title: "Unsaved Changes"
Body: "You have unsaved changes. If you leave now,
       your changes will be lost."
Actions: [Stay] [Discard Changes]
```

**Best Practice**:
- For critical forms (student enrollment, route planning), implement auto-save to drafts every 30-60 seconds.
- Provide explicit "Save Draft" button for forms that can be completed later.

## Layout and Spacing

### Responsive Grid System

**Breakpoints** (following industry standards):

| Size | Breakpoint | Device | Columns |
|---|---|---|---|
| **xs** | < 640px | Small mobile | 4 |
| **sm** | 640px - 767px | Mobile | 4 |
| **md** | 768px - 1023px | Tablet | 8 |
| **lg** | 1024px - 1279px | Desktop | 12 |
| **xl** | 1280px - 1535px | Large desktop | 12 |
| **2xl** | ≥ 1536px | Wide desktop | 12 |

**Responsive Behavior**:
- Content should reflow gracefully at all breakpoints.
- Test layouts at breakpoint boundaries (639px, 767px, 1023px, etc.).
- Mobile-first approach: design for smallest screen, then enhance for larger.

### Spacing Scale

Use a consistent spacing scale based on 4px increments:

| Token | Size | Use Case |
|---|---|---|
| `space-1` | 4px | Tight spacing (icon + text) |
| `space-2` | 8px | Small gaps (form field groups) |
| `space-3` | 12px | Default spacing (card padding) |
| `space-4` | 16px | Section spacing |
| `space-6` | 24px | Component separation |
| `space-8` | 32px | Large section gaps |
| `space-12` | 48px | Major section breaks |
| `space-16` | 64px | Page-level spacing |

### Layout Patterns

**Web Application Layout**:
```
┌─────────────────────────────────────────────┐
│ Header: Logo, User Menu, Notifications     │
├──────────┬──────────────────────────────────┤
│          │  Content Area                    │
│ Sidebar  │  ┌────────────────────────────┐  │
│ Nav      │  │ Page Header (Title + CTA)  │  │
│          │  ├────────────────────────────┤  │
│          │  │ Main Content               │  │
│          │  │                            │  │
│          │  │                            │  │
│          │  └────────────────────────────┘  │
└──────────┴──────────────────────────────────┘
```

**Mobile Application Layout**:
```
┌─────────────────┐
│ Header/Nav Bar  │
├─────────────────┤
│                 │
│  Scrollable     │
│  Content        │
│  Area           │
│                 │
│                 │
├─────────────────┤
│ Bottom Tab Bar  │
└─────────────────┘
```

## Button and Action Design

### Button Hierarchy

| Type | Use Case | Visual Style |
|---|---|---|
| **Primary** | Main action on a page | Solid color, high contrast |
| **Secondary** | Alternative action | Outlined or ghost style |
| **Tertiary** | Low-priority action | Text only, no border |
| **Destructive** | Delete, remove, cancel | Red/error color |
| **Disabled** | Action unavailable | Reduced opacity, no hover |

**Button Placement Rules**:
- **Forms**: Primary action on right, secondary on left (Western reading order).
- **Dialogs**: Primary on right, cancel/close on left.
- **Floating Action Button (FAB)**: Bottom-right on mobile for primary creation action.
- **Toolbars**: Group related actions together with visual separators.

**Button Sizing**:

| Size | Height | Use Case |
|---|---|---|
| **Small** | 32px | Dense tables, inline actions |
| **Medium** | 40px | Default forms and cards |
| **Large** | 48px | Mobile primary actions |
| **Extra Large** | 56px | Hero CTAs, mobile FABs |

**Touch Target Minimums** (mobile):
- Minimum touch target: 44x44px (iOS), 48x48dp (Android)
- Spacing between touch targets: 8px minimum

### Consistent Action Placement

**Across the System**:
- **Create/Add actions**: Top-right of list views or bottom-right FAB on mobile.
- **Edit actions**: Icon button in row or card top-right corner.
- **Delete actions**: Always require confirmation; use destructive color.
- **Bulk actions**: Toolbar appears above list when items are selected.
- **Filter/Sort**: Top-left of list views, above content area.

**Card Actions**:
```
┌────────────────────────────────┐
│ Card Title            [Edit 🖊️] │
├────────────────────────────────┤
│ Card Content                   │
│                                │
│                                │
├────────────────────────────────┤
│ [Secondary]    [Primary Action]│
└────────────────────────────────┘
```

## Typography Standards

### Type Scale

| Style | Size | Weight | Line Height | Use Case |
|---|---|---|---|---|
| **Display** | 48px | 700 | 1.2 | Hero headings |
| **H1** | 32px | 700 | 1.3 | Page titles |
| **H2** | 24px | 600 | 1.4 | Section headers |
| **H3** | 20px | 600 | 1.4 | Subsection headers |
| **H4** | 18px | 600 | 1.5 | Card titles |
| **Body** | 16px | 400 | 1.6 | Primary content |
| **Body Small** | 14px | 400 | 1.5 | Secondary content |
| **Caption** | 12px | 400 | 1.4 | Labels, metadata |
| **Tiny** | 10px | 500 | 1.3 | Dense data displays |

**Font Families**:
- **Sans-serif**: Primary UI font (Inter, SF Pro, Roboto)
- **Monospace**: Code, IDs, technical data (Fira Code, SF Mono, Roboto Mono)
- **Fallbacks**: System font stack for performance

### Text Formatting

**Emphasis**:
- **Bold** (600-700 weight): Important information, data values, emphasis.
- *Italic*: Rare; use for foreign terms, citations.
- UPPERCASE: Labels, categories (use sparingly; reduces readability).
- Underline: Avoid except for links.

**Color and Contrast**:
- **Primary text**: High contrast (AAA standard: 7:1)
- **Secondary text**: Medium contrast (AA standard: 4.5:1)
- **Disabled text**: Low contrast but still readable (3:1 minimum)
- **Link text**: Distinct color + underline on hover

## Color and Visual Design

### Color System

**Semantic Colors**:

| Purpose | Primary | On-Light BG | On-Dark BG |
|---|---|---|---|
| **Primary/Brand** | Blue-600 | Blue-700 | Blue-400 |
| **Success** | Green-600 | Green-700 | Green-400 |
| **Warning** | Amber-600 | Amber-700 | Amber-400 |
| **Error/Danger** | Red-600 | Red-700 | Red-400 |
| **Info** | Cyan-600 | Cyan-700 | Cyan-400 |
| **Neutral** | Gray-600 | Gray-700 | Gray-400 |

**Status Indicators**:
- 🟢 **Active/Online**: Green
- 🔴 **Inactive/Offline**: Red
- 🟡 **Warning/Pending**: Amber
- 🔵 **In Progress**: Blue
- ⚫ **Unknown/Unavailable**: Gray

**Accessibility Requirements**:
- All text must meet WCAG 2.1 AA contrast requirements (4.5:1 for normal text, 3:1 for large text).
- Interactive elements must have 3:1 contrast against background.
- Don't rely on color alone to convey information (use icons + text).

### Icons

**Icon System**:
- Use a single, consistent icon library (e.g., Heroicons, Material Icons, SF Symbols).
- Icon sizes: 16px, 20px, 24px, 32px (multiples of 4).
- Maintain 1:1 aspect ratio for all icons.
- Use filled icons for active/selected states, outline for inactive.

**Icon with Text**:
- Place icons to the left of text labels (Western reading order).
- Maintain 8px spacing between icon and text.
- Vertically center-align icons with text baseline.

**Icon-Only Buttons**:
- Always provide `aria-label` or tooltip for accessibility.
- Use only universally recognized icons (search 🔍, settings ⚙️, close ✕).

## Form Design

### Form Layout

**Field Organization**:
- Group related fields together with visual separation (spacing or borders).
- Use single-column layouts for mobile; 2-3 columns acceptable on desktop for short fields.
- Align labels above fields (not to the left) for better scannability and mobile compatibility.

**Field Anatomy**:
```
Label *                          [Help Icon ?]
┌─────────────────────────────────────────┐
│ Input value or placeholder              │
└─────────────────────────────────────────┘
Helper text or character count (optional)
Error message (if validation fails)
```

### Form Validation

**Validation Strategy**:
- **Inline Validation**: Validate fields on blur (focus out) to provide immediate feedback.
- **Submit Validation**: Validate entire form on submit; show all errors at once.
- **Real-Time Validation**: For password strength or complex rules, show feedback as user types.

**Error Display**:
- Show error state with red border and error icon.
- Display error message below the field in red text.
- Scroll to and focus the first error field on submit failure.
- Summarize errors at top of form: "Please fix 3 errors below."

**Success Feedback**:
- Green checkmark icon inside field or next to label (optional).
- Success message or banner: "Student profile updated successfully."

### Field Types and Components

| Field Type | Use Case | Guidelines |
|---|---|---|
| **Text Input** | Names, addresses | Max width based on expected content length |
| **Email** | Email addresses | Use input type="email" for validation |
| **Password** | Authentication | Show/hide toggle, strength indicator |
| **Number** | Quantities, IDs | Use input type="number" with min/max |
| **Phone** | Phone numbers | Format automatically (e.g., (555) 123-4567) |
| **Date Picker** | Dates | Use native picker on mobile, custom on web |
| **Time Picker** | Scheduled times | 12-hour or 24-hour based on locale |
| **Dropdown/Select** | 5-15 options | Searchable if > 10 options |
| **Radio Buttons** | 2-5 mutually exclusive options | Display all options visible |
| **Checkboxes** | Multiple selections | Group related options |
| **Toggle Switch** | Binary on/off states | Immediate effect, no submit needed |
| **Text Area** | Multi-line text | Auto-resize or fixed with scroll |
| **File Upload** | Documents, images | Drag-and-drop + click to browse |

**Required Fields**:
- Mark required fields with red asterisk (*) next to label.
- Consider if fields are truly required; reduce friction by minimizing required fields.

### Auto-Complete and Typeahead

- Enable browser autocomplete for common fields (name, email, address) using appropriate `autocomplete` attributes.
- Implement typeahead/search for dropdown fields with many options (e.g., school selection, student search).
- Show loading spinner during search.
- Display "No results found" message when search returns empty.

## Loading States and Progress Indicators

### Loading Patterns

| Pattern | Use Case | Visual |
|---|---|---|
| **Spinner** | Short waits (< 5 seconds) | Circular spinner, centered |
| **Skeleton Screen** | Content loading | Gray placeholder boxes |
| **Progress Bar** | Long operations | Horizontal bar with % |
| **Infinite Scroll** | Paginated lists | Spinner at bottom |
| **Pull-to-Refresh** | Mobile list refresh | Pull down gesture |

**Loading Message Guidelines**:
- Generic: "Loading..."
- Specific: "Loading student records...", "Saving route changes..."
- Long operations: "Processing 250 students... (30 seconds remaining)"

### Progress Indicators

**For Long Operations** (> 5 seconds):
- Show determinate progress bar if duration is known: `[=========>    ] 65%`
- Show indeterminate progress if duration unknown: animated spinner
- Provide status updates: "Step 1 of 3: Validating data..."
- Allow cancellation if possible: [Cancel] button

**Background Operations**:
- Show toast/notification when operation starts: "Generating report..."
- Show completion notification: "Report ready! [View Report]"
- Don't block the UI; allow users to continue working.

## Accessibility (A11y) Requirements

### WCAG 2.1 AA Compliance

**Perceivable**:
- ✅ All images have descriptive `alt` text.
- ✅ Color is not the sole means of conveying information.
- ✅ Text contrast meets 4.5:1 ratio (3:1 for large text).
- ✅ UI components have 3:1 contrast against background.

**Operable**:
- ✅ All functionality available via keyboard.
- ✅ Focusable elements have visible focus indicators.
- ✅ No keyboard traps; users can navigate away from all elements.
- ✅ Touch targets are minimum 44x44px (iOS) or 48x48dp (Android).

**Understandable**:
- ✅ Labels and instructions are clear and concise.
- ✅ Error messages explain what went wrong and how to fix it.
- ✅ Consistent navigation and interaction patterns throughout.
- ✅ Avoid jargon; use plain language.

**Robust**:
- ✅ Use semantic HTML (`<button>`, `<nav>`, `<main>`, `<header>`).
- ✅ ARIA labels for icon-only buttons and dynamic content.
- ✅ Announce dynamic content changes to screen readers (`aria-live`).
- ✅ Test with screen readers (NVDA, JAWS, VoiceOver, TalkBack).

### Screen Reader Support

**Implementation Checklist**:
- Use semantic HTML elements instead of generic `<div>` and `<span>`.
- Provide `aria-label` for icon-only buttons: `<button aria-label="Delete student">🗑️</button>`
- Use `aria-describedby` to associate helper text with form fields.
- Mark decorative images with `alt=""` or `role="presentation"`.
- Announce page changes and loading states with `aria-live="polite"` regions.
- Test keyboard navigation: Tab, Shift+Tab, Enter, Space, Arrow keys.

## Mobile-Specific Guidelines (Android & iOS)

### Platform Conventions

**iOS-Specific**:
- **Navigation Bar**: Title centered, back button with chevron left (< Back).
- **Tab Bar**: Bottom navigation with icons + labels (5 tabs max).
- **Swipe Gestures**: Swipe right to go back, swipe on rows for actions.
- **Modal Presentation**: Full-screen or sheet style for forms and details.
- **Haptic Feedback**: Use haptics for selections, errors, and confirmations.
- **SF Symbols**: Use native SF Symbols for consistency with iOS.

**Android-Specific**:
- **App Bar**: Title left-aligned, back arrow on left, actions on right.
- **Bottom Navigation**: Bottom nav bar for primary sections (3-5 items).
- **Floating Action Button (FAB)**: Bottom-right for primary creation action.
- **Snackbar**: Temporary message at bottom with optional action button.
- **Material Icons**: Use Material Icons for consistency with Android.
- **Hardware Back Button**: Always handle back button press appropriately.

### Touch Interactions

**Gestures**:
- **Tap**: Primary selection and activation.
- **Long Press**: Contextual menu or selection mode.
- **Swipe**: Navigate between screens, reveal actions, dismiss.
- **Pinch/Zoom**: Maps, images (when applicable).
- **Pull-to-Refresh**: Reload data at top of scrollable lists.

**Feedback**:
- **Visual**: Highlight, ripple effect (Android), scale animation (iOS).
- **Haptic**: Light tap for selections, notification for errors/success.
- **Audio**: Minimal; only for critical alerts or confirmations.

### Mobile Form Considerations

- **Input Types**: Use appropriate keyboard types (`email`, `number`, `tel`, `url`).
- **Input Modes**: Optimize keyboard layout (`inputmode="numeric"` for PIN codes).
- **Autocomplete**: Enable autofill for passwords, addresses, payment info.
- **Field Focus**: Auto-focus first field; scroll field into view on focus.
- **Keyboard Avoiding**: Ensure content scrolls above keyboard; avoid obscured fields.

### Offline Functionality

- **Offline Indicator**: Show banner when device is offline: "⚠️ No internet connection"
- **Cached Data**: Display last known data with timestamp: "Updated 5 minutes ago"
- **Offline Actions**: Queue actions for sync when online; show pending status.
- **Sync Notification**: "Syncing 3 pending actions..." with progress indicator.

## Web-Specific Guidelines

### Responsive Design

**Mobile-First Approach**:
1. Design for smallest screen first (320px width).
2. Enhance layout for tablet breakpoint (768px).
3. Optimize for desktop (1024px+) with multi-column layouts.

**Adaptive Layouts**:
- **Mobile**: Single column, stacked content, full-width buttons.
- **Tablet**: Two columns for cards/lists, side-by-side forms.
- **Desktop**: Multi-column layouts, sidebar navigation, data tables.

**Touch vs. Mouse**:
- Detect touch capability; show hover states only for mouse users.
- Larger touch targets on touch devices (48px vs. 40px).
- Hide tooltips on touch devices; use tap-and-hold or info icons instead.

### Browser Compatibility

**Supported Browsers**:
- Chrome, Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile Safari (iOS 14+)
- Chrome Android (latest)

**Progressive Enhancement**:
- Core functionality works without JavaScript.
- Enhanced experience with JavaScript (live validation, animations).
- Graceful degradation for older browsers.

### Performance Optimization

**Loading Performance**:
- Lazy load images and components below the fold.
- Use skeleton screens or placeholders during data fetch.
- Implement code splitting to reduce initial bundle size.
- Optimize images: WebP format, responsive sizes, compression.

**Runtime Performance**:
- Debounce search inputs (300ms) to reduce API calls.
- Virtualize long lists (render only visible items).
- Use pagination or infinite scroll for large datasets.
- Minimize re-renders with proper state management.

### Desktop-Specific Features

- **Multi-Window Support**: Allow opening records in new tabs/windows.
- **Right-Click Menus**: Context menus for common actions (copy, edit, delete).
- **Drag-and-Drop**: Reorder lists, upload files, organize items.
- **Hover States**: Show additional information or actions on hover.
- **Tooltips**: Provide context on hover for icons and abbreviated text.

## Error Handling and Empty States

### Error States

**Error Message Structure**:
```
[Icon] Title: What went wrong
Description: Why it happened (optional)
Action: How to fix it or next steps

Example:
❌ Failed to Save Student Profile
The email address "john@" is not valid.
[Try Again]  [Cancel]
```

**Error Types**:

| Type | Severity | Display | Example |
|---|---|---|---|
| **Field Error** | Low | Inline below field | "Phone number must be 10 digits" |
| **Form Error** | Medium | Banner above form | "Please fix 3 errors before submitting" |
| **Page Error** | High | Full page or modal | "Failed to load student records" |
| **System Error** | Critical | Full page | "Service temporarily unavailable" |

**Error Recovery**:
- Provide actionable next steps: [Retry], [Go Back], [Contact Support].
- Preserve user input when possible (don't clear form on error).
- Log errors for debugging; show user-friendly messages to users.
- For network errors, automatically retry with exponential backoff (on mobile).

### Empty States

**When to Show**:
- No data exists (new account, no students enrolled).
- Search/filter returns no results.
- All items have been deleted or archived.

**Empty State Structure**:
```
[Illustration or Icon]
Title: Descriptive heading
Description: Why empty + what to do next
[Primary Action Button]

Example:
📋 No Students Enrolled
You haven't added any students yet. Get started by
enrolling your first student.
[Add Student]
```

**Empty State Guidelines**:
- Use friendly, encouraging tone (not alarming).
- Provide clear call-to-action to resolve the empty state.
- Use illustrations or icons to make empty states feel less stark.
- Differentiate between "no data" and "no results" (filtered view).

### No Results State (Search/Filter)

```
🔍 No Results Found
No students match your search for "Alice Johnson".
Try adjusting your filters or search term.
[Clear Filters]
```

## Notifications and Alerts

### Notification Types

| Type | Purpose | Persistence | Position |
|---|---|---|---|
| **Toast** | Non-critical info, feedback | 3-5 seconds | Bottom-center (web), top (mobile) |
| **Snackbar** | Action result with optional undo | 5-7 seconds | Bottom (mobile) |
| **Banner** | Important info, warnings | Dismissible | Top of page, below header |
| **Alert Dialog** | Critical messages requiring action | Until dismissed | Centered modal |
| **Badge** | Unread count, new items | Persistent | Icon top-right (notification bell) |

### Notification Guidelines

**Toast/Snackbar Messages**:
- ✅ "Student profile saved successfully"
- ✅ "Route updated"
- ✅ "3 students added to roster"
- ❌ "Error occurred" (too vague)
- ❌ "Success" (not descriptive)

**Action in Notifications**:
```
Toast: "Student deleted"  [Undo]
Snackbar: "Route published"  [View Route]
```

**Notification Stacking**:
- Show only one toast at a time; queue additional toasts.
- Banner alerts can coexist with toasts.
- Avoid notification overload; consolidate related events.

### Push Notifications (Mobile)

**When to Send**:
- Emergency alerts (safety incidents, route deviations).
- Time-sensitive updates (driver started route, student boarded).
- Daily summaries (route completed, attendance report).

**When NOT to Send**:
- Marketing messages or promotions.
- Non-urgent updates (use in-app notifications instead).
- During user-defined quiet hours (e.g., 10 PM - 7 AM).

**Push Notification Structure**:
```
Title: Clear, actionable (< 40 characters)
Body: Concise message (< 120 characters)
Action: Deep link to relevant screen
```

**Example**:
```
Title: "🚨 Emergency Alert"
Body: "Bus #42 has stopped unexpectedly"
Action: Open alert details screen
```

## Data Tables and Lists

### Table Design (Web)

**Table Structure**:
- **Header Row**: Column labels, sortable indicators (▲▼), filter icons.
- **Data Rows**: Consistent height, alternating row colors (zebra striping optional).
- **Actions Column**: Right-aligned, fixed width, icon buttons.

**Table Features**:
- **Sorting**: Click column header to sort; show indicator for active sort.
- **Filtering**: Provide filters above table; show active filter count.
- **Pagination**: Bottom of table; show "Showing 1-20 of 150 students".
- **Selection**: Checkbox in first column; bulk action toolbar appears when items selected.
- **Responsive**: On narrow screens, convert table to card layout.

**Empty Table State**:
```
┌─────────────────────────────────────────┐
│ Name       | Grade | Status | Actions  │
├─────────────────────────────────────────┤
│                                         │
│        📋 No Students Found              │
│     You haven't added any students yet. │
│           [Add Student]                 │
│                                         │
└─────────────────────────────────────────┘
```

### List Design (Mobile)

**List Item Structure**:
```
┌────────────────────────────────────┐
│ [Icon] Primary Text                │
│        Secondary text, metadata    │
│                     [Chevron Right]│
└────────────────────────────────────┘
```

**List Patterns**:
- **Simple List**: Title + subtitle, tap to navigate.
- **Action List**: Swipe left/right to reveal actions (delete, archive).
- **Expandable List**: Tap to expand/collapse details inline.
- **Multi-Select List**: Long-press to enter selection mode; checkboxes appear.

**List Performance**:
- Use virtualized lists for > 100 items (FlatList, RecyclerView).
- Implement pagination or infinite scroll for large datasets.
- Show "Loading more..." spinner at bottom during fetch.

## Animation and Transitions

### Motion Principles

- **Purpose**: Animations should have a purpose (guide attention, provide feedback, indicate relationship).
- **Performance**: Maintain 60fps; use GPU-accelerated properties (transform, opacity).
- **Duration**: 150-300ms for micro-interactions, 300-500ms for transitions.
- **Easing**: Use easing functions (ease-out for enter, ease-in for exit).

### Common Animations

| Element | Animation | Duration | Easing |
|---|---|---|---|
| **Modal Open** | Fade + scale up | 250ms | ease-out |
| **Modal Close** | Fade + scale down | 200ms | ease-in |
| **Drawer Slide** | Slide from edge | 300ms | ease-in-out |
| **Toast Appear** | Slide up + fade in | 200ms | ease-out |
| **Button Hover** | Scale up, lighten | 150ms | ease-out |
| **Loading Spinner** | Infinite rotate | 1000ms | linear |
| **Page Transition** | Fade or slide | 300ms | ease-in-out |

### Reduced Motion

**Accessibility Consideration**:
- Detect `prefers-reduced-motion` media query (web) or OS setting (mobile).
- Disable or simplify animations for users with motion sensitivity.
- Replace animations with instant transitions or simple fades.

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Internationalization (i18n) and Localization (l10n)

### Design for Multiple Languages

**Text Expansion**:
- Allow 30-40% expansion for translated text (German, French are longer than English).
- Use flexible layouts that accommodate variable text lengths.
- Avoid fixed-width containers for text content.
- Test UI with longest translations.

**Right-to-Left (RTL) Support**:
- Mirror layouts for RTL languages (Arabic, Hebrew).
- Flip directional icons (arrows, chevrons).
- Keep icons and logos consistent (don't flip).
- Test thoroughly with RTL languages.

**Date and Number Formatting**:
- Use locale-aware formatting libraries (Intl API, date-fns, moment.js).
- Format dates per locale: "MM/DD/YYYY" (US) vs. "DD/MM/YYYY" (UK).
- Format numbers: "1,234.56" (US) vs. "1.234,56" (Germany).
- Use appropriate currency symbols and placement.

**String Externalization**:
- Never hardcode user-facing strings; use translation keys.
- Avoid string concatenation (word order varies by language).
- Use pluralization rules (1 item, 2 items, 5 items may differ by language).

## Performance Guidelines

### Perceived Performance

**Perceived Speed > Actual Speed**:
- Show skeleton screens or placeholders immediately (feels faster).
- Optimistic updates: update UI immediately, sync with server in background.
- Preload content: predict user's next action and preload data.

**Loading States**:
- 0-100ms: Instant (no indicator needed)
- 100ms-1s: Brief wait (show spinner)
- 1-5s: Noticeable wait (show progress bar or skeleton)
- 5s+: Long wait (show progress %, allow cancellation)

### Optimization Techniques

**Web Applications**:
- Lazy load images with `loading="lazy"` attribute.
- Code split by route; load components on demand.
- Debounce search inputs to reduce API calls.
- Use CDN for static assets.
- Implement service workers for offline caching.

**Mobile Applications**:
- Use FlatList/RecyclerView for long lists (virtualization).
- Optimize images: resize, compress, use appropriate formats.
- Minimize bundle size: tree-shake unused libraries.
- Cache network responses; implement offline-first strategy.
- Lazy load screens and components not immediately visible.

## Usability Best Practices

### Minimize Cognitive Load

- **Chunking**: Group related information into digestible sections (7±2 items per group).
- **Progressive Disclosure**: Show advanced options only when needed (accordion, "Show more").
- **Defaults**: Pre-select sensible defaults to reduce decision-making.
- **Recognition over Recall**: Use dropdowns instead of free text when options are limited.

### Discoverability

- **Affordances**: Design elements to suggest their function (buttons look clickable).
- **Signifiers**: Use labels, icons, and colors to indicate functionality.
- **Feedback**: Provide immediate feedback for all interactions (hover, click, success/error).
- **Consistency**: Use familiar patterns; don't reinvent common UI elements.

### Error Prevention

- **Constraints**: Disable invalid options (e.g., disabled dates in date picker).
- **Confirmation**: Ask for confirmation before destructive actions.
- **Validation**: Validate inputs inline before form submission.
- **Defaults**: Pre-fill fields with safe defaults when applicable.
- **Undo**: Provide undo for reversible actions (delete with "Undo" toast).

### User Control and Freedom

- **Exit Options**: Always provide a way to cancel or go back.
- **Undo/Redo**: Support undo for content editing and data changes.
- **Escape Hatch**: Allow users to bypass complex workflows if needed.
- **Save Progress**: Auto-save drafts for long forms; allow resuming later.

## Implementation Checklist

### Before Launch

**Functionality**:
- [ ] All features work as expected across supported browsers/devices.
- [ ] Forms validate correctly; error messages are clear and actionable.
- [ ] Unsaved changes prompt confirmation before navigation.
- [ ] Keyboard navigation works for all interactive elements.
- [ ] Escape key closes all dialogs and modals.

**Visual Design**:
- [ ] No internal IDs displayed; all references use human-readable names.
- [ ] Button placement is consistent across all screens.
- [ ] Layout is consistent (header, navigation, content areas).
- [ ] Typography scale is applied consistently.
- [ ] Color contrast meets WCAG 2.1 AA standards.

**Accessibility**:
- [ ] All images have descriptive alt text.
- [ ] Form fields have associated labels.
- [ ] Focus indicators are visible for all interactive elements.
- [ ] Screen reader announces all dynamic content changes.
- [ ] Keyboard shortcuts are documented and functional.

**Responsive Design**:
- [ ] UI works on mobile (320px), tablet (768px), and desktop (1024px+).
- [ ] Touch targets are minimum 44x44px on mobile.
- [ ] Text is readable without zooming on mobile devices.
- [ ] Content reflows gracefully at all breakpoints.

**Performance**:
- [ ] Initial page load < 3 seconds on 3G connection.
- [ ] Images are optimized and lazy-loaded.
- [ ] No layout shift (CLS < 0.1).
- [ ] Animations are smooth (60fps).

**Usability**:
- [ ] Empty states provide clear next actions.
- [ ] Error messages are user-friendly and actionable.
- [ ] Loading states are shown for all async operations.
- [ ] Confirmations are shown only for destructive actions.
- [ ] Users can complete primary tasks with minimum clicks.

## Related Documents

- [../03_architecture_design/design_guidelines.md](../03_architecture_design/design_guidelines.md) — Microservice design patterns
- [../04_coding_standards/secure_coding.md](../04_coding_standards/secure_coding.md) — Security-focused coding rules
- [../../UiDesign/AdminDashboard.md](../../UiDesign/AdminDashboard.md) — Admin Dashboard UI specifications
- [../../UiDesign/DriverApp.md](../../UiDesign/DriverApp.md) — Driver mobile app UI specifications
- [../../UiDesign/ParentPortal.md](../../UiDesign/ParentPortal.md) — Parent portal UI specifications

## References and Further Reading

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) — Web Content Accessibility Guidelines
- [Material Design Guidelines](https://material.io/design) — Google's design system
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) — Apple's iOS/macOS design principles
- [Nielsen Norman Group](https://www.nngroup.com/articles/) — UX research and best practices
- [A11y Project](https://www.a11yproject.com/) — Accessibility resources and checklist
