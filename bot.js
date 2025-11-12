const { Bot, Keyboard } = require('@maxhub/max-bot-api');
const fs = require('fs');
const path = require('path');

const botToken = process.env.BOT_TOKEN;

if (!botToken) {
    console.error('Токен бота не найден!');
    process.exit(1);
}

const bot = new Bot(botToken);
const dataFile = path.join(__dirname, 'data.json');

// Категории помощи
const CATEGORIES = {
    CHILDREN: 'children',
    ELDERLY: 'elderly',
    DISABLED: 'disabled',
    ANIMALS: 'animals',
    NATURE: 'nature'
};

const CATEGORY_NAMES = {
    [CATEGORIES.CHILDREN]: '👶 Детям',
    [CATEGORIES.ELDERLY]: '👵 Пожилым людям',
    [CATEGORIES.DISABLED]: '♿ Людям с ОВЗ',
    [CATEGORIES.ANIMALS]: '🐾 Животным',
    [CATEGORIES.NATURE]: '🌳 Природе'
};

// Округа Москвы
const DISTRICTS = {
    CAO: 'ЦАО',
    SAO: 'САО', 
    SVAO: 'СВАО',
    VAO: 'ВАО',
    YUVAO: 'ЮВАО',
    YUAO: 'ЮАО',
    YUZAO: 'ЮЗАО',
    ZAO: 'ЗАО',
    SZAO: 'СЗАО',
    ZELAO: 'ЗелАО'
};

const DISTRICT_NAMES = {
    [DISTRICTS.CAO]: '🏛️ ЦАО (Центральный)',
    [DISTRICTS.SAO]: '🌃 САО (Северный)',
    [DISTRICTS.SVAO]: '🏢 СВАО (Северо-Восточный)',
    [DISTRICTS.VAO]: '🌅 ВАО (Восточный)',
    [DISTRICTS.YUVAO]: '🏭 ЮВАО (Юго-Восточный)',
    [DISTRICTS.YUAO]: '🏘️ ЮАО (Южный)',
    [DISTRICTS.YUZAO]: '🎓 ЮЗАО (Юго-Западный)',
    [DISTRICTS.ZAO]: '💼 ЗАО (Западный)',
    [DISTRICTS.SZAO]: '🌲 СЗАО (Северо-Западный)',
    [DISTRICTS.ZELAO]: '🌿 ЗелАО (Зеленоградский)'
};

// Функции для работы с данными
function loadData() {
  try {
    if (fs.existsSync(dataFile)) {
      const data = fs.readFileSync(dataFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {}
  return { 
    requests: [],
    acceptedUsers: [],
    responses: []
  };
}

function saveData(data) {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
  } catch (error) {}
}

function addRequest(userData, problem, phone, category, district) {
  const data = loadData();
  const newRequest = {
    id: Date.now(),
    user_id: userData.user_id,
    first_name: userData.first_name,
    problem: problem,
    phone: phone,
    category: category,
    district: district,
    timestamp: Date.now(),
    rating: 0,
    active: true,
    reserved: null
  };

  data.requests.push(newRequest);
  saveData(data);
  return newRequest;
}

function getSortedRequests(category = null, district = null) {
  const data = loadData();
  let requests = data.requests.filter(request => request.active && !request.reserved);

  if (category && Object.values(CATEGORIES).includes(category)) {
    requests = requests.filter(request => request.category === category);
  }

  if (district && Object.values(DISTRICTS).includes(district)) {
    requests = requests.filter(request => request.district === district);
  }

  return requests.sort((a, b) => {
    if (a.rating !== b.rating) {
      return b.rating - a.rating;
    }
    return a.timestamp - b.timestamp;
  });
}

function getUserRequests(userId) {
  const data = loadData();
  return data.requests
    .filter(request => request.user_id === userId)
    .sort((a, b) => b.timestamp - a.timestamp);
}

function deleteRequest(requestId, userId) {
  const data = loadData();
  const initialLength = data.requests.length;

  data.requests = data.requests.filter(request =>
    !(request.id === requestId && request.user_id === userId)
  );

  if (data.requests.length < initialLength) {
    saveData(data);
    return true;
  }
  return false;
}

function reserveRequest(requestId, userId) {
  const data = loadData();
  const request = data.requests.find(req => req.id === requestId);
  if (request && !request.reserved) {
    request.reserved = userId;
    
    const newResponse = {
      id: Date.now(),
      user_id: userId,
      request_id: requestId,
      timestamp: Date.now(),
      active: true
    };
    
    if (!data.responses) data.responses = [];
    data.responses.push(newResponse);
    
    saveData(data);
    return true;
  }
  return false;
}

function cancelReservation(requestId, userId) {
  const data = loadData();
  const request = data.requests.find(req => req.id === requestId);
  if (request && request.reserved === userId) {
    request.reserved = null;
    
    if (data.responses) {
      const response = data.responses.find(resp => 
        resp.request_id === requestId && resp.user_id === userId && resp.active
      );
      if (response) {
        response.active = false;
      }
    }
    
    saveData(data);
    return true;
  }
  return false;
}

function getUserResponses(userId) {
  const data = loadData();
  if (!data.responses) return [];
  
  return data.responses.filter(response => 
    response.user_id === userId && response.active
  );
}

function getRequestResponses(requestId) {
  const data = loadData();
  if (!data.responses) return [];
  
  return data.responses.filter(response => 
    response.request_id === requestId && response.active
  );
}

function hasUserResponded(userId, requestId) {
  const data = loadData();
  if (!data.responses) return false;
  
  return data.responses.some(response => 
    response.user_id === userId && 
    response.request_id === requestId && 
    response.active
  );
}

function validatePhone(phone) {
  const cleanedPhone = phone.replace(/[^\d+]/g, '');
  const phoneRegex = /^(\+7|7|8)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/;

  if (!phoneRegex.test(phone)) {
    return false;
  }

  const digitsOnly = cleanedPhone.replace(/\D/g, '');
  const digitsCount = digitsOnly.length;

  if (digitsOnly.startsWith('7') || digitsOnly.startsWith('8')) {
    return digitsCount === 11;
  } else if (digitsOnly.startsWith('+7')) {
    return digitsCount === 12;
  } else {
    return digitsCount === 10;
  }
}

function formatPhone(phone) {
  const digitsOnly = phone.replace(/\D/g, '');

  if (digitsOnly.startsWith('7') && digitsOnly.length === 11) {
    return `+7 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7, 9)}-${digitsOnly.slice(9)}`;
  } else if (digitsOnly.startsWith('8') && digitsOnly.length === 11) {
    return `+7 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7, 9)}-${digitsOnly.slice(9)}`;
  } else if (digitsOnly.length === 10) {
    return `+7 (${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 8)}-${digitsOnly.slice(8)}`;
  } else {
    return phone;
  }
}

function hasUserAcceptedAgreement(userId) {
  const data = loadData();
  return data.acceptedUsers && data.acceptedUsers.includes(userId);
}

function acceptUserAgreement(userId) {
  const data = loadData();
  if (!data.acceptedUsers) data.acceptedUsers = [];
  
  if (!data.acceptedUsers.includes(userId)) {
    data.acceptedUsers.push(userId);
    saveData(data);
  }
}

// Хранилище состояний пользователей
const userStates = new Map();
const userViewStates = new Map();
const userMyRequestsViewStates = new Map();

// Устанавливаем команды
bot.api.setMyCommands([
  { name: 'start', description: 'Начать помогать' },
  { name: 'about', description: 'о боте и разработчиках' },
  { name: 'help_offer', description: 'Хочу помочь' },
  { name: 'need_help', description: 'Нужна помощь' },
  { name: 'profile', description: 'Мой профиль' },
]);

// ========== ОБРАБОТЧИКИ КОМАНД ==========

bot.command('start', async (ctx) => {
  const user = ctx.message.sender;
  
  if (!hasUserAcceptedAgreement(user.user_id)) {
    await showUserAgreement(ctx);
    return;
  }
  
  userStates.delete(user.user_id);
  userViewStates.delete(user.user_id);
  userMyRequestsViewStates.delete(user.user_id);
  await showMainMenu(ctx);
});

bot.command('about', async (ctx) => {
  return await ctx.reply('Это бот для быстрого волонтерства на районе, разработчики этого бота - команда людей, которые хотят сделать мир лучше');
});

bot.command('help_offer', async (ctx) => {
  await showLocationSelection(ctx, 'help');
});

bot.command('need_help', async (ctx) => {
  await showLocationSelection(ctx, 'need');
});

bot.command('profile', async (ctx) => {
  await showProfile(ctx);
});

// ========== ОБРАБОТЧИК CALLBACK-КНОПОК ==========

bot.on('message_callback', async (ctx) => {
  const callbackData = ctx.update.callback?.payload;
  const user = ctx.update.callback?.user;

  if (!callbackData) return;

  try {
    // Обработка соглашения
    if (callbackData === 'accept_agreement') {
      const userId = user?.user_id;
      if (userId) {
        acceptUserAgreement(userId);
        await ctx.reply('✅ Соглашение принято! Теперь вы можете пользоваться ботом.');
        await showMainMenu(ctx);
      }
      return;
    } else if (callbackData === 'decline_agreement') {
      await ctx.reply('❌ Для использования бота необходимо принять пользовательское соглашение.\n\nЕсли вы передумаете, просто отправьте /start снова.');
      return;
    }

    // Проверка принятия соглашения
    const userId = user?.user_id;
    if (userId && !hasUserAcceptedAgreement(userId)) {
      await showUserAgreement(ctx);
      return;
    }

    // Основные callback-действия
    if (callbackData === 'want_to_help') {
      await showLocationSelection(ctx, 'help');
    } else if (callbackData === 'need_help') {
      await showLocationSelection(ctx, 'need');
    } else if (callbackData === 'profile') {
      await showProfile(ctx);
    } else if (callbackData === 'my_requests') {
      await showMyRequests(ctx, 0);
    } else if (callbackData === 'my_responses') {
      await showMyResponses(ctx, 0);
    } else if (callbackData === 'moscow') {
      // Выбор Москвы - показываем округа
      const actionType = ctx.update.callback?.payload.split('_')[1];
      await showDistrictSelection(ctx, actionType);
    } else if (callbackData.startsWith('district_')) {
      // Обработка выбора округа
      const parts = callbackData.split('_');
      const actionType = parts[1];
      const district = parts[2];

      if (actionType === 'help') {
        await showCategorySelection(ctx, 'help', district);
      } else if (actionType === 'need') {
        await showCategorySelection(ctx, 'need', district);
      }
    } else if (callbackData.startsWith('category_')) {
      const parts = callbackData.split('_');
      const action = parts[1];
      const category = parts[2];
      const district = parts[3];

      if (action === 'help') {
        await showHelpRequest(ctx, 0, category, district);
      } else if (action === 'need') {
        const userId = user?.user_id;
        if (userId) {
          userStates.set(userId, {
            step: 'waiting_for_problem',
            category: category,
            district: district
          });
          await ctx.reply(`Вы выбрали:\n📂 Категория: ${CATEGORY_NAMES[category]}\n📍 Округ: ${DISTRICT_NAMES[district]}\n\nПожалуйста, детально опишите вашу проблему:`);
        }
      }
    } else if (callbackData.startsWith('next_')) {
      const parts = callbackData.split('_');
      const index = parseInt(parts[1]);
      const category = parts[2] || null;
      const district = parts[3] || null;
      await showHelpRequest(ctx, index, category, district);
    } else if (callbackData.startsWith('prev_')) {
      const parts = callbackData.split('_');
      const index = parseInt(parts[1]);
      const category = parts[2] || null;
      const district = parts[3] || null;
      await showHelpRequest(ctx, index, category, district);
    } else if (callbackData.startsWith('my_next_')) {
      const index = parseInt(callbackData.split('_')[2]);
      await showMyRequests(ctx, index);
    } else if (callbackData.startsWith('my_prev_')) {
      const index = parseInt(callbackData.split('_')[2]);
      await showMyRequests(ctx, index);
    } else if (callbackData.startsWith('resp_next_')) {
      const index = parseInt(callbackData.split('_')[2]);
      await showMyResponses(ctx, index);
    } else if (callbackData.startsWith('resp_prev_')) {
      const index = parseInt(callbackData.split('_')[2]);
      await showMyResponses(ctx, index);
    } else if (callbackData.startsWith('delete_')) {
      const requestId = parseInt(callbackData.split('_')[1]);
      await deleteMyRequest(ctx, requestId);
    } else if (callbackData.startsWith('respond_')) {
      const requestId = parseInt(callbackData.split('_')[1]);
      await respondToRequest(ctx, requestId);
    } else if (callbackData.startsWith('cancel_response_')) {
      const requestId = parseInt(callbackData.split('_')[2]);
      await cancelResponse(ctx, requestId);
    } else if (callbackData === 'back_to_start') {
      await showMainMenu(ctx);
    } else if (callbackData === 'return_after_request') {
      await showMainMenu(ctx);
    } else if (callbackData === 'back_to_profile') {
      await showProfile(ctx);
    } else if (callbackData === 'back_to_categories_help') {
      const parts = callbackData.split('_');
      const district = parts[3];
      await showCategorySelection(ctx, 'help', district);
    } else if (callbackData === 'back_to_categories_need') {
      const parts = callbackData.split('_');
      const district = parts[3];
      await showCategorySelection(ctx, 'need', district);
    } else if (callbackData === 'back_to_location_help') {
      await showLocationSelection(ctx, 'help');
    } else if (callbackData === 'back_to_location_need') {
      await showLocationSelection(ctx, 'need');
    } else if (callbackData === 'back_to_districts_help') {
      await showDistrictSelection(ctx, 'help');
    } else if (callbackData === 'back_to_districts_need') {
      await showDistrictSelection(ctx, 'need');
    }
  } catch (error) {
    await ctx.reply('Произошла ошибка. Попробуйте еще раз. ❌');
  }
});

// ========== ФУНКЦИИ ПОКАЗА ИНТЕРФЕЙСОВ ==========

async function showUserAgreement(ctx) {
  const user = ctx.message.sender;
  
  const agreementText = `
📜 **ПОЛЬЗОВАТЕЛЬСКОЕ СОГЛАШЕНИЕ**

Настоящим я, ${user.first_name}, даю свое согласие на обработку моих персональных данных в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».

**1. Согласие на обработку персональных данных:**
- Фамилия, имя
- Номер телефона
- Иные данные, предоставляемые мной при использовании сервиса

**2. Цели обработки персональных данных:**
- Оказание волонтерской помощи
- Связь для координации помощи
- Улучшение качества сервиса

**3. Передача персональных данных:**
Я соглашаюсь с тем, что мой номер телефона может быть передан другим пользователям при отклике на мою заявку о помощи.

**4. Срок действия согласия:**
Согласие действует до момента отзыва путем удаления аккаунта.

Нажимая кнопку "Принять", я подтверждаю, что ознакомлен(а) с условиями соглашения и даю согласие на обработку моих персональных данных.
  `;

  const keyboard = Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback('✅ Принять', 'accept_agreement'),
      Keyboard.button.callback('❌ Назад', 'decline_agreement')
    ]
  ]);

  await ctx.reply(agreementText, { attachments: [keyboard] });
}

async function showMainMenu(ctx) {
  const user = ctx.update.callback?.user || ctx.message?.sender;
  if (user?.user_id) {
    userStates.delete(user.user_id);
    userViewStates.delete(user.user_id);
    userMyRequestsViewStates.delete(user.user_id);
  }

  const keyboard = Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback('Хочу помочь', 'want_to_help'),
      Keyboard.button.callback('Нужна помощь', 'need_help')
    ],
    [
      Keyboard.button.callback('👤 Профиль', 'profile')
    ]
  ]);

  const message = user ?
    `Главное меню. Что вам нужно, ${user.first_name}?` :
    'Главное меню. Что вам нужно?';

  await ctx.reply(message, { attachments: [keyboard] });
}

async function showLocationSelection(ctx, actionType) {
  const actionText = actionType === 'help' ? 'Хочу помочь' : 'Нужна помощь';

  const keyboard = Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback('🏙️ Москва', `moscow_${actionType}`)
    ],
    [
      Keyboard.button.callback('🏠 В главное меню', 'back_to_start')
    ]
  ]);

  await ctx.reply(
    `${actionText}\n\n` +
    `📍 **Выберите город, где вы хотите помогать:**\n\n` +
    `Пока доступна только Москва. В будущем добавим другие города.`,
    { attachments: [keyboard] }
  );
}

async function showDistrictSelection(ctx, actionType) {
  const actionText = actionType === 'help' ? 'Хочу помочь' : 'Нужна помощь';

  const keyboard = Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback(DISTRICT_NAMES[DISTRICTS.CAO], `district_${actionType}_${DISTRICTS.CAO}`),
      Keyboard.button.callback(DISTRICT_NAMES[DISTRICTS.SAO], `district_${actionType}_${DISTRICTS.SAO}`)
    ],
    [
      Keyboard.button.callback(DISTRICT_NAMES[DISTRICTS.SVAO], `district_${actionType}_${DISTRICTS.SVAO}`),
      Keyboard.button.callback(DISTRICT_NAMES[DISTRICTS.VAO], `district_${actionType}_${DISTRICTS.VAO}`)
    ],
    [
      Keyboard.button.callback(DISTRICT_NAMES[DISTRICTS.YUVAO], `district_${actionType}_${DISTRICTS.YUVAO}`),
      Keyboard.button.callback(DISTRICT_NAMES[DISTRICTS.YUAO], `district_${actionType}_${DISTRICTS.YUAO}`)
    ],
    [
      Keyboard.button.callback(DISTRICT_NAMES[DISTRICTS.YUZAO], `district_${actionType}_${DISTRICTS.YUZAO}`),
      Keyboard.button.callback(DISTRICT_NAMES[DISTRICTS.ZAO], `district_${actionType}_${DISTRICTS.ZAO}`)
    ],
    [
      Keyboard.button.callback(DISTRICT_NAMES[DISTRICTS.SZAO], `district_${actionType}_${DISTRICTS.SZAO}`),
      Keyboard.button.callback(DISTRICT_NAMES[DISTRICTS.ZELAO], `district_${actionType}_${DISTRICTS.ZELAO}`)
    ],
    [
      Keyboard.button.callback('🏙️ Выбрать другой город', `back_to_location_${actionType}`),
      Keyboard.button.callback('🏠 В главное меню', 'back_to_start')
    ]
  ]);

  await ctx.reply(
    `${actionText}\n\n` +
    `📍 **Выберите округ Москвы:**\n\n` +
    `Укажите, в каком округе вы готовы помогать или где нужна помощь`,
    { attachments: [keyboard] }
  );
}

async function showCategorySelection(ctx, actionType, district) {
  const actionText = actionType === 'help' ? 'Хочу помочь' : 'Нужна помощь';
  const districtName = DISTRICT_NAMES[district];

  const keyboard = Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback(CATEGORY_NAMES[CATEGORIES.CHILDREN], `category_${actionType}_${CATEGORIES.CHILDREN}_${district}`),
      Keyboard.button.callback(CATEGORY_NAMES[CATEGORIES.ELDERLY], `category_${actionType}_${CATEGORIES.ELDERLY}_${district}`)
    ],
    [
      Keyboard.button.callback(CATEGORY_NAMES[CATEGORIES.DISABLED], `category_${actionType}_${CATEGORIES.DISABLED}_${district}`),
      Keyboard.button.callback(CATEGORY_NAMES[CATEGORIES.ANIMALS], `category_${actionType}_${CATEGORIES.ANIMALS}_${district}`)
    ],
    [
      Keyboard.button.callback(CATEGORY_NAMES[CATEGORIES.NATURE], `category_${actionType}_${CATEGORIES.NATURE}_${district}`)
    ],
    [
      Keyboard.button.callback('📍 Выбрать другой округ', `back_to_districts_${actionType}`),
      Keyboard.button.callback('🏠 В главное меню', 'back_to_start')
    ]
  ]);

  await ctx.reply(
    `${actionText}\n\n` +
    `📍 Округ: ${districtName}\n\n` +
    `📂 **Выберите категорию помощи:**\n\n` +
    `• ${CATEGORY_NAMES[CATEGORIES.CHILDREN]} - помощь детским домам, многодетным семьям\n` +
    `• ${CATEGORY_NAMES[CATEGORIES.ELDERLY]} - поддержка пожилых и одиноких людей\n` +
    `• ${CATEGORY_NAMES[CATEGORIES.DISABLED]} - помощь людям с ограниченными возможностями\n` +
    `• ${CATEGORY_NAMES[CATEGORIES.ANIMALS]} - забота о бездомных животных, приютах\n` +
    `• ${CATEGORY_NAMES[CATEGORIES.NATURE]} - экологические проекты, озеленение\n`,
    { attachments: [keyboard] }
  );
}

async function showProfile(ctx) {
  const user = ctx.update.callback?.user || ctx.message?.sender;
  if (!user?.user_id) {
    await ctx.reply('Ошибка: не удалось определить пользователя');
    return;
  }

  const userRequests = getUserRequests(user.user_id);
  const userResponses = getUserResponses(user.user_id);
  const requestsCount = userRequests.length;
  const responsesCount = userResponses.length;

  const keyboard = Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback(`📋 Мои заявки (${requestsCount})`, 'my_requests'),
      Keyboard.button.callback(`📨 Мои отклики (${responsesCount})`, 'my_responses')
    ],
    [
      Keyboard.button.callback('🏠 В главное меню', 'back_to_start')
    ]
  ]);

  await ctx.reply(
    `👤 **Ваш профиль**\n\n` +
    `📛 Имя: ${user.first_name}\n` +
    `📋 Количество заявок: ${requestsCount}\n` +
    `📨 Количество откликов: ${responsesCount}\n\n` +
    `Здесь вы можете просмотреть и управлять своими заявками и откликами.`,
    { attachments: [keyboard] }
  );
}

async function showMyRequests(ctx, index = 0) {
  const user = ctx.update.callback?.user || ctx.message?.sender;
  if (!user?.user_id) {
    await ctx.reply('Ошибка: не удалось определить пользователя');
    return;
  }

  const userRequests = getUserRequests(user.user_id);

  if (userRequests.length === 0) {
    const keyboard = Keyboard.inlineKeyboard([
      [Keyboard.button.callback('📝 Создать заявку', 'need_help')],
      [Keyboard.button.callback('👤 Назад в профиль', 'back_to_profile')]
    ]);

    await ctx.reply(
      'У вас пока нет активных заявок.\n\n' +
      'Хотите создать первую заявку о помощи?',
      { attachments: [keyboard] }
    );
    return;
  }

  if (index < 0) index = 0;
  if (index >= userRequests.length) index = userRequests.length - 1;

  userMyRequestsViewStates.set(user.user_id, index);

  const request = userRequests[index];
  const responses = getRequestResponses(request.id);

  let message = `📋 Ваша заявка ${index + 1} из ${userRequests.length}\n\n`;
  message += `🔸 ID заявки: ${request.id}\n`;
  message += `📂 Категория: ${CATEGORY_NAMES[request.category]}\n`;
  message += `📍 Округ: ${DISTRICT_NAMES[request.district]}\n`;
  message += `📞 Телефон: ${request.phone}\n`;
  message += `📝 Проблема: ${request.problem}\n`;
  message += `⭐ Рейтинг: ${request.rating}\n`;
  message += `👥 Откликов: ${responses.length}\n`;
  message += `⏰ Время: ${new Date(request.timestamp).toLocaleString('ru-RU')}\n`;

  if (request.reserved) {
    message += `🔒 Статус: Зарезервирована\n`;
  } else {
    message += `🔓 Статус: Свободна\n`;
  }

  const navigationButtons = [];

  if (index > 0) {
    navigationButtons.push(Keyboard.button.callback('⬅️ Назад', `my_prev_${index - 1}`));
  }

  if (index < userRequests.length - 1) {
    navigationButtons.push(Keyboard.button.callback('Далее ➡️', `my_next_${index + 1}`));
  }

  const actionButtons = [
    Keyboard.button.callback('🗑️ Удалить заявку', `delete_${request.id}`)
  ];

  const keyboardRows = [];
  if (navigationButtons.length > 0) {
    keyboardRows.push(navigationButtons);
  }
  keyboardRows.push(actionButtons);
  keyboardRows.push([
    Keyboard.button.callback('👤 Назад в профиль', 'back_to_profile'),
    Keyboard.button.callback('🏠 В главное меню', 'back_to_start')
  ]);

  const keyboard = Keyboard.inlineKeyboard(keyboardRows);

  await ctx.reply(message, { attachments: [keyboard] });
}

async function showMyResponses(ctx, index = 0) {
  const user = ctx.update.callback?.user || ctx.message?.sender;
  if (!user?.user_id) {
    await ctx.reply('Ошибка: не удалось определить пользователя');
    return;
  }

  const userResponses = getUserResponses(user.user_id);
  const data = loadData();

  if (userResponses.length === 0) {
    const keyboard = Keyboard.inlineKeyboard([
      [Keyboard.button.callback('🔍 Найти заявки', 'want_to_help')],
      [Keyboard.button.callback('👤 Назад в профиль', 'back_to_profile')]
    ]);

    await ctx.reply(
      'У вас пока нет активных откликов.\n\n' +
      'Хотите найти заявки для помощи?',
      { attachments: [keyboard] }
    );
    return;
  }

  if (index < 0) index = 0;
  if (index >= userResponses.length) index = userResponses.length - 1;

  const response = userResponses[index];
  const request = data.requests.find(req => req.id === response.request_id);

  if (!request) {
    await ctx.reply('Заявка, на которую вы откликнулись, больше не существует.');
    return;
  }

  let message = `📨 Ваш отклик ${index + 1} из ${userResponses.length}\n\n`;
  message += `🔸 ID отклика: ${response.id}\n`;
  message += `📋 Заявка: ${request.problem.substring(0, 50)}...\n`;
  message += `📂 Категория: ${CATEGORY_NAMES[request.category]}\n`;
  message += `📍 Округ: ${DISTRICT_NAMES[request.district]}\n`;
  message += `👤 Автор: ${request.first_name}\n`;
  message += `📞 Телефон: ${request.phone}\n`;
  message += `⏰ Время отклика: ${new Date(response.timestamp).toLocaleString('ru-RU')}\n\n`;
  message += `_Для связи используйте указанный телефон автора заявки_ 📞`;

  const navigationButtons = [];

  if (index > 0) {
    navigationButtons.push(Keyboard.button.callback('⬅️ Назад', `resp_prev_${index - 1}`));
  }

  if (index < userResponses.length - 1) {
    navigationButtons.push(Keyboard.button.callback('Далее ➡️', `resp_next_${index + 1}`));
  }

  const actionButtons = [
    Keyboard.button.callback('❌ Отменить отклик', `cancel_response_${request.id}`)
  ];

  const keyboardRows = [];
  if (navigationButtons.length > 0) {
    keyboardRows.push(navigationButtons);
  }
  keyboardRows.push(actionButtons);
  keyboardRows.push([
    Keyboard.button.callback('👤 Назад в профиль', 'back_to_profile'),
    Keyboard.button.callback('🏠 В главное меню', 'back_to_start')
  ]);

  const keyboard = Keyboard.inlineKeyboard(keyboardRows);

  await ctx.reply(message, { attachments: [keyboard] });
}

async function showHelpRequest(ctx, index = 0, category = null, district = null) {
  const requests = getSortedRequests(category, district);
  const userId = ctx.update.callback?.user?.user_id || ctx.message?.sender?.user_id;

  if (!userId) {
    await ctx.reply('Ошибка: не удалось определить пользователя');
    return;
  }

  if (requests.length === 0) {
    let filterText = '';
    if (category) filterText += ` в категории "${CATEGORY_NAMES[category]}"`;
    if (district) filterText += ` в округе "${DISTRICT_NAMES[district]}"`;
    
    const keyboard = Keyboard.inlineKeyboard([
      [Keyboard.button.callback('📂 Выбрать другую категорию', `back_to_categories_help_${district}`)],
      [Keyboard.button.callback('📍 Выбрать другой округ', `back_to_districts_help`)],
      [Keyboard.button.callback('🏠 В главное меню', 'back_to_start')]
    ]);

    await ctx.reply(
      `На данный момент нет активных заявок${filterText}. Возвращайтесь позже! 🤗`,
      { attachments: [keyboard] }
    );
    return;
  }

  if (index < 0) index = 0;
  if (index >= requests.length) index = requests.length - 1;

  userViewStates.set(userId, { index, category, district });

  const request = requests[index];
  const hasResponded = hasUserResponded(userId, request.id);

  let message = `📋 Заявка ${index + 1} из ${requests.length}\n\n`;
  message += `🔸 ID заявки: ${request.id}\n`;
  message += `📂 Категория: ${CATEGORY_NAMES[request.category]}\n`;
  message += `📍 Округ: ${DISTRICT_NAMES[request.district]}\n`;
  message += `👤 Имя: ${request.first_name}\n`;
  message += `📝 Проблема: ${request.problem}\n`;
  message += `⭐ Рейтинг: ${request.rating}\n`;
  message += `⏰ Время: ${new Date(request.timestamp).toLocaleString('ru-RU')}\n\n`;

  if (hasResponded) {
    message += `📞 **Телефон для связи:** ${request.phone}\n\n`;
    message += `_Вы уже откликнулись на эту заявку. Для связи используйте указанный телефон._ 📞`;
  } else {
    message += `_Нажмите "Откликнуться", чтобы увидеть контактные данные и помочь._`;
  }

  const navigationButtons = [];

  if (index > 0) {
    navigationButtons.push(Keyboard.button.callback('⬅️ Назад', `prev_${index - 1}_${category || ''}_${district || ''}`));
  }

  if (index < requests.length - 1) {
    navigationButtons.push(Keyboard.button.callback('Далее ➡️', `next_${index + 1}_${category || ''}_${district || ''}`));
  }

  const keyboardRows = [];
  if (navigationButtons.length > 0) {
    keyboardRows.push(navigationButtons);
  }

  if (!hasResponded) {
    keyboardRows.push([
      Keyboard.button.callback('🤝 Откликнуться', `respond_${request.id}`)
    ]);
  }

  const backButtons = [];
  if (category) {
    backButtons.push(Keyboard.button.callback('📂 Выбрать другую категорию', `back_to_categories_help_${district}`));
  }
  if (district) {
    backButtons.push(Keyboard.button.callback('📍 Выбрать другой округ', `back_to_districts_help`));
  }
  backButtons.push(Keyboard.button.callback('🏠 В главное меню', 'back_to_start'));

  keyboardRows.push(backButtons);

  const keyboard = Keyboard.inlineKeyboard(keyboardRows);

  await ctx.reply(message, { attachments: [keyboard] });
}

// ========== ФУНКЦИИ ДЕЙСТВИЙ ==========

async function deleteMyRequest(ctx, requestId) {
  const user = ctx.update.callback?.user || ctx.message?.sender;
  if (!user?.user_id) {
    await ctx.reply('Ошибка: не удалось определить пользователя');
    return;
  }

  const success = deleteRequest(requestId, user.user_id);

  if (success) {
    await ctx.reply('✅ Заявка успешно удалена!');
    const userRequests = getUserRequests(user.user_id);
    if (userRequests.length > 0) {
      await showMyRequests(ctx, 0);
    } else {
      await showProfile(ctx);
    }
  } else {
    await ctx.reply('❌ Не удалось удалить заявку. Возможно, она уже была удалена.');
    await showProfile(ctx);
  }
}

async function respondToRequest(ctx, requestId) {
  const user = ctx.update.callback?.user || ctx.message?.sender;
  if (!user?.user_id) {
    await ctx.reply('Ошибка: не удалось определить пользователя');
    return;
  }

  if (hasUserResponded(user.user_id, requestId)) {
    await ctx.reply('❌ Вы уже откликались на эту заявку.');
    return;
  }

  const data = loadData();
  const request = data.requests.find(req => req.id === requestId);

  if (!request) {
    await ctx.reply('❌ Заявка не найдена.');
    return;
  }

  const success = reserveRequest(requestId, user.user_id);

  if (success) {
    await ctx.reply(
      `✅ Вы успешно откликнулись на заявку!\n\n` +
      `📋 **Информация о заявке:**\n` +
      `👤 Автор: ${request.first_name}\n` +
      `📍 Округ: ${DISTRICT_NAMES[request.district]}\n` +
      `📞 Телефон: ${request.phone}\n` +
      `📝 Проблема: ${request.problem}\n\n` +
      `_Свяжитесь с автором заявки по указанному телефону для координации помощи._`
    );

    try {
      await bot.api.sendMessageToUser(
        request.user_id,
        `📨 На вашу заявку откликнулся пользователь ${user.first_name}!\n\n` +
        `📋 Заявка: ${request.problem}\n` +
        `📍 Округ: ${DISTRICT_NAMES[request.district]}\n` +
        `👤 Откликнувшийся: ${user.first_name}\n\n` +
        `_Вы можете связаться с ним для уточнения деталей помощи._`
      );
    } catch (error) {}
  } else {
    await ctx.reply('❌ Не удалось откликнуться на заявку. Возможно, она уже занята.');
  }
}

async function cancelResponse(ctx, requestId) {
  const user = ctx.update.callback?.user || ctx.message?.sender;
  if (!user?.user_id) {
    await ctx.reply('Ошибка: не удалось определить пользователя');
    return;
  }

  const success = cancelReservation(requestId, user.user_id);

  if (success) {
    await ctx.reply('✅ Отклик успешно отменен! Заявка снова будет видна в общем списке.');
    const userResponses = getUserResponses(user.user_id);
    if (userResponses.length > 0) {
      await showMyResponses(ctx, 0);
    } else {
      await showProfile(ctx);
    }
  } else {
    await ctx.reply('❌ Не удалось отменить отклик.');
    await showProfile(ctx);
  }
}

// ========== ОБРАБОТЧИК ТЕКСТОВЫХ СООБЩЕНИЙ ==========

bot.on('message_created', async (ctx) => {
  if (ctx.message.body.text && ctx.message.body.text.startsWith('/')) {
    return;
  }

  const user = ctx.message.sender;
  
  if (!hasUserAcceptedAgreement(user.user_id)) {
    await showUserAgreement(ctx);
    return;
  }

  const userState = userStates.get(user.user_id);

  if (!userState) return;

  try {
    if (userState.step === 'waiting_for_problem') {
      userState.problem = ctx.message.body.text;
      userState.step = 'waiting_for_phone';

      await ctx.reply(
        'Спасибо! Теперь укажите ваш номер телефона для связи.\n\n' +
        '📱 **Форматы номеров:**\n' +
        '• +7 (XXX) XXX-XX-XX\n' +
        '• 8 (XXX) XXX-XX-XX\n' +
        '• XXX-XXX-XX-XX\n\n' +
        'Пожалуйста, введите ваш номер:'
      );

    } else if (userState.step === 'waiting_for_phone') {
      const phoneInput = ctx.message.body.text;

      if (!validatePhone(phoneInput)) {
        await ctx.reply(
          '❌ Неверный формат номера телефона.\n\n' +
          '📱 **Правильные форматы:**\n' +
          '• +7 (XXX) XXX-XX-XX\n' +
          '• 8 (XXX) XXX-XX-XX\n' +
          '• XXX-XXX-XX-XX\n\n' +
          'Пожалуйста, введите номер еще раз:'
        );
        return;
      }

      const formattedPhone = formatPhone(phoneInput);
      const newRequest = addRequest(user, userState.problem, formattedPhone, userState.category, userState.district);
      userStates.delete(user.user_id);

      const returnKeyboard = Keyboard.inlineKeyboard([
        [Keyboard.button.callback('↩️ Вернуться в главное меню', 'return_after_request')]
      ]);

      await ctx.reply(
        '✅ Спасибо! Ваша заявка принята. Волонтеры свяжутся с вами в ближайшее время.\n\n' +
        'Ваши данные:\n' +
        `👤 Имя: ${user.first_name}\n` +
        `📂 Категория: ${CATEGORY_NAMES[userState.category]}\n` +
        `📍 Округ: ${DISTRICT_NAMES[userState.district]}\n` +
        `📞 Телефон: ${formattedPhone}\n` +
        `📝 Проблема: ${userState.problem}`,
        { attachments: [returnKeyboard] }
      );
    }
  } catch (error) {
    await ctx.reply('Произошла ошибка при обработке вашего запроса. ❌');
    userStates.delete(user.user_id);
  }
});

// ========== ЗАПУСК БОТА ==========

bot.start();
