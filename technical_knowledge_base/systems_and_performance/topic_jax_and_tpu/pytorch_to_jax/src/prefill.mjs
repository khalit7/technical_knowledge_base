// Fill every empty data-k span in ../index.html with its value at build time (same lookup and formats as PJU in
// parts/23_js_pj_util.js), so the numbers are in the static page: readable without scripts and checkable by
// html_utils/ledger.py. The page's script refills them at load with identical text. Run by build.sh.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),file=path.join(here,'..','index.html');
const html=fs.readFileSync(file,'utf8');
const m=html.match(/window\.PJ=(\{.*?\});\n<\/script>/s);if(!m){console.error('prefill: window.PJ not found');process.exit(1)}
const J=JSON.parse(m[1]);
function get(p){let o=J,rest=p;
  while(rest!==''){if(o==null||typeof o!=='object')return undefined;
    if(Object.prototype.hasOwnProperty.call(o,rest)){o=o[rest];rest='';break}
    const ks=Object.keys(o).sort((a,b)=>b.length-a.length);const k=ks.find(k=>rest.startsWith(k+'.'));
    if(k===undefined)return undefined;o=o[k];rest=rest.slice(k.length+1)}
  return o}
function sig(v,n){if(typeof v!=='number'||!isFinite(v))return String(v);if(v===0)return '0';const a=Math.abs(v);if(a>=1e4||a<1e-3){const e=v.toExponential(n-1).split('e');return e[0]+'e'+(+e[1])}return (+v.toPrecision(n)).toString()}
function fmt(v,f){if(v===undefined||v===null)return '?';if(typeof v==='string')return v;
  switch(f){case 'int':return Math.round(v).toLocaleString('en-US');
    case 'f0':return v.toFixed(0);case 'f1':return v.toFixed(1);case 'f2':return v.toFixed(2);case 'f3':return v.toFixed(3);case 'f4':return v.toFixed(4);
    case 'e1':return v.toExponential(1).replace('e+','e');case 'e2':return v.toExponential(2).replace('e+','e');
    case 's2':return sig(v,2);case 's3':return sig(v,3);case 'pct':return (100*v).toFixed(1)+'%';default:return String(v)}}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cut=html.indexOf('<div id="jsErr"');
let n=0,miss=0;
const body=html.slice(0,cut).replace(/<(span|code)\b([^>]*?\bdata-k="([^"]+)"[^>]*)><\/\1>/g,(all,tag,attrs,k)=>{
  const f=(attrs.match(/\bdata-f="([^"]+)"/)||[])[1];let v=get(k);
  if(Array.isArray(v)&&k.endsWith('.length'))v=v.length;
  const t=fmt(v,f);if(t==='?')miss++;n++;return '<'+tag+attrs+'>'+esc(t)+'</'+tag+'>'});
fs.writeFileSync(file,body+html.slice(cut));
console.log('prefill: '+n+' data spans filled'+(miss?', '+miss+' unresolved':''));
