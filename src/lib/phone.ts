// src/lib/phone.ts
// Normalizes phone numbers for comparison — strips everything but digits and drops
// a leading country code, so "+91 98765 43210", "919876543210" and "9876543210"
// are all treated as the same number.

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}
