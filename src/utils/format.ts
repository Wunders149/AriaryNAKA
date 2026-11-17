const FRENCH_MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

const FRENCH_MONTHS_SHORT = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Jun',
  'Jul',
  'Aoû',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
];

export function formatAriary(amount: number, showSign = false): string {
  const rounded = Math.round(amount);
  const abs = Math.abs(rounded);
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (rounded < 0) {
    return `-${formatted} Ar`;
  }
  if (showSign && rounded > 0) {
    return `+${formatted} Ar`;
  }
  return `${formatted} Ar`;
}

export function formatAriaryCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const val = (abs / 1_000_000).toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
    return `${sign}${val} M Ar`;
  }
  if (abs >= 1_000) {
    const val = Math.round(abs / 1_000);
    return `${sign}${val} k Ar`;
  }
  return `${sign}${Math.round(abs)} Ar`;
}

export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '0 %';
  return `${value.toFixed(decimals).replace('.', ',')} %`;
}

export function getMonthKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [yStr, mStr] = monthKey.split('-');
  const date = new Date(Number(yStr), Number(mStr) - 1 + delta, 1);
  return getMonthKey(date);
}

export function formatMonthLabel(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  const monthIdx = Number(mStr) - 1;
  const name = FRENCH_MONTHS[monthIdx] ?? mStr;
  return `${name} ${yStr}`;
}

export function formatMonthShort(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  const monthIdx = Number(mStr) - 1;
  const name = FRENCH_MONTHS_SHORT[monthIdx] ?? mStr;
  return `${name} ${yStr.slice(-2)}`;
}

export function formatDateFr(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const monthName = FRENCH_MONTHS_SHORT[Number(m) - 1] ?? m;
  return `${Number(d)} ${monthName} ${y}`;
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
