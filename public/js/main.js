import { saveSteps, loadSteps, saveHistory, loadSettings } from './storage.js';

const webApp = Telegram.WebApp;
const btn = document.getElementById('toggle');
const out = document.getElementById('count');
const msg = document.getElementById('message');

// Загрузка сохранённого счёта
let steps = loadSteps();
out.textContent = steps;

let g = 0, lastTime = 0;
const alpha = 0.975, THRESHOLD = 1.2, MIN_INTERVAL = 300;

// Обработчики событий WebApp
webApp.onEvent('accelerometerStarted', () => {
  btn.textContent = 'Стоп';
  btn.disabled = false;
  msg.textContent = 'Держите телефон в руке или в кармане и идите 😊';
});

webApp.onEvent('accelerometerChanged', () => {
  const { x, y, z } = Telegram.WebApp.Accelerometer;
  const mag = Math.hypot(x, y, z);
  g = alpha * g + (1 - alpha) * mag;
  const a = mag - g;
  const now = performance.now();

  if (a > THRESHOLD && now - lastTime > MIN_INTERVAL) {
    steps++;
    lastTime = now;
    out.textContent = steps;
    saveSteps(steps);
    checkNotifications();
  }
});

webApp.onEvent('accelerometerFailed', ({ error }) => {
  btn.textContent = 'Старт';
  btn.disabled = false;
  msg.textContent = 'Ошибка акселерометра: ' + (error || 'Неизвестная');
});

webApp.onEvent('accelerometerStopped', () => {
  btn.textContent = 'Старт';
  btn.disabled = false;
  msg.textContent = 'Пауза';
  // Сохраняем историю по окончании сессии
  saveHistory({ date: new Date().toISOString().slice(0,10), steps });
});

// Функция проверки уведомлений по цели
function checkNotifications() {
  const { goal, notifyPercents } = loadSettings();
  if (!goal || !notifyPercents) return;
  notifyPercents.forEach(p => {
    if (steps === Math.floor(goal * p/100)) {
      webApp.showAlert(`Вы прошли ${p}% от цели!`);
    }
  });
  if (steps === goal) {
    webApp.showAlert('Цель достигнута 🎉');
  }
}

// Кнопка Старт/Стоп с калибровкой
btn.addEventListener('click', async () => {
  btn.disabled = true;
  if (Telegram.WebApp.Accelerometer.isStarted) {
    Telegram.WebApp.Accelerometer.stop();
    return;
  }
  // Калибровка 1.5 сек
  msg.textContent = 'Калибруем…';
  await new Promise(r => setTimeout(r, 1500));
  // Сброс и запуск
  steps = 0; g = 0; lastTime = 0;
  out.textContent = 0;
  saveSteps(0);
  btn.textContent = 'Запрос…';
  msg.textContent = '';
  Telegram.WebApp.Accelerometer.start({ refresh_rate: 100 });
});

webApp.ready();
