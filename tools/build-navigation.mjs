#!/usr/bin/env node
// Embed rendered chapter TOCs in each page: no fetch, including on file://.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
const output=resolve(process.env.QUARTO_PROJECT_OUTPUT_DIR||'_book');
const pages=readdirSync(output).filter(file=>file.endsWith('.html')).map(file=>({file,html:readFileSync(resolve(output,file),'utf8')}));
const chapters=pages.flatMap(({file,html})=>{
  const toc=html.match(/<nav\b[^>]*\bid="TOC"[^>]*>([\s\S]*?)<\/nav>/);
  if(!toc)return [];
  const list=toc[1].match(/<ul\b[\s\S]*<\/ul>/);
  return list?[{file,html:list[0]}]:[];
});
const data=JSON.stringify(chapters).replaceAll('<','\\u003c');
for(const {file,html} of pages){
  if(!html.includes('id="quarto-sidebar"'))continue;
  const clean=html.replace(/<script id="book-toc-data" type="application\/json">[\s\S]*?<\/script>\s*/g,'');
  writeFileSync(resolve(output,file),clean.replace('</head>',`<script id="book-toc-data" type="application/json">${data}</script>\n</head>`));
}
