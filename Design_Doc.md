# UI Refactor Design Document

## 1. Design Goals
1.  **Professional HRIS Aesthetic**: Transition from generic Bootstrap to a polished, purpose-built HR application look.
2.  **Focus on Data**: Elevate attendance metrics and team structures as the primary visual elements.
3.  **Strict Responsiveness**: Eliminate all horizontal scrolling on desktop/tablet and ensure touch-friendly targets on mobile.
4.  **Simplified Navigation**: Move from a dual-navbar system (top + sub) to a unified Sidebar navigation structure.
5.  **Performance & Cleanliness**: Remove visual clutter (profile pictures, map placeholders) to speed up cognitive processing.

## 2. Visual Design Direction
-   **Theme**: "Modern Enterprise Clean"
-   **Color Palette**:
    -   **Primary (Brand)**: `#0D6EFD` (Royal Blue) - Used for primary actions, active states, and key data points.
    -   **Secondary (Accent)**: `#6C757D` (Slate Gray) - Used for secondary text, borders, and inactive states.
    -   **Success**: `#198754` (Emerald Green) - Attendance "Present" status, positive trends.
    -   **Warning**: `#FFC107` (Amber) - "Excused" status, alerts.
    -   **Danger**: `#DC3545` (Crimson) - "Absent" status, destructive actions.
    -   **Background**: `#F8F9FA` (Off-white/Light Gray) for the main app background.
    -   **Surface**: `#FFFFFF` (White) for cards and containers.
-   **Typography**:
    -   **Font Family**: System UI Stack (`-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `Helvetica`, `Arial`, sans-serif).
    -   **Headings**: Semi-bold (600), Dark Gray (`#212529`).
    -   **Body**: Regular (400), Slate Gray (`#495057`).
-   **Shadows**: Soft, diffused shadows for depth (e.g., `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1)`).
-   **Borders**: Subtle 1px borders (`#DEE2E6`) for definition without heavy lines.
-   **Radius**: `12px` for Cards, Modals, and Dropdowns; `6px` for Buttons and Inputs.

## 3. Layout System Architecture
### 3.1 Core Layout Structure
The application will move to a **Sidebar Layout Pattern**.
-   **Sidebar (Left)**:
    -   **Width**: `260px` (Desktop), Collapsible `80px` (Tablet), Hidden/Drawer (Mobile).
    -   **Content**: Logo/Brand (Top), Navigation Links (Middle), User Profile/Logout (Bottom).
    -   **Behavior**: Fixed position, scrollable independently if needed.
-   **Main Content Area (Right)**:
    -   **Margin**: `margin-left: 260px` (Desktop).
    -   **Padding**: `32px` (Desktop), `24px` (Tablet), `16px` (Mobile).
    -   **Background**: `#F8F9FA`.
    -   **Max-Width**: `1400px` (Centered content for ultra-wide screens).

### 3.2 Grid System
-   **Base**: 12-column Grid.
-   **Gaps**: `24px` (Desktop), `16px` (Mobile).
-   **Container**: Fluid width with max-width constraint.

## 4. Responsive Strategy
### 4.1 Breakpoints
-   **Mobile**: `< 768px` (Sm)
-   **Tablet**: `768px - 1024px` (Md)
-   **Desktop**: `> 1024px` (Lg/Xl)

### 4.2 Behavior Rules
-   **Sidebar**:
    -   **Desktop**: Always visible, expanded.
    -   **Tablet**: Collapsed to icons-only (users hover to expand or click to nav).
    -   **Mobile**: Hidden behind a "Hamburger" menu button. Opens as a slide-over drawer.
-   **Tables**:
    -   **Desktop/Tablet**: Standard row/column layout.
    -   **Mobile**: **Card View**. Each table row transforms into a standalone card. Do NOT use horizontal scroll for primary data.
-   **Dashboard Cards**:
    -   **Desktop**: 4 per row (3 columns each).
    -   **Tablet**: 2 per row (6 columns each).
    -   **Mobile**: 1 per row (12 columns each, stacked).
-   **Forms**:
    -   **Desktop**: Multi-column inputs (e.g., Name + Phone on one row).
    -   **Mobile**: Single-column inputs (stacked vertically 100% width).

## 5. Navigation System
### 5.1 Proposed Sidebar Menu
1.  **Dashboard** (Home Icon)
2.  **Attendance** (Checklist Icon)
    -   *Sub-menu*: Mark Attendance, History Log
3.  **Teams** (Users Group Icon)
4.  **Members** (Person Icon)
5.  **Reports** (Chart Pie Icon)
6.  **Admin Settings** (Gear Icon - Admin Only)

*(Note: "My Stats" replaces "Dashboard" for non-admin users)*

### 5.2 Header (Mobile Only)
-   **Left**: Hamburger Menu Trigger.
-   **Center**: Page Title / Logo.
-   **Right**: Theme Toggle (Light/Dark).

## 6. Dashboard Redesign (Admin View)
### 6.1 Top Row: Key Performance Indicators (KPIs)
-   **Layout**: 4-Card Grid.
-   **Card 1: Today's Attendance** (Big Number + % vs Last Week).
-   **Card 2: Active Members** (Total Count).
-   **Card 3: Upcoming Event** (Next Sunday Mass Team).
-   **Card 4: Pending Actions** (e.g., "3 Excuses to Review" - *Future Feature placeholder*).

### 6.2 Middle Row: Visual Trends
-   **Left (66%)**: **Attendance Trend Graph**. Line chart showing attendance % over the last 12 weeks.
    -   *Container*: White Card, ample padding.
-   **Right (33%)**: **Team Distribution**. Doughnut chart showing member split by Voice/Role (if data exists) or Sunday Team sizes.

### 6.3 Bottom Row: Quick Actions & Recent Activity
-   **Left**: "Needs Attention" List (Members with low attendance).
-   **Right**: Quick Links (Mark Today's Mass, Add Member).

## 7. Forms & Input Design
-   **Input Fields**:
    -   Height: `48px` (Touch friendly).
    -   Border: `1px solid #CED4DA`.
    -   Focus Profile: thick Primary border + subtle shadow ring.
    -   Label: Top-aligned, semi-bold.
-   **Select Dropdowns**: Custom styled (using React-Select or styled native select) to match input height.
-   **Validation**: Inline error messages in Red (`#DC3545`) below the field.
-   **Submission**:
    -   Primary Action (Save): Solid Blue, Right aligned.
    -   Secondary Action (Cancel): Outline Gray, Left of Primary.

## 8. Tables & Data Presentation
-   **Style**: "Clean Rows" (No vertical dividers).
-   **Header**: Light Gray background (`#F8F9FA`), Bold text, sticky position.
-   **Rows**: White background, hover effect (`#F1F3F5`).
-   **Actions Column**:
    -   Use an "Ellipsis" (...) Dropdown menu for Edit/Delete actions to save space.
-   **Status Badges**: Pill-shaped, small text, soft background colors.
    -   *Present*: Green Text on Light Green Bg.
    -   *Absent*: Red Text on Light Red Bg.
    -   *Excused*: Amber Text on Light Amber Bg.

## 9. Component Library Specification
### 9.1 `StatCard`
-   Props: `title`, `value`, `icon`, `trend`, `trendColor`.
-   Style: Flex-column, Icon top-right absolute or flex-start.

### 9.2 `DataGrid`
-   Props: `columns`, `subRows` (for mobile), `actions`.
-   Logic: Handles the Mobile Card vs Desktop Table switch internally.

### 9.3 `PageHeader`
-   Props: `title`, `breadcrumbs`, `actionButton`.
-   Style: Flex-row, title left, action button (e.g., "Add Member") right.

### 9.4 `StatusBadge`
-   Props: `status` (Enum).
-   Logic: Maps status string to color token.

## 10. Interaction & Microinteractions
-   **Buttons**: Scale down (98%) on click/tap active state.
-   **Sidebar**: Smooth width transition (`0.3s ease-in-out`).
-   **Modals**: Fade in + Slide down interaction.
-   **Toasts**: Slide in from Top-Right (Desktop) or Bottom-Center (Mobile).

## 11. Accessibility Standards (WCAG Compliance)
-   **Contrast**: Text ratio > 4.5:1 against background.
-   **Keyboard Nav**: All interactive elements (Inputs, Buttons, Dropdowns) must be reachable via `Tab`.
-   **Focus Indicators**: Visible focus rings for keyboard users (do not remove `outline`).
-   **ARIA**: Use `aria-label` for Icon-only buttons (Edit, Delete, Menu).
-   **Semantic HTML**: Use `<main>`, `<nav>`, `<aside>`, `<header>`, `<table>`, `<form>`.

## 12. Error & Empty States
-   **Empty Tables**: Display a centered illustration (SVG) with a text "No records found" and a "Create New" button.
-   **Loading**: Use Skeleton Screens (shimmer effect) instead of generic spinners for Page/Card loading.
-   **404**: Dedicated "Page Not Found" with a "Back to Dashboard" button.

## 13. Performance Considerations
-   **Code Splitting**: Lazy load heavy Chart.js components.
-   **Render Optimization**: Memoize heavy table rows or list items.
-   **CSS**: Use CSS Modules or scoped styles to prevent leakage.

## 14. Migration Plan From Current UI
1.  **Skeleton Layout**: Create the `Layout` component (Sidebar + Main Wrapper) and wrap `App.js` routes.
2.  **Theme Setup**: Define CSS variables/Tokens in `index.css`.
3.  **Component Refactor - Batch 1**: Button, Input, Card.
4.  **Page Migration**:
    -   Dashboard (Admin & User stats).
    -   Manage Members (Form & List).
    -   Attendance Log.
    -   Teams.
5.  **Mobile Optimization**: Implement the Table-to-Card transformation logic.
6.  **Cleanup**: Remove old Bootstrap classes not mapped to new system.

## 15. Implementation Guidelines (Frontend)
-   **Framework**: Continue using `React-Bootstrap` but override default styles with custom CSS Modules or Styled Components for the bespoke layout.
-   **Icons**: Bootstrap Icons (`bi-`) are sufficient; ensure size consistency (`1.2rem`).
-   **State**: Move simple UI state (Sidebar open/close) to React Context (`LayoutContext`).

## 16. QA Checklist For Zero Layout Errors
-   [ ] **320px Check**: Does the Login screen fit without scroll?
-   [ ] **Mobile Nav**: Does the drawer open/close smoothly? Does it block interactions behind it?
-   [ ] **Table Text**: Do long names truncate with ellipsis (`text-overflow: ellipsis`) or wrap gracefully?
-   [ ] **Card Height**: Are cards in the same row equal height?
-   [ ] **Modals on Mobile**: Do modals scroll internally if content is too long?
-   [ ] **Charts**: Do charts resize dynamically when window is resized?
-   [ ] **Profile/Map Check**: Confirm NO profile pictures or maps are present in the DOM.
