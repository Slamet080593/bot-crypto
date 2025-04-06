const axios = require('axios');
const https = require('https');
const ti = require('technicalindicators');

const TOKEN = '7086211397:AAGotudtgcHMhiS0d79k840IN_fMhH5QAnE';
const CHAT_ID = '1775772121';
const COINS = ['bitcoin', 'ethereum'];

async function fetchMarketData(coinId) {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=1&interval=hourly`;
  const res = await axios.get(url);
  return res.data.prices.map(p => p[1]); // ambil harga saja
}

function analyze(prices) {
  const rsi = ti.RSI.calculate({ values: prices, period: 14 });
  const ma = ti.SMA.calculate({ values: prices, period: 10 });
  const bb = ti.BollingerBands.calculate({
    values: prices,
    period: 20,
    stdDev: 2
  });

  const latestPrice = prices[prices.length - 1];
  const latestRSI = rsi[rsi.length - 1];
  const latestMA = ma[ma.length - 1];
  const latestBB = bb[bb.length - 1];

  let advice = '🔍 Belum ada sinyal jelas';
  if (latestRSI < 35 && latestPrice < latestBB.lower) {
    advice = `🟢 Buy signal (RSI ${latestRSI.toFixed(2)}, harga di bawah BB)`;
  } else if (latestRSI > 70 && latestPrice > latestBB.upper) {
    advice = `🔴 Sell signal (RSI ${latestRSI.toFixed(2)}, harga di atas BB)`;
  }

  return {
    price: latestPrice.toFixed(2),
    rsi: latestRSI.toFixed(2),
    ma: latestMA.toFixed(2),
    bbUpper: latestBB.upper.toFixed(2),
    bbLower: latestBB.lower.toFixed(2),
    advice
  };
}

async function main() {
  let message = `📈 *Sinyal Scalping per ${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Jakarta' })} WIB*`;

  for (const coin of COINS) {
    const prices = await fetchMarketData(coin);
    const result = analyze(prices);
    message += `\n\n🪙 *${coin.toUpperCase()}*
💰 Harga: $${result.price}
📉 RSI: ${result.rsi}
📊 MA: ${result.ma}
📏 BB: ${result.bbLower} - ${result.bbUpper}
📌 *Sinyal:* ${result.advice}`;
  }

  await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    chat_id: CHAT_ID,
    text: message,
    parse_mode: 'Markdown'
  });
}

main().catch(console.error);
