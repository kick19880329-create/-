/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface FeedingRecord {
    id: number;
    type: string; // e.g., '분유', '이유식'
    amount: number;
    time: string; // ISO string format
}

const STORAGE_KEY = 'babyFeedingRecords';

let records: FeedingRecord[] = [];
let countdownInterval: number | undefined;


// DOM Elements
const foodTypeInput = document.getElementById('food-type-input') as HTMLInputElement;
const amountInput = document.getElementById('amount-input') as HTMLInputElement;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
const logList = document.getElementById('log-list') as HTMLUListElement;
const lastMealInfoEl = document.getElementById('last-meal-info') as HTMLElement;
const foodTypeButtonsContainer = document.querySelector('.food-type-buttons') as HTMLDivElement;
const addCustomTypeBtn = document.getElementById('add-custom-type-btn') as HTMLButtonElement;
const decreaseAmountBtn = document.getElementById('decrease-amount-btn') as HTMLButtonElement;
const increaseAmountBtn = document.getElementById('increase-amount-btn') as HTMLButtonElement;
const countdownTimerEl = document.getElementById('countdown-timer') as HTMLDivElement;
const nextMealDisplayEl = document.getElementById('next-meal-display') as HTMLDivElement;
const currentTimeEl = document.getElementById('current-time') as HTMLDivElement;


// --- Data Persistence ---
function loadRecords(): void {
    const storedRecords = localStorage.getItem(STORAGE_KEY);
    if (storedRecords) {
        records = JSON.parse(storedRecords) as FeedingRecord[];
        records.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    }
}

function saveRecords(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}


// --- Rendering ---

function getIconForType(type: string): string {
    switch (type) {
        case '분유':
            return 'fa-solid fa-bottle-water';
        case '이유식':
            return 'fa-solid fa-bowl-food';
        case '간식':
            return 'fa-solid fa-cookie-bite';
        case '물':
            return 'fa-solid fa-glass-water';
        default:
            return 'fa-solid fa-utensils';
    }
}

function renderLog(): void {
    logList.innerHTML = '';
    if (records.length === 0) {
        const li = document.createElement('li');
        li.textContent = '기록이 없습니다.';
        li.style.textAlign = 'center';
        li.style.padding = '2rem 0';
        li.style.color = 'var(--text-color-secondary)';
        logList.appendChild(li);
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    records.forEach(record => {
        const li = document.createElement('li');
        li.className = 'log-item';
        li.dataset.id = record.id.toString();

        const recordTime = new Date(record.time);
        const recordDate = new Date(record.time);
        recordDate.setHours(0, 0, 0, 0);

        let dateDisplay;
        if (recordDate.getTime() === today.getTime()) {
            dateDisplay = '오늘';
        } else {
            dateDisplay = recordTime.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
        }
        
        const formattedTime = recordTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

        li.innerHTML = `
            <div class="icon"><i class="${getIconForType(record.type)}"></i></div>
            <div class="details">
                <div class="type">${record.type}</div>
                <div class="info">${record.amount}ml/g · ${dateDisplay} ${formattedTime}</div>
            </div>
            <button class="delete-btn" title="삭제"><i class="fa-solid fa-trash-can"></i></button>
        `;
        
        const deleteBtn = li.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (confirm('이 기록을 삭제하시겠습니까?')) {
                    deleteRecord(record.id);
                }
            });
        }
        
        logList.appendChild(li);
    });
}


function startCountdown(targetDate: Date): void {
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    countdownInterval = window.setInterval(() => {
        const now = new Date().getTime();
        const distance = targetDate.getTime() - now;

        if (distance < 0) {
            clearInterval(countdownInterval);
            countdownTimerEl.textContent = '식사 시간!';
            return;
        }

        const hours = Math.floor(distance / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        const formattedHours = String(hours).padStart(2, '0');
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(seconds).padStart(2, '0');

        countdownTimerEl.textContent = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    }, 1000);
}


function updateNextMealSuggestion(): void {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = undefined;
    }

    if (records.length === 0) {
        countdownTimerEl.textContent = '한성아 밥묵자';
        lastMealInfoEl.textContent = '';
        if (nextMealDisplayEl) {
            const today = new Date();
            const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
            nextMealDisplayEl.textContent = today.toLocaleDateString('ko-KR', options);
            nextMealDisplayEl.classList.add('date-display');
        }
        return;
    }

    const lastRecord = records[0];
    const lastMealTime = new Date(lastRecord.time);
    
    let intervalHours: number;
    if (lastRecord.type === '분유' && lastRecord.amount > 0) {
        // 분유 40ml당 1시간으로 계산
        intervalHours = lastRecord.amount / 40;
    } else {
        // 그 외 (이유식, 간식 등)는 기본 4시간으로 설정
        intervalHours = 4;
    }

    const nextMealTime = new Date(lastMealTime.getTime() + intervalHours * 60 * 60 * 1000);
    
    const nextMealHour = nextMealTime.getHours();
    let timePrefix = '';
    // 새벽 시간 (00:00 ~ 05:59)을 확인
    if (nextMealHour >= 0 && nextMealHour < 6) { 
        timePrefix = '새벽 ';
    }

    const formattedNextTime = nextMealTime.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: false });
    
    const lastMealHours = lastMealTime.getHours();
    const lastMealMinutes = lastMealTime.getMinutes();
    const formattedLastTime = `${lastMealHours}시${String(lastMealMinutes).padStart(2, '0')}분`;

    if (nextMealDisplayEl) {
        nextMealDisplayEl.classList.remove('date-display');
        nextMealDisplayEl.textContent = `${timePrefix}${formattedNextTime}`;
    }
    lastMealInfoEl.textContent = `최근 식사: ${lastRecord.type} ${formattedLastTime}`;
    startCountdown(nextMealTime);
}

// --- Core Logic ---

function addRecord(): void {
    const type = foodTypeInput.value.trim();
    const amountStr = amountInput.value;

    if (!type || !amountStr) {
        alert('모든 필드를 올바르게 입력해주세요.');
        return;
    }
    
    const amount = parseInt(amountStr, 10);
     if (isNaN(amount) || amount <= 0) {
        alert('양이 올바르게 입력되지 않았습니다.');
        return;
    }


    const newRecord: FeedingRecord = {
        id: Date.now(),
        type,
        amount,
        time: new Date().toISOString(),
    };

    records.unshift(newRecord);
    records.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    saveRecords();
    renderLog();
    updateNextMealSuggestion();

    // Reset form
    foodTypeInput.value = '';
    amountInput.value = '200';
    document.querySelector('.food-type-btn.selected')?.classList.remove('selected');
}

function deleteRecord(id: number): void {
    records = records.filter(record => record.id !== id);
    saveRecords();
    renderLog();
    updateNextMealSuggestion();
}

function updateCurrentTime(): void {
    if (!currentTimeEl) return;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const formattedMinutes = String(minutes).padStart(2, '0');

    currentTimeEl.textContent = `${hours}시 ${formattedMinutes}분`;
}

// --- Event Listeners Setup ---
saveBtn.addEventListener('click', addRecord);

decreaseAmountBtn.addEventListener('click', () => {
    const currentValue = parseInt(amountInput.value, 10) || 0;
    const newValue = Math.max(0, currentValue - 20); // Prevent going below 0
    amountInput.value = newValue.toString();
});

increaseAmountBtn.addEventListener('click', () => {
    const currentValue = parseInt(amountInput.value, 10) || 0;
    amountInput.value = (currentValue + 20).toString();
});

foodTypeButtonsContainer.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest('.food-type-btn');
    if (button && !button.closest('#amount-buttons')) { // Ensure it's not an amount button
        foodTypeButtonsContainer.querySelectorAll('.food-type-btn').forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        foodTypeInput.value = button.getAttribute('data-type') || '';
    }
});

addCustomTypeBtn.addEventListener('click', () => {
    const customType = prompt('추가할 항목의 이름을 입력하세요 (예: 보리차, 물):');
    if (customType && customType.trim() !== '') {
        foodTypeInput.value = customType.trim();
        foodTypeButtonsContainer.querySelectorAll('.food-type-btn').forEach(btn => btn.classList.remove('selected'));
    }
});

foodTypeInput.addEventListener('input', () => {
    foodTypeButtonsContainer.querySelectorAll('.food-type-btn').forEach(btn => btn.classList.remove('selected'));
});

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    loadRecords();
    renderLog();
    updateNextMealSuggestion();
    
    // Set '분유' as the default selected type
    const defaultTypeButton = document.querySelector('.food-type-btn[data-type="분유"]');
    if (defaultTypeButton) {
        defaultTypeButton.classList.add('selected');
        foodTypeInput.value = '분유';
    }

    // Initialize and update the clock
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
});