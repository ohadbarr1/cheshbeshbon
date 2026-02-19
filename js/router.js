/**
 * router.js — Hash-based SPA router
 * Routes: #home, #calculators, #about, #faq, #contact
 */
const Router = {
    pages: ['home', 'calculators', 'about', 'faq', 'contact'],
    currentPage: null,

    init() {
        window.addEventListener('hashchange', () => this.navigate());
        // Handle nav link clicks
        document.querySelectorAll('[data-nav]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.nav;
                window.location.hash = page;
                // Close mobile menu
                const toggle = document.getElementById('nav-toggle');
                if (toggle) toggle.checked = false;
            });
        });
        // Initial route
        this.navigate();
    },

    navigate() {
        const hash = window.location.hash.slice(1) || 'home';
        const page = this.pages.includes(hash) ? hash : 'home';

        if (page === this.currentPage) return;
        this.currentPage = page;

        // Hide all page sections
        this.pages.forEach(p => {
            const el = document.getElementById('page-' + p);
            if (el) {
                el.classList.remove('page-active');
                el.style.display = 'none';
            }
        });

        // Show target page
        const target = document.getElementById('page-' + page);
        if (target) {
            target.style.display = '';
            void target.offsetWidth; // force reflow
            target.classList.add('page-active');
        }

        // Update nav active state
        document.querySelectorAll('[data-nav]').forEach(link => {
            link.classList.toggle('nav-active', link.dataset.nav === page);
        });

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // Navigate to calculators and optionally select a specific tab
    goToCalculator(tabName) {
        window.location.hash = 'calculators';
        if (tabName) {
            setTimeout(() => {
                const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
                if (btn) btn.click();
            }, 100);
        }
    }
};
