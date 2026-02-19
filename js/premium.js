/**
 * premium.js — Premium feature gating, modal, scenario save/compare
 */
const Premium = {
    isActive: false,

    async init() {
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

        // Validate existing token via PremiumService
        const result = await PremiumService.validateToken();
        if (result.valid) {
            this.applyPremiumUI();
        }
    },

    _previousFocus: null,
    _focusTrapHandler: null,

    showModal() {
        const modal = document.getElementById('premium-modal');
        this._previousFocus = document.activeElement;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Focus trap
        const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length > 0) {
            focusable[0].focus();
            this._focusTrapHandler = (e) => {
                if (e.key !== 'Tab') return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey) {
                    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
                } else {
                    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
                }
            };
            modal.addEventListener('keydown', this._focusTrapHandler);
        }
    },

    hideModal() {
        const modal = document.getElementById('premium-modal');
        if (this._focusTrapHandler) {
            modal.removeEventListener('keydown', this._focusTrapHandler);
            this._focusTrapHandler = null;
        }
        modal.classList.remove('active');
        document.body.style.overflow = '';
        if (this._previousFocus) {
            this._previousFocus.focus();
            this._previousFocus = null;
        }
    },

    async activatePremium() {
        const result = await PremiumService.activateSubscription();
        if (result.success) {
            this.hideModal();
            this.applyPremiumUI();
        }
    },

    applyPremiumUI() {
        this.isActive = true;

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
