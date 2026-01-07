import { initUI } from './js/modules/ui.js';
import { initWhiteboard } from './js/modules/whiteboard.js';
import { initSearch } from './js/modules/search.js';
import { initWeather } from './js/modules/weather.js';
import { initRota } from './js/modules/rota.js';

// Initialize Modules
document.addEventListener('DOMContentLoaded', () => {
  // 1. UI (Dark Mode, Iframes, Notifications)
  initUI();

  // 2. Whiteboard
  initWhiteboard();

  // 3. Search
  initSearch();

  // 4. Weather
  initWeather();

  // 5. Rota / Who's In Today
  initRota();
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.error('SW failed:', err));
  });
}
