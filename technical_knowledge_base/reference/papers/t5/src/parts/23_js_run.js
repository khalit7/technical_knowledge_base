// ---- Corrupt a sentence: the before/after animation, the playground and the cost chart ----
const SG_ROW={bert:['T5','BERT-style (Devlin et al., 2018)'],iid:['T5','Replace corrupted spans'],span:['T7','3']};
const sgOf=(t,n,j)=>{const r=TB[t].rows.find(x=>x.name===n);return r?r.v[j==null?3:j]:'?'};
const L512={bert:{inp:512,tgt:512},iid:T5.lenIid(512,0.15),span:T5.lenSpans(512,0.15,3)};
(function(){
  const cap={
   bert:[{t:'the text',c:'The paper\'s sentence, one token per word.'},
         {t:'pick tokens independently',c:'Each token is picked for corruption independently with probability 15%. Here three are: "for", "inviting" and "last".'},
         {t:'corrupt them in place',c:'90% of the picked tokens become a shared mask token &lt;M&gt;, 10% a random token (here "apple"): BERT\'s recipe, kept token for token, so the input stays 11 long.'},
         {t:'the target is the whole text',c:'An encoder-only BERT predicts the masked tokens at the encoder\'s output. In the encoder-decoder the decoder has to reproduce the entire original sequence, the corrupted words and the 8 it could have copied.'},
         {t:'at 512 tokens, to scale',c:'Per 512 tokens of text the decoder writes all 512. SuperGLUE 69.85 (Table 5).'}],
   iid:[{t:'the text',c:'The same sentence.'},
        {t:'pick tokens independently',c:'The same i.i.d. 15% choice: "for", "inviting" and "last" (Figure 2).'},
        {t:'one sentinel per run',c:'Each run of consecutive corrupted tokens becomes one sentinel unique within the example: "for inviting" becomes &lt;X&gt;, "last" becomes &lt;Y&gt;. The input shrinks from 11 to 10.'},
        {t:'the target is only what was dropped',c:'The target is the dropped spans, each after the sentinel that replaced it, closed by a final sentinel &lt;Z&gt;: 6 tokens instead of 11. This is the baseline objective.'},
        {t:'at 512 tokens, to scale',c:'Per 512 tokens of text the target averages about 144 tokens (77 corrupted words plus about 66 sentinels and EOS), against BERT-style\'s 512, for a higher score: SuperGLUE 71.36 (Table 5).'}],
   span:[{t:'the text',c:'The same sentence.'},
         {t:'pick whole spans',c:'Instead of independent coin flips, the T5 code fixes the number of corrupted tokens, round(n × 15%), and the number of spans, round(that / 3), and draws only where the span boundaries fall. Table 3\'s illustration corrupts two spans of three.'},
         {t:'one sentinel per span',c:'Each span becomes one sentinel. The input shrinks from 11 to 7.'},
         {t:'the target is only the spans',c:'&lt;X&gt; for inviting me &lt;Y&gt; your party last &lt;Z&gt;.'},
         {t:'at 512 tokens, to scale',c:'Per 512 tokens of text, at 15% and mean span 3: exactly 77 corrupted tokens in 26 spans, so the input is 462 and the target 104 (with EOS). Shortest of the three, and SuperGLUE 72.53 (Table 7): the final T5 objective.'}]};
  const modes={};Object.keys(cap).forEach(k=>modes[k]=cap[k]);
  const wd=t=>t.length*6.7+12;
  function rowToks(s,toks,x0,y,W,op,cls){let x=x0,yy=y;toks.forEach(t=>{const w=wd(t.replace(/^~/,''));if(x+w>W-2){x=x0;yy+=24}
      const sent=/^</.test(t),rnd=/^~/.test(t),label=escH(t.replace(/^~/,''));
      s.v+=G(op,rc(x,yy,w,19,sent?'var(--acc2)':cls&&cls(t)?'var(--hl)':'var(--bg)',{r:4,s:sent?'var(--acc)':rnd?'var(--bad)':'var(--line)'})+tx(x+w/2,yy+14,label,{fs:12,a:'middle',c:rnd?'var(--bad)':'var(--ink)',w:sent?600:null})+(rnd?ln2(x+5,yy+10,x+w-5,yy+10,'var(--bad)'):''));x+=w+4});return yy+24}
  function draw(m,k,e,W){const F=FIG[m],o={v:''};let y=4;const lab=(t,yy)=>{o.v+=tx(0,yy+13,t,{fs:11,c:'var(--mute)'})};
    if(k<4){lab('text',y);y=rowToks(o,FIG_TOK,0,y+18,W,1,null);
      if(k>=1){const tk=FIG_TOK;let x=0,yy=4+18;tk.forEach((t,i)=>{const w=wd(t);if(x+w>W-2){x=0;yy+=24}if(F.mask[i])o.v+=G(k===1?e:1,rc(x-1,yy-1,w+2,21,'none',{r:5,s:'var(--bad)',sw:2})+tx(x+w-2,yy-2,'×',{fs:12,a:'end',c:'var(--bad)',w:700}));x+=w+4})}
      y+=6;if(k>=2){lab('input (encoder)',y);y=rowToks(o,F.inp,0,y+18,W,k===2?e:1,null)+6}
      if(k>=3){lab('target (decoder)',y);y=rowToks(o,F.tgt,0,y+18,W,k===3?e:1,null)+6}
      return svgW(W,Math.max(y,150),o.v,'Corruption, step by step')}
    // step 5: to scale, one square per 8 tokens of a 512-token text
    const sq=Math.max(5,Math.min(10,Math.floor((W-4)/64)-1)),per=Math.max(8,Math.floor((W-4)/(sq+1)));
    const blocks=(n,yy,c,op)=>{const cnt=Math.round(n/8);let s='';for(let i=0;i<cnt;i++){const r=Math.floor(i/per),cI=i%per;s+=rc(cI*(sq+1),yy+r*(sq+1),sq,sq,c,{r:1})}return {s:G(op,s),h:(Math.ceil(cnt/per))*(sq+1)}};
    ['bert','iid','span'].forEach(mm=>{const L=L512[mm],on=mm===m;lab((mm==='bert'?'BERT-style':mm==='iid'?'i.i.d., replace spans':'random spans (T5)')+(on?'  (this mode)':''),y);y+=18;
      const a=blocks(L.inp,y,'var(--c1)',on?1:.35);o.v+=a.s;y+=a.h+3;const b=blocks(L.tgt,y,'var(--c2)',on?e:.35);o.v+=b.s;y+=b.h+10});
    const lg=legend([['input tokens','var(--c1)'],['target tokens','var(--c2)']],0,y+8,W);o.v+=lg.s;y+=lg.h+6;
    return svgW(W,y,o.v,'Lengths at 512 tokens')}
  function counters(m,k){const F=FIG[m],L=L512[m];const sg=sgOf(SG_ROW[m][0],SG_ROW[m][1]);
    if(k<4)return stat('input tokens',k>=2?F.inp.length:FIG_TOK.length,'of 11 words')+stat('target tokens',k>=3?F.tgt.length:'…','the decoder writes these')+stat('SuperGLUE',k>=3?sg:'…',SG_ROW[m][0].replace('T','Table '));
    return stat('input per 512 text tokens',L.inp.toFixed(m==='iid'?1:0),'with EOS')+stat('target per 512 text tokens',L.tgt.toFixed(m==='iid'?1:0),(L.tgt/L512.span.tgt).toFixed(2)+'× the span target')+stat('decoder self-attention pairs',fmt(Math.round(L.tgt*(L.tgt+1)/2)),'causal, per layer and head')+stat('SuperGLUE',sg,SG_ROW[m][0].replace('T','Table '))}
  makeAnim({id:'spx',modes,mode:'bert',draw,counters,dur:2800})})();
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
  function draw(W){const j=+$('lenMet').value,H=W<560?300:270,pl=44,pr=12,pt=14,pb=36;const vs=P.map(p=>+p.v[j]),lo=Math.min(...vs),hi=Math.max(...vs),pad=(hi-lo)*.12;
    const X=x=>pl+(W-pl-pr)*(x-40)/(540-40),Y=v=>pt+(H-pt-pb)*(1-(v-(lo-pad))/((hi+pad)-(lo-pad)));let s='';
    const best=Math.max(...vs);s+=rc(pl,Y(best),W-pl-pr,Y(best-2*SD7[j])-Y(best),'var(--acc2)',{r:0,op:.75});
    [100,200,300,400,500].forEach(x=>{s+=ln2(X(x),H-pb,X(x),H-pb+4,'var(--mute)')+tx(X(x),H-pb+16,x,{fs:11,a:'middle',c:'var(--mute)'})});
    const st=(hi-lo)>8?2:(hi-lo)>3?1:0.5;for(let v=Math.ceil((lo-pad)/st)*st;v<=hi+pad;v+=st)s+=ln2(pl,Y(v),W-pr,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,+v.toFixed(1),{fs:11,a:'end',c:'var(--mute)'});
    s+=tx((pl+W-pr)/2,H-2,'target tokens per 512 tokens of text (computed)',{fs:11,a:'middle',c:'var(--mute)'});
    const L=P.map(p=>({x:X(p.x),y:Y(+p.v[j]),t:p.n,fs:11,p}));placeLabels(L,W-16,H-pb);L.forEach(l=>{const w=l.t.length*11*.62;if(l.la==='start'&&l.lx+w>W-4){l.la='end';l.lx=l.x-8}if(l.la==='middle'&&l.lx+w/2>W-4){l.la='end';l.lx=W-4}});
    L.forEach(l=>{const c=/spans/.test(l.t)?'var(--c3)':/i\.i\.d|drop/.test(l.t)?'var(--c1)':'var(--c2)';s+='<circle cx="'+l.x.toFixed(1)+'" cy="'+l.y.toFixed(1)+'" r="4.5" fill="'+c+'"><title>'+escH(l.t)+': '+l.p.v[j]+' ('+l.p.t.replace('T','Table ')+')</title></circle>'+tx(l.lx,l.ly,escH(l.t),{fs:11,a:l.la})});
    el.innerHTML=svgW(W,H,s,'Target length against score');
    const sp=P.find(p=>p.n==='spans 3'),be=P.find(p=>p.n==='BERT-style');
    $('lenO').innerHTML='Spans of mean 3 write '+sp.x.toFixed(0)+' target tokens per 512 against BERT-style\'s 512 ('+(512/sp.x).toFixed(1)+'× fewer) and score '+sp.v[j]+' against '+be.v[j]+' on '+$('lenMet').selectedOptions[0].textContent+'. Shaded: within two baseline standard deviations ('+(2*SD7[j]).toFixed(2)+') of the best point. Blue: i.i.d. noise; green: spans; orange: other objectives. Hover a point for its table.'}
  $('lenMet').addEventListener('change',()=>refit(el));onTab('t-run',()=>refit(el));fit(el,draw);
  // the JS port's lengths against recompute.py's port of random_spans_helper
  let n=0,ok=0;Object.keys(RC.spans).forEach(k=>{const [d,s]=k.split('_').map(Number),a=T5.helper(512,d,s),b=RC.spans[k];n++;if(a.raw===b.raw&&a.inputs===b.inputs&&a.targets===b.targets)ok++});
  Object.keys(RC.spans_per512).forEach(k=>{const [d,s]=k.split('_').map(Number),a=T5.lenSpans(512,d,s),b=RC.spans_per512[k];n++;if(a.inp===b.inputs&&a.tgt===b.targets)ok++});
  const h=T5.helper(512,.15,3);$('lenChk').innerHTML=ok+' of '+n+' settings agree with recompute.py. In the T5 code\'s own configuration (random_spans_helper with inputs_length 512, 15%, mean 3) the raw text is '+h.raw+' tokens, the input exactly '+h.inputs+' and the target '+h.targets+'.'})();
