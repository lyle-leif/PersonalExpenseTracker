import {cardDesign} from './card-designs.mjs';
export {CARD_DESIGNS,cardDesign,designsForAccount,referenceDesign,withCardDesign} from './card-designs.mjs';
// Presentation metadata only. Provider selection never determines account kind or currency.
const provider = (id, name, region, background, accent, aliases = []) => Object.freeze({ id, name, region, background, accent, foreground: '#ffffff', aliases });
export const ACCOUNT_PROVIDERS = Object.freeze([
  provider('cibc', 'CIBC', 'CA', '#7b1338', '#e7c078', ['Canadian Imperial Bank of Commerce']),
  provider('td', 'TD', 'CA', '#005b35', '#86dfa0', ['TD Canada Trust', 'Toronto Dominion']),
  provider('scotiabank', 'Scotiabank', 'CA', '#b2172c', '#ffd2d6', ['Scotia']),
  provider('rbc', 'RBC', 'CA', '#064b8e', '#f4cc63', ['Royal Bank of Canada', 'Royal Bank']),
  provider('bmo', 'BMO', 'CA', '#07568c', '#ffb9c2', ['Bank of Montreal']),
  provider('tangerine', 'Tangerine', 'CA', '#9d3a0d', '#ffd8b5'),
  provider('simplii', 'Simplii Financial', 'CA', '#263c32', '#d7ed80', ['Simplii']),
  provider('nationalbank', 'National Bank', 'CA', '#a51f37', '#ffc5d2', ['NBC', 'Banque Nationale']),
  provider('desjardins', 'Desjardins', 'CA', '#005e41', '#a8e6c3'),
  provider('eqbank', 'EQ Bank', 'CA', '#263b4a', '#eac971', ['Equitable']),
  provider('wealthsimple', 'Wealthsimple', 'CA', '#252d2c', '#d8e7d4'),
  provider('pcfinancial', 'PC Financial', 'CA', '#901a2b', '#ffd5c3', ["President's Choice"]),
  provider('amexcanada', 'American Express Canada', 'CA', '#0c4c84', '#b0d8f3', ['Amex']),
  provider('bpi', 'BPI', 'PH', '#8f1b30', '#f4d27a'),
  provider('maribank', 'MariBank', 'PH', '#b7441c', '#ffd8b8'),
  provider('bdo', 'BDO', 'PH', '#123f86', '#ffdb74'),
  provider('metrobank', 'Metrobank', 'PH', '#124789', '#bbd9ff'),
  provider('unionbank', 'UnionBank', 'PH', '#ad4317', '#ffd2ae'),
  provider('rcbc', 'RCBC', 'PH', '#175294', '#b3d6ff'),
  provider('securitybank', 'Security Bank', 'PH', '#14553f', '#b2e7cf'),
  provider('eastwest', 'EastWest', 'PH', '#713665', '#edc2e4'),
  provider('pnb', 'PNB', 'PH', '#1b4d85', '#bfd8ff'),
  provider('maya', 'Maya', 'PH', '#1a4131', '#a9f5ce'),
  provider('gcash', 'GCash', 'PH', '#1255c7', '#cee0ff'),
  provider('gotyme', 'GoTyme', 'PH', '#0b4d58', '#b1f1df'),
  provider('cimb', 'CIMB', 'PH', '#8c1b2c', '#ffc6d3'),
  provider('tonik', 'Tonik', 'PH', '#623894', '#e1caff'),
  provider('other', 'Other / credit union', 'OTHER', '#344c43', '#b9d6c9')
]);
const normalize = text => String(text).normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
export const accountProvider = id => ACCOUNT_PROVIDERS.find(item => item.id === id) || ACCOUNT_PROVIDERS.at(-1);
export function searchAccountProviders(region = 'ALL', query = '') {
  if (!['ALL', 'CA', 'PH'].includes(region)) throw Error('Choose Canada, Philippines, or All.');
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return ACCOUNT_PROVIDERS.filter(item => (region === 'ALL' || item.region === region || item.region === 'OTHER') && words.every(word => normalize([item.name, item.id, ...item.aliases].join(' ')).includes(word)));
}
export function validateAccountAppearance(account) {
  if(account.balanceLocked!==undefined&&typeof account.balanceLocked!=='boolean')throw Error('Invalid balance privacy setting.');
  if (account.providerId != null && (typeof account.providerId !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(account.providerId))) throw Error('Invalid account provider.');
  if (account.cardStyleId != null && (typeof account.cardStyleId !== 'string' || !/^[a-z][a-z0-9-]{0,79}$/.test(account.cardStyleId))) throw Error('Invalid account card style.');
  if (account.bankSubtype != null && (account.kind !== 'bank' || !['chequing', 'savings', 'other'].includes(account.bankSubtype))) throw Error('Choose a valid bank-account subtype.');
  return account;
}
export function providerCardStyle(providerId, kind) {
  const known = ACCOUNT_PROVIDERS.find(item => item.id === providerId);
  return known ? known.id + (kind === 'credit' ? '-credit' : '-balance') : 'neutral';
}
export function withProviderAppearance(account, providerId) {
  if (!ACCOUNT_PROVIDERS.some(item => item.id === providerId)) throw Error('Choose an available provider.');
  return validateAccountAppearance({ ...structuredClone(account), providerId, cardStyleId: account.providerId===providerId&&account.cardStyleId?account.cardStyleId:providerCardStyle(providerId, account.kind) });
}
export function accountTypeLabel(account) {
  if (account.kind === 'bank') return account.bankSubtype === 'chequing' ? 'Chequing' : account.bankSubtype === 'savings' ? 'Savings' : 'Bank / debit';
  return account.kind === 'credit' ? 'Credit card' : account.kind === 'cash' ? 'Cash wallet' : 'E-wallet';
}
export function accountCardPresentation(account) {
  const known = ACCOUNT_PROVIDERS.find(item => item.id === account.providerId);
  const design=cardDesign(account.cardStyleId||providerCardStyle(account.providerId,account.kind));
  const neutral=!known||!design||design.providerId!==account.providerId||design.role!==(account.kind==='credit'?'credit':'balance');
  return { provider: known || accountProvider('other'), styleId: neutral ? 'neutral' : design.id, design:neutral?null:design, background: neutral ? '#344c43' : design.background, accent: neutral ? '#b9d6c9' : design.accent, foreground: '#ffffff', typeLabel: accountTypeLabel(account) };
}
