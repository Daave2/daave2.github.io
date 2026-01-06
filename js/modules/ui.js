
export function initUI() {
    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);

    /* -------- Helpers -------- */
    const notify = (msg, ms = 3000) => {
        const n = $("#notification");
        if (!n) return;
        n.textContent = msg;
        n.style.display = "block";
        n.style.opacity = 1;
        n.style.transition = 'opacity .3s';
        setTimeout(() => {
            n.style.opacity = 0;
            setTimeout(() => n.style.display = "none", 300);
        }, ms);
    };

    /* -------- Dark Mode -------- */
    const themeBtn = $(".theme-toggle");
    const setMode = isDark => {
        document.body.classList.toggle("dark-mode", isDark);
        if (themeBtn) themeBtn.setAttribute("aria-pressed", isDark);
        localStorage.theme = isDark ? "dark" : "light";

        // Trigger whiteboard resize if available globally (bridge)
        if (typeof window.resizeWhiteboard === 'function') {
            setTimeout(window.resizeWhiteboard, 50);
        }
    };

    // System preference listener
    matchMedia("(prefers-color-scheme:dark)").addEventListener("change", e => {
        if (!localStorage.theme) setMode(e.matches);
    });

    // Initial Load
    const saved = localStorage.theme;
    setMode(saved ? saved === "dark" : matchMedia("(prefers-color-scheme:dark)").matches);


    /* -------- Dashboard Tile Click / Iframe Logic -------- */
    const dashboardTiles = $$('#dashboard .tile');
    const frameContainer = $('#frame-container');
    const contentFrame = $('#content-frame');
    const closeFrame = $('#close-frame');
    const fallbackMessage = $('#fallback-message');
    const fallbackLink = $('#fallback-link');
    const frameSpinner = frameContainer?.querySelector('.iframe-loading');
    let frameLoadTimeout;

    function showFrameSpinner(show) {
        if (frameSpinner) frameSpinner.style.display = show ? 'block' : 'none';
    }

    function loadContentInFrame(url) {
        if (!frameContainer || !contentFrame || !fallbackLink || !fallbackMessage || !closeFrame) return;

        contentFrame.src = 'about:blank';
        fallbackMessage.style.display = 'none';
        fallbackLink.href = url;
        frameContainer.classList.add('active');
        showFrameSpinner(true);
        // Inline styles removed to allow CSS to handle full-screen sizing

        contentFrame.src = url;
        frameContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

        clearTimeout(frameLoadTimeout);

        frameLoadTimeout = setTimeout(() => {
            let wasBlockedOrFailed = false;
            try {
                if (contentFrame.contentWindow?.length === 0 || contentFrame.contentDocument?.body.innerHTML.trim() === "") {
                    const knownLoginDomains = ['dymension.co.uk', 'storemobile.apps.mymorri.com'];
                    const currentDomain = new URL(contentFrame.src).hostname;
                    if (!knownLoginDomains.some(domain => currentDomain.includes(domain))) {
                        console.warn('[Fallback Check] iframe content seems empty after timeout for:', url);
                        wasBlockedOrFailed = true;
                    } else {
                        showFrameSpinner(false);
                        fallbackMessage.style.display = 'none';
                        return;
                    }
                }
            } catch (e) {
                wasBlockedOrFailed = true;
            }

            if (wasBlockedOrFailed && frameSpinner?.style.display !== 'none') {
                showFrameSpinner(false);
                fallbackMessage.style.display = 'block';
                notify("Content embedding likely blocked. Use fallback link.", 4000);
            } else if (frameSpinner?.style.display !== 'none') {
                showFrameSpinner(false);
                fallbackMessage.style.display = 'block';
                notify("Content took a while to load.", 4000);
            }
        }, 8000);

        contentFrame.onload = function () {
            clearTimeout(frameLoadTimeout);
            showFrameSpinner(false);
            fallbackMessage.style.display = 'none';
            try {
                if (contentFrame.contentDocument?.body.innerHTML.trim() === "" && contentFrame.src !== 'about:blank') {
                    fallbackMessage.style.display = 'block';
                }
            } catch (e) {
                if (contentFrame.src !== 'about:blank') {
                    fallbackMessage.style.display = 'block';
                }
            }
        };

        contentFrame.onerror = function (err) {
            clearTimeout(frameLoadTimeout);
            showFrameSpinner(false);
            fallbackMessage.style.display = 'block';
            notify("Error loading content in frame.", 4000);
        };
    }

    if (closeFrame) {
        closeFrame.addEventListener('click', function () {
            if (!frameContainer || !contentFrame) return;
            frameContainer.classList.remove('active');
            contentFrame.src = "about:blank";
            fallbackMessage.style.display = "none";
            showFrameSpinner(false);
            clearTimeout(frameLoadTimeout);
        });
    }

    dashboardTiles.forEach(item => {
        item.addEventListener('click', function (e) {
            const url = this.getAttribute('href');
            const openType = this.dataset.open;
            if (openType === "external") {
                e.preventDefault();
                window.open(url, '_blank', 'noopener,noreferrer');
            } else if (openType === "frame") {
                e.preventDefault();
                loadContentInFrame(url);
            }
        });
    });

    /* -------- Lazy Load Iframes -------- */
    const iframes = document.querySelectorAll('iframe[data-src]');
    const observerCallback = (entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const iframe = entry.target;
                const loadingContainer = iframe.closest('section')?.querySelector('.iframe-loading-container');
                const loader = loadingContainer?.querySelector('.iframe-loading');

                if (loader) loader.style.display = 'block';
                iframe.src = iframe.getAttribute('data-src');
                iframe.removeAttribute('data-src');

                iframe.addEventListener('load', () => { if (loader) loader.style.display = 'none'; });
                iframe.addEventListener('error', (err) => {
                    if (loader) loader.style.display = 'none';
                });
                obs.unobserve(iframe);
            }
        });
    };
    const observer = new IntersectionObserver(observerCallback, { rootMargin: '100px 0px', threshold: 0.01 });
    iframes.forEach(iframe => observer.observe(iframe));


    /* -------- Accordions -------- */
    const accordions = $$(".accordion, .quick-guide-collapsible summary");
    accordions.forEach(acc => {
        // If it's a summary element, default browser behavior handles it mostly, 
        // but we might want to add animation or toggle classes.
        // For custom .accordion button:
        if (acc.classList.contains("accordion")) {
            acc.addEventListener("click", function () {
                this.classList.toggle("active");
                const panel = this.nextElementSibling;
                if (panel.style.maxHeight) {
                    panel.style.maxHeight = null;
                } else {
                    panel.style.maxHeight = panel.scrollHeight + "px";
                }
            });
        }
    });


    /* -------- Return helpers if needed -------- */
    return { notify };
}
