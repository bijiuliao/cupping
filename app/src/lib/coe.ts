import type { Bean, CatKey } from './types';

export const CATS: { key: CatKey; label: string; en: string }[] = [
  { key: 'clean', label: '乾淨度', en: 'Clean Cup' },
  { key: 'sweet', label: '甜感', en: 'Sweetness' },
  { key: 'acid', label: '酸質', en: 'Acidity' },
  { key: 'mouth', label: '口感', en: 'Mouthfeel' },
  { key: 'flavor', label: '風味', en: 'Flavor' },
  { key: 'after', label: '餘韻', en: 'Aftertaste' },
  { key: 'balance', label: '平衡', en: 'Balance' },
  { key: 'overall', label: '整體', en: 'Overall' },
];

export const DEFAULT_ACTIVITY = '咖啡社杯測';

export const ORIGINS = [
  'Bolivia',
  'Brazil',
  'Burundi',
  'China',
  'Colombia',
  'Costa Rica',
  'DR Congo',
  'Ecuador',
  'El Salvador',
  'Ethiopia',
  'Guatemala',
  'Honduras',
  'India',
  'Indonesia',
  'Kenya',
  'Malawi',
  'Mexico',
  'Myanmar',
  'Nicaragua',
  'Panama',
  'Papua New Guinea',
  'Peru',
  'Rwanda',
  'Taiwan',
  'Tanzania',
  'Thailand',
  'Uganda',
  'Vietnam',
  'Yemen',
];

export const PROCESSES = [
  'Anaerobic',
  'Carbonic Maceration',
  'Double Fermentation',
  'Honey (Black)',
  'Honey (Red)',
  'Honey (White)',
  'Honey (Yellow)',
  'Natural',
  'Semi-Washed',
  'Washed',
  'Wet-Hulled',
];

export const VARIETIES = [
  'Bourbon',
  'Castillo',
  'Catimor',
  'Catuai',
  'Caturra',
  'Geisha',
  'Heirloom (Ethiopia)',
  'Java',
  'Kent',
  'Maragogipe',
  'Mundo Novo',
  'Pacamara',
  'Pacas',
  'Pink Bourbon',
  'SL28',
  'SL34',
  'Sidra',
  'Typica',
];

/** Demo bean-list "database" — stands in for the future bean-database API. */
export const BEAN_DB: Bean[] = [
  { name: '西達摩 古吉 花魁', origin: 'Ethiopia', process: 'Natural', variety: 'Heirloom (Ethiopia)', roaster: '山丘烘焙' },
  { name: '哥斯大黎加 音樂家', origin: 'Costa Rica', process: 'Honey (Red)', variety: 'Catuai', roaster: '晨光咖啡' },
  { name: '盧安達 女性計畫', origin: 'Rwanda', process: 'Washed', variety: 'Bourbon', roaster: '選豆室' },
  { name: '宏都拉斯 荔枝蘭', origin: 'Honduras', process: 'Washed', variety: 'Pacas', roaster: '巷口自烘' },
  { name: '葉門 摩卡 瑪塔莉', origin: 'Yemen', process: 'Natural', variety: 'Typica', roaster: '選豆室' },
  { name: '祕魯 有機', origin: 'Peru', process: 'Washed', variety: 'Typica', roaster: '晨光咖啡' },
  { name: '阿里山 郵政', origin: 'Taiwan', process: 'Honey (Yellow)', variety: 'Geisha', roaster: '山丘烘焙' },
  { name: '巴西 皇后莊園', origin: 'Brazil', process: 'Natural', variety: 'Mundo Novo', roaster: '巷口自烘' },
];

export function scaleMin(baseScale: '4–8' | '0–8' = '4–8') {
  return baseScale === '0–8' ? 0 : 4;
}

export function sheetTotal(vals: Record<CatKey, number>, defInt: number, scoreMode: 'pro' | 'easy', easyScore: number) {
  if (scoreMode === 'easy') {
    return Math.min(100, Math.max(0, easyScore));
  }
  let sum = 36;
  CATS.forEach((c) => {
    sum += vals[c.key];
  });
  return sum - defInt;
}

export function beanSub(b: Bean) {
  return [b.origin, b.process, b.variety, b.roaster].filter(Boolean).join(' · ');
}

export function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
