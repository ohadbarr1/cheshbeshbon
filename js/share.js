/**
 * share.js — Share results via Web Share API or clipboard
 */
const ShareManager = {
    async share(title, text, triggerBtn) {
        if (navigator.share) {
            try {
                await navigator.share({ title: 'חשבשבון — ' + title, text });
            } catch (e) {
                // User cancelled or error — fall through to clipboard
                if (e.name !== 'AbortError') this.copyToClipboard(text, triggerBtn);
            }
        } else {
            this.copyToClipboard(text, triggerBtn);
        }
    },

    async copyToClipboard(text, triggerBtn) {
        try {
            await navigator.clipboard.writeText(text);
            // Visual feedback on the correct button
            const btn = triggerBtn || document.querySelector('.btn-share');
            if (btn) {
                const orig = btn.innerHTML;
                btn.classList.add('copied');
                btn.innerHTML = '\u2705 הועתק!';
                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.innerHTML = orig;
                }, 2000);
            }
        } catch (e) {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
    }
};
