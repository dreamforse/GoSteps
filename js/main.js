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
let steps = loadSteps();
out.textContent = steps;

// параметры фильтра и детекции
let g = 0;
let lastTime = 0;
const alpha = 0.975;
const THRESHOLD = 1.2;    // порог для калибровки и для шагов
const MIN_INTERVAL = 300; // мс между шагами

// флаги
let gravityInitialized = false;  // сделали ли первый замер g
let isCalibrated = false;        // произошла ли «реальная» калибровка

// --- События Telegram.WebApp ---
// Старт акселерометра
webApp.onEvent('accelerometerStarted', () => {
  btn.textContent = 'Встряхните телефон';
  btn.disabled = false;
  msg.textContent = '';
});

// Универсальный обработчик сэмплов акселерометра
webApp.onEvent('accelerometerChanged', () => {
  // текущие оси
  const { x, y, z } = Telegram.WebApp.Accelerometer;
  const mag = Math.hypot(x, y, z);

  // 1) При первом сэмпле просто инициализируем фильтр и выходим
  if (!gravityInitialized) {
    g = mag;
    gravityInitialized = true;
    return;
  }

  // 2) Апдейт фильтра и вычисление «ускорения» без гравитации
  g = alpha * g + (1 - alpha) * mag;
  const a = mag - g;
  const now = performance.now();

  // 3) Калибровка: ждём первого реального пика
  if (!isCalibrated) {
    if (a > THRESHOLD) {
      isCalibrated = true;
      lastTime = now;
      msg.textContent = 'Калибровка завершена, начинаем считать шаги!';
      btn.textContent = 'Стоп';
    }
    return;
  }

  // 4) Подсчёт шагов уже после калибровки
  if (a > THRESHOLD && now - lastTime > MIN_INTERVAL) {
    steps++;
    lastTime = now;
    out.textContent = steps;
    saveSteps(steps);
    checkNotifications();
  }
});

// Ошибка датчика
webApp.onEvent('accelerometerFailed', ({ error }) => {
  btn.textContent = 'Старт';
  btn.disabled = false;
  msg.textContent = 'Ошибка акселерометра: ' + (error || 'Неизвестная');
});

// Остановка датчика
webApp.onEvent('accelerometerStopped', () => {
  btn.textContent = 'Старт';
  btn.disabled = false;
  msg.textContent = 'Пауза';
  // сохраняем в историю, но не обнуляем steps
  saveHistory({
    date: new Date().toISOString().slice(0, 10),
    steps
  });
});

// Проверка уведомлений по достижению %
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

// Кнопка Старт/Стоп
btn.addEventListener('click', () => {
  btn.disabled = true;

  // если идёт подсчёт — останавливаем
  if (Telegram.WebApp.Accelerometer.isStarted) {
    Telegram.WebApp.Accelerometer.stop();
    return;
  }

  // иначе — сбрасываем флаги и запускаем ожидание тряски
  gravityInitialized = false;
  isCalibrated = false;
  lastTime = 0;
  btn.textContent = 'Запрос…';
  Telegram.WebApp.Accelerometer.start({ refresh_rate: 100 });
});

// Готовность UI
webApp.ready();
