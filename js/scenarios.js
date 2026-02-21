/**
 * scenarios.js — Save/restore calculator scenarios to localStorage
 */
const Scenarios = {
    MAX_PER_CALC: 10,
    STORAGE_KEY: 'cheshbeshbon_scenarios',

    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    init() {
        this.renderAll();
    },

    getAll() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
        } catch { return {}; }
    },

    saveAll(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    },

    save(calcId, name) {
        if (!name || !name.trim()) return;
        const state = this.captureState(calcId);
        if (!state) return;

        const all = this.getAll();
        if (!all[calcId]) all[calcId] = [];

        // Limit per calculator
        if (all[calcId].length >= this.MAX_PER_CALC) {
            all[calcId].shift();
        }

        all[calcId].push({
            name: name.trim(),
            state,
            date: new Date().toLocaleDateString('he-IL')
        });

        this.saveAll(all);
        this.renderChips(calcId);
    },

    remove(calcId, index) {
        const all = this.getAll();
        if (all[calcId]) {
            all[calcId].splice(index, 1);
            this.saveAll(all);
            this.renderChips(calcId);
        }
    },

    restore(calcId, index) {
        const all = this.getAll();
        const scenario = all[calcId]?.[index];
        if (!scenario) return;
        this.applyState(calcId, scenario.state);
    },

    captureState(calcId) {
        const section = document.getElementById(calcId + '-section');
        if (!section) return null;

        const state = {};
        section.querySelectorAll('input, select').forEach(el => {
            if (!el.id) return;
            if (el.type === 'checkbox') {
                state[el.id] = el.checked;
            } else {
                state[el.id] = el.value;
            }
        });
        return state;
    },

    applyState(calcId, state) {
        const section = document.getElementById(calcId + '-section');
        if (!section) return;

        section.querySelectorAll('input, select').forEach(el => {
            if (!el.id) return;
            if (state[el.id] !== undefined) {
                if (el.type === 'checkbox') {
                    el.checked = state[el.id];
                } else {
                    el.value = state[el.id];
                }
            }
        });

        // Trigger recalculation
        const event = new Event('input', { bubbles: true });
        const firstInput = section.querySelector('input');
        if (firstInput) firstInput.dispatchEvent(event);
    },

    renderAll() {
        ['mortgage', 'salary', 'rent-vs-buy', 'pension'].forEach(id => {
            this.renderChips(id);
        });
    },

    renderChips(calcId) {
        const container = document.getElementById('scenarios-' + calcId);
        if (!container) return;

        const all = this.getAll();
        const scenarios = all[calcId] || [];

        if (scenarios.length === 0) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        container.innerHTML = scenarios.map((s, i) => `
            <button class="scenario-chip" onclick="Scenarios.restore('${calcId}', ${i})" title="${this.escapeHTML(s.date)}">
                ${this.escapeHTML(s.name)}
                <span class="scenario-remove" onclick="event.stopPropagation(); Scenarios.remove('${calcId}', ${i})">&#x2715;</span>
            </button>
        `).join('');
    },

    promptSave(calcId) {
        const name = prompt('שם התרחיש:');
        if (name) this.save(calcId, name);
    },

    renderSaveButton(calcId) {
        return `<button class="btn-share" onclick="Scenarios.promptSave('${calcId}')">
            &#x1F4BE; שמור תרחיש
        </button>`;
    }
};
