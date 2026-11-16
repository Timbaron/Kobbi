import { DateFormatOption, RecurrenceFrequency } from '../types/finance';

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function toDateOnlyISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toLocalDateTimeInput(dateISO: string): string {
  if (!dateISO) return '';
  if (dateISO.length >= 16) return dateISO.slice(0, 16);
  return `${dateISO.slice(0, 10)}T09:00`;
}

export function getMonthKey(dateISO: string): string {
  return dateISO.slice(0, 7);
}

export function getCurrentMonthKey(refDate: Date = new Date()): string {
  const y = refDate.getFullYear();
  const m = String(refDate.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function shiftMonthKey(monthKey: string, deltaMonths: number): string {
  const [yStr, mStr] = monthKey.split('-');
  const year = parseInt(yStr, 10);
  const monthIdx = parseInt(mStr, 10) - 1;
  const d = new Date(year, monthIdx + deltaMonths, 1);
  return getCurrentMonthKey(d);
}

export function formatMonthLabel(monthKey: string, full = false): string {
  const [yStr, mStr] = monthKey.split('-');
  const mIdx = Math.max(0, Math.min(11, parseInt(mStr, 10) - 1));
  return `${full ? MONTHS_FULL[mIdx] : MONTHS_SHORT[mIdx]} ${yStr}`;
}

export function formatDate(dateISO: string, format: DateFormatOption = 'DD MMM YYYY'): string {
  const datePart = dateISO.slice(0, 10);
  const [y, m, d] = datePart.split('-');
  if (!y || !m || !d) return dateISO;
  const mIdx = Math.max(0, Math.min(11, parseInt(m, 10) - 1));

  if (format === 'DD/MM/YYYY') return `${d}/${m}/${y}`;
  if (format === 'YYYY-MM-DD') return `${y}-${m}-${d}`;
  return `${parseInt(d, 10)} ${MONTHS_SHORT[mIdx]} ${y}`;
}

export function formatTime(dateISO: string): string {
  if (!dateISO.includes('T')) return '';
  const timePart = dateISO.split('T')[1];
  if (!timePart) return '';
  const [hhStr, mmStr] = timePart.split(':');
  const hh = parseInt(hhStr, 10);
  const mm = mmStr ? mmStr.slice(0, 2) : '00';
  if (Number.isNaN(hh)) return '';
  const period = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${mm} ${period}`;
}

export function formatGroupDateHeader(
  dateOnlyISO: string,
  format: DateFormatOption,
  todayRef: Date = new Date()
): string {
  const todayISO = toDateOnlyISO(todayRef);
  const yesterdayDate = new Date(todayRef);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayISO = toDateOnlyISO(yesterdayDate);

  if (dateOnlyISO === todayISO) return 'Today';
  if (dateOnlyISO === yesterdayISO) return 'Yesterday';
  return formatDate(dateOnlyISO, format);
}

export function addFrequencyToDate(dateOnlyISO: string, frequency: RecurrenceFrequency): string {
  const [y, m, d] = dateOnlyISO.slice(0, 10).split('-').map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  if (frequency === 'weekly') dt.setDate(dt.getDate() + 7);
  else if (frequency === 'biweekly') dt.setDate(dt.getDate() + 14);
  else if (frequency === 'monthly') dt.setMonth(dt.getMonth() + 1);
  else if (frequency === 'yearly') dt.setFullYear(dt.getFullYear() + 1);
  return toDateOnlyISO(dt);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO.slice(0, 10) + 'T00:00:00');
  const b = new Date(toISO.slice(0, 10) + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function getGreeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
