document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const currentCountEl = document.getElementById('current-count');
    const countBtn = document.getElementById('count-btn');
    const malasCompletedEl = document.getElementById('malas-completed');
    const malasBubble = document.getElementById('malas-bubble');
    const totalChantsEl = document.getElementById('total-chants');
    const totalTimeEl = document.getElementById('total-time');
    const toggleProgressBtn = document.getElementById('toggle-progress');
    const progressTableBody = document.getElementById('progress-table-body');
    const tableTotalChantsEl = document.getElementById('table-total-chants');
    const tableTotalTimeEl = document.getElementById('table-total-time');
    const resetAllBtn = document.getElementById('reset-all-btn');
    const progressRing = document.getElementById('progress-ring-circle');

    // --- STATE & CONSTANTS ---
    const CHANTS_PER_MALA = 108;
    const circumference = 2 * Math.PI * 110; // Radius is 110
    let state = {
        currentChant: 0,
        totalChants: 0,
        totalTimeElapsed: 0,
        lastTimestamp: null,
        completedMalas: [],
    };
    let timerInterval = null;

    // --- INITIALIZATION ---
    function init() {
        progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
        progressRing.style.strokeDashoffset = circumference;
        loadState();
        render();
        // Trigger on-load animations
        const revealElements = document.querySelectorAll('.reveal');
        revealElements.forEach(el => {
            const delay = el.dataset.delay || 0;
            setTimeout(() => {
                el.classList.add('active');
            }, delay);
        });
    }
    
    init();

    // --- EVENT LISTENERS ---
    countBtn.addEventListener('click', handleCount);
    toggleProgressBtn.addEventListener('click', toggleProgressView);
    resetAllBtn.addEventListener('click', resetAllProgress);
    progressTableBody.addEventListener('click', handleTableClick);

    // --- CORE FUNCTIONS ---
    function handleCount() {
        if (!timerInterval) startTimer();

        state.currentChant++;
        state.totalChants++;

        // Add pop animation to the number
        currentCountEl.classList.add('pop');
        setTimeout(() => currentCountEl.classList.remove('pop'), 200);

        if (state.currentChant >= CHANTS_PER_MALA) { // Use >= to be safe
            completeMala();
        }
        
        saveState();
        render();
    }

    function completeMala() {
        const timeForThisMala = state.totalTimeElapsed - state.completedMalas.reduce((acc, mala) => acc + mala.timeTaken, 0);

        const newMala = {
            malaNumber: state.completedMalas.length + 1,
            timeTaken: timeForThisMala,
            chants: CHANTS_PER_MALA
        };
        state.completedMalas.push(newMala);
        state.currentChant = 0;
        
        stopTimer();

        // Add flash animation for celebration
        progressRing.classList.add('flash');
        malasBubble.classList.add('flash');
        setTimeout(() => {
            progressRing.classList.remove('flash');
            malasBubble.classList.remove('flash');
        }, 1000);
    }

    function resetAllProgress() {
        if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
            stopTimer();
            state = {
                currentChant: 0, totalChants: 0, totalTimeElapsed: 0,
                lastTimestamp: null, completedMalas: [],
            };
            saveState();
            render();
        }
    }

    function deleteMala(malaNumber) {
        // ... (rest of the delete logic remains the same)
        const malaIndex = state.completedMalas.findIndex(m => m.malaNumber === malaNumber);
        if (malaIndex === -1) return;

        const deletedMala = state.completedMalas[malaIndex];
        state.totalChants -= deletedMala.chants;
        state.totalTimeElapsed -= deletedMala.timeTaken;
        
        state.completedMalas.splice(malaIndex, 1);
        state.completedMalas.forEach((mala, index) => mala.malaNumber = index + 1);

        if (state.completedMalas.length === 0 && state.currentChant === 0) {
            resetAllProgress();
        } else {
            saveState();
            render();
        }
    }
    
    // --- UI & RENDERING ---
    function render() {
        currentCountEl.textContent = state.currentChant;
        totalChantsEl.textContent = state.totalChants;
        malasCompletedEl.textContent = state.completedMalas.length;
        totalTimeEl.textContent = formatTime(state.totalTimeElapsed);
        updateProgressRing();
        renderTable();
        updateTableTotals();
    }

    function renderTable() {
        progressTableBody.innerHTML = '';
        state.completedMalas.forEach(mala => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${mala.malaNumber}</td>
                <td>${mala.chants}</td>
                <td>${formatTime(mala.timeTaken)}</td>
                <td>
                    <button class="delete-btn" data-mala-number="${mala.malaNumber}">
                        &#128465;
                    </button>
                </td>`;
            progressTableBody.appendChild(row);
        });
    }

    function updateTableTotals() {
        const totalCompletedChants = state.completedMalas.reduce((sum, mala) => sum + mala.chants, 0);
        const totalCompletedTime = state.completedMalas.reduce((sum, mala) => sum + mala.timeTaken, 0);
        tableTotalChantsEl.textContent = totalCompletedChants + state.currentChant;
        tableTotalTimeEl.textContent = formatTime(totalCompletedTime);
    }
    
    function updateProgressRing() {
        const percent = state.currentChant / CHANTS_PER_MALA;
        const offset = circumference - percent * circumference;
        progressRing.style.strokeDashoffset = offset;
    }

    // --- TIMER FUNCTIONS ---
    function startTimer() {
        if (timerInterval) return;
        state.lastTimestamp = Date.now();
        timerInterval = setInterval(updateTimer, 100);
    }

    function stopTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    function updateTimer() {
        const now = Date.now();
        const delta = now - state.lastTimestamp;
        state.totalTimeElapsed += delta;
        state.lastTimestamp = now;
        totalTimeEl.textContent = formatTime(state.totalTimeElapsed);
        saveState();
    }

    // --- UTILITY & LOCAL STORAGE ---
    function formatTime(ms) {
        if (!ms || ms < 0) ms = 0;
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function toggleProgressView() { document.body.classList.toggle('show-progress'); }

    function handleTableClick(event) {
        const deleteButton = event.target.closest('.delete-btn');
        if (deleteButton) {
            const malaNumber = parseInt(deleteButton.dataset.malaNumber, 10);
            deleteMala(malaNumber);
        }
    }

    function saveState() { localStorage.setItem('japaCounterStatePro', JSON.stringify(state)); }

    function loadState() {
        const savedState = localStorage.getItem('japaCounterStatePro');
        if (savedState) state = JSON.parse(savedState);
    }
});