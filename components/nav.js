
class SiteNav extends HTMLElement {
  connectedCallback() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    // Primary nav items (most used)
    const primaryItems = [
      { href: 'index.html', icon: 'fa-home', label: 'Home' },
      { href: 'online.html', icon: 'fa-globe', label: 'Online' },
      { href: 'street.html', icon: 'fa-store', label: 'Market' },
      { href: 'services.html', icon: 'fa-concierge-bell', label: 'Front End' },
      { href: 'operations.html', icon: 'fa-cogs', label: 'Operations' }
    ];

    // Secondary items (in More dropdown)
    const moreItems = [
      { href: 'checklist.html', icon: 'fa-clipboard-check', label: 'Checklist' },
      { href: 'contacts.html', icon: 'fa-address-book', label: 'Contacts' },
      { href: 'shrink.html', icon: 'fa-compress-arrows-alt', label: 'Shrink' },
      { href: 'safe-and-legal.html', icon: 'fa-shield-alt', label: 'Safe & Legal' }
    ];

    const isMoreActive = moreItems.some(item => currentPath === item.href);

    const primaryLinks = primaryItems.map(item =>
      `<li><a href="${item.href}" class="${currentPath === item.href ? 'active' : ''}"><i class="fas ${item.icon}"></i><span>${item.label}</span></a></li>`
    ).join('');

    const moreLinks = moreItems.map(item =>
      `<a href="${item.href}" class="more-dropdown-item ${currentPath === item.href ? 'active' : ''}"><i class="fas ${item.icon}"></i><span>${item.label}</span></a>`
    ).join('');

    this.innerHTML = `
          <nav>
            <div class="nav-wrap">
              <ul class="nav-links">
                ${primaryLinks}
                <li>
                  <button class="nav-btn-search" onclick="window.openCommandPalette && window.openCommandPalette()" aria-label="Search">
                    <i class="fas fa-search"></i>
                  </button>
                </li>
                <li class="more-menu">
                  <button class="more-toggle ${isMoreActive ? 'active' : ''}" aria-expanded="false" aria-haspopup="true" aria-label="More navigation options">
                    <i class="fas fa-ellipsis-h"></i><span>More</span>
                  </button>
                  <div class="more-dropdown" role="menu" aria-hidden="true">
                    ${moreLinks}
                  </div>
                </li>
              </ul>
            </div>
          </nav>
        `;

    // More dropdown toggle
    const moreToggle = this.querySelector('.more-toggle');
    const moreDropdown = this.querySelector('.more-dropdown');

    if (moreToggle && moreDropdown) {
      moreToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = moreDropdown.classList.toggle('open');
        moreToggle.setAttribute('aria-expanded', isOpen);
        moreDropdown.setAttribute('aria-hidden', !isOpen);
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!this.contains(e.target)) {
          moreDropdown.classList.remove('open');
          moreToggle.setAttribute('aria-expanded', 'false');
          moreDropdown.setAttribute('aria-hidden', 'true');
        }
      });

      // Close on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && moreDropdown.classList.contains('open')) {
          moreDropdown.classList.remove('open');
          moreToggle.setAttribute('aria-expanded', 'false');
          moreDropdown.setAttribute('aria-hidden', 'true');
          moreToggle.focus();
        }
      });
    }
  }
}
customElements.define('site-nav', SiteNav);
