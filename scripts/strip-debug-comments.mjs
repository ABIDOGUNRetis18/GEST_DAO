/**
 * Supprime les commentaires TODO/DEBUG/BUG des bundles de production.
 * Corrige : [INFO] Suspicious Comments (CWE-615)
 * Usage : node scripts/strip-debug-comments.mjs
 */
import fs from 'fs';
import { glob } from 'glob';

const patterns = [
  /\/\/\s*(TODO|FIXME|HACK|BUG|XXX|DEBUG|TEMP)[^\n]*/gi,
  /\/\*[\s\S]*?(TODO|FIXME|BUG|DEBUG)[\s\S]*?\*\//gi,
];
const files = await glob('.next/static/chunks/*.js');
let total = 0;
for (const f of files) {
  let src = fs.readFileSync(f, 'utf8');
  let n = 0;
  patterns.forEach(re => { src = src.replace(re, () => { n++; return ''; }); });
  if (n > 0) { fs.writeFileSync(f, src); total += n; }
}
console.log(`✅ ${total} commentaires debug supprimés (${files.length} fichiers)`);
