// netlify/functions/get-stock-list.js
const fetch = require('node-fetch');
const EODHD_API_KEY = process.env.VITE_EODHD_API_KEY;
const FINNHUB_API_KEY = process.env.VITE_FINNHUB_API_KEY;
const STOCK_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'JPM', 'JNJ', 'V'];

async function getStockDetails(ticker) {
    try {
        const eodhdUrl = `https://eodhd.com/api/fundamentals/${ticker}.US?api_token=${EODHD_API_KEY}&fmt=json`;
        const eodhdResponse = await fetch(eodhdUrl);
        const eodhdData = eodhdResponse.ok ? await eodhdResponse.json() : {};
        const highlights = eodhdData.Highlights || {};
        const general = eodhdData.General || {};

        const finnhubMetricUrl = `https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${FINNHUB_API_KEY}`;
        const finnhubProfileUrl = `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${FINNHUB_API_KEY}`;
        
        const [metricRes, profileRes] = await Promise.all([ fetch(finnhubMetricUrl), fetch(finnhubProfileUrl) ]);
        const finnhubMetric = metricRes.ok ? (await metricRes.json()).metric : {};
        const finnhubProfile = profileRes.ok ? await profileRes.json() : {};

        const stockData = {
            ticker: ticker, name: general.Name || finnhubProfile.name || ticker,
            logo: finnhubProfile.logo || `https://eodhd.com${general.LogoURL}` || '',
            pe: highlights.PERatio || finnhubMetric.peNormalizedAnnual,
            pb: highlights.PBRatio || finnhubMetric.pbAnnual,
            dividendYield: highlights.DividendYield || finnhubMetric.dividendYieldIndicatedAnnual,
        };

        if (!stockData.pe || !stockData.pb) return null;

        const peersRes = await fetch(`https://finnhub.io/api/v1/stock/peers?symbol=${ticker}&token=${FINNHUB_API_KEY}`);
        const peers = peersRes.ok ? await peersRes.json() : [];
        let totalIndustryPE = 0, validPeers = 0;
        if (peers && peers.length > 1) {
            const peersToFetch = peers.slice(1, 6);
            for (const peer of peersToFetch) {
                const peerMetricRes = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${peer}&metric=all&token=${FINNHUB_API_KEY}`);
                if(peerMetricRes.ok) {
                    const peerMetric = (await peerMetricRes.json()).metric;
                    if (peerMetric && peerMetric.peNormalizedAnnual > 0) {
                        totalIndustryPE += peerMetric.peNormalizedAnnual;
                        validPeers++;
                    }
                }
            }
        }
        stockData.industryAvgPE = (validPeers > 0) ? (totalIndustryPE / validPeers).toFixed(2) : (stockData.pe ? stockData.pe.toFixed(2) : null);
        return stockData;
    } catch (error) {
        console.error(`Error fetching details for ${ticker}:`, error.message);
        return null;
    }
}

exports.handler = async function(event, context) {
    if (!EODHD_API_KEY || !FINNHUB_API_KEY) return { statusCode: 500, body: "API keys are not configured." };
    const promises = STOCK_TICKERS.map(ticker => getStockDetails(ticker));
    const results = await Promise.all(promises);
    const successfulResults = results.filter(res => res !== null);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(successfulResults) };
};