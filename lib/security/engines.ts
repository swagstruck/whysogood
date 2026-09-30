// Base64
export function base64Decode(input: string): string {
  try {
    const s = input.replace(/-/g, '+').replace(/_/g, '/');
    return atob(s);
  } catch (e) {
    throw new Error('Invalid Base64');
  }
}

export function base64DecodeToBytes(input: string): Uint8Array {
  const binary = base64Decode(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// URL encoding
export function urlEncode(input: string): string {
  return encodeURIComponent(input);
}
export function urlDecode(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}
export function encodeQueryString(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

// MD5 — pure JS implementation
export function md5(input: string): string {
  function utf8Encode(str: string) {
    let res = '';
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 128) res += String.fromCharCode(c);
      else if (c < 2048) res += String.fromCharCode((c >> 6) | 192, (c & 63) | 128);
      else res += String.fromCharCode((c >> 12) | 224, ((c >> 6) & 63) | 128, (c & 63) | 128);
    }
    return res;
  }
  const s = utf8Encode(input);
  let x = Array(Math.ceil((s.length + 9) / 64) * 16).fill(0);
  for (let i = 0; i < s.length; i++) {
    x[i >> 2] |= (s.charCodeAt(i) & 255) << ((i % 4) * 8);
  }
  x[s.length >> 2] |= 128 << ((s.length % 4) * 8);
  x[x.length - 2] = s.length * 8;

  let a =  1732584193, b = -271733879, c = -1732584194, d =  271733878;
  const F = (X: number, Y: number, Z: number) => (X & Y) | (~X & Z);
  const G = (X: number, Y: number, Z: number) => (X & Z) | (Y & ~Z);
  const H = (X: number, Y: number, Z: number) => X ^ Y ^ Z;
  const I = (X: number, Y: number, Z: number) => Y ^ (X | ~Z);
  const RL = (x: number, n: number) => (x << n) | (x >>> (32 - n));
  const ADD = (x: number, y: number) => {
    let lsw = (x & 0xFFFF) + (y & 0xFFFF);
    let msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  };
  const FF = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => ADD(RL(ADD(ADD(a, F(b, c, d)), ADD(x, ac)), s), b);
  const GG = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => ADD(RL(ADD(ADD(a, G(b, c, d)), ADD(x, ac)), s), b);
  const HH = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => ADD(RL(ADD(ADD(a, H(b, c, d)), ADD(x, ac)), s), b);
  const II = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => ADD(RL(ADD(ADD(a, I(b, c, d)), ADD(x, ac)), s), b);

  for (let i = 0; i < x.length; i += 16) {
    let olda = a, oldb = b, oldc = c, oldd = d;
    a = FF(a, b, c, d, x[i+ 0], 7 , -680876936); d = FF(d, a, b, c, x[i+ 1], 12, -389564586);
    c = FF(c, d, a, b, x[i+ 2], 17,  606105819); b = FF(b, c, d, a, x[i+ 3], 22, -1044525330);
    a = FF(a, b, c, d, x[i+ 4], 7 , -176418897); d = FF(d, a, b, c, x[i+ 5], 12,  1200080426);
    c = FF(c, d, a, b, x[i+ 6], 17, -1473231341); b = FF(b, c, d, a, x[i+ 7], 22, -45705983);
    a = FF(a, b, c, d, x[i+ 8], 7 ,  1770035416); d = FF(d, a, b, c, x[i+ 9], 12, -1958414417);
    c = FF(c, d, a, b, x[i+10], 17, -42063); b = FF(b, c, d, a, x[i+11], 22, -1990404162);
    a = FF(a, b, c, d, x[i+12], 7 ,  1804603682); d = FF(d, a, b, c, x[i+13], 12, -40341101);
    c = FF(c, d, a, b, x[i+14], 17, -1502002290); b = FF(b, c, d, a, x[i+15], 22,  1236535329);

    a = GG(a, b, c, d, x[i+ 1], 5 , -165796510); d = GG(d, a, b, c, x[i+ 6], 9 , -1069501632);
    c = GG(c, d, a, b, x[i+11], 14,  643717713); b = GG(b, c, d, a, x[i+ 0], 20, -373897302);
    a = GG(a, b, c, d, x[i+ 5], 5 , -701558691); d = GG(d, a, b, c, x[i+10], 9 ,  38016083);
    c = GG(c, d, a, b, x[i+15], 14, -660478335); b = GG(b, c, d, a, x[i+ 4], 20, -405537848);
    a = GG(a, b, c, d, x[i+ 9], 5 ,  568446438); d = GG(d, a, b, c, x[i+14], 9 , -1019803690);
    c = GG(c, d, a, b, x[i+ 3], 14, -187363961); b = GG(b, c, d, a, x[i+ 8], 20,  1163531501);
    a = GG(a, b, c, d, x[i+13], 5 , -1444681467); d = GG(d, a, b, c, x[i+ 2], 9 , -51403784);
    c = GG(c, d, a, b, x[i+ 7], 14,  1735328473); b = GG(b, c, d, a, x[i+12], 20, -1926607734);

    a = HH(a, b, c, d, x[i+ 5], 4 , -378558); d = HH(d, a, b, c, x[i+ 8], 11, -2022574463);
    c = HH(c, d, a, b, x[i+11], 16,  1839030562); b = HH(b, c, d, a, x[i+14], 23, -35309556);
    a = HH(a, b, c, d, x[i+ 1], 4 , -1530992060); d = HH(d, a, b, c, x[i+ 4], 11,  1272893353);
    c = HH(c, d, a, b, x[i+ 7], 16, -155497632); b = HH(b, c, d, a, x[i+10], 23, -1094730640);
    a = HH(a, b, c, d, x[i+13], 4 ,  681279174); d = HH(d, a, b, c, x[i+ 0], 11, -358537222);
    c = HH(c, d, a, b, x[i+ 3], 16, -722521979); b = HH(b, c, d, a, x[i+ 6], 23,  76029189);
    a = HH(a, b, c, d, x[i+ 9], 4 , -640364487); d = HH(d, a, b, c, x[i+12], 11, -421815835);
    c = HH(c, d, a, b, x[i+15], 16,  530742520); b = HH(b, c, d, a, x[i+ 2], 23, -995338651);

    a = II(a, b, c, d, x[i+ 0], 6 , -198630844); d = II(d, a, b, c, x[i+ 7], 10,  1126891415);
    c = II(c, d, a, b, x[i+14], 15, -1416354905); b = II(b, c, d, a, x[i+ 5], 21, -57434055);
    a = II(a, b, c, d, x[i+12], 6 ,  1700485571); d = II(d, a, b, c, x[i+ 3], 10, -1894986606);
    c = II(c, d, a, b, x[i+10], 15, -1051523); b = II(b, c, d, a, x[i+ 1], 21, -2054922799);
    a = II(a, b, c, d, x[i+ 8], 6 ,  1873313359); d = II(d, a, b, c, x[i+15], 10, -30611744);
    c = II(c, d, a, b, x[i+ 6], 15, -1560198380); b = II(b, c, d, a, x[i+13], 21,  1309151649);
    a = II(a, b, c, d, x[i+ 4], 6 , -145523070); d = II(d, a, b, c, x[i+11], 10, -1120210379);
    c = II(c, d, a, b, x[i+ 2], 15,  718787259); b = II(b, c, d, a, x[i+ 9], 21, -343485551);

    a = ADD(a, olda); b = ADD(b, oldb); c = ADD(c, oldc); d = ADD(d, oldd);
  }
  const hex = (n: number) => {
    let h = '';
    for (let j = 0; j < 4; j++) {
      h += ((n >> (j * 8)) & 0xFF).toString(16).padStart(2, '0');
    }
    return h;
  };
  return hex(a) + hex(b) + hex(c) + hex(d);
}

// SHA via Web Crypto
export async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function sha512(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function sha1(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// JWT
export interface JwtDecoded {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  isExpired: boolean;
  expiresAt: string | null;
  issuedAt: string | null;
}
export function decodeJwtSec(token: string): JwtDecoded | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const header = JSON.parse(base64Decode(parts[0]));
    const payload = JSON.parse(base64Decode(parts[1]));
    let isExpired = false;
    let expiresAt = null;
    let issuedAt = null;
    if (payload.exp) {
      expiresAt = new Date(payload.exp * 1000).toISOString();
      if (Date.now() >= payload.exp * 1000) isExpired = true;
    }
    if (payload.iat) {
      issuedAt = new Date(payload.iat * 1000).toISOString();
    }
    return { header, payload, signature: parts[2], isExpired, expiresAt, issuedAt };
  } catch {
    return null;
  }
}

// Password Strength
export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  entropy: number;
  crackTime: string;
  suggestions: string[];
  hasUpper: boolean; hasLower: boolean; hasNumber: boolean; hasSymbol: boolean;
  length: number;
}
export function checkPasswordStrength(password: string): PasswordStrengthResult {
  let charsetSize = 0;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  if (hasLower) charsetSize += 26;
  if (hasUpper) charsetSize += 26;
  if (hasNumber) charsetSize += 10;
  if (hasSymbol) charsetSize += 32;

  const entropy = charsetSize > 0 ? Math.log2(charsetSize) * password.length : 0;
  const guesses = Math.pow(2, entropy);
  const seconds = guesses / 10000000000;
  
  let crackTime = '';
  if (seconds < 1) crackTime = 'instantly';
  else if (seconds < 60) crackTime = 'seconds';
  else if (seconds < 3600) crackTime = 'minutes';
  else if (seconds < 86400) crackTime = 'hours';
  else if (seconds < 31536000) crackTime = 'days';
  else crackTime = 'years';

  let score: 0|1|2|3|4 = 0;
  if (entropy >= 128) score = 4;
  else if (entropy >= 60) score = 3;
  else if (entropy >= 36) score = 2;
  else if (entropy >= 28) score = 1;

  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  
  const suggestions = [];
  if (!hasUpper) suggestions.push('Add uppercase letters');
  if (!hasLower) suggestions.push('Add lowercase letters');
  if (!hasNumber) suggestions.push('Add numbers');
  if (!hasSymbol) suggestions.push('Add symbols');
  if (password.length < 12) suggestions.push('Increase length (12+ recommended)');

  return {
    score,
    label: labels[score],
    entropy: Math.round(entropy * 10) / 10,
    crackTime,
    suggestions,
    hasUpper, hasLower, hasNumber, hasSymbol,
    length: password.length
  };
}
