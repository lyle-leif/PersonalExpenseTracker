import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
const html = await readFile(new URL('Monix-Proposal-08-Review.html', import.meta.url), 'utf8');
const children = [...html.matchAll(/srcdoc="([\s\S]*?)" width="440"/g)];
if (children.length !== 2) throw Error('Both embedded phone previews must be present.');
for (const [index, match] of children.entries()) {
  const child = match[1].replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
  if ([...child.matchAll(/<\/html>/g)].length !== 1) throw Error('Embedded HTML was corrupted.');
  if (!child.includes("'CA$'")) throw Error('Canadian currency symbols were corrupted.');
  for (const [scriptIndex, script] of [...child.matchAll(/<script>([\s\S]*?)<\/script>/g)].entries()) new Script(script[1], { filename: `phone-${index}-script-${scriptIndex}.js` });
  if (/src="(?:assets\/|[^d][^a][^t][^a]:\/\/)/.test(child)) throw Error('Unexpected external runtime image dependency.');
}
console.log('Both portable phone scripts compile; CA$ text and embedded HTML are intact.');
