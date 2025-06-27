// netlify/functions/get-stock-list.js (Final Optimized Version)

const EODHD_API_KEY = process.env.VITE_EODHD_API_KEY;
// MVP阶段，我们只关注这5只股票
const STOCK_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];

exports.handler = async function(event, context) {
    console.log("Function starting with new simplified logic...");

    if (!EODHD_API_KEY) {
        console.error("EODHD API Key is not configured.");
        return { statusCode: 500, body: "API key is not configured." };
    }

    // --- 第1步：获取所有5只股票的基础数据 ---
    const promises = STOCK_TICKERS.map(ticker => {
        const url = `https://eodhd.com/api/fundamentals/${ticker}.US?api_token=${EODHD_API_KEY}&fmt=json`;
        return fetch(url).then(res => res.ok ? res.json() : null);
    });

    const results = await Promise.all(promises);
    
    // 过滤掉请求失败的股票，并提取我们需要的数据
    const validStocks = results.filter(data => data && data.General && data.Highlights)
        .map(data => ({
            ticker: data.General.Code,
            name: data.General.Name,
            logo: `https://eodhd.com${data.General.LogoURL}`,
            pe: data.Highlights.PERatio,
            pb: data.Highlights.PBRatio,
            // 您可以在这里添加其他需要从Highlights或General提取的指标
        }));

    console.log(`Successfully fetched ${validStocks.length} valid stocks.`);

    // --- 第2步：基于这5只股票，计算它们自己的PE均值 ---
    let totalPE = 0;
    let stocksWithPE = 0;
    validStocks.forEach(stock => {
        if (stock.pe && stock.pe > 0) {
            totalPE += stock.pe;
            stocksWithPE++;
        }
    });

    const averagePE = (stocksWithPE > 0) ? (totalPE / stocksWithPE).toFixed(2) : null;
    console.log(`Calculated average PE is: ${averagePE}`);

    // --- 第3步：将计算出的均值，赋给每一只股票 ---
    const finalStockList = validStocks.map(stock => ({
        ...stock,
        industryAvgPE: averagePE 
    }));

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalStockList),
    };
};