import type { Basket, Currency } from './domain';
export function minorUnits(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new Error('Use a positive amount with at most two decimal places.');
  const [whole, fraction = ''] = value.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result)) throw new Error('Amount is too large.');
  return result;
}
export function decimalAmount(minor: number): string {
  if (!Number.isSafeInteger(minor) || minor < 0) throw new Error('Invalid money amount.');
  return `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`;
}
export function lineTotal(price: number, quantity: number): number {
  const total = price * quantity;
  if (
    !Number.isSafeInteger(price) ||
    price < 1 ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    !Number.isSafeInteger(total)
  )
    throw new Error('Invalid basket arithmetic.');
  return total;
}
export function basketTotal(basket: Basket): number {
  const total = basket.items.reduce(
    (sum, item) => sum + lineTotal(item.product.unitPrice, item.quantity),
    0,
  );
  if (!Number.isSafeInteger(total)) throw new Error('Basket total exceeds safe arithmetic.');
  return total;
}
export function money(minor: number, currency: Currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minor / 100);
}
