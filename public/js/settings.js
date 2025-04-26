import { saveSettings, loadSettings } from './storage.js';

const webApp = Telegram.WebApp;
const goalInput = document.getElementById('goal');
const notifyCheckboxes = Array.from(document.querySelectorAll('.notify'));
const saveBtn = document.getElementById('saveBtn');
const status = document.getElementById('status');

// Загрузка и отображение сохранённых настроек
document.addEventListener('DOMContentLoaded', () => {
  const { goal, notifyPercents } = loadSettings();
  if (goal) {
    goalInput.value = goal;
  }
  if (Array.isArray(notifyPercents)) {
    notifyCheckboxes.forEach(cb => {
      cb.checked = notifyPercents.includes(+cb.value);
    });
  }
  webApp.ready();
});

// Обработчик кнопки «Сохранить»
saveBtn.addEventListener('click', () => {
  const goal = parseInt(goalInput.value, 10) || 0;
  const notifyPercents = notifyCheckboxes
    .filter(cb => cb.checked)
    .map(cb => +cb.value);

  saveSettings({ goal, notifyPercents });
  webApp.showAlert('Настройки сохранены');
  status.textContent = '✓ Сохранено';
});
