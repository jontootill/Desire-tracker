// State Management
const STORAGE_KEY_QUESTIONS = 'daily_tracker_questions';
const STORAGE_KEY_ENTRIES = 'daily_tracker_entries';

// Default initial setup if empty
const defaultQuestions = [
  { id: 'q1', text: 'Horniness' },
  { id: 'q2', text: 'Desire for porn' },
  { id: 'q3', text: 'Desire for sex' },
  { id: 'q4', text: 'Mood (1-10)' }
];

let questions = JSON.parse(localStorage.getItem(STORAGE_KEY_QUESTIONS)) || defaultQuestions;
let entries = JSON.parse(localStorage.getItem(STORAGE_KEY_ENTRIES)) || {};

// Color palette for chart lines
const chartColors = [
  '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
];

let chartInstance = null;

// DOM Elements
const entryDateInput = document.getElementById('entry-date');
const questionsContainer = document.getElementById('questions-inputs-container');
const noQuestionsNotice = document.getElementById('no-questions-notice');
const trackerForm = document.getElementById('tracker-form');
const manageQuestionsBtn = document.getElementById('manage-questions-btn');
const noticeSetupBtn = document.getElementById('notice-setup-btn');
const questionsModal = document.getElementById('questions-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const doneModalBtn = document.getElementById('done-modal-btn');
const addQuestionForm = document.getElementById('add-question-form');
const newQuestionInput = document.getElementById('new-question-text');
const modalQuestionsList = document.getElementById('modal-questions-list');
const historyTableHead = document.getElementById('history-table-head');
const historyTableBody = document.getElementById('history-table-body');
const exportCsvBtn = document.getElementById('export-csv-btn');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  // Set default date input to today (YYYY-MM-DD local)
  const today = new Date().toLocaleDateString('en-CA');
  entryDateInput.value = today;

  // Initialize Lucide icons
  lucide.createIcons();

  // Render UI Components
  renderFormQuestions();
  loadDateEntry(today);
  renderHistoryTable();
  initChart();

  // Event Listeners
  entryDateInput.addEventListener('change', (e) => loadDateEntry(e.target.value));
  trackerForm.addEventListener('submit', handleFormSubmit);
  
  manageQuestionsBtn.addEventListener('click', openModal);
  noticeSetupBtn.addEventListener('click', openModal);
  closeModalBtn.addEventListener('click', closeModal);
  doneModalBtn.addEventListener('click', closeModal);
  addQuestionForm.addEventListener('submit', handleAddQuestion);
  exportCsvBtn.addEventListener('click', exportToCSV);
});

// Save State Helpers
function saveQuestionsState() {
  localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(questions));
}

function saveEntriesState() {
  localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
}

// Render Input Form Fields
function renderFormQuestions() {
  questionsContainer.innerHTML = '';

  if (questions.length === 0) {
    noQuestionsNotice.classList.remove('hidden');
    return;
  } else {
    noQuestionsNotice.classList.add('hidden');
  }

  questions.forEach((q) => {
    const div = document.createElement('div');
    div.className = "flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors";
    
    div.innerHTML = `
      <label for="q_${q.id}" class="text-sm font-medium text-slate-700 flex-1">${q.text}</label>
      <input type="number" step="any" id="q_${q.id}" data-id="${q.id}" placeholder="0" class="w-full sm:w-32 rounded-md border-slate-300 border px-3 py-1.5 text-sm text-right focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">
    `;
    questionsContainer.appendChild(div);
  });
}

// Load existing values into form for selected date
function loadDateEntry(dateStr) {
  const entryData = entries[dateStr] || {};
  
  questions.forEach(q => {
    const input = document.getElementById(`q_${q.id}`);
    if (input) {
      input.value = entryData[q.id] !== undefined ? entryData[q.id] : '';
    }
  });
}

// Handle Form Submission (Saving Data)
function handleFormSubmit(e) {
  e.preventDefault();
  const dateVal = entryDateInput.value;
  if (!dateVal) return;

  const entryData = {};
  let hasValue = false;

  questions.forEach(q => {
    const input = document.getElementById(`q_${q.id}`);
    if (input && input.value !== '') {
      entryData[q.id] = parseFloat(input.value);
      hasValue = true;
    }
  });

  if (hasValue) {
    entries[dateVal] = entryData;
  } else {
    delete entries[dateVal];
  }

  saveEntriesState();
  renderHistoryTable();
  updateChart();

  // Visual feedback
  const btn = document.getElementById('save-entry-btn');
  const originalHTML = btn.innerHTML;
  btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Saved!`;
  btn.classList.replace('bg-indigo-600', 'bg-emerald-600');
  lucide.createIcons();

  setTimeout(() => {
    btn.innerHTML = originalHTML;
    btn.classList.replace('bg-emerald-600', 'bg-indigo-600');
    lucide.createIcons();
  }, 1500);
}

// Modal Handlers
function openModal() {
  renderModalQuestionsList();
  questionsModal.classList.remove('hidden');
}

function closeModal() {
  questionsModal.classList.add('hidden');
  renderFormQuestions();
  loadDateEntry(entryDateInput.value);
  renderHistoryTable();
  updateChart();
}

function renderModalQuestionsList() {
  modalQuestionsList.innerHTML = '';
  
  if (questions.length === 0) {
    modalQuestionsList.innerHTML = `<li class="text-xs text-slate-400 italic py-1">No questions created yet.</li>`;
    return;
  }

  questions.forEach(q => {
    const li = document.createElement('li');
    li.className = "flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100 text-sm";
    li.innerHTML = `
      <span class="text-slate-700 font-medium">${q.text}</span>
      <button text-red-500 hover:text-red-700 data-action="delete" data-id="${q.id}" class="text-slate-400 hover:text-red-500 p-1 rounded transition-colors">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    `;

    li.querySelector('[data-action="delete"]').addEventListener('click', () => handleDeleteQuestion(q.id));
    modalQuestionsList.appendChild(li);
  });
  
  lucide.createIcons();
}

function handleAddQuestion(e) {
  e.preventDefault();
  const text = newQuestionInput.value.trim();
  if (!text) return;

  const newId = 'q_' + Date.now();
  questions.push({ id: newId, text });
  saveQuestionsState();

  newQuestionInput.value = '';
  renderModalQuestionsList();
}

function handleDeleteQuestion(id) {
  if (confirm('Delete this question? Existing historical numbers for this question will remain in records.')) {
    questions = questions.filter(q => q.id !== id);
    saveQuestionsState();
    renderModalQuestionsList();
  }
}

// Render Table History
function renderHistoryTable() {
  historyTableHead.innerHTML = '';
  historyTableBody.innerHTML = '';

  const dates = Object.keys(entries).sort().reverse();

  // Create Headers
  const trHead = document.createElement('tr');
  let headHTML = `<th class="px-4 py-3">Date</th>`;
  questions.forEach(q => {
    headHTML += `<th class="px-4 py-3">${q.text}</th>`;
  });
  headHTML += `<th class="px-4 py-3 text-right">Actions</th>`;
  trHead.innerHTML = headHTML;
  historyTableHead.appendChild(trHead);

  if (dates.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="${questions.length + 2}" class="px-4 py-6 text-center text-slate-400">No logs stored yet. Add an entry above!</td>`;
    historyTableBody.appendChild(tr);
    return;
  }

  // Create Rows
  dates.forEach(date => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50/80 transition-colors";

    let rowHTML = `<td class="px-4 py-3 font-medium text-slate-900">${date}</td>`;
    questions.forEach(q => {
      const val = entries[date][q.id];
      rowHTML += `<td class="px-4 py-3">${val !== undefined ? val : '-'}</td>`;
    });

    rowHTML += `
      <td class="px-4 py-3 text-right">
        <button data-date="${date}" class="delete-entry-btn text-slate-400 hover:text-red-500 p-1 transition-colors" title="Delete day entry">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </td>
    `;

    tr.innerHTML = rowHTML;
    historyTableBody.appendChild(tr);
  });

  // Attach delete handlers
  document.querySelectorAll('.delete-entry-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const d = e.currentTarget.getAttribute('data-date');
      if (confirm(`Delete entries for ${d}?`)) {
        delete entries[d];
        saveEntriesState();
        renderHistoryTable();
        updateChart();
        if (entryDateInput.value === d) {
          loadDateEntry(d);
        }
      }
    });
  });

  lucide.createIcons();
}

// Chart Visualization
function initChart() {
  const ctx = document.getElementById('trendsChart').getContext('2d');
  
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: getChartData(),
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, padding: 15, font: { size: 12 } }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        }
      },
      scales: {
        x: {
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          grid: { color: '#f1f5f9' }
        }
      }
    }
  });
}

function getChartData() {
  // Sort dates ascending for chart
  const dates = Object.keys(entries).sort().slice(-14);

  const datasets = questions.map((q, idx) => {
    return {
      label: q.text,
      data: dates.map(d => entries[d][q.id] !== undefined ? entries[d][q.id] : null),
      borderColor: chartColors[idx % chartColors.length],
      backgroundColor: chartColors[idx % chartColors.length] + '20',
      spanGaps: true,
      tension: 0.3,
      borderWidth: 2,
      pointRadius: 3
    };
  });

  return { labels: dates, datasets };
}

function updateChart() {
  if (chartInstance) {
    chartInstance.data = getChartData();
    chartInstance.update();
  }
}

// Export Data to CSV
function exportToCSV() {
  const dates = Object.keys(entries).sort();
  if (dates.length === 0) {
    alert('No data to export.');
    return;
  }

  let csvContent = 'data:text/csv;charset=utf-8,';
  
  // Header row
  const headers = ['Date', ...questions.map(q => `"${q.text.replace(/"/g, '""')}"`)];
  csvContent += headers.join(',') + '\r\n';

  // Rows
  dates.forEach(date => {
    const row = [date];
    questions.forEach(q => {
      const val = entries[date][q.id];
      row.push(val !== undefined ? val : '');
    });
    csvContent += row.join(',') + '\r\n';
  });

  // Download Trigger
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `daily_tracker_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
    }
