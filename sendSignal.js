const axios = require('axios');
const TelegramBotToken = '7086211397:AAGotudtgcHMhiS0d79k840IN_fMhH5QAnE';
const TelegramChatId = '1775772121';

const BASE_URL = 'https://api.binance.me'; // proxy Binance
const SYMBOL = 'BTCUSDT';
const INTERVAL = '1h';
const LIMIT = 100;

// Teknik analisa
function calculateRSI(candles, period = 14) {
  let gains = 0, losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMA(candles, period = 20) {
  const slice = candles.slice(-period);
  const sum = slice.reduce((acc, c) => acc + c.close, 0);
  return sum / period;
}

function calculateBollingerBands(candles, period = 20) {
  const slice = candles.slice(-period);
  const ma = calculateMA(candles, period);
  const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - ma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  return {
    upper: ma + 2 * stdDev,
    lower: ma - 2 * stdDev,
    middle: ma
  };
}

async function fetchMarketData(symbol, interval, limit) {
  const url = `${BASE_URL}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const response = await axios.get(url);

  return response.data.map(c => ({
    time: c[0],
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
    volume: parseFloat(c[5])
  }));
}

async function sendTelegramMessage(message) {
  const url = `https://api.telegram.org/bot${TelegramBotToken}/sendMessage`;
  await axios.post(url, {
    chat_id: TelegramChatId,
    text: message
  });
}

async function main() {
  try {
    const candles = await fetchMarketData(SYMBOL, INTERVAL, LIMIT);
    const lastCandle = candles[candles.length - 1];
    const price = lastCandle.close;

    const rsi = calculateRSI(candles);
    const ma = calculateMA(candles);
    const bb = calculateBollingerBands(candles);

    let signal = '';
    let entry = price;
    let tp = 0;
    let sl = 0;

    // Sinyal BUY
    if (rsi < 30 && price < bb.lower && price < ma) {
      signal = 'BUY';
      tp = (price * 1.01).toFixed(2); // +1%
      sl = (price * 0.99).toFixed(2); // -1%
    }

    // Sinyal SELL
    else if (rsi > 70 && price > bb.upper && price > ma) {
      signal = 'SELL';
      tp = (price * 0.99).toFixed(2); // -1%
      sl = (price * 1.01).toFixed(2); // +1%
    }

    if (signal) {
      const message = `
📈 *Crypto Signal Detected*
Pair: ${SYMBOL}
Signal: ${signal}
Price: $${price.toFixed(2)}
TP: $${tp}
SL: $${sl}
RSI: ${rsi.toFixed(2)}
MA20: ${ma.toFixed(2)}
BB Upper: ${bb.upper.toFixed(2)}
BB Lower: ${bb.lower.toFixed(2)}
      `;
      await sendTelegramMessage(message);
      console.log('✅ Signal sent:', signal);
    } else {
      console.log('No valid signal at this time.');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
