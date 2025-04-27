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

// --- Начальное состояние и загрузка ---
let steps = loadSteps();
out.textContent = steps;

// --- Параметры фильтрации и детекции ---
let g = 0;                // фильтр гравитации
let lastTime = 0;         // время последнего засчитанного шага
const alpha = 0.975;      // коэффициент фильтра
const STEP_THRESHOLD = 1.2;    // порог для реальных шагов
const CAL_THRESHOLD  = 2.5;    // жёсткий порог для калибровки
const MIN_INTERVAL   = 300;    // мс между шагами

// --- Флаги калибровки ---
let gravityInitialized = false;  // первый замер g уже взят?
let isCalibrated       = false;  // прошли ли «жесткую» калибровку?
let calSpikes          = 0;      // сколько пиков выше CAL_THRESHOLD поймали

// --- Обработчики Telegram.WebApp ---
// Событие успешного старта акселерометра
webApp.onEvent('accelerometerStarted', () => {
  btn.textContent = 'Встряхните телефон';
  btn.disabled = false;
  msg.textContent = '';
});

// Универсальный слушатель новых сэмплов
webApp.onEvent('accelerometerChanged', () => {
  const { x, y, z } = Telegram.WebApp.Accelerometer;
  const mag = Math.hypot(x, y, z);

  // 1) Первый замер инициализирует фильтр, шаги не считаем
  if (!gravityInitialized) {
    g = mag;
    gravityInitialized = true;
    return;
  }

  // 2) Обновляем фильтр и считаем текущее «ускорение»
  g = alpha * g + (1 - alpha) * mag;
  const a = mag - g;
  const now = performance.now();

  // 3) Жёсткая калибровка: ждём минимум 2 пика выше CAL_THRESHOLD
  if (!isCalibrated) {
    if (a > CAL_THRESHOLD) {
      calSpikes++;
      // можно добавить: сбрасывать calSpikes, если слишком долго нет пиков?
    }
    if (calSpikes >= 2) {
      isCalibrated = true;
      lastTime = now;
      msg.textContent = 'Калибровка завершена, начинаем считать шаги!';
      btn.textContent = 'Стоп';
    }
    return;
  }

  // 4) Собственно подсчёт шагов после калибровки
  if (a > STEP_THRESHOLD && now - lastTime > MIN_INTERVAL) {
    steps++;
    lastTime = now;
    out.textContent = steps;
    saveSteps(steps);
    checkNotifications();
  }
});

// Ошибка акселерометра
webApp.onEvent('accelerometerFailed', ({ error }) => {
  btn.textContent = 'Старт';
  btn.disabled = false;
  msg.textContent = 'Ошибка акселерометра: ' + (error || 'Неизвестная');
});

// Остановка акселерометра
webApp.onEvent('accelerometerStopped', () => {
  btn.textContent = 'Старт';
  btn.disabled = false;
  msg.textContent = 'Пауза';
  saveHistory({
    date: new Date().toISOString().slice(0, 10),
    steps
  });
});

// Уведомления при достижении процентов цели
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

  if (Telegram.WebApp.Accelerometer.isStarted) {
    // Стопим
    Telegram.WebApp.Accelerometer.stop();
    return;
  }

  // Новый старт — сбрасываем калибровочные флаги, но не шаги
  gravityInitialized = false;
  isCalibrated       = false;
  calSpikes          = 0;
  lastTime           = 0;

  btn.textContent = 'Запрос…';
  Telegram.WebApp.Accelerometer.start({ refresh_rate: 100 });
});

// Сообщаем Telegram, что UI готов
webApp.ready();
