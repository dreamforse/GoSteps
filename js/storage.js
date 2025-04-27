// public/js/storage.js

// helper
function getUserId() {
  return Telegram.WebApp.initDataUnsafe?.user?.id || 'guest';
}
function today() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function stepsKey() {
  return `steps_${getUserId()}_${today()}`;
}
function historyKey() {
  return `history_${getUserId()}`;
}
function settingsKey() {
  return `settings_${getUserId()}`;
}

export function saveSteps(count) {
  localStorage.setItem(stepsKey(), String(count));
}
export function loadSteps() {
  return parseInt(localStorage.getItem(stepsKey()) || '0', 10);
}

export function saveHistory(entry) {
  const key = historyKey();
  const arr = JSON.parse(localStorage.getItem(key) || '[]');
  arr.push(entry);
  localStorage.setItem(key, JSON.stringify(arr));
}
export function loadHistory() {
  return JSON.parse(localStorage.getItem(historyKey()) || '[]');
}

export function saveSettings(obj) {
  localStorage.setItem(settingsKey(), JSON.stringify(obj));
}
export function loadSettings() {
  return JSON.parse(localStorage.getItem(settingsKey()) || '{}');
}
