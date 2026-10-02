export const cents = (v: unknown) => Math.round(Number(v || 0) * 100);
export function paymentTotals(sales: any[]) {
  const totals = { CASH: 0, CARD: 0, TRANSFER: 0, total: 0, count: 0 };
  for (const sale of sales.filter(s => s.status !== 'CANCELLED')) {
    let received = 0;
    for (const p of sale.payments || []) {
      const amount = cents(p.amount); received += amount;
      totals[p.method as 'CASH' | 'CARD' | 'TRANSFER'] += amount;
    }
    totals.CASH -= Math.max(0, received - cents(sale.total));
    totals.total += cents(sale.total); totals.count++;
  }
  return { CASH: totals.CASH / 100, CARD: totals.CARD / 100, TRANSFER: totals.TRANSFER / 100, total: totals.total / 100, count: totals.count };
}
export function periodRange(period = 'day', date = new Date().toLocaleDateString('en-CA', {timeZone: 'America/Guatemala'})) {
  if (!['day','week','month'].includes(period) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Período o fecha inválidos');
  const start = new Date(date + 'T06:00:00.000Z');
  if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0,10) !== date) throw new Error('Fecha inválida');
  if (period === 'week') start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
  if (period === 'month') start.setUTCDate(1);
  const end = new Date(start);
  if (period === 'month') end.setUTCMonth(end.getUTCMonth() + 1); else end.setUTCDate(end.getUTCDate() + (period === 'week' ? 7 : 1));
  return { gte: start, lt: end };
}
