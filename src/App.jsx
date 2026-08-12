import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, FileText,
  Users, BarChart3, Plus, ChevronRight, ChevronLeft, Printer, Trash2, Search,
  ShieldCheck, Clock, ArrowRight, ArrowLeft, X, Layers, Wallet, Factory,
  ShoppingCart, Monitor, ClipboardList, Award, ChevronDown, LayoutDashboard, Download
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from 'recharts';

/* =========================================================================
   VANTAGE — منصة استقبال ومعالجة الاستشارات الداخلية
   Design tokens
   ========================================================================= */
const C = {
  ink: '#13223C',
  inkSoft: '#2A3B58',
  paper: '#F6F3EA',
  paperAlt: '#ECE6D6',
  card: '#FFFFFF',
  brass: '#A9814A',
  brassDeep: '#8A6A3A',
  steel: '#54677F',
  brick: '#9C4432',
  brickSoft: '#C97B62',
  sage: '#3F6B52',
  sageSoft: '#79A98A',
  amber: '#B98430',
  line: '#DDD5C0',
};

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap";

const SECTORS = ['تجزئة', 'تصنيع', 'خدمات مهنية', 'مطاعم وضيافة', 'بناء وتشييد', 'تعليم', 'رعاية صحية', 'تجارة جملة', 'لوجستيات', 'أخرى'];
const BUSINESS_TYPES = ['منشأة صغيرة', 'مؤسسة متوسطة', 'تجارة إلكترونية', 'نموذج هجين (تقليدي ورقمي)'];

/* =========================================================================
   Scoring — Diagnostic Engine (Financial / Operational / Commercial / Digital)
   ========================================================================= */
const band = (v, table, fallback = 10) => {
  for (const [min, score] of table) if (v >= min) return score;
  return fallback;
};
// For "lower is better" metrics — table entries are ascending upper-bounds.
const bandLower = (v, table, fallback = 10) => {
  for (const [max, score] of table) if (v <= max) return score;
  return fallback;
};
// For metrics with an ideal middle range (e.g. utilization %).
const sweetSpot = (v, lo, hi, margin = 10) => {
  if (v >= lo && v <= hi) return 100;
  if (v >= lo - margin && v <= hi + margin) return 70;
  return 40;
};

const KPI_DEFS = [
  // id, label, unit, engine, weight-in-engine, calc(form)->value, score(value)
  { id: 'revenueGrowth', label: 'نمو الإيرادات', unit: '%', engine: 'financial',
    calc: f => f.previousRevenue > 0 ? ((f.currentRevenue - f.previousRevenue) / f.previousRevenue) * 100 : 0,
    score: v => band(v, [[15,100],[5,80],[0,60],[-10,30]], 10) },
  { id: 'netMargin', label: 'هامش الربح الصافي', unit: '%', engine: 'financial',
    calc: f => f.currentRevenue > 0 ? (f.netProfit / f.currentRevenue) * 100 : 0,
    score: v => band(v, [[15,100],[10,80],[5,60],[0,40]], 10) },
  { id: 'currentRatio', label: 'نسبة التداول', unit: 'x', engine: 'financial',
    calc: f => f.currentLiabilities > 0 ? f.currentAssets / f.currentLiabilities : 0,
    score: v => band(v, [[2,100],[1.5,80],[1,60],[0.5,30]], 10) },
  { id: 'quickRatio', label: 'نسبة السيولة السريعة', unit: 'x', engine: 'financial',
    calc: f => f.currentLiabilities > 0 ? (f.currentAssets - f.inventoryValue) / f.currentLiabilities : 0,
    score: v => band(v, [[1.5,100],[1,80],[0.7,60],[0.4,30]], 10) },
  { id: 'debtEquity', label: 'الدين إلى حقوق الملكية', unit: 'x', engine: 'financial',
    calc: f => f.totalEquity > 0 ? f.totalLiabilities / f.totalEquity : 99,
    score: v => 100 - band(v, [[3,90],[2,70],[1,40],[0.5,20]], 0) },
  { id: 'inventoryTurnover', label: 'معدل دوران المخزون', unit: 'x', engine: 'operational',
    calc: f => f.avgInventoryValue > 0 ? f.cogs / f.avgInventoryValue : 0,
    score: v => band(v, [[8,100],[6,80],[4,60],[2,30]], 10) },
  { id: 'onTimeFulfillment', label: 'التسليم في الوقت المحدد', unit: '%', engine: 'operational',
    calc: f => f.onTimeFulfillmentPct,
    score: v => band(v, [[95,100],[90,80],[80,60],[70,30]], 10) },
  { id: 'capacityUtilization', label: 'استغلال الطاقة التشغيلية', unit: '%', engine: 'operational',
    calc: f => f.capacityUtilizationPct,
    score: v => (v >= 70 && v <= 85) ? 100 : (v >= 60 && v <= 95) ? 70 : 40 },
  { id: 'retentionRate', label: 'معدل الاحتفاظ بالعملاء', unit: '%', engine: 'commercial',
    calc: f => f.retentionRatePct,
    score: v => band(v, [[85,100],[70,80],[50,60],[30,30]], 10) },
  { id: 'cacToDealRatio', label: 'تكلفة الاكتساب لقيمة الصفقة', unit: 'x', engine: 'commercial',
    calc: f => f.avgDealValue > 0 ? f.cac / f.avgDealValue : 1,
    score: v => 100 - band(v, [[0.5,90],[0.35,70],[0.2,40],[0.1,20]], 0) },
  { id: 'conversionRate', label: 'معدل التحويل الرقمي', unit: '%', engine: 'digital',
    calc: f => f.conversionRatePct,
    score: v => band(v, [[3,100],[2,80],[1,60],[0.5,30]], 10) },
  { id: 'cartAbandonment', label: 'التخلي عن سلة الشراء', unit: '%', engine: 'digital',
    calc: f => f.cartAbandonmentPct,
    score: v => 100 - band(v, [[85,90],[75,70],[65,40],[50,15]], 0) },
  { id: 'ltvCacRatio', label: 'القيمة الدائمة إلى تكلفة الاكتساب', unit: 'x', engine: 'digital',
    calc: f => f.digitalCac > 0 ? f.ltv / f.digitalCac : 0,
    score: v => band(v, [[3,100],[2,80],[1,60],[0.5,30]], 10) },
];

const ENGINE_META = {
  financial:   { label: 'المحرك المالي',    icon: Wallet,       color: C.ink },
  operational: { label: 'المحرك التشغيلي',  icon: Factory,      color: C.steel },
  commercial:  { label: 'المحرك التجاري',   icon: ShoppingCart, color: C.brass },
  digital:     { label: 'المحرك الرقمي',    icon: Monitor,      color: C.sage },
  sector:      { label: 'مؤشرات القطاع',    icon: Layers,       color: C.amber },
};

const BASE_WEIGHTS = { financial: 0.35, operational: 0.20, commercial: 0.25, digital: 0.20 };
const SECTOR_WEIGHT = 0.20;

// Sector-specific KPI library — engine assigned to 'sector' at compute time.
// Each def doubles as: (1) an intake field (id/label/unit) and (2) a scored KPI with its own recommendation text.
const SECTOR_KPI_DEFS = {
  'تجزئة': [
    { id: 'salesPerSqm', label: 'المبيعات لكل متر مربع', unit: '﷼',
      calc: f => f.salesPerSqm, score: v => band(v, [[3000,100],[2000,80],[1000,60],[500,30]], 10),
      recTitle: 'رفع إنتاجية المساحة البيعية', recDesc: 'المبيعات لكل متر مربع أقل من المعدل المستهدف. يوصى بمراجعة تخطيط المعروضات والتشكيلة السلعية.' },
    { id: 'shrinkagePct', label: 'نسبة الفاقد والتالف', unit: '%',
      calc: f => f.shrinkagePct, score: v => bandLower(v, [[1,100],[2,80],[3,60],[5,30]], 10),
      recTitle: 'خفض نسبة الفاقد والتالف', recDesc: 'نسبة الفاقد مرتفعة عن المعدل المقبول. يوصى بتعزيز إجراءات الجرد والرقابة على المخزون.' },
  ],
  'تصنيع': [
    { id: 'oeePct', label: 'فعالية المعدات الشاملة (OEE)', unit: '%',
      calc: f => f.oeePct, score: v => band(v, [[85,100],[75,80],[65,60],[50,30]], 10),
      recTitle: 'رفع فعالية خطوط الإنتاج', recDesc: 'فعالية المعدات الشاملة دون المستوى المستهدف. يوصى بمراجعة التوقفات غير المخطَّطة والصيانة الوقائية والجودة.' },
    { id: 'scrapRatePct', label: 'نسبة الهالك والتلف', unit: '%',
      calc: f => f.scrapRatePct, score: v => bandLower(v, [[2,100],[4,80],[7,60],[12,30]], 10),
      recTitle: 'خفض نسبة الهالك والتلف', recDesc: 'نسبة الهالك مرتفعة. يوصى بمراجعة جودة المدخلات وضبط معايير التصنيع.' },
  ],
  'خدمات مهنية': [
    { id: 'billableUtilizationPct', label: 'نسبة الساعات القابلة للفوترة', unit: '%',
      calc: f => f.billableUtilizationPct, score: v => band(v, [[75,100],[65,80],[55,60],[40,30]], 10),
      recTitle: 'رفع نسبة الساعات القابلة للفوترة', recDesc: 'استغلال الطاقة الاستشارية دون المستهدف. يوصى بمراجعة تخصيص الموارد وتحميل المشاريع.' },
    { id: 'avgProjectMarginPct', label: 'متوسط هامش المشروع', unit: '%',
      calc: f => f.avgProjectMarginPct, score: v => band(v, [[20,100],[12,80],[6,60],[0,40]], 10),
      recTitle: 'تحسين هامش ربحية المشاريع', recDesc: 'هامش المشاريع ضعيف. يوصى بمراجعة أسلوب التسعير وتقدير التكاليف قبل التعاقد.' },
  ],
  'مطاعم وضيافة': [
    { id: 'foodCostPct', label: 'نسبة تكلفة الأصناف (Food Cost)', unit: '%',
      calc: f => f.foodCostPct, score: v => bandLower(v, [[30,100],[35,80],[40,60],[45,30]], 10),
      recTitle: 'ضبط نسبة تكلفة الأصناف', recDesc: 'نسبة تكلفة الأصناف مرتفعة عن المعدل المستهدف. يوصى بمراجعة الوصفات والموردين ومراقبة الهدر.' },
    { id: 'tableTurnoverRate', label: 'معدل دوران الطاولات (مرات/يوم)', unit: 'x',
      calc: f => f.tableTurnoverRate, score: v => band(v, [[3,100],[2,80],[1.5,60],[1,30]], 10),
      recTitle: 'رفع معدل دوران الطاولات', recDesc: 'معدل دوران الطاولات منخفض. يوصى بمراجعة سرعة الخدمة وسياسة الحجوزات.' },
  ],
  'بناء وتشييد': [
    { id: 'costOverrunPct', label: 'نسبة تجاوز الميزانية', unit: '%',
      calc: f => f.costOverrunPct, score: v => bandLower(v, [[0,100],[5,80],[10,60],[20,30]], 10),
      recTitle: 'ضبط تجاوز ميزانية المشاريع', recDesc: 'تجاوز واضح للميزانية المخطَّطة. يوصى بتعزيز الرقابة على التكاليف وإدارة أوامر التغيير.' },
    { id: 'scheduleDelayPct', label: 'نسبة التأخر عن الجدول الزمني', unit: '%',
      calc: f => f.scheduleDelayPct, score: v => bandLower(v, [[0,100],[5,80],[10,60],[20,30]], 10),
      recTitle: 'معالجة التأخر عن الجدول الزمني', recDesc: 'تأخر ملحوظ عن الجدول الزمني للمشاريع. يوصى بمراجعة تخطيط الموارد والمسار الحرج.' },
  ],
  'تعليم': [
    { id: 'enrollmentRetentionPct', label: 'معدل بقاء الطلاب', unit: '%',
      calc: f => f.enrollmentRetentionPct, score: v => band(v, [[90,100],[80,80],[65,60],[50,30]], 10),
      recTitle: 'تحسين معدل بقاء الطلاب', recDesc: 'معدل بقاء الطلاب دون المستهدف. يوصى بمراجعة الدعم الأكاديمي وتجربة الطالب.' },
    { id: 'seatUtilizationPct', label: 'نسبة إشغال المقاعد الدراسية', unit: '%',
      calc: f => f.seatUtilizationPct, score: v => sweetSpot(v, 70, 90, 15),
      recTitle: 'تحسين إشغال المقاعد الدراسية', recDesc: 'نسبة إشغال المقاعد خارج النطاق الأمثل. يوصى بمراجعة خطة القبول أو السعة الاستيعابية.' },
  ],
  'رعاية صحية': [
    { id: 'bedOccupancyPct', label: 'نسبة إشغال الأسرّة', unit: '%',
      calc: f => f.bedOccupancyPct, score: v => sweetSpot(v, 75, 85, 12),
      recTitle: 'تحسين إدارة إشغال الأسرّة', recDesc: 'نسبة إشغال الأسرّة خارج النطاق الأمثل. يوصى بمراجعة تخطيط السعة والتنسيق بين الأقسام.' },
    { id: 'patientWaitTimeMin', label: 'متوسط وقت انتظار المريض', unit: 'دقيقة',
      calc: f => f.patientWaitTimeMin, score: v => bandLower(v, [[15,100],[30,80],[45,60],[60,30]], 10),
      recTitle: 'تقليص وقت انتظار المريض', recDesc: 'متوسط وقت الانتظار مرتفع. يوصى بمراجعة مسار المريض وجدولة العيادات.' },
  ],
  'تجارة جملة': [
    { id: 'orderFillRatePct', label: 'معدل تلبية الطلبات بالكامل', unit: '%',
      calc: f => f.orderFillRatePct, score: v => band(v, [[95,100],[90,80],[80,60],[70,30]], 10),
      recTitle: 'رفع معدل تلبية الطلبات', recDesc: 'معدل تلبية الطلبات بالكامل دون المستهدف. يوصى بمراجعة إدارة المخزون والتنسيق مع الموردين.' },
    { id: 'avgOrderCycleDays', label: 'متوسط دورة تنفيذ الطلب (أيام)', unit: 'يوم',
      calc: f => f.avgOrderCycleDays, score: v => bandLower(v, [[2,100],[4,80],[7,60],[10,30]], 10),
      recTitle: 'تقصير دورة تنفيذ الطلب', recDesc: 'دورة تنفيذ الطلب طويلة نسبيًا. يوصى بمراجعة سير العمل بين الاستلام والتنفيذ.' },
  ],
  'لوجستيات': [
    { id: 'fleetUtilizationPct', label: 'معدل استغلال الأسطول', unit: '%',
      calc: f => f.fleetUtilizationPct, score: v => sweetSpot(v, 70, 85, 15),
      recTitle: 'تحسين استغلال الأسطول', recDesc: 'استغلال الأسطول خارج النطاق الأمثل. يوصى بمراجعة جدولة الرحلات وخطط الصيانة.' },
    { id: 'deliveryOnTimePct', label: 'نسبة التسليم في الوقت المحدد', unit: '%',
      calc: f => f.deliveryOnTimePct, score: v => band(v, [[95,100],[90,80],[80,60],[70,30]], 10),
      recTitle: 'رفع نسبة التسليم في الوقت المحدد', recDesc: 'نسبة التسليم في الوقت المحدد دون المستهدف. يوصى بمراجعة التخطيط اللوجستي ومسارات التوزيع.' },
  ],
};

const RECS = {
  revenueGrowth:      { title: 'تنشيط محركات النمو التجاري', desc: 'نمو الإيرادات ضعيف أو سالب. يوصى بمراجعة استراتيجية التسعير، توسيع قنوات المبيعات، وتقييم فرص أسواق جديدة.' },
  netMargin:           { title: 'تحسين هامش الربح الصافي', desc: 'هامش الربح دون المستوى الصحي. يوصى بمراجعة هيكل التكاليف التشغيلية والتسعير ورفع الكفاءة التشغيلية.' },
  currentRatio:         { title: 'معالجة مخاطر السيولة قصيرة الأجل', desc: 'نسبة التداول تشير لضغط على السيولة. يوصى بإعادة جدولة الالتزامات القصيرة وتسريع دورة التحصيل.' },
  quickRatio:           { title: 'تعزيز السيولة السريعة', desc: 'القدرة على تغطية الالتزامات الفورية دون الاعتماد على المخزون ضعيفة، يستدعي متابعة النقد الفوري.' },
  debtEquity:           { title: 'إعادة هيكلة الرافعة المالية', desc: 'نسبة الدين إلى حقوق الملكية مرتفعة. يوصى بخطة لتخفيض الاعتماد على التمويل بالدين وتعزيز رأس المال.' },
  inventoryTurnover:    { title: 'تحسين إدارة المخزون', desc: 'معدل دوران المخزون منخفض، ما يشير لتجميد رأس المال أو ضعف التخطيط للطلب.' },
  onTimeFulfillment:    { title: 'رفع كفاءة التنفيذ والتسليم', desc: 'معدل التسليم في الوقت المحدد أقل من المستهدف. يوصى بمراجعة سلسلة الإمداد وعمليات التنفيذ.' },
  capacityUtilization:  { title: 'إعادة توازن الطاقة التشغيلية', desc: 'معدل استغلال الطاقة خارج النطاق الأمثل، إما هدر في الموارد أو ضغط تشغيلي زائد.' },
  retentionRate:        { title: 'بناء برنامج ولاء واحتفاظ بالعملاء', desc: 'معدل الاحتفاظ بالعملاء ضعيف. يوصى بتطوير برنامج ولاء ومراجعة تجربة ما بعد البيع.' },
  cacToDealRatio:       { title: 'خفض تكلفة اكتساب العميل', desc: 'تكلفة اكتساب العميل مرتفعة نسبة لقيمة الصفقة. يوصى بتحسين استهداف الحملات التسويقية.' },
  conversionRate:       { title: 'تحسين معدل التحويل الرقمي', desc: 'معدل التحويل في القنوات الرقمية منخفض. يوصى بمراجعة تجربة المستخدم ومسار الشراء.' },
  cartAbandonment:      { title: 'معالجة تسرب سلة الشراء', desc: 'نسبة التخلي عن سلة الشراء مرتفعة. يوصى بتبسيط إجراءات الدفع وإعادة استهداف العملاء.' },
  ltvCacRatio:          { title: 'تحسين العائد على استثمار اكتساب العملاء', desc: 'نسبة القيمة الدائمة للعميل إلى تكلفة الاكتساب ضعيفة. يوصى بمراجعة استراتيجية الاستهداف والاحتفاظ.' },
};

function computeDiagnostics(f, sectorName) {
  const sectorDefs = (SECTOR_KPI_DEFS[sectorName] || []).map(d => ({ ...d, engine: 'sector' }));
  const allDefs = [...KPI_DEFS, ...sectorDefs];

  const kpis = allDefs.map(def => {
    const raw = def.calc(f);
    const value = isFinite(raw) ? raw : 0;
    const score = Math.max(0, Math.min(100, def.score(value)));
    return { ...def, value, score };
  });

  const engineKeys = sectorDefs.length ? ['financial', 'operational', 'commercial', 'digital', 'sector'] : ['financial', 'operational', 'commercial', 'digital'];

  const engineScores = {};
  engineKeys.forEach(eng => {
    const list = kpis.filter(k => k.engine === eng);
    engineScores[eng] = list.length ? list.reduce((s, k) => s + k.score, 0) / list.length : 0;
  });

  let weights;
  if (sectorDefs.length) {
    weights = {};
    Object.entries(BASE_WEIGHTS).forEach(([k, w]) => { weights[k] = w * (1 - SECTOR_WEIGHT); });
    weights.sector = SECTOR_WEIGHT;
  } else {
    weights = BASE_WEIGHTS;
  }

  const healthScore = Math.round(engineKeys.reduce((sum, eng) => sum + engineScores[eng] * weights[eng], 0));

  let riskBand;
  if (healthScore >= 80) riskBand = { label: 'صحة مؤسسية ممتازة', color: C.sage, key: 'excellent' };
  else if (healthScore >= 60) riskBand = { label: 'مستقر مع فرص تحسين', color: C.brass, key: 'stable' };
  else if (healthScore >= 40) riskBand = { label: 'يتطلب انتباه إداري', color: C.amber, key: 'attention' };
  else riskBand = { label: 'حالة حرجة', color: C.brick, key: 'critical' };

  const recommendations = kpis
    .filter(k => k.score < 60)
    .map(k => {
      const info = RECS[k.id] || { title: k.recTitle, desc: k.recDesc };
      return {
        id: k.id,
        title: info.title,
        desc: info.desc,
        engine: k.engine,
        priority: k.score < 40 ? 'عالية' : 'متوسطة',
        timeline: k.score < 40 ? '0–30 يوم' : '30–90 يوم',
        score: k.score,
      };
    })
    .sort((a, b) => a.score - b.score);

  const engineList = engineKeys.map(eng => ({
    key: eng,
    ...ENGINE_META[eng],
    label: eng === 'sector' ? `مؤشرات قطاع ${sectorName}` : ENGINE_META[eng].label,
  }));

  return { kpis, engineScores, healthScore, riskBand, recommendations, engineList };
}

const fmtNum = (v, unit) => {
  const n = Math.round(v * 10) / 10;
  if (unit === '%') return `${n}%`;
  if (unit === 'x') return `${n}×`;
  return `${n.toLocaleString('ar')}`;
};

/* =========================================================================
   Word Export (RTF — opens natively in Microsoft Word, no server needed)
   ========================================================================= */
function rtfEscape(str) {
  let out = '';
  for (const ch of String(str)) {
    const code = ch.codePointAt(0);
    if (code > 127) {
      const signed = code > 32767 ? code - 65536 : code;
      out += `\\u${signed}?`;
    } else if (ch === '\\' || ch === '{' || ch === '}') {
      out += `\\${ch}`;
    } else {
      out += ch;
    }
  }
  return out;
}

// cells/widths share the same paired order; widths are individual column widths (twips),
// accumulated internally into RTF's cumulative \cellx offsets.
function rtfTableRow(cells, widths, opts = {}) {
  let s = `\\trowd\\trgaph80\\trleft0\\rtlrow\n`;
  let acc = 0;
  widths.forEach(w => { acc += w; s += `\\clbrdrb\\brdrs\\brdrw10\\brdrcf7\\cellx${acc}`; });
  s += `\n`;
  cells.forEach((c, i) => {
    const align = (opts.aligns && opts.aligns[i]) || 'qr';
    const bold = opts.bold ? '\\b' : '';
    const color = (opts.colors && opts.colors[i]) ? `\\cf${opts.colors[i]}` : '';
    s += `\\pard\\intbl\\${align}${bold}${color} ${rtfEscape(c)}\\cell`;
  });
  s += `\\row\n`;
  return s;
}

function buildReportRTF(record) {
  const { form, diagnostics, certNumber, date } = record;
  let b = '';
  b += `{\\rtf1\\ansi\\ansicpg1256\\deff0\\deflang1025\\deflangfe1025\n`;
  b += `{\\fonttbl{\\f0\\fswiss\\fcharset178\\fprq2 Arial;}}\n`;
  b += `{\\colortbl;\\red19\\green34\\blue60;\\red169\\green129\\blue74;\\red84\\green103\\blue127;\\red156\\green68\\blue50;\\red63\\green107\\blue82;\\red185\\green132\\blue48;\\red221\\green213\\blue192;}\n`;
  b += `\\rtlpar\\rtlch\\lang1025\\f0\\fs22\n`;

  b += `{\\qc\\b\\fs20\\cf2 ${rtfEscape('VANTAGE  ·  فانتج للاستشارات')}\\par}\n`;
  b += `{\\qc\\b\\fs40\\cf1 ${rtfEscape('تقرير التشخيص والتوصيات')}\\par}\n`;
  b += `{\\qc\\fs22\\cf3 ${rtfEscape(`${form.companyName} · ${form.businessType} · ${form.sector}`)}\\par}\n`;
  b += `\\par\n`;
  b += `{\\qc\\fs18\\cf3 ${rtfEscape(`رقم الشهادة: ${certNumber}   |   تاريخ الإصدار: ${date}   |   المستشار المسؤول: ${form.consultant}`)}\\par}\n`;
  b += `{\\qc\\fs18\\cf7 ${rtfEscape('────────────────────────────────────────')}\\par}\n\\par\n`;

  b += `{\\b\\fs30\\cf1 ${rtfEscape('مؤشر الصحة المؤسسية: ')}${rtfEscape(String(diagnostics.healthScore))} / 100  —  ${rtfEscape(diagnostics.riskBand.label)}\\par}\n\\par\n`;

  b += `{\\b\\fs26\\cf1 ${rtfEscape('الملخص التنفيذي')}\\par}\n`;
  const summary = `بناءً على البيانات المقدَّمة، حصلت ${form.companyName} على مؤشر صحة مؤسسية إجمالي قدره ${diagnostics.healthScore} من 100، ما يصنَّف ضمن فئة "${diagnostics.riskBand.label}". تم رصد ${diagnostics.recommendations.length} توصية ذات أولوية تتطلب متابعة إدارية، مفصّلة أدناه. المستشار المسؤول عن اعتماد هذا التقرير: ${form.consultant}.`;
  b += `{\\fs22\\cf1 ${rtfEscape(summary)}\\par}\n\\par\n`;

  if (form.notes) {
    b += `{\\i\\fs20\\cf3 ${rtfEscape('ملاحظات المستشار: ' + form.notes)}\\par}\n\\par\n`;
  }

  b += `{\\b\\fs26\\cf1 ${rtfEscape('نتائج محركات التشخيص')}\\par}\n`;
  b += rtfTableRow(['النتيجة', 'المحرك'], [1500, 5000], { aligns: ['qc', 'qr'], bold: true, colors: [1, 1] });
  diagnostics.engineList.forEach(meta => {
    b += rtfTableRow([String(Math.round(diagnostics.engineScores[meta.key])), meta.label], [1500, 5000], { aligns: ['qc', 'qr'] });
  });
  b += `\\pard\\par\n\\par\n`;

  b += `{\\b\\fs26\\cf1 ${rtfEscape('تفصيل المؤشرات')}\\par}\n`;
  diagnostics.engineList.forEach(meta => {
    b += `{\\b\\fs22\\cf2 ${rtfEscape(meta.label)}\\par}\n`;
    b += rtfTableRow(['النتيجة', 'القيمة', 'المؤشر'], [1200, 1500, 4200], { aligns: ['qc', 'qc', 'qr'], bold: true, colors: [1, 1, 1] });
    diagnostics.kpis.filter(k => k.engine === meta.key).forEach(k => {
      b += rtfTableRow([String(k.score), fmtNum(k.value, k.unit), k.label], [1200, 1500, 4200], { aligns: ['qc', 'qc', 'qr'] });
    });
    b += `\\pard\\par\n`;
  });

  b += `{\\b\\fs26\\cf1 ${rtfEscape(`التوصيات ذات الأولوية (${diagnostics.recommendations.length})`)}\\par}\n`;
  if (diagnostics.recommendations.length === 0) {
    b += `{\\fs22\\cf5 ${rtfEscape('جميع المؤشرات ضمن النطاق الصحي — لا توجد توصيات عاجلة في هذه الدورة.')}\\par}\n`;
  } else {
    diagnostics.recommendations.forEach((r, i) => {
      const color = r.priority === 'عالية' ? 4 : 6;
      b += `{\\b\\fs22\\cf1 ${rtfEscape(`${i + 1}. ${r.title}`)}  {\\cf${color}\\fs18 (${rtfEscape('أولوية ' + r.priority)} — ${rtfEscape(r.timeline)})}\\par}\n`;
      b += `{\\fs20\\cf3 ${rtfEscape(r.desc)}\\par}\n\\par\n`;
    });
  }

  b += `{\\fs18\\cf7 ${rtfEscape('────────────────────────────────────────')}\\par}\n`;
  b += `{\\fs16\\cf3 ${rtfEscape('هذا التقرير مُولَّد آليًا من بيانات المدخلات المقدَّمة ويخضع لاعتماد المستشار المسؤول قبل تسليمه للعميل.')}\\par}\n`;
  b += `{\\fs16\\cf3 ${rtfEscape(`${form.consultant} · ${date}`)}\\par}\n`;
  b += `}`;
  return b;
}

function downloadReportRTF(record) {
  const rtf = buildReportRTF(record);
  const blob = new Blob([rtf], { type: 'application/rtf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = record.form.companyName.replace(/[\\/:*?"<>|]/g, '-').trim() || 'تقرير';
  a.href = url;
  a.download = `${safeName} - تقرير فانتج - ${record.certNumber}.rtf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* =========================================================================
   Cloud Storage & Auth — Supabase (shared across the whole Vantage team)
   Uses the auto-generated PostgREST + GoTrue Auth REST APIs directly via
   fetch (no supabase-js dependency needed inside the artifact sandbox).
   ========================================================================= */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://dcjllvshtjjfsuuajeuq.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjamxsdnNodGpqZnN1dWFqZXVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTQ2OTAsImV4cCI6MjA3NjczMDY5MH0.hDXWMFpx9axbPQg_2r8oa21cvlQtKtpxjumkMFmPVuU';
const AUTH_URL = `${SUPABASE_URL}/auth/v1`;

const authHeaders = (accessToken) => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
});

/* ---- Auth (GoTrue REST) ---- */
async function authSignUp(email, password, fullName) {
  const res = await fetch(`${AUTH_URL}/signup`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, data: { full_name: fullName } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || data.error_description || 'تعذر إنشاء الحساب');
  return data; // { access_token, refresh_token, user } if auto-confirmed, else { user } only
}

async function authSignIn(email, password) {
  const res = await fetch(`${AUTH_URL}/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
  return data;
}

async function authRefresh(refreshToken) {
  const res = await fetch(`${AUTH_URL}/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('انتهت صلاحية الجلسة');
  return data;
}

async function authSignOut(accessToken) {
  try {
    await fetch(`${AUTH_URL}/logout`, { method: 'POST', headers: authHeaders(accessToken) });
  } catch {}
}

async function fetchProfile(accessToken, userId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/consultants?id=eq.${userId}&select=*`, { headers: authHeaders(accessToken) });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

/* ---- Session persistence (real browser localStorage — this is a standalone deployed app) ---- */
const SESSION_KEY = 'vantage_session_v1';
async function saveSession(session) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
}
async function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
async function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

/* ---- Cases data (scoped to the logged-in consultant's access token) ---- */
function rowToRecord(row) {
  return {
    id: row.id, certNumber: row.cert_number, date: row.report_date,
    form: row.form, diagnostics: row.diagnostics, createdByName: row.created_by_name,
  };
}

function recordToRow(record, profile) {
  return {
    cert_number: record.certNumber,
    company_name: record.form.companyName,
    sector: record.form.sector,
    business_type: record.form.businessType,
    contact_person: record.form.contactPerson,
    contact_phone: record.form.contactPhone,
    consultant: record.form.consultant,
    notes: record.form.notes,
    form: record.form,
    diagnostics: record.diagnostics,
    health_score: record.diagnostics.healthScore,
    risk_key: record.diagnostics.riskBand.key,
    report_date: record.date,
    created_by_name: profile ? profile.full_name : record.form.consultant,
  };
}

async function fetchCasesRemote(accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/vantage_cases?select=*&order=created_at.desc`, { headers: authHeaders(accessToken) });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const rows = await res.json();
  return rows.map(rowToRecord);
}

async function insertCaseRemote(record, accessToken, profile) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/vantage_cases`, {
    method: 'POST',
    headers: { ...authHeaders(accessToken), Prefer: 'return=representation' },
    body: JSON.stringify(recordToRow(record, profile)),
  });
  if (!res.ok) throw new Error(`insert failed: ${res.status}`);
  const rows = await res.json();
  return rowToRecord(rows[0]);
}

async function deleteCaseRemote(id, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/vantage_cases?id=eq.${id}`, { method: 'DELETE', headers: authHeaders(accessToken) });
  if (!res.ok) throw new Error(`delete failed: ${res.status}`);
}

/* =========================================================================
   Small UI atoms
   ========================================================================= */
function Gauge({ score, color, size = 168 }) {
  const r = (size - 20) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.paperAlt} strokeWidth="12" />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="12"
        strokeDasharray={`${c * pct} ${c}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x="50%" y="46%" textAnchor="middle" fontSize="34" fontWeight="800" fill={C.ink} fontFamily="'Noto Kufi Arabic'">{score}</text>
      <text x="50%" y="62%" textAnchor="middle" fontSize="12" fill={C.steel} fontFamily="'IBM Plex Sans Arabic'">من 100</text>
    </svg>
  );
}

function CertSeal({ score, riskBand, consultant, certNumber, date, compact = false }) {
  const size = compact ? 84 : 172;
  const StatusIcon = riskBand.key === 'critical' ? AlertTriangle : riskBand.key === 'attention' ? Clock : CheckCircle2;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? 2 : 8 }}>
      <svg width={size} height={size} viewBox="0 0 200 200" style={{ transform: 'rotate(-3deg)' }}>
        <circle cx="100" cy="100" r="94" fill="none" stroke={riskBand.color} strokeWidth="3" />
        <circle cx="100" cy="100" r="84" fill="none" stroke={riskBand.color} strokeWidth="1.5" strokeDasharray="2 4" />
        <circle cx="100" cy="100" r="70" fill="none" stroke={riskBand.color} strokeWidth="1" opacity="0.5" />
        {!compact && (
          <>
            <path id="seal-arc-top" d="M 35 100 A 65 65 0 0 1 165 100" fill="none" />
            <text fontSize="11" fill={riskBand.color} fontFamily="'Noto Kufi Arabic'" fontWeight="700" letterSpacing="2">
              <textPath href="#seal-arc-top" startOffset="50%" textAnchor="middle">VANTAGE · فانتج للاستشارات</textPath>
            </text>
          </>
        )}
        <StatusIcon x={100 - (compact?14:20)} y={compact?58:66} width={compact?28:40} height={compact?28:40} color={riskBand.color} />
        <text x="100" y={compact?70:118} textAnchor="middle" fontSize={compact?22:30} fontWeight="800" fill={C.ink} fontFamily="'Noto Kufi Arabic'">{score}</text>
      </svg>
      {!compact && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Noto Kufi Arabic'", fontWeight: 700, fontSize: 13, color: C.ink }}>{riskBand.label}</div>
          <div style={{ fontFamily: "'IBM Plex Sans Arabic'", fontSize: 11.5, color: C.steel, marginTop: 4, lineHeight: 1.6 }}>
            المستشار المسؤول: {consultant}<br/>
            رقم الشهادة: {certNumber}<br/>
            تاريخ الإصدار: {date}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, unit, value, onChange, type = 'number', placeholder, span }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: span ? `span ${span}` : undefined }}>
      <span style={{ fontSize: 13, color: C.steel, fontWeight: 500 }}>{label}{unit ? ` (${unit})` : ''}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
        style={{
          border: `1.5px solid ${C.line}`, borderRadius: 10, padding: '10px 12px', fontSize: 14,
          fontFamily: "'IBM Plex Sans Arabic'", background: C.card, color: C.ink, outline: 'none',
        }}
        onFocus={e => e.target.style.borderColor = C.brass}
        onBlur={e => e.target.style.borderColor = C.line}
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options, span }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: span ? `span ${span}` : undefined }}>
      <span style={{ fontSize: 13, color: C.steel, fontWeight: 500 }}>{label}</span>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        style={{
          border: `1.5px solid ${C.line}`, borderRadius: 10, padding: '10px 12px', fontSize: 14,
          fontFamily: "'IBM Plex Sans Arabic'", background: C.card, color: C.ink, outline: 'none',
        }}
      >
        <option value="">اختر...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function SectionCard({ icon: Icon, title, subtitle, children, accent = C.ink }) {
  return (
    <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.line}`, padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={19} color={accent} />
        </div>
        <div>
          <div style={{ fontFamily: "'Noto Kufi Arabic'", fontWeight: 700, fontSize: 16, color: C.ink }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12.5, color: C.steel, marginTop: 2 }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

/* =========================================================================
   Empty form
   ========================================================================= */
const ALL_SECTOR_FIELD_IDS = Object.values(SECTOR_KPI_DEFS).flat().map(d => d.id);

const emptyForm = (defaultConsultant) => {
  const base = {
    companyName: '', sector: '', businessType: '', contactPerson: '', contactPhone: '',
    consultant: defaultConsultant || 'الأستاذ محمد العويني', notes: '',
    currentRevenue: '', previousRevenue: '', netProfit: '', grossProfit: '',
    currentAssets: '', currentLiabilities: '', inventoryValue: '', totalLiabilities: '', totalEquity: '',
    cogs: '', avgInventoryValue: '', onTimeFulfillmentPct: '', capacityUtilizationPct: '',
    retentionRatePct: '', cac: '', avgDealValue: '',
    conversionRatePct: '', cartAbandonmentPct: '', digitalCac: '', ltv: '',
  };
  ALL_SECTOR_FIELD_IDS.forEach(id => { base[id] = ''; });
  return base;
};

const NUMERIC_KEYS = Object.keys(emptyForm()).filter(k => !['companyName','sector','businessType','contactPerson','contactPhone','consultant','notes'].includes(k));

/* =========================================================================
   Intake Wizard
   ========================================================================= */
function IntakeWizard({ onCancel, onSubmit, saving, defaultConsultant }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => emptyForm(defaultConsultant));
  const set = (k) => (v) => setForm(prev => ({ ...prev, [k]: v }));

  const sectorDefs = SECTOR_KPI_DEFS[form.sector] || [];
  const steps = ['بيانات الشركة', 'البيانات المالية', 'البيانات التشغيلية', 'البيانات التجارية', 'البيانات الرقمية',
    ...(sectorDefs.length ? [`مؤشرات ${form.sector}`] : []), 'المراجعة والإرسال'];
  const sectorStepIndex = sectorDefs.length ? 5 : -1;
  const reviewStepIndex = steps.length - 1;

  const numericForm = useMemo(() => {
    const f = { ...form };
    NUMERIC_KEYS.forEach(k => { f[k] = Number(f[k]) || 0; });
    return f;
  }, [form]);

  const canProceedStep0 = form.companyName.trim() && form.sector && form.businessType && form.contactPerson.trim();

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: "'Noto Kufi Arabic'", fontWeight: 800, fontSize: 22, color: C.ink }}>استقبال استشارة جديدة</div>
          <div style={{ fontSize: 13, color: C.steel, marginTop: 4 }}>الخطوة {step + 1} من {steps.length} — {steps[step]}</div>
        </div>
        <button onClick={onCancel} style={ghostBtn}><X size={16} />إلغاء</button>
      </div>

      {/* stepper */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 26 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ flex: 1, height: 5, borderRadius: 4, background: i <= step ? C.brass : C.paperAlt, transition: 'background 0.3s' }} />
        ))}
      </div>

      {step === 0 && (
        <SectionCard icon={Building2} title="بيانات الشركة والتواصل" subtitle="المعلومات الأساسية لفتح ملف الاستشارة" accent={C.ink}>
          <Field label="اسم الشركة / المنشأة" value={form.companyName} onChange={set('companyName')} type="text" span={2} placeholder="مثال: شركة الأفق للتجارة" />
          <SelectField label="نوع المنشأة" value={form.businessType} onChange={set('businessType')} options={BUSINESS_TYPES} />
          <SelectField label="القطاع" value={form.sector} onChange={set('sector')} options={SECTORS} />
          <Field label="اسم مسؤول التواصل" value={form.contactPerson} onChange={set('contactPerson')} type="text" />
          <Field label="رقم التواصل" value={form.contactPhone} onChange={set('contactPhone')} type="text" placeholder="05xxxxxxxx" />
          <Field label="المستشار المسؤول عن الحالة" value={form.consultant} onChange={set('consultant')} type="text" span={2} />
        </SectionCard>
      )}

      {step === 1 && (
        <SectionCard icon={Wallet} title="البيانات المالية" subtitle="أرقام آخر فترة مالية مكتملة (بالريال السعودي)" accent={C.ink}>
          <Field label="الإيرادات الحالية" unit="﷼" value={form.currentRevenue} onChange={set('currentRevenue')} />
          <Field label="إيرادات الفترة السابقة" unit="﷼" value={form.previousRevenue} onChange={set('previousRevenue')} />
          <Field label="صافي الربح" unit="﷼" value={form.netProfit} onChange={set('netProfit')} />
          <Field label="إجمالي الربح" unit="﷼" value={form.grossProfit} onChange={set('grossProfit')} />
          <Field label="الأصول المتداولة" unit="﷼" value={form.currentAssets} onChange={set('currentAssets')} />
          <Field label="الخصوم المتداولة" unit="﷼" value={form.currentLiabilities} onChange={set('currentLiabilities')} />
          <Field label="قيمة المخزون" unit="﷼" value={form.inventoryValue} onChange={set('inventoryValue')} />
          <Field label="إجمالي الالتزامات" unit="﷼" value={form.totalLiabilities} onChange={set('totalLiabilities')} />
          <Field label="حقوق الملكية" unit="﷼" value={form.totalEquity} onChange={set('totalEquity')} />
        </SectionCard>
      )}

      {step === 2 && (
        <SectionCard icon={Factory} title="البيانات التشغيلية" subtitle="مؤشرات المخزون والعمليات والطاقة الإنتاجية" accent={C.steel}>
          <Field label="تكلفة البضاعة المباعة (COGS)" unit="﷼" value={form.cogs} onChange={set('cogs')} />
          <Field label="متوسط قيمة المخزون" unit="﷼" value={form.avgInventoryValue} onChange={set('avgInventoryValue')} />
          <Field label="نسبة التسليم في الوقت المحدد" unit="%" value={form.onTimeFulfillmentPct} onChange={set('onTimeFulfillmentPct')} />
          <Field label="نسبة استغلال الطاقة التشغيلية" unit="%" value={form.capacityUtilizationPct} onChange={set('capacityUtilizationPct')} />
        </SectionCard>
      )}

      {step === 3 && (
        <SectionCard icon={ShoppingCart} title="البيانات التجارية" subtitle="مؤشرات المبيعات والعملاء" accent={C.brass}>
          <Field label="معدل الاحتفاظ بالعملاء" unit="%" value={form.retentionRatePct} onChange={set('retentionRatePct')} />
          <Field label="تكلفة اكتساب العميل (CAC)" unit="﷼" value={form.cac} onChange={set('cac')} />
          <Field label="متوسط قيمة الصفقة" unit="﷼" value={form.avgDealValue} onChange={set('avgDealValue')} />
        </SectionCard>
      )}

      {step === 4 && (
        <SectionCard icon={Monitor} title="البيانات الرقمية" subtitle="مؤشرات القنوات الرقمية والتجارة الإلكترونية (اتركها صفرًا إن لم تنطبق)" accent={C.sage}>
          <Field label="معدل التحويل الرقمي" unit="%" value={form.conversionRatePct} onChange={set('conversionRatePct')} />
          <Field label="نسبة التخلي عن سلة الشراء" unit="%" value={form.cartAbandonmentPct} onChange={set('cartAbandonmentPct')} />
          <Field label="تكلفة الاكتساب الرقمي" unit="﷼" value={form.digitalCac} onChange={set('digitalCac')} />
          <Field label="القيمة الدائمة للعميل (LTV)" unit="﷼" value={form.ltv} onChange={set('ltv')} />
          <div style={{ gridColumn: 'span 3' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, color: C.steel, fontWeight: 500 }}>ملاحظات إضافية للمستشار</span>
              <textarea rows={4} value={form.notes} onChange={e => set('notes')(e.target.value)}
                style={{ border: `1.5px solid ${C.line}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: "'IBM Plex Sans Arabic'", resize: 'vertical' }}
                placeholder="أي سياق إضافي يراه المستشار مهمًا (مخاطر خاصة، ظروف السوق، قرارات إدارية معلقة...)" />
            </label>
          </div>
        </SectionCard>
      )}

      {sectorDefs.length > 0 && step === sectorStepIndex && (
        <SectionCard icon={Layers} title={`مؤشرات قطاع ${form.sector}`} subtitle="مؤشرات إضافية خاصة بطبيعة نشاط هذا القطاع، تُضاف كمحرك تشخيصي خامس" accent={C.amber}>
          {sectorDefs.map(d => (
            <Field key={d.id} label={d.label} unit={d.unit} value={form[d.id]} onChange={set(d.id)} />
          ))}
        </SectionCard>
      )}

      {step === reviewStepIndex && (
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.line}`, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <ClipboardList size={20} color={C.brass} />
            <div style={{ fontFamily: "'Noto Kufi Arabic'", fontWeight: 700, fontSize: 17, color: C.ink }}>مراجعة نهائية قبل التوليد</div>
          </div>
          <div style={{ fontSize: 13.5, color: C.steel, lineHeight: 2 }}>
            سيتم عند الإرسال: تشغيل محركات التشخيص ({sectorDefs.length ? 'المالي، التشغيلي، التجاري، الرقمي، ومؤشرات القطاع' : 'المالي، التشغيلي، التجاري، الرقمي'})، احتساب مؤشر الصحة المؤسسية العام،
            وتوليد تقرير توصيات معتمد باسم المستشار المسؤول <strong style={{ color: C.ink }}>{form.consultant || '—'}</strong>.
          </div>
          <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, fontSize: 13.5 }}>
            <div><span style={{ color: C.steel }}>الشركة: </span><strong>{form.companyName || '—'}</strong></div>
            <div><span style={{ color: C.steel }}>النوع: </span><strong>{form.businessType || '—'}</strong></div>
            <div><span style={{ color: C.steel }}>القطاع: </span><strong>{form.sector || '—'}</strong></div>
            <div><span style={{ color: C.steel }}>مسؤول التواصل: </span><strong>{form.contactPerson || '—'}</strong></div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <button
          onClick={() => step === 0 ? onCancel() : setStep(s => s - 1)}
          style={ghostBtn}
        >
          <ArrowRight size={16} /> {step === 0 ? 'إلغاء' : 'السابق'}
        </button>
        {step < steps.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 0 && !canProceedStep0}
            style={{ ...primaryBtn, opacity: (step === 0 && !canProceedStep0) ? 0.45 : 1, cursor: (step === 0 && !canProceedStep0) ? 'not-allowed' : 'pointer' }}
          >
            التالي <ArrowLeft size={16} />
          </button>
        ) : (
          <button onClick={() => onSubmit(numericForm, form)} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
            <ShieldCheck size={16} /> {saving ? 'جاري الحفظ في قاعدة البيانات...' : 'توليد التشخيص والتقرير'}
          </button>
        )}
      </div>
    </div>
  );
}

const primaryBtn = {
  display: 'flex', alignItems: 'center', gap: 8, background: C.ink, color: C.paper,
  border: 'none', borderRadius: 11, padding: '11px 20px', fontSize: 14, fontWeight: 600,
  fontFamily: "'IBM Plex Sans Arabic'", cursor: 'pointer',
};
const ghostBtn = {
  display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', color: C.steel,
  border: `1.5px solid ${C.line}`, borderRadius: 11, padding: '10px 18px', fontSize: 14, fontWeight: 500,
  fontFamily: "'IBM Plex Sans Arabic'", cursor: 'pointer',
};

/* =========================================================================
   Report View
   ========================================================================= */
function ReportView({ record, onBack, onDelete }) {
  const { form, diagnostics, certNumber, date } = record;
  const chartData = diagnostics.engineList.map(meta => ({
    name: meta.label, value: Math.round(diagnostics.engineScores[meta.key]), color: meta.color,
  }));

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={onBack} style={ghostBtn}><ArrowRight size={16} /> رجوع للوحة القيادة</button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => onDelete(record.id)} style={{ ...ghostBtn, color: C.brick, borderColor: '#E4C9BF' }}><Trash2 size={15} /> حذف الحالة</button>
          <button onClick={() => downloadReportRTF(record)} style={ghostBtn}><Download size={15} /> تصدير Word</button>
          <button onClick={() => window.print()} style={primaryBtn}><Printer size={16} /> طباعة / تصدير PDF</button>
        </div>
      </div>

      <div id="printable" style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.line}`, padding: 40 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `2px solid ${C.ink}`, paddingBottom: 20, marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily: "'Noto Kufi Arabic'", fontWeight: 800, fontSize: 13, letterSpacing: 2, color: C.brass }}>VANTAGE · فانتج للاستشارات</div>
            <div style={{ fontFamily: "'Noto Kufi Arabic'", fontWeight: 800, fontSize: 26, color: C.ink, marginTop: 6 }}>تقرير التشخيص والتوصيات</div>
            <div style={{ fontSize: 14, color: C.steel, marginTop: 6 }}>{form.companyName} · {form.businessType} · {form.sector}</div>
          </div>
          <CertSeal score={diagnostics.healthScore} riskBand={diagnostics.riskBand} consultant={form.consultant} certNumber={certNumber} date={date} />
        </div>

        {/* Executive summary + gauge */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 30, marginBottom: 32 }}>
          <div>
            <div style={{ fontFamily: "'Noto Kufi Arabic'", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 10 }}>الملخص التنفيذي</div>
            <p style={{ fontSize: 14, color: C.inkSoft, lineHeight: 2 }}>
              بناءً على البيانات المالية والتشغيلية والتجارية والرقمية المقدَّمة، حصلت <strong>{form.companyName}</strong> على
              مؤشر صحة مؤسسية إجمالي قدره <strong style={{ color: diagnostics.riskBand.color }}>{diagnostics.healthScore} من 100</strong>،
              وهو ما يصنَّف ضمن فئة «<strong style={{ color: diagnostics.riskBand.color }}>{diagnostics.riskBand.label}</strong>».
              تم رصد <strong>{diagnostics.recommendations.length}</strong> توصية ذات أولوية تتطلب متابعة إدارية،
              تفصيلها في قسم التوصيات أدناه. المستشار المسؤول عن اعتماد هذا التقرير: <strong>{form.consultant}</strong>.
            </p>
            {form.notes && (
              <div style={{ marginTop: 14, background: C.paper, borderRadius: 10, padding: 14, fontSize: 13, color: C.inkSoft, borderRight: `3px solid ${C.brass}` }}>
                <strong style={{ color: C.ink }}>ملاحظات المستشار: </strong>{form.notes}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Gauge score={diagnostics.healthScore} color={diagnostics.riskBand.color} />
            <div style={{ fontSize: 12.5, fontWeight: 600, color: diagnostics.riskBand.color, marginTop: 8 }}>{diagnostics.riskBand.label}</div>
          </div>
        </div>

        {/* Engine scores chart */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "'Noto Kufi Arabic'", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 14 }}>نتائج محركات التشخيص</div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: 'IBM Plex Sans Arabic', fill: C.steel }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: C.steel }} />
                <Tooltip contentStyle={{ fontFamily: 'IBM Plex Sans Arabic', borderRadius: 8, border: `1px solid ${C.line}` }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KPI table by engine */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "'Noto Kufi Arabic'", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 14 }}>تفصيل المؤشرات</div>
          {diagnostics.engineList.map(meta => (
            <div key={meta.key} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <meta.icon size={15} color={meta.color} />
                <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{meta.label}</span>
                <span style={{ fontSize: 12, color: C.steel }}>— {Math.round(diagnostics.engineScores[meta.key])}/100</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {diagnostics.kpis.filter(k => k.engine === meta.key).map(k => (
                    <tr key={k.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                      <td style={{ padding: '8px 6px', color: C.inkSoft }}>{k.label}</td>
                      <td style={{ padding: '8px 6px', fontWeight: 600, color: C.ink, width: 90 }}>{fmtNum(k.value, k.unit)}</td>
                      <td style={{ padding: '8px 6px', width: 140 }}>
                        <div style={{ background: C.paperAlt, borderRadius: 6, height: 8, overflow: 'hidden' }}>
                          <div style={{ width: `${k.score}%`, height: '100%', background: k.score < 40 ? C.brick : k.score < 60 ? C.amber : C.sage, borderRadius: 6 }} />
                        </div>
                      </td>
                      <td style={{ padding: '8px 6px', width: 40, textAlign: 'left', color: C.steel, fontSize: 12 }}>{k.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        <div>
          <div style={{ fontFamily: "'Noto Kufi Arabic'", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 14 }}>
            التوصيات ذات الأولوية ({diagnostics.recommendations.length})
          </div>
          {diagnostics.recommendations.length === 0 ? (
            <div style={{ background: `${C.sage}12`, borderRadius: 10, padding: 16, fontSize: 13.5, color: C.sage, fontWeight: 600 }}>
              <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginLeft: 6 }} />
              جميع المؤشرات ضمن النطاق الصحي — لا توجد توصيات عاجلة في هذه الدورة.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {diagnostics.recommendations.map((r, i) => (
                <div key={r.id} style={{ display: 'flex', gap: 14, padding: 16, background: C.paper, borderRadius: 12, borderRight: `3px solid ${r.priority === 'عالية' ? C.brick : C.amber}` }}>
                  <div style={{ fontFamily: "'Noto Kufi Arabic'", fontWeight: 800, fontSize: 18, color: C.line, minWidth: 26 }}>{String(i + 1).padStart(2, '0')}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{r.title}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: r.priority === 'عالية' ? `${C.brick}18` : `${C.amber}18`, color: r.priority === 'عالية' ? C.brick : C.amber }}>
                        أولوية {r.priority}
                      </span>
                      <span style={{ fontSize: 11.5, color: C.steel }}>· {ENGINE_META[r.engine].label} · الإطار الزمني المقترح: {r.timeline}</span>
                    </div>
                    <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 6, lineHeight: 1.8 }}>{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer sign-off */}
        <div style={{ marginTop: 36, paddingTop: 20, borderTop: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.steel }}>
          <span>هذا التقرير مُولَّد آليًا من بيانات المدخلات المقدَّمة ويخضع لاعتماد المستشار المسؤول قبل تسليمه للعميل.</span>
          <span>{form.consultant} · {date}</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   Dashboard
   ========================================================================= */
function StatPill({ label, value, color }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: '16px 18px', flex: 1 }}>
      <div style={{ fontSize: 12.5, color: C.steel }}>{label}</div>
      <div style={{ fontFamily: "'Noto Kufi Arabic'", fontWeight: 800, fontSize: 26, color: color || C.ink, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Dashboard({ cases, loaded, onOpen, onNew, onRefresh }) {
  const [q, setQ] = useState('');
  const filtered = cases.filter(c => c.form.companyName.toLowerCase().includes(q.toLowerCase()));
  const avg = cases.length ? Math.round(cases.reduce((s, c) => s + c.diagnostics.healthScore, 0) / cases.length) : 0;
  const critical = cases.filter(c => c.diagnostics.riskBand.key === 'critical').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Noto Kufi Arabic'", fontWeight: 800, fontSize: 24, color: C.ink }}>لوحة القيادة</div>
          <div style={{ fontSize: 13.5, color: C.steel, marginTop: 4 }}>نظرة عامة على حالات الاستشارة النشطة لكامل الفريق</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onRefresh} style={ghostBtn}><Download size={15} style={{ transform: 'rotate(180deg)' }} /> تحديث</button>
          <button onClick={onNew} style={primaryBtn}><Plus size={17} /> استقبال استشارة جديدة</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
        <StatPill label="إجمالي الحالات" value={cases.length} />
        <StatPill label="متوسط مؤشر الصحة" value={cases.length ? avg : '—'} color={C.brass} />
        <StatPill label="حالات حرجة" value={critical} color={critical > 0 ? C.brick : C.sage} />
      </div>

      <div style={{ position: 'relative', marginBottom: 18 }}>
        <Search size={16} color={C.steel} style={{ position: 'absolute', right: 14, top: 13 }} />
        <input
          value={q} onChange={e => setQ(e.target.value)} placeholder="بحث باسم الشركة..."
          style={{ width: '100%', padding: '11px 40px 11px 14px', borderRadius: 12, border: `1.5px solid ${C.line}`, fontSize: 14, fontFamily: "'IBM Plex Sans Arabic'" }}
        />
      </div>

      {!loaded ? (
        <div style={{ background: C.card, border: `1.5px dashed ${C.line}`, borderRadius: 16, padding: 50, textAlign: 'center' }}>
          <div style={{ color: C.steel, fontSize: 14 }}>جاري تحميل الحالات من قاعدة البيانات السحابية...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: C.card, border: `1.5px dashed ${C.line}`, borderRadius: 16, padding: 50, textAlign: 'center' }}>
          <FileText size={30} color={C.line} style={{ margin: '0 auto 12px' }} />
          <div style={{ color: C.steel, fontSize: 14 }}>{cases.length === 0 ? 'لا توجد حالات بعد — ابدأ باستقبال أول استشارة.' : 'لا توجد نتائج مطابقة للبحث.'}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {filtered.map(c => (
            <div key={c.id} onClick={() => onOpen(c.id)}
              style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 20, cursor: 'pointer', transition: 'box-shadow 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(19,34,60,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15.5, color: C.ink, fontFamily: "'Noto Kufi Arabic'" }}>{c.form.companyName}{c.unsynced ? ' •' : ''}</div>
                  <div style={{ fontSize: 12, color: C.steel, marginTop: 3 }}>{c.form.businessType} · {c.form.sector}{c.createdByName ? ` · بواسطة ${c.createdByName}` : ''}</div>
                </div>
                <CertSeal score={c.diagnostics.healthScore} riskBand={c.diagnostics.riskBand} compact />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: c.diagnostics.riskBand.color }}>{c.diagnostics.riskBand.label}</span>
                <span style={{ fontSize: 11.5, color: C.steel }}>{c.date}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   Auth Screen — login / create consultant account
   ========================================================================= */
function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('signin'); // signin | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async () => {
    setError(''); setNotice('');
    if (!email.trim() || !password) { setError('الرجاء إدخال البريد الإلكتروني وكلمة المرور.'); return; }
    if (mode === 'signup' && !fullName.trim()) { setError('الرجاء إدخال اسم المستشار.'); return; }
    setBusy(true);
    try {
      if (mode === 'signin') {
        const session = await authSignIn(email.trim(), password);
        await onAuthed(session);
      } else {
        const result = await authSignUp(email.trim(), password, fullName.trim());
        if (result.access_token) {
          await onAuthed(result);
        } else {
          setNotice('تم إنشاء الحساب بنجاح. إذا كان تفعيل البريد الإلكتروني مفعّلاً في المشروع، تحقق من بريدك ثم سجّل الدخول.');
          setMode('signin');
        }
      }
    } catch (err) {
      setError(err.message || 'حدث خطأ غير متوقع.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", background: C.ink, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <style>{`@import url('${FONT_LINK}'); * { box-sizing: border-box; }`}</style>
      <div style={{ width: 400, background: C.paper, borderRadius: 20, padding: 36, boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 26, justifyContent: 'center' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.brass, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={20} color={C.ink} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Noto Kufi Arabic'", fontWeight: 800, fontSize: 17, color: C.ink }}>VANTAGE</div>
            <div style={{ fontSize: 11, color: C.steel }}>فانتج للاستشارات — منصة الفريق</div>
          </div>
        </div>

        <div style={{ display: 'flex', background: C.paperAlt, borderRadius: 12, padding: 4, marginBottom: 22 }}>
          <button onClick={() => { setMode('signin'); setError(''); setNotice(''); }}
            style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans Arabic'", fontWeight: 600, fontSize: 13.5, background: mode === 'signin' ? C.card : 'transparent', color: mode === 'signin' ? C.ink : C.steel }}>
            تسجيل الدخول
          </button>
          <button onClick={() => { setMode('signup'); setError(''); setNotice(''); }}
            style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans Arabic'", fontWeight: 600, fontSize: 13.5, background: mode === 'signup' ? C.card : 'transparent', color: mode === 'signup' ? C.ink : C.steel }}>
            حساب مستشار جديد
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'signup' && (
            <Field label="اسم المستشار الكامل" value={fullName} onChange={setFullName} type="text" placeholder="مثال: الأستاذ محمد العويني" />
          )}
          <Field label="البريد الإلكتروني" value={email} onChange={setEmail} type="text" placeholder="name@vantage.sa" />
          <Field label="كلمة المرور" value={password} onChange={setPassword} type="password" placeholder="••••••••" />
        </div>

        {error && <div style={{ marginTop: 14, background: `${C.brick}12`, color: C.brick, borderRadius: 10, padding: '10px 14px', fontSize: 12.5 }}>{error}</div>}
        {notice && <div style={{ marginTop: 14, background: `${C.sage}12`, color: C.sage, borderRadius: 10, padding: '10px 14px', fontSize: 12.5 }}>{notice}</div>}

        <button onClick={submit} disabled={busy} style={{ ...primaryBtn, width: '100%', justifyContent: 'center', marginTop: 20, opacity: busy ? 0.6 : 1 }}>
          <ShieldCheck size={16} /> {busy ? 'جاري التحقق...' : mode === 'signin' ? 'دخول' : 'إنشاء الحساب'}
        </button>

        <div style={{ fontSize: 11, color: C.steel, textAlign: 'center', marginTop: 18, lineHeight: 1.8 }}>
          هذه المنصة مخصّصة لفريق مكتب فانتج للاستشارات فقط.<br/>جميع الحالات مشتركة بين المستشارين المسجَّلين.
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   App shell — auth gate + session lifecycle
   ========================================================================= */
function LoadingScreen({ label }) {
  return (
    <div dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", background: C.ink, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@import url('${FONT_LINK}');`}</style>
      <div style={{ color: '#D7DEE9', fontSize: 13.5 }}>{label}</div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null); // { accessToken, refreshToken, user, profile }
  const [authLoading, setAuthLoading] = useState(true);

  const establishSession = async (raw) => {
    const profile = await fetchProfile(raw.access_token, raw.user.id).catch(() => null);
    const sess = {
      accessToken: raw.access_token,
      refreshToken: raw.refresh_token,
      user: raw.user,
      profile: profile || { full_name: raw.user.email },
    };
    await saveSession({ access_token: raw.access_token, refresh_token: raw.refresh_token, user: raw.user });
    setSession(sess);
  };

  useEffect(() => {
    (async () => {
      const stored = await loadSession();
      if (stored && stored.refresh_token) {
        try {
          const refreshed = await authRefresh(stored.refresh_token);
          await establishSession(refreshed);
        } catch {
          await clearSession();
        }
      }
      setAuthLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(async () => {
      try {
        const refreshed = await authRefresh(session.refreshToken);
        await establishSession(refreshed);
      } catch (err) { console.error(err); }
    }, 50 * 60 * 1000); // refresh well before the ~1h token expiry
    return () => clearInterval(interval);
  }, [session]);

  const handleLogout = async () => {
    if (session) await authSignOut(session.accessToken);
    await clearSession();
    setSession(null);
  };

  if (authLoading) return <LoadingScreen label="جاري التحقق من الجلسة..." />;
  if (!session) return <AuthScreen onAuthed={establishSession} />;
  return <Workspace session={session} onLogout={handleLogout} />;
}

/* =========================================================================
   Workspace — the main app, scoped to the logged-in consultant's session
   ========================================================================= */
function Workspace({ session, onLogout }) {
  const [view, setView] = useState('dashboard'); // dashboard | intake | report
  const [cases, setCases] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState('connecting'); // connecting | online | offline
  const [saving, setSaving] = useState(false);

  const refreshCases = async () => {
    try {
      const rows = await fetchCasesRemote(session.accessToken);
      setCases(rows);
      setSyncStatus('online');
    } catch (err) {
      console.error(err);
      setSyncStatus('offline');
    }
  };

  useEffect(() => {
    refreshCases().finally(() => setLoaded(true));
    const interval = setInterval(refreshCases, 25000); // light polling so the whole team sees new cases
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (numericForm, rawForm) => {
    const diagnostics = computeDiagnostics(numericForm, rawForm.sector);
    const now = new Date();
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const certNumber = `VG-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${suffix}`;
    const draft = {
      form: rawForm, diagnostics, certNumber,
      date: now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }),
    };
    setSaving(true);
    try {
      const saved = await insertCaseRemote(draft, session.accessToken, session.profile);
      setCases(prev => [saved, ...prev]);
      setActiveId(saved.id);
      setSyncStatus('online');
    } catch (err) {
      console.error(err);
      const fallbackId = `local-${Date.now()}`;
      setCases(prev => [{ ...draft, id: fallbackId, unsynced: true, createdByName: session.profile.full_name }, ...prev]);
      setActiveId(fallbackId);
      setSyncStatus('offline');
    } finally {
      setSaving(false);
      setView('report');
    }
  };

  const handleDelete = async (id) => {
    setCases(prev => prev.filter(c => c.id !== id));
    setView('dashboard');
    if (!String(id).startsWith('local-')) {
      try { await deleteCaseRemote(id, session.accessToken); } catch (err) { console.error(err); setSyncStatus('offline'); }
    }
  };

  const activeRecord = cases.find(c => c.id === activeId);

  return (
    <div dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", background: C.paper, minHeight: '100%' }}>
      <style>{`
        @import url('${FONT_LINK}');
        * { box-sizing: border-box; }
        input:focus, select:focus, textarea:focus { border-color: ${C.brass} !important; }
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100%' }}>
        {/* Sidebar */}
        <div className="no-print" style={{ width: 230, background: C.ink, color: C.paper, padding: '26px 18px', flexShrink: 0, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '0 4px' }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: C.brass, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={18} color={C.ink} />
            </div>
            <div>
              <div style={{ fontFamily: "'Noto Kufi Arabic'", fontWeight: 800, fontSize: 15 }}>VANTAGE</div>
              <div style={{ fontSize: 10.5, color: '#9FB0C8' }}>فانتج للاستشارات</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)' }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: syncStatus === 'online' ? C.sageSoft : syncStatus === 'connecting' ? C.amber : C.brickSoft, flexShrink: 0 }} />
            <span style={{ fontSize: 10.5, color: '#B9C4D6' }}>
              {syncStatus === 'online' ? 'متصل — قاعدة بيانات مشتركة' : syncStatus === 'connecting' ? 'جاري الاتصال...' : 'غير متصل — عرض محلي مؤقت'}
            </span>
          </div>

          <button onClick={() => setView('dashboard')} style={navBtn(view === 'dashboard')}>
            <LayoutDashboard size={17} /> لوحة القيادة
          </button>
          <button onClick={() => setView('intake')} style={navBtn(view === 'intake')}>
            <Plus size={17} /> استشارة جديدة
          </button>

          <div style={{ marginTop: 28, padding: '0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: '#8FA1BB', fontWeight: 600 }}>الحالات الأخيرة</span>
              <button onClick={refreshCases} title="تحديث" style={{ background: 'transparent', border: 'none', color: '#8FA1BB', cursor: 'pointer', padding: 2 }}>
                <Download size={12} style={{ transform: 'rotate(180deg)' }} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto' }}>
              {cases.slice(0, 8).map(c => (
                <button key={c.id} onClick={() => { setActiveId(c.id); setView('report'); }}
                  style={{ textAlign: 'right', background: activeId === c.id && view==='report' ? 'rgba(255,255,255,0.08)' : 'transparent', border: 'none', color: '#D7DEE9', fontSize: 12.5, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: "'IBM Plex Sans Arabic'" }}>
                  {c.form.companyName}{c.unsynced ? ' •' : ''}
                </button>
              ))}
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: 16, width: 194, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#D7DEE9' }}>{session.profile.full_name}</div>
            <div style={{ fontSize: 10, color: '#8FA1BB', marginTop: 2, marginBottom: 10 }}>{session.user.email}</div>
            <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#B9C4D6', fontSize: 11, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: "'IBM Plex Sans Arabic'" }}>
              <X size={11} /> تسجيل الخروج
            </button>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, padding: '32px 40px', overflowX: 'hidden' }}>
          {view === 'dashboard' && (
            <Dashboard cases={cases} loaded={loaded} onOpen={(id) => { setActiveId(id); setView('report'); }} onNew={() => setView('intake')} onRefresh={refreshCases} />
          )}
          {view === 'intake' && (
            <IntakeWizard onCancel={() => setView('dashboard')} onSubmit={handleSubmit} saving={saving} defaultConsultant={session.profile.full_name} />
          )}
          {view === 'report' && activeRecord && (
            <ReportView record={activeRecord} onBack={() => setView('dashboard')} onDelete={handleDelete} />
          )}
        </div>
      </div>
    </div>
  );
}

function navBtn(active) {
  return {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'right',
    background: active ? C.brass : 'transparent', color: active ? C.ink : '#D7DEE9',
    border: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, fontWeight: 600,
    fontFamily: "'IBM Plex Sans Arabic'", cursor: 'pointer', marginBottom: 4,
  };
}
