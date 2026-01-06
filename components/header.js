
class SiteHeader extends HTMLElement {
    connectedCallback() {
        // Dynamic page titles based on current page
        const pageTitles = {
            'index.html': 'Management Dashboard',
            'online.html': 'Online Operations',
            'street.html': 'Market Street & Cafe',
            'services.html': 'Front End Services',
            'operations.html': 'Operations',
            'contacts.html': 'Contacts',
            'shrink.html': 'Shrink Management',
            'safe-and-legal.html': 'Safe & Legal'
        };

        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const pageTitle = pageTitles[currentPath] || 'Dashboard';

        this.innerHTML = `
        <a class="skip-link" href="#main-content">Skip to main content</a>
        <header>
            <img src="https://upload.wikimedia.org/wikipedia/en/thumb/8/82/MorrisonsLogo.svg/220px-MorrisonsLogo.svg.png" alt="Morrisons logo" />
            <h1>Cleveleys – ${pageTitle}</h1>
            <div class="header-actions">
                <button class="search-toggle" aria-label="Search site" title="Search (/)">
                    <i class="fas fa-search"></i>
                </button>
                <button class="theme-toggle" aria-label="Toggle dark mode" aria-pressed="false">🌓</button>
            </div>
        </header>
        `;

        // Theme toggle
        const themeBtn = this.querySelector(".theme-toggle");
        if (themeBtn) {
            themeBtn.addEventListener("click", () => {
                const isDark = !document.body.classList.contains("dark-mode");
                document.body.classList.toggle("dark-mode", isDark);
                themeBtn.setAttribute("aria-pressed", isDark);
                localStorage.theme = isDark ? "dark" : "light";
                if (window.resizeWhiteboard) setTimeout(window.resizeWhiteboard, 50);
            });
            const isDark = document.body.classList.contains("dark-mode");
            themeBtn.setAttribute("aria-pressed", isDark);
        }

        // Search toggle (will be connected by search module)
        const searchToggle = this.querySelector(".search-toggle");
        if (searchToggle) {
            searchToggle.addEventListener("click", () => {
                const searchSection = document.getElementById('site-search-section');
                const searchInput = document.getElementById('site-search');
                if (searchSection) {
                    searchSection.classList.toggle('search-expanded');
                    if (searchSection.classList.contains('search-expanded') && searchInput) {
                        searchInput.focus();
                    }
                }
            });

            // Keyboard shortcut: "/" to open search
            document.addEventListener('keydown', (e) => {
                if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
                    e.preventDefault();
                    const searchSection = document.getElementById('site-search-section');
                    const searchInput = document.getElementById('site-search');
                    if (searchSection && searchInput) {
                        searchSection.classList.add('search-expanded');
                        searchInput.focus();
                    }
                }
            });
        }
    }
}
customElements.define('site-header', SiteHeader);
