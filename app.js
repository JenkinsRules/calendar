'use strict';

// ─── Constants & state ────────────────────────────────────────────────────────
const LS_KEY = 'calendarEvents';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const state = {
  currentYear: 0,
  currentMonth: 0,   // 0-indexed
  events: [],
  editingId: null,   // null = add mode, string = edit mode
};

// ─── localStorage helpers ─────────────────────────────────────────────────────
function loadEvents() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function saveEvents(events) {
  localStorage.setItem(LS_KEY, JSON.stringify(events));
}

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── Date utilities ───────────────────────────────────────────────────────────
function buildDateString(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function getTodayString() {
  const t = new Date();
  return buildDateString(t.getFullYear(), t.getMonth(), t.getDate());
}

function formatDateDisplay(dateStr) {
  // "YYYY-MM-DD" → "March 25, 2026"
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
}

function formatTime(timeStr) {
  // "09:00" → "9:00 AM"
  if (!timeStr) return '';
  const [h, min] = timeStr.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 || 12;
  return `${hour}:${String(min).padStart(2, '0')} ${ampm}`;
}

// ─── Event queries ────────────────────────────────────────────────────────────
function getEventsForDate(dateStr) {
  return state.events.filter(e => e.date === dateStr);
}

// ─── Rendering: header ────────────────────────────────────────────────────────
function renderHeader() {
  document.getElementById('month-label').textContent =
    `${MONTH_NAMES[state.currentMonth]} ${state.currentYear}`;
}

// ─── Rendering: grid ─────────────────────────────────────────────────────────
function renderGrid() {
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const today = getTodayString();
  const year  = state.currentYear;
  const month = state.currentMonth;

  // Day index of the 1st of the month (0=Sun)
  const firstWeekday = new Date(year, month, 1).getDay();
  // Total days in month
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  // Days in previous month (for leading filler)
  const daysInPrev   = new Date(year, month, 0).getDate();

  // Total cells: always a multiple of 7, at least 35
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'day-cell';

    let dateStr;
    if (i < firstWeekday) {
      // Leading days from previous month
      const day = daysInPrev - firstWeekday + i + 1;
      const [py, pm] = month === 0
        ? [year - 1, 11]
        : [year, month - 1];
      dateStr = buildDateString(py, pm, day);
      cell.classList.add('other-month');
      addDayNumber(cell, day);
    } else if (i < firstWeekday + daysInMonth) {
      // Current month
      const day = i - firstWeekday + 1;
      dateStr = buildDateString(year, month, day);
      if (dateStr === today) cell.classList.add('today');
      addDayNumber(cell, day);
    } else {
      // Trailing days from next month
      const day = i - firstWeekday - daysInMonth + 1;
      const [ny, nm] = month === 11
        ? [year + 1, 0]
        : [year, month + 1];
      dateStr = buildDateString(ny, nm, day);
      cell.classList.add('other-month');
      addDayNumber(cell, day);
    }

    renderEventChips(cell, dateStr);

    cell.dataset.date = dateStr;
    cell.addEventListener('click', onCellClick);
    grid.appendChild(cell);
  }
}

function addDayNumber(cell, day) {
  const span = document.createElement('span');
  span.className = 'day-number';
  span.textContent = day;
  cell.appendChild(span);
}

// ─── Rendering: event chips ───────────────────────────────────────────────────
function renderEventChips(cell, dateStr) {
  const events = getEventsForDate(dateStr);
  if (!events.length) return;

  const list = document.createElement('div');
  list.className = 'event-list';

  // Show up to 3 chips; remainder shown as "+N more"
  const MAX_CHIPS = 3;
  const visible  = events.slice(0, MAX_CHIPS);
  const overflow = events.length - MAX_CHIPS;

  visible.forEach(ev => {
    const chip = document.createElement('span');
    chip.className = 'event-chip';
    chip.textContent = ev.time ? `${formatTime(ev.time)} ${ev.title}` : ev.title;
    chip.dataset.id = ev.id;
    chip.addEventListener('click', onChipClick);
    list.appendChild(chip);
  });

  if (overflow > 0) {
    const more = document.createElement('span');
    more.className = 'event-chip-more';
    more.textContent = `+${overflow} more`;
    more.dataset.date = dateStr;
    more.addEventListener('click', e => {
      e.stopPropagation();
      // Open add modal for that date so user sees context
      openModal('add', dateStr);
    });
    list.appendChild(more);
  }

  cell.appendChild(list);
}

// ─── Month navigation ─────────────────────────────────────────────────────────
function prevMonth() {
  if (state.currentMonth === 0) {
    state.currentMonth = 11;
    state.currentYear -= 1;
  } else {
    state.currentMonth -= 1;
  }
}

function nextMonth() {
  if (state.currentMonth === 11) {
    state.currentMonth = 0;
    state.currentYear += 1;
  } else {
    state.currentMonth += 1;
  }
}

// ─── Modal helpers ────────────────────────────────────────────────────────────
function openModal(mode, dateStr, eventId) {
  const overlay   = document.getElementById('modal-overlay');
  const title     = document.getElementById('modal-title');
  const deleteBtn = document.getElementById('btn-delete-event');

  clearForm();
  clearErrors();

  if (mode === 'edit' && eventId) {
    state.editingId = eventId;
    const ev = state.events.find(e => e.id === eventId);
    if (ev) {
      populateForm(ev);
      title.textContent = 'Edit Event';
      deleteBtn.classList.remove('hidden');
    }
  } else {
    state.editingId = null;
    title.textContent = 'Add Event';
    deleteBtn.classList.add('hidden');
    if (dateStr) {
      document.getElementById('input-date').value = dateStr;
    }
  }

  overlay.classList.remove('hidden');
  // Focus first input after render
  setTimeout(() => document.getElementById('input-title').focus(), 30);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  clearForm();
  clearErrors();
  state.editingId = null;
}

function populateForm(ev) {
  document.getElementById('input-title').value = ev.title       || '';
  document.getElementById('input-date').value  = ev.date        || '';
  document.getElementById('input-time').value  = ev.time        || '';
  document.getElementById('input-desc').value  = ev.description || '';
}

function clearForm() {
  document.getElementById('event-form').reset();
}

function collectForm() {
  return {
    title:       document.getElementById('input-title').value,
    date:        document.getElementById('input-date').value,
    time:        document.getElementById('input-time').value,
    description: document.getElementById('input-desc').value,
  };
}

// ─── Focus trap ───────────────────────────────────────────────────────────────
function trapFocus(e) {
  const modal = document.getElementById('modal');
  const focusable = Array.from(
    modal.querySelectorAll('button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])')
  ).filter(el => !el.closest('.hidden'));

  if (!focusable.length) return;
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];

  if (e.key === 'Tab') {
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateForm(data) {
  const errors = {};

  const title = data.title.trim();
  if (!title) {
    errors.title = 'Title is required.';
  } else if (title.length > 100) {
    errors.title = 'Title must be 100 characters or fewer.';
  }

  const date = data.date.trim();
  if (!date) {
    errors.date = 'Date is required.';
  } else if (isNaN(new Date(date).getTime())) {
    errors.date = 'Please enter a valid date.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function showErrors(errors) {
  const titleInput = document.getElementById('input-title');
  const dateInput  = document.getElementById('input-date');
  const errTitle   = document.getElementById('err-title');
  const errDate    = document.getElementById('err-date');

  if (errors.title) {
    errTitle.textContent = errors.title;
    titleInput.setAttribute('aria-invalid', 'true');
  }
  if (errors.date) {
    errDate.textContent = errors.date;
    dateInput.setAttribute('aria-invalid', 'true');
  }
}

function clearErrors() {
  document.getElementById('err-title').textContent = '';
  document.getElementById('err-date').textContent  = '';
  document.getElementById('input-title').removeAttribute('aria-invalid');
  document.getElementById('input-date').removeAttribute('aria-invalid');
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────
function saveEvent(data) {
  const now = new Date().toISOString();
  if (state.editingId) {
    const idx = state.events.findIndex(e => e.id === state.editingId);
    if (idx !== -1) {
      state.events[idx] = {
        ...state.events[idx],
        title:       data.title.trim(),
        date:        data.date,
        time:        data.time,
        description: data.description,
        updatedAt:   now,
      };
    }
  } else {
    state.events.push({
      id:          generateId(),
      title:       data.title.trim(),
      date:        data.date,
      time:        data.time,
      description: data.description,
      createdAt:   now,
      updatedAt:   now,
    });
  }
  saveEvents(state.events);
  renderGrid();
}

function deleteEvent(id) {
  state.events = state.events.filter(e => e.id !== id);
  saveEvents(state.events);
  renderGrid();
  closeModal();
}

// ─── Event handlers ───────────────────────────────────────────────────────────
function onCellClick(e) {
  // Only trigger if click is directly on the cell or day-number, not a chip
  if (e.target.closest('.event-chip') || e.target.closest('.event-chip-more')) return;
  const dateStr = e.currentTarget.dataset.date;
  openModal('add', dateStr);
}

function onChipClick(e) {
  e.stopPropagation();
  const id = e.currentTarget.dataset.id;
  openModal('edit', null, id);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  // Seed state from today
  const today = new Date();
  state.currentYear  = today.getFullYear();
  state.currentMonth = today.getMonth();
  state.events       = loadEvents();

  // Render static day headers
  const headersEl = document.getElementById('day-headers');
  DAY_NAMES.forEach(name => {
    const span = document.createElement('span');
    span.textContent = name;
    headersEl.appendChild(span);
  });

  renderHeader();
  renderGrid();

  // Navigation
  document.getElementById('btn-prev').addEventListener('click', () => {
    prevMonth(); renderHeader(); renderGrid();
  });
  document.getElementById('btn-next').addEventListener('click', () => {
    nextMonth(); renderHeader(); renderGrid();
  });

  // Add event button
  document.getElementById('btn-add-event').addEventListener('click', () => {
    openModal('add');
  });

  // Modal close
  document.getElementById('modal-close').addEventListener('click', closeModal);

  // Click overlay background to close
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  // Escape to close + focus trap
  document.addEventListener('keydown', e => {
    if (document.getElementById('modal-overlay').classList.contains('hidden')) return;
    if (e.key === 'Escape') { closeModal(); return; }
    trapFocus(e);
  });

  // Form submit
  document.getElementById('event-form').addEventListener('submit', e => {
    e.preventDefault();
    clearErrors();
    const data = collectForm();
    const { valid, errors } = validateForm(data);
    if (!valid) { showErrors(errors); return; }
    saveEvent(data);
    closeModal();
  });

  // Delete button
  document.getElementById('btn-delete-event').addEventListener('click', () => {
    if (!state.editingId) return;
    if (confirm('Delete this event?')) {
      deleteEvent(state.editingId);
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
