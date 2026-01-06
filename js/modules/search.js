
export function initSearch() {
    const searchInput = document.getElementById('site-search');
    const searchResultsContainer = document.getElementById('search-results');

    // Helper debounce
    const debounce = (fn, ms) => {
        let t;
        const debounced = (...a) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...a), ms);
        };
        debounced.flush = () => {
            clearTimeout(t);
            // Logic to force execution if needed, but simple debounce usually sufficient.
        }
        return debounced;
    };

    if (!searchInput || !searchResultsContainer) return;

    // Define the searchable content (manual index)
    const searchablePages = [
        { title: 'Home / Dashboard', url: 'index.html', keywords: 'dashboard welcome quick links rota whiteboard notes' },
        { title: 'Online Operations', url: 'online.html', keywords: 'cnc click collect amazon deliveroo justeat uber eats osp partner handset troubleshoot' },
        { title: 'Market Street / Cafe', url: 'street.html', keywords: 'bakery butchery fish deli cake shop pizza food to go cafe production plan checklist wgll markdown' },
        { title: 'Front End Services', url: 'services.html', keywords: 'csd kiosk checkouts sco self scan tills more card trolleys baskets pharmacy logbook mpro5' },
        { title: 'Operations', url: 'operations.html', keywords: 'replenishment scanning mic routines tech support it helpdesk emergency' },
        { title: 'Contacts', url: 'contacts.html', keywords: 'phone email helpdesk support central loss prevention lp retail trust pharmacy' },
        { title: 'Shrink Management', url: 'shrink.html', keywords: 'stocktake audit tagging waste loss prevention dymension think shrink' },
        { title: 'Safe & Legal', url: 'safe-and-legal.html', keywords: 'haccp food safety health hs licensing compliance audits data protection gdpr' },
        { title: 'Stock Info (SMU) App', url: 'https://app.218.team', keywords: 'stock info smu investigation 218 team inventory counts' }
    ];

    const handleSearch = debounce(() => {
        const query = searchInput.value.trim().toLowerCase();
        searchResultsContainer.innerHTML = ''; // Clear previous results

        if (query.length < 2) { // Only search if query is at least 2 chars
            searchResultsContainer.style.display = 'none';
            return;
        }

        const results = searchablePages.filter(page =>
            page.title.toLowerCase().includes(query) ||
            page.keywords.toLowerCase().includes(query) ||
            page.url.toLowerCase().includes(query)
        );

        if (results.length > 0) {
            // Limit results displayed
            const maxResults = 7;
            results.slice(0, maxResults).forEach(result => {
                const link = document.createElement('a');
                link.href = result.url;
                link.textContent = result.title;
                if (/^https?:\/\//.test(result.url)) {
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                }
                searchResultsContainer.appendChild(link);
            });
            searchResultsContainer.style.display = 'block';
        } else {
            const noResult = document.createElement('div');
            noResult.textContent = 'No results found.';
            noResult.style.padding = '0.75rem 1rem'; // Style similar to links
            searchResultsContainer.appendChild(noResult);
            searchResultsContainer.style.display = 'block';
        }
    }, 300);

    searchInput.addEventListener('input', handleSearch);

    // Hide results when clicking outside
    document.addEventListener('click', (event) => {
        // Check if the click target is the search input or the results container itself
        if (!searchInput.contains(event.target) && !searchResultsContainer.contains(event.target)) {
            searchResultsContainer.style.display = 'none';
        }
    });

    // Hide results on Escape key
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            searchResultsContainer.style.display = 'none';
            searchInput.blur(); // Optionally remove focus from input
        }
    });

    // Ensure results are shown if input gains focus and has value > 1 char
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim().length >= 2) {
            handleSearch(); // Ensure search if needed
            if (searchResultsContainer.innerHTML.trim() !== '') { // Check if results exist
                searchResultsContainer.style.display = 'block';
            }
        }
    });
}
