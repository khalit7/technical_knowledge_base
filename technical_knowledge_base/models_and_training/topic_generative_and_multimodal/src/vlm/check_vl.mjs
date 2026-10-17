// Check the VLM lab tab: every control clicked at 390 px dark and 920 px light, no page errors in this tab's scripts,
// no NaN or undefined, no sideways scroll; reading time measured (220 words per minute); screenshots to argv[2].
// Usage: node check_vl.mjs <shots dir> [index.html]
import {createRequire} from 'module';
import path from 'path';
import {fileURLToPath} from 'url';
import fs from 'fs';
const here=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(path.resolve(here,'../../../../../html_utils/package.json'));
const puppeteer=require('puppeteer');
const page_=process.argv[3]||path.resolve(here,'../../index.html');
const shots=process.argv[2]||path.resolve(here,'.shots');fs.mkdirSync(shots,{recursive:true});
const html=fs.readFileSync(page_,'utf8').split('\n');const mine=[];let cur=null;
html.forEach((l,i)=>{const m=l.match(/<script>\/\* (\S+) \*\//);if(m){cur=m[1].startsWith('35_js_vl')?[i+1]:null}if(cur&&l.includes('</script>')){cur.push(i+1);mine.push(cur);cur=null}});
const isMine=e=>{const m=[...String(e).matchAll(/index\.html:(\d+)|\(line (\d+)\)/g)];return m.length===0?/VL|vl-/.test(String(e)):m.some(x=>{const n=+(x[1]||x[2]);return mine.some(([a,z])=>n>=a&&n<=z)})};
const b=await puppeteer.launch({headless:'shell'});
let bad=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));
try{
for(const [w,scheme] of [[390,'dark'],[920,'light']]){
  const p=await b.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.setViewport({width:w,height:900});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.goto('file://'+page_);
  await p.evaluate(()=>{try{localStorage.clear()}catch(e){}document.querySelector('#tabs button[data-t="t-vlm"]').click()});
  await wait(400);
  const H=await p.evaluate(()=>document.body.scrollHeight);
  for(let y=0;y<H;y+=600){await p.evaluate(y=>scrollTo(0,y),y);await wait(40)}
  // pipeline: every step of both modes, screenshot at steps 4, 5 and 7
  for(const mode of [0,1]){
    await p.evaluate(m=>document.querySelectorAll('#vl-pipe-mode button')[m].click(),mode);
    for(const st of [0,1,2,3,4,5,6]){await p.evaluate(i=>{const s=document.getElementById('vl-pipe-ctl-s');s.value=i;s.dispatchEvent(new Event('input'))},st);
      if([3,4,6].includes(st)){const el=await p.$('#vl-pipe');await el.scrollIntoView();await wait(120);await el.screenshot({path:path.join(shots,'pipe_m'+mode+'_s'+st+'_'+w+'.png')})}}
  }
  const n=await p.evaluate(async()=>{let k=0;const T=document.getElementById('t-vlm');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    for(const el of T.querySelectorAll('button,summary')){el.click();k++;await sleep(3)}
    for(const s of T.querySelectorAll('select')){for(const o of s.options){s.value=o.value;s.dispatchEvent(new Event('change'));k++;await sleep(3)}}
    for(const r of T.querySelectorAll('input[type=range]')){for(const v of [r.min,r.max,(+r.min+ +r.max)/2]){r.value=v;r.dispatchEvent(new Event('input'));k++}}
    const sp=document.getElementById('vl-bd-split');for(const c of [false,true]){sp.checked=c;sp.dispatchEvent(new Event('input'));k++}
    for(const [id,v] of [['vl-bd-w','1'],['vl-bd-w','10000'],['vl-bd-h','3'],['vl-bd-q','0'],['vl-bd-w','abc'],['vl-bd-w','512'],['vl-bd-h','512'],['vl-bd-q','15']]){const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input'));k++}
    for(const b of document.querySelectorAll('#vl-qa-b button')){b.click();for(const f of document.querySelectorAll('#vl-qa-f button')){f.click();k++}}
    document.querySelectorAll('#vl-qa-f button')[0].click();
    for(const b of document.querySelectorAll('#vl-cap-th button')){b.click();k++}
    document.querySelectorAll('#vl-cap-th button')[0].click();
    return k});
  await wait(200);
  const txt=await p.evaluate(()=>document.getElementById('t-vlm').innerText);
  const bads=(txt.match(/NaN|undefined|Infinity|\[object/g)||[]);
  const side=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  const words=txt.split(/\s+/).filter(Boolean).length;
  for(const id of ['vl-bd-out','vl-qa-card','vl-pope-card','vl-cap','vl-time-card','vl-kinds']){const el=await p.$('#'+id);if(el){await el.scrollIntoView();await wait(80);await el.screenshot({path:path.join(shots,id+'_'+w+'.png')})}}
  const myErr=errs.filter(isMine),other=errs.filter(e=>!isMine(e));
  console.log(w,scheme,'controls',n,'errors(mine)',myErr.length,'errors(other tabs)',other.length,'NaN/undefined',bads.length,'sideways px',side,'words',words,'minutes at 220 wpm',(words/220).toFixed(1));
  myErr.forEach(e=>console.log('  ERR',e.slice(0,300)));other.slice(0,3).forEach(e=>console.log('  other',e.slice(0,160)));
  if(myErr.length||bads.length||side>0)bad++;
  await p.close();
}
}finally{await b.close()}
process.exit(bad?1:0);
