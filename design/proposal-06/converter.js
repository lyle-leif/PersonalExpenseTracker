/* Proposal 04: real public reference rates; sample ledger remains untouched. */
'use strict';
let fxInput = '100.00', fxFrom = params.get('currency') === 'PHP' ? 'PHP' : 'CAD';
let fxView = { snapshot: null, online: navigator.onLine, updating: false, error: '' }, fxMode = 'live', fxController = null, fxGeneration = 0, fxKeyboard = false;
const fxLocal = MonixFX.createFxDeviceStore();
const fxPortable = new URL(document.baseURI).protocol === 'file:';
const fxModes = { live: '', offline: 'Offline preview · network access is suppressed for this converter.', empty: 'First-use offline preview · no rate is supplied or invented.', failure: 'Update-failure preview · the rate request fails without replacing saved data.', stale: 'Stale-rate preview · only the displayed age is simulated; the saved rate is unchanged.', storage: 'Storage-failure preview · a downloaded replacement cannot be committed.' };
const fxPublished = value => value ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T12:00:00Z')) : 'Not downloaded';
const fxChecked = value => value ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)) : 'Never';

function currencyConverter() {
  return `<div class="fx-page"><div class="fx-intro"><span class="fx-mark">${icon('arrowdown')}</span><div><h1>A little perspective.</h1><p>Canadian dollars ↔ Philippine pesos</p></div></div><div id="fx-review" class="fx-review-note" ${fxMode === 'live' ? 'hidden' : ''}>${escapeText(fxModes[fxMode])}</div><section class="fx-card" aria-label="CAD and PHP reference converter"><div id="fx-rate-status" class="fx-status" role="status"><i></i><span>Connect once to download a rate</span></div><p id="fx-date-caption" class="fx-date-caption"></p><p id="fx-stale" class="fx-stale" role="status"></p><div class="fx-field-head"><label for="fx-amount">Amount (<span id="fx-from-label">${fxFrom}</span>)</label><span class="fx-code"><i class="fx-currency-dot" aria-hidden="true">${fxFrom === 'CAD' ? 'C' : '₱'}</i><span id="fx-currency-name">${fxFrom === 'CAD' ? 'Canadian dollar' : 'Philippine peso'}</span></span></div><div class="fx-amount-wrap"><span id="fx-prefix" class="fx-prefix" aria-hidden="true">${fxFrom === 'CAD' ? 'CA$' : '₱'}</span><input id="fx-amount" class="fx-amount" inputmode="decimal" autocomplete="off" maxlength="14" aria-describedby="fx-amount-error" value="${escapeText(fxInput)}" placeholder="0.00"></div><p id="fx-amount-error" class="fx-amount-error" role="status"></p><div class="fx-direction"><select id="fx-direction" aria-label="Conversion direction"><option value="CAD" ${fxFrom === 'CAD' ? 'selected' : ''}>CAD → PHP</option><option value="PHP" ${fxFrom === 'PHP' ? 'selected' : ''}>PHP → CAD</option></select><button class="fx-swap" data-fx="swap" aria-label="Swap currencies, keeping the entered amount">${icon('sync')}Swap</button></div><div class="fx-result-wrap"><p id="fx-result-label" class="fx-result-label">Estimated equivalent · ${fxFrom === 'CAD' ? 'PHP' : 'CAD'}</p><output id="fx-result" class="fx-result" aria-live="polite" aria-atomic="true">—</output><p class="fx-estimate">Reference estimate · excludes fees and provider spreads</p></div><button class="button-secondary fx-copy" data-fx="copy" disabled>${icon('copy')}<span>Copy result</span></button><dl class="fx-details"><div class="fx-detail"><dt>Reference rate</dt><dd id="fx-rate-value">Not available yet</dd></div><div class="fx-detail"><dt>Published</dt><dd id="fx-published">Not downloaded</dd></div><div class="fx-detail"><dt>Last checked</dt><dd id="fx-checked">Never</dd></div><div class="fx-detail"><dt>Source</dt><dd>ECB via Frankfurter</dd></div></dl><button class="button-secondary fx-update" data-fx="refresh">${icon('sync')}<span>Update rate</span></button><p id="fx-message" class="fx-message" role="status"></p></section><p class="fx-note">${icon('shield')}<span>Just a reference. Your recorded balances, transactions, and budgets stay exactly as they are.</span></p><p class="fx-neutral-note">Daily reference rates may stay unchanged on weekends and holidays. Monix saves a valid rate on this device for offline calculations.</p></div>`;
}

function drawFx() {
  const page = document.querySelector('.fx-page'); if (!page) return;
  const snapshot = fxView.snapshot;
  page.querySelector('#fx-date-caption').textContent = snapshot ? 'ECB reference · published ' + fxPublished(snapshot.publicationDate) : 'An online check is needed before the first estimate.';
  page.querySelector('#fx-from-label').textContent = fxFrom;
  page.querySelector('#fx-prefix').textContent = fxFrom === 'CAD' ? 'CA$' : '₱';
  page.querySelector('.fx-currency-dot').textContent = fxFrom === 'CAD' ? 'C' : '₱';
  page.querySelector('#fx-currency-name').textContent = fxFrom === 'CAD' ? 'Canadian dollar' : 'Philippine peso';
  page.querySelector('#fx-direction').value = fxFrom;
  page.querySelector('#fx-result-label').textContent = 'Estimated equivalent · ' + (fxFrom === 'CAD' ? 'PHP' : 'CAD');
  let result = null, amountError = '';
  try { if (fxInput !== '') { MonixFX.parseFxAmount(fxInput); if (snapshot) result = MonixFX.convertFxAmount(fxInput, fxFrom, snapshot); } }
  catch (error) { amountError = error.message; }
  page.querySelector('#fx-amount-error').textContent = amountError;
  page.querySelector('#fx-amount').setAttribute('aria-invalid', String(!!amountError));
  const resultText = result ? MonixFX.formatFxMinor(result.minor, result.currency) : '—';
  if (page.querySelector('#fx-result').textContent !== resultText) page.querySelector('#fx-result').textContent = resultText;
  page.querySelector('#fx-result').dataset.long = String(resultText.length > 16);
  page.querySelector('#fx-amount').dataset.long = String(fxInput.length > 10);
  page.querySelector('[data-fx="copy"]').disabled = !result;
  const rateStatus = page.querySelector('#fx-rate-status');
  rateStatus.querySelector('span').textContent = MonixFX.fxStatus(fxView);
  rateStatus.classList.toggle('attention', !!fxView.error || !fxView.online || !snapshot);
  page.querySelector('#fx-rate-value').textContent = snapshot ? '1 CAD = ' + snapshot.rate + ' PHP' : 'Not available yet';
  page.querySelector('#fx-published').textContent = fxPublished(snapshot?.publicationDate);
  page.querySelector('#fx-checked').textContent = fxChecked(snapshot?.checkedAt);
  page.querySelector('#fx-stale').textContent = MonixFX.fxIsOld(snapshot) ? 'This reference is more than seven days old. Connect and update before relying on the estimate.' : '';
  const button = page.querySelector('[data-fx="refresh"]');
  const seconds = Math.max(0, Math.ceil(((fxView.cooldownUntil || 0) - Date.now()) / 1000));
  button.disabled = fxView.updating || !fxView.online || seconds > 0;
  button.setAttribute('aria-busy', String(fxView.updating));
  button.querySelector('span').textContent = fxView.updating ? 'Updating rate…' : !fxView.online ? 'Go online to update' : seconds ? 'Update available in ' + seconds + 's' : 'Update rate';
  page.querySelector('#fx-message').textContent = fxView.error || '';
  document.querySelector('#fx-review').hidden = fxMode === 'live' && !fxPortable;
  document.querySelector('#fx-review').textContent = fxPortable && fxMode === 'live' ? 'Portable approval copy · uses a verified rate packaged with this review. Open the local preview or hosted app for new rates.' : fxModes[fxMode];
}

async function startFx(mode = 'live') {
  const generation = ++fxGeneration;
  fxController?.destroy(); fxMode = mode;
  let store = fxLocal;
  if (fxPortable && mode === 'live' && window.MONIX_VERIFIED_RATE_SEED) {
    try { const old = await fxLocal.read(); if (!old.snapshot || old.snapshot.publicationDate <= window.MONIX_VERIFIED_RATE_SEED.publicationDate) await fxLocal.save(window.MONIX_VERIFIED_RATE_SEED); } catch { /* Controller presents any unavailable-storage error below. */ }
  }
  if (mode !== 'live') {
    const isolated = MonixFX.createFxDeviceStore({ name: 'monix-fx-review-' + mode + '-' + crypto.randomUUID() });
    const existing = await fxLocal.read().catch(() => ({ snapshot: null }));
    if (mode !== 'empty' && existing.snapshot) { try { await isolated.save(existing.snapshot); } catch { /* Controller will report unavailable storage. */ } }
    store = isolated;
    if (mode === 'stale') {
      const read = store.read;
      store.read = async () => { const row = await read(); if (row.snapshot) row.snapshot = { ...row.snapshot, publicationDate: new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10) }; return row; };
    }
    if (mode === 'storage') store.save = async () => { throw Error('Simulated device storage failure. The previous rate is still saved.'); };
  }
  if (generation !== fxGeneration) return;
  fxView = { snapshot: null, online: !fxPortable && !['offline', 'empty', 'stale'].includes(mode) && navigator.onLine, updating: false, error: '' };
  fxController = MonixFX.createFxController({ store, online: () => !fxPortable && !['offline', 'empty', 'stale'].includes(mode) && navigator.onLine, notify: state => { if (generation === fxGeneration) { fxView = state; drawFx(); } }, ...(mode === 'failure' ? { fetcher: async () => Response.json({ error: 'Simulated rate-service failure' }, { status: 503 }) } : {}), ...(mode === 'live' ? {} : { channelFactory: () => null }) });
  drawFx(); await fxController.start();
  if (['failure', 'storage'].includes(mode)) await fxController.refresh(true);
}

const fxMore = more;
more = function () { return fxMore().replace('<div class="menu-list">', `<div class="menu-list"><button data-nav="currency">${icon('sync')}<span class="menu-label"><strong>Currency converter</strong><small>CAD ↔ PHP · online and offline</small></span>${icon('chevron')}</button>`); };
const fxCompanion = companion;
companion = function () { return fxCompanion().replace('<div class="quick-actions">', `<div class="quick-actions"><button class="quick-action" data-shortcut="currency">${icon('sync')}<strong>Convert currencies</strong><small>CAD ↔ PHP · reference estimate</small></button>`); };
const fxRender = render;
render = function () {
  fxRender(); drawFx();
  if (screen === 'currency' && fxKeyboard && !overlay) {
    const keyboard = document.createElement('div'); keyboard.className = 'fx-keyboard-preview'; keyboard.setAttribute('aria-label', 'Simulated numeric keyboard');
    keyboard.innerHTML = '<p>Simulated keyboard · layout check</p><div>' + ['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(key => '<span>' + key + '</span>').join('') + '</div>';
    document.querySelector('.app-layout').appendChild(keyboard); document.querySelector('.companion-dock')?.remove();
  }
};
document.addEventListener('input', event => { if (event.target.id === 'fx-amount') { fxInput = event.target.value; document.querySelector('[data-fx="copy"] span').textContent = 'Copy result'; drawFx(); } });
document.addEventListener('change', event => { if (event.target.id === 'fx-direction') { fxFrom = event.target.value; document.querySelector('[data-fx="copy"] span').textContent = 'Copy result'; drawFx(); } });
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-fx]'); if (!button) return;
  event.preventDefault(); event.stopImmediatePropagation();
  if (button.dataset.fx === 'swap') { fxFrom = fxFrom === 'CAD' ? 'PHP' : 'CAD'; document.querySelector('[data-fx="copy"] span').textContent = 'Copy result'; drawFx(); }
  if (button.dataset.fx === 'refresh') await fxController?.refresh(true);
  if (button.dataset.fx === 'copy') {
    try {
      const result = MonixFX.convertFxAmount(fxInput, fxFrom, fxView.snapshot);
      await navigator.clipboard.writeText(MonixFX.formatFxMinor(result.minor, result.currency) + ' · reference estimate · ECB ' + fxView.snapshot.publicationDate);
      if (button.isConnected) button.querySelector('span').textContent = 'Copied estimate';
    } catch { const message = document.querySelector('#fx-message'); if (message) message.textContent = 'Copy is unavailable here. You can select the displayed result and copy it manually.'; }
  }
}, true);
const fxEnvironment = () => { void fxController?.environmentChanged(); };
window.addEventListener('online', fxEnvironment); window.addEventListener('offline', fxEnvironment); document.addEventListener('visibilitychange', fxEnvironment);
window.addEventListener('monix-signout', () => { fxInput = ''; drawFx(); });
window.addEventListener('pagehide', () => { fxInput = ''; fxGeneration++; fxController?.destroy(); });
window.addEventListener('pageshow', event => { if (event.persisted) void startFx(fxMode); });
document.addEventListener('focusin', event => { if (event.target.matches('.fx-page input,.fx-page select')) document.documentElement.classList.add('fx-input-open'); });
document.addEventListener('focusout', () => queueMicrotask(() => { if (!document.activeElement?.matches('.fx-page input,.fx-page select')) document.documentElement.classList.remove('fx-input-open'); }));
function fxViewport() { document.documentElement.style.setProperty('--fx-viewport-height', (window.visualViewport?.height || innerHeight) + 'px'); }
window.visualViewport?.addEventListener('resize', fxViewport); fxViewport();
setInterval(() => {
  if (document.hidden) return;
  const button = document.querySelector('[data-fx="refresh"]'); if (!button) return;
  const seconds = Math.max(0, Math.ceil(((fxView.cooldownUntil || 0) - Date.now()) / 1000));
  const label = fxView.updating ? 'Updating rate…' : !fxView.online ? 'Go online to update' : seconds ? 'Update available in ' + seconds + 's' : 'Update rate';
  if (button.querySelector('span').textContent !== label) button.querySelector('span').textContent = label;
  button.disabled = fxView.updating || !fxView.online || seconds > 0;
}, 1000);
window.addEventListener('message', event => {
  if (event.source !== parent || event.data?.channel !== 'monix-proposal') return;
  if (event.data.action === 'currency') navigate('currency');
  if (event.data.action === 'fx-keyboard') { fxKeyboard = !fxKeyboard; navigate('currency'); }
  if (event.data.action === 'fx-scenario' && Object.hasOwn(fxModes, event.data.mode)) { navigate('currency'); void startFx(event.data.mode); }
});
if (screen === 'currency') render();
void startFx(Object.hasOwn(fxModes, params.get('fx-mode')) ? params.get('fx-mode') : 'live');
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('/review-sw.js').catch(() => {});
