const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const token = '7086211397:AAGotudtgcHMhiS0d79k840IN_fMhH5QAnE';
const chatId = '1775772121';
const bot = new TelegramBot(token);

const coins = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];

function calculateSMA(data, period) {
  if (data.length < period) return null;
  const sum = data.slice(-period).reduce((acc, val) => acc + val, 0);
  return sum / period;
}

function calculateEMA(data, period) {
  if (data.length < period) return null;
  const k = 2 / (period + 1);
  let ema = data[0];
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

function calculateRSI(data, period = 14) {
  if (data.length < period + 1) return null;
  let gains = 0;
  let losses = 0;

  for (let i = data.length - period - 1; i < data.length - 1; i++) {
    const change = data[i + 1] - data[i];
    if (change >= 0) gains += change;
    else losses -= change;
  }

  const averageGain = gains / period;
  const averageLoss = losses / period;

  const rs = averageGain / averageLoss;
  return 100 - 100 / (1 + rs);
}

function calculateBollingerBands(data, period = 20) {
  if (data.length < period) return null;
  const recent = data.slice(-period);
  const sma = calculateSMA(recent, period);
  const variance =
    recent.reduce((acc, val) => acc + Math.pow(val - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: sma + 2 * stdDev,
    middle: sma,
    lower: sma - 2 * stdDev,
  };
}

async function fetchKlines(symbol) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=100`;
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    });
    return response.data.map((candle) => parseFloat(candle[4])); // Close prices
  } catch (error) {
    console.error(`Error on ${symbol}: ${error.message}`);
    return null;
  }
}

function generateSignal(prices) {
  const sma = calculateSMA(prices, 14);
  const ema = calculateEMA(prices, 14);
  const rsi = calculateRSI(prices, 14);
  const bb = calculateBollingerBands(prices, 20);

  let signal = 'HOLD';

  if (!sma || !ema || !rsi || !bb) return { signal: 'HOLD', detail: 'Data tidak cukup' };

  const lastPrice = prices[prices.length - 1];

  if (lastPrice > bb.upper && rsi > 70) signal = 'SELL';
  else if (lastPrice < bb.lower && rsi < 30) signal = 'BUY';

  return {
    signal,
    detail: `Price: ${lastPrice.toFixed(2)} | RSI: ${rsi.toFixed(2)} | SMA: ${sma.toFixed(
      2
    )} | EMA: ${ema.toFixed(2)}`,
  };
}

async function main() {
  for (const symbol of coins) {
    const prices = await fetchKlines(symbol);
    if (!prices) continue;

    const { signal, detail } = generateSignal(prices);
    const message = `📈 *${symbol}*\nSignal: *${signal}*\n${detail}`;
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }
}

main();
