
class BackToTop extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <button class="back-to-top" aria-label="Back to top" title="Back to top">
                <i class="fas fa-chevron-up"></i>
            </button>
        `;

        const btn = this.querySelector('.back-to-top');

        // Show/hide based on scroll position
        const toggleVisibility = () => {
            if (window.scrollY > 300) {
                btn.classList.add('visible');
            } else {
                btn.classList.remove('visible');
            }
        };

        window.addEventListener('scroll', toggleVisibility, { passive: true });
        toggleVisibility();

        // Scroll to top on click
        btn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}
customElements.define('back-to-top', BackToTop);
