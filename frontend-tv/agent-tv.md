# TV Digital Menu Display System - Technical Specification & Integration Guide

## 1. System Overview & Architecture

This document serves as the implementation specification for `frontend-tv`, a dynamic digital menu board display system tailored for TV screens (16:9 landscape aspect ratio).

The core architecture relies on:
1. **Dynamic Background Rendering (`bg-image`)**: Utilizing asset-based textures located in `frontend-tv/src/assets` (handling light/dark torn-paper aesthetic themes).
2. **Dashboard-Driven Layout (Screen Layout Builder / Screenly Builder)**: Views and screen configurations are managed dynamically from the backend/dashboard. The TV frontend fetches layout JSON schemas and renders appropriate views, allowing creation and assignment of custom menu views per TV screen.

---

## 2. Visual & Aesthetic Analysis of Design Assets

Analysis of provided design templates (`Screenshot_2026-08-04-14-23-40-27.jpg`, `Screenshot_2026-08-04-14-23-58-94.jpg`, `Screenshot_2026-08-04-14-23-45-37.jpg`, `Screenshot_2026-08-04-14-23-52-24.jpg`):

### A. Split Layout Concept (Torn Paper Divider)
- **Visual Structure**: Screen is split into two primary zones using a high-contrast diagonal/vertical torn-paper border effect.
- **Dark Zone (Left or Accent)**: Dark textured background (chalkboard / slate effect `#121212` to `#1e1e1e`), featuring bold display typography, high-impact imagery (e.g. Tacos, Doner, Extras, Salads), and vibrant orange/green highlight banners (`#E65100`, `#2E7D32`).
- **Light Zone (Right or Center)**: Textured white/cream paper background (`#F9F8F6` to `#ECE9E4`), clean grid layouts, dark text (`#1A1A1A`), step-by-step selection options (Meat, Sauces, Extras), and rounded pricing badges.

### B. Typography & Badging System
- **Headers**: Distressed/chalkboard display font for title headers ("MAKE YOUR OWN TACOS", "CLASSIC FORMULAS", "OUR EXTRAS").
- **Sub-headers**: Script/Handwritten fonts ("Meat", "Sauces", "Extra") or bold condensed uppercase badges with solid color fills.
- **Price Badges**: Textured paper tag shapes with price overlays (`8,50€`, `12,90€`, `+1,00€`).
- **Ribbons & Seals**: Circular badge seal overlay at top center (`"SERVED WITH FRIES AND DRINK"`) bridging the split screen gap.

---

## 3. Key Layout Models & Component Specifications

The TV system must support 4 primary visual layout templates generated via the **Screen Layout Builder**:

### Layout 1: Builder / Customizer View (`Make Your Own Tacos`)
- **Left Hero Section (40% width)**:
  - Header badge: Logo + Title ("MAKE YOUR OWN TACOS").
  - Prominent high-res product showcase image (Overlapped Taco).
  - Add-on callout banner (e.g., French Fries +1,00€ badge).
- **Right Customization Steps (60% width)**:
  - **Tier Pricing Header**: 1 Meat (8.50€), 2 Meats (9.50€), 3 Meats (12.00€).
  - **Category Grids**:
    - *Meat Section*: Image icons + text (Cordon Bleu, Nuggets, Chicken, Steak, Kofte, Tenders).
    - *Sauces Section*: Circular condiment icons (Algerian, Barbeque, Burger, Blanche, Ketchup, Samourai, Mayonnaise, Harissa).
    - *Extras Section (+1.00€)*: Grid items (Raclette, Cheddar, Boursin, Cooked Onion, Bacon, Chevre, Turkish Sausage, Egg).

### Layout 2: Dual Formula Split (`Classic Formulas` vs `The Chef's Formulas`)
- **Left Side (Dark Theme - Classic Formulas)**:
  - Title banner with price tag (`12,90€`).
  - Items list: Image on left/right + Title + Detailed ingredients summary + Price tag.
  - Examples: Chubby Meat Doner, Meat Doner, Chubby Chicken Doner, Chicken Doner, Chubby Meatballs, Meatballs Doner.
- **Center Divider Badge**: "SERVED WITH FRIES AND DRINK".
- **Right Side (Light Theme - Chef's Formulas)**:
  - Title banner with price tag (`12,90€`).
  - Items list: Deluxe Sandwich, BBQ Sandwich, Paris Sandwich, Jalapeno Sandwich, Cheddar Mantar Sandwich, Classic Cheese Sandwich.

### Layout 3: Three-Column Modular View (`Extras` | `Kids Menu` | `Desserts`)
- **Left Column (Dark Background - Extras)**:
  - Heading: "OUR EXTRAS".
  - Items with quantity badges (`5X`, `1X`) & price tags: Tedners, Wings, Mozza Sticks, Jalapenos, Nuggets, Cheesy Bread.
- **Center Column (Light Paper Card - Kids Menu)**:
  - Fun play/multicolor title: "MENU KIDS" + Price (`12,90€`).
  - Options grid: Cheeseburger + Fries OR Fish + Fries OR 4 Nuggets + Fries.
  - Included items: Served with Capri-Sun / Pom'Potes + Kinder Surprise.
- **Right Column (Dark Background - Desserts)**:
  - Heading: "OUR DESSERTS".
  - Grid of dessert cards (Image + Name + Subtitle + Price tag): Tiramisu Speculoos, Yogurt, Chocolate Fondant, Brownie, Pie Daim, Sundae Caramel.

### Layout 4: Formula & Platter View (`Salad Formulas` vs `Plate Formulas`)
- **Left Side (Dark Background - Salads)**:
  - Heading banner: "SALAD FORMULAS" (Green accent theme) + `12,90€`.
  - Item list with full description paragraphs: Mediterranean Salad, Mexican Salad, Special Salad, Tuna Salad.
  - High-impact bottom image: Salad bowl + beverage display.
- **Right Side (Light Background - Plates & Steaks)**:
  - Heading banner: "PLATE FORMULAS" + `12,90€`.
  - Item list: Smoked Meat Platter, Mr. Meat Lamb Chops, Buffalo Legend, Harmoni.
  - Special highlight row: Mexican Style Grilled Beef Tenderloin (`14,00€`).
  - Bottom showcase image: Wooden steak platter setup.

---

## 4. Frontend Asset & Background System Integration

Assets are stored under `frontend-tv/src/assets`:

```
frontend-tv/src/assets/
├── images/
│   ├── backgrounds/
│   │   ├── bg-dark-slate.jpg      # Dark chalkboard background
│   │   ├── bg-light-paper.jpg     # Light paper texture
│   │   ├── torn-paper-edge-left.png
│   │   └── torn-paper-edge-right.png
│   ├── items/                     # Product catalog images
│   └── badges/                    # Price tag badges, ribbons
```

### CSS Background & Theme Class Implementation
```scss
/* Theme & Background Overlay Structure */
.tv-screen-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
  font-family: 'Montserrat', 'Oswald', sans-serif;
  display: flex;

  /* Base Background Asset Handling */
  &.theme-dark {
    background: url('../assets/images/backgrounds/bg-dark-slate.jpg') center/cover no-repeat;
    color: #ffffff;
  }

  &.theme-light {
    background: url('../assets/images/backgrounds/bg-light-paper.jpg') center/cover no-repeat;
    color: #1a1a1a;
  }

  /* Dynamic Split Screen Rendering */
  .split-zone-left {
    flex: 1;
    background: url('../assets/images/backgrounds/bg-dark-slate.jpg') center/cover no-repeat;
    position: relative;
    padding: 2rem;
  }

  .split-zone-right {
    flex: 1;
    background: url('../assets/images/backgrounds/bg-light-paper.jpg') center/cover no-repeat;
    position: relative;
    padding: 2rem;
  }

  .torn-paper-divider {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 60px;
    background: url('../assets/images/backgrounds/torn-paper-edge-left.png') repeat-y center;
    z-index: 10;
    transform: translateX(-50%);
  }
}
```

---

## 5. Dashboard Integration & Screen Layout Builder Data Structure

The TV frontend receives a dynamic screen configuration payload generated by the Dashboard's **Screen Layout Builder**. The rendering engine translates JSON into corresponding TV layouts.

### Dynamic JSON Payload Contract (`ScreenLayoutConfig`)

```json
{
  "screenId": "tv-display-01",
  "screenName": "Main Entrance Menu Board",
  "layoutType": "SPLIT_CUSTOMIZER", 
  "refreshInterval": 300,
  "theme": {
    "leftZone": "dark",
    "rightZone": "light",
    "bgAssets": {
      "darkBg": "assets/images/backgrounds/bg-dark-slate.jpg",
      "lightBg": "assets/images/backgrounds/bg-light-paper.jpg"
    }
  },
  "sections": [
    {
      "zone": "left",
      "type": "HERO_PROMO",
      "title": "MAKE YOUR OWN TACOS",
      "badgeLogo": "assets/images/badges/burger-world-logo.png",
      "heroImage": "assets/images/items/tacos-hero.png",
      "addonBadge": {
        "text": "French Fries",
        "price": "+1,00€",
        "image": "assets/images/items/fries.png"
      }
    },
    {
      "zone": "right",
      "type": "CUSTOMIZER_GRID",
      "pricingTiers": [
        { "label": "1 Meat", "price": "8,50€" },
        { "label": "2 Meats", "price": "9,50€" },
        { "label": "3 Meats", "price": "12,00€" }
      ],
      "groups": [
        {
          "groupName": "Meat",
          "displayStyle": "GRID_ITEMS",
          "items": [
            { "name": "Cordon Bleu", "image": "assets/images/items/cordon-bleu.png" },
            { "name": "Nuggets", "image": "assets/images/items/nuggets.png" },
            { "name": "Chicken", "image": "assets/images/items/chicken.png" },
            { "name": "Steak", "image": "assets/images/items/steak.png" },
            { "name": "Kofte", "image": "assets/images/items/kofte.png" },
            { "name": "Tenders", "image": "assets/images/items/tenders.png" }
          ]
        },
        {
          "groupName": "Sauces",
          "displayStyle": "CIRCLE_ICONS",
          "items": [
            { "name": "Algerian", "image": "assets/images/sauces/algerian.png" },
            { "name": "Barbeque", "image": "assets/images/sauces/bbq.png" },
            { "name": "Burger", "image": "assets/images/sauces/burger.png" },
            { "name": "Blanche", "image": "assets/images/sauces/blanche.png" },
            { "name": "Ketchup", "image": "assets/images/sauces/ketchup.png" },
            { "name": "Samourai", "image": "assets/images/sauces/samourai.png" },
            { "name": "Mayonnaise", "image": "assets/images/sauces/mayo.png" },
            { "name": "Harissa", "image": "assets/images/sauces/harissa.png" }
          ]
        },
        {
          "groupName": "Extra",
          "extraPrice": "1,00€",
          "displayStyle": "GRID_ITEMS",
          "items": [
            { "name": "Raclette", "image": "assets/images/extras/raclette.png" },
            { "name": "Cheddar", "image": "assets/images/extras/cheddar.png" },
            { "name": "Boursin", "image": "assets/images/extras/boursin.png" },
            { "name": "Cooked Onion", "image": "assets/images/extras/onion.png" },
            { "name": "Bacon", "image": "assets/images/extras/bacon.png" },
            { "name": "Chevre", "image": "assets/images/extras/chevre.png" },
            { "name": "Turkish Sausage", "image": "assets/images/extras/sausage.png" },
            { "name": "Egg", "image": "assets/images/extras/egg.png" }
          ]
        }
      ]
    }
  ]
}
```

---

## 6. Development Checklist & Agent Instructions for `frontend-tv`

When `agent-tv` executes code within `frontend-tv`, ensure compliance with the following:

1. **Dynamic Background Asset Fallbacks**:
   - Always load background assets dynamically from `src/assets`.
   - Implement CSS fallback colors (`#121212` for dark, `#F9F8F6` for light) in case background images are loading or missing.
2. **Responsive TV Scaling (1080p / 4K landscape)**:
   - Use `vh`, `vw`, and `rem` units to ensure pixel-perfect rendering across 1920x1080 and 3840x2160 TV displays without vertical or horizontal scrollbars.
3. **Screen Layout Builder Renderer Component**:
   - Implement a modular `ScreenLayoutRenderer` component that dynamically switches between layout drivers:
     - `<SplitCustomizerLayout />`
     - `<DualFormulaLayout />`
     - `<TripleColumnLayout />`
     - `<SaladPlateLayout />`
4. **WebSocket / Polling State Management**:
   - Listen for real-time updates from the dashboard (e.g. price change, out-of-stock items, layout switch).
   - Re-render menu components seamlessly without page reloads.
Component: TornEdge.jsx
Location: frontend-tv/src/components/primitives/TornEdge.jsx
Props: { position: 'top'|'bottom'|'left'|'right', color: string, className?: string }
Implementation: CSS clip-path polygon (NOT image asset) — 
generate a jagged/torn paper edge effect on one side of a div.
Must be reusable inside both CategoryBanner and panel dividers.
Reference visual: torn white paper edge over orange background (street-food menu aesthetic).

Component: PriceBadge.jsx  
Location: frontend-tv/src/components/primitives/PriceBadge.jsx
Props: { price: number, currency?: string }
Implementation: black rounded-rect badge, price in Anton font,
decimals as superscript, currency symbol after.
Format: "12,90€" style (comma decimal, currency after).