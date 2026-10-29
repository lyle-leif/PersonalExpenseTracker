// Reference calculations only. This module never reads or writes a ledger.
export const FX_PAIR = 'CAD/PHP:ECB';
export const FX_SOURCE_URL = 'https://api.frankfurter.dev/v2/providers/ecb/rate/cad/php';
export const FX_HOUR = 3_600_000;
export const FX_MINUTE = 60_000;
export const FX_MAX_MINOR = 1_000_000_000_000n;

function decimalFraction(value) {
  const rate = String(value);
  if (!/^\d{1,10}(\.\d{1,18})?$/.test(rate)) throw Error('Invalid reference rate.');
  const [whole, fraction = ''] = rate.split('.');
  const numerator = BigInt(whole + fraction), denominator = 10n ** BigInt(fraction.length);
  if (numerator <= 0n || numerator > 1_000_000_000n * denominator) throw Error('Invalid reference rate.');
  return { numerator, denominator, rate };
}

export function validPublicationDate(value, now = Date.now()) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const stamp = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value && value <= new Date(now).toISOString().slice(0, 10);
}

export function validateFxSnapshot(value, now = Date.now()) {
  if (!value || value.base !== 'CAD' || value.quote !== 'PHP' || value.provider !== 'ECB' || value.source !== 'Frankfurter/ECB') throw Error('Unexpected reference-rate source or currencies.');
  if (!validPublicationDate(value.publicationDate, now)) throw Error('Invalid reference-rate publication date.');
  const { rate } = decimalFraction(value.rate);
  if (typeof value.checkedAt !== 'string' || !Number.isFinite(Date.parse(value.checkedAt)) || Date.parse(value.checkedAt) > now + 300_000 || Date.parse(value.checkedAt) < Date.parse(value.publicationDate + 'T00:00:00Z')) throw Error('Invalid reference-rate check time.');
  return { base: 'CAD', quote: 'PHP', provider: 'ECB', source: 'Frankfurter/ECB', rate, publicationDate: value.publicationDate, checkedAt: value.checkedAt };
}

export function fromEcbResponse(value, now = Date.now()) {
  // The provider is fixed by the URL above, never selected by the caller.
  if (!value || value.base !== 'CAD' || value.quote !== 'PHP' || (value.provider !== undefined && value.provider !== 'ECB' && value.provider !== 'ecb')) throw Error('Unexpected rate currencies or provider.');
  return validateFxSnapshot({ base: value.base, quote: value.quote, rate: value.rate, publicationDate: value.date, checkedAt: new Date(now).toISOString(), provider: 'ECB', source: 'Frankfurter/ECB' }, now);
}

export function preferFxSnapshot(previous, incoming, now = Date.now()) {
  const next = validateFxSnapshot(incoming, now);
  if (!previous) return next;
  const old = validateFxSnapshot(previous, now);
  if (next.publicationDate < old.publicationDate) throw Error('The service returned an older observation. Your saved rate was retained.');
  if (Date.parse(next.checkedAt) < Date.parse(old.checkedAt)) return old;
  return next;
}

export function parseFxAmount(value) {
  const text = String(value).trim();
  if (!/^\d{1,11}(\.\d{1,2})?$/.test(text)) throw Error('Enter zero or a positive amount with up to two decimal places.');
  const [whole, fraction = ''] = text.split('.');
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (minor > FX_MAX_MINOR) throw Error('This amount is too large.');
  return minor;
}

export function convertFxAmount(value, from, snapshot) {
  if (!['CAD', 'PHP'].includes(from)) throw Error('Choose CAD or PHP.');
  const amount = parseFxAmount(value), { numerator: rate, denominator: scale } = decimalFraction(snapshot.rate);
  const numerator = amount * (from === 'CAD' ? rate : scale), denominator = from === 'CAD' ? scale : rate;
  const minor = (numerator * 2n + denominator) / (denominator * 2n); // half-up, once, at the final cent
  if (minor > FX_MAX_MINOR) throw Error('The converted result exceeds the supported amount limit.');
  return { minor: String(minor), currency: from === 'CAD' ? 'PHP' : 'CAD' };
}

export function formatFxMinor(minor, currency) {
  const n = BigInt(minor), digits = String(n / 100n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (currency === 'CAD' ? 'CA$' : '₱') + digits + '.' + String(n % 100n).padStart(2, '0');
}

export function fxIsOld(snapshot, now = Date.now()) {
  if (!snapshot) return false;
  return Math.floor(now / 86_400_000) - Math.floor(Date.parse(snapshot.publicationDate + 'T00:00:00Z') / 86_400_000) > 7;
}

export function fxStatus({ snapshot, online = true, updating = false, error = '' }) {
  if (updating) return 'Updating rate…';
  if (!snapshot) return 'Connect once to download a rate';
  if (!online) return 'Offline · using saved rate';
  if (error) return 'Couldn’t update · saved rate retained';
  return 'Latest available reference rate';
}
