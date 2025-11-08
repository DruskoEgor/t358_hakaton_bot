const { Bot } = require('@maxhub/max-bot-api');

const botToken = process.env.BOT_TOKEN;

if (!botToken) {
    console.error('Токен бота не найден!');
    process.exit(1);
}

const bot = new Bot(botToken);

// Устанавливаем команды
bot.api.setMyCommands([
  {
    name: 'hello',
    description: 'Поприветствовать бота',
  },
  {
    name: 'send_test',
    description: 'Тест отправки сообщения',
  },
]);

// Обработчик команды '/hello'
bot.command('hello', (ctx) => {
  const user = ctx.message.sender;
  return ctx.reply(`Привет, ${user.user_id}! ✨`);
});

// Обработчик команды для теста отправки
bot.command('send_test', async (ctx) => {
  try {
    const currentUserId = ctx.message.sender.user_id;
    
    // Отправляем сообщение самому себе (текущему пользователю)
    const message = await bot.api.sendMessageToUser(currentUserId, "Это тестовое сообщение!");
    
    console.log('ID отправленного сообщения:', message.body.mid);
    
    return ctx.reply('Тестовое сообщение отправлено! ✅');
  } catch (error) {
    console.error('Ошибка отправки:', error);
    return ctx.reply('Произошла ошибка при отправке сообщения ❌');
  }
});

bot.start();
