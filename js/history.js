import { loadHistory } from './storage.js';

const webApp = Telegram.WebApp;
const ctx = document.getElementById('stepsChart').getContext('2d');

// Функция для рендеринга графика
function renderChart(data) {
  const labels = data.map(item => item.date);
  const steps  = data.map(item => item.steps);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Шаги',
        data: steps,
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// Подготовка данных: сгруппировать по дате и взять последние 7 дней
function getLast7DaysHistory() {
  const raw = loadHistory(); // [{date: 'YYYY-MM-DD', steps: N}, ...]
  const map = new Map();
  raw.forEach(({ date, steps }) => {
    map.set(date, (map.get(date) || 0) + steps);
  });

  // собрать массив за последние 7 дней
  const result = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0,10);
    result.push({ date: key, steps: map.get(key) || 0 });
  }
  return result;
}

document.addEventListener('DOMContentLoaded', () => {
  const data = getLast7DaysHistory();
  renderChart(data);
  webApp.ready();
});
