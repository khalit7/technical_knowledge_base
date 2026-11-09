// ---- Reading tab: the needle pair and the shared-word count (window.LC_overlap, also used by the NoLiMa stage) ----
(function(){
const D=window.LD, esc=RD.esc;
const C=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888';
const tok=s=>(s.toLowerCase().match(/[a-z0-9]+/g)||[]);
// content words of q found in needle (same rule as recompute.py)
function overlap(q,needle){const nd=new Set(tok(needle));const qa=tok(q);const qc=qa.filter(w=>D.stop.indexOf(w)<0);
  const hits=qc.filter(w=>nd.has(w));return {all:qa,qc,hits,prec:qc.length?hits.length/qc.length:0}}
window.LC_overlap=overlap;
// highlight words of text: in set -> w-hit ; for the question, content words not found -> w-miss
function mark(text,hitSet,missSet){return text.replace(/[A-Za-z0-9]+/g,w=>{const l=w.toLowerCase();
  if(hitSet&&hitSet.has(l))return '<span class="w-hit">'+w+'</span>';if(missSet&&missSet.has(l))return '<span class="w-miss">'+w+'</span>';return w})}

// 1. Kamradt needle and question with shared words marked
(function(){const el=document.getElementById('niah-pair');if(!el)return;const p=D.pairs.niah;const o=overlap(p.q,p.needle);
  const hs=new Set(o.hits),ms=new Set(o.qc.filter(w=>!hs.has(w)));
  el.innerHTML='<div class="qa"><b>Needle</b>'+mark(esc(p.needle),hs)+'</div><div class="qa"><b>Question</b>'+mark(esc(p.q),hs,ms)+'</div>'+
  '<p class="note" style="margin:6px 0 0">Highlighted: question content words that appear in the needle, '+o.hits.length+' of '+o.qc.length+' ('+o.hits.join(', ')+'; not found: '+o.qc.filter(w=>o.hits.indexOf(w)<0).join(', ')+'). NoLiMa measured the same thing over the whole vanilla NIAH set with ROUGE-1 precision: 0.905.</p>'})();

// The lost-in-the-middle chart, the NoLiMa stepper and the MMMU stepper became the 3D stages 41_js_sc_mid.js, 42_js_sc_nl.js and 43_js_sc_mm.js (2026-11-09).
})();
