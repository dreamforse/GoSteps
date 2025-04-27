<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Шагомер Telegram Mini App</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1>Шагов сегодня</h1>
  <div id="count">0</div>

  <button id="toggle">Старт</button>
  <div id="message"></div>

  <nav style="margin-top:1.5em; display:flex; flex-direction:column; gap:0.5em;">
    <a href="settings.html" style="color:#1088f0; text-decoration:none;">
      ⚙ Настройки
    </a>
    <a href="history.html" style="color:#1088f0; text-decoration:none;">
      📈 История
    </a>
  </nav>

  <!-- Telegram SDK -->
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <!-- Локальные модули -->
  <script type="module" src="js/storage.js"></script>
  <script type="module" src="js/main.js"></script>
</body>
</html>
