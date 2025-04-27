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

// --- Настройка и начальное состояние ---
let steps = loadSteps();    // загружаем накопленные сегодня шаги
out.textContent = steps;

let g = 0;
let lastTime = 0;
const alpha = 0.975;
const THRESHOLD = 1.2;
const MIN_INTERVAL = 300;

// Флаг калибровки: дождались первой тряски?
let isCalibrated = false;

// --- Обработчики Telegram.WebApp ---
webApp.onEvent('accelerometerStarted', () => {
  // После старта ждем тряску, не сбрасываем шаги
  btn.textContent = 'Встряхните телефон';
  btn.disabled = false;
  msg.textContent = '';
});

// Общий слушатель: и калибровка, и подсчет
webApp.onEvent('accelerometerChanged', () => {
  const { x, y, z } = Telegram.WebApp.Accelerometer;
  const mag = Math.hypot(x, y, z);

  // Фильтр гравитации
  g = alpha * g + (1 - alpha) * mag;
  const a = mag - g;
  const now = performance.now();

  // 1) Калибровка: ждём первого пика
  if (!isCalibrated) {
    if (a > THRESHOLD) {
      isCalibrated = true;
      lastTime = now;
      msg.textContent = 'Калибровка завершена, начинаем считать шаги!';
      btn.textContent = 'Стоп';
    }
    return;
  }

  // 2) После калибровки — подсчет шагов
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
  // Сохраняем в историю (не обнуляем steps)
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

// --- Обработчик кнопки Старт/Стоп ---
btn.addEventListener('click', () => {
  btn.disabled = true;

  if (Telegram.WebApp.Accelerometer.isStarted) {
    // Стоп
    Telegram.WebApp.Accelerometer.stop();
    return;
  }

  // Старт: скидываем флаг калибровки, ждем первой тряски
  isCalibrated = false;
  lastTime = 0;
  btn.textContent = 'Запрос…';
  Telegram.WebApp.Accelerometer.start({ refresh_rate: 100 });
});

// --- Сообщаем Telegram, что UI готов ---
webApp.ready();
