/**
 * Money and percentage formatting helpers for Angola Kwanzas (Kz)
 */

export function formatKz(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 Kz';
  }
  const integerVal = Math.round(amount);
  return `${new Intl.NumberFormat('en-US').format(integerVal)} Kz`;
}

export function parseKz(input: string): number {
  const cleaned = input.replace(/[^\d.-]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  return `${Math.round(value * 10) / 10}%`;
}

export function maskNationalId(bi: string | null | undefined): string {
  if (!bi) return '---';
  const trimmed = bi.trim();
  if (trimmed.length <= 4) return trimmed;
  const lastFour = trimmed.slice(-4);
  return `*******${lastFour}`;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '---';
  const clean = phone.trim();
  if (clean.length < 7) return clean;
  return `${clean.slice(0, 4)} ... ${clean.slice(-3)}`;
}
