import {uiMessage} from './locale-model';
/** Numeric and colour values are UI data, independent of Angular and persistence. */
export interface NumberDomain { min: number; max: number; step: number; }
export interface NumericRange { start: number; end: number; }
export interface RgbaColor { red: number; green: number; blue: number; alpha: number; }
export type ColorFormat = 'hex' | 'rgb' | 'hsl';
export function numberDomain(domain: NumberDomain): NumberDomain {
  const { min, max, step } = domain;
  if (![min, max, step].every(Number.isFinite) || min >= max || step <= 0 || !Number.isFinite(max - min) || !Number.isFinite((max - min) / step) || min + step === min || !Number.isSafeInteger(Math.floor((max - min) / step)))
    throw new Error('Numeric controls require finite min < max and a representable positive step.');
  return domain;
}
function rounded(value: number, step: number): number {
  if (Number.isSafeInteger(value)) return value;
  const cleaned = Number(value.toPrecision(15));
  // Clean up decimal arithmetic only below a tiny fraction of one step.
  // A fixed significant-digit limit must not erase representable increments.
  return Math.abs(cleaned - value) <= step * 1e-8 ? cleaned : value;
}
export function snapNumber(value: number, domain: NumberDomain): number {
  numberDomain(domain);
  if (!Number.isFinite(value)) throw new Error('A numeric value must be finite.');
  const steps = Math.floor((domain.max - domain.min) / domain.step + 1e-9);
  const index = Math.min(steps, Math.max(0, Math.round((value - domain.min) / domain.step)));
  return Math.max(domain.min, Math.min(domain.max, rounded(domain.min + index * domain.step, domain.step)));
}
export function numericValueError(value: unknown, domain: NumberDomain, text=(source:string,parameters:Readonly<Record<string,string|number>>={})=>uiMessage(source,{},parameters)): string | null {
  numberDomain(domain);
  if (typeof value !== 'number' || !Number.isFinite(value)) return text('数値を指定してください。');
  if (value < domain.min || value > domain.max) return text('{min} から {max} の範囲で指定してください。',{min:domain.min,max:domain.max});
  const steps = (value - domain.min) / domain.step;
  return Math.abs(steps - Math.round(steps)) <= 1e-8 ? null : text('{step} 刻みで指定してください。',{step:domain.step});
}
export function numericRangeError(value: unknown, domain: NumberDomain, text=(source:string,parameters:Readonly<Record<string,string|number>>={})=>uiMessage(source,{},parameters)): string | null {
  if (!value || typeof value !== 'object') return text('開始値と終了値を指定してください。');
  const range = value as Partial<NumericRange>;
  return numericValueError(range.start, domain, text) ?? numericValueError(range.end, domain, text)
    ?? (range.start! > range.end! ? text('開始値は終了値以下にしてください。') : null);
}
function numericToken(value: string): number | null {
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) && Number.isFinite(Number(value)) ? Number(value) : null;
}
function alphaToken(value: string): number | null {
  const percent = value.endsWith('%'), number = numericToken(percent ? value.slice(0, -1) : value);
  return number !== null && number >= 0 && number <= (percent ? 100 : 1) ? number / (percent ? 100 : 1) : null;
}
function channelToken(value: string): number | null {
  const percent = value.endsWith('%'), number = numericToken(percent ? value.slice(0, -1) : value);
  return number !== null && number >= 0 && number <= (percent ? 100 : 255) ? Math.round(percent ? number / 100 * 255 : number) : null;
}
function hueToken(value: string): number | null {
  const parts = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(deg|rad|grad|turn)?$/.exec(value);
  if (!parts) return null;
  const angle = Number(parts[1]) * (parts[2] === 'rad' ? 180 / Math.PI : parts[2] === 'grad' ? .9 : parts[2] === 'turn' ? 360 : 1);
  return Number.isFinite(angle) ? (angle % 360 + 360) % 360 : null;
}
export function hslColor(hue: number, saturation: number, lightness: number, alpha = 1): RgbaColor {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation, segment = hue / 60;
  const secondary = chroma * (1 - Math.abs(segment % 2 - 1)), base = lightness - chroma / 2;
  const [red, green, blue] = segment < 1 ? [chroma, secondary, 0] : segment < 2 ? [secondary, chroma, 0] : segment < 3 ? [0, chroma, secondary] : segment < 4 ? [0, secondary, chroma] : segment < 5 ? [secondary, 0, chroma] : [chroma, 0, secondary];
  return { red: Math.round((red + base) * 255), green: Math.round((green + base) * 255), blue: Math.round((blue + base) * 255), alpha };
}
export function parseColor(source: string): RgbaColor | null {
  const text = source.trim().toLowerCase();
  const hex = /^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/.exec(text);
  if (hex) {
    const digits = hex[1].length <= 4 ? [...hex[1]].map(value => value + value).join('') : hex[1];
    return { red: parseInt(digits.slice(0, 2), 16), green: parseInt(digits.slice(2, 4), 16), blue: parseInt(digits.slice(4, 6), 16), alpha: digits.length === 8 ? parseInt(digits.slice(6), 16) / 255 : 1 };
  }
  const match = /^(rgba?|hsla?)\(([^()]*)\)$/.exec(text);
  if (!match) return null;
  const body = match[2], slash = body.split('/');
  if (slash.length > 2 || slash[1] !== undefined && body.includes(',')) return null;
  const parts = body.includes(',') ? slash[0].split(',').map(part => part.trim()) : slash[0].trim().split(/\s+/);
  if (parts.some(part => !part)) return null;
  const alpha = slash[1] !== undefined ? alphaToken(slash[1].trim()) : parts.length === 4 ? alphaToken(parts.pop()!) : 1;
  if (parts.length !== 3 || alpha === null) return null;
  if (match[1].startsWith('rgb')) {
    const channels = parts.map(channelToken);
    return channels.some(channel => channel === null) ? null : { red: channels[0]!, green: channels[1]!, blue: channels[2]!, alpha };
  }
  const hue = hueToken(parts[0]), saturation = parts[1].endsWith('%') ? numericToken(parts[1].slice(0, -1)) : null, lightness = parts[2].endsWith('%') ? numericToken(parts[2].slice(0, -1)) : null;
  return hue === null || saturation === null || lightness === null || saturation < 0 || saturation > 100 || lightness < 0 || lightness > 100 ? null : hslColor(hue, saturation / 100, lightness / 100, alpha);
}
export function formatColor(color: RgbaColor, format: ColorFormat): string {
  if (!['hex', 'rgb', 'hsl'].includes(format)) throw new Error('Unsupported colour format.');
  const { red, green, blue, alpha } = color;
  if (![red, green, blue].every(value => Number.isInteger(value) && value >= 0 && value <= 255) || !Number.isFinite(alpha) || alpha < 0 || alpha > 1)
    throw new Error('Colour channels must be bytes and alpha must be between 0 and 1.');
  const number = (value: number) => Number(value.toFixed(3)).toString();
  if (format === 'hex') return '#' + [red, green, blue, ...(alpha < 1 ? [Math.round(alpha * 255)] : [])].map(value => value.toString(16).padStart(2, '0')).join('');
  if (format === 'rgb') return alpha === 1 ? `rgb(${red}, ${green}, ${blue})` : `rgba(${red}, ${green}, ${blue}, ${number(alpha)})`;
  const [r, g, b] = [red / 255, green / 255, blue / 255], max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min, lightness = (max + min) / 2;
  const hue = !delta ? 0 : (max === r ? (g - b) / delta + (g < b ? 6 : 0) : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60;
  const saturation = !delta ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return alpha === 1 ? `hsl(${number(hue)}, ${number(saturation * 100)}%, ${number(lightness * 100)}%)` : `hsla(${number(hue)}, ${number(saturation * 100)}%, ${number(lightness * 100)}%, ${number(alpha)})`;
}
