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
  // id, label, unit, engine, calc(form)->value, score(value), benchmark (healthy industry reference)
  { id: 'revenueGrowth', label: 'نمو الإيرادات', unit: '%', engine: 'financial', benchmark: 12,
    calc: f => f.previousRevenue > 0 ? ((f.currentRevenue - f.previousRevenue) / f.previousRevenue) * 100 : 0,
    score: v => band(v, [[15,100],[5,80],[0,60],[-10,30]], 10) },
  { id: 'netMargin', label: 'هامش الربح الصافي', unit: '%', engine: 'financial', benchmark: 12,
    calc: f => f.currentRevenue > 0 ? (f.netProfit / f.currentRevenue) * 100 : 0,
    score: v => band(v, [[15,100],[10,80],[5,60],[0,40]], 10) },
  { id: 'currentRatio', label: 'نسبة التداول', unit: 'x', engine: 'financial', benchmark: 1.8,
    calc: f => f.currentLiabilities > 0 ? f.currentAssets / f.currentLiabilities : 0,
    score: v => band(v, [[2,100],[1.5,80],[1,60],[0.5,30]], 10) },
  { id: 'quickRatio', label: 'نسبة السيولة السريعة', unit: 'x', engine: 'financial', benchmark: 1.2,
    calc: f => f.currentLiabilities > 0 ? (f.currentAssets - f.inventoryValue) / f.currentLiabilities : 0,
    score: v => band(v, [[1.5,100],[1,80],[0.7,60],[0.4,30]], 10) },
  { id: 'debtEquity', label: 'الدين إلى حقوق الملكية', unit: 'x', engine: 'financial', benchmark: 0.8,
    calc: f => f.totalEquity > 0 ? f.totalLiabilities / f.totalEquity : 99,
    score: v => 100 - band(v, [[3,90],[2,70],[1,40],[0.5,20]], 0) },
  { id: 'ebitdaMargin', label: 'هامش EBITDA', unit: '%', engine: 'financial', benchmark: 18,
    calc: f => f.currentRevenue > 0 ? (f.ebitda / f.currentRevenue) * 100 : 0,
    score: v => band(v, [[20,100],[12,80],[6,60],[0,40]], 10) },
  { id: 'inventoryTurnover', label: 'معدل دوران المخزون', unit: 'x', engine: 'operational', benchmark: 7,
    calc: f => f.avgInventoryValue > 0 ? f.cogs / f.avgInventoryValue : 0,
    score: v => band(v, [[8,100],[6,80],[4,60],[2,30]], 10) },
  { id: 'onTimeFulfillment', label: 'التسليم في الوقت المحدد', unit: '%', engine: 'operational', benchmark: 92,
    calc: f => f.onTimeFulfillmentPct,
    score: v => band(v, [[95,100],[90,80],[80,60],[70,30]], 10) },
  { id: 'capacityUtilization', label: 'استغلال الطاقة التشغيلية', unit: '%', engine: 'operational', benchmark: 78,
    calc: f => f.capacityUtilizationPct,
    score: v => (v >= 70 && v <= 85) ? 100 : (v >= 60 && v <= 95) ? 70 : 40 },
  { id: 'revenuePerEmployee', label: 'الإيراد لكل موظف', unit: '﷼', engine: 'operational', benchmark: 180000,
    calc: f => f.employeeCount > 0 ? f.currentRevenue / f.employeeCount : 0,
    score: v => band(v, [[250000,100],[180000,80],[120000,60],[70000,30]], 10) },
  { id: 'employeeTurnover', label: 'معدل دوران الموظفين', unit: '%', engine: 'operational', benchmark: 15,
    calc: f => f.employeeTurnoverPct,
    score: v => bandLower(v, [[10,100],[15,80],[22,60],[30,30]], 10) },
  { id: 'retentionRate', label: 'معدل الاحتفاظ بالعملاء', unit: '%', engine: 'commercial', benchmark: 78,
    calc: f => f.retentionRatePct,
    score: v => band(v, [[85,100],[70,80],[50,60],[30,30]], 10) },
  { id: 'cacToDealRatio', label: 'تكلفة الاكتساب لقيمة الصفقة', unit: 'x', engine: 'commercial', benchmark: 0.15,
    calc: f => f.avgDealValue > 0 ? f.cac / f.avgDealValue : 1,
    score: v => 100 - band(v, [[0.5,90],[0.35,70],[0.2,40],[0.1,20]], 0) },
  { id: 'npsScore', label: 'صافي نقاط الترويج (NPS)', unit: '', engine: 'commercial', benchmark: 30,
    calc: f => f.npsScore,
    score: v => band(v, [[50,100],[30,80],[10,60],[-10,30]], 10) },
  { id: 'pipelineConversion', label: 'معدل تحويل الفرص البيعية', unit: '%', engine: 'commercial', benchmark: 25,
    calc: f => f.salesPipelineConversionPct,
    score: v => band(v, [[35,100],[25,80],[15,60],[8,30]], 10) },
  { id: 'conversionRate', label: 'معدل التحويل الرقمي', unit: '%', engine: 'digital', benchmark: 2.2,
    calc: f => f.conversionRatePct,
    score: v => band(v, [[3,100],[2,80],[1,60],[0.5,30]], 10) },
  { id: 'cartAbandonment', label: 'التخلي عن سلة الشراء', unit: '%', engine: 'digital', benchmark: 68,
    calc: f => f.cartAbandonmentPct,
    score: v => 100 - band(v, [[85,90],[75,70],[65,40],[50,15]], 0) },
  { id: 'ltvCacRatio', label: 'القيمة الدائمة إلى تكلفة الاكتساب', unit: 'x', engine: 'digital', benchmark: 2.5,
    calc: f => f.digitalCac > 0 ? f.ltv / f.digitalCac : 0,
    score: v => band(v, [[3,100],[2,80],[1,60],[0.5,30]], 10) },
  { id: 'digitalTrafficGrowth', label: 'نمو الزيارات الرقمية', unit: '%', engine: 'digital', benchmark: 15,
    calc: f => f.digitalTrafficGrowthPct,
    score: v => band(v, [[25,100],[15,80],[5,60],[-10,30]], 10) },
  { id: 'digitalRevenueShare', label: 'نسبة الإيرادات الرقمية من الإجمالي', unit: '%', engine: 'digital', benchmark: 20,
    calc: f => f.digitalRevenueSharePct,
    score: v => band(v, [[35,100],[20,80],[10,60],[3,30]], 10) },
];

const ENGINE_META = {
  financial:   { label: 'المحرك المالي',    icon: Wallet,       color: C.ink },
  operational: { label: 'المحرك التشغيلي',  icon: Factory,      color: C.steel },
  commercial:  { label: 'المحرك التجاري',   icon: ShoppingCart, color: C.brass },
  digital:     { label: 'المحرك الرقمي',    icon: Monitor,      color: C.sage },
  sector:      { label: 'مؤشرات القطاع',    icon: Layers,       color: C.amber },
};

const BASE_WEIGHTS = { financial: 0.28, operational: 0.24, commercial: 0.24, digital: 0.24 };
const SECTOR_WEIGHT = 0.20;

// Sector-specific KPI library — engine assigned to 'sector' at compute time.
// Each def doubles as: (1) an intake field (id/label/unit) and (2) a scored KPI with its own recommendation text.
const SECTOR_KPI_DEFS = {
  'تجزئة': [
    { id: 'salesPerSqm', label: 'المبيعات لكل متر مربع', unit: '﷼', benchmark: 2200,
      calc: f => f.salesPerSqm, score: v => band(v, [[3000,100],[2000,80],[1000,60],[500,30]], 10),
      recTitle: 'رفع إنتاجية المساحة البيعية', recDesc: 'المبيعات لكل متر مربع أقل من المعدل المستهدف. يوصى بمراجعة تخطيط المعروضات والتشكيلة السلعية.' },
    { id: 'shrinkagePct', label: 'نسبة الفاقد والتالف', unit: '%', benchmark: 1.5,
      calc: f => f.shrinkagePct, score: v => bandLower(v, [[1,100],[2,80],[3,60],[5,30]], 10),
      recTitle: 'خفض نسبة الفاقد والتالف', recDesc: 'نسبة الفاقد مرتفعة عن المعدل المقبول. يوصى بتعزيز إجراءات الجرد والرقابة على المخزون.' },
  ],
  'تصنيع': [
    { id: 'oeePct', label: 'فعالية المعدات الشاملة (OEE)', unit: '%', benchmark: 78,
      calc: f => f.oeePct, score: v => band(v, [[85,100],[75,80],[65,60],[50,30]], 10),
      recTitle: 'رفع فعالية خطوط الإنتاج', recDesc: 'فعالية المعدات الشاملة دون المستوى المستهدف. يوصى بمراجعة التوقفات غير المخطَّطة والصيانة الوقائية والجودة.' },
    { id: 'scrapRatePct', label: 'نسبة الهالك والتلف', unit: '%', benchmark: 3,
      calc: f => f.scrapRatePct, score: v => bandLower(v, [[2,100],[4,80],[7,60],[12,30]], 10),
      recTitle: 'خفض نسبة الهالك والتلف', recDesc: 'نسبة الهالك مرتفعة. يوصى بمراجعة جودة المدخلات وضبط معايير التصنيع.' },
  ],
  'خدمات مهنية': [
    { id: 'billableUtilizationPct', label: 'نسبة الساعات القابلة للفوترة', unit: '%', benchmark: 70,
      calc: f => f.billableUtilizationPct, score: v => band(v, [[75,100],[65,80],[55,60],[40,30]], 10),
      recTitle: 'رفع نسبة الساعات القابلة للفوترة', recDesc: 'استغلال الطاقة الاستشارية دون المستهدف. يوصى بمراجعة تخصيص الموارد وتحميل المشاريع.' },
    { id: 'avgProjectMarginPct', label: 'متوسط هامش المشروع', unit: '%', benchmark: 15,
      calc: f => f.avgProjectMarginPct, score: v => band(v, [[20,100],[12,80],[6,60],[0,40]], 10),
      recTitle: 'تحسين هامش ربحية المشاريع', recDesc: 'هامش المشاريع ضعيف. يوصى بمراجعة أسلوب التسعير وتقدير التكاليف قبل التعاقد.' },
  ],
  'مطاعم وضيافة': [
    { id: 'foodCostPct', label: 'نسبة تكلفة الأصناف (Food Cost)', unit: '%', benchmark: 32,
      calc: f => f.foodCostPct, score: v => bandLower(v, [[30,100],[35,80],[40,60],[45,30]], 10),
      recTitle: 'ضبط نسبة تكلفة الأصناف', recDesc: 'نسبة تكلفة الأصناف مرتفعة عن المعدل المستهدف. يوصى بمراجعة الوصفات والموردين ومراقبة الهدر.' },
    { id: 'tableTurnoverRate', label: 'معدل دوران الطاولات (مرات/يوم)', unit: 'x', benchmark: 2.3,
      calc: f => f.tableTurnoverRate, score: v => band(v, [[3,100],[2,80],[1.5,60],[1,30]], 10),
      recTitle: 'رفع معدل دوران الطاولات', recDesc: 'معدل دوران الطاولات منخفض. يوصى بمراجعة سرعة الخدمة وسياسة الحجوزات.' },
  ],
  'بناء وتشييد': [
    { id: 'costOverrunPct', label: 'نسبة تجاوز الميزانية', unit: '%', benchmark: 3,
      calc: f => f.costOverrunPct, score: v => bandLower(v, [[0,100],[5,80],[10,60],[20,30]], 10),
      recTitle: 'ضبط تجاوز ميزانية المشاريع', recDesc: 'تجاوز واضح للميزانية المخطَّطة. يوصى بتعزيز الرقابة على التكاليف وإدارة أوامر التغيير.' },
    { id: 'scheduleDelayPct', label: 'نسبة التأخر عن الجدول الزمني', unit: '%', benchmark: 3,
      calc: f => f.scheduleDelayPct, score: v => bandLower(v, [[0,100],[5,80],[10,60],[20,30]], 10),
      recTitle: 'معالجة التأخر عن الجدول الزمني', recDesc: 'تأخر ملحوظ عن الجدول الزمني للمشاريع. يوصى بمراجعة تخطيط الموارد والمسار الحرج.' },
  ],
  'تعليم': [
    { id: 'enrollmentRetentionPct', label: 'معدل بقاء الطلاب', unit: '%', benchmark: 85,
      calc: f => f.enrollmentRetentionPct, score: v => band(v, [[90,100],[80,80],[65,60],[50,30]], 10),
      recTitle: 'تحسين معدل بقاء الطلاب', recDesc: 'معدل بقاء الطلاب دون المستهدف. يوصى بمراجعة الدعم الأكاديمي وتجربة الطالب.' },
    { id: 'seatUtilizationPct', label: 'نسبة إشغال المقاعد الدراسية', unit: '%', benchmark: 80,
      calc: f => f.seatUtilizationPct, score: v => sweetSpot(v, 70, 90, 15),
      recTitle: 'تحسين إشغال المقاعد الدراسية', recDesc: 'نسبة إشغال المقاعد خارج النطاق الأمثل. يوصى بمراجعة خطة القبول أو السعة الاستيعابية.' },
  ],
  'رعاية صحية': [
    { id: 'bedOccupancyPct', label: 'نسبة إشغال الأسرّة', unit: '%', benchmark: 80,
      calc: f => f.bedOccupancyPct, score: v => sweetSpot(v, 75, 85, 12),
      recTitle: 'تحسين إدارة إشغال الأسرّة', recDesc: 'نسبة إشغال الأسرّة خارج النطاق الأمثل. يوصى بمراجعة تخطيط السعة والتنسيق بين الأقسام.' },
    { id: 'patientWaitTimeMin', label: 'متوسط وقت انتظار المريض', unit: 'دقيقة', benchmark: 20,
      calc: f => f.patientWaitTimeMin, score: v => bandLower(v, [[15,100],[30,80],[45,60],[60,30]], 10),
      recTitle: 'تقليص وقت انتظار المريض', recDesc: 'متوسط وقت الانتظار مرتفع. يوصى بمراجعة مسار المريض وجدولة العيادات.' },
  ],
  'تجارة جملة': [
    { id: 'orderFillRatePct', label: 'معدل تلبية الطلبات بالكامل', unit: '%', benchmark: 93,
      calc: f => f.orderFillRatePct, score: v => band(v, [[95,100],[90,80],[80,60],[70,30]], 10),
      recTitle: 'رفع معدل تلبية الطلبات', recDesc: 'معدل تلبية الطلبات بالكامل دون المستهدف. يوصى بمراجعة إدارة المخزون والتنسيق مع الموردين.' },
    { id: 'avgOrderCycleDays', label: 'متوسط دورة تنفيذ الطلب (أيام)', unit: 'يوم', benchmark: 3,
      calc: f => f.avgOrderCycleDays, score: v => bandLower(v, [[2,100],[4,80],[7,60],[10,30]], 10),
      recTitle: 'تقصير دورة تنفيذ الطلب', recDesc: 'دورة تنفيذ الطلب طويلة نسبيًا. يوصى بمراجعة سير العمل بين الاستلام والتنفيذ.' },
  ],
  'لوجستيات': [
    { id: 'fleetUtilizationPct', label: 'معدل استغلال الأسطول', unit: '%', benchmark: 77,
      calc: f => f.fleetUtilizationPct, score: v => sweetSpot(v, 70, 85, 15),
      recTitle: 'تحسين استغلال الأسطول', recDesc: 'استغلال الأسطول خارج النطاق الأمثل. يوصى بمراجعة جدولة الرحلات وخطط الصيانة.' },
    { id: 'deliveryOnTimePct', label: 'نسبة التسليم في الوقت المحدد', unit: '%', benchmark: 93,
      calc: f => f.deliveryOnTimePct, score: v => band(v, [[95,100],[90,80],[80,60],[70,30]], 10),
      recTitle: 'رفع نسبة التسليم في الوقت المحدد', recDesc: 'نسبة التسليم في الوقت المحدد دون المستهدف. يوصى بمراجعة التخطيط اللوجستي ومسارات التوزيع.' },
  ],
};

// Root-cause categorization (adapted 6M / Ishikawa framework) — maps each diagnostic
// engine to the category its weaknesses most plausibly stem from, for the fishbone section.
const FISHBONE_CATEGORY = {
  financial:    { label: 'الطريقة والسياسات المالية', sub: 'Method' },
  operational:  { label: 'الأنظمة والعمليات', sub: 'Machine / Method' },
  commercial:   { label: 'السوق والعملاء', sub: 'Environment' },
  digital:      { label: 'الأنظمة والتقنية', sub: 'Machine' },
  sector:       { label: 'خصوصية القطاع والمواد', sub: 'Material' },
  management:   { label: 'الإدارة والقيادة', sub: 'Man' },
};

// Plain-language definition + formula for every KPI — surfaced via info icons in the report
// and as a glossary appendix, so analysts unfamiliar with a term can understand it instantly.
const KPI_GLOSSARY = {
  revenueGrowth:        { def: 'نسبة الزيادة أو النقص في الإيرادات مقارنة بنفس الفترة من العام السابق.', formula: '(الإيرادات الحالية − السابقة) ÷ السابقة × 100' },
  netMargin:            { def: 'نسبة ما يتبقى من كل ريال مبيعات كربح صافٍ بعد كل المصاريف والضرائب.', formula: 'صافي الربح ÷ الإيرادات × 100' },
  currentRatio:         { def: 'قدرة المنشأة على سداد التزاماتها قصيرة الأجل من أصولها المتداولة.', formula: 'الأصول المتداولة ÷ الالتزامات المتداولة' },
  quickRatio:           { def: 'مثل نسبة التداول لكن دون الاعتماد على بيع المخزون — تقيس السيولة الفورية.', formula: '(الأصول المتداولة − المخزون) ÷ الالتزامات المتداولة' },
  debtEquity:           { def: 'مدى اعتماد المنشأة على الديون مقارنة برأس مال الملاك.', formula: 'إجمالي الالتزامات ÷ إجمالي حقوق الملكية' },
  ebitdaMargin:         { def: 'ربحية التشغيل الأساسية قبل الفوائد والضرائب والإهلاك — يعكس كفاءة العمليات بمعزل عن القرارات التمويلية والمحاسبية.', formula: 'EBITDA ÷ الإيرادات × 100' },
  inventoryTurnover:    { def: 'عدد مرات بيع المخزون واستبداله خلال الفترة — كلما ارتفع دل على كفاءة أعلى.', formula: 'تكلفة البضاعة المباعة ÷ متوسط المخزون' },
  onTimeFulfillment:    { def: 'نسبة الطلبات التي سُلِّمت للعميل في الموعد المتفق عليه دون تأخير.', formula: 'الطلبات المسلَّمة في الوقت ÷ إجمالي الطلبات × 100' },
  capacityUtilization:  { def: 'مدى استغلال الطاقة الإنتاجية أو التشغيلية المتاحة — النطاق الأمثل عادة 70-85%، فوقه إجهاد وتحته هدر.', formula: 'الإنتاج الفعلي ÷ الطاقة القصوى المتاحة × 100' },
  revenuePerEmployee:   { def: 'متوسط ما يُنتجه كل موظف من إيرادات — مؤشر إنتاجية عام للقوى العاملة.', formula: 'إجمالي الإيرادات ÷ عدد الموظفين' },
  employeeTurnover:     { def: 'نسبة الموظفين الذين تركوا العمل خلال الفترة — الارتفاع يشير لمشكلات في الإدارة أو بيئة العمل.', formula: 'عدد المغادرين خلال الفترة ÷ متوسط عدد الموظفين × 100' },
  retentionRate:        { def: 'نسبة العملاء الذين استمروا في التعامل مع المنشأة ولم يغادروا لمنافس.', formula: 'العملاء المستمرون ÷ عدد العملاء في بداية الفترة × 100' },
  cacToDealRatio:       { def: 'مدى معقولية تكلفة كسب عميل جديد مقارنة بما يدرّه من إيراد في الصفقة الواحدة.', formula: 'تكلفة اكتساب العميل ÷ متوسط قيمة الصفقة' },
  npsScore:             { def: 'مقياس عالمي لولاء العملاء ورغبتهم في التوصية بالمنشأة لغيرهم، من -100 (سلبي بالكامل) إلى 100 (إيجابي بالكامل).', formula: '% العملاء المروِّجين − % العملاء المنتقدين' },
  pipelineConversion:   { def: 'نسبة الفرص البيعية المحتملة التي تتحول فعليًا إلى صفقات مُغلَقة.', formula: 'عدد الصفقات المُغلَقة ÷ عدد الفرص البيعية × 100' },
  conversionRate:       { def: 'نسبة الزوار الرقميين الذين أكملوا عملية شراء فعلية.', formula: 'عدد عمليات الشراء ÷ عدد الزيارات × 100' },
  cartAbandonment:      { def: 'نسبة من أضافوا منتجات لسلة الشراء الإلكترونية لكنهم لم يكملوا الدفع.', formula: 'السلال المتروكة ÷ إجمالي السلال المُنشأة × 100' },
  ltvCacRatio:          { def: 'مدى مردودية العميل على المدى الطويل مقارنة بتكلفة اكتسابه — أقل من 1 يعني خسارة على كل عميل جديد.', formula: 'القيمة الدائمة للعميل (LTV) ÷ تكلفة الاكتساب الرقمي (CAC)' },
  digitalTrafficGrowth: { def: 'نسبة نمو أو تراجع عدد الزيارات للقنوات الرقمية مقارنة بالفترة السابقة.', formula: '(الزيارات الحالية − السابقة) ÷ السابقة × 100' },
  digitalRevenueShare:  { def: 'مدى مساهمة القنوات الرقمية (الموقع، التطبيق، المتاجر الإلكترونية) في إجمالي إيرادات المنشأة.', formula: 'الإيرادات الرقمية ÷ إجمالي الإيرادات × 100' },
  // Sector-specific
  salesPerSqm:          { def: 'كفاءة استغلال المساحة البيعية في تحقيق مبيعات.', formula: 'إجمالي المبيعات ÷ مساحة المتجر بالمتر المربع' },
  shrinkagePct:         { def: 'نسبة المخزون المفقود أو التالف أو المسروق مقارنة بالمخزون الكلي.', formula: 'قيمة الفاقد ÷ قيمة المخزون الكلي × 100' },
  oeePct:               { def: 'مقياس شامل لفعالية خط الإنتاج يجمع التوافر وسرعة الأداء والجودة معًا.', formula: 'نسبة التوافر × نسبة الأداء × نسبة الجودة × 100' },
  scrapRatePct:         { def: 'نسبة المنتجات التالفة أو غير المطابقة للمواصفات من إجمالي الإنتاج.', formula: 'كمية الهالك ÷ إجمالي الإنتاج × 100' },
  billableUtilizationPct: { def: 'نسبة ساعات عمل الفريق الاستشاري التي يمكن فوترتها فعليًا للعملاء.', formula: 'الساعات القابلة للفوترة ÷ إجمالي ساعات العمل المتاحة × 100' },
  avgProjectMarginPct: { def: 'متوسط ربحية المشاريع بعد خصم كل تكاليف التنفيذ المباشرة.', formula: '(إيراد المشروع − تكاليفه المباشرة) ÷ إيراد المشروع × 100' },
  foodCostPct:          { def: 'نسبة تكلفة المكونات الغذائية من سعر بيع الطبق — المعيار الصحي عادة 28-32%.', formula: 'تكلفة الأصناف المباعة ÷ إيرادات المبيعات × 100' },
  tableTurnoverRate:    { def: 'عدد المرات التي تُشغَل فيها الطاولة الواحدة بعملاء جدد خلال اليوم.', formula: 'عدد الزبائن المخدومين ÷ عدد الطاولات المتاحة (لكل يوم)' },
  costOverrunPct:       { def: 'مدى تجاوز التكلفة الفعلية للمشروع عن الميزانية المخطَّطة له.', formula: '(التكلفة الفعلية − المخطَّطة) ÷ المخطَّطة × 100' },
  scheduleDelayPct:     { def: 'مدى تأخر تنفيذ المشروع عن الجدول الزمني الأصلي المتفق عليه.', formula: '(المدة الفعلية − المخطَّطة) ÷ المخطَّطة × 100' },
  enrollmentRetentionPct: { def: 'نسبة الطلاب المسجَّلين الذين واصلوا الدراسة ولم ينسحبوا.', formula: 'الطلاب المستمرون ÷ إجمالي الطلاب المسجَّلين × 100' },
  seatUtilizationPct:  { def: 'نسبة إشغال المقاعد الدراسية المتاحة — النطاق الأمثل عادة 70-90%.', formula: 'المقاعد المشغولة ÷ إجمالي المقاعد المتاحة × 100' },
  bedOccupancyPct:      { def: 'نسبة إشغال الأسرّة داخل المنشأة الصحية — النطاق الأمثل عادة 75-85%.', formula: 'أيام إشغال الأسرّة ÷ (عدد الأسرّة × أيام الفترة) × 100' },
  patientWaitTimeMin:   { def: 'متوسط الوقت الذي ينتظره المريض قبل تلقي الخدمة الطبية.', formula: 'إجمالي دقائق الانتظار ÷ عدد المرضى' },
  orderFillRatePct:     { def: 'نسبة الطلبات التي جرى تجهيزها وتسليمها بالكامل دون نقص في الكمية.', formula: 'الطلبات المكتملة بالكامل ÷ إجمالي الطلبات × 100' },
  avgOrderCycleDays:    { def: 'متوسط عدد الأيام من استلام الطلب حتى تسليمه فعليًا للعميل.', formula: 'مجموع أيام دورة الطلبات ÷ عدد الطلبات' },
  fleetUtilizationPct: { def: 'نسبة استغلال أسطول النقل من طاقته القصوى — النطاق الأمثل عادة 70-85%.', formula: 'ساعات/كيلومترات التشغيل الفعلية ÷ الطاقة القصوى المتاحة × 100' },
  deliveryOnTimePct:    { def: 'نسبة الشحنات التي وصلت للعميل في الموعد المحدد تمامًا.', formula: 'الشحنات في الوقت المحدد ÷ إجمالي الشحنات × 100' },
};

const RECS = {
  revenuePerEmployee:   { title: 'رفع إنتاجية الموظف', desc: 'الإيراد لكل موظف أقل من المعدل المستهدف. يوصى بمراجعة الهيكل التنظيمي وتوزيع المهام وفرص الأتمتة.' },
  employeeTurnover:     { title: 'خفض معدل دوران الموظفين', desc: 'معدل مغادرة الموظفين مرتفع، ما يشير لمشكلة جذرها في الإدارة والقيادة وليس فقط في التمويل. يوصى بمراجعة بيئة العمل والتعويضات وبرامج الاستبقاء.' },
  npsScore:             { title: 'تحسين ولاء العملاء (NPS)', desc: 'صافي نقاط الترويج ضعيف. يوصى بمراجعة تجربة العميل الشاملة وتحديد نقاط الاحتكاك الرئيسية.' },
  pipelineConversion:   { title: 'رفع كفاءة تحويل الفرص البيعية', desc: 'معدل تحويل الفرص إلى صفقات فعلية منخفض. يوصى بمراجعة عملية المبيعات ومعايير تأهيل العملاء المحتملين.' },
  digitalTrafficGrowth: { title: 'تنشيط النمو الرقمي', desc: 'نمو الزيارات الرقمية ضعيف أو سالب. يوصى بمراجعة استراتيجية المحتوى والتسويق الرقمي.' },
  digitalRevenueShare:  { title: 'رفع حصة الإيرادات الرقمية', desc: 'مساهمة القنوات الرقمية في الإيرادات محدودة نسبة للمعدل المستهدف. يوصى بالاستثمار في التحول الرقمي والتجارة الإلكترونية.' },
  ebitdaMargin:         { title: 'تحسين هامش EBITDA', desc: 'هامش الأرباح قبل الفوائد والضرائب والإهلاك أقل من المستوى الصحي. يوصى بمراجعة الكفاءة التشغيلية وبنية التكاليف الثابتة.' },
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

// Converts a raw form (string inputs) into numeric values for every numeric field.
function toNumericForm(form) {
  const f = { ...form };
  NUMERIC_KEYS.forEach(k => { f[k] = Number(f[k]) || 0; });
  return f;
}

// Builds the full P&L waterfall and balance sheet from granular line items, and merges
// the resulting aggregates (netProfit, currentAssets, totalEquity, etc.) back in under the
// SAME field names the KPI engine already expects — so computeDiagnostics/KPI_DEFS never
// need to know these values are now computed rather than directly entered.
function deriveFinancials(f) {
  const grossProfit = f.currentRevenue - f.cogs;
  const operatingExpenses = f.sellingExpenses + f.adminExpenses;
  const ebitda = grossProfit - operatingExpenses;
  const ebit = ebitda - f.depreciationAmortization;
  const ebt = ebit - f.interestExpense;
  const netProfit = ebt - f.taxExpense;

  const currentAssets = f.cashAndEquivalents + f.accountsReceivable + f.inventoryValue + f.otherCurrentAssets;
  const nonCurrentAssets = f.ppeNet + f.otherNonCurrentAssets;
  const totalAssets = currentAssets + nonCurrentAssets;

  const currentLiabilities = f.accountsPayable + f.shortTermDebt + f.otherCurrentLiabilities;
  const nonCurrentLiabilities = f.longTermDebt + f.otherNonCurrentLiabilities;
  const totalLiabilities = currentLiabilities + nonCurrentLiabilities;

  const totalEquity = f.paidInCapital + f.retainedEarnings + f.otherEquity;
  const balanceCheck = totalAssets - (totalLiabilities + totalEquity);

  return {
    ...f,
    grossProfit, operatingExpenses, ebitda, ebit, ebt, netProfit,
    currentAssets, nonCurrentAssets, totalAssets,
    currentLiabilities, nonCurrentLiabilities, totalLiabilities,
    totalEquity, balanceCheck,
  };
}

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

  const managementMaturity = computeManagementMaturity(f);
  const rootCauseGroups = buildRootCauseAnalysis(kpis);
  const scenarios = buildScenarios(f, healthScore, kpis);

  // IMPORTANT: engineKeys is plain strings only (JSON-safe for Supabase storage).
  // The icon-carrying display list is derived on the client from ENGINE_META at render time —
  // never store React component references inside data that gets JSON.stringify'd to the DB.
  return { kpis, engineScores, healthScore, riskBand, recommendations, engineKeys, managementMaturity, rootCauseGroups, scenarios };
}

// Management/leadership readiness — scored separately from the four quantitative engines
// (kept informational rather than folded into the weighted health score, since 1–5 self-rated
// qualitative inputs shouldn't silently move a numbers-driven composite score).
function computeManagementMaturity(f) {
  const raw = [
    { key: 'mgmtVisionClarity', label: 'وضوح الرؤية الاستراتيجية' },
    { key: 'mgmtInfoSystems', label: 'جودة نظم المعلومات الإدارية' },
    { key: 'mgmtLeadershipStrength', label: 'قوة الفريق القيادي' },
    { key: 'mgmtGovernanceQuality', label: 'جودة الحوكمة الداخلية' },
  ].map(d => ({ ...d, value: Math.max(0, Math.min(5, Number(f[d.key]) || 0)) }));
  const avg = raw.reduce((s, d) => s + d.value, 0) / raw.length;
  return { score: Math.round((avg / 5) * 100), details: raw };
}

// Groups weak KPIs (score < 60) by root-cause category (adapted 6M / fishbone framework).
function buildRootCauseAnalysis(kpis) {
  const groups = {};
  kpis.filter(k => k.score < 60).forEach(k => {
    const cat = FISHBONE_CATEGORY[k.engine] || { label: 'أخرى', sub: '' };
    if (!groups[cat.label]) groups[cat.label] = { label: cat.label, sub: cat.sub, items: [] };
    groups[cat.label].items.push({ label: k.label, score: k.score });
  });
  return Object.values(groups).sort((a, b) => b.items.length - a.items.length);
}

// Simple indicative 12-month scenario bands (best / expected / worst) built off the
// observed revenue-growth KPI and current health score — for directional planning only.
function buildScenarios(f, healthScore, kpis) {
  const currentRevenue = Number(f.currentRevenue) || 0;
  const growthKpi = kpis.find(k => k.id === 'revenueGrowth');
  const baseGrowth = growthKpi ? growthKpi.value : 0;
  const project = (g) => Math.round(currentRevenue * (1 + g / 100));
  return {
    best:     { label: 'أفضل حالة', growth: baseGrowth + 8,  revenue: project(baseGrowth + 8),  healthScore: Math.min(100, healthScore + 10) },
    expected: { label: 'الحالة المتوقعة', growth: baseGrowth,      revenue: project(baseGrowth),      healthScore: healthScore },
    worst:    { label: 'أسوأ حالة', growth: baseGrowth - 10, revenue: project(baseGrowth - 10), healthScore: Math.max(0, healthScore - 15) },
  };
}

// Derives the display list (icons/colors/labels) fresh from the static ENGINE_META —
// always call this at render/export time instead of trusting a stored engineList.
// Backward-compatible with cases saved before this fix (old rows may have a broken
// engineList with missing icons, or may predate engineKeys entirely).
function buildEngineList(diagnostics, sectorName) {
  const keys = diagnostics.engineKeys
    || (diagnostics.engineList ? diagnostics.engineList.map(e => e.key) : Object.keys(diagnostics.engineScores || {}));
  return keys.map(eng => ({
    key: eng,
    ...ENGINE_META[eng],
    label: eng === 'sector' ? `مؤشرات قطاع ${sectorName}` : ENGINE_META[eng].label,
  }));
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

// Builds the executive summary text, explicitly naming the weakest-performing dimension
// (whichever it is) rather than defaulting to a financial framing.
function buildSummaryText(diagnostics, engineList, form) {
  const weakest = [...engineList].sort((a, b) => diagnostics.engineScores[a.key] - diagnostics.engineScores[b.key])[0];
  const weakestScore = weakest ? Math.round(diagnostics.engineScores[weakest.key]) : null;
  const dimensionSentence = weakest
    ? `أظهر التشخيص متعدد الأبعاد (المالي، التشغيلي، التجاري، الرقمي${engineList.some(e => e.key === 'sector') ? '، وخصوصية القطاع' : ''}) أن الجانب الأكثر تأثرًا حاليًا هو "${weakest.label}" (${weakestScore}/100)، وهو ما يوجّه أولوية التوصيات أدناه دون إغفال بقية الأبعاد.`
    : '';
  return `بناءً على البيانات المقدَّمة، حصلت ${form.companyName} على مؤشر صحة مؤسسية إجمالي قدره ${diagnostics.healthScore} من 100، ما يصنَّف ضمن فئة "${diagnostics.riskBand.label}". ${dimensionSentence} تم رصد ${diagnostics.recommendations.length} توصية ذات أولوية تتطلب متابعة إدارية، مفصّلة أدناه. المستشار المسؤول عن اعتماد هذا التقرير: ${form.consultant}.`;
}

function buildReportRTF(record) {
  const { form, diagnostics, certNumber, date } = record;
  const financials = deriveFinancials(toNumericForm(form));
  const engineList = buildEngineList(diagnostics, form.sector);
  let b = '';
  b += `{\\rtf1\\ansi\\ansicpg1256\\deff0\\deflang1025\\deflangfe1025\n`;
  b += `{\\fonttbl{\\f0\\fswiss\\fcharset178\\fprq2 Arial;}}\n`;
  b += `{\\colortbl;\\red19\\green34\\blue60;\\red169\\green129\\blue74;\\red84\\green103\\blue127;\\red156\\green68\\blue50;\\red63\\green107\\blue82;\\red185\\green132\\blue48;\\red221\\green213\\blue192;}\n`;
  b += `\\rtlpar\\rtlch\\lang1025\\f0\\fs22\n`;

  b += `{\\qc\\b\\fs20\\cf2 ${rtfEscape('VANTAGE  ·  فانتج للاستشارات')}\\par}\n`;
  b += `{\\qc\\b\\fs40\\cf1 ${rtfEscape('تقرير التشخيص والتوصيات')}\\par}\n`;
  b += `{\\qc\\fs22\\cf3 ${rtfEscape(`${form.companyName} · ${form.businessType} · ${form.sector}`)}\\par}\n`;
  if (form.periodStartDate || form.periodEndDate) {
    b += `{\\qc\\b\\fs19\\cf2 ${rtfEscape(`الفترة محل التحليل: من ${form.periodStartDate || '—'} إلى ${form.periodEndDate || '—'}`)}\\par}\n`;
  }
  b += `\\par\n`;
  b += `{\\qc\\fs18\\cf3 ${rtfEscape(`رقم الشهادة: ${certNumber}   |   تاريخ الإصدار: ${date}   |   المستشار المسؤول: ${form.consultant}`)}\\par}\n`;
  b += `{\\qc\\fs18\\cf7 ${rtfEscape('────────────────────────────────────────')}\\par}\n\\par\n`;

  b += `{\\b\\fs30\\cf1 ${rtfEscape('مؤشر الصحة المؤسسية: ')}${rtfEscape(String(diagnostics.healthScore))} / 100  —  ${rtfEscape(diagnostics.riskBand.label)}\\par}\n\\par\n`;

  b += `{\\b\\fs26\\cf1 ${rtfEscape('الملخص التنفيذي')}\\par}\n`;
  const summary = buildSummaryText(diagnostics, engineList, form);
  b += `{\\fs22\\cf1 ${rtfEscape(summary)}\\par}\n\\par\n`;

  if (form.notes) {
    b += `{\\i\\fs20\\cf3 ${rtfEscape('ملاحظات المستشار: ' + form.notes)}\\par}\n\\par\n`;
  }

  b += `{\\b\\fs26\\cf1 ${rtfEscape('القوائم المالية — قائمة الدخل')}\\par}\n`;
  b += rtfTableRow(['المبلغ (﷼)', 'البند'], [2200, 4300], { aligns: ['qc', 'qr'], bold: true, colors: [1, 1] });
  [
    ['الإيرادات', financials.currentRevenue], ['تكلفة البضاعة المباعة', -financials.cogs],
    ['إجمالي الربح', financials.grossProfit], ['المصاريف التشغيلية', -financials.operatingExpenses],
    ['EBITDA', financials.ebitda], ['الإهلاك والاستهلاك', -financials.depreciationAmortization],
    ['EBIT', financials.ebit], ['المصاريف التمويلية', -financials.interestExpense],
    ['الزكاة/الضريبة', -financials.taxExpense], ['صافي الربح', financials.netProfit],
  ].forEach(([label, val]) => {
    b += rtfTableRow([val.toLocaleString('ar'), label], [2200, 4300], { aligns: ['qc', 'qr'] });
  });
  b += `\\pard\\par\n`;

  b += `{\\b\\fs26\\cf1 ${rtfEscape('القوائم المالية — قائمة المركز المالي')}\\par}\n`;
  b += rtfTableRow(['المبلغ (﷼)', 'البند'], [2200, 4300], { aligns: ['qc', 'qr'], bold: true, colors: [1, 1] });
  [
    ['إجمالي الأصول المتداولة', financials.currentAssets], ['إجمالي الأصول غير المتداولة', financials.nonCurrentAssets],
    ['إجمالي الأصول', financials.totalAssets], ['إجمالي الالتزامات المتداولة', financials.currentLiabilities],
    ['إجمالي الالتزامات غير المتداولة', financials.nonCurrentLiabilities], ['إجمالي الالتزامات', financials.totalLiabilities],
    ['إجمالي حقوق الملكية', financials.totalEquity],
  ].forEach(([label, val]) => {
    b += rtfTableRow([val.toLocaleString('ar'), label], [2200, 4300], { aligns: ['qc', 'qr'] });
  });
  if (Math.abs(financials.balanceCheck) > 1) {
    b += `{\\fs18\\cf4 ${rtfEscape('⚠ فارق توازن محاسبي: ' + financials.balanceCheck.toLocaleString('ar') + ' ﷼')}\\par}\n`;
  }
  b += `\\pard\\par\n`;

  const pestelPairs = [
    ['سياسية', form.pestelPolitical], ['اقتصادية', form.pestelEconomic], ['اجتماعية', form.pestelSocial],
    ['تقنية', form.pestelTechnological], ['بيئية', form.pestelEnvironmental], ['نظامية/قانونية', form.pestelLegal],
  ].filter(([, v]) => v);
  if (pestelPairs.length) {
    b += `{\\b\\fs26\\cf1 ${rtfEscape('السياق الاستراتيجي — تحليل PESTEL')}\\par}\n`;
    pestelPairs.forEach(([label, val]) => {
      b += `{\\b\\fs20\\cf2 ${rtfEscape(label + ': ')}}{\\fs20\\cf1 ${rtfEscape(val)}\\par}\n`;
    });
    b += `\\par\n`;
  }

  const swotPairs = [
    ['نقاط القوة', form.swotStrengths], ['نقاط الضعف', form.swotWeaknesses],
    ['الفرص', form.swotOpportunities], ['التهديدات', form.swotThreats],
  ].filter(([, v]) => v);
  if (swotPairs.length) {
    b += `{\\b\\fs26\\cf1 ${rtfEscape('تحليل SWOT')}\\par}\n`;
    swotPairs.forEach(([label, val]) => {
      b += `{\\b\\fs20\\cf2 ${rtfEscape(label)}\\par}\n`;
      val.split('\n').filter(Boolean).forEach(line => {
        b += `{\\fs19\\cf1 ${rtfEscape('•  ' + line)}\\par}\n`;
      });
    });
    if (form.competitivePosition || form.mainCompetitors || form.competitiveAdvantage) {
      b += `\\par\n`;
      if (form.competitivePosition) b += `{\\b\\fs19\\cf2 ${rtfEscape('الموقع التنافسي: ')}}{\\fs19\\cf1 ${rtfEscape(form.competitivePosition)}\\par}\n`;
      if (form.mainCompetitors) b += `{\\b\\fs19\\cf2 ${rtfEscape('أبرز المنافسين: ')}}{\\fs19\\cf1 ${rtfEscape(form.mainCompetitors)}\\par}\n`;
      if (form.competitiveAdvantage) b += `{\\b\\fs19\\cf2 ${rtfEscape('الميزة التنافسية: ')}}{\\fs19\\cf1 ${rtfEscape(form.competitiveAdvantage)}\\par}\n`;
    }
    b += `\\par\n`;
  }

  b += `{\\b\\fs26\\cf1 ${rtfEscape('نتائج محركات التشخيص')}\\par}\n`;
  b += rtfTableRow(['النتيجة', 'المحرك'], [1500, 5000], { aligns: ['qc', 'qr'], bold: true, colors: [1, 1] });
  engineList.forEach(meta => {
    b += rtfTableRow([String(Math.round(diagnostics.engineScores[meta.key])), meta.label], [1500, 5000], { aligns: ['qc', 'qr'] });
  });
  b += `\\pard\\par\n\\par\n`;

  b += `{\\b\\fs26\\cf1 ${rtfEscape('تفصيل المؤشرات')}\\par}\n`;
  engineList.forEach(meta => {
    b += `{\\b\\fs22\\cf2 ${rtfEscape(meta.label)}\\par}\n`;
    b += rtfTableRow(['النتيجة', 'معيار القطاع', 'القيمة', 'المؤشر'], [1000, 1200, 1200, 3500], { aligns: ['qc', 'qc', 'qc', 'qr'], bold: true, colors: [1, 1, 1, 1] });
    diagnostics.kpis.filter(k => k.engine === meta.key).forEach(k => {
      const bench = k.benchmark !== undefined ? fmtNum(k.benchmark, k.unit) : '—';
      b += rtfTableRow([String(k.score), bench, fmtNum(k.value, k.unit), k.label], [1000, 1200, 1200, 3500], { aligns: ['qc', 'qc', 'qc', 'qr'] });
    });
    b += `\\pard\\par\n`;
  });

  if (diagnostics.managementMaturity) {
    b += `{\\b\\fs26\\cf1 ${rtfEscape('نضج الإدارة والقيادة (تقييم ذاتي)')}\\par}\n`;
    b += `{\\fs20\\cf1 ${rtfEscape('مؤشر الاستعداد الإداري: ' + diagnostics.managementMaturity.score + ' / 100')}\\par}\n`;
    diagnostics.managementMaturity.details.forEach(d => {
      b += `{\\fs19\\cf3 ${rtfEscape(`${d.label}: ${d.value}/5`)}\\par}\n`;
    });
    b += `\\par\n`;
  }

  if (diagnostics.rootCauseGroups && diagnostics.rootCauseGroups.length) {
    b += `{\\b\\fs26\\cf1 ${rtfEscape('تحليل الجذور — إطار عظم السمكة المعدَّل (6M)')}\\par}\n`;
    diagnostics.rootCauseGroups.forEach(g => {
      b += `{\\b\\fs20\\cf2 ${rtfEscape(g.label)}\\par}\n`;
      g.items.forEach(it => { b += `{\\fs19\\cf1 ${rtfEscape('•  ' + it.label + ' (النتيجة: ' + it.score + ')')}\\par}\n`; });
    });
    b += `\\par\n`;
  }

  if (diagnostics.scenarios) {
    b += `{\\b\\fs26\\cf1 ${rtfEscape('تحليل السيناريوهات (أفق 12 شهرًا)')}\\par}\n`;
    [diagnostics.scenarios.worst, diagnostics.scenarios.expected, diagnostics.scenarios.best].forEach(s => {
      b += `{\\b\\fs20\\cf2 ${rtfEscape(s.label)}\\par}\n`;
      b += `{\\fs19\\cf1 ${rtfEscape(`نمو الإيرادات: ${Math.round(s.growth*10)/10}%   |   الإيراد المتوقع: ${s.revenue.toLocaleString('ar')} ﷼   |   مؤشر الصحة: ${s.healthScore}/100`)}\\par}\n`;
    });
    b += `\\par\n`;
  }

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

  b += `{\\b\\fs26\\cf1 ${rtfEscape('ملحق — قاموس المؤشرات')}\\par}\n`;
  diagnostics.kpis.filter(k => KPI_GLOSSARY[k.id]).forEach(k => {
    b += `{\\b\\fs19\\cf1 ${rtfEscape(k.label)}\\par}\n`;
    b += `{\\fs18\\cf3 ${rtfEscape(KPI_GLOSSARY[k.id].def)}\\par}\n`;
    b += `{\\fs17\\cf7 ${rtfEscape(KPI_GLOSSARY[k.id].formula)}\\par}\n\\par\n`;
  });

  b += `{\\fs18\\cf7 ${rtfEscape('────────────────────────────────────────')}\\par}\n`;
  b += `{\\fs16\\cf3 ${rtfEscape('هذا التقرير سري ومُعَدّ حصريًا لصالح ' + form.companyName + '. جميع الحقوق محفوظة لمكتب فانتج للاستشارات.')}\\par}\n`;
  b += `{\\fs16\\cf3 ${rtfEscape(`أُعِدَّ بواسطة: ${form.consultant}   |   ${date}`)}\\par}\n`;
  b += `}`;
  return b;
}

function downloadReportRTF(record) {
  try {
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
  } catch (err) {
    console.error('Word export failed:', err);
    alert('تعذر تصدير التقرير إلى Word: ' + (err && err.message ? err.message : 'خطأ غير معروف'));
  }
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

/* ---- Session persistence (personal, per-browser artifact storage — NOT localStorage) ---- */
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

function FishboneDiagram({ groups, riskLabel }) {
  const width = 760, height = 320, spineY = 160;
  const spineStart = 50, spineEnd = 640;
  const n = groups.length;
  const usable = spineEnd - spineStart - 60;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: 760 }}>
      {/* spine */}
      <line x1={spineStart} y1={spineY} x2={spineEnd} y2={spineY} stroke={C.ink} strokeWidth="2.5" />
      <polygon points={`${spineEnd},${spineY-8} ${spineEnd+22},${spineY} ${spineEnd},${spineY+8}`} fill={C.ink} />
      <rect x={spineEnd + 24} y={spineY - 24} width={90} height={48} rx={8} fill={C.brick} opacity="0.1" stroke={C.brick} />
      <text x={spineEnd + 69} y={spineY - 4} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={C.brick} fontFamily="'IBM Plex Sans Arabic'">النتيجة</text>
      <text x={spineEnd + 69} y={spineY + 12} textAnchor="middle" fontSize="9.5" fill={C.brick} fontFamily="'IBM Plex Sans Arabic'">{riskLabel}</text>

      {groups.map((g, i) => {
        const top = i % 2 === 0;
        const x = spineStart + 50 + (usable / Math.max(1, n - 1 || 1)) * i;
        const boneY = top ? spineY - 70 : spineY + 70;
        const boneX = x - 45;
        return (
          <g key={g.label}>
            <line x1={x} y1={spineY} x2={boneX} y2={boneY} stroke={C.brass} strokeWidth="2" />
            <text x={boneX} y={top ? boneY - 10 : boneY + 18} textAnchor="middle" fontSize="11" fontWeight="700" fill={C.ink} fontFamily="'Noto Kufi Arabic'">{g.label}</text>
            {g.items.slice(0, 3).map((it, j) => (
              <text key={j} x={boneX} y={(top ? boneY - 24 : boneY + 32) + (top ? -j*13 : j*13)} textAnchor="middle" fontSize="9" fill={C.steel} fontFamily="'IBM Plex Sans Arabic'">{it.label}</text>
            ))}
          </g>
        );
      })}
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

function HintIcon({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button" onClick={() => setOpen(o => !o)}
        style={{
          width: 15, height: 15, borderRadius: 99, border: `1px solid ${C.steel}`, background: 'transparent',
          color: C.steel, fontSize: 9.5, lineHeight: '13px', cursor: 'pointer', padding: 0, marginRight: 5, verticalAlign: 'middle',
        }}
        aria-label="توضيح الحقل"
      >
        ⓘ
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
          <div style={{
            position: 'absolute', zIndex: 31, top: 20, insetInlineStart: 0, width: 210,
            background: C.ink, color: '#EFEFEF', padding: 10, borderRadius: 9, fontSize: 11.5, lineHeight: 1.7,
            boxShadow: '0 10px 26px rgba(0,0,0,0.3)', textAlign: 'right',
          }}>
            {text}
          </div>
        </>
      )}
    </span>
  );
}

function Field({ label, unit, value, onChange, type = 'number', placeholder, span, hint }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: span ? `span ${span}` : undefined }}>
      <span style={{ fontSize: 13, color: C.steel, fontWeight: 500 }}>{hint && <HintIcon text={hint} />}{label}{unit ? ` (${unit})` : ''}</span>
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

function TextAreaField({ label, value, onChange, placeholder, span, rows = 3 }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: span ? `span ${span}` : undefined }}>
      <span style={{ fontSize: 13, color: C.steel, fontWeight: 500 }}>{label}</span>
      <textarea
        rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          border: `1.5px solid ${C.line}`, borderRadius: 10, padding: '10px 12px', fontSize: 14,
          fontFamily: "'IBM Plex Sans Arabic'", background: C.card, color: C.ink, outline: 'none', resize: 'vertical',
        }}
      />
    </label>
  );
}

function RatingField({ label, value, onChange, span }) {
  const n = Number(value) || 0;
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: span ? `span ${span}` : undefined }}>
      <span style={{ fontSize: 13, color: C.steel, fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <button key={i} type="button" onClick={() => onChange(String(i))}
            style={{
              flex: 1, height: 38, borderRadius: 9, border: `1.5px solid ${i <= n ? C.brass : C.line}`,
              background: i <= n ? C.brass : C.card, color: i <= n ? C.ink : C.steel, fontWeight: 700, fontSize: 13,
              cursor: 'pointer', fontFamily: "'IBM Plex Sans Arabic'",
            }}>
            {i}
          </button>
        ))}
      </div>
    </label>
  );
}

function InfoIcon({ kpiId }) {
  const [open, setOpen] = useState(false);
  const g = KPI_GLOSSARY[kpiId];
  if (!g) return null;
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button" onClick={() => setOpen(o => !o)}
        style={{
          width: 15, height: 15, borderRadius: 99, border: `1px solid ${C.steel}`, background: 'transparent',
          color: C.steel, fontSize: 9.5, lineHeight: '13px', cursor: 'pointer', padding: 0, marginRight: 5, verticalAlign: 'middle',
        }}
        aria-label="تعريف المؤشر"
      >
        ⓘ
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
          <div style={{
            position: 'absolute', zIndex: 31, top: 20, insetInlineEnd: 0, width: 230,
            background: C.ink, color: '#EFEFEF', padding: 12, borderRadius: 10, fontSize: 11.5, lineHeight: 1.7,
            boxShadow: '0 10px 26px rgba(0,0,0,0.3)', textAlign: 'right',
          }}>
            <div style={{ marginBottom: g.formula ? 6 : 0 }}>{g.def}</div>
            {g.formula && <div style={{ opacity: 0.75, fontSize: 10.5, fontFamily: 'monospace', direction: 'ltr', textAlign: 'left' }}>{g.formula}</div>}
          </div>
        </>
      )}
    </span>
  );
}

function ComputedField({ label, value, unit = '﷼', warn }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 13, color: C.steel, fontWeight: 500 }}>{label}</span>
      <div style={{
        border: `1.5px dashed ${warn ? C.brick : C.brass}`, borderRadius: 10, padding: '10px 12px', fontSize: 14,
        fontFamily: "'IBM Plex Sans Arabic'", background: warn ? `${C.brick}0D` : `${C.brass}0D`,
        color: warn ? C.brick : C.ink, fontWeight: 700,
      }}>
        {typeof value === 'number' ? value.toLocaleString('ar') : value}{unit ? ` ${unit}` : ''}
      </div>
    </div>
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
    // Reporting period — explicit date range for the analysis (addresses "what period is this?")
    periodStartDate: '', periodEndDate: '',
    // Income statement (full P&L waterfall) — netProfit/grossProfit/ebitda are computed, not entered
    currentRevenue: '', previousRevenue: '', cogs: '',
    sellingExpenses: '', adminExpenses: '', depreciationAmortization: '', interestExpense: '', taxExpense: '',
    // Balance sheet — currentAssets/currentLiabilities/totalLiabilities/totalEquity are computed, not entered
    cashAndEquivalents: '', accountsReceivable: '', inventoryValue: '', otherCurrentAssets: '',
    ppeNet: '', otherNonCurrentAssets: '',
    accountsPayable: '', shortTermDebt: '', otherCurrentLiabilities: '',
    longTermDebt: '', otherNonCurrentLiabilities: '',
    paidInCapital: '', retainedEarnings: '', otherEquity: '',
    avgInventoryValue: '', onTimeFulfillmentPct: '', capacityUtilizationPct: '', employeeCount: '', employeeTurnoverPct: '',
    retentionRatePct: '', cac: '', avgDealValue: '', npsScore: '', salesPipelineConversionPct: '',
    conversionRatePct: '', cartAbandonmentPct: '', digitalCac: '', ltv: '', digitalTrafficGrowthPct: '', digitalRevenueSharePct: '',
    // Strategic & qualitative diagnostic module
    swotStrengths: '', swotWeaknesses: '', swotOpportunities: '', swotThreats: '',
    pestelPolitical: '', pestelEconomic: '', pestelSocial: '', pestelTechnological: '', pestelEnvironmental: '', pestelLegal: '',
    mainCompetitors: '', competitivePosition: '', competitiveAdvantage: '',
    mgmtVisionClarity: '', mgmtInfoSystems: '', mgmtLeadershipStrength: '', mgmtGovernanceQuality: '',
  };
  ALL_SECTOR_FIELD_IDS.forEach(id => { base[id] = ''; });
  return base;
};

const TEXT_FIELD_KEYS = [
  'companyName', 'sector', 'businessType', 'contactPerson', 'contactPhone', 'consultant', 'notes',
  'periodStartDate', 'periodEndDate',
  'swotStrengths', 'swotWeaknesses', 'swotOpportunities', 'swotThreats',
  'pestelPolitical', 'pestelEconomic', 'pestelSocial', 'pestelTechnological', 'pestelEnvironmental', 'pestelLegal',
  'mainCompetitors', 'competitivePosition', 'competitiveAdvantage',
];

const NUMERIC_KEYS = Object.keys(emptyForm()).filter(k => !TEXT_FIELD_KEYS.includes(k));

/* =========================================================================
   Intake Wizard
   ========================================================================= */
function IntakeWizard({ onCancel, onSubmit, saving, error, defaultConsultant }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => emptyForm(defaultConsultant));
  const set = (k) => (v) => setForm(prev => ({ ...prev, [k]: v }));

  const sectorDefs = SECTOR_KPI_DEFS[form.sector] || [];
  const steps = ['بيانات الشركة', 'قائمة الدخل', 'قائمة المركز المالي', 'البيانات التشغيلية', 'البيانات التجارية', 'البيانات الرقمية',
    'SWOT وPESTEL', 'الموقع التنافسي ونضج الإدارة',
    ...(sectorDefs.length ? [`مؤشرات ${form.sector}`] : []), 'المراجعة والإرسال'];
  const sectorStepIndex = sectorDefs.length ? 8 : -1;
  const reviewStepIndex = steps.length - 1;

  const numericForm = useMemo(() => deriveFinancials(toNumericForm(form)), [form]);

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
          <Field label="بداية الفترة المالية محل التحليل" type="date" value={form.periodStartDate} onChange={set('periodStartDate')} />
          <Field label="نهاية الفترة المالية محل التحليل" type="date" value={form.periodEndDate} onChange={set('periodEndDate')} />
        </SectionCard>
      )}

      {step === 1 && (
        <SectionCard icon={Wallet} title="قائمة الدخل" subtitle="بنود فترة التحليل المحددة أعلاه (بالريال السعودي) — الأرباح تُحتسب تلقائيًا" accent={C.ink}>
          <Field label="الإيرادات (فترة التحليل الحالية)" unit="﷼" value={form.currentRevenue} onChange={set('currentRevenue')} />
          <Field label="الإيرادات (نفس الفترة، العام السابق)" unit="﷼" value={form.previousRevenue} onChange={set('previousRevenue')} />
          <Field label="تكلفة البضاعة المباعة (COGS)" unit="﷼" value={form.cogs} onChange={set('cogs')} hint="التكلفة المباشرة لإنتاج أو شراء ما تم بيعه فعليًا (المواد الخام، الشراء بالجملة) — لا تشمل مصاريف الإدارة أو التسويق." />
          <ComputedField label="إجمالي الربح (محتسب)" value={numericForm.grossProfit} />
          <Field label="مصاريف بيعية وتسويقية" unit="﷼" value={form.sellingExpenses} onChange={set('sellingExpenses')} hint="تكاليف الإعلانات، العمولات، رواتب فريق المبيعات، وأي مصروف مرتبط مباشرة ببيع المنتج أو الخدمة." />
          <Field label="مصاريف إدارية وعمومية" unit="﷼" value={form.adminExpenses} onChange={set('adminExpenses')} hint="رواتب الإدارة، الإيجار، الكهرباء، المصاريف المكتبية — التكاليف الثابتة لتشغيل المنشأة بغض النظر عن حجم المبيعات." />
          <ComputedField label="EBITDA (محتسب)" value={numericForm.ebitda} />
          <Field label="الإهلاك والاستهلاك" unit="﷼" value={form.depreciationAmortization} onChange={set('depreciationAmortization')} hint="القيمة المحاسبية لاستهلاك الأصول الثابتة (معدات، مباني) والأصول غير الملموسة خلال الفترة — ليست مصروفًا نقديًا فعليًا." />
          <ComputedField label="EBIT (محتسب)" value={numericForm.ebit} />
          <Field label="المصاريف التمويلية (الفوائد)" unit="﷼" value={form.interestExpense} onChange={set('interestExpense')} hint="فوائد القروض والتمويل البنكي المدفوعة خلال الفترة." />
          <Field label="الزكاة / الضريبة" unit="﷼" value={form.taxExpense} onChange={set('taxExpense')} hint="إجمالي الزكاة الشرعية وضريبة الدخل والقيمة المضافة المستحقة على أرباح الفترة." />
          <ComputedField label="صافي الربح (محتسب)" value={numericForm.netProfit} />
        </SectionCard>
      )}

      {step === 2 && (
        <>
          <SectionCard icon={Wallet} title="الأصول" subtitle="قائمة المركز المالي — جانب الأصول" accent={C.steel}>
            <Field label="النقد وما في حكمه" unit="﷼" value={form.cashAndEquivalents} onChange={set('cashAndEquivalents')} />
            <Field label="الذمم المدينة" unit="﷼" value={form.accountsReceivable} onChange={set('accountsReceivable')} hint="المبالغ المستحقة للمنشأة من العملاء مقابل مبيعات آجلة لم تُحصَّل بعد." />
            <Field label="المخزون (آخر الفترة)" unit="﷼" value={form.inventoryValue} onChange={set('inventoryValue')} />
            <Field label="أصول متداولة أخرى" unit="﷼" value={form.otherCurrentAssets} onChange={set('otherCurrentAssets')} />
            <ComputedField label="إجمالي الأصول المتداولة (محتسب)" value={numericForm.currentAssets} />
            <Field label="الممتلكات والمعدات (صافي)" unit="﷼" value={form.ppeNet} onChange={set('ppeNet')} hint="القيمة الدفترية للمباني والمعدات والأصول الثابتة بعد خصم الإهلاك المتراكم." />
            <Field label="أصول غير متداولة أخرى" unit="﷼" value={form.otherNonCurrentAssets} onChange={set('otherNonCurrentAssets')} />
            <ComputedField label="إجمالي الأصول (محتسب)" value={numericForm.totalAssets} />
          </SectionCard>
          <SectionCard icon={Wallet} title="الالتزامات وحقوق الملكية" subtitle="قائمة المركز المالي — جانب الالتزامات وحقوق الملكية" accent={C.brick}>
            <Field label="الذمم الدائنة" unit="﷼" value={form.accountsPayable} onChange={set('accountsPayable')} />
            <Field label="قروض قصيرة الأجل" unit="﷼" value={form.shortTermDebt} onChange={set('shortTermDebt')} />
            <Field label="التزامات متداولة أخرى" unit="﷼" value={form.otherCurrentLiabilities} onChange={set('otherCurrentLiabilities')} />
            <ComputedField label="إجمالي الالتزامات المتداولة (محتسب)" value={numericForm.currentLiabilities} />
            <Field label="قروض طويلة الأجل" unit="﷼" value={form.longTermDebt} onChange={set('longTermDebt')} />
            <Field label="التزامات غير متداولة أخرى" unit="﷼" value={form.otherNonCurrentLiabilities} onChange={set('otherNonCurrentLiabilities')} />
            <ComputedField label="إجمالي الالتزامات (محتسب)" value={numericForm.totalLiabilities} />
            <Field label="رأس المال المدفوع" unit="﷼" value={form.paidInCapital} onChange={set('paidInCapital')} />
            <Field label="الأرباح المُبقاة" unit="﷼" value={form.retainedEarnings} onChange={set('retainedEarnings')} />
            <Field label="بنود حقوق ملكية أخرى" unit="﷼" value={form.otherEquity} onChange={set('otherEquity')} />
            <ComputedField label="إجمالي حقوق الملكية (محتسب)" value={numericForm.totalEquity} />
            <ComputedField
              label="فحص التوازن المحاسبي (الأصول − الالتزامات − حقوق الملكية)"
              value={numericForm.balanceCheck}
              warn={Math.abs(numericForm.balanceCheck) > 1}
            />
          </SectionCard>
          {Math.abs(numericForm.balanceCheck) > 1 && (
            <div style={{ background: `${C.brick}0D`, border: `1px solid ${C.brick}30`, borderRadius: 10, padding: 12, fontSize: 12.5, color: C.brick, marginTop: -10, marginBottom: 20 }}>
              ⚠️ قائمة المركز المالي غير متوازنة (الفارق: {numericForm.balanceCheck.toLocaleString('ar')} ﷼). راجع بنود الأصول والالتزامات وحقوق الملكية قبل المتابعة.
            </div>
          )}
        </>
      )}

      {step === 3 && (
        <SectionCard icon={Factory} title="البيانات التشغيلية" subtitle="مؤشرات المخزون والعمليات والطاقة الإنتاجية والقوى العاملة" accent={C.steel}>
          <Field label="متوسط قيمة المخزون خلال الفترة" unit="﷼" value={form.avgInventoryValue} onChange={set('avgInventoryValue')} />
          <Field label="نسبة التسليم في الوقت المحدد" unit="%" value={form.onTimeFulfillmentPct} onChange={set('onTimeFulfillmentPct')} />
          <Field label="نسبة استغلال الطاقة التشغيلية" unit="%" value={form.capacityUtilizationPct} onChange={set('capacityUtilizationPct')} />
          <Field label="عدد الموظفين" value={form.employeeCount} onChange={set('employeeCount')} unit="موظف" />
          <Field label="معدل دوران الموظفين خلال الفترة" unit="%" value={form.employeeTurnoverPct} onChange={set('employeeTurnoverPct')} hint="نسبة الموظفين الذين تركوا العمل (استقالة أو إنهاء خدمة) خلال الفترة من إجمالي عدد الموظفين." />
        </SectionCard>
      )}

      {step === 4 && (
        <SectionCard icon={ShoppingCart} title="البيانات التجارية" subtitle="مؤشرات المبيعات والعملاء وولاء العملاء" accent={C.brass}>
          <Field label="معدل الاحتفاظ بالعملاء" unit="%" value={form.retentionRatePct} onChange={set('retentionRatePct')} />
          <Field label="تكلفة اكتساب العميل (CAC)" unit="﷼" value={form.cac} onChange={set('cac')} hint="متوسط ما تنفقه المنشأة (تسويق + مبيعات) للحصول على عميل جديد واحد." />
          <Field label="متوسط قيمة الصفقة" unit="﷼" value={form.avgDealValue} onChange={set('avgDealValue')} hint="متوسط قيمة الصفقة أو الطلب الواحد للعميل." />
          <Field label="صافي نقاط الترويج (NPS، من -100 إلى 100)" value={form.npsScore} onChange={set('npsScore')} unit="" hint="من استبيان بسيط: نسبة العملاء الذين قد يوصون بكم لغيرهم مطروحًا منها نسبة غير الراضين. صفر يعني تعادل، وأي رقم موجب يعني ولاء أعلى." />
          <Field label="معدل تحويل الفرص البيعية إلى صفقات" unit="%" value={form.salesPipelineConversionPct} onChange={set('salesPipelineConversionPct')} hint="من كل 100 عميل محتمل تواصل معكم فريق المبيعات، كم منهم أصبح عميلاً فعليًا؟" />
        </SectionCard>
      )}

      {step === 5 && (
        <SectionCard icon={Monitor} title="البيانات الرقمية" subtitle="مؤشرات القنوات الرقمية والتجارة الإلكترونية (اتركها صفرًا إن لم تنطبق)" accent={C.sage}>
          <Field label="معدل التحويل الرقمي" unit="%" value={form.conversionRatePct} onChange={set('conversionRatePct')} />
          <Field label="نسبة التخلي عن سلة الشراء" unit="%" value={form.cartAbandonmentPct} onChange={set('cartAbandonmentPct')} />
          <Field label="تكلفة الاكتساب الرقمي" unit="﷼" value={form.digitalCac} onChange={set('digitalCac')} hint="متوسط تكلفة اكتساب عميل واحد عبر القنوات الرقمية تحديدًا (إعلانات، حملات إلكترونية)." />
          <Field label="القيمة الدائمة للعميل (LTV)" unit="﷼" value={form.ltv} onChange={set('ltv')} hint="إجمالي ما يُتوقَّع أن ينفقه العميل الواحد لدى منشأتكم طوال فترة تعامله معكم، وليس في عملية شراء واحدة." />
          <Field label="نمو الزيارات الرقمية مقارنة بالفترة السابقة" unit="%" value={form.digitalTrafficGrowthPct} onChange={set('digitalTrafficGrowthPct')} />
          <Field label="نسبة الإيرادات الرقمية من إجمالي الإيرادات" unit="%" value={form.digitalRevenueSharePct} onChange={set('digitalRevenueSharePct')} />
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

      {step === 6 && (
        <>
          <SectionCard icon={ClipboardList} title="تحليل SWOT" subtitle="نقطة لكل سطر — تُعرض في التقرير كقائمة" accent={C.ink}>
            <TextAreaField label="نقاط القوة" value={form.swotStrengths} onChange={set('swotStrengths')} span={1} placeholder={'مثال:\nعلامة تجارية معروفة محليًا\nفريق مبيعات متمرس'} />
            <TextAreaField label="نقاط الضعف" value={form.swotWeaknesses} onChange={set('swotWeaknesses')} span={1} placeholder={'مثال:\nاعتماد كبير على عميل واحد\nضعف الأنظمة الرقمية'} />
            <TextAreaField label="الفرص" value={form.swotOpportunities} onChange={set('swotOpportunities')} span={1} placeholder={'مثال:\nنمو الطلب في القطاع\nفرص تصدير إقليمية'} />
            <TextAreaField label="التهديدات" value={form.swotThreats} onChange={set('swotThreats')} span={1} placeholder={'مثال:\nدخول منافسين جدد\nتقلب أسعار المواد الخام'} />
          </SectionCard>
          <SectionCard icon={Layers} title="تحليل PESTEL" subtitle="العوامل الخارجية المؤثرة على القطاع والمنشأة" accent={C.steel}>
            <TextAreaField label="سياسية (Political)" value={form.pestelPolitical} onChange={set('pestelPolitical')} rows={2} />
            <TextAreaField label="اقتصادية (Economic)" value={form.pestelEconomic} onChange={set('pestelEconomic')} rows={2} />
            <TextAreaField label="اجتماعية (Social)" value={form.pestelSocial} onChange={set('pestelSocial')} rows={2} />
            <TextAreaField label="تقنية (Technological)" value={form.pestelTechnological} onChange={set('pestelTechnological')} rows={2} />
            <TextAreaField label="بيئية (Environmental)" value={form.pestelEnvironmental} onChange={set('pestelEnvironmental')} rows={2} />
            <TextAreaField label="نظامية/قانونية (Legal)" value={form.pestelLegal} onChange={set('pestelLegal')} rows={2} />
          </SectionCard>
        </>
      )}

      {step === 7 && (
        <>
          <SectionCard icon={ShoppingCart} title="الموقع التنافسي" subtitle="نظرة السوق التنافسية" accent={C.brass}>
            <TextAreaField label="أبرز المنافسين" value={form.mainCompetitors} onChange={set('mainCompetitors')} rows={2} span={2} placeholder="أسماء 2-3 منافسين رئيسيين" />
            <SelectField label="الموقع التنافسي الحالي" value={form.competitivePosition} onChange={set('competitivePosition')}
              options={['رائد السوق', 'منافس قوي', 'لاعب متوسط', 'متخصص (Niche)']} />
            <TextAreaField label="الميزة التنافسية الأساسية" value={form.competitiveAdvantage} onChange={set('competitiveAdvantage')} rows={2} span={3} />
          </SectionCard>
          <SectionCard icon={ShieldCheck} title="نضج الإدارة والقيادة" subtitle="تقييم ذاتي من 1 (ضعيف) إلى 5 (ممتاز) — يُعرض كمؤشر استعداد إداري منفصل" accent={C.ink}>
            <RatingField label="وضوح الرؤية الاستراتيجية" value={form.mgmtVisionClarity} onChange={set('mgmtVisionClarity')} />
            <RatingField label="جودة نظم المعلومات الإدارية" value={form.mgmtInfoSystems} onChange={set('mgmtInfoSystems')} />
            <RatingField label="قوة الفريق القيادي" value={form.mgmtLeadershipStrength} onChange={set('mgmtLeadershipStrength')} />
            <RatingField label="جودة الحوكمة الداخلية" value={form.mgmtGovernanceQuality} onChange={set('mgmtGovernanceQuality')} />
          </SectionCard>
        </>
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

      {error && (
        <div style={{ background: `${C.brick}0D`, border: `1px solid ${C.brick}30`, borderRadius: 10, padding: 14, fontSize: 13, color: C.brick, marginTop: 20 }}>
          ⚠️ {error}
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
  const financials = deriveFinancials(toNumericForm(form));
  const engineList = buildEngineList(diagnostics, form.sector);
  const chartData = engineList.map(meta => ({
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
            {(form.periodStartDate || form.periodEndDate) && (
              <div style={{ display: 'inline-block', marginTop: 10, background: `${C.brass}15`, color: C.brassDeep, fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20 }}>
                الفترة محل التحليل: من {form.periodStartDate || '—'} إلى {form.periodEndDate || '—'}
              </div>
            )}
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
              {(() => {
                const weakest = [...engineList].sort((a, b) => diagnostics.engineScores[a.key] - diagnostics.engineScores[b.key])[0];
                return weakest ? (
                  <> أظهر التشخيص متعدد الأبعاد أن الجانب الأكثر تأثرًا حاليًا هو «<strong style={{ color: C.brick }}>{weakest.label}</strong>»
                  ({Math.round(diagnostics.engineScores[weakest.key])}/100)، دون إغفال بقية الأبعاد الموضحة أدناه.</>
                ) : null;
              })()}
              {' '}تم رصد <strong>{diagnostics.recommendations.length}</strong> توصية ذات أولوية تتطلب متابعة إدارية،
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

        {/* Financial statements — full P&L waterfall and balance sheet */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "'Noto Kufi Arabic'", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 14 }}>القوائم المالية</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.brass, marginBottom: 8 }}>قائمة الدخل</div>
              {[
                ['الإيرادات', financials.currentRevenue, false],
                ['تكلفة البضاعة المباعة', -financials.cogs, false],
                ['إجمالي الربح', financials.grossProfit, true],
                ['المصاريف التشغيلية', -financials.operatingExpenses, false],
                ['EBITDA', financials.ebitda, true],
                ['الإهلاك والاستهلاك', -financials.depreciationAmortization, false],
                ['EBIT', financials.ebit, true],
                ['المصاريف التمويلية', -financials.interestExpense, false],
                ['الزكاة/الضريبة', -financials.taxExpense, false],
                ['صافي الربح', financials.netProfit, true],
              ].map(([label, val, bold]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: bold ? `1.5px solid ${C.ink}` : `1px dashed ${C.line}`, fontSize: 12.5, fontWeight: bold ? 700 : 400, color: bold ? C.ink : C.inkSoft }}>
                  <span>{label}</span><span>{val.toLocaleString('ar')} ﷼</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.steel, marginBottom: 8 }}>قائمة المركز المالي</div>
              {[
                ['إجمالي الأصول المتداولة', financials.currentAssets, false],
                ['إجمالي الأصول غير المتداولة', financials.nonCurrentAssets, false],
                ['إجمالي الأصول', financials.totalAssets, true],
                ['إجمالي الالتزامات المتداولة', financials.currentLiabilities, false],
                ['إجمالي الالتزامات غير المتداولة', financials.nonCurrentLiabilities, false],
                ['إجمالي الالتزامات', financials.totalLiabilities, true],
                ['إجمالي حقوق الملكية', financials.totalEquity, true],
              ].map(([label, val, bold]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: bold ? `1.5px solid ${C.ink}` : `1px dashed ${C.line}`, fontSize: 12.5, fontWeight: bold ? 700 : 400, color: bold ? C.ink : C.inkSoft }}>
                  <span>{label}</span><span>{val.toLocaleString('ar')} ﷼</span>
                </div>
              ))}
              {Math.abs(financials.balanceCheck) > 1 && (
                <div style={{ marginTop: 10, fontSize: 11.5, color: C.brick }}>⚠️ فارق توازن محاسبي: {financials.balanceCheck.toLocaleString('ar')} ﷼</div>
              )}
            </div>
          </div>
        </div>

        {/* Strategic context — PESTEL */}
        {(form.pestelPolitical || form.pestelEconomic || form.pestelSocial || form.pestelTechnological || form.pestelEnvironmental || form.pestelLegal) && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "'Noto Kufi Arabic'", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 14 }}>السياق الاستراتيجي — تحليل PESTEL</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                ['سياسية', form.pestelPolitical], ['اقتصادية', form.pestelEconomic], ['اجتماعية', form.pestelSocial],
                ['تقنية', form.pestelTechnological], ['بيئية', form.pestelEnvironmental], ['نظامية/قانونية', form.pestelLegal],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label} style={{ background: C.paper, borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.brass, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SWOT */}
        {(form.swotStrengths || form.swotWeaknesses || form.swotOpportunities || form.swotThreats) && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "'Noto Kufi Arabic'", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 14 }}>تحليل SWOT</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['نقاط القوة', form.swotStrengths, C.sage], ['نقاط الضعف', form.swotWeaknesses, C.brick],
                ['الفرص', form.swotOpportunities, C.brass], ['التهديدات', form.swotThreats, C.amber],
              ].map(([label, val, color]) => (
                <div key={label} style={{ background: `${color}0D`, border: `1px solid ${color}30`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color, marginBottom: 6 }}>{label}</div>
                  {val ? (
                    <ul style={{ margin: 0, paddingRight: 18, fontSize: 12.5, color: C.inkSoft, lineHeight: 1.9 }}>
                      {val.split('\n').filter(Boolean).map((line, i) => <li key={i}>{line}</li>)}
                    </ul>
                  ) : <div style={{ fontSize: 12, color: C.steel }}>لا يوجد إدخال</div>}
                </div>
              ))}
            </div>
            {(form.mainCompetitors || form.competitivePosition || form.competitiveAdvantage) && (
              <div style={{ marginTop: 12, background: C.paper, borderRadius: 10, padding: 14, fontSize: 12.5, color: C.inkSoft, lineHeight: 1.9 }}>
                {form.competitivePosition && <div><strong style={{ color: C.ink }}>الموقع التنافسي: </strong>{form.competitivePosition}</div>}
                {form.mainCompetitors && <div><strong style={{ color: C.ink }}>أبرز المنافسين: </strong>{form.mainCompetitors}</div>}
                {form.competitiveAdvantage && <div><strong style={{ color: C.ink }}>الميزة التنافسية: </strong>{form.competitiveAdvantage}</div>}
              </div>
            )}
          </div>
        )}

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
          {engineList.map(meta => (
            <div key={meta.key} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <meta.icon size={15} color={meta.color} />
                <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{meta.label}</span>
                <span style={{ fontSize: 12, color: C.steel }}>— {Math.round(diagnostics.engineScores[meta.key])}/100</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1.5px solid ${C.line}` }}>
                    <th style={{ padding: '6px', textAlign: 'right', fontSize: 11, color: C.steel, fontWeight: 600 }}>المؤشر</th>
                    <th style={{ padding: '6px', fontSize: 11, color: C.steel, fontWeight: 600 }}>القيمة</th>
                    <th style={{ padding: '6px', fontSize: 11, color: C.steel, fontWeight: 600 }}>معيار القطاع</th>
                    <th style={{ padding: '6px', fontSize: 11, color: C.steel, fontWeight: 600 }}></th>
                    <th style={{ padding: '6px', fontSize: 11, color: C.steel, fontWeight: 600 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {diagnostics.kpis.filter(k => k.engine === meta.key).map(k => (
                    <tr key={k.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                      <td style={{ padding: '8px 6px', color: C.inkSoft }}><InfoIcon kpiId={k.id} />{k.label}</td>
                      <td style={{ padding: '8px 6px', fontWeight: 600, color: C.ink, width: 80 }}>{fmtNum(k.value, k.unit)}</td>
                      <td style={{ padding: '8px 6px', width: 80, color: C.steel }}>{k.benchmark !== undefined ? fmtNum(k.benchmark, k.unit) : '—'}</td>
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

        {/* Management readiness */}
        {diagnostics.managementMaturity && (
          <div style={{ marginBottom: 32, display: 'grid', gridTemplateColumns: '150px 1fr', gap: 24, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Gauge score={diagnostics.managementMaturity.score} color={C.brass} size={120} />
              <div style={{ fontSize: 11.5, fontWeight: 600, color: C.brass, marginTop: 4, textAlign: 'center' }}>استعداد الإدارة والقيادة</div>
            </div>
            <div>
              <div style={{ fontFamily: "'Noto Kufi Arabic'", fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 8 }}>نضج الإدارة (مؤشر منفصل — تقييم ذاتي)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {diagnostics.managementMaturity.details.map(d => (
                  <div key={d.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: C.inkSoft, background: C.paper, borderRadius: 8, padding: '6px 10px' }}>
                    <span>{d.label}</span><strong style={{ color: C.ink }}>{d.value}/5</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Root cause analysis — fishbone */}
        {diagnostics.rootCauseGroups && diagnostics.rootCauseGroups.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "'Noto Kufi Arabic'", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 6 }}>تحليل الجذور — إطار عظم السمكة المعدَّل (6M)</div>
            <div style={{ fontSize: 12, color: C.steel, marginBottom: 14 }}>تصنيف نقاط الضعف المكتشفة حسب فئة السبب الجذري المحتمل</div>
            <div style={{ overflowX: 'auto' }}>
              <FishboneDiagram groups={diagnostics.rootCauseGroups} riskLabel={diagnostics.riskBand.label} />
            </div>
          </div>
        )}

        {/* Scenario analysis */}
        {diagnostics.scenarios && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "'Noto Kufi Arabic'", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 6 }}>تحليل السيناريوهات (أفق 12 شهرًا)</div>
            <div style={{ fontSize: 11.5, color: C.steel, marginBottom: 14 }}>تقديرات اتجاهية استرشادية مبنية على معدل النمو الحالي ومؤشر الصحة — وليست توقعات مالية دقيقة</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[diagnostics.scenarios.worst, diagnostics.scenarios.expected, diagnostics.scenarios.best].map((s, i) => (
                <div key={i} style={{ background: C.paper, borderRadius: 12, padding: 16, borderTop: `3px solid ${i===0?C.brick:i===1?C.brass:C.sage}` }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: i===0?C.brick:i===1?C.brass:C.sage, marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 11.5, color: C.steel }}>نمو الإيرادات المفترض</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 8 }}>{Math.round(s.growth * 10) / 10}%</div>
                  <div style={{ fontSize: 11.5, color: C.steel }}>الإيراد المتوقع</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 8 }}>{s.revenue.toLocaleString('ar')} ﷼</div>
                  <div style={{ fontSize: 11.5, color: C.steel }}>مؤشر الصحة المتوقع</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{s.healthScore}/100</div>
                </div>
              ))}
            </div>
          </div>
        )}
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

        {/* Glossary appendix */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "'Noto Kufi Arabic'", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 6 }}>ملحق — قاموس المؤشرات</div>
          <div style={{ fontSize: 11.5, color: C.steel, marginBottom: 14 }}>تعريف وصيغة احتساب كل مؤشر ورد في هذا التقرير</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {diagnostics.kpis.filter(k => KPI_GLOSSARY[k.id]).map(k => (
              <div key={k.id} style={{ background: C.paper, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.7, marginBottom: 4 }}>{KPI_GLOSSARY[k.id].def}</div>
                <div style={{ fontSize: 10.5, color: C.steel, fontFamily: 'monospace', direction: 'ltr', textAlign: 'left' }}>{KPI_GLOSSARY[k.id].formula}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer sign-off */}
        <div style={{ marginTop: 36, paddingTop: 20, borderTop: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.steel }}>
          <span>هذا التقرير سري ومُعَدّ حصريًا لصالح {form.companyName}. جميع الحقوق محفوظة لمكتب فانتج للاستشارات.</span>
          <span>أُعِدَّ بواسطة: {form.consultant} · {date}</span>
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
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('Vantage render error:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", padding: 40, maxWidth: 600, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>حدث خطأ غير متوقع أثناء عرض هذه الصفحة</div>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>{String(this.state.error.message || this.state.error)}</div>
          <button onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{ ...primaryBtn, margin: '0 auto' }}>
            إعادة تحميل الصفحة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingScreen({ label }) {
  return (
    <div dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", background: C.ink, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@import url('${FONT_LINK}');`}</style>
      <div style={{ color: '#D7DEE9', fontSize: 13.5 }}>{label}</div>
    </div>
  );
}

function AppInner() {
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

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
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

  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (numericForm, rawForm) => {
    setSubmitError('');
    setSaving(true);
    try {
      const diagnostics = computeDiagnostics(numericForm, rawForm.sector);
      const now = new Date();
      const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
      const certNumber = `VG-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${suffix}`;
      const draft = {
        form: rawForm, diagnostics, certNumber,
        date: now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }),
      };
      try {
        const saved = await insertCaseRemote(draft, session.accessToken, session.profile);
        setCases(prev => [saved, ...prev]);
        setActiveId(saved.id);
        setSyncStatus('online');
      } catch (err) {
        console.error('Save to database failed:', err);
        const fallbackId = `local-${Date.now()}`;
        setCases(prev => [{ ...draft, id: fallbackId, unsynced: true, createdByName: session.profile.full_name }, ...prev]);
        setActiveId(fallbackId);
        setSyncStatus('offline');
      }
      setView('report');
    } catch (err) {
      console.error('Diagnostics computation failed:', err);
      setSubmitError('تعذر توليد التشخيص: ' + (err && err.message ? err.message : 'خطأ غير معروف') + ' — تحقق من صحة القيم المدخلة (خصوصًا الأرقام) وحاول مرة أخرى.');
    } finally {
      setSaving(false);
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
            <IntakeWizard onCancel={() => setView('dashboard')} onSubmit={handleSubmit} saving={saving} error={submitError} defaultConsultant={session.profile.full_name} />
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
