const axios = require('axios');
const { SMA, RSI, BollingerBands } = require('technicalindicators');

const TELEGRAM_API = 'https://api.telegram.org/bot7086211397:AAGotudtgcHMhiS0d79k840IN_fMhH5QAnE/sendMessage';
const CHAT_ID = '1775772121';
const SYMBOL = 'bitcoin'; // bisa diganti dengan coin lain dari CoinCap

async function fetchMarketData() {
  const url = `https://api.coincap.io/v2/assets/${SYMBOL}/history?interval=h1`;
  const response = await axios.get(url);
  return response.data.data.map(item => parseFloat(item.priceUsd));
}

function calculateIndicators(prices) {
  const rsi = RSI.calculate({ values: prices, period: 14 });
  const sma20 = SMA.calculate({ values: prices, period: 20 });
  const bb = BollingerBands.calculate({
    period: 20,
    values: prices,
    stdDev: 2
  });

  return {
    rsi: rsi[rsi.length - 1],
    sma: sma20[sma20.length - 1],
    bb: bb[bb.length - 1],
    price: prices[prices.length - 1]
  };
}

function generateSignal({ rsi, sma, bb, price }) {
  if (rsi < 30 && price < bb.lower) {
    return { action: 'BUY', entry: price, tp: price * 1.01, sl: price * 0.99 };
  } else if (rsi > 70 && price > bb.upper) {
    return { action: 'SELL', entry: price, tp: price * 0.99, sl: price * 1.01 };
  }
  return null;
}

async function sendSignalToTelegram(signal) {
  const text = `
📊 Crypto Signal ${SYMBOL.toUpperCase()}
Aksi: ${signal.action}
Entry: $${signal.entry.toFixed(2)}
TP: $${signal.tp.toFixed(2)}
SL: $${signal.sl.toFixed(2)}
  `;
  await axios.post(TELEGRAM_API, {
    chat_id: CHAT_ID,
    text
  });
}

async function main() {
  try {
    const prices = await fetchMarketData();
    const indicators = calculateIndicators(prices);
    const signal = generateSignal(indicators);
    if (signal) {
      await sendSignalToTelegram(signal);
    } else {
      console.log('⚠️ Tidak ada sinyal yang valid.');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
