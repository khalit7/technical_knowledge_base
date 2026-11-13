// ---- Corrupt a sentence: the shared lengths and scores (used by the span-corruption stage, 31_js_sc_span.js), the playground and the cost chart ----
const SG_ROW={bert:['T5','BERT-style (Devlin et al., 2018)'],iid:['T5','Replace corrupted spans'],span:['T7','3']};
const sgOf=(t,n,j)=>{const r=TB[t].rows.find(x=>x.name===n);return r?r.v[j==null?3:j]:'?'};
const L512={bert:{inp:512,tgt:512},iid:T5.lenIid(512,0.15),span:T5.lenSpans(512,0.15,3)};
// Playground
(function(){const sel=$('pgObj');if(!sel)return;T5.OBJ.forEach((o,i)=>{const op=document.createElement('option');op.value=o.k;op.textContent=o.n;if(o.k==='spans')op.selected=true;sel.appendChild(op)});
  let seed=7;
  function go(){const tok=$('pgText').value.trim().split(/\s+/).filter(Boolean).slice(0,600),ob=sel.value,rate=+$('pgRate').value/100,span=+$('pgSpan').value,hf=$('pgHF').checked;
    $('pgRatev').textContent=Math.round(rate*100)+'%';$('pgSpanv').textContent=span;$('pgSpanL').style.opacity=ob==='spans'?1:.45;$('pgSpan').disabled=ob!=='spans';
    if(!tok.length){$('pgIn').innerHTML='';$('pgTgt').innerHTML='';$('pgCnt').textContent='Type some text.';return}
    const r=T5.apply(ob,tok,rate,span,seed,hf);$('pgIn').innerHTML=r.inp.map(tokChip).join('');$('pgTgt').innerHTML=r.tgt.map(tokChip).join('');
    const nc=r.mask.filter(Boolean).length,O=T5.OBJ.find(o=>o.k===ob);const row=TB[O.tbl].rows.find(x=>x.name===O.row);
    let c='<b>'+tok.length+'</b> tokens of text → input <b>'+r.inp.length+'</b>, target <b>'+r.tgt.length+'</b> (plus EOS each). ';
    if(ob!=='prefix'&&ob!=='deshuf')c+=nc+' corrupted ('+(100*nc/tok.length).toFixed(0)+'%)'+(r.spans!=null?' in '+r.spans+' run'+(r.spans===1?'':'s'):'')+'. ';
    if(ob==='spans'){const e=Math.min(Math.max(T5.rnd(tok.length*rate),1),Math.max(1,tok.length-1));c+='The code fixes these counts: round('+tok.length+' × '+rate.toFixed(2)+') = '+e+' corrupted, round('+e+' / '+span+') = '+Math.max(1,T5.rnd(e/span))+' spans (rounding half to even, as TensorFlow does). '}
    if(row)c+='Paper\'s score for this objective at 15%'+(ob==='spans'?', mean span 3':'')+': GLUE '+row.v[0]+', SuperGLUE '+row.v[3]+' ('+O.tbl.replace('T','Table ')+').';
    $('pgCnt').innerHTML=c;
    $('pgNote').innerHTML=(r.note||'')+(ob==='spans'?' Spans alternate clean, corrupted, clean, ..., starting clean, so with random_roll off (the default) the last tokens are always corrupted; real pretraining cuts its examples from longer documents.':'')+(ob==='iidrep'||ob==='spans'?' Sentinel numbering follows noise_span_to_unique_sentinel: inputs on the mask, targets on the inverted mask, so a target ending in clean text closes with one more sentinel.':'')}
  ['pgRate','pgSpan','pgText'].forEach(i=>$(i).addEventListener('input',go));['pgObj','pgHF'].forEach(i=>$(i).addEventListener('change',go));$('pgSeed').addEventListener('click',()=>{seed=(seed*1103515245+12345)>>>0;go()});
  $('pgPre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$('pgText').value=PRESETS[+b.dataset.p];go()});go()})();
// Cost against score
(function(){const el=$('lenSvg');if(!el)return;
  const pts=()=>{const P=[],add=(n,x,t,row)=>{const r=TB[t].rows.find(q=>q.name===row);if(r)P.push({n,x,v:r.v,t})};
    add('Prefix LM',257,'T4','Prefix language modeling');add('BERT-style',512,'T4','BERT-style (Devlin et al., 2018)');add('Deshuffling',512,'T4','Deshuffling');add('MASS-style',512,'T5','MASS-style (Song et al., 2019)');
    add('i.i.d. 15% (baseline)',T5.lenIid(512,.15).tgt,'T5','Replace corrupted spans');add('drop tokens',T5.lenIid(512,.15).drop,'T5','Drop corrupted tokens');
    [10,25,50].forEach(p=>add('i.i.d. '+p+'%',T5.lenIid(512,p/100).tgt,'T6',p+'%'));[2,3,5,10].forEach(s=>add('spans '+s,T5.lenSpans(512,.15,s).tgt,'T7',''+s));return P};
  const P=pts();
  function draw(W){const j=+$('lenMet').value,H=W<560?440:270,pl=44,pr=12,pt=26,pb=36;const vs=P.map(p=>+p.v[j]),lo=Math.min(...vs),hi=Math.max(...vs),pad=(hi-lo)*.12;
    const X=x=>pl+(W-pl-pr)*(x-40)/(540-40),Y=v=>pt+(H-pt-pb)*(1-(v-(lo-pad))/((hi+pad)-(lo-pad)));let s='';
    const best=Math.max(...vs);s+=rc(pl,Y(best),W-pl-pr,Y(best-2*SD7[j])-Y(best),'var(--acc2)',{r:0,op:.75});
    [100,200,300,400,500].forEach(x=>{s+=ln2(X(x),H-pb,X(x),H-pb+4,'var(--mute)')+tx(X(x),H-pb+16,x,{fs:11,a:'middle',c:'var(--mute)'})});
    const st=(hi-lo)>8?2:(hi-lo)>3?1:0.5;for(let v=Math.ceil((lo-pad)/st)*st;v<=hi+pad;v+=st)s+=ln2(pl,Y(v),W-pr,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,+v.toFixed(1),{fs:11,a:'end',c:'var(--mute)'});
    s+=tx((pl+W-pr)/2,H-2,'target tokens per 512 tokens of text (computed)',{fs:11,a:'middle',c:'var(--mute)'});
    const L=P.map(p=>({x:X(p.x),y:Y(+p.v[j]),t:p.n,fs:11.8,p}));placeLabels(L,W-8,H-pb);L.forEach(l=>{l.fs=11});
    {const R5=L.filter(l=>l.p.x===512).sort((a,b)=>a.y-b.y);let last=-99;R5.forEach(l=>{l.la='end';l.lx=l.x-9;l.ly=Math.max(l.y+4,last+13);last=l.ly})} // the three full-reconstruction rows share x = 512: stack their labels to the left
    L.forEach(l=>{const w=l.t.length*11*.62,left=l.la==='end'?l.lx-w:l.la==='middle'?l.lx-w/2:l.lx;if(left<pl+2&&l.x<W/2){l.la='start';l.lx=l.x+8}}); // keep labels off the y axis
    L.forEach(l=>{const w=l.t.length*11*.62;if(l.la==='start'&&l.lx+w>W-4){l.la='end';l.lx=l.x-8}if(l.la==='middle'&&l.lx+w/2>W-4){l.la='end';l.lx=W-4}});
    L.forEach(l=>{const c=/spans/.test(l.t)?'var(--c3)':/i\.i\.d|drop/.test(l.t)?'var(--c1)':'var(--c2)';s+='<circle cx="'+l.x.toFixed(1)+'" cy="'+l.y.toFixed(1)+'" r="4.5" fill="'+c+'"><title>'+escH(l.t)+': '+l.p.v[j]+' ('+l.p.t.replace('T','Table ')+')</title></circle>'+tx(l.lx,l.ly,escH(l.t),{fs:11,a:l.la})});
    el.innerHTML=svgW(W,H,s,'Target length against score');
    const sp=P.find(p=>p.n==='spans 3'),be=P.find(p=>p.n==='BERT-style');
    $('lenO').innerHTML='Spans of mean 3 write '+sp.x.toFixed(0)+' target tokens per 512 against BERT-style\'s 512 ('+(512/sp.x).toFixed(1)+'× fewer) and score '+sp.v[j]+' against '+be.v[j]+' on '+$('lenMet').selectedOptions[0].textContent+'. Shaded: within two baseline standard deviations ('+(2*SD7[j]).toFixed(2)+') of the best point. Blue: i.i.d. noise; green: spans; orange: other objectives. Hover a point for its table.'}
  $('lenMet').addEventListener('change',()=>refit(el));onTab('t-read',()=>refit(el));fit(el,draw);
  // the JS port's lengths against recompute.py's port of random_spans_helper
  let n=0,ok=0;Object.keys(RC.spans).forEach(k=>{const [d,s]=k.split('_').map(Number),a=T5.helper(512,d,s),b=RC.spans[k];n++;if(a.raw===b.raw&&a.inputs===b.inputs&&a.targets===b.targets)ok++});
  Object.keys(RC.spans_per512).forEach(k=>{const [d,s]=k.split('_').map(Number),a=T5.lenSpans(512,d,s),b=RC.spans_per512[k];n++;if(a.inp===b.inputs&&a.tgt===b.targets)ok++});
  const h=T5.helper(512,.15,3);$('lenChk').innerHTML=ok+' of '+n+' settings agree with recompute.py. In the T5 code\'s own configuration (random_spans_helper with inputs_length 512, 15%, mean 3) the raw text is '+h.raw+' tokens, the input exactly '+h.inputs+' and the target '+h.targets+'.'})();
