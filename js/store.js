/* ذخیره‌سازی محلی داده‌ها — ساختار آماده برای همگام‌سازی ابری در آینده */
(function (global) {
  'use strict';

  var KEY = 'hesab-man:data:v1';
  var listeners = [];

  var EMOJI_PALETTE = [
    '🍔', '☕', '🛒', '🚌', '🚗', '⛽', '🏠', '💡', '📱', '🧾',
    '💊', '🏥', '🎬', '🎮', '✈️', '🏋️', '📚', '🎓', '👕', '💇',
    '🎁', '🐾', '🧑‍💻', '💼', '💰', '🏦', '📈', '🏷️', '🔧', '📦'
  ];

  var COLOR_PALETTE = [
    '#f2685f', '#f2a45f', '#e0c04b', '#6fbf73', '#46c98b', '#4bb6c9',
    '#6f8ff2', '#a877e0', '#e07ab0', '#8fa3b5'
  ];

  function uid() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function defaults() {
    return {
      version: 1,
      settings: { currency: 'تومان', digits: 'en' },
      categories: [
        { id: 'e-food', name: 'خوراک', emoji: '🍔', color: '#f2685f', type: 'expense' },
        { id: 'e-transport', name: 'حمل‌ونقل', emoji: '🚌', color: '#4bb6c9', type: 'expense' },
        { id: 'e-home', name: 'خانه', emoji: '🏠', color: '#f2a45f', type: 'expense' },
        { id: 'e-shopping', name: 'خرید', emoji: '🛍️', color: '#e07ab0', type: 'expense' },
        { id: 'e-health', name: 'سلامت', emoji: '💊', color: '#6fbf73', type: 'expense' },
        { id: 'e-fun', name: 'تفریح', emoji: '🎬', color: '#a877e0', type: 'expense' },
        { id: 'e-bills', name: 'قبوض', emoji: '🧾', color: '#e0c04b', type: 'expense' },
        { id: 'e-education', name: 'آموزش', emoji: '📚', color: '#6f8ff2', type: 'expense' },
        { id: 'e-other', name: 'سایر هزینه‌ها', emoji: '📦', color: '#8fa3b5', type: 'expense' },
        { id: 'i-salary', name: 'حقوق', emoji: '💼', color: '#46c98b', type: 'income' },
        { id: 'i-project', name: 'پروژه', emoji: '🧑‍💻', color: '#4bb6c9', type: 'income' },
        { id: 'i-sale', name: 'فروش', emoji: '🏷️', color: '#e0c04b', type: 'income' },
        { id: 'i-gift', name: 'هدیه', emoji: '🎁', color: '#e07ab0', type: 'income' },
        { id: 'i-bank', name: 'سود بانکی', emoji: '🏦', color: '#6f8ff2', type: 'income' },
        { id: 'i-other', name: 'سایر درآمدها', emoji: '💰', color: '#8fa3b5', type: 'income' }
      ],
      transactions: []
    };
  }

  var state = null;

  function normalize(raw) {
    var base = defaults();
    if (!raw || typeof raw !== 'object') return base;

    var out = {
      version: 1,
      settings: Object.assign({}, base.settings, raw.settings || {}),
      categories: Array.isArray(raw.categories) && raw.categories.length ? raw.categories : base.categories,
      transactions: Array.isArray(raw.transactions) ? raw.transactions : []
    };

    out.categories = out.categories
      .filter(function (c) { return c && c.name; })
      .map(function (c, i) {
        return {
          id: c.id || ('cat-' + i + '-' + uid()),
          name: String(c.name),
          emoji: c.emoji || '📦',
          color: c.color || COLOR_PALETTE[i % COLOR_PALETTE.length],
          type: c.type === 'income' ? 'income' : 'expense'
        };
      });

    out.transactions = out.transactions
      .filter(function (t) {
        return t && t.date && (t.type === 'income' || t.type === 'expense');
      })
      .map(function (t) {
        return {
          id: t.id || uid(),
          type: t.type === 'income' ? 'income' : 'expense',
          amount: Math.abs(Number(t.amount) || 0),
          categoryId: t.categoryId || (t.type === 'income' ? 'i-other' : 'e-other'),
          date: String(t.date).slice(0, 10),
          note: t.note ? String(t.note) : '',
          createdAt: t.createdAt || Date.now(),
          updatedAt: t.updatedAt || t.createdAt || Date.now()
        };
      });

    return out;
  }

  function save() {
    try {
      global.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('ذخیره‌سازی ناموفق بود', err);
    }
  }

  function emit() {
    listeners.forEach(function (fn) { try { fn(state); } catch (e) { console.error(e); } });
  }

  function commit() {
    save();
    emit();
  }

  function load() {
    var raw = null;
    try {
      raw = JSON.parse(global.localStorage.getItem(KEY) || 'null');
    } catch (err) {
      raw = null;
    }
    state = normalize(raw);
    save();
    return state;
  }

  function get() {
    if (!state) load();
    return state;
  }

  function subscribe(fn) {
    listeners.push(fn);
    return function () {
      listeners = listeners.filter(function (f) { return f !== fn; });
    };
  }

  /* ---------- دسته‌بندی‌ها ---------- */
  function categories(type) {
    var list = get().categories;
    if (!type) return list.slice();
    return list.filter(function (c) { return c.type === type; });
  }

  function category(id) {
    return get().categories.filter(function (c) { return c.id === id; })[0] || null;
  }

  function addCategory(data) {
    var cat = {
      id: 'cat-' + uid(),
      name: String(data.name || '').trim() || 'دسته جدید',
      emoji: data.emoji || '📦',
      color: data.color || COLOR_PALETTE[3],
      type: data.type === 'income' ? 'income' : 'expense'
    };
    get().categories.push(cat);
    commit();
    return cat;
  }

  function updateCategory(id, patch) {
    var cat = category(id);
    if (!cat) return null;
    if (patch.name != null) cat.name = String(patch.name).trim() || cat.name;
    if (patch.emoji) cat.emoji = patch.emoji;
    if (patch.color) cat.color = patch.color;
    commit();
    return cat;
  }

  function countTransactions(categoryId) {
    return get().transactions.filter(function (t) { return t.categoryId === categoryId; }).length;
  }

  function deleteCategory(id) {
    var data = get();
    var used = countTransactions(id);
    var fallback = data.categories.filter(function (c) {
      return c.type === (category(id) || {}).type && c.id !== id;
    })[0];

    data.categories = data.categories.filter(function (c) { return c.id !== id; });
    if (used && fallback) {
      data.transactions.forEach(function (t) {
        if (t.categoryId === id) t.categoryId = fallback.id;
      });
    }
    commit();
    return { moved: used && fallback ? used : 0, fallback: fallback || null };
  }

  /* ---------- تراکنش‌ها ---------- */
  function addTransaction(data) {
    var tx = {
      id: uid(),
      type: data.type === 'income' ? 'income' : 'expense',
      amount: Math.abs(Number(data.amount) || 0),
      categoryId: data.categoryId,
      date: String(data.date || '').slice(0, 10),
      note: data.note ? String(data.note).trim() : '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    get().transactions.push(tx);
    commit();
    return tx;
  }

  function updateTransaction(id, patch) {
    var tx = get().transactions.filter(function (t) { return t.id === id; })[0];
    if (!tx) return null;
    if (patch.type) tx.type = patch.type === 'income' ? 'income' : 'expense';
    if (patch.amount != null) tx.amount = Math.abs(Number(patch.amount) || 0);
    if (patch.categoryId) tx.categoryId = patch.categoryId;
    if (patch.date) tx.date = String(patch.date).slice(0, 10);
    if (patch.note != null) tx.note = String(patch.note).trim();
    tx.updatedAt = Date.now();
    commit();
    return tx;
  }

  function deleteTransaction(id) {
    var before = get().transactions.length;
    get().transactions = get().transactions.filter(function (t) { return t.id !== id; });
    if (get().transactions.length !== before) { commit(); return true; }
    return false;
  }

  function transaction(id) {
    return get().transactions.filter(function (t) { return t.id === id; })[0] || null;
  }

  function transactions(filter) {
    filter = filter || {};
    var out = get().transactions.slice();

    if (filter.type) out = out.filter(function (t) { return t.type === filter.type; });
    if (filter.monthKey) out = out.filter(function (t) { return Jalali.monthKeyOf(t.date) === filter.monthKey; });

    if (filter.search) {
      var q = String(filter.search).trim().toLowerCase();
      out = out.filter(function (t) {
        var cat = category(t.categoryId);
        return (t.note || '').toLowerCase().indexOf(q) !== -1 ||
          (cat ? cat.name.toLowerCase().indexOf(q) !== -1 : false);
      });
    }

    out.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return out;
  }

  /* ---------- آمار ---------- */
  function sumType(list, type) {
    return list.reduce(function (acc, t) {
      return t.type === type ? acc + (Number(t.amount) || 0) : acc;
    }, 0);
  }

  function summary(monthKey) {
    var list = monthKey ? transactions({ monthKey: monthKey }) : get().transactions;
    var income = sumType(list, 'income');
    var expense = sumType(list, 'expense');
    return { income: income, expense: expense, net: income - expense, count: list.length };
  }

  function totals() {
    return summary(null);
  }

  function byCategory(monthKey, type) {
    var list = transactions({ monthKey: monthKey, type: type });
    var total = sumType(list, type);
    var map = {};

    list.forEach(function (t) {
      map[t.categoryId] = (map[t.categoryId] || 0) + (Number(t.amount) || 0);
    });

    return Object.keys(map).map(function (id) {
      var cat = category(id) || { name: 'بدون دسته', emoji: '❔', color: '#8fa3b5', id: id };
      return {
        id: id,
        name: cat.name,
        emoji: cat.emoji,
        color: cat.color,
        amount: map[id],
        share: total ? map[id] / total : 0
      };
    }).sort(function (a, b) { return b.amount - a.amount; });
  }

  function monthlySeries(count) {
    return Jalali.lastMonths(count).map(function (m) {
      var s = summary(m.jy + '-' + FaNum.pad2(m.jm));
      return { jy: m.jy, jm: m.jm, label: Jalali.monthName(m.jm), income: s.income, expense: s.expense, net: s.net };
    });
  }

  /* ---------- ورود / خروج داده ---------- */
  function setCurrency(value) {
    get().settings.currency = String(value || '').trim() || 'تومان';
    commit();
  }

  function setDigits(mode) {
    get().settings.digits = mode === 'fa' ? 'fa' : 'en';
    commit();
  }

  function exportText() {
    return JSON.stringify({
      app: 'hesab-man',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: get().settings,
      categories: get().categories,
      transactions: get().transactions
    }, null, 2);
  }

  function importText(text) {
    var raw = JSON.parse(text);
    var incoming = normalize(raw);
    if (!Array.isArray(raw.transactions) && !Array.isArray(raw.categories)) {
      throw new Error('ساختار فایل معتبر نیست');
    }
    get().categories = incoming.categories;
    get().transactions = incoming.transactions;
    get().settings = incoming.settings;
    commit();
    return { categories: incoming.categories.length, transactions: incoming.transactions.length };
  }

  function clearAll() {
    state = defaults();
    commit();
  }

  /* ---------- مهاجرت به ابر (آماده برای آینده) ---------- */
  function snapshot() {
    return JSON.parse(JSON.stringify(get()));
  }

  function replaceAll(next) {
    state = normalize(next);
    commit();
  }

  global.Store = {
    KEY: KEY,
    load: load,
    get: get,
    subscribe: subscribe,
    emojiPalette: EMOJI_PALETTE,
    colorPalette: COLOR_PALETTE,
    categories: categories,
    category: category,
    addCategory: addCategory,
    updateCategory: updateCategory,
    deleteCategory: deleteCategory,
    countTransactions: countTransactions,
    addTransaction: addTransaction,
    updateTransaction: updateTransaction,
    deleteTransaction: deleteTransaction,
    transaction: transaction,
    transactions: transactions,
    summary: summary,
    totals: totals,
    byCategory: byCategory,
    monthlySeries: monthlySeries,
    setCurrency: setCurrency,
    setDigits: setDigits,
    exportText: exportText,
    importText: importText,
    clearAll: clearAll,
    snapshot: snapshot,
    replaceAll: replaceAll
  };
})(window);
