/**
 * premium.js — Premium feature gating, modal, scenario save/compare
 */
const Premium = {
    isActive: false,

    init() {
        const modal = document.getElementById('premium-modal');
        const premiumBtn = document.getElementById('premiumBtn');
        const modalClose = document.getElementById('modal-close');

        premiumBtn.addEventListener('click', () => this.showModal());
        modalClose.addEventListener('click', () => this.hideModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hideModal();
        });

        // Escape key closes modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) this.hideModal();
        });

        // Premium feature cards trigger modal
        document.querySelectorAll('.premium-feature-card').forEach(card => {
            card.addEventListener('click', () => this.showModal());
        });

        // Subscribe button (demo)
        const subscribeBtn = document.querySelector('.btn-subscribe');
        if (subscribeBtn) {
            subscribeBtn.addEventListener('click', () => this.activatePremium());
        }

        // Price card selection
        document.querySelectorAll('.price-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.price-card').forEach(c => c.classList.remove('featured'));
                card.classList.add('featured');
            });
        });

        // Check localStorage for existing premium
        if (localStorage.getItem('cheshbeshbon_premium') === 'true') {
            this.activatePremium(true);
        }
    },

    showModal() {
        document.getElementById('premium-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    hideModal() {
        document.getElementById('premium-modal').classList.remove('active');
        document.body.style.overflow = '';
    },

    activatePremium(silent = false) {
        this.isActive = true;
        localStorage.setItem('cheshbeshbon_premium', 'true');

        if (!silent) this.hideModal();

        // Update UI
        document.querySelectorAll('.premium-feature-card').forEach(card => {
            card.style.borderColor = 'rgba(52, 211, 153, 0.3)';
            const badge = card.querySelector('.lock-badge');
            if (badge) {
                badge.textContent = '\u2713 \u05E4\u05E2\u05D9\u05DC';
                badge.style.background = 'rgba(52, 211, 153, 0.12)';
                badge.style.color = '#34d399';
            }
        });

        const premiumBtn = document.getElementById('premiumBtn');
        premiumBtn.innerHTML = '<span class="premium-icon">\u2705</span> \u05E4\u05E8\u05D9\u05DE\u05D9\u05D5\u05DD \u05E4\u05E2\u05D9\u05DC';
        premiumBtn.style.background = 'linear-gradient(135deg, #34d399, #10b981)';
    },

    checkFeature(featureName) {
        if (!this.isActive) {
            this.showModal();
            return false;
        }
        return true;
    }
};
