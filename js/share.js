/**
 * share.js — Share results via Web Share API or clipboard
 */
const ShareManager = {
    async share(title, text) {
        if (navigator.share) {
            try {
                await navigator.share({ title: 'חשבשבון — ' + title, text });
            } catch (e) {
                // User cancelled or error — fall through to clipboard
                if (e.name !== 'AbortError') this.copyToClipboard(text);
            }
        } else {
            this.copyToClipboard(text);
        }
    },

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            // Visual feedback
            const btn = document.querySelector('.btn-share');
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
