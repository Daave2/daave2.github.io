
class SiteNav extends HTMLElement {
    connectedCallback() {
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';

        this.innerHTML = `
          <nav>
            <div class="nav-wrap">
              <ul class="nav-links">
                <li><a href="index.html" class="${currentPath === 'index.html' ? 'active' : ''}"><i class="fas fa-home"></i><span>Home</span></a></li>
                <li><a href="online.html" class="${currentPath === 'online.html' ? 'active' : ''}"><i class="fas fa-globe"></i><span>Online</span></a></li>
                <li><a href="street.html" class="${currentPath === 'street.html' ? 'active' : ''}"><i class="fas fa-store"></i><span>Market</span></a></li>
                <li><a href="services.html" class="${currentPath === 'services.html' ? 'active' : ''}"><i class="fas fa-concierge-bell"></i><span>Front End</span></a></li>
                <li><a href="operations.html" class="${currentPath === 'operations.html' ? 'active' : ''}"><i class="fas fa-cogs"></i><span>Operations</span></a></li>
                <li><a href="contacts.html" class="${currentPath === 'contacts.html' ? 'active' : ''}"><i class="fas fa-address-book"></i><span>Contacts</span></a></li>
                <li><a href="shrink.html" class="${currentPath === 'shrink.html' ? 'active' : ''}"><i class="fas fa-compress-arrows-alt"></i><span>Shrink</span></a></li>
                <li><a href="safe-and-legal.html" class="${currentPath === 'safe-and-legal.html' ? 'active' : ''}"><i class="fas fa-shield-alt"></i><span>Safe & Legal</span></a></li>
              </ul>
            </div>
          </nav>
        `;
    }
}
customElements.define('site-nav', SiteNav);
