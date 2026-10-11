// Бот записи: отвечает человеку и пересылает заявку владельцу.
// Токен и ID владельца берутся из настроек Vercel (Environment Variables),
// в коде их нет: TELEGRAM_BOT_TOKEN и ADMIN_CHAT_ID.

const crypto = require('crypto');

const GREETING =
  'Здравствуйте! Это бот Рамиля Абязова.\n\n' +
  'Вы записываетесь на две онлайн-встречи по 1,5 часа. ' +
  'Рамиль напишет вам лично и расскажет, когда ближайшая.\n\n' +
  'Если хотите, напишите здесь пару слов о своей ситуации, я передам.';

const THANKS = 'Спасибо, я передал ваше сообщение Рамилю.';

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function send(token, chatId, text, extra) {
  const response = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ chat_id: chatId, text: text }, extra || {})),
  });
  if (!response.ok) console.error('sendMessage failed', response.status, await response.text());
}

module.exports = async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminId = process.env.ADMIN_CHAT_ID;

  if (req.method !== 'POST' || !token) return res.status(200).send('ok');

  // Принимаем запросы только от Telegram: он присылает секрет, заданный при подключении
  const secret = crypto.createHash('sha256').update(token).digest('hex');
  if (req.headers['x-telegram-bot-api-secret-token'] !== secret) return res.status(403).send('forbidden');

  const message = req.body && req.body.message;
  if (!message || !message.chat || message.chat.type !== 'private') return res.status(200).send('ok');

  const chatId = message.chat.id;
  const text = (message.text || '').trim();

  try {
    if (text === '/id') {
      await send(token, chatId, 'Ваш ID: ' + chatId);
    } else if (adminId && String(chatId) === String(adminId)) {
      await send(token, chatId, 'Бот работает. Заявки с сайта будут приходить сюда.');
    } else {
      const isStart = text.startsWith('/start');
      await send(token, chatId, isStart ? GREETING : THANKS);

      if (adminId) {
        const from = message.from || {};
        const name = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Без имени';
        const lines = [
          isStart ? '<b>Новая заявка с сайта</b>' : '<b>Сообщение от клиента</b>',
          'Имя: <a href="tg://user?id=' + from.id + '">' + escapeHtml(name) + '</a>',
        ];
        if (from.username) lines.push('Профиль: @' + escapeHtml(from.username));
        if (!isStart) lines.push('', escapeHtml(text || '(сообщение без текста)'));
        await send(token, adminId, lines.join('\n'), { parse_mode: 'HTML' });
      }
    }
  } catch (error) {
    console.error(error);
  }

  return res.status(200).send('ok');
};
