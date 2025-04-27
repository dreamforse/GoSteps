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

// --- Инициализация: подгружаем ранее сохранённое значение ---
let steps = loadSteps();
out.textContent = steps;

// --- Переменные алгоритма подсчёта шагов ---
let g = 0;               // для фильтра гравитации
let lastTime = 0;        // время последнего шага
const alpha = 0.975;     // коэффициент фильтра
const THRESHOLD = 1.2;   // порог обнаружения шага (м/с²)
const MIN_INTERVAL = 300; // минимальный интервал между шагами (мс)

// --- Обработчики событий Web App SDK ---
webApp.onEvent('accelerometerStarted', () => {
  btn.textContent = 'Стоп';
  btn.disabled = false;
  msg.textContent = 'Держите телефон в руке или в кармане и идите 😊';
});

webApp.onEvent('accelerometerChanged', () => {
  // читаем текущие значения акселерометра
  const { x, y, z } = Telegram.WebApp.Accelerometer;
  const mag = Math.hypot(x, y, z);

  // фильтр гравитации (high-pass)
  g = alpha * g + (1 - alpha) * mag;
  const a = mag - g;

  const now = performance.now();
  if (a > THRESHOLD && now - lastTime > MIN_INTERVAL) {
    // зафиксировали шаг
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
  // сохраняем в историю при каждом стопе
  saveHistory({
    date: new Date().toISOString().slice(0, 10),
    steps
  });
});

// --- Проверка уведомлений при достижении процентов от цели ---
function checkNotifications() {
  const { goal = 0, notifyPercents = [] } = loadSettings();
  if (!goal || !notifyPercents.length) return;

  // для каждого процента, если ровно совпало — показываем alert
  notifyPercents.forEach(p => {
    if (steps === Math.floor(goal * p / 100)) {
      webApp.showAlert(`Вы прошли ${p}% от цели!`);
    }
  });
  if (steps === goal) {
    webApp.showAlert('Цель достигнута 🎉');
  }
}

// --- Обработчик кнопки Старт/Стоп с калибровкой ---
btn.addEventListener('click', async () => {
  btn.disabled = true;

  // если уже запущен — останавливаем
  if (Telegram.WebApp.Accelerometer.isStarted) {
    Telegram.WebApp.Accelerometer.stop();
    return;
  }

  // иначе — калибруем фильтр перед стартом
  msg.textContent = 'Калибруем…';
  await new Promise(r => setTimeout(r, 1500));

  // сброс переменных
  steps = 0;
  g = 0;
  lastTime = 0;
  out.textContent = 0;
  saveSteps(0);

  // запускаем датчик
  btn.textContent = 'Запрос…';
  msg.textContent = '';
  Telegram.WebApp.Accelerometer.start({ refresh_rate: 100 });
});

// --- Сообщаем Telegram, что UI готов к работе ---
webApp.ready();
