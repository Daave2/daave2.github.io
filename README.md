# 🏪 Cleveleys Morrisons Dashboard

**A modern, mobile-first Progressive Web App (PWA) for store management**

[![Live Site](https://img.shields.io/badge/Live%20Site-218.team-00853E?logo=google-chrome&logoColor=white)](https://218.team)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa&logoColor=white)](#-pwa-features)
[![Mobile First](https://img.shields.io/badge/Mobile-First-00875A?logo=responsive&logoColor=white)](#-design-philosophy)

> *Making store management easier, one click at a time.*

---

## 📱 Quick Start

**For Tablet/Phone:**
1. Navigate to the dashboard URL in your browser
2. Tap "Add to Home Screen" to install as an app
3. Enjoy offline access and native app experience!

---

## ✨ Features

- ⚡ **Quick Links Dashboard** – One-tap access to Store App, Stock Info, Logbook, Delivery Tracking & more
- 📊 **Real-Time Data** – Embedded iframes for live rota, complaints, and reports
- 👥 **Who's In Today** – Visual Gantt chart showing today's staff shifts by department
- 🌤️ **Weather Widget** – Current conditions for Cleveleys via Open-Meteo API
- 📝 **Notes Whiteboard** – Full-featured drawing canvas with shapes, text, and persistence
- 🔍 **Site Search** – Instant search across all pages and sections
- 🌙 **Dark Mode** – Automatic detection with manual toggle
- 📲 **PWA** – Installable, offline support, native feel

---

## 📖 Pages

| Page | Description |
|------|-------------|
| 🏠 `index.html` | Main dashboard with quick links, rota & whiteboard |
| 📋 `operations.html` | Emergency procedures, MIC routines, tech support |
| 🛡️ `safe-and-legal.html` | Licensing, audits, H&S, food safety, GDPR |
| 🥩 `street.html` | Market Street & Cafe counter guides |
| 🌐 `online.html` | Online operations (C&C, Amazon, Deliveroo) |
| 🛒 `services.html` | Front-end services |
| 📉 `shrink.html` | Shrink management & waste control |
| 📞 `contacts.html` | Key contacts directory |

---

## 🛠️ Tech Stack

- **HTML5** – Semantic structure
- **CSS3** – Mobile-first responsive design (51KB stylesheet)
- **JavaScript** – ES6 modules, Web Components
- **Service Worker** – Offline caching
- **Font Awesome** – Icons
- **Google Fonts** – Inter & Outfit

### Web Components
- `<site-header>` – Logo & theme toggle
- `<site-nav>` – Responsive navigation
- `<back-to-top>` – Scroll button

---

## 📁 Project Structure

```
218 site/
├── index.html              # Main entry point
├── *.html                  # Feature pages
├── style.css               # All styles
├── script.js               # Main JS entry
├── sw.js                   # Service worker
├── manifest.json           # PWA manifest
├── robots.txt              # Block search engines
├── components/             # Web Components
│   ├── header.js
│   ├── nav.js
│   └── back-to-top.js
├── js/modules/             # JavaScript modules
│   ├── ui.js
│   ├── weather.js
│   ├── rota.js
│   ├── whiteboard.js
│   └── search.js
└── icons/                  # PWA icons
```

---

## 🎨 Theme Support

| Mode | Primary Color |
|------|---------------|
| 🌿 Light (Default) | Morrisons Green `#006400` |
| 🌙 Dark | `#00a550` |
| 🌸 Pink (Market Street) | `#D13887` |
| 💛 Yellow (Online) | `#FFB800` |
| 💜 Purple (Services) | `#6A0DAD` |
| ❤️ Red (Shrink) | `#B22222` |

---

## 🖌️ Whiteboard Shortcuts

| Tool | Key |
|------|-----|
| ✏️ Pen | `P` |
| 🔤 Text | `T` |
| 🧹 Eraser | `E` |
| ➖ Line | `L` |
| ⬜ Rectangle | `R` |
| ⭕ Circle | `C` |
| ➡️ Arrow | `A` |
| ↩️ Undo | `Ctrl+Z` |
| ↪️ Redo | `Ctrl+Y` |
| 💾 Save | `Ctrl+S` |

---

## � Privacy

This is an internal management tool. The site is configured to:
- Block all search engine crawlers via `robots.txt`
- Include `noindex, nofollow` meta tags on all pages

---

## 📜 License

© 2025 Cleveleys Morrisons. All rights reserved.

*This dashboard is for internal store use only.*

---

**Built with 💚 for Cleveleys Morrisons Team**
