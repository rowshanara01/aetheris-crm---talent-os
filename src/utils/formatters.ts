import type { OrganizationSettings } from '../shared/types';

export function formatMoney(amount: number, org?: OrganizationSettings): string {
  const sym = org?.currencySymbol || '$';
  const safeVal = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `${sym}${safeVal.toLocaleString()}`;
}

export function currencyLabel(org?: OrganizationSettings): string {
  return org?.currencyCode || 'USD';
}
