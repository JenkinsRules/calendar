'use strict';

// ─── Constants & state ────────────────────────────────────────────────────────
const LS_KEY = 'calendarEvents';
const DAY_NAMES       = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const MONTH_NAMES_SHORT = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec'
];

const state = {
  currentYear:  0,
  currentMonth: 0,   // 0-indexed
  events:       [],
  editingId:    null,
};

// ─── localStorage ─────────────────────────────────────────────────────────────
function loadEvents() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) { return []; }
}

function saveEvents(events) {
  localStorage.setItem(LS_KEY, JSON.stringify(events));
}

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── Date utilities ───────────────────────────────────────────────────────────
function buildDateString(year, month, day) {
  return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function getTodayString() {
  const t = new Date();
  return buildDateString(t.getFullYear(), t.getMonth(), t.getDate());
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, min] = timeStr.split(':').map(Number);
  return `${h % 12 || 12}:${String(min).padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'}`;
}

// ─── Queries ──────────────────────────────────────────────────────────────────
function getEventsForDate(dateStr) {
  return state.events.filter(e => e.date === dateStr);
}

// ─── Header ───────────────────────────────────────────────────────────────────
function renderHeader() {
  document.getElementById('month-label').textContent =
    `${MONTH_NAMES[state.currentMonth]} ${state.currentYear}`;
}

// ─── Main grid ────────────────────────────────────────────────────────────────
function renderGrid() {
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const today  = getTodayString();
  const year   = state.currentYear;
  const month  = state.currentMonth;

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const daysInPrev   = new Date(year, month, 0).getDate();
  const totalCells   = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  // Make rows fill the available height evenly
  grid.style.gridTemplateRows = `repeat(${totalCells / 7}, 1fr)`;

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    let dateStr;

    if (i < firstWeekday) {
      const day = daysInPrev - firstWeekday + i + 1;
      const [py, pm] = month === 0 ? [year - 1, 11] : [year, month - 1];
      dateStr = buildDateString(py, pm, day);
      cell.classList.add('other-month');
      addDayNumber(cell, day);
    } else if (i < firstWeekday + daysInMonth) {
      const day = i - firstWeekday + 1;
      dateStr = buildDateString(year, month, day);
      if (dateStr === today) cell.classList.add('today');
      addDayNumber(cell, day);
    } else {
      const day = i - firstWeekday - daysInMonth + 1;
      const [ny, nm] = month === 11 ? [year + 1, 0] : [year, month + 1];
      dateStr = buildDateString(ny, nm, day);
      cell.classList.add('other-month');
      addDayNumber(cell, day);
    }

    renderEventChips(cell, dateStr);
    cell.dataset.date = dateStr;
    cell.setAttribute('tabindex', '0');
    cell.setAttribute('role', 'gridcell');
    // Format dateStr (YYYY-MM-DD) as a readable label, avoiding timezone shifts
    const [dy, dm, dd] = dateStr.split('-').map(Number);
    cell.setAttribute('aria-label', new Date(dy, dm - 1, dd).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    cell.addEventListener('click', onCellClick);
    cell.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCellClick(e); }
    });
    grid.appendChild(cell);
  }
}

function addDayNumber(cell, day) {
  const span = document.createElement('span');
  span.className = 'day-number';
  span.textContent = day;
  cell.appendChild(span);
}

// ─── Mini calendar ────────────────────────────────────────────────────────────
function renderMiniCalendar() {
  const grid  = document.getElementById('mini-grid');
  const label = document.getElementById('mini-month-label');
  grid.innerHTML = '';

  label.textContent = `${MONTH_NAMES_SHORT[state.currentMonth]} ${state.currentYear}`;

  const today        = getTodayString();
  const year         = state.currentYear;
  const month        = state.currentMonth;
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const daysInPrev   = new Date(year, month, 0).getDate();
  const totalCells   = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const btn = document.createElement('button');
    btn.className = 'mini-day';
    let dateStr, day;

    if (i < firstWeekday) {
      day = daysInPrev - firstWeekday + i + 1;
      const [py, pm] = month === 0 ? [year - 1, 11] : [year, month - 1];
      dateStr = buildDateString(py, pm, day);
      btn.classList.add('other-month');
    } else if (i < firstWeekday + daysInMonth) {
      day = i - firstWeekday + 1;
      dateStr = buildDateString(year, month, day);
      if (dateStr === today) btn.classList.add('today');
    } else {
      day = i - firstWeekday - daysInMonth + 1;
      const [ny, nm] = month === 11 ? [year + 1, 0] : [year, month + 1];
      dateStr = buildDateString(ny, nm, day);
      btn.classList.add('other-month');
    }

    btn.textContent = day;
    if (getEventsForDate(dateStr).length > 0) btn.classList.add('has-events');
    btn.dataset.date = dateStr;
    btn.addEventListener('click', e => { e.stopPropagation(); openModal('add', dateStr); });
    grid.appendChild(btn);
  }
}

// ─── Event chips ──────────────────────────────────────────────────────────────
function renderEventChips(cell, dateStr) {
  const events = getEventsForDate(dateStr);
  if (!events.length) return;

  const list = document.createElement('div');
  list.className = 'event-list';

  const MAX_CHIPS = 3;
  events.slice(0, MAX_CHIPS).forEach(ev => {
    const chip = document.createElement('button');
    chip.className = 'event-chip';
    chip.textContent = ev.time ? `${formatTime(ev.time)} ${ev.title}` : ev.title;
    chip.dataset.id = ev.id;
    chip.addEventListener('click', onChipClick);
    list.appendChild(chip);
  });

  const overflow = events.length - MAX_CHIPS;
  if (overflow > 0) {
    const more = document.createElement('button');
    more.className = 'event-chip-more';
    more.textContent = `+${overflow} more`;
    more.addEventListener('click', e => { e.stopPropagation(); openModal('add', dateStr); });
    list.appendChild(more);
  }

  cell.appendChild(list);
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function navigate(delta) {
  state.currentMonth += delta;
  if (state.currentMonth < 0)  { state.currentMonth = 11; state.currentYear--; }
  if (state.currentMonth > 11) { state.currentMonth = 0;  state.currentYear++; }
  renderHeader();
  renderGrid();
  renderMiniCalendar();
}

function goToToday() {
  const t = new Date();
  state.currentYear  = t.getFullYear();
  state.currentMonth = t.getMonth();
  renderHeader();
  renderGrid();
  renderMiniCalendar();
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(mode, dateStr, eventId) {
  const overlay   = document.getElementById('modal-overlay');
  const title     = document.getElementById('modal-title');
  const deleteBtn = document.getElementById('btn-delete-event');

  clearForm();
  clearErrors();

  if (mode === 'edit' && eventId) {
    state.editingId = eventId;
    const ev = state.events.find(e => e.id === eventId);
    if (ev) { populateForm(ev); title.textContent = 'Edit Event'; deleteBtn.classList.remove('hidden'); }
  } else {
    state.editingId = null;
    title.textContent = 'Add Event';
    deleteBtn.classList.add('hidden');
    if (dateStr) document.getElementById('input-date').value = dateStr;
  }

  overlay.classList.remove('hidden');
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

function clearForm() { document.getElementById('event-form').reset(); }

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
  const modal    = document.getElementById('modal');
  const focusable = Array.from(
    modal.querySelectorAll('button:not([disabled]), input, textarea')
  ).filter(el => !el.closest('.hidden'));
  if (!focusable.length) return;
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  if (e.key === 'Tab') {
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateForm(data) {
  const errors = {};
  const title = data.title.trim();
  if (!title) errors.title = 'Title is required.';
  else if (title.length > 100) errors.title = 'Title must be 100 characters or fewer.';
  if (!data.date.trim()) errors.date = 'Date is required.';
  else if (isNaN(new Date(data.date).getTime())) errors.date = 'Please enter a valid date.';
  return { valid: Object.keys(errors).length === 0, errors };
}

function showErrors(errors) {
  if (errors.title) {
    document.getElementById('err-title').textContent = errors.title;
    document.getElementById('input-title').setAttribute('aria-invalid', 'true');
  }
  if (errors.date) {
    document.getElementById('err-date').textContent = errors.date;
    document.getElementById('input-date').setAttribute('aria-invalid', 'true');
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
        title: data.title.trim(), date: data.date,
        time: data.time, description: data.description, updatedAt: now,
      };
    }
  } else {
    state.events.push({
      id: generateId(), title: data.title.trim(), date: data.date,
      time: data.time, description: data.description, createdAt: now, updatedAt: now,
    });
  }
  saveEvents(state.events);
  renderGrid();
  renderMiniCalendar();
}

function deleteEvent(id) {
  state.events = state.events.filter(e => e.id !== id);
  saveEvents(state.events);
  renderGrid();
  renderMiniCalendar();
  closeModal();
}

// ─── Event handlers ───────────────────────────────────────────────────────────
function onCellClick(e) {
  if (e.target.closest('.event-chip') || e.target.closest('.event-chip-more')) return;
  openModal('add', e.currentTarget.dataset.date);
}

function onChipClick(e) {
  e.stopPropagation();
  openModal('edit', null, e.currentTarget.dataset.id);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  const today = new Date();
  state.currentYear  = today.getFullYear();
  state.currentMonth = today.getMonth();
  state.events       = loadEvents();

  // Set logo date to today's day number
  document.getElementById('cal-icon-day').textContent = today.getDate();

  // Main day headers (Sun–Sat)
  const headersEl = document.getElementById('day-headers');
  DAY_NAMES.forEach((name, i) => {
    const span = document.createElement('span');
    span.textContent = name;
    span.setAttribute('role', 'columnheader');
    span.setAttribute('aria-label', DAY_NAMES_FULL[i]);
    headersEl.appendChild(span);
  });

  // Mini calendar day headers (S M T W T F S)
  const miniHeaders = document.getElementById('mini-day-headers');
  DAY_NAMES_SHORT.forEach((name, i) => {
    const span = document.createElement('span');
    span.textContent = name;
    span.setAttribute('aria-label', DAY_NAMES_FULL[i]);
    miniHeaders.appendChild(span);
  });

  renderHeader();
  renderGrid();
  renderMiniCalendar();

  // Start sidebar collapsed on mobile
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.add('collapsed');
  }

  // Navigation
  document.getElementById('btn-prev').addEventListener('click', () => navigate(-1));
  document.getElementById('btn-next').addEventListener('click', () => navigate(1));
  document.getElementById('btn-today').addEventListener('click', goToToday);
  document.getElementById('mini-prev').addEventListener('click', () => navigate(-1));
  document.getElementById('mini-next').addEventListener('click', () => navigate(1));

  // Sidebar toggle
  document.getElementById('btn-menu').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });

  // Create button
  document.getElementById('btn-add-event').addEventListener('click', () => openModal('add'));

  // Modal
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (document.getElementById('modal-overlay').classList.contains('hidden')) return;
    if (e.key === 'Escape') { closeModal(); return; }
    trapFocus(e);
  });

  // Form
  document.getElementById('event-form').addEventListener('submit', e => {
    e.preventDefault();
    clearErrors();
    const data = collectForm();
    const { valid, errors } = validateForm(data);
    if (!valid) { showErrors(errors); return; }
    saveEvent(data);
    closeModal();
  });

  // Delete
  document.getElementById('btn-delete-event').addEventListener('click', () => {
    if (!state.editingId) return;
    if (confirm('Delete this event?')) deleteEvent(state.editingId);
  });
}

document.addEventListener('DOMContentLoaded', init);
