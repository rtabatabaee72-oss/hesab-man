/* حساب من — برنامه حسابداری شخصی (PWA آفلاین) */
(function () {
  'use strict';

  var view = document.getElementById('view');
  var appbar = document.getElementById('appbar');
  var tabbar = document.getElementById('tabbar');
  var sheet = document.getElementById('sheet');
  var scrim = document.getElementById('scrim');
  var toastEl = document.getElementById('toast');

  var TAB_META = {
    home: { title: 'حساب من', sub: 'دفتر خرج و درآمد' },
    list: { title: 'تراکنش‌ها', sub: 'همهٔ ثبت‌ها' },
    report: { title: 'گزارش', sub: 'تحلیل ماهانه' },
    settings: { title: 'تنظیمات', sub: 'دسته‌بندی، پشتیبان، اطلاعات' }
  };

  var ICONS = {
    home: '<path d="M4 10.5 12 4l8 6.5"/><path d="M6 9.6V20h12V9.6"/><path d="M10 20v-5h4v5"/>',
    list: '<path d="M8 6h12"/><path d="M8 12h12"/><path d="M8 18h12"/><path d="M4 6h.01"/><path d="M4 12h.01"/><path d="M4 18h.01"/>',
    report: '<path d="M12 3v18"/><path d="M7 8v10"/><path d="M17 5v13"/><path d="M3 21h18"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 15H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9 3h.1A2 2 0 0 1 13 3v.1A1.6 1.6 0 0 0 16 4.6a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 21 9v.1a2 2 0 0 1 0 4H21a1.6 1.6 0 0 0-1.6 1.9z"/>'
  };

  var TABS = [
    { id: 'home', label: 'خانه', icon: 'home' },
    { id: 'list', label: 'تراکنش‌ها', icon: 'list' },
    { id: 'report', label: 'گزارش', icon: 'report' },
    { id: 'settings', label: 'تنظیمات', icon: 'settings' }
  ];

  var state = {
    tab: 'home',
    month: null,
    filter: 'all',
    search: ''
  };

  var draft = null;
  var confirmHandler = null;

  /* ---------------- ابزارها ---------------- */

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function currency() { return Store.get().settings.currency; }

  function money(value) { return FaNum.money(value); }

  function todayMonth() {
    var j = Jalali.toJalali(Jalali.todayISO());
    return { jy: j.jy, jm: j.jm };
  }

  function monthKey(m) { return m.jy + '-' + FaNum.pad2(m.jm); }

  function shiftMonth(delta) {
    var m = state.month;
    var jm = m.jm + delta, jy = m.jy;
    while (jm > 12) { jm -= 12; jy += 1; }
    while (jm < 1) { jm += 12; jy -= 1; }
    state.month = { jy: jy, jm: jm };
    render();
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove('show'); }, 2100);
  }

  function emptyState(big, text) {
    return '<div class="empty"><div class="big">' + big + '</div><p>' + esc(text) + '</p></div>';
  }

  function txRow(t) {
    var cat = Store.category(t.categoryId) || { name: 'بدون دسته', emoji: '❔' };
    var sign = t.type === 'income' ? '+' : '−';
    var cls = t.type === 'income' ? 'in-text' : 'ex-text';
    return '' +
      '<button class="row" data-action="edit-tx" data-id="' + t.id + '">' +
        '<span class="emoji">' + esc(cat.emoji) + '</span>' +
        '<span class="meta">' +
          '<span class="t">' + esc(cat.name) + '</span>' +
          (t.note ? '<span class="n">' + esc(t.note) + '</span>' : '<span class="n">' + Jalali.shortDate(t.date) + '</span>') +
        '</span>' +
        '<span class="amt ' + cls + '">' + sign + ' ' + money(t.amount) + '</span>' +
      '</button>';
  }

  function monthNav() {
    return '' +
      '<div class="month-nav">' +
        '<button class="icon-btn" data-action="month-next" aria-label="ماه بعد">‹</button>' +
        '<span class="m">' + esc(Jalali.monthLabel(state.month.jy, state.month.jm)) + '</span>' +
        '<button class="icon-btn" data-action="month-prev" aria-label="ماه قبل">›</button>' +
      '</div>';
  }

  /* ---------------- نماها ---------------- */

  function renderHome() {
    var totals = Store.totals();
    var m = todayMonth();
    var month = Store.summary(monthKey(m));
    var series = Store.monthlySeries(6);
    var recent = Store.transactions({}).slice(0, 6);

    var maxVal = 1;
    series.forEach(function (s) { maxVal = Math.max(maxVal, s.income, s.expense); });
    var maxPx = 86;

    var chart = series.map(function (s, i) {
      var isLast = i === series.length - 1;
      return '' +
        '<div class="col' + (isLast ? ' is-current' : '') + '">' +
          '<div class="bars">' +
            '<span class="bar income" style="height:' + Math.max(3, Math.round(s.income / maxVal * maxPx)) + 'px"></span>' +
            '<span class="bar expense" style="height:' + Math.max(3, Math.round(s.expense / maxVal * maxPx)) + 'px"></span>' +
          '</div>' +
          '<span class="cap">' + esc(s.label) + '</span>' +
        '</div>';
    }).join('');

    var html = '' +
      '<div class="hero">' +
        '<div class="label">موجودی کل</div>' +
        '<div class="amount">' + money(totals.net) + '<span class="unit">' + esc(currency()) + '</span></div>' +
        '<div class="hero-split">' +
          '<div class="box"><div class="k"><i class="dot in"></i> کل درآمد</div><div class="v in-text">' + money(totals.income) + '</div></div>' +
          '<div class="box"><div class="k"><i class="dot ex"></i> کل هزینه</div><div class="v ex-text">' + money(totals.expense) + '</div></div>' +
        '</div>' +
      '</div>' +

      '<div class="section-title">این ماه — ' + esc(Jalali.monthLabel(m.jy, m.jm)) + '</div>' +
      '<div class="stat-grid">' +
        '<div class="stat"><div class="k">درآمد</div><div class="v in-text">' + money(month.income) + '</div></div>' +
        '<div class="stat"><div class="k">هزینه</div><div class="v ex-text">' + money(month.expense) + '</div></div>' +
        '<div class="stat"><div class="k">مانده</div><div class="v">' + money(month.net) + '</div></div>' +
      '</div>' +

      '<div class="section-title">روند ۶ ماه گذشته</div>' +
      '<div class="card">' +
        '<div class="chart">' + chart + '</div>' +
        '<div class="legend">' +
          '<span><i class="dot in"></i> درآمد</span>' +
          '<span><i class="dot ex"></i> هزینه</span>' +
        '</div>' +
      '</div>' +

      '<div class="section-title">آخرین تراکنش‌ها</div>' +
      (recent.length
        ? '<div class="list">' + recent.map(txRow).join('') + '</div>'
        : emptyState('🧾', 'هنوز تراکنشی ثبت نشده. با دکمهٔ + شروع کن.'));

    return html;
  }

  function filteredTransactions() {
    return Store.transactions({
      monthKey: monthKey(state.month),
      type: state.filter === 'all' ? null : state.filter,
      search: state.search
    });
  }

  function listBody() {
    var list = filteredTransactions();

    if (!list.length) {
      return emptyState('🔍', state.search ? 'چیزی پیدا نشد.' : 'در این ماه تراکنشی ثبت نشده.');
    }

    var groups = [];
    var byDate = {};
    list.forEach(function (t) {
      if (!byDate[t.date]) { byDate[t.date] = []; groups.push(t.date); }
      byDate[t.date].push(t);
    });

    return '<div class="list">' + groups.map(function (date) {
      var items = byDate[date];
      var net = items.reduce(function (a, t) {
        return a + (t.type === 'income' ? t.amount : -t.amount);
      }, 0);
      var cls = net >= 0 ? 'in-text' : 'ex-text';
      return '' +
        '<div class="day-group">' +
          '<div class="day-head">' +
            '<span>' + esc(Jalali.dayLabel(date)) + ' · ' + esc(Jalali.weekdayName(date)) + '</span>' +
            '<span class="total ' + cls + '">' + money(net) + '</span>' +
          '</div>' +
          items.map(txRow).join('') +
        '</div>';
    }).join('') + '</div>';
  }

  function renderList() {
    return '' +
      '<div class="toolbar">' + monthNav() + '</div>' +
      '<input class="search" id="search" type="search" placeholder="جست‌وجو در یادداشت یا دسته…" value="' + esc(state.search) + '">' +
      '<div class="chips">' +
        '<button class="chip' + (state.filter === 'all' ? ' active' : '') + '" data-action="filter" data-filter="all">همه</button>' +
        '<button class="chip in-cat' + (state.filter === 'income' ? ' active' : '') + '" data-action="filter" data-filter="income">درآمد</button>' +
        '<button class="chip ex-cat' + (state.filter === 'expense' ? ' active' : '') + '" data-action="filter" data-filter="expense">هزینه</button>' +
      '</div>' +
      '<div id="list-wrap">' + listBody() + '</div>';
  }

  function renderReport() {
    var key = monthKey(state.month);
    var s = Store.summary(key);
    var expenses = Store.byCategory(key, 'expense');
    var incomes = Store.byCategory(key, 'income');

    function breakdown(rows, color) {
      if (!rows.length) return emptyState('📊', 'داده‌ای برای این ماه نیست.');
      return rows.map(function (r) {
        return '' +
          '<div class="brk">' +
            '<div class="brk-top">' +
              '<span>' + esc(r.emoji) + '</span>' +
              '<span class="name">' + esc(r.name) + '</span>' +
              '<span class="val ' + (color === 'in' ? 'in-text' : 'ex-text') + '">' + money(r.amount) + '</span>' +
              '<span class="pct">' + FaNum.plain(Math.round(r.share * 100)) + '٪</span>' +
            '</div>' +
            '<div class="track"><i style="width:' + Math.max(2, Math.round(r.share * 100)) + '%;background:' + esc(r.color) + '"></i></div>' +
          '</div>';
      }).join('');
    }

    return '' +
      '<div class="toolbar">' + monthNav() + '</div>' +
      '<div class="stat-grid">' +
        '<div class="stat"><div class="k">درآمد</div><div class="v in-text">' + money(s.income) + '</div></div>' +
        '<div class="stat"><div class="k">هزینه</div><div class="v ex-text">' + money(s.expense) + '</div></div>' +
        '<div class="stat"><div class="k">مانده</div><div class="v">' + money(s.net) + '</div></div>' +
      '</div>' +
      '<div class="section-title">هزینه‌ها به تفکیک دسته</div>' +
      '<div class="card">' + breakdown(expenses, 'ex') + '</div>' +
      '<div class="section-title">درآمدها به تفکیک دسته</div>' +
      '<div class="card">' + breakdown(incomes, 'in') + '</div>';
  }

  function renderSettings() {
    var data = Store.get();
    return '' +
      '<button class="srow" data-action="set-currency">' +
        '<span class="s-ico">💱</span>' +
        '<span class="s-body"><span class="s-t">واحد پول</span><span class="s-d">' + esc(data.settings.currency) + '</span></span>' +
        '<span class="s-x">‹</span>' +
      '</button>' +
      '<button class="srow" data-action="set-digits">' +
        '<span class="s-ico">🔢</span>' +
        '<span class="s-body"><span class="s-t">نمایش اعداد</span><span class="s-d">' + (data.settings.digits === 'fa' ? 'فارسی (۱۲۳)' : 'انگلیسی (123)') + '</span></span>' +
        '<span class="s-x">‹</span>' +
      '</button>' +
      '<button class="srow" data-action="manage-categories">' +
        '<span class="s-ico">🏷️</span>' +
        '<span class="s-body"><span class="s-t">دسته‌بندی‌ها</span><span class="s-d">' + FaNum.plain(data.categories.length) + ' دسته</span></span>' +
        '<span class="s-x">‹</span>' +
      '</button>' +
      '<button class="srow" data-action="export">' +
        '<span class="s-ico">⬇️</span>' +
        '<span class="s-body"><span class="s-t">پشتیبان‌گیری (فایل JSON)</span><span class="s-d">ذخیرهٔ همهٔ داده‌ها روی گوشی</span></span>' +
        '<span class="s-x">‹</span>' +
      '</button>' +
      '<button class="srow" data-action="import">' +
        '<span class="s-ico">⬆️</span>' +
        '<span class="s-body"><span class="s-t">بازیابی از فایل</span><span class="s-d">بازگرداندن پشتیبان قبلی</span></span>' +
        '<span class="s-x">‹</span>' +
      '</button>' +
      '<button class="srow" data-action="install-tips">' +
        '<span class="s-ico">📲</span>' +
        '<span class="s-body"><span class="s-t">نصب روی آیفون</span><span class="s-d">افزودن به صفحهٔ خانه</span></span>' +
        '<span class="s-x">‹</span>' +
      '</button>' +
      '<div class="danger-zone">' +
        '<button class="srow" data-action="clear-all">' +
          '<span class="s-ico">🗑️</span>' +
          '<span class="s-body"><span class="s-t">پاک کردن همهٔ داده‌ها</span><span class="s-d">حذف کامل تراکنش‌ها و دسته‌ها</span></span>' +
          '<span class="s-x">‹</span>' +
        '</button>' +
      '</div>' +
      '<div class="section-title">درباره</div>' +
      '<div class="hint">' +
        '<b>حساب من</b> نسخهٔ ۱.۰ — دفتر خرج و درآمد شخصی.<br>' +
        'همهٔ داده‌ها فقط روی همین دستگاه ذخیره می‌شود و هیچ اطلاعاتی جایی ارسال نمی‌شود. ' +
        'ساختار داده برای افزودن همگام‌سازی ابری در نسخه‌های بعدی آماده است.' +
      '</div>';
  }

  /* ---------------- رندر ---------------- */

  function render() {
    FaNum.setDigitMode(Store.get().settings.digits);
    var meta = TAB_META[state.tab];
    appbar.innerHTML = '<h1>' + esc(meta.title) + '<span class="sub">' + esc(meta.sub) + '</span></h1>';

    if (state.tab === 'home') view.innerHTML = renderHome();
    else if (state.tab === 'list') view.innerHTML = renderList();
    else if (state.tab === 'report') view.innerHTML = renderReport();
    else view.innerHTML = renderSettings();

    tabbar.innerHTML = TABS.slice(0, 2).map(tabBtn).join('') +
      '<span class="tab spacer"></span>' +
      TABS.slice(2).map(tabBtn).join('');

    var search = document.getElementById('search');
    if (search) {
      search.addEventListener('input', function () {
        state.search = search.value;
        var wrap = document.getElementById('list-wrap');
        if (wrap) wrap.innerHTML = listBody();
      });
    }
  }

  function tabBtn(t) {
    return '' +
      '<button class="tab' + (state.tab === t.id ? ' active' : '') + '" data-action="tab" data-tab="' + t.id + '">' +
        '<svg viewBox="0 0 24 24">' + ICONS[t.icon] + '</svg>' +
        '<span>' + esc(t.label) + '</span>' +
      '</button>';
  }

  /* ---------------- شیت ---------------- */

  function openSheet(html) {
    delete sheet.dataset.catId;
    delete sheet.dataset.catType;
    delete sheet.dataset.emoji;
    delete sheet.dataset.color;
    sheet.innerHTML = '<div class="sheet-grip"></div>' + html;
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    scrim.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeSheet() {
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    scrim.hidden = true;
    document.body.style.overflow = '';
    confirmHandler = null;
    draft = null;
  }

  function closeAndRender() {
    closeSheet();
    render();
  }

  /* ---------- شیت تراکنش ---------- */

  function dateSelects(iso) {
    var j = Jalali.toJalali(iso);
    var years = [];
    var base = Jalali.toJalali(Jalali.todayISO()).jy;
    for (var y = base + 1; y >= base - 6; y--) years.push(y);

    var yearOpts = years.map(function (y) {
      return '<option value="' + y + '"' + (y === j.jy ? ' selected' : '') + '>' + FaNum.plain(y) + '</option>';
    }).join('');

    var monthOpts = Jalali.months.map(function (name, i) {
      var m = i + 1;
      return '<option value="' + m + '"' + (m === j.jm ? ' selected' : '') + '>' + esc(name) + '</option>';
    }).join('');

    var dayOpts = '';
    var len = Jalali.monthLength(j.jy, j.jm);
    for (var d = 1; d <= len; d++) {
      dayOpts += '<option value="' + d + '"' + (d === j.jd ? ' selected' : '') + '>' + FaNum.plain(d) + '</option>';
    }

    return '' +
      '<div class="picker">' +
        '<select id="sel-year">' + yearOpts + '</select>' +
        '<select id="sel-month">' + monthOpts + '</select>' +
        '<select id="sel-day">' + dayOpts + '</select>' +
      '</div>' +
      '<div class="chips" style="margin-top:8px">' +
        '<button class="chip" data-action="date-today">امروز</button>' +
        '<button class="chip" data-action="date-yesterday">دیروز</button>' +
      '</div>';
  }

  function catChips(type, selectedId) {
    var list = Store.categories(type);
    if (!list.length) {
      return '<span class="s-d">برای این نوع، دسته‌ای نداری. از تنظیمات ↦ دسته‌بندی‌ها یکی بساز.</span>';
    }
    return list.map(function (c) {
      return '<button class="pick' + (c.id === selectedId ? ' active' : '') + '" data-action="pick-cat" data-id="' + c.id + '" data-type="' + type + '">' +
        '<span>' + esc(c.emoji) + '</span>' + esc(c.name) +
      '</button>';
    }).join('');
  }

  function renderTxSheet() {
    var isEdit = !!draft.id;
    openSheet('' +
      '<h2>' + (isEdit ? 'ویرایش تراکنش' : 'تراکنش جدید') + '</h2>' +
      '<div class="field">' +
        '<div class="seg">' +
          '<button data-action="tx-type" data-type="expense" class="' + (draft.type === 'expense' ? 'on' : '') + '">هزینه</button>' +
          '<button data-action="tx-type" data-type="income" class="' + (draft.type === 'income' ? 'on' : '') + '">درآمد</button>' +
        '</div>' +
      '</div>' +
      '<div class="field">' +
        '<label>مبلغ</label>' +
        '<div class="amount-input">' +
          '<input id="amount" type="tel" inputmode="numeric" autocomplete="off" placeholder="۰" value="' + (draft.amount ? esc(String(draft.amount)) : '') + '">' +
          '<span class="cur">' + esc(currency()) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="field">' +
        '<label>دسته‌بندی</label>' +
        '<div class="pick-chips">' + catChips(draft.type, draft.categoryId) + '</div>' +
      '</div>' +
      '<div class="field">' +
        '<label>تاریخ</label>' +
        dateSelects(draft.date) +
      '</div>' +
      '<div class="field">' +
        '<label>یادداشت (اختیاری)</label>' +
        '<input class="inp" id="note" type="text" maxlength="80" placeholder="مثلاً ناهار با همکاران" value="' + esc(draft.note) + '">' +
      '</div>' +
      '<div class="actions">' +
        (isEdit ? '<button class="btn danger" data-action="delete-tx">حذف</button>' : '') +
        '<button class="btn ghost" data-action="close">انصراف</button>' +
        '<button class="btn primary" data-action="save-tx">' + (isEdit ? 'ذخیره' : 'ثبت') + '</button>' +
      '</div>');

    var amount = document.getElementById('amount');
    if (!isEdit) { setTimeout(function () { amount.focus(); }, 320); }

    /* هر عددی که تایپ شود — فارسی یا انگلیسی — بلافاصله به شکل حالت انتخابی درمی‌آید */
    amount.addEventListener('input', function () {
      var cleaned = FaNum.toEn(amount.value).replace(/[^\d.]/g, '');
      var parts = cleaned.split('.');
      if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('');

      var shown = FaNum.digitMode() === 'fa' ? FaNum.toFa(cleaned) : cleaned;
      if (amount.value !== shown) {
        var atEnd = amount.selectionStart === amount.value.length;
        amount.value = shown;
        if (atEnd) { var len = shown.length; amount.setSelectionRange(len, len); }
      }
    });

    var selYear = document.getElementById('sel-year');
    var selMonth = document.getElementById('sel-month');
    var selDay = document.getElementById('sel-day');

    function rebuildDays() {
      var jy = +selYear.value, jm = +selMonth.value;
      var len = Jalali.monthLength(jy, jm);
      var current = +selDay.value;
      var html = '';
      for (var d = 1; d <= len; d++) {
        html += '<option value="' + d + '"' + (d === Math.min(current, len) ? ' selected' : '') + '>' + FaNum.plain(d) + '</option>';
      }
      selDay.innerHTML = html;
    }

    selYear.addEventListener('change', rebuildDays);
    selMonth.addEventListener('change', rebuildDays);
  }

  function openTxSheet(tx) {
    draft = tx && tx.id
      ? { id: tx.id, type: tx.type, amount: tx.amount, categoryId: tx.categoryId, date: tx.date, note: tx.note || '' }
      : { id: null, type: 'expense', amount: '', categoryId: firstCategoryId('expense'), date: Jalali.todayISO(), note: '' };
    renderTxSheet();
  }

  function firstCategoryId(type) {
    var list = Store.categories(type);
    return list.length ? list[0].id : null;
  }

  function syncDraftFromInputs() {
    var amount = document.getElementById('amount');
    var note = document.getElementById('note');
    var selYear = document.getElementById('sel-year');
    var selMonth = document.getElementById('sel-month');
    var selDay = document.getElementById('sel-day');
    if (amount) draft.amount = FaNum.toEn(amount.value).replace(/[^\d.]/g, '');
    if (note) draft.note = note.value;
    if (selYear && selMonth && selDay) {
      draft.date = Jalali.jalaliToISO(+selYear.value, +selMonth.value, +selDay.value);
    }
  }

  function saveDraft() {
    syncDraftFromInputs();
    var amount = Number(draft.amount);
    if (!amount || amount <= 0) {
      toast('مبلغ را وارد کن');
      return;
    }
    if (!draft.categoryId) {
      draft.categoryId = firstCategoryId(draft.type);
    }
    if (!draft.categoryId) {
      draft.categoryId = Store.addCategory({
        name: draft.type === 'income' ? 'سایر درآمدها' : 'سایر هزینه‌ها',
        emoji: draft.type === 'income' ? '💰' : '📦',
        color: '#8fa3b5',
        type: draft.type
      }).id;
    }
    if (draft.id) {
      Store.updateTransaction(draft.id, draft);
      toast('تراکنش ویرایش شد');
    } else {
      Store.addTransaction(draft);
      toast('تراکنش ثبت شد');
    }
    closeAndRender();
  }

  /* ---------- شیت دسته‌بندی‌ها ---------- */

  function renderCategoryManager() {
    function section(type, title) {
      var rows = Store.categories(type).map(function (c) {
        var used = Store.countTransactions(c.id);
        return '' +
          '<button class="cat-manage" data-action="cat-edit" data-id="' + c.id + '">' +
            '<span class="e">' + esc(c.emoji) + '</span>' +
            '<span class="nm">' + esc(c.name) + '</span>' +
            (used ? '<span class="tag">' + FaNum.plain(used) + ' مورد</span>' : '') +
            '<span class="s-x">‹</span>' +
          '</button>';
      }).join('');

      return '<div class="section-title">' + esc(title) + '</div>' + rows +
        '<button class="btn ghost" data-action="cat-add" data-type="' + type + '" style="margin-bottom:6px">+ افزودن دسته</button>';
    }

    openSheet('' +
      '<h2>دسته‌بندی‌ها</h2>' +
      section('expense', 'هزینه‌ها') +
      section('income', 'درآمدها') +
      '<div class="actions"><button class="btn ghost" data-action="close">بستن</button></div>');
  }

  function renderCategoryEditor(cat, type) {
    var isEdit = !!cat;
    var emoji = cat ? cat.emoji : '📦';
    var color = cat ? cat.color : Store.colorPalette[3];
    var name = cat ? cat.name : '';

    openSheet('' +
      '<h2>' + (isEdit ? 'ویرایش دسته' : 'دستهٔ جدید') + '</h2>' +
      '<div class="field">' +
        '<label>نام دسته</label>' +
        '<input class="inp" id="cat-name" type="text" maxlength="24" placeholder="مثلاً باشگاه" value="' + esc(name) + '">' +
      '</div>' +
      '<div class="field">' +
        '<label>آیکن</label>' +
        '<div class="emoji-grid">' + Store.emojiPalette.map(function (e) {
          return '<button data-action="pick-emoji" data-emoji="' + esc(e) + '" class="' + (e === emoji ? 'active' : '') + '">' + esc(e) + '</button>';
        }).join('') + '</div>' +
      '</div>' +
      '<div class="field">' +
        '<label>رنگ</label>' +
        '<div class="swatches">' + Store.colorPalette.map(function (c) {
          return '<button class="swatch' + (c === color ? ' active' : '') + '" data-action="pick-color" data-color="' + esc(c) + '" style="background:' + esc(c) + '"></button>';
        }).join('') + '</div>' +
      '</div>' +
      '<div class="actions">' +
        (isEdit ? '<button class="btn danger" data-action="cat-delete">حذف</button>' : '') +
        '<button class="btn ghost" data-action="manage-categories">بازگشت</button>' +
        '<button class="btn primary" data-action="cat-save">' + (isEdit ? 'ذخیره' : 'افزودن') + '</button>' +
      '</div>');

    sheet.dataset.catId = cat ? cat.id : '';
    sheet.dataset.catType = type || (cat ? cat.type : 'expense');
    sheet.dataset.emoji = emoji;
    sheet.dataset.color = color;

    var nameInput = document.getElementById('cat-name');
    if (!isEdit) { setTimeout(function () { nameInput.focus(); }, 320); }
  }

  /* ---------- شیت تأیید و واحد پول ---------- */

  function openConfirm(opts) {
    confirmHandler = opts.onConfirm;
    openSheet('' +
      '<h2>' + esc(opts.title) + '</h2>' +
      '<div class="hint" style="margin-bottom:16px">' + esc(opts.message) + '</div>' +
      '<div class="actions">' +
        '<button class="btn ghost" data-action="close">انصراف</button>' +
        '<button class="btn danger" data-action="confirm">' + esc(opts.confirmLabel || 'تأیید') + '</button>' +
      '</div>');
  }

  function openCurrencySheet() {
    var options = ['تومان', 'ریال', 'دلار', 'یورو', 'درهم'];
    openSheet('' +
      '<h2>واحد پول</h2>' +
      '<div class="pick-chips">' + options.map(function (c) {
        return '<button class="pick' + (c === currency() ? ' active' : '') + '" data-action="pick-currency" data-value="' + esc(c) + '">' + esc(c) + '</button>';
      }).join('') + '</div>' +
      '<div class="field" style="margin-top:14px">' +
        '<label>یا بنویس</label>' +
        '<input class="inp" id="cur-input" type="text" maxlength="16" value="' + esc(currency()) + '">' +
      '</div>' +
      '<div class="actions">' +
        '<button class="btn ghost" data-action="close">انصراف</button>' +
        '<button class="btn primary" data-action="save-currency">ذخیره</button>' +
      '</div>');
  }

  function openDigitsSheet() {
    var fa = Store.get().settings.digits === 'fa';
    openSheet('' +
      '<h2>نمایش اعداد</h2>' +
      '<div class="hint" style="margin-bottom:14px">هر عددی که در برنامه وارد کنی — با کیبورد فارسی یا انگلیسی — خودکار به شکل انتخاب‌شده یکدست می‌شود.</div>' +
      '<div class="pick-chips">' +
        '<button class="pick' + (!fa ? ' active' : '') + '" data-action="pick-digits" data-value="en">انگلیسی — 123</button>' +
        '<button class="pick' + (fa ? ' active' : '') + '" data-action="pick-digits" data-value="fa">فارسی — ۱۲۳</button>' +
      '</div>' +
      '<div class="actions"><button class="btn ghost" data-action="close">بستن</button></div>');
  }

  function openInstallTips() {
    var standalone = window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    openSheet('' +
      '<h2>نصب روی آیفون</h2>' +
      '<div class="hint">' +
        (standalone
          ? 'برنامه از قبل روی صفحهٔ خانه نصب شده است. 🎉'
          : 'برای نصب روی آیفون:<br>۱) این صفحه را در <b>Safari</b> باز کن.<br>۲) دکمهٔ اشتراک‌گذاری (مربع با فلش رو به بالا) را بزن.<br>۳) گزینهٔ <b>Add to Home Screen</b> را انتخاب کن.<br>۴) نام «حساب من» را تأیید کن.<br><br>بعد از نصب، برنامه مثل یک اپ کامل و بدون اینترنت باز می‌شود.') +
      '</div>' +
      '<div class="actions"><button class="btn primary" data-action="close">فهمیدم</button></div>');
  }

  /* ---------- ورود/خروج فایل ---------- */

  var fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var res = Store.importText(String(reader.result));
        toast('بازیابی شد: ' + FaNum.plain(res.transactions) + ' تراکنش');
        render();
      } catch (err) {
        toast('فایل معتبر نبود');
      }
      fileInput.value = '';
    };
    reader.readAsText(file);
  });

  function exportBackup() {
    var blob = new Blob([Store.exportText()], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'hesab-man-backup-' + Jalali.todayISO() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('فایل پشتیبان ساخته شد');
  }

  /* ---------------- رویدادها ---------------- */

  document.addEventListener('click', function (ev) {
    var target = ev.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');

    switch (action) {
      case 'tab':
        state.tab = target.getAttribute('data-tab');
        window.scrollTo(0, 0);
        render();
        break;

      case 'month-prev': shiftMonth(-1); break;
      case 'month-next': shiftMonth(1); break;

      case 'filter':
        state.filter = target.getAttribute('data-filter');
        render();
        break;

      case 'edit-tx':
        openTxSheet(Store.transaction(target.getAttribute('data-id')));
        break;

      case 'tx-type':
        syncDraftFromInputs();
        if (draft.type !== target.getAttribute('data-type')) {
          draft.type = target.getAttribute('data-type');
          var first = Store.categories(draft.type)[0];
          if (!Store.category(draft.categoryId) || Store.category(draft.categoryId).type !== draft.type) {
            draft.categoryId = first ? first.id : null;
          }
        }
        renderTxSheet();
        break;

      case 'pick-cat':
        syncDraftFromInputs();
        draft.categoryId = target.getAttribute('data-id');
        renderTxSheet();
        break;

      case 'date-today':
        syncDraftFromInputs();
        draft.date = Jalali.todayISO();
        renderTxSheet();
        break;

      case 'date-yesterday':
        syncDraftFromInputs();
        var y = Jalali.fromISO(Jalali.todayISO());
        y.setDate(y.getDate() - 1);
        draft.date = Jalali.toISO(y);
        renderTxSheet();
        break;

      case 'save-tx': saveDraft(); break;

      case 'delete-tx':
        openConfirm({
          title: 'حذف تراکنش',
          message: 'این تراکنش برای همیشه حذف می‌شود. مطمئنی؟',
          confirmLabel: 'حذف کن',
          onConfirm: function () {
            Store.deleteTransaction(draft.id);
            toast('تراکنش حذف شد');
            closeAndRender();
          }
        });
        break;

      case 'manage-categories': renderCategoryManager(); break;
      case 'cat-add': renderCategoryEditor(null, target.getAttribute('data-type')); break;

      case 'cat-edit':
        renderCategoryEditor(Store.category(target.getAttribute('data-id')));
        break;

      case 'pick-emoji':
        var currentEmoji = sheet.querySelector('.emoji-grid .active');
        if (currentEmoji) currentEmoji.classList.remove('active');
        target.classList.add('active');
        sheet.dataset.emoji = target.getAttribute('data-emoji');
        break;

      case 'pick-color':
        var activeColor = sheet.querySelector('.swatch.active');
        if (activeColor) activeColor.classList.remove('active');
        target.classList.add('active');
        sheet.dataset.color = target.getAttribute('data-color');
        break;

      case 'cat-save':
        var editId = sheet.dataset.catId;
        var nameVal = (document.getElementById('cat-name') || {}).value || '';
        var emojiVal = sheet.dataset.emoji || null;
        var colorVal = sheet.dataset.color || null;
        var typeVal = sheet.dataset.catType || 'expense';

        if (!String(nameVal).trim()) { toast('نام دسته را بنویس'); break; }

        if (editId) {
          Store.updateCategory(editId, { name: nameVal, emoji: emojiVal, color: colorVal });
          toast('دسته ویرایش شد');
        } else {
          Store.addCategory({ name: nameVal, emoji: emojiVal || '📦', color: colorVal || Store.colorPalette[3], type: typeVal });
          toast('دسته اضافه شد');
        }
        renderCategoryManager();
        break;

      case 'cat-delete':
        var delId = sheet.dataset.catId;
        var delCat = Store.category(delId);
        openConfirm({
          title: 'حذف دسته',
          message: 'دستهٔ «' + (delCat ? delCat.name : '') + '» حذف شود؟ تراکنش‌های آن به دستهٔ دیگری منتقل می‌شوند.',
          confirmLabel: 'حذف کن',
          onConfirm: function () {
            Store.deleteCategory(delId);
            toast('دسته حذف شد');
            renderCategoryManager();
          }
        });
        break;

      case 'set-currency': openCurrencySheet(); break;
      case 'set-digits': openDigitsSheet(); break;

      case 'pick-digits':
        Store.setDigits(target.getAttribute('data-value'));
        toast('حالت اعداد ذخیره شد');
        closeAndRender();
        break;

      case 'pick-currency':
        Store.setCurrency(target.getAttribute('data-value'));
        toast('واحد پول ذخیره شد');
        closeAndRender();
        break;

      case 'save-currency':
        var curEl = document.getElementById('cur-input');
        Store.setCurrency(curEl ? curEl.value : 'تومان');
        toast('واحد پول ذخیره شد');
        closeAndRender();
        break;

      case 'export': exportBackup(); break;
      case 'import': fileInput.click(); break;
      case 'install-tips': openInstallTips(); break;

      case 'clear-all':
        openConfirm({
          title: 'پاک کردن همهٔ داده‌ها',
          message: 'همهٔ تراکنش‌ها و دسته‌بندی‌ها حذف می‌شوند و قابل بازگشت نیست. اول پشتیبان بگیر.',
          confirmLabel: 'همه را پاک کن',
          onConfirm: function () {
            Store.clearAll();
            toast('همهٔ داده‌ها پاک شد');
            closeAndRender();
          }
        });
        break;

      case 'confirm':
        var fn = confirmHandler;
        confirmHandler = null;
        if (typeof fn === 'function') fn();
        break;

      case 'close': closeSheet(); break;
    }
  });

  scrim.addEventListener('click', closeSheet);

  document.getElementById('fab').addEventListener('click', function () { openTxSheet(null); });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && sheet.classList.contains('open')) closeSheet();
  });

  /* ---------------- راه‌اندازی ---------------- */

  Store.load();
  state.month = todayMonth();
  render();

  Store.subscribe(function () {
    if (!sheet.classList.contains('open')) render();
  });

  /* در نسخهٔ نصب‌شدهٔ اندروید/iOS که فایل‌ها داخل خود اپ هستند، service worker لازم نیست
     و فقط باعث سرو شدن نسخهٔ قدیمی پس از آپدیت می‌شود. */
  var inNativeShell = !!(window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === 'function' &&
    window.Capacitor.isNativePlatform());

  if ('serviceWorker' in navigator && !inNativeShell) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (err) {
        console.warn('ثبت service worker ناموفق بود', err);
      });
    });
  }
})();
