/* =========================================================
   Expenso — Expense Tracker
   storage.js — data layer shared by dashboard.js & reports.js

   Persists transactions to localStorage so data survives a
   page refresh / navigation between pages. Falls back to an
   in-memory array automatically if localStorage is blocked
   (e.g. certain sandboxed previews).
   ========================================================= */

const Storage = (function(){

  const STORAGE_KEY = "expenso_transactions_v1";

  const CATEGORIES = {
    "Food & Dining":      { icon:"fa-utensils",           color:"#B84A3E", soft:"#F7E6E3" },
    "Groceries":          { icon:"fa-basket-shopping",    color:"#1F6D4C", soft:"#E4EFE7" },
    "Transport":          { icon:"fa-car",                color:"#2E6F8E", soft:"#E2EEF3" },
    "Shopping":           { icon:"fa-bag-shopping",       color:"#8A4FB0", soft:"#ECE2F3" },
    "Bills & Utilities":  { icon:"fa-file-invoice-dollar",color:"#B9862F", soft:"#F3EAD8" },
    "Entertainment":      { icon:"fa-film",               color:"#C4577E", soft:"#F6E2E9" },
    "Health":             { icon:"fa-heart-pulse",        color:"#3F8F6D", soft:"#E1F0E8" },
    "Salary / Income":    { icon:"fa-sack-dollar",        color:"#1F6D4C", soft:"#E4EFE7" },
    "Other":              { icon:"fa-ellipsis",           color:"#5C6C61", soft:"#E7ECE3" }
  };

  function daysAgo(n){
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0,10);
  }
  function monthsAgoDate(n, day){
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    d.setDate(day);
    return d.toISOString().slice(0,10);
  }
  function generateId(){
    return "tx_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2,8);
  }

  function seedData(){
    return [
      { id: generateId(), desc:"Monthly Salary",        amount: 68000, type:"income",  category:"Salary / Income",     date: daysAgo(1) },
      { id: generateId(), desc:"D-Mart grocery run",     amount: 2340,  type:"expense", category:"Groceries",           date: daysAgo(1) },
      { id: generateId(), desc:"Electricity bill",       amount: 1810,  type:"expense", category:"Bills & Utilities",   date: daysAgo(2) },
      { id: generateId(), desc:"Auto rickshaw",          amount: 120,   type:"expense", category:"Transport",           date: daysAgo(2) },
      { id: generateId(), desc:"Swiggy dinner order",    amount: 540,   type:"expense", category:"Food & Dining",       date: daysAgo(3) },
      { id: generateId(), desc:"Freelance UI project",   amount: 9500,  type:"income",  category:"Salary / Income",     date: daysAgo(4) },
      { id: generateId(), desc:"Myntra — new shoes",     amount: 2199,  type:"expense", category:"Shopping",            date: daysAgo(5) },
      { id: generateId(), desc:"Netflix subscription",   amount: 649,   type:"expense", category:"Entertainment",       date: daysAgo(6) },
      { id: generateId(), desc:"Pharmacy — vitamins",    amount: 460,   type:"expense", category:"Health",              date: daysAgo(7) },
      { id: generateId(), desc:"Petrol top-up",          amount: 1500,  type:"expense", category:"Transport",           date: daysAgo(9) },
      { id: generateId(), desc:"Movie night — PVR",      amount: 780,   type:"expense", category:"Entertainment",       date: daysAgo(12) },
      { id: generateId(), desc:"Internet bill",          amount: 999,   type:"expense", category:"Bills & Utilities",   date: daysAgo(14) },
      { id: generateId(), desc:"Zomato lunch",           amount: 310,   type:"expense", category:"Food & Dining",       date: monthsAgoDate(1,18) },
      { id: generateId(), desc:"Monthly Salary",         amount: 68000, type:"income",  category:"Salary / Income",     date: monthsAgoDate(1,1) },
      { id: generateId(), desc:"Big Bazaar shopping",    amount: 3450,  type:"expense", category:"Shopping",            date: monthsAgoDate(1,10) },
      { id: generateId(), desc:"Gym membership",         amount: 1200,  type:"expense", category:"Health",              date: monthsAgoDate(1,5) },
      { id: generateId(), desc:"Monthly Salary",         amount: 65500, type:"income",  category:"Salary / Income",     date: monthsAgoDate(2,1) },
      { id: generateId(), desc:"Water & gas bill",       amount: 950,   type:"expense", category:"Bills & Utilities",   date: monthsAgoDate(2,8) },
      { id: generateId(), desc:"Weekend groceries",      amount: 2760,  type:"expense", category:"Groceries",           date: monthsAgoDate(2,14) },
      { id: generateId(), desc:"Monthly Salary",         amount: 65500, type:"income",  category:"Salary / Income",     date: monthsAgoDate(3,1) },
      { id: generateId(), desc:"Cab to airport",         amount: 890,   type:"expense", category:"Transport",           date: monthsAgoDate(3,20) },
      { id: generateId(), desc:"Monthly Salary",         amount: 65500, type:"income",  category:"Salary / Income",     date: monthsAgoDate(4,1) },
      { id: generateId(), desc:"Diwali shopping",        amount: 5200,  type:"expense", category:"Shopping",            date: monthsAgoDate(4,15) },
      { id: generateId(), desc:"Monthly Salary",         amount: 62000, type:"income",  category:"Salary / Income",     date: monthsAgoDate(5,1) },
      { id: generateId(), desc:"Broadband bill",         amount: 999,   type:"expense", category:"Bills & Utilities",   date: monthsAgoDate(5,9) }
    ];
  }

  // In-memory fallback, used automatically if localStorage throws
  let memoryStore = null;
  let localStorageAvailable = true;
  try{
    const testKey = "__expenso_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
  }catch(e){
    localStorageAvailable = false;
  }

  function getTransactions(){
    if(localStorageAvailable){
      try{
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if(raw) return JSON.parse(raw);
        const seeded = seedData();
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        return seeded;
      }catch(e){
        localStorageAvailable = false;
      }
    }
    if(memoryStore === null) memoryStore = seedData();
    return memoryStore;
  }

  function saveTransactions(list){
    if(localStorageAvailable){
      try{
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        return;
      }catch(e){
        localStorageAvailable = false;
      }
    }
    memoryStore = list;
  }

  function addTransaction(tx){
    const list = getTransactions();
    list.unshift(Object.assign({ id: generateId() }, tx));
    saveTransactions(list);
    return list;
  }

  function deleteTransaction(id){
    const list = getTransactions().filter(t => t.id !== id);
    saveTransactions(list);
    return list;
  }

  function resetToSeed(){
    const seeded = seedData();
    saveTransactions(seeded);
    return seeded;
  }

  /* ---------- Computed helpers ---------- */

  function computeTotals(list){
    const income = list.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const expense = list.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    return { income, expense, balance: income - expense };
  }

  function computeCategoryTotals(list, type){
    type = type || 'expense';
    const totals = {};
    list.filter(t=>t.type===type).forEach(t=>{
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    return Object.entries(totals).sort((a,b)=>b[1]-a[1]);
  }

  function computeMonthlyTotals(list, months){
    months = months || 6;
    const now = new Date();
    const buckets = [];
    for(let i = months - 1; i >= 0; i--){
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: d.getFullYear() + '-' + d.getMonth(),
        label: d.toLocaleDateString('en-IN', { month:'short', year: months > 12 ? '2-digit' : undefined }),
        income: 0, expense: 0
      });
    }
    list.forEach(t=>{
      const d = new Date(t.date + 'T00:00:00');
      const key = d.getFullYear() + '-' + d.getMonth();
      const b = buckets.find(x => x.key === key);
      if(b) b[t.type] += t.amount;
    });
    return buckets;
  }

  function filterByRange(list, months){
    if(months === 'all') return list;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return list.filter(t => new Date(t.date + 'T00:00:00') >= cutoff);
  }

  /* ---------- Formatting ---------- */

  const inr = new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 });
  function formatCurrency(n){ return inr.format(Math.round(n)); }
  function formatDate(iso){
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  }
  function formatDateShort(iso){
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short' });
  }
  function categoryMeta(cat){
    return CATEGORIES[cat] || CATEGORIES['Other'];
  }
  function toCSV(list){
    const header = ['Date','Description','Category','Type','Amount'];
    const rows = list.map(t => [t.date, t.desc.replace(/,/g,' '), t.category, t.type, t.amount]);
    return [header, ...rows].map(r => r.join(',')).join('\n');
  }

  return {
    CATEGORIES,
    getTransactions,
    saveTransactions,
    addTransaction,
    deleteTransaction,
    resetToSeed,
    computeTotals,
    computeCategoryTotals,
    computeMonthlyTotals,
    filterByRange,
    formatCurrency,
    formatDate,
    formatDateShort,
    categoryMeta,
    toCSV,
    generateId,
    isPersistent: () => localStorageAvailable
  };
})();
