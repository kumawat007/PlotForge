/**
 * IP Address Normalizer & Sanitizer for Bambu Lab / Network 3D Printer CAM
 * 
 * Corrects common network typing issues such as:
 * - Leading zeros in octets (e.g., '10.222.00.000' -> '10.222.0.0', '192.168.001.050' -> '192.168.1.50')
 *   which otherwise cause curl/system network errors due to octal interpretation or strict IPv4 validation.
 * - Accidental protocol prefixes (e.g., 'http://10.222.94.141' or 'ftps://...')
 * - Trailing ports (e.g., ':990') or whitespace.
 */

export interface NormalizedIpResult {
  normalizedIp: string;
  isValid: boolean;
  wasModified: boolean;
  message?: string;
}

export function cleanAndNormalizeIp(raw: string): NormalizedIpResult {
  if (!raw) {
    return { normalizedIp: '', isValid: false, wasModified: false };
  }

  let cleaned = raw.trim();

  // Strip protocol prefixes if accidentally pasted
  cleaned = cleaned.replace(/^(?:https?|ftps?|file):\/\//i, '');

  // Strip trailing slashes or port (e.g., :990, :80)
  cleaned = cleaned.replace(/:\d+$/, '').replace(/\/+$/, '').trim();

  const parts = cleaned.split('.');
  if (parts.length !== 4) {
    return {
      normalizedIp: cleaned,
      isValid: false,
      wasModified: cleaned !== raw.trim(),
      message: 'IPv4 address must contain 4 octets separated by dots (e.g. 10.222.0.1)',
    };
  }

  const normalizedOctets: number[] = [];
  let hadLeadingZeros = false;

  for (let i = 0; i < 4; i++) {
    const part = parts[i].trim();
    if (!/^\d+$/.test(part)) {
      return {
        normalizedIp: cleaned,
        isValid: false,
        wasModified: cleaned !== raw.trim(),
        message: `Octet ${i + 1} "${part}" contains non-numeric characters`,
      };
    }

    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255) {
      return {
        normalizedIp: cleaned,
        isValid: false,
        wasModified: cleaned !== raw.trim(),
        message: `Octet ${i + 1} (${num}) out of valid range (0-255)`,
      };
    }

    // Check if leading zeros were present (e.g. "00" -> 0, "050" -> 50)
    if (part.length > 1 && part.startsWith('0')) {
      hadLeadingZeros = true;
    }

    normalizedOctets.push(num);
  }

  const normalized = normalizedOctets.join('.');
  const wasModified = normalized !== raw.trim() || hadLeadingZeros;

  return {
    normalizedIp: normalized,
    isValid: true,
    wasModified,
    message: hadLeadingZeros
      ? `Normalized leading zeros: ${normalized}`
      : undefined,
  };
}
