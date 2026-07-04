/* =========================================================
   Expenso — Expense Tracker
   reports.js — depends on storage.js (load storage.js first)
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  const allTransactions = Storage.getTransactions();
  let currentRange = 6; // months; 'all' also supported
  let trendChart, categoryChart;

  /* ---------- Range buttons ---------- */
  document.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const val = btn.dataset.range;
      currentRange = val === 'all' ? 'all' : parseInt(val, 10);
      renderAll();
    });
  });

  /* ---------- Export CSV ---------- */
  document.getElementById('exportBtn').addEventListener('click', () => {
    const list = Storage.filterByRange(allTransactions, currentRange);
    const csv = Storage.toCSV(list);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expenso-report.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  /* ---------- Summary cards ---------- */
  function renderSummary(list){
    const { income, expense, balance } = Storage.computeTotals(list);
    const monthsInRange = currentRange === 'all'
      ? Math.max(1, Math.round((Date.now() - new Date(Math.min(...list.map(t=>new Date(t.date))))) / (1000*60*60*24*30)))
      : currentRange;
    const avgMonthly = expense / Math.max(1, monthsInRange);

    document.getElementById('sumIncome').textContent = Storage.formatCurrency(income);
    document.getElementById('sumExpense').textContent = Storage.formatCurrency(expense);
    document.getElementById('sumSavings').textContent = Storage.formatCurrency(balance);
    document.getElementById('sumAvg').textContent = Storage.formatCurrency(avgMonthly);
  }

  /* ---------- Trend chart (line) ---------- */
  function renderTrend(list){
    const months = currentRange === 'all' ? 24 : currentRange;
    const buckets = Storage.computeMonthlyTotals(list, months);
    const ctx = document.getElementById('trendChart').getContext('2d');

    if(trendChart) trendChart.destroy();
    trendChart = new Chart(ctx, {
      type:'line',
      data:{
        labels: buckets.map(b => b.label),
        datasets:[
          {
            label:'Income', data: buckets.map(b => b.income),
            borderColor:'#1F6D4C', backgroundColor:'rgba(31,109,76,.12)',
            tension:.35, fill:true, pointRadius:3, pointBackgroundColor:'#1F6D4C'
          },
          {
            label:'Expense', data: buckets.map(b => b.expense),
            borderColor:'#B84A3E', backgroundColor:'rgba(184,74,62,.1)',
            tension:.35, fill:true, pointRadius:3, pointBackgroundColor:'#B84A3E'
          }
        ]
      },
      options:{
        maintainAspectRatio:false,
        plugins:{
          legend:{ position:'top', align:'end', labels:{ boxWidth:10, boxHeight:10, usePointStyle:true, color:'#5C6C61', font:{ size:11.5 } } },
          tooltip:{ callbacks:{ label:(c) => c.dataset.label + ': ' + Storage.formatCurrency(c.raw) } }
        },
        scales:{
          x:{ grid:{ display:false }, ticks:{ color:'#5C6C61', font:{ size:11 } } },
          y:{ grid:{ color:'#EAEFE6' }, ticks:{ color:'#5C6C61', font:{ size:10 }, callback:(v) => '₹' + (v/1000) + 'k' } }
        }
      }
    });
  }

  /* ---------- Category comparison chart (horizontal bar) ---------- */
  function renderCategoryChart(list){
    const sorted = Storage.computeCategoryTotals(list, 'expense').slice(0, 7);
    const ctx = document.getElementById('categoryChart').getContext('2d');

    if(categoryChart) categoryChart.destroy();
    categoryChart = new Chart(ctx, {
      type:'bar',
      data:{
        labels: sorted.map(s => s[0]),
        datasets:[{
          data: sorted.map(s => s[1]),
          backgroundColor: sorted.map(s => Storage.categoryMeta(s[0]).color),
          borderRadius:6,
          maxBarThickness:18
        }]
      },
      options:{
        indexAxis:'y',
        maintainAspectRatio:false,
        plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:(c) => Storage.formatCurrency(c.raw) } } },
        scales:{
          x:{ grid:{ color:'#EAEFE6' }, ticks:{ color:'#5C6C61', font:{ size:10 }, callback:(v) => '₹' + (v/1000) + 'k' } },
          y:{ grid:{ display:false }, ticks:{ color:'#5C6C61', font:{ size:11.5 } } }
        }
      }
    });
  }

  /* ---------- Category comparison table ---------- */
  function renderTable(list){
    const sorted = Storage.computeCategoryTotals(list, 'expense');
    const totalExpense = sorted.reduce((s,[,amt]) => s + amt, 0) || 1;
    const counts = {};
    list.filter(t=>t.type==='expense').forEach(t => { counts[t.category] = (counts[t.category]||0) + 1; });

    const tbody = document.getElementById('repTableBody');
    if(sorted.length === 0){
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px;">No expenses in this range.</td></tr>';
      return;
    }
    tbody.innerHTML = sorted.map(([cat, amt]) => {
      const meta = Storage.categoryMeta(cat);
      const pct = Math.round((amt/totalExpense)*100);
      return `
        <tr>
          <td>
            <div class="rep-cat-cell">
              <span class="rep-cat-icon" style="--cat-color:${meta.color};--cat-soft:${meta.soft}"><i class="fa-solid ${meta.icon}"></i></span>
              ${cat}
            </div>
          </td>
          <td class="rep-amt num">${Storage.formatCurrency(amt)}</td>
          <td>${counts[cat] || 0}</td>
          <td class="rep-pct-cell">
            <div class="rep-mini-track"><div class="rep-mini-fill" style="width:${pct}%; --cat-color:${meta.color}"></div></div>
            <span style="font-size:11px;color:var(--muted);">${pct}%</span>
          </td>
        </tr>`;
    }).join('');
  }

  /* ---------- Top expenses ---------- */
  function renderTopExpenses(list){
    const top = list.filter(t => t.type === 'expense').sort((a,b) => b.amount - a.amount).slice(0, 5);
    const container = document.getElementById('topList');
    if(top.length === 0){
      container.innerHTML = '<div class="tx-empty">No expenses in this range.</div>';
      return;
    }
    container.innerHTML = top.map((t, i) => `
      <div class="top-row">
        <div class="top-rank">#${i+1}</div>
        <div>
          <div class="top-desc">${t.desc}</div>
          <div class="top-cat">${t.category} · ${Storage.formatDateShort(t.date)}</div>
        </div>
        <div class="top-amt num">${Storage.formatCurrency(t.amount)}</div>
      </div>`).join('');
  }

  /* ---------- Render all ---------- */
  function renderAll(){
    const list = Storage.filterByRange(allTransactions, currentRange);
    renderSummary(list);
    renderTrend(list);
    renderCategoryChart(list);
    renderTable(list);
    renderTopExpenses(list);
  }

  renderAll();
});
