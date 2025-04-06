// sendSignal.js
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const technicalIndicators = require('technicalindicators');

const TELEGRAM_TOKEN = '7086211397:AAGotudtgcHMhiS0d79k840IN_fMhH5QAnE';
const CHAT_ID = '1775772121';
const INTERVAL = '1h';
const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];

const bot = new TelegramBot(TELEGRAM_TOKEN);

async function fetchKlines(symbol) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${INTERVAL}&limit=100`;
  const response = await axios.get(url);
  return response.data.map(k => ({
    time: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

function analyze(data) {
  const closePrices = data.map(d => d.close);

  const rsi = technicalIndicators.RSI.calculate({ values: closePrices, period: 14 });
  const sma = technicalIndicators.SMA.calculate({ values: closePrices, period: 20 });
  const bb = technicalIndicators.BollingerBands.calculate({
    period: 20,
    values: closePrices,
    stdDev: 2,
  });

  const lastRSI = rsi[rsi.length - 1];
  const lastClose = closePrices[closePrices.length - 1];
  const lastSMA = sma[sma.length - 1];
  const lastBB = bb[bb.length - 1];

  if (lastRSI < 30 && lastClose < lastBB.lower && lastClose > lastSMA) {
    return {
      signal: 'BUY',
      entry: lastClose,
      tp: (lastClose * 1.015).toFixed(2),
      sl: (lastClose * 0.985).toFixed(2)
    };
  } else if (lastRSI > 70 && lastClose > lastBB.upper && lastClose < lastSMA) {
    return {
      signal: 'SELL',
      entry: lastClose,
      tp: (lastClose * 0.985).toFixed(2),
      sl: (lastClose * 1.015).toFixed(2)
    };
  }

  return { signal: 'NO SIGNAL' };
}

async function main() {
  let messages = [];

  for (let symbol of SYMBOLS) {
    try {
      const data = await fetchKlines(symbol);
      const result = analyze(data);

      if (result.signal !== 'NO SIGNAL') {
        messages.push(`📊 ${symbol}
Signal: ${result.signal}
Entry: ${result.entry}
TP: ${result.tp}
SL: ${result.sl}`);
      }
    } catch (err) {
      console.error(`Error on ${symbol}:`, err.message);
    }
  }

  if (messages.length > 0) {
    await bot.sendMessage(CHAT_ID, messages.join('\n\n'));
  } else {
    console.log('No signal found.');
  }
}

main();
