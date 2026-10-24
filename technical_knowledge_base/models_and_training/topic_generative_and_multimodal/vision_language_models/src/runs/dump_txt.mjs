// Dump the rendered text of every [data-vm] element and the Reading tab's text, for runs/check_data.py.
// node runs/dump_txt.mjs <out.json>
import {createRequire} from 'module';import path from 'path';import {fileURLToPath} from 'url';import fs from 'fs';
const here=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(path.resolve(here,'../../../../../../html_utils/package.json'));const puppeteer=require('puppeteer');
const b=await puppeteer.launch({headless:'shell'});const p=await b.newPage();await p.setViewport({width:920,height:900});
await p.goto('file://'+path.resolve(here,'../../index.html'));await new Promise(r=>setTimeout(r,400));
const out=await p.evaluate(()=>{const o={};document.querySelectorAll('[data-vm]').forEach(e=>{o[e.dataset.vm]=e.textContent});
  o.__read=document.getElementById('t-read').textContent;
  for(const t of ['t-vmsaw','t-vmbud']){document.querySelector('#tabs button[data-t="'+t+'"]').click();o['__'+t]=document.getElementById(t).innerText}return o});
fs.writeFileSync(process.argv[2],JSON.stringify(out,null,1));await b.close();
