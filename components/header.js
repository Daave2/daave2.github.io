
class SiteHeader extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
        <header>
            <img src="https://upload.wikimedia.org/wikipedia/en/thumb/8/82/MorrisonsLogo.svg/220px-MorrisonsLogo.svg.png" alt="Morrisons logo" />
            <h1>Cleveleys Morrisons Dashboard</h1>
            <button class="theme-toggle" aria-label="Toggle dark mode" aria-pressed="false">🌓</button>
        </header>
        `;

        // Re-attach event listener for the new button
        const themeBtn = this.querySelector(".theme-toggle");
        if (themeBtn) {
            themeBtn.addEventListener("click", () => {
                const isDark = !document.body.classList.contains("dark-mode");
                document.body.classList.toggle("dark-mode", isDark);
                themeBtn.setAttribute("aria-pressed", isDark);
                localStorage.theme = isDark ? "dark" : "light";
                if (window.resizeWhiteboard) setTimeout(window.resizeWhiteboard, 50);
            });
            // Update initial state
            const isDark = document.body.classList.contains("dark-mode");
            themeBtn.setAttribute("aria-pressed", isDark);
        }
    }
}
customElements.define('site-header', SiteHeader);
