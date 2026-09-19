/* تبدیل تاریخ میلادی/شمسی (الگوریتم jalaali-js) + ابزار اعداد فارسی */
(function (global) {
  'use strict';

  var breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
    1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

  function div(a, b) { return ~~(a / b); }
  function mod(a, b) { return a - ~~(a / b) * b; }

  function jalCal(jy, withoutLeap) {
    var bl = breaks.length, gy = jy + 621, leapJ = -14,
      jp = breaks[0], jm, jump = 0, leap, leapG, march, n, i;

    for (i = 1; i < bl; i += 1) {
      jm = breaks[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    n = jy - jp;
    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

    leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    march = 20 + leapJ - leapG;

    if (!withoutLeap) {
      if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
      leap = mod(mod(n + 1, 33) - 1, 4);
      if (leap === -1) leap = 4;
    }
    return { leap: leap, gy: gy, march: march };
  }

  function g2d(gy, gm, gd) {
    var d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
      div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
    d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
  }

  function d2g(jdn) {
    var j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    var i = div(mod(j, 1461), 4) * 5 + 308;
    var gd = div(mod(i, 153), 5) + 1;
    var gm = mod(div(i, 153), 12) + 1;
    var gy = div(j, 1461) - 100100 + div(8 - gm, 6);
    return { gy: gy, gm: gm, gd: gd };
  }

  function j2d(jy, jm, jd) {
    var r = jalCal(jy, true);
    return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  }

  function d2j(jdn) {
    var gy = d2g(jdn).gy, jy = gy - 621;
    var r = jalCal(jy, false), jdn1f = g2d(gy, 3, r.march), jd, jm, k;
    k = jdn - jdn1f;
    if (k >= 0) {
      if (k <= 185) {
        jm = 1 + div(k, 31);
        jd = mod(k, 31) + 1;
        return { jy: jy, jm: jm, jd: jd };
      }
      k -= 186;
    } else {
      jy -= 1;
      k += 179;
      if (r.leap === 1) k += 1;
    }
    jm = 7 + div(k, 30);
    jd = mod(k, 30) + 1;
    return { jy: jy, jm: jm, jd: jd };
  }

  function isLeapJalaali(jy) { return jalCal(jy, false).leap === 0; }

  function jalaaliMonthLength(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return isLeapJalaali(jy) ? 30 : 29;
  }

  var MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  var WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
  var WEEKDAYS_SHORT = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'];

  /* ---------- اعداد فارسی ---------- */
  var FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  function toFaDigits(value) {
    return String(value).replace(/[0-9]/g, function (d) { return FA_DIGITS[+d]; });
  }

  function toEnDigits(value) {
    return String(value)
      .replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); })
      .replace(/[٠-٩]/g, function (d) { return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); });
  }

  function groupNum(value) {
    var n = Number(value) || 0;
    var neg = n < 0;
    var s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '−' : '') + s;
  }

  /* ---------- حالت نمایش رقم: 'en' (پیش‌فرض) یا 'fa' ---------- */
  var digitMode = 'en';

  function setDigitMode(mode) {
    digitMode = mode === 'fa' ? 'fa' : 'en';
    return digitMode;
  }

  function isFa() { return digitMode === 'fa'; }

  /* یک عدد ساده را با ارقام حالت جاری برمی‌گرداند (بدون جداکننده) */
  function num(value) {
    return isFa() ? toFaDigits(value) : String(value);
  }

  /* عدد با جداکننده هزارگان، مطابق حالت جاری */
  function money(value, opts) {
    opts = opts || {};
    var fa = opts.fa != null ? !!opts.fa : isFa();
    var n = Number(value) || 0;
    var sep = fa ? '٬' : ',';
    var s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    var out = (n < 0 ? '−' : '') + s;
    return fa ? toFaDigits(out) : out;
  }

  /* ---------- تاریخ ---------- */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function toISO(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  function fromISO(iso) {
    var p = String(iso).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function todayISO() { return toISO(new Date()); }

  function toJalali(iso) {
    var d = typeof iso === 'string' ? fromISO(iso) : iso;
    return d2j(g2d(d.getFullYear(), d.getMonth() + 1, d.getDate()));
  }

  function jalaliToISO(jy, jm, jd) {
    var g = d2g(j2d(jy, jm, jd));
    return g.gy + '-' + pad2(g.gm) + '-' + pad2(g.gd);
  }

  function jalaliToDate(jy, jm, jd) {
    return fromISO(jalaliToISO(jy, jm, jd));
  }

  function monthName(jm) { return MONTHS[jm - 1] || ''; }

  function weekdayName(iso) { return WEEKDAYS[fromISO(iso).getDay()]; }

  /* برچسب روز: «امروز»، «دیروز» یا «۲۹ شهریور ۱۴۰۳» */
  function dayLabel(iso) {
    if (iso === todayISO()) return 'امروز';
    var y = fromISO(todayISO());
    y.setDate(y.getDate() - 1);
    if (iso === toISO(y)) return 'دیروز';
    var j = toJalali(iso);
    return num(j.jd) + ' ' + monthName(j.jm) + ' ' + num(j.jy);
  }

  function shortDate(iso) {
    var j = toJalali(iso);
    return num(j.jy) + '/' + num(pad2(j.jm)) + '/' + num(pad2(j.jd));
  }

  function monthKeyOf(iso) {
    var j = toJalali(iso);
    return j.jy + '-' + pad2(j.jm);
  }

  function monthLabel(jy, jm) {
    return monthName(jm) + ' ' + num(jy);
  }

  function daysInMonthISO(jy, jm) { return jalaaliMonthLength(jy, jm); }

  /* لیست ۶ ماه اخیر تا ماه جاری */
  function lastMonths(count) {
    var t = toJalali(todayISO());
    var out = [];
    var jy = t.jy, jm = t.jm;
    for (var i = 0; i < count; i++) {
      out.unshift({ jy: jy, jm: jm });
      jm -= 1;
      if (jm === 0) { jm = 12; jy -= 1; }
    }
    return out;
  }

  global.Jalali = {
    toJalali: toJalali,
    jalaliToISO: jalaliToISO,
    jalaliToDate: jalaliToDate,
    monthLength: jalaaliMonthLength,
    isLeap: isLeapJalaali,
    monthName: monthName,
    monthLabel: monthLabel,
    monthKeyOf: monthKeyOf,
    weekdayName: weekdayName,
    weekdayShort: function (i) { return WEEKDAYS_SHORT[i]; },
    dayLabel: dayLabel,
    shortDate: shortDate,
    todayISO: todayISO,
    toISO: toISO,
    fromISO: fromISO,
    lastMonths: lastMonths,
    months: MONTHS,
    weekdays: WEEKDAYS
  };

  global.FaNum = {
    toFa: toFaDigits,
    toEn: toEnDigits,
    group: groupNum,
    money: money,
    num: num,
    plain: num,
    setDigitMode: setDigitMode,
    isFa: isFa,
    digitMode: function () { return digitMode; },
    pad2: pad2
  };
})(window);
