// One build, two outputs:
//   bodycam-prototype.html - standalone, opens by double-clicking
//   artifact.html          - same page as a fragment, for hosting on claude.ai
//                            (the host supplies doctype/head/body itself)
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';

const out = await esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true, format: 'iife', minify: true, write: false,
  target: ['chrome110', 'firefox110', 'safari16'],
  legalComments: 'none',
});

const js = out.outputFiles[0].text;
const css = readFileSync('page/style.css', 'utf8');
const body = readFileSync('page/body.html', 'utf8');
const TITLE = 'Unit 2-1 Bodycam';

const head = `<title>${TITLE}</title>\n<style>\n${css}</style>`;
const page = `${head}\n\n${body}\n<script>${js}</script>\n`;

writeFileSync('artifact.html', page);
writeFileSync('bodycam-prototype.html',
  `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n` +
  `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n` +
  `${head}\n</head>\n<body>\n${body}\n<script>${js}</script>\n</body>\n</html>\n`);

const mb = n => (n / 1024 / 1024).toFixed(2) + ' MB';
console.log(`bodycam-prototype.html ${mb(page.length + 200)}   artifact.html ${mb(page.length)}`);
