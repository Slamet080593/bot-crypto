const axios = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');
const TelegramBot = require('node-telegram-bot-api');

// Telegram setup
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const bot = new TelegramBot(TELEGRAM_TOKEN);

// Proxy setup
const PROXY_URL = 'http://173.234.15.62:6075';
const axiosInstance = axios.create({
  httpsAgent: new HttpsProxyAgent(PROXY_URL),
  timeout: 10000,
});

// List of symbols
const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];

// Fetch historical data from Binance
async function fetchPriceData(symbol) {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=100`;
    const response = await axiosInstance.get(url);
    return response.data.map(candle => parseFloat(candle[4])); // Close prices
  } catch (error) {
    console.error(`Error on ${symbol}:`, error.message);
    return null;
  }
}

// Calculate RSI
function calculateRSI(closes, period = 14) {
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let rs = avgGain / avgLoss;
  let rsi = [100 - 100 / (1 + rs)];

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));
  }

  return rsi;
}

// Calculate SMA
function calculateSMA(data, period) {
  const sma = [];
  for (let i = 0; i <= data.length - period; i++) {
    const slice = data.slice(i, i + period);
    const avg = slice.reduce((a, b) => a + b, 0) / period;
    sma.push(avg);
  }
  return sma;
}

// Calculate Bollinger Bands
function calculateBollingerBands(data, period = 20, multiplier = 2) {
  const sma = calculateSMA(data, period);
  const bands = [];

  for (let i = 0; i < sma.length; i++) {
    const slice = data.slice(i, i + period);
    const avg = sma[i];
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    bands.push({
      upper: avg + multiplier * stdDev,
      lower: avg - multiplier * stdDev,
      basis: avg,
    });
  }

  return bands;
}

// Generate signal
async function analyzeSymbol(symbol) {
  const closes = await fetchPriceData(symbol);
  if (!closes || closes.length < 50) return;

  const rsi = calculateRSI(closes);
  const ma20 = calculateSMA(closes, 20);
  const bb = calculateBollingerBands(closes);

  const latestPrice = closes[closes.length - 1];
  const latestRSI = rsi[rsi.length - 1];
  const latestMA = ma20[ma20.length - 1];
  const latestBB = bb[bb.length - 1];

  let signal = null;
  if (latestPrice < latestBB.lower && latestRSI < 30 && latestPrice > latestMA) {
    signal = '📈 BUY';
  } else if (latestPrice > latestBB.upper && latestRSI > 70 && latestPrice < latestMA) {
    signal = '📉 SELL';
  }

  if (signal) {
    const message = `
${signal} SIGNAL: ${symbol}
💰 Price: ${latestPrice}
📊 RSI: ${latestRSI.toFixed(2)}
📉 MA(20): ${latestMA.toFixed(2)}
🔵 Bollinger Upper: ${latestBB.upper.toFixed(2)}
🟢 Bollinger Lower: ${latestBB.lower.toFixed(2)}
`;
    await bot.sendMessage(TELEGRAM_CHAT_ID, message);
    console.log(`Sent signal for ${symbol}`);
  } else {
    console.log(`No signal for ${symbol}`);
  }
}

// Run all analyses
(async () => {
  for (const symbol of symbols) {
    await analyzeSymbol(symbol);
  }
})();
