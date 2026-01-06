
export function initSearch() {
    // 1. Inject the HTML for the Command Palette if not present
    if (!document.querySelector('.cmd-palette-overlay')) {
        const modalHTML = `
            <div class="cmd-palette-overlay" id="cmd-overlay">
                <div class="cmd-palette-modal">
                    <div class="cmd-header">
                        <i class="fas fa-search"></i>
                        <input type="text" class="cmd-input" id="cmd-input" placeholder="Type a command or search..." autocomplete="off">
                    </div>
                    <div class="cmd-results" id="cmd-results">
                        <!-- Results injected here -->
                    </div>
                    <div class="cmd-footer">
                        <div class="cmd-shortcut"><span>↑↓</span> to navigate</div>
                        <div class="cmd-shortcut"><span>↵</span> to select</div>
                        <div class="cmd-shortcut"><span>esc</span> to close</div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    const overlay = document.getElementById('cmd-overlay');
    const input = document.getElementById('cmd-input');
    const resultsContainer = document.getElementById('cmd-results');
    let isOpen = false;
    let selectedIndex = 0;

    // 2. Define Actions & Pages
    const pages = [
        { title: 'Home / Dashboard', url: 'index.html', icon: 'fa-home', type: 'Go to' },
        { title: 'Online Operations', url: 'online.html', icon: 'fa-globe', type: 'Go to' },
        { title: 'Market Street', url: 'street.html', icon: 'fa-store', type: 'Go to' },
        { title: 'Front End Services', url: 'services.html', icon: 'fa-concierge-bell', type: 'Go to' },
        { title: 'Operations', url: 'operations.html', icon: 'fa-cogs', type: 'Go to' },
        { title: 'Safe & Legal', url: 'safe-and-legal.html', icon: 'fa-shield-alt', type: 'Go to' },
        { title: 'Stock Info (SMU)', url: 'https://app.218.team', icon: 'fa-box', type: 'External' },
        { title: 'Whiteboard', action: 'whiteboard', icon: 'fa-pen-to-square', type: 'Action' },
        { title: 'Toggle Dark Mode', action: 'darkmode', icon: 'fa-adjust', type: 'Action' }
    ];

    // 3. Open/Close Logic
    function openPalette() {
        isOpen = true;
        overlay.classList.add('open');
        input.value = '';
        renderResults(pages); // Show all top items initially

        // Timeout ensures CSS transition has started/completed so focus sticks
        setTimeout(() => {
            input.focus();
        }, 50);

        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    function closePalette() {
        isOpen = false;
        overlay.classList.remove('open');
        document.body.style.overflow = '';
        input.blur();
    }

    // 4. Render Logic
    function renderResults(items) {
        resultsContainer.innerHTML = '';
        if (items.length === 0) {
            resultsContainer.innerHTML = '<div class="cmd-empty">No results found</div>';
            return;
        }

        items.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = `cmd-item ${index === selectedIndex ? 'selected' : ''}`;
            el.innerHTML = `
                <i class="fas ${item.icon}"></i>
                <div class="cmd-item-content">
                    <span class="cmd-item-title">${item.title}</span>
                    <span class="cmd-item-desc">${item.type}</span>
                </div>
            `;
            el.addEventListener('click', () => executeItem(item));
            el.addEventListener('mouseenter', () => {
                selectedIndex = index;
                updateSelection();
            });
            resultsContainer.appendChild(el);
        });
    }

    function updateSelection() {
        const items = resultsContainer.querySelectorAll('.cmd-item');
        items.forEach((el, idx) => {
            if (idx === selectedIndex) el.classList.add('selected');
            else el.classList.remove('selected');
        });

        // Scroll into view if needed
        const selected = items[selectedIndex];
        if (selected) {
            selected.scrollIntoView({ block: 'nearest' });
        }
    }

    function executeItem(item) {
        closePalette();
        if (item.url) {
            window.location.href = item.url;
        } else if (item.action === 'darkmode') {
            document.querySelector('.theme-toggle')?.click();
        } else if (item.action === 'whiteboard') {
            // Check if on dash; if not, go to dash then scroll? 
            // For now, assume dash or generic
            if (document.getElementById('whiteboard-container')) {
                document.getElementById('whiteboard-container').scrollIntoView({ behavior: 'smooth' });
            } else {
                window.location.href = 'index.html#whiteboard-container';
            }
        }
    }

    // 5. Event Listeners

    // Toggle via Cmd+K
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            isOpen ? closePalette() : openPalette();
        }
        if (e.key === 'Escape' && isOpen) {
            closePalette();
        }

        // Navigation (Global when open)
        if (isOpen) {
            const items = resultsContainer.querySelectorAll('.cmd-item');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % items.length;
                updateSelection();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                updateSelection();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const query = input.value.toLowerCase();
                const filtered = pages.filter(p => p.title.toLowerCase().includes(query));
                if (filtered[selectedIndex]) executeItem(filtered[selectedIndex]);
            }
        }
    });

    // Input filtering (only need this on input)
    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        selectedIndex = 0;
        const filtered = pages.filter(p => p.title.toLowerCase().includes(query));
        renderResults(filtered);
    });

    // Click outside to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closePalette();
    });

    // Expose open function globally so Nav button can call it
    window.openCommandPalette = openPalette;
}

