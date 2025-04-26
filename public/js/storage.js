export function saveSteps(count) {
  localStorage.setItem('stepsToday', count);
}
export function loadSteps() {
  return parseInt(localStorage.getItem('stepsToday') || '0', 10);
}
export function saveHistory(entry) {
  const history = JSON.parse(localStorage.getItem('stepsHistory') || '[]');
  history.push(entry);
  localStorage.setItem('stepsHistory', JSON.stringify(history));
}
export function loadHistory() {
  return JSON.parse(localStorage.getItem('stepsHistory') || '[]');
}
export function saveSettings(settings) {
  localStorage.setItem('stepSettings', JSON.stringify(settings));
}
export function loadSettings() {
  return JSON.parse(localStorage.getItem('stepSettings') || '{}');
}
