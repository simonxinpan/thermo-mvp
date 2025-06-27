document.addEventListener('DOMContentLoaded', () => {
    fetchStockList();
});

async function fetchStockList() {
    const container = document.getElementById('stock-list-container');
    try {
        const response = await fetch('/.netlify/functions/get-stock-list');
        if (!response.ok) throw new Error(`Network response was not ok, status: ${response.status}`);
        
        const stockList = await response.json();
        renderStockList(stockList);

    } catch (error) {
        console.error('Failed to fetch stock list:', error);
        container.innerHTML = '<p>😭 加载数据失败，请检查API密钥或稍后重试。</p>';
    }
}

function renderStockList(stockList) {
    const container = document.getElementById('stock-list-container');
    container.innerHTML = ''; // 清空“正在加载”的提示

    if (stockList.length === 0) {
        container.innerHTML = '<p>未能获取到任何股票数据。</p>';
        return;
    }

    stockList.forEach(stock => {
        const peRatio = stock.pe / stock.industryAvgPE;
        let temperatureStatus = '合理';
        let tempClass = 'reasonable';
        if (peRatio > 1.25) {
            temperatureStatus = '高估';
            tempClass = 'overvalued';
        }
        if (peRatio < 0.8) {
            temperatureStatus = '低估';
            tempClass = 'undervalued';
        }

        const stockCardHTML = `
            <div class="stock-card">
                <div class="info">
                    <img src="${stock.logo}" alt="${stock.name} logo" class="logo">
                    <div>
                        <h3 class="name">${stock.name} (${stock.ticker})</h3>
                        <p class="status ${tempClass}">${temperatureStatus}</p>
                    </div>
                </div>
                <div class="metrics">
                    <div class="metric">
                        <span class="label">PE</span>
                        <span class="value">${stock.pe ? stock.pe.toFixed(2) : 'N/A'}</span>
                    </div>
                    <div class="metric">
                        <span class="label">行业PE</span>
                        <span class="value">${stock.industryAvgPE || 'N/A'}</span>
                    </div>
                    <div class="metric">
                        <span class="label">PB</span>
                        <span class="value">${stock.pb ? stock.pb.toFixed(2) : 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += stockCardHTML;
    });
}