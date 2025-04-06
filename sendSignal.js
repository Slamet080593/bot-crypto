const axios = require("axios");
const { RSI, SMA, BollingerBands } = require("technicalindicators");

const TELEGRAM_BOT_TOKEN = "7086211397:AAGotudtgcHMhiS0d79k840IN_fMhH5QAnE";
const CHAT_ID = "1775772121";

// Ambil data candle terakhir dari Binance
async function fetchCandles(symbol = "BTCUSDT", interval = "1h", limit = 50) {
  const url = `https://api1.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const response = await axios.get(url);
  return response.data.map(candle => ({
    time: candle[0],
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
    volume: parseFloat(candle[5])
  }));
}

// Hitung indikator dan tentukan sinyal
function analyze(candles) {
  const close = candles.map(c => c.close);

  const rsi = RSI.calculate({ values: close, period: 14 });
  const sma = SMA.calculate({ values: close, period: 14 });
  const bb = BollingerBands.calculate({
    period: 20,
    stdDev: 2,
    values: close
  });

  const latestPrice = close[close.length - 1];
  const latestRSI = rsi[rsi.length - 1];
  const latestSMA = sma[sma.length - 1];
  const latestBB = bb[bb.length - 1];

  let signal = "WAIT";

  if (latestRSI < 30 && latestPrice < latestBB.lower && latestPrice > latestSMA) {
    signal = "BUY";
  } else if (latestRSI > 70 && latestPrice > latestBB.upper && latestPrice < latestSMA) {
    signal = "SELL";
  }

  const entry = latestPrice.toFixed(2);
  const tp = (signal === "BUY")
    ? (latestPrice * 1.01).toFixed(2)
    : (latestPrice * 0.99).toFixed(2);
  const sl = (signal === "BUY")
    ? (latestPrice * 0.99).toFixed(2)
    : (latestPrice * 1.01).toFixed(2);

  return {
    signal,
    entry,
    tp,
    sl,
    rsi: latestRSI.toFixed(2),
    sma: latestSMA.toFixed(2),
    bb: latestBB
  };
}

// Kirim sinyal ke Telegram
async function sendToTelegram(msg) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: CHAT_ID,
    text: msg
  });
}

// Jalankan
async function main() {
  try {
    const candles = await fetchCandles();
    const result = analyze(candles);

    if (result.signal === "WAIT") {
      console.log("Belum ada sinyal.");
      return;
    }

    const message = `📊 *Signal Detected*
Pair: BTC/USDT
Sinyal: ${result.signal}
Entry: ${result.entry}
TP: ${result.tp}
SL: ${result.sl}
RSI: ${result.rsi}
SMA(14): ${result.sma}
BB: [${result.bb.lower.toFixed(2)} - ${result.bb.upper.toFixed(2)}]
🕐 Interval: 1H`;

    await sendToTelegram(message);
    console.log("Sinyal terkirim.");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main();
