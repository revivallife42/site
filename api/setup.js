// Одноразовое подключение бота к сайту: открыть /api/setup в браузере.
// Сообщает Telegram, на какой адрес присылать сообщения.

const crypto = require('crypto');

const WEBHOOK_URL = 'https://www.ramilabyazov.site/api/telegram';

module.exports = async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  if (!token) return res.status(200).send('Токен не найден. Добавьте TELEGRAM_BOT_TOKEN в настройках Vercel и сделайте Redeploy.');

  const secret = crypto.createHash('sha256').update(token).digest('hex');
  const response = await fetch('https://api.telegram.org/bot' + token + '/setWebhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: WEBHOOK_URL, secret_token: secret, allowed_updates: ['message'] }),
  });
  const result = await response.json();

  if (result.ok) return res.status(200).send('Готово: бот подключён к сайту.');
  return res.status(200).send('Не получилось: ' + (result.description || 'неизвестная ошибка'));
};
