---
title: Quick Start with React | Hugeicons Documentation
description: Install @hugeicons/react and the free icon package, then render your first Hugeicons icon in a React app within minutes — works with Next.js and Vite.
---

import { TOTAL_FREE_ICONS_COUNT } from '@constant/common'

# Quick Start with React (Free)

Get up and running with Hugeicons Free in your React app. This guide covers prerequisites, installing the React component and free icon package, and rendering your first icon.

## Video Tutorial

Watch this step-by-step guide on using Hugeicons in React for free:

<div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', maxWidth: '100%', marginTop: '1rem', marginBottom: '2rem' }}>
  <iframe
    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    src="https://www.youtube.com/embed/MM91mPugHuE"
    title="How to use Hugeicons in React for Free"
    frameBorder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowFullScreen
  />
</div>

## Prerequisites

Before you start, make sure you have:

- Node.js and npm (or Yarn / pnpm) installed
- A React app set up (Create React App, Next.js, Vite, etc.)
- Basic familiarity with JSX and components

## 1. Install Packages

First, install the React component package:

```sh npm2yarn copy
npm install @hugeicons/react
```

Then, install the free icon pack:

```sh npm2yarn copy
npm install @hugeicons/core-free-icons
```

Our free package, `@hugeicons/core-free-icons`, includes 5,900+ icons in 1 style (Stroke Rounded only) you can use in any projects at no cost. For more styles, upgrade to Hugeicons Pro.

## 2. Basic Usage

Import the `HugeiconsIcon` component and any icon from the free package to get started.

```jsx copy
import { HugeiconsIcon } from '@hugeicons/react'
import { Notification03Icon } from '@hugeicons/core-free-icons'

function App() {
  return <HugeiconsIcon icon={Notification03Icon} size={24} color="currentColor" strokeWidth={1.5} />
}
```

You can adjust the `size`, `color`, and `strokeWidth` props to match your design system.

## 3. Next steps

- Learn more about all available props on the [`HugeiconsIcon` wrapper](/integrations/react/wrapper)
- Explore interactive patterns on the [Examples with React](/integrations/react/examples) page
- When you're ready for more icons and styles, check out [Hugeicons Pro with React](/integrations/react/pro)---
title: Best Practices with React | Hugeicons Documentation
description: Recommendations for using Hugeicons in React — efficient imports, tree-shakable styles, theming with currentColor, accessibility, and SSR-safe patterns.
---

# Best Practices with React

This guide collects practical recommendations for using Hugeicons in React so your icons stay fast, consistent, and accessible.

## Import icons efficiently

Always import only the icons you need from the specific package:

```jsx copy
import { HugeiconsIcon } from '@hugeicons/react'
import { Notification03Icon } from '@hugeicons/core-free-icons'
// or, for Pro:
// import { Notification03Icon } from '@hugeicons-pro/core-stroke-rounded'
```

Avoid wildcard imports (e.g. `import * as Icons from ...`) because they prevent bundlers like Webpack, Vite, or Next.js from tree‑shaking unused icons and can increase your bundle size.

## Keep icons accessible

Use different patterns for decorative vs meaningful icons:

- **Decorative icons** (purely visual): keep them inside elements that already have accessible text.
- **Meaningful icons** (e.g., trash, download): make sure there is a label.

```jsx copy
// Icon with visible label (screen readers read the text)
<button type="button">
  <HugeiconsIcon icon={DownloadIcon} size={18} className="mr-1" />
  Download
</button>

// Icon-only button with aria-label
<button type="button" aria-label="Delete">
  <HugeiconsIcon icon={Delete01Icon} size={18} />
</button>
```

Avoid relying on icon shape alone to convey critical information; pair icons with text or tooltips where possible.

## Use `altIcon` + `showAlt` for state

Instead of conditionally rendering two separate icons, use `altIcon` and `showAlt` on the same `HugeiconsIcon`:

```jsx copy
import { ViewIcon, ViewOffSlashIcon } from '@hugeicons-pro/core-stroke-rounded'
 
export function PasswordToggle() {
  const [visible, setVisible] = useState(false)
 
  return (
    <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'}>
      <HugeiconsIcon icon={ViewIcon} altIcon={ViewOffSlashIcon} showAlt={visible} size={18} />
    </button>
  )
}
```

This keeps your JSX simpler and ensures both states share the same sizing and styling.

## Create an app-level `Icon` wrapper

In many apps it’s helpful to create your own `Icon` component that forwards props to `HugeiconsIcon` while enforcing project-wide defaults for size, color, and stroke width.

```tsx copy
import { HugeiconsIcon } from '@hugeicons/react'
import type { ComponentProps } from 'react'

type IconProps = ComponentProps<typeof HugeiconsIcon>

export function Icon({
  size = 16,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <HugeiconsIcon
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      {...rest}
    />
  )
}
```

Now you can use `Icon` throughout your project and adjust defaults (size, color, stroke width, theming) in one place without touching all call sites.
```jsx copy
<button type="button" aria-label="Delete">
  <Icon icon={Delete01Icon} size={18} />
</button>
```
Centralizing patterns like this keeps styling and accessibility consistent across your app.

## Plan for dark mode and themes

When supporting dark mode, prefer `currentColor` and theme-aware classes instead of hard‑coding colors:

```jsx copy
<div className="text-slate-700 dark:text-slate-200">
  <HugeiconsIcon icon={Moon02Icon} size={20} color="currentColor" />
</div>
```

If you need different styles per theme (e.g., duotone in dark mode), you can pair `altIcon` with your theme state.

## Name and organize icons consistently

- Use the shorter `*Icon` names (`SearchIcon`) for readability.
- Use style-specific names (`SearchStrokeRounded`) only when you need multiple styles of the same icon in one file.
- Group icons by domain in your codebase (e.g., `icons/navigation.ts`, `icons/forms.ts`) to make reuse easier.

```ts copy
// icons/navigation.ts
export { HomeIcon, SearchIcon, Notification03Icon, UserIcon } from '@hugeicons/core-free-icons'
```

Then import from your own modules instead of raw packages in components to keep imports tidy and consistent.---
title: React Code Examples | Hugeicons Documentation
description: Practical React patterns using HugeiconsIcon — search inputs, buttons, navigation menus, dropdowns, and lists powered by Hugeicons free or Pro icons.
---

# Examples with React

This page shows practical patterns for using `HugeiconsIcon` in common React UI components.  
All examples assume you've already installed `@hugeicons/react` and either the free or Pro icon packages.

## Search bar with clear button

A search input that shows a clear button when text is entered:

```jsx copy
import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { SearchIcon, CancelCircleIcon } from '@hugeicons/core-free-icons'   
 
function SearchBar() {
    const [value, setValue] = useState('')
 
    return (
        <div>
            <input type="text" value={value} onChange={e => setValue(e.target.value)} placeholder="Search..." />
            <HugeiconsIcon icon={SearchIcon} altIcon={CancelCircleIcon} showAlt={value.length > 0} onClick={() => value.length > 0 && setValue('')} />
        </div>
    )
}
```

## Favorite toggle button with Pro Icons

A favorite toggle button that switches based on the state:

```jsx copy
import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { FavouriteStrokeStandard } from '@hugeicons-pro/core-stroke-standard'
import { FavouriteSolidStandard } from '@hugeicons-pro/core-solid-standard'
 
export function FavoriteButton() {
  const [isFavorite, setIsFavorite] = useState(false)
 
  return (
    <button onClick={() => setIsFavorite(!isFavorite)}>
      <HugeiconsIcon icon={FavouriteStrokeStandard} altIcon={FavouriteSolidStandard} showAlt={isFavorite} size={20} />
    </button>
  )
}
```

## Bottom navigation with active state

A navigation bar that uses different icon styles to indicate the active state:

```jsx copy
import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { HomeIcon, SearchIcon, Notification03Icon, UserIcon } from '@hugeicons/core-free-icons'
import {
    HomeIcon as HomeDuotone,
    SearchIcon as SearchDuotone,
    Notification03Icon as NotificationDuotone,
    UserIcon as UserDuotone,
} from '@hugeicons-pro/core-duotone-rounded'

function NavigationBar() {
    const [activeTab, setActiveTab] = useState('home')

    const NavItem = ({ id, SolidIcon, DuotoneIcon }) => (
        <button onClick={() => setActiveTab(id)} className={`nav-item ${activeTab === id ? 'active' : ''}`}>
            <HugeiconsIcon icon={SolidIcon} altIcon={DuotoneIcon} showAlt={activeTab === id} size={24} />
        </button>
    )

    return (
        <nav>
            <NavItem id="home" SolidIcon={HomeIcon} DuotoneIcon={HomeDuotone} />
            <NavItem id="search" SolidIcon={SearchIcon} DuotoneIcon={SearchDuotone} />
            <NavItem id="notifications" SolidIcon={Notification03Icon} DuotoneIcon={NotificationDuotone} />
            <NavItem id="profile" SolidIcon={UserIcon} DuotoneIcon={UserDuotone} />
        </nav>
    )
}
```

## Next steps

- For full prop details, see the [`HugeiconsIcon` wrapper](/integrations/react/wrapper) page  
- For setup instructions, visit [Quick Start with React (Free)](/integrations/react/quick-start) or [Hugeicons Pro with React](/integrations/react/pro)