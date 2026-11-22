import { describe, it, expect } from 'vitest';
import { cleanAndNormalizeIp } from '../gcode/ipNormalizer';

describe('Bambu Lab IP Normalizer & Sanitizer', () => {
  it('normalizes leading zeros in octets (e.g. 10.222.00.000 -> 10.222.0.0)', () => {
    const res = cleanAndNormalizeIp('10.222.00.000');
    expect(res.isValid).toBe(true);
    expect(res.normalizedIp).toBe('10.222.0.0');
    expect(res.wasModified).toBe(true);
  });

  it('normalizes 192.168.001.050 to 192.168.1.50', () => {
    const res = cleanAndNormalizeIp('192.168.001.050');
    expect(res.isValid).toBe(true);
    expect(res.normalizedIp).toBe('192.168.1.50');
    expect(res.wasModified).toBe(true);
  });

  it('strips accidental protocols and port suffixes', () => {
    const res = cleanAndNormalizeIp('ftps://192.168.1.150:990');
    expect(res.isValid).toBe(true);
    expect(res.normalizedIp).toBe('192.168.1.150');
  });

  it('identifies invalid IP with out-of-range octets', () => {
    const res = cleanAndNormalizeIp('10.300.0.1');
    expect(res.isValid).toBe(false);
  });

  it('leaves already valid clean IPs intact', () => {
    const res = cleanAndNormalizeIp('192.168.1.100');
    expect(res.isValid).toBe(true);
    expect(res.normalizedIp).toBe('192.168.1.100');
    expect(res.wasModified).toBe(false);
  });
});
