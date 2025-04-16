const fetchTopMovers = async () => {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    // Sort by price change percentage
    const sorted = [...data].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);

    const topGainers = sorted.slice(0, 5);
    const topLosers = sorted.slice(-5).reverse();

    const gainersDiv = document.getElementById("gainers");
    const losersDiv = document.getElementById("losers");

    gainersDiv.innerHTML = "<h3>🚀 Top Gainers</h3>";
    losersDiv.innerHTML = "<h3>📉 Top Losers</h3>";

    topGainers.forEach((coin) => {
      gainersDiv.innerHTML += `<p><strong>${coin.name}</strong> (${coin.symbol.toUpperCase()}) ➜ +${coin.price_change_percentage_24h.toFixed(2)}%</p>`;
    });

    topLosers.forEach((coin) => {
      losersDiv.innerHTML += `<p><strong>${coin.name}</strong> (${coin.symbol.toUpperCase()}) ➜ ${coin.price_change_percentage_24h.toFixed(2)}%</p>`;
    });
  } catch (err) {
    console.error("Error fetching top movers:", err);
  }
};

fetchTopMovers();
// === Constants ===
const CURRENCY_OPTIONS = ['usd', 'eur', 'gbp', 'jpy', 'aud', 'cad', 'chf', 'cny'];

const API_BASE_URL = 'https://api.coingecko.com/api/v3';
const FNG_API_URL = 'https://api.alternative.me/fng';

let autoRefresh = true;
const coins = ['bitcoin', 'ethereum', 'cardano', 'solana'];
let chartType = 'line';
let fgDays = 7;
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

// === Apply saved theme on load ===
document.addEventListener('DOMContentLoaded', () => {
  const theme = localStorage.getItem('theme') || 'dark';
  if (theme === 'light') document.body.classList.add('light');
});

// === Theme toggle ===
document.getElementById('themeToggle').addEventListener('click', () => {
  document.body.classList.toggle('light');
  localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
});

// === Auto-refresh toggle ===
document.getElementById('autoRefreshToggle').addEventListener('change', (e) => {
  autoRefresh = e.target.checked;
});

// === Currency & chart selector ===
document.getElementById('currencySelector').addEventListener('change', refreshAll);
document.getElementById('chartType').addEventListener('change', (e) => {
  chartType = e.target.value;
  fetchFearGreed();
});
document.getElementById('fgDays').addEventListener('change', (e) => {
  fgDays = parseInt(e.target.value);
  fetchFearGreed();
});

const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

document.getElementById('coinSearch').addEventListener('input', debounce(refreshAll, 300));

// === Fetch Global Market Data ===
const fetchMarketStats = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/global`);
    if (!res.ok) throw new Error('Failed to fetch market stats');
    const data = await res.json();
    const m = data.data;

    document.getElementById('market-stats').innerHTML = `
      <p>Total Market Cap: $${Number(m.total_market_cap.usd).toLocaleString()}</p>
      <p>Total Volume (24h): $${Number(m.total_volume.usd).toLocaleString()}</p>
      <p>BTC Dominance: ${m.market_cap_percentage.btc.toFixed(2)}%</p>
    `;
  } catch (error) {
    console.error(error);
    document.getElementById('market-stats').innerHTML = `<p>Error loading market stats.</p>`;
  }
};

// === Fetch Crypto Prices ===
const fetchCryptoPrices = async () => {
  const currency = document.getElementById('currencySelector').value;
  const query = document.getElementById('coinSearch').value.toLowerCase();
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&ids=${coins.join(',')}&sparkline=true`;
  const res = await fetch(url);
  const data = await res.json();

  const container = document.getElementById('crypto-prices');
  container.innerHTML = '<div class="crypto-grid"></div>';
  const grid = container.querySelector('.crypto-grid');

  data.filter(c => c.name.toLowerCase().includes(query) || c.symbol.toLowerCase().includes(query))
    .forEach(coin => {
      const changeClass = coin.price_change_percentage_24h >= 0 ? 'green' : 'red';
      const isFav = favorites.includes(coin.id);

      const card = document.createElement('div');
      card.className = 'crypto-box';

      card.innerHTML = `
        <div>
          <span class="favorite" data-id="${coin.id}">${isFav ? '★' : '☆'}</span>
          <h3>${coin.name} (${coin.symbol.toUpperCase()})</h3>
        </div>
        <p class="price ${changeClass}">${currency.toUpperCase()} ${coin.current_price.toLocaleString()}</p>
        <p>24h Change: <span class="${changeClass}">${coin.price_change_percentage_24h.toFixed(2)}%</span></p>
        <canvas id="spark-${coin.id}" height="50"></canvas>
      `;

      grid.appendChild(card);

      const ctx = document.getElementById(`spark-${coin.id}`).getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: coin.sparkline_in_7d.price.map((_, i) => i),
          datasets: [{
            data: coin.sparkline_in_7d.price,
            borderColor: changeClass === 'green' ? '#22c55e' : '#ef4444',
            fill: false,
            borderWidth: 1,
            pointRadius: 0
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { display: false },
            y: { display: false }
          }
        }
      });
    });

  // Add favorite toggles
  document.querySelectorAll('.favorite').forEach(star => {
    star.onclick = () => {
      const id = star.dataset.id;
      if (favorites.includes(id)) {
        favorites = favorites.filter(f => f !== id);
      } else {
        favorites.push(id);
      }
      localStorage.setItem('favorites', JSON.stringify(favorites));
      refreshAll();
    };
  });
};

// === Fetch Fear & Greed ===
const fetchFearGreed = async () => {
  try {
    const res = await fetch(`${FNG_API_URL}/?limit=${fgDays}`);
    if (!res.ok) throw new Error('Failed to fetch Fear & Greed data');
    const data = await res.json();
    const current = data.data[0];

    document.getElementById('fear-greed').innerHTML = `
      <p><strong>${current.value_classification}</strong> (${current.value}/100)</p>
      <p style="font-size: 0.9rem; color: #9ca3af;">Updated: ${new Date(current.timestamp * 1000).toLocaleString()}</p>
    `;

    const labels = data.data.map(d => new Date(d.timestamp * 1000).toLocaleDateString()).reverse();
    const values = data.data.map(d => d.value).reverse();

    if (window.fgChartInstance) {
      window.fgChartInstance.data.labels = labels;
      window.fgChartInstance.data.datasets[0].data = values;
      window.fgChartInstance.update();
    } else {
      const ctx = document.getElementById('fgChart').getContext('2d');
      window.fgChartInstance = new Chart(ctx, {
        type: chartType,
        data: {
          labels,
          datasets: [{
            label: 'Fear & Greed Index',
            data: values,
            backgroundColor: 'rgba(234,179,8,0.2)',
            borderColor: '#facc15',
            borderWidth: 2,
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          scales: { y: { beginAtZero: true } }
        }
      });
    }
  } catch (error) {
    console.error(error);
    document.getElementById('fear-greed').innerHTML = `<p>Error loading Fear & Greed data.</p>`;
  }
};

// === Main Refresh ===
const refreshAll = () => {
  fetchCryptoPrices();
  fetchFearGreed();
  fetchMarketStats();
};

const REFRESH_INTERVAL = 300000; // 5 minutes
setInterval(() => {
  if (autoRefresh) refreshAll();
}, REFRESH_INTERVAL);

// Initial load
refreshAll();

// === HTML Elements ===
document.body.innerHTML += `
  <button id="themeToggle" aria-label="Toggle Theme">🌓 Toggle Theme</button>
  <input type="checkbox" id="autoRefreshToggle" checked aria-label="Enable Auto Refresh" />
  <select id="currencySelector" title="Select Currency" aria-label="Select Currency"></select>
`;
const getSentimentScore = (text) => {
  const lower = text.toLowerCase();
  let score = 0;
  if (lower.includes("bull") || lower.includes("pump") || lower.includes("surge")) score += 2;
  if (lower.includes("rally") || lower.includes("gain")) score += 1;
  if (lower.includes("bear") || lower.includes("crash") || lower.includes("fear")) score -= 2;
  if (lower.includes("loss") || lower.includes("drop") || lower.includes("dump")) score -= 1;
  return score;
};

const fetchSentimentNews = async () => {
  const apiKey = "0720b22de51c88a3ebb48279e5ec3b19";
  const url = `https://newsdata.io/api/1/news?apikey=${apiKey}&q=crypto&language=en&category=business`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const news = data.results;

    const sentimentDiv = document.getElementById("sentiment");
    sentimentDiv.innerHTML = "";

    news.slice(0, 6).forEach((article) => {
      const fullText = `${article.title} ${article.description}`;
      const score = getSentimentScore(fullText);
      const color = score > 0 ? "green" : score < 0 ? "red" : "gray";
      const emoji = score > 0 ? "😄" : score < 0 ? "😞" : "😐";

      const el = document.createElement("div");
      el.innerHTML = `
        <p><strong style="color:${color}">${emoji}</strong> ${article.title}</p>
        <p><small>${article.source_id} | ${new Date(article.pubDate).toLocaleString()}</small></p>
      `;
      sentimentDiv.appendChild(el);
    });
  } catch (err) {
    document.getElementById("sentiment").innerText = "⚠️ Failed to load news sentiment.";
    console.error("Sentiment error:", err);
  }
};

fetchSentimentNews();
 
// Portfolio Tracker
const portfolio = JSON.parse(localStorage.getItem("portfolio")) || [];

const fetchPortfolioPrices = async () => {
  const coins = portfolio.map((coin) => coin.name).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coins}&vs_currencies=usd`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    
    let totalValue = 0;
    portfolio.forEach((coin) => {
      if (data[coin.name]) {
        const price = data[coin.name].usd;
        coin.price = price;
        coin.value = price * coin.quantity;
        totalValue += coin.value;
      }
    });

    // Update the Portfolio List
    displayPortfolio();

    // Update the Total Value
    document.getElementById("portfolio-total").innerText = `Total Portfolio Value: $${totalValue.toFixed(2)}`;
  } catch (err) {
    console.error("Error fetching portfolio prices", err);
  }
};

// Display Portfolio in HTML
const displayPortfolio = () => {
  const portfolioList = document.getElementById("portfolio-list");
  portfolioList.innerHTML = "";

  portfolio.forEach((coin) => {
    const el = document.createElement("div");
    el.innerHTML = `
      <div>${coin.name.toUpperCase()} - ${coin.quantity} Coins 
        | $${coin.price ? coin.price.toFixed(2) : 'Loading...'} 
        | $${coin.value ? coin.value.toFixed(2) : 'Loading...'}</div>
    `;
    portfolioList.appendChild(el);
  });
};

// Add Coin to Portfolio
const addCoinToPortfolio = (name, quantity) => {
  portfolio.push({ name, quantity });
  localStorage.setItem("portfolio", JSON.stringify(portfolio));
  fetchPortfolioPrices();
};

// Handle Form Submission
document.getElementById("portfolio-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("coin-name").value.toLowerCase();
  const quantity = parseFloat(document.getElementById("coin-quantity").value);

  if (name && quantity > 0) {
    addCoinToPortfolio(name, quantity);
    document.getElementById("coin-name").value = "";
    document.getElementById("coin-quantity").value = "";
  }
});

// Initial Load
fetchPortfolioPrices();

