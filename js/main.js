// public/js/main.js

import {
  saveSteps,
  loadSteps,
  saveHistory,
  loadSettings
} from './storage.js';

const webApp = Telegram.WebApp;
const btn    = document.getElementById('toggle');
const out    = document.getElementById('count');
const msg    = document.getElementById('message');

// --- Инициализация ---
let steps = loadSteps();    // загружаем накопленные сегодня шаги
out.textContent = steps;

let g = 0, lastTime = 0;
const alpha = 0.975, THRESHOLD = 1.2, MIN_INTERVAL = 300;

// Флаг: дождались ли первой тряски?
let isCalibrated = false;

// --- Вешаем события Телеграма ---
webApp.onEvent('accelerometerStarted', () => {
  // после старта датчика ждём всплеска, не меняем кнопку
  btn.textContent = 'Встряхните телефон';
  btn.disabled = false;
  msg.textContent = '';
});

webApp.onEvent('accelerometerChanged', () => {
  const { x, y, z } = Telegram.WebApp.Accelerometer;
  const mag = Math.hypot(x, y, z);
  g = alpha * g + (1 - alpha) * mag;
  const a = mag - g;
  const now = performance.now();

  // если ещё не откалибровано — ждём первого пика
  if (!isCalibrated) {
    if (a > THRESHOLD) {
      isCalibrated = true;
      msg.textContent = 'Калибровка завершена, идём 😊';
      btn.textContent = 'Стоп';
    }
    return;
  }

  // после калибровки считаем шаги
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
  // сохраняем в историю, но НЕ обнуляем steps
  saveHistory({
    date: new Date().toISOString().slice(0, 10),
    steps
  });
});

// --- Уведомления при % цели ---
function checkNotifications() {
  const { goal = 0, notifyPercents = [] } = loadSettings();
  if (!goal || !notifyPercents.length) return;
  notifyPercents.forEach(p => {
    if (steps === Math.floor(goal * p / 100)) {
      webApp.showAlert(`Вы прошли ${p}% от цели!`);
    }
  });
  if (steps === goal) {
    webApp.showAlert('Цель достигнута 🎉');
  }
}

// --- Обработчик Старт/Стоп ---
btn.addEventListener('click', () => {
  btn.disabled = true;

  if (Telegram.WebApp.Accelerometer.isStarted) {
    // Стоп
    Telegram.WebApp.Accelerometer.stop();
    return;
  }

  // Старт: запускаем акселерометр и ждём тряску
  isCalibrated = false;
  lastTime = 0;
  btn.textContent = 'Запрос…';
  Telegram.WebApp.Accelerometer.start({ refresh_rate: 100 });
});

// --- Готовность UI ---
webApp.ready();
