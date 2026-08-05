/**
 * Validate Email Address
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validate Australian Mobile Number
 * Supports:
 * 0412345678
 * +61412345678
 * 04 1234 5678
 */
export function isValidMobile(mobile: string): boolean {
  const cleaned = mobile.replace(/\s/g, "");

  return /^(\+61|0)4\d{8}$/.test(cleaned);
}

/**
 * Check Required Text
 */
export function isRequired(value?: string): boolean {
  return !!value?.trim();
}