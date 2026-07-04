/* =========================================================
   Expenso — Expense Tracker
   dashboard.js — depends on storage.js (load storage.js first)
   ========================================================= */

   const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html";
}
async function loadUser() {
  try {
    const res = await fetch("http://localhost:4000/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    console.log(data);

    if (!res.ok) {
      document.getElementById("userName").innerText = data.user.name;
      window.location.href = "login.html";
      return;
    }

    console.log("User:", data);

    document.getElementById("userName").innerText = data.user.name;

  } catch (err) {
    console.error(err);
  }
}
document.addEventListener('DOMContentLoaded', () => {

  let transactions = Storage.getTransactions();
  let currentTypeFilter = 'all';
  let currentTypeMode = 'expense';
  let overviewChart, catDonutChart;

  const categoryInput = document.getElementById('categoryInput');
  const searchInput = document.getElementById('searchInput');
  const txForm = document.getElementById('txForm');
  const dateInput = document.getElementById('dateInput');

  /* ---------- Category select options ---------- */
  function refreshCategoryOptions(){
    categoryInput.innerHTML = '';
    Object.keys(Storage.CATEGORIES).forEach(cat => {
      if(currentTypeMode === 'income' && cat !== 'Salary / Income') return;
      if(currentTypeMode === 'expense' && cat === 'Salary / Income') return;
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoryInput.appendChild(opt);
    });
  }
  refreshCategoryOptions();
  dateInput.value = new Date().toISOString().slice(0,10);

  /* ---------- Type toggle ---------- */
  document.querySelectorAll('.type-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.type-toggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTypeMode = btn.dataset.type;
      refreshCategoryOptions();
    });
  });

  /* ---------- Filter chips ---------- */
  document.querySelectorAll('.chip-filter').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip-filter').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentTypeFilter = chip.dataset.filter;
      renderTransactions();
    });
  });

  /* ---------- Search ---------- */
  searchInput.addEventListener('input', renderTransactions);

  /* ---------- Add transaction ---------- */
  txForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const desc = document.getElementById('descInput').value.trim();
    const amount = parseFloat(document.getElementById('amountInput').value);
    const date = dateInput.value;
    const category = categoryInput.value;
    if(!desc || !amount || amount <= 0 || !date) return;

    transactions = Storage.addTransaction({ desc, amount, type: currentTypeMode, category, date });

    e.target.reset();
    dateInput.value = new Date().toISOString().slice(0,10);
    document.querySelectorAll('.type-toggle button').forEach(b => b.classList.remove('active'));
    document.querySelector('.type-toggle button[data-type="expense"]').classList.add('active');
    currentTypeMode = 'expense';
    refreshCategoryOptions();

    showFormMessage();
    renderAll();
  });

  function showFormMessage(){
    const msg = document.getElementById('formMsg');
    if(!msg) return;
    msg.classList.add('show');
    clearTimeout(showFormMessage._t);
    showFormMessage._t = setTimeout(() => msg.classList.remove('show'), 2600);
  }

  document.getElementById('openFormBtn').addEventListener('click', () => {
    document.getElementById('formPanel').scrollIntoView({ behavior:'smooth', block:'center' });
    document.getElementById('descInput').focus();
  });

  /* ---------- Delete (exposed globally for inline onclick) ---------- */
  window.deleteTx = function(id){
    transactions = Storage.deleteTransaction(id);
    renderAll();
  };

  /* ---------- Render: stat cards ---------- */
  function renderStats(){
    const { income, expense, balance } = Storage.computeTotals(transactions);
    const savingsPct = income > 0 ? Math.max(0, Math.round((balance / income) * 100)) : 0;

    document.getElementById('statBalance').textContent = Storage.formatCurrency(balance);
    document.getElementById('statIncome').textContent = Storage.formatCurrency(income);
    document.getElementById('statExpense').textContent = Storage.formatCurrency(expense);
    document.getElementById('statSavings').textContent = Storage.formatCurrency(Math.max(0, balance));
    document.getElementById('savingsSub').textContent = savingsPct + '% of income saved';

    const balTrend = document.getElementById('balanceTrend');
    balTrend.innerHTML = balance >= 0
      ? '<i class="fa-solid fa-arrow-up"></i> Positive'
      : '<i class="fa-solid fa-arrow-down"></i> Negative';
    balTrend.className = 'stat-trend ' + (balance >= 0 ? 'up' : 'down');
  }

  /* ---------- Render: transactions list ---------- */
  function escapeHtml(str){
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function renderTransactions(){
    const q = searchInput.value.trim().toLowerCase();
    let list = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date));

    if(currentTypeFilter !== 'all'){
      list = list.filter(t => t.type === currentTypeFilter);
    }
    if(q){
      list = list.filter(t =>
        t.desc.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
      );
    }

    const shown = list.slice(0, 10);
    const container = document.getElementById('txList');
    document.getElementById('txCount').textContent =
      list.length + (list.length === 1 ? ' entry' : ' entries') +
      (shown.length < list.length ? ' · showing 10' : '');

    if(shown.length === 0){
      container.innerHTML = '<div class="tx-empty"><i class="fa-solid fa-inbox" style="font-size:20px;display:block;margin-bottom:8px;"></i>No transactions match your search.</div>';
      return;
    }

    container.innerHTML = shown.map(t => {
      const cat = Storage.categoryMeta(t.category);
      const isIncome = t.type === 'income';
      return `
        <div class="tx-row">
          <div class="tx-icon" style="--cat-color:${cat.color}; --cat-soft:${cat.soft}">
            <i class="fa-solid ${cat.icon}"></i>
          </div>
          <div class="tx-main">
            <p class="tx-desc">${escapeHtml(t.desc)}</p>
            <div class="tx-meta">
              <span class="tx-cat-badge" style="--cat-color:${cat.color}; --cat-soft:${cat.soft}">${t.category}</span>
            </div>
          </div>
          <div class="tx-amount ${isIncome ? 'pos' : 'neg'} num">${isIncome ? '+' : '−'} ${Storage.formatCurrency(t.amount)}</div>
          <div class="tx-date-col num">${Storage.formatDateShort(t.date)}</div>
          <button class="tx-del" title="Delete transaction" onclick="deleteTx('${t.id}')"><i class="fa-solid fa-trash-can"></i></button>
        </div>`;
    }).join('');
  }

  /* ---------- Render: categories ---------- */
  function renderCategories(){
    const sorted = Storage.computeCategoryTotals(transactions, 'expense');
    const totalExpense = sorted.reduce((s,[,amt]) => s + amt, 0) || 1;

    const listEl = document.getElementById('catList');
    if(sorted.length === 0){
      listEl.innerHTML = '<p style="font-size:12.5px;color:var(--muted);">No expenses logged yet.</p>';
    } else {
      listEl.innerHTML = sorted.map(([cat, amt]) => {
        const meta = Storage.categoryMeta(cat);
        const pct = Math.round((amt / totalExpense) * 100);
        return `
          <div class="cat-row" style="--cat-color:${meta.color}; --cat-soft:${meta.soft}">
            <div class="cat-row-h">
              <div class="cat-name">
                <span class="cat-icon-sm"><i class="fa-solid ${meta.icon}"></i></span>
                ${cat}
              </div>
              <div class="cat-amt num">${Storage.formatCurrency(amt)}</div>
            </div>
            <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
            <div class="cat-pct">${pct}% of total spending</div>
          </div>`;
      }).join('');
    }

    const ctx = document.getElementById('catDonut').getContext('2d');
    const labels = sorted.map(s => s[0]);
    const data = sorted.map(s => s[1]);
    const colors = sorted.map(s => Storage.categoryMeta(s[0]).color);

    if(catDonutChart) catDonutChart.destroy();
    catDonutChart = new Chart(ctx, {
      type:'doughnut',
      data:{ labels, datasets:[{ data, backgroundColor:colors, borderWidth:2, borderColor:'#fff' }] },
      options:{
        cutout:'68%',
        plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:(c) => c.label + ': ' + Storage.formatCurrency(c.raw) } } },
        maintainAspectRatio:false
      }
    });
  }

  /* ---------- Render: monthly overview chart ---------- */
  function renderOverview(){
    const buckets = Storage.computeMonthlyTotals(transactions, 6);
    const ctx = document.getElementById('overviewChart').getContext('2d');

    if(overviewChart) overviewChart.destroy();
    overviewChart = new Chart(ctx, {
      type:'bar',
      data:{
        labels: buckets.map(b => b.label),
        datasets:[
          { label:'Income', data: buckets.map(b => b.income), backgroundColor:'#1F6D4C', borderRadius:6, maxBarThickness:22 },
          { label:'Expense', data: buckets.map(b => b.expense), backgroundColor:'#B84A3E', borderRadius:6, maxBarThickness:22 }
        ]
      },
      options:{
        maintainAspectRatio:false,
        plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:(c) => c.dataset.label + ': ' + Storage.formatCurrency(c.raw) } } },
        scales:{
          x:{ grid:{ display:false }, ticks:{ color:'#5C6C61', font:{ size:11 } } },
          y:{ grid:{ color:'#EAEFE6' }, ticks:{ color:'#5C6C61', font:{ size:10 }, callback:(v) => '₹' + (v/1000) + 'k' } }
        }
      }
    });
  }

  /* ---------- Render all ---------- */
  function renderAll(){
    renderStats();
    renderTransactions();
    renderCategories();
    renderOverview();
  }

  renderAll();
});
loadUser();