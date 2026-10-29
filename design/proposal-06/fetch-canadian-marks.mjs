import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const sources = {
  cibc: 'https://www.cibc.com/content/dam/global-assets/logos/cibc-logos/no-tagline/cibc-logo-colour-142x36.svg',
  td: 'https://www.td.com/content/dam/tdct/images/navigation-header-and-footer/td-logo-desktop.png',
  scotiabank: 'https://www.scotiabank.com/content/dam/scotiabank/images/logos/2019/scotiabank-logo-red-desktop-200px.svg',
  rbc: 'https://www.rbcroyalbank.com/dvl/assets/images/logos/rbc-logo-shield.svg',
  bmo: 'https://www.bmo.com/dam_asset/asset/9388c217-ca0f-4fbc-90bf-12547e7930e7/bmo-blue-on-transparent-en.svg'
};
await mkdir(new URL('assets/brands/', import.meta.url), { recursive: true });
const marks = {}, manifest = [];
for (const [id, url] of Object.entries(sources)) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw Error('Could not obtain official ' + id + ' mark.');
  const bytes = Buffer.from(await response.arrayBuffer()), svg = url.endsWith('.svg');
  if (bytes.length > 300_000) throw Error('Unexpected asset size.');
  if (svg && (!bytes.toString().includes('<svg') || /<script|foreignObject|onload=|onerror=|(?:href|src)=["'](?:https?:|javascript:)/i.test(bytes.toString()))) throw Error('Unsafe SVG asset.');
  if (!svg && bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw Error('Unexpected PNG data.');
  const file = 'assets/brands/' + id + '-official.' + (svg ? 'svg' : 'png');
  await writeFile(new URL(file, import.meta.url), bytes);
  marks[id] = 'data:' + (svg ? 'image/svg+xml' : 'image/png') + ';base64,' + bytes.toString('base64');
  manifest.push({ id, source: url, file, sha256: createHash('sha256').update(bytes).digest('hex') });
}
await writeFile(new URL('canadian-marks.js', import.meta.url), 'window.MONIX_CA_MARKS=' + JSON.stringify(marks) + ';\n');
await writeFile(new URL('bank-asset-sources.json', import.meta.url), JSON.stringify(manifest, null, 2));
console.log('Bundled five verified official Canadian marks.');
