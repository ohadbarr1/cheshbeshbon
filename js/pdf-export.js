/**
 * pdf-export.js — Export results panel to PDF
 * Lazy-loads html2canvas + jsPDF from CDN on first use
 */
const PDFExport = {
    loaded: false,

    async loadLibraries() {
        if (this.loaded) return true;

        const scripts = [
            'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
            'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
        ];

        for (const src of scripts) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        this.loaded = true;
        return true;
    },

    async exportResults(calcId, title) {
        const resultsPanel = document.getElementById(calcId + '-results');
        if (!resultsPanel || !resultsPanel.querySelector('.results-container')) {
            alert('אין תוצאות לייצוא. חשב קודם.');
            return;
        }

        // Show loading state
        const btn = document.querySelector(`#${calcId}-section .btn-pdf`);
        const origText = btn ? btn.innerHTML : '';
        if (btn) {
            btn.innerHTML = '⏳ מייצא...';
            btn.disabled = true;
        }

        try {
            await this.loadLibraries();

            const canvas = await html2canvas(resultsPanel, {
                backgroundColor: '#06060b',
                scale: 2,
                useCORS: true,
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;

            // Header
            pdf.setFillColor(19, 19, 42);
            pdf.rect(0, 0, pageWidth, 25, 'F');
            pdf.setFontSize(16);
            pdf.setTextColor(251, 191, 36);
            pdf.text('חשבשבון', pageWidth - margin, 12, { align: 'right' });
            pdf.setFontSize(9);
            pdf.setTextColor(160, 160, 190);
            pdf.text(title + ' — ' + new Date().toLocaleDateString('he-IL'), pageWidth - margin, 20, { align: 'right' });

            // Results image
            const imgWidth = pageWidth - margin * 2;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const maxImgHeight = pageHeight - 45;
            const finalHeight = Math.min(imgHeight, maxImgHeight);
            pdf.addImage(imgData, 'PNG', margin, 30, imgWidth, finalHeight);

            // Disclaimer footer
            const disclaimerY = Math.min(30 + finalHeight + 10, pageHeight - 8);
            pdf.setFontSize(7);
            pdf.setTextColor(100, 100, 128);
            pdf.text('כל הנתונים להמחשה בלבד ואינם מהווים ייעוץ פיננסי. חשבשבון © 2025', pageWidth / 2, disclaimerY, { align: 'center' });

            pdf.save(`cheshbeshbon-${calcId}-${Date.now()}.pdf`);
        } catch (err) {
            console.error('PDF export error:', err);
            alert('שגיאה בייצוא. נסה שוב.');
        } finally {
            if (btn) {
                btn.innerHTML = origText;
                btn.disabled = false;
            }
        }
    },

    renderButton(calcId, title) {
        return `<button class="btn-share btn-pdf" onclick="PDFExport.exportResults('${calcId}', '${title}')">
            &#x1F4C4; ייצוא PDF
        </button>`;
    }
};
