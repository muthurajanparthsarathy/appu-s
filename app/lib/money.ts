export const money = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: paise % 100 === 0 ? 0 : 2 }).format(paise / 100);

// Parses an admin-entered rupee amount ("32", "32.5", "32.50") into integer paise without float math.
export function parseRupeesToPaise(input: unknown): number | null {
  if (typeof input !== 'string') return null;
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
}

export const paiseToRupeesInput = (paise: number) => `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, '0')}`;

export const orderNumber = (number: number) => `VM${number}`;
