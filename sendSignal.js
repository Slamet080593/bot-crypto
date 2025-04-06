// sendSignal.js

const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

// Ganti dengan token dan ID Telegram kamu
const TELEGRAM_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN';
const CHAT_ID = 'YOUR_CHAT_ID';
const bot = new TelegramBot(TELEGRAM_TOKEN);

const coins = ['BTCUSDT', 'ETHUSDT'];
const interval = '15m';
const limit = 100;

function calculateIndicators(prices) {
  const closes = prices.map(candle => parseFloat(candle[4]));

  const rsiPeriod = 14;
  const gains = [];
  const losses = [];
  for (let i = 1; i <= rsiPeriod; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains.push(diff);
    else losses.push(Math.abs(diff));
  }
  const avgGain = gains.reduce((a, b) => a + b, 0) / rsiPeriod;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / rsiPeriod;
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  const smaPeriod = 20;
  const sma = closes.slice(-smaPeriod).reduce((a, b) => a + b, 0) / smaPeriod;

  const std = Math.sqrt(closes.slice(-smaPeriod).reduce((acc, val) => acc + Math.pow(val - sma, 2), 0) / smaPeriod);
  const upperBB = sma + 2 * std;
  const lowerBB = sma - 2 * std;

  const lastPrice = closes[closes.length - 1];
  const signal = rsi < 30 && lastPrice < lowerBB ? 'BUY' :
                 rsi > 70 && lastPrice > upperBB ? 'SELL' : 'HOLD';

  return { rsi, sma, upperBB, lowerBB, lastPrice, signal };
}

async function fetchAndAnalyze(symbol) {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await axios.get(url);
    const data = res.data;

    const { rsi, sma, upperBB, lowerBB, lastPrice, signal } = calculateIndicators(data);

    const message = `
📈 *${symbol}*
Price: *${lastPrice.toFixed(2)}*
RSI: *${rsi.toFixed(2)}*
SMA: *${sma.toFixed(2)}*
Upper BB: *${upperBB.toFixed(2)}*
Lower BB: *${lowerBB.toFixed(2)}*
Signal: *${signal}*
    `;

    await bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error(`Error on ${symbol}:`, err.message);
  }
}

(async () => {
  for (const coin of coins) {
    await fetchAndAnalyze(coin);
  }
})();
