// api/history.js — Vercel Serverless Function
// Proxy Yahoo Finance v8 chart API pour contourner le CORS
// Déployez ce dossier sur Vercel (gratuit) : https://vercel.com

export default async function handler(req, res) {
  // CORS — autorise votre screener à appeler ce proxy
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: "ticker manquant" });

  // 220 jours de données (nécessaire pour MM200)
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = period2 - 220 * 24 * 3600;

  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${period1}&period2=${period2}&interval=1d`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": "https://finance.yahoo.com",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Yahoo Finance HTTP ${response.status}` });
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result) {
      return res.status(404).json({ error: "Pas de données pour ce ticker" });
    }

    // Retourner uniquement les clôtures (du plus récent au plus ancien)
    const closes = result.indicators.quote[0].close
      .filter(v => v !== null)
      .reverse(); // Yahoo retourne du plus ancien au plus récent → on inverse

    res.status(200).json({ ticker, closes });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
