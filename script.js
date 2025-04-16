const fetchTopMovers = async () => {
  const // === Constants ===
const API_BASE_URL = 'https://api.coingecko.com/api/v3';
const FNG_API_URL = 'https://api.alternative.me/fng';
const NEWS_API_URL = 'https://newsdata.io/api/1/news';
const API_KEY = 'YOUR_SECURE_API_KEY';
const REFRESH_INTERVAL = 300000; // 5 minutes
const CURRENCY_OPTIONS = ['usd', 'eur', 'gbp', 'jpy', 'aud', 'cad', 'chf', 'cny'];

// === State Variables ===
let autoRefresh = true;
let chartType = 'line';
let fgDays = 7;
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
const portfolio = JSON.parse(localStorage.getItem('portfolio')) || [];

// === Utility Functions ===
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

const formatCurrency = (value, currency) => {
  return `${currency.toUpperCase()} ${Number(value).toLocaleString()}`;
};

const showError = (elementId, message) => {
  document.getElementById(elementId).innerHTML = `<p class="error">${message}</p>`;
};

// === Fetch Functions ===
const fetchTopMovers = async () => {
  const url = `${API_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch top movers');
    const data = await res.json();

    const sorted = [...data].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
    updateTopMoversUI(sorted.slice(0, 5), sorted.slice(-5).reverse());
  } catch (err) {
    console.error(err);
    showError('gainers', 'Error loading top gainers.');
    showError('losers', 'Error loading top losers.');
  }
};

const fetchMarketStats = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/global`);
    if (!res.ok) throw new Error('Failed to fetch market stats');
    const data = await res.json();

    updateMarketStatsUI(data.data);
  } catch (err) {
    console.error(err);
    showError('market-stats', 'Error loading market stats.');
  }
};

const fetchCryptoPrices = async () => {
  const currency = document.getElementById('currencySelector').value || 'usd';
  const query = document.getElementById('coinSearch').value.toLowerCase();
  const url = `${API_BASE_URL}/coins/markets?vs_currency=${currency}&ids=${portfolio.map(c => c.name).join(',')}&sparkline=true`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch crypto prices');
    const data = await res.json();

    updateCryptoPricesUI(data.filter(c => c.name.toLowerCase().includes(query) || c.symbol.toLowerCase().includes(query)), currency);
  } catch (err) {
    console.error(err);
    showError('crypto-prices', 'Error loading crypto prices.');
  }
};

const fetchFearGreed = async () => {
  try {
    const res = await fetch(`${FNG_API_URL}/?limit=${fgDays}`);
    if (!res.ok) throw new Error('Failed to fetch Fear & Greed data');
    const data = await res.json();

    updateFearGreedUI(data.data);
  } catch (err) {
    console.error(err);
    showError('fear-greed', 'Error loading Fear & Greed data.');
  }
};

const fetchSentimentNews = async () => {
  const url = `${NEWS_API_URL}?apikey=${API_KEY}&q=crypto&language=en&category=business`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch news sentiment');
    const data = await res.json();

    updateSentimentNewsUI(data.results.slice(0, 6));
  } catch (err) {
    console.error(err);
    showError('sentiment', 'Error loading news sentiment.');
  }
};

// === UI Update Functions ===
const updateTopMoversUI = (gainers, losers) => {
  const gainersDiv = document.getElementById('gainers');
  const losersDiv = document.getElementById('losers');

  gainersDiv.innerHTML = '<h3>🚀 Top Gainers</h3>';
  losersDiv.innerHTML = '<h3>📉 Top Losers</h3>';

  gainers.forEach(coin => {
    gainersDiv.innerHTML += `<p><strong>${coin.name}</strong> (${coin.symbol.toUpperCase()}) ➜ +${coin.price_change_percentage_24h.toFixed(2)}%</p>`;
  });

  losers.forEach(coin => {
    losersDiv.innerHTML += `<p><strong>${coin.name}</strong> (${coin.symbol.toUpperCase()}) ➜ ${coin.price_change_percentage_24h.toFixed(2)}%</p>`;
  });
};

const updateMarketStatsUI = (stats) => {
  document.getElementById('market-stats').innerHTML = `
    <p>Total Market Cap: $${Number(stats.total_market_cap.usd).toLocaleString()}</p>
    <p>Total Volume (24h): $${Number(stats.total_volume.usd).toLocaleString()}</p>
    <p>BTC Dominance: ${stats.market_cap_percentage.btc.toFixed(2)}%</p>
  `;
};

const updateCryptoPricesUI = (coins, currency) => {
  const container = document.getElementById('crypto-prices');
  container.innerHTML = '<div class="crypto-grid"></div>';
  const grid = container.querySelector('.crypto-grid');

  coins.forEach(coin => {
    const changeClass = coin.price_change_percentage_24h >= 0 ? 'green' : 'red';
    const isFav = favorites.includes(coin.id);

    const card = document.createElement('div');
    card.className = 'crypto-box';
    card.innerHTML = `
      <div>
        <span class="favorite" data-id="${coin.id}">${isFav ? '★' : '☆'}</span>
        <h3>${coin.name} (${coin.symbol.toUpperCase()})</h3>
      </div>
      <p class="price ${changeClass}">${formatCurrency(coin.current_price, currency)}</p>
      <p>24h Change: <span class="${changeClass}">${coin.price_change_percentage_24h.toFixed(2)}%</span></p>
    `;
    grid.appendChild(card);
  });
};

const updateFearGreedUI = (data) => {
  const current = data[0];

  document.getElementById('fear-greed').innerHTML = `
    <p><strong>${current.value_classification}</strong> (${current.value}/100)</p>
    <p style="font-size: 0.9rem; color: #9ca3af;">Updated: ${new Date(current.timestamp * 1000).toLocaleString()}</p>
  `;
};

// === Initialization ===
document.addEventListener('DOMContentLoaded', () => {
  fetchTopMovers();
  fetchMarketStats();
  fetchCryptoPrices();
  fetchFearGreed();
  fetchSentimentNews();

  setInterval(() => {
    if (autoRefresh) {
      fetchTopMovers();
      fetchMarketStats();
      fetchCryptoPrices();
      fetchFearGreed();
      fetchSentimentNews();
    }
  }, REFRESH_INTERVAL);
});
