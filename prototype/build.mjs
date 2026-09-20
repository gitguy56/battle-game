// Bundles src/ and three.js into ONE self-contained HTML file, so the game can
// be opened by double-clicking it - no server, no install, works offline.
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';

const out = await esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true, format: 'iife', minify: true, write: false,
  target: ['chrome110', 'firefox110', 'safari16'],
  legalComments: 'none',
});

const js = out.outputFiles[0].text;
const html = readFileSync('template.html', 'utf8').replace('/*__BUNDLE__*/', () => js);
writeFileSync('bodycam-prototype.html', html);
console.log(`built bodycam-prototype.html  (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
