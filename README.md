<![CDATA[<div align="center">

# 🏪 Cleveleys Morrisons Dashboard

**A modern, mobile-first Progressive Web App (PWA) for store management**

[![Live Site](https://img.shields.io/badge/Live%20Site-218.team-00853E?logo=google-chrome&logoColor=white)](https://218.team)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa&logoColor=white)](#-pwa-features)
[![Mobile First](https://img.shields.io/badge/Mobile-First-00875A?logo=responsive&logoColor=white)](#-design-philosophy)

<img src="https://upload.wikimedia.org/wikipedia/en/thumb/8/82/MorrisonsLogo.svg/220px-MorrisonsLogo.svg.png" alt="Morrisons Logo" width="180"/>

*Quick access to essential tools, reports, and operational guides for Cleveleys Morrisons store management.*

---

[📱 Quick Start](#-quick-start) • [✨ Features](#-features) • [📖 Pages](#-pages--modules) • [🛠️ Tech Stack](#️-tech-stack) • [📦 Installation](#-installation)

</div>

---

## 📱 Quick Start

**For Tablet/Phone:**
1. Navigate to the dashboard URL in your browser
2. Tap "Add to Home Screen" to install as an app
3. Enjoy offline access and native app experience!

**For Desktop:**
1. Open in any modern browser
2. Use dark mode toggle for comfortable viewing
3. Access all quick links and embedded tools

---

## ✨ Features

### 🎯 Core Functionality

| Feature | Description |
|---------|-------------|
| **⚡ Quick Links Dashboard** | One-tap access to Store App, Stock Info, Logbook, Delivery Tracking & more |
| **📊 Real-Time Data** | Embedded iframes for live rota, complaints, and reports |
| **👥 Who's In Today** | Visual Gantt chart showing today's staff shifts by department |
| **🌤️ Weather Widget** | Current conditions for Cleveleys via Open-Meteo API |
| **📝 Notes Whiteboard** | Full-featured drawing canvas with shapes, text, and persistence |
| **🔍 Site Search** | Instant search across all pages and sections |

### 🌙 Dark Mode

Automatic detection of system preference with manual toggle. Smooth transitions and carefully crafted color schemes for both light and dark themes.

### 📲 PWA Features

- **Installable** – Add to home screen on any device
- **Offline Support** – Service worker caches critical assets
- **Fast Loading** – Optimized for low-bandwidth environments
- **Native Feel** – Standalone display mode, no browser chrome

### ♿ Accessibility

- Semantic HTML5 structure
- ARIA labels and live regions
- Keyboard navigation support
- Skip to content links
- High contrast ratios

---

## 📖 Pages & Modules

```
📦 Cleveleys Dashboard
├── 🏠 index.html          → Main dashboard with quick links, rota & whiteboard
├── 📋 operations.html     → Emergency procedures, MIC routines, tech support
├── 🛡️ safe-and-legal.html → Licensing, audits, H&S, food safety, GDPR
├── 🥩 street.html         → Market Street & Cafe counter guides
├── 🌐 online.html         → Online operations
├── 🛒 services.html       → Front-end services
├── 📉 shrink.html         → Shrink management & waste control
├── 📞 contacts.html       → Key contacts directory
└── 📉 dash.html           → Alternative dashboard view
```

### Counter Guides (Market Street)

Expandable accordion sections for each department:

- 🍞 **Bakery** – Production plans, bake-off schedules, Natasha's Law compliance
- 🥩 **Butchery** – Primal processing, temperature control, equipment maintenance
- 🎂 **Cake Shop** – Fresh cream cakes, piping techniques, display standards
- 🧀 **Deli** – Cheese cutting, cooked meats, olive displays
- 🐟 **Fish** – Ice management, health marks, wet fish markdowns
- 🍕 **Fresh To Go** – Pizza, salad bar, PPDS labelling
- ☕ **Cafe** – Beverage service, hot food, delivery integrations

---

## 🛠️ Tech Stack

<div align="center">

| Technology | Purpose |
|------------|---------|
| ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white) | Semantic structure |
| ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white) | Mobile-first responsive design |
| ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black) | ES6 modules, Web Components |
| ![Service Worker](https://img.shields.io/badge/Service%20Worker-FF6D00?style=flat&logo=pwa&logoColor=white) | Offline caching & SW events |
| ![Font Awesome](https://img.shields.io/badge/Font%20Awesome-528DD7?style=flat&logo=fontawesome&logoColor=white) | Icons |

</div>

### Key Technologies

- **Web Components** – Custom elements for `<site-header>`, `<site-nav>`, `<back-to-top>`
- **CSS Custom Properties** – Theme variables for easy customization
- **LocalStorage** – Persistent whiteboard data and theme preference
- **Canvas API** – Full-featured whiteboard with undo/redo, shapes, and zoom
- **Intersection Observer** – Lazy-loading iframes for performance
- **Open-Meteo API** – Free weather data (no API key required)

---

## 📁 Project Structure

```
218 site/
├── 📄 index.html            # Main entry point
├── 📄 *.html                # Feature pages
├── 🎨 style.css             # All styles (51KB)
├── ⚡ script.js             # Main JS entry
├── 🔧 sw.js                 # Service worker
├── 📦 manifest.json         # PWA manifest
│
├── 📂 components/           # Web Components
│   ├── header.js           # Site header with logo & theme toggle
│   ├── nav.js              # Responsive navigation
│   └── back-to-top.js      # Scroll-to-top button
│
├── 📂 js/modules/           # JavaScript modules
│   ├── ui.js               # UI utilities & accordions
│   ├── weather.js          # Weather widget
│   ├── rota.js             # Staff schedule display
│   ├── whiteboard.js       # Canvas tools
│   └── search.js           # Site search
│
└── 📂 icons/                # PWA icons
```

---

## 📦 Installation

### Local Development

```bash
# Clone the repository
git clone https://github.com/Daave2/daave2.github.io.git
cd daave2.github.io

# Serve locally (any static server works)
npx serve .
# or
python -m http.server 8080
```

### Deployment

The site is deployed automatically via **GitHub Pages** on push to the `main` branch.

---

## 🎨 Design Philosophy

### Mobile-First Responsive

- **Phone (< 768px):** Bottom navigation bar, stacked content
- **Tablet (768px - 1024px):** Side navigation, 2-column grid
- **Desktop (> 1024px):** Full navigation, multi-column layouts

### Theme Support

| Mode | Primary Color | Background |
|------|---------------|------------|
| 🌿 Light (Default) | `#006400` (Morrisons Green) | `#f8f9fa` |
| 🌙 Dark | `#00a550` | `#121212` |
| 🌸 Pink (Market Street) | `#D13887` | Themed |

### Performance Optimizations

- Lazy-loaded iframes with `loading="lazy"` and Intersection Observer
- Preconnect hints for Google Fonts and CDNs
- CSS font-display swap for non-blocking text
- Service worker pre-caching for critical assets
- Minimal external dependencies

---

## 🖌️ Whiteboard Features

The built-in whiteboard supports:

| Tool | Shortcut | Description |
|------|----------|-------------|
| ✏️ Pen | `P` | Freehand drawing |
| 🔤 Text | `T` | Click to add text |
| 🧹 Eraser | `E` | Remove strokes |
| ➖ Line | `L` | Straight lines |
| ⬜ Rectangle | `R` | Rectangle shapes |
| ⭕ Circle | `C` | Circle/ellipse shapes |
| ➡️ Arrow | `A` | Arrows with heads |
| ↩️ Undo | `⌘/Ctrl+Z` | Undo last action |
| ↪️ Redo | `⌘/Ctrl+Y` | Redo action |
| 💾 Save | `⌘/Ctrl+S` | Save to localStorage |

Additional features:
- Color palette with custom color picker
- Adjustable brush size and opacity
- Grid overlay toggle
- Zoom in/out with reset
- Export to PNG
- Fullscreen mode

---

## 🔗 Integrated Tools

| Tool | Type | Purpose |
|------|------|---------|
| Store Mobile App | Internal | Daily task management |
| Stock Info (SMU) | External | Stock level queries |
| Dymension | Frame | Staff compliance checks |
| Logbook | External | Price integrity checks |
| Microlise | External | Delivery tracking |
| Looker Studio | Embedded | Complaints & reports |
| Google Scripts | External | Retail Wheel, NPS, Reminders |
| Production Plans | External | Market Street production |

---

## 👥 Contributing

This is an internal tool for Cleveleys Morrisons. For suggestions or issues:

1. Raise an issue in the repository
2. Contact the store management team
3. Submit a pull request with improvements

---

## 📜 License

© 2025 Cleveleys Morrisons. All rights reserved.

*This dashboard is for internal store use only.*

---

<div align="center">

**Built with 💚 for Cleveleys Morrisons Team**

*Making store management easier, one click at a time.*

</div>
]]>
