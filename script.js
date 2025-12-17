// === FREE API ENDPOINTS ===
const API_BASE_URL = 'https://api.coingecko.com/api/v3';
const FNG_API_URL = 'https://api.alternative.me/fng';
const NEWS_API_URL = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';
const DEFI_API_URL = 'https://api.llama.fi';
const GAS_API_URL = 'https://ethgasstation.info/api/ethgasAPI.json';

// === STATE VARIABLES ===
let currentPage = 'home';
let chartType = 'line';
let fgDays = 7;
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let portfolio = JSON.parse(localStorage.getItem('portfolio')) || [];
let fgChart = null;
let cachedCoins = [];

// === NAVIGATION ===
const navigateToPage = (pageName) => {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  
  // Show selected page
  const targetPage = document.getElementById(`page-${pageName}`);
  if (targetPage) {
    targetPage.classList.add('active');
    currentPage = pageName;
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.dataset.page === pageName) {
        link.classList.add('active');
      }
    });
    
    // Load page-specific data
    loadPageData(pageName);
    
    // Close mobile menu
    document.getElementById('navMenu').classList.remove('active');
  }
  
  // Scroll to top
  window.scrollTo(0, 0);
};

// Make navigateToPage available globally
window.navigateToPage = navigateToPage;

const loadPageData = (pageName) => {
  switch(pageName) {
    case 'market':
      fetchMarketStats();
      fetchTopMovers();
      fetchCryptoPrices();
      break;
    case 'portfolio':
      updatePortfolio();
      fetchCryptoPrices();
      break;
    case 'news':
      fetchCryptoNews();
      fetchSentiment();
      break;
    case 'analytics':
      fetchFearGreed();
      initTradingView();
      break;
    case 'defi':
      fetchDeFiProtocols();
      fetchChainTVL();
      break;
    case 'tools':
      fetchGasPrices();
      break;
  }
};

// === UTILITY FUNCTIONS ===
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

const formatCurrency = (value, currency = 'usd') => {
  const symbols = { usd: '$', eur: '€', gbp: '£', jpy: '¥' };
  const symbol = symbols[currency.toLowerCase()] || currency.toUpperCase();
  return `${symbol}${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatLargeNumber = (num) => {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  return `$${num.toLocaleString()}`;
};

const showError = (elementId, message) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<p class="error">⚠️ ${message}</p>`;
  }
};

const updateLastUpdateTime = () => {
  const element = document.getElementById('last-update');
  if (element) {
    element.textContent = new Date().toLocaleTimeString();
  }
};

// === MARKET DATA FUNCTIONS ===
const fetchMarketStats = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/global`);
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    updateMarketStatsUI(data.data);
  } catch (err) {
    console.error('Error fetching market stats:', err);
    showError('market-stats', 'Unable to load market statistics');
  }
};

const fetchTopMovers = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&sparkline=false&price_change_percentage=24h`);
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    
    const sorted = [...data].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
    updateTopMoversUI(sorted.slice(0, 5), sorted.slice(-5).reverse());
  } catch (err) {
    console.error('Error fetching top movers:', err);
    showError('gainers', 'Unable to load');
    showError('losers', 'Unable to load');
  }
};

const fetchCryptoPrices = async () => {
  const currency = document.getElementById('currencySelector')?.value || 'usd';
  const query = document.getElementById('coinSearch')?.value.toLowerCase() || '';
  
  try {
    const res = await fetch(`${API_BASE_URL}/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=50&sparkline=false&price_change_percentage=24h`);
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    cachedCoins = data;
    
    const filtered = data.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.symbol.toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query)
    );
    
    updateCryptoPricesUI(filtered, currency);
    if (currentPage === 'portfolio') {
      updatePortfolioValue(data, currency);
    }
    updateLastUpdateTime();
  } catch (err) {
    console.error('Error fetching crypto prices:', err);
    showError('crypto-prices', 'Unable to load prices');
  }
};

const fetchFearGreed = async () => {
  try {
    const res = await fetch(`${FNG_API_URL}/?limit=${fgDays}`);
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    updateFearGreedUI(data.data);
    renderFearGreedChart(data.data);
  } catch (err) {
    console.error('Error fetching Fear & Greed:', err);
    showError('fear-greed', 'Unable to load data');
  }
};

const fetchCryptoNews = async () => {
  try {
    const res = await fetch(NEWS_API_URL);
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    updateNewsUI(data.Data.slice(0, 15));
  } catch (err) {
    console.error('Error fetching news:', err);
    showError('news-feed', 'Unable to load news');
  }
};

const fetchSentiment = async () => {
  try {
    const res = await fetch(NEWS_API_URL);
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    updateSentimentUI(data.Data.slice(0, 10));
  } catch (err) {
    console.error('Error fetching sentiment:', err);
    showError('sentiment', 'Unable to load sentiment');
  }
};

const fetchDeFiProtocols = async () => {
  try {
    const res = await fetch(`${DEFI_API_URL}/protocols`);
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    updateDeFiProtocolsUI(data.slice(0, 20));
  } catch (err) {
    console.error('Error fetching DeFi protocols:', err);
    showError('defi-protocols', 'Unable to load DeFi data');
  }
};

const fetchChainTVL = async () => {
  try {
    const res = await fetch(`${DEFI_API_URL}/chains`);
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    updateChainTVLUI(data.slice(0, 15));
  } catch (err) {
    console.error('Error fetching chain TVL:', err);
    showError('chain-tvl', 'Unable to load chain data');
  }
};

const fetchGasPrices = async () => {
  try {
    const res = await fetch(GAS_API_URL);
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    updateGasPricesUI(data);
  } catch (err) {
    console.error('Error fetching gas prices:', err);
    showError('gas-tracker', 'Unable to load gas prices');
  }
};

// === UI UPDATE FUNCTIONS ===
const updateMarketStatsUI = (stats) => {
  const marketCap = formatLargeNumber(stats.total_market_cap.usd);
  const volume = formatLargeNumber(stats.total_volume.usd);
  const btcDom = stats.market_cap_percentage.btc.toFixed(2);
  const ethDom = stats.market_cap_percentage.eth.toFixed(2);
  const activeCoins = stats.active_cryptocurrencies.toLocaleString();

  document.getElementById('market-stats').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <h4>Total Market Cap</h4>
        <p class="stat-value">${marketCap}</p>
      </div>
      <div class="stat-card">
        <h4>24h Volume</h4>
        <p class="stat-value">${volume}</p>
      </div>
      <div class="stat-card">
        <h4>BTC Dominance</h4>
        <p class="stat-value">${btcDom}%</p>
      </div>
      <div class="stat-card">
        <h4>ETH Dominance</h4>
        <p class="stat-value">${ethDom}%</p>
      </div>
      <div class="stat-card">
        <h4>Active Cryptocurrencies</h4>
        <p class="stat-value">${activeCoins}</p>
      </div>
      <div class="stat-card">
        <h4>Markets</h4>
        <p class="stat-value">${stats.markets.toLocaleString()}</p>
      </div>
    </div>
  `;
};

const updateTopMoversUI = (gainers, losers) => {
  const gainersDiv = document.getElementById('gainers');
  const losersDiv = document.getElementById('losers');

  gainersDiv.innerHTML = '<h3>🚀 Top Gainers</h3>';
  losersDiv.innerHTML = '<h3>📉 Top Losers</h3>';

  gainers.forEach(coin => {
    gainersDiv.innerHTML += `
      <p><strong>${coin.name}</strong> <span class="symbol">(${coin.symbol.toUpperCase()})</span>
      <span class="green">+${coin.price_change_percentage_24h.toFixed(2)}%</span></p>
    `;
  });

  losers.forEach(coin => {
    losersDiv.innerHTML += `
      <p><strong>${coin.name}</strong> <span class="symbol">(${coin.symbol.toUpperCase()})</span>
      <span class="red">${coin.price_change_percentage_24h.toFixed(2)}%</span></p>
    `;
  });
};

const updateCryptoPricesUI = (coins, currency) => {
  const container = document.getElementById('crypto-prices');
  if (!container) return;
  
  if (coins.length === 0) {
    container.innerHTML = '<p>No coins found matching your search.</p>';
    return;
  }

  container.innerHTML = '<div class="crypto-grid"></div>';
  const grid = container.querySelector('.crypto-grid');

  coins.forEach(coin => {
    const changeClass = coin.price_change_percentage_24h >= 0 ? 'green' : 'red';
    const isFav = favorites.includes(coin.id);
    const changeSign = coin.price_change_percentage_24h >= 0 ? '+' : '';

    const card = document.createElement('div');
    card.className = 'crypto-box';
    card.innerHTML = `
      <div class="crypto-header">
        <span class="favorite" data-id="${coin.id}" title="Toggle favorite">${isFav ? '★' : '☆'}</span>
        <img src="${coin.image}" alt="${coin.name}" width="32" height="32" />
        <h3>${coin.name} <span class="symbol">(${coin.symbol.toUpperCase()})</span></h3>
      </div>
      <p class="price ${changeClass}">${formatCurrency(coin.current_price, currency)}</p>
      <p class="change">24h: <span class="${changeClass}">${changeSign}${coin.price_change_percentage_24h.toFixed(2)}%</span></p>
      <p class="market-cap">Market Cap: ${formatLargeNumber(coin.market_cap)}</p>
    `;
    
    card.querySelector('.favorite').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(coin.id);
    });
    
    grid.appendChild(card);
  });
};

const updateFearGreedUI = (data) => {
  const current = data[0];
  const yesterday = data[1] || current;
  const change = current.value - yesterday.value;
  const changeText = change >= 0 ? `↑ ${change.toFixed(0)}` : `↓ ${Math.abs(change).toFixed(0)}`;
  const changeClass = change >= 0 ? 'green' : 'red';

  document.getElementById('fear-greed').innerHTML = `
    <div class="fg-display">
      <div class="fg-value">
        <span class="fg-number">${current.value}</span>
        <span class="fg-label">${current.value_classification}</span>
      </div>
      <p class="fg-change">Change: <span class="${changeClass}">${changeText}</span></p>
      <p class="fg-timestamp">Updated: ${new Date(current.timestamp * 1000).toLocaleString()}</p>
    </div>
  `;
};

const renderFearGreedChart = (data) => {
  const ctx = document.getElementById('fgChart');
  if (!ctx) return;

  const reversedData = [...data].reverse();
  const labels = reversedData.map(d => new Date(d.timestamp * 1000).toLocaleDateString());
  const values = reversedData.map(d => parseInt(d.value));

  if (fgChart) fgChart.destroy();

  fgChart = new Chart(ctx, {
    type: chartType,
    data: {
      labels: labels,
      datasets: [{
        label: 'Fear & Greed Index',
        data: values,
        borderColor: '#3b82f6',
        backgroundColor: chartType === 'line' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.6)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: { y: { beginAtZero: true, max: 100 } }
    }
  });
};

const updateNewsUI = (articles) => {
  const container = document.getElementById('news-feed');
  if (!container) return;
  
  container.innerHTML = '';
  
  articles.forEach(article => {
    const newsCard = document.createElement('div');
    newsCard.className = 'news-card';
    newsCard.innerHTML = `
      <img src="${article.imageurl || 'https://via.placeholder.com/120'}" alt="${article.title}" />
      <div class="news-content">
        <h3><a href="${article.url}" target="_blank" rel="noopener">${article.title}</a></h3>
        <p>${article.body.substring(0, 150)}...</p>
        <div class="news-meta">
          <span class="news-source">${article.source}</span>
          <span class="news-time">${new Date(article.published_on * 1000).toLocaleDateString()}</span>
        </div>
      </div>
    `;
    container.appendChild(newsCard);
  });
};

const updateSentimentUI = (articles) => {
  const container = document.getElementById('sentiment');
  if (!container) return;

  const positiveWords = ['surge', 'gain', 'rally', 'bullish', 'up', 'rise', 'soar', 'boost'];
  const negativeWords = ['drop', 'fall', 'crash', 'bearish', 'down', 'decline', 'plunge', 'slump'];
  
  let positive = 0, negative = 0, neutral = 0;

  articles.forEach(article => {
    const text = (article.title + ' ' + article.body).toLowerCase();
    const hasPos = positiveWords.some(w => text.includes(w));
    const hasNeg = negativeWords.some(w => text.includes(w));
    
    if (hasPos && !hasNeg) positive++;
    else if (hasNeg && !hasPos) negative++;
    else neutral++;
  });

  const total = articles.length;
  const posPercent = ((positive / total) * 100).toFixed(0);
  const negPercent = ((negative / total) * 100).toFixed(0);
  const neuPercent = ((neutral / total) * 100).toFixed(0);

  container.innerHTML = `
    <div class="sentiment-display">
      <div class="sentiment-bar">
        <div class="sentiment-positive" style="width: ${posPercent}%">
          <span>😊 ${posPercent}%</span>
        </div>
        <div class="sentiment-neutral" style="width: ${neuPercent}%">
          <span>😐 ${neuPercent}%</span>
        </div>
        <div class="sentiment-negative" style="width: ${negPercent}%">
          <span>😟 ${negPercent}%</span>
        </div>
      </div>
      <p class="sentiment-note">Based on recent news headlines</p>
    </div>
  `;
};

const updateDeFiProtocolsUI = (protocols) => {
  const container = document.getElementById('defi-protocols');
  if (!container) return;

  container.innerHTML = '<div class="defi-grid"></div>';
  const grid = container.querySelector('.defi-grid');

  protocols.forEach((protocol, index) => {
    const card = document.createElement('div');
    card.className = 'defi-card';
    card.innerHTML = `
      <div class="defi-rank">#${index + 1}</div>
      <h3>${protocol.name}</h3>
      <p class="defi-category">${protocol.category || 'DeFi'}</p>
      <p class="defi-tvl">TVL: ${formatLargeNumber(protocol.tvl)}</p>
      <p class="defi-change">24h: <span class="${protocol.change_1d >= 0 ? 'green' : 'red'}">
        ${protocol.change_1d >= 0 ? '+' : ''}${protocol.change_1d?.toFixed(2) || 0}%
      </span></p>
    `;
    grid.appendChild(card);
  });
};

const updateChainTVLUI = (chains) => {
  const container = document.getElementById('chain-tvl');
  if (!container) return;

  container.innerHTML = '<div class="chain-grid"></div>';
  const grid = container.querySelector('.chain-grid');

  chains.forEach(chain => {
    const card = document.createElement('div');
    card.className = 'chain-card';
    card.innerHTML = `
      <h3>${chain.name}</h3>
      <p class="chain-tvl">TVL: ${formatLargeNumber(chain.tvl)}</p>
    `;
    grid.appendChild(card);
  });
};

const updateGasPricesUI = (data) => {
  const container = document.getElementById('gas-tracker');
  if (!container) return;

  // Convert to Gwei (divide by 10)
  const slow = (data.safeLow / 10).toFixed(0);
  const average = (data.average / 10).toFixed(0);
  const fast = (data.fast / 10).toFixed(0);

  container.innerHTML = `
    <div class="gas-grid">
      <div class="gas-card slow">
        <h3>🐢 Slow</h3>
        <p class="gas-price">${slow} Gwei</p>
        <p class="gas-time">~10 min</p>
      </div>
      <div class="gas-card average">
        <h3>🚶 Average</h3>
        <p class="gas-price">${average} Gwei</p>
        <p class="gas-time">~3 min</p>
      </div>
      <div class="gas-card fast">
        <h3>🏃 Fast</h3>
        <p class="gas-price">${fast} Gwei</p>
        <p class="gas-time">~30 sec</p>
      </div>
    </div>
  `;
};

// === PORTFOLIO FUNCTIONS ===
const updatePortfolio = () => {
  const list = document.getElementById('portfolio-list');
  if (!list) return;
  
  if (portfolio.length === 0) {
    list.innerHTML = '<p class="empty-portfolio">No coins in portfolio. Add some above!</p>';
    return;
  }
  
  list.innerHTML = '';
  portfolio.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'portfolio-item';
    div.innerHTML = `
      <span class="portfolio-coin">${item.name.toUpperCase()}</span>
      <span class="portfolio-quantity">${item.quantity}</span>
      <button class="remove-btn" onclick="removeFromPortfolio(${index})">🗑️</button>
    `;
    list.appendChild(div);
  });
  
  localStorage.setItem('portfolio', JSON.stringify(portfolio));
};

const updatePortfolioValue = (coins, currency) => {
  let totalValue = 0;
  
  portfolio.forEach(item => {
    const coin = coins.find(c => 
      c.id === item.name.toLowerCase() || 
      c.symbol.toLowerCase() === item.name.toLowerCase()
    );
    if (coin) totalValue += coin.current_price * item.quantity;
  });
  
  const totalElement = document.getElementById('total-value');
  if (totalElement) {
    totalElement.textContent = formatCurrency(totalValue, currency);
  }
};

window.removeFromPortfolio = (index) => {
  portfolio.splice(index, 1);
  updatePortfolio();
  fetchCryptoPrices();
};

const toggleFavorite = (coinId) => {
  if (favorites.includes(coinId)) {
    favorites = favorites.filter(id => id !== coinId);
  } else {
    favorites.push(coinId);
  }
  localStorage.setItem('favorites', JSON.stringify(favorites));
  fetchCryptoPrices();
};

// === TOOL FUNCTIONS ===
window.calculateProfit = () => {
  const buy = parseFloat(document.getElementById('buy-price').value);
  const sell = parseFloat(document.getElementById('sell-price').value);
  const qty = parseFloat(document.getElementById('quantity').value);
  
  if (!buy || !sell || !qty) {
    document.getElementById('calc-result').innerHTML = '<p>Please fill all fields</p>';
    return;
  }
  
  const profit = (sell - buy) * qty;
  const profitPercent = ((sell - buy) / buy * 100).toFixed(2);
  const profitClass = profit >= 0 ? 'green' : 'red';
  
  document.getElementById('calc-result').innerHTML = `
    <p class="${profitClass}">
      Profit/Loss: $${profit.toFixed(2)} (${profitPercent}%)
    </p>
  `;
};

window.convertCrypto = async () => {
  const amount = parseFloat(document.getElementById('convert-amount').value);
  const from = document.getElementById('from-crypto').value;
  const to = document.getElementById('to-currency').value;
  
  try {
    const res = await fetch(`${API_BASE_URL}/simple/price?ids=${from}&vs_currencies=${to}`);
    const data = await res.json();
    const rate = data[from][to];
    const result = amount * rate;
    
    document.getElementById('convert-result').innerHTML = `
      <p>${amount} ${from.toUpperCase()} = ${formatCurrency(result, to)}</p>
    `;
  } catch (err) {
    document.getElementById('convert-result').innerHTML = '<p>Error converting</p>';
  }
};

// === TRADINGVIEW INITIALIZATION ===
const initTradingView = () => {
  if (typeof TradingView !== 'undefined' && document.getElementById('tv-chart')) {
    new TradingView.widget({
      container_id: "tv-chart",
      width: "100%",
      height: "500",
      symbol: "BINANCE:BTCUSDT",
      interval: "60",
      timezone: "Etc/UTC",
      theme: document.body.classList.contains('light-mode') ? 'light' : 'dark',
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true
    });
  }
};

// === THEME TOGGLE ===
const toggleTheme = () => {
  document.body.classList.toggle('light-mode');
  const btn = document.getElementById('themeToggle');
  btn.textContent = document.body.classList.contains('light-mode') ? '☀️' : '🌓';
  localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
};

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
  // Load saved theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    document.getElementById('themeToggle').textContent = '☀️';
  }

  // Navigation listeners
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToPage(link.dataset.page);
    });
  });

  // Mobile menu toggle
  document.getElementById('navToggle')?.addEventListener('click', () => {
    document.getElementById('navMenu').classList.toggle('active');
  });

  // Theme toggle
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

  // Control listeners
  document.getElementById('currencySelector')?.addEventListener('change', fetchCryptoPrices);
  document.getElementById('chartType')?.addEventListener('change', (e) => {
    chartType = e.target.value;
    fetchFearGreed();
  });
  document.getElementById('fgDays')?.addEventListener('change', (e) => {
    fgDays = parseInt(e.target.value);
    fetchFearGreed();
  });
  document.getElementById('coinSearch')?.addEventListener('input', debounce(fetchCryptoPrices, 500));
  document.getElementById('refreshMarket')?.addEventListener('click', () => {
    fetchMarketStats();
    fetchTopMovers();
    fetchCryptoPrices();
  });

  // Portfolio form
  document.getElementById('portfolio-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('coin-name').value.trim().toLowerCase();
    const quantity = parseFloat(document.getElementById('coin-quantity').value);
    
    if (name && quantity > 0) {
      const existingIndex = portfolio.findIndex(item => item.name === name);
      if (existingIndex >= 0) {
        portfolio[existingIndex].quantity += quantity;
      } else {
        portfolio.push({ name, quantity });
      }
      updatePortfolio();
      e.target.reset();
      fetchCryptoPrices();
    }
  });

  // Load homepage by default
  navigateToPage('home');
});
