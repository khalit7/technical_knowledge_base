
// The toy's NSP ablation over two pretraining seeds (train.py finetune and seed2), for the Run tab and the evidence section
function nspNote(){const T=RES.tok.mean,Q=RES.seed2,d=(a,b)=>((a-b)*100).toFixed(1);
  const g=[d(T.bert[128].all,T.nonsp[128].all),d(T.bert[512].all,T.nonsp[512].all),d(Q.tok.bert[128],Q.tok.nonsp[128]),d(Q.tok.bert[512],Q.tok.nonsp[512])];
  return 'with 128 labelled sentences BERT tags '+pct(T.bert[128].all)+' of names against '+pct(T.nonsp[128].all)+' without NSP; pretrained again with a second seed, '+pct(Q.tok.bert[128])+' against '+pct(Q.tok.nonsp[128])+
  '. The gain holds in both seeds and both tasks (tagging: +'+g[0]+' and +'+g[1]+' points at 128 and 512 labels with seed 7, +'+g[2]+' and +'+g[3]+' with seed 8), but its size moves with the pretraining seed. The reason is in the toy\'s data: a document is one name in one role, so telling the true next sentence from a random one often means telling whether the same name is a person or a place, which is exactly the fine-tuning label (<code>grammar.py</code>, <code>pretrain_pair</code>). NSP head accuracy: '+pct(RES.pre.bert.nsp_accuracy)+' and '+pct(RES.seed2_eval.bert_s2.nsp_accuracy)+' (the paper: 97% to 98%). This says nothing about NSP on real text.'}
// ---- Run a toy BERT: composer, fill-in, tagging, attention, measured results, toy Figure 5, training curves, browser test ----
// a line chart over categorical x positions (equal spacing), at measured width
function lineChart(el,series,o){fit(el,w=>{const H=o.h||240,pl=40,pr=o.pr||128,pt=12,pb=40,nx=o.xt.length;
  const X=i=>pl+(w-pl-pr)*(nx===1?.5:i/(nx-1)),Y=v=>pt+(H-pt-pb)*(1-(v-o.y[0])/(o.y[1]-o.y[0]));let s='';
  for(let v=o.y[0];v<=o.y[1]+1e-9;v+=o.ystep)s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,o.yf?o.yf(v):v,{fs:11,a:'end',c:'var(--mute)'});
  o.xt.forEach((t,i)=>{s+=tx(X(i),H-pb+15,t,{fs:11,a:'middle',c:'var(--mute)'})});s+=tx((pl+w-pr)/2,H-6,o.xl,{fs:11,a:'middle',c:'var(--mute)'});
  const ends=[];series.forEach(S=>{let d='',st=0;S.y.forEach((v,i)=>{if(v==null||isNaN(v)){st=0;return}d+=(st?'L':'M')+X(i).toFixed(1)+','+Y(v).toFixed(1);st=1});
    s+='<path d="'+d+'" fill="none" stroke="'+S.c+'" stroke-width="2"'+(S.da?' stroke-dasharray="'+S.da+'"':'')+'/>';
    S.y.forEach((v,i)=>{if(v==null||isNaN(v))return;s+='<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="3" fill="'+S.c+'"><title>'+S.n+': '+(o.yf?o.yf(v):v)+' at '+o.xt[i]+'</title></circle>'});
    let li=S.y.length-1;while(li>0&&(S.y[li]==null||isNaN(S.y[li])))li--;ends.push({y:Y(S.y[li]),n:S.n,c:S.c,how:S.n})});
  s+=endLabels(ends,w-pr+6,14);el.innerHTML=svgW(w,H,s,o.label||'chart')})}
const pct=v=>v==null||isNaN(v)?'n/a':(v*100).toFixed(1)+'%';
const VN={bert:'BERT (MLM + NSP)',nonsp:'No NSP',ltr:'Left to right',ltr_bi:'LTR + bidirectional layer',scratch:'No pretraining'};
const VC={bert:'var(--c1)',nonsp:'var(--c6)',ltr:'var(--c2)',ltr_bi:'var(--c4)',scratch:'var(--mute)'};

(function(){
  const L=LANG,st={k:'R',name:'austin',cue:3,pre:1,suf:0,an:'cat',adj:['big'],tail:1,mask:-1};
  const fill=(id,items)=>{const s=$(id);s.innerHTML='';items.forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;s.appendChild(o)})};
  const cueText=(c,k)=>c.join(' ')+(k>=(st.k==='R'?L.SEEN_R:L.SEEN_L)?' (held out)':'');
  fill('rcName',L.NAMES.map(n=>[n,n]));fill('rcAn',Object.keys(L.ANIMALS).map(a=>[a,a+' ('+L.ANIMALS[a]+')']));
  function cues(){const per=st.k==='R'?L.PER_R:L.PER_L,loc=st.k==='R'?L.LOC_R:L.LOC_L;const s=$('rcCue');s.innerHTML='';
    [['person',per,'P'],['place',loc,'L']].forEach(([g,list,p])=>{const og=document.createElement('optgroup');og.label=g;list.forEach((c,i)=>{const o=document.createElement('option');o.value=p+i;o.textContent=cueText(c,i);og.appendChild(o)});s.appendChild(og)})}
  fill('rcPre',L.PREFIX.map((p,i)=>[i,p.length?p.join(' '):'(nothing)']));fill('rcSuf',L.SUFFIX.map((p,i)=>[i,p.length?p.join(' '):'(nothing)']));
  st.cueKey='L0';
  function words(){if(st.k==='A'){let w=['the',...st.adj,st.an,L.ANIMALS[st.an]];if(st.tail===1)w=w.concat(['at','the','farmer']);if(st.tail===2)w=w.concat(['near','the','child']);return w}
    const isP=st.cueKey[0]==='P',i=+st.cueKey.slice(1),cue=(st.k==='R'?(isP?L.PER_R:L.LOC_R):(isP?L.PER_L:L.LOC_L))[i];
    return st.k==='R'?[...L.PREFIX[st.pre],st.name,...cue,...L.SUFFIX[st.suf]]:[...cue,st.name,...L.SUFFIX[st.suf]]}
  function vis(){const a=st.k==='A';['rcNameL','rcCueL','rcSufL'].forEach(i=>$(i).hidden=a);$('rcPreL').hidden=a||st.k==='L';['rcAnL','rcAdjL','rcTailL'].forEach(i=>$(i).hidden=!a)}
  function sync(){$('rcK').value=st.k;$('rcName').value=st.name;$('rcCue').value=st.cueKey;$('rcPre').value=st.pre;$('rcSuf').value=st.suf;$('rcAn').value=st.an;$('rcAdj').value=st.adj.length;$('rcTail').value=st.tail}
  function render(){const w=words();if(st.mask>=w.length)st.mask=-1;
    const a=L.analyse(w);if(st.mask<0)st.mask=st.k==='A'?w.indexOf(st.an):(a?a.at:0);
    $('rcSent').innerHTML=w.map((x,i)=>'<button class="w'+(i===st.mask?' cur':'')+'" data-i="'+i+'" aria-pressed="'+(i===st.mask)+'">'+(i===st.mask?'[MASK]':x)+'<small>'+(i===st.mask?x:'&nbsp;')+'</small></button>').join('');
    $('rcSent').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{st.mask=+b.dataset.i;render()}));
    doFill(w);doTag(w);doAtt(w)}
  function doFill(w){const B=BM.load('bert'),Lm=BM.load('ltr'),t=st.mask+1,mw=w.slice();mw[st.mask]='[MASK]';
    const fb=BM.fill(B,BM.run(B,mw),t),fl=BM.fill(Lm,BM.run(Lm,w),t),ans=w[st.mask];
    hbars($('rfA'),'Bidirectional (toy BERT)',top5(fb).map(x=>({t:x.t,p:x.p,c:x.t===ans?'var(--good)':'var(--c1)'})),{max:1});
    hbars($('rfB'),'Left to right (toy LTR, reads "'+(w.slice(0,st.mask).join(' ')||'[CLS]')+'")',top5(fl).map(x=>({t:x.t,p:x.p,c:x.t===ans?'var(--good)':'var(--c2)'})),{max:1})}
  function doTag(w){const tr=L.truth(w),a=L.analyse(w);let h='';
    [['bert_tag','BERT tagger'],['ltr_tag','Left-to-right tagger']].forEach(([m,nm])=>{const M=BM.load(m),R=BM.run(M,w);
      const tags=w.map((x,i)=>{const p=BM.softmax(Array.from(R.tag[i+1]));let k=0;for(let j=1;j<3;j++)if(p[j]>p[k])k=j;return {t:BM.tags[k],p}});
      h+='<p class="small" style="margin:8px 0 2px"><b>'+nm+'</b></p><div class="sent">'+w.map((x,i)=>{const g=tags[i],bad=g.t!==tr[i];return '<span class="w'+(bad?' bad':'')+'">'+x+'<small>'+(g.t==='O'?'·':g.t)+'</small></span>'}).join('')+'</div>';
      if(a&&a.role){const p=tags[a.at].p;h+='<p class="small mute" style="margin:2px 0">'+w[a.at]+': P(PER) '+pct(p[1])+', P(LOC) '+pct(p[2])+'; truth '+a.role+(tags[a.at].t===a.role?' <span class="ok">✓</span>':' <span class="no">✗</span>')+'</p>'}});
    if(!a)h+='<p class="small mute">No name in this sentence: every tag should be O (·).</p>';
    else h='<p class="small mute" style="margin:0">Cue '+(a.side==='R'?'after':'before')+' the name'+(a.seen?'':' (held out of the labels)')+'.</p>'+h;
    $('rtOut').innerHTML=h}
  function doAtt(w){const qs=$('raQ'),words=['[CLS]',...w,'[SEP]'];const prev=qs.value;qs.innerHTML='';words.forEach((x,i)=>{const o=document.createElement('option');o.value=i;o.textContent=i+': '+x;qs.appendChild(o)});
    const a=L.analyse(w);qs.value=prev!==''&&+prev<words.length&&qs.dataset.k===words.join(' ')?prev:String(a?a.at+1:st.mask+1);qs.dataset.k=words.join(' ');drawAtt(w)}
  function drawAtt(w){const M=BM.load($('raM').value),R=BM.run(M,w),q=+$('raQ').value,words=R.words;const el=$('raOut');
    fit(el,W=>{const lw=60,n=words.length,cw=Math.min(52,(W-lw-4)/n),ch=18,top=8;let s='';
      R.att.forEach((layer,l)=>layer.forEach((A,hh)=>{const y=top+(l*4+hh)*(ch+3);s+=tx(lw-6,y+13,'L'+(l+1)+' H'+(hh+1),{fs:11,a:'end',c:'var(--mute)'});
        A[q].forEach((v,j)=>{s+=rc(lw+j*cw+1,y,cw-2,ch,'var(--acc)',{r:2,op:Math.max(.04,v).toFixed(3)})+(v>.25?tx(lw+j*cw+cw/2,y+13,(v*100).toFixed(0),{fs:11,a:'middle',c:'var(--bg)'}):'')})}));
      const yb=top+8*(ch+3)+6;words.forEach((x,j)=>{const cx=lw+j*cw+cw/2;s+='<text x="'+cx.toFixed(1)+'" y="'+yb+'" font-size="11" text-anchor="end" transform="rotate(-55 '+cx.toFixed(1)+' '+yb+')"'+(j===q?' font-weight="600" fill="var(--acc)"':'')+'>'+x+'</text>'});
      el.innerHTML=svgW(W,yb+62,s,'Attention from the query word')})}
  $('raM').addEventListener('change',()=>drawAtt(words()));$('raQ').addEventListener('change',()=>drawAtt(words()));
  $('rcK').addEventListener('change',e=>{st.k=e.target.value;st.mask=-1;if(st.k!=='A'){cues();st.cueKey=st.k==='R'?'P3':'L0'}vis();sync();render()});
  $('rcName').addEventListener('change',e=>{st.name=e.target.value;render()});$('rcCue').addEventListener('change',e=>{st.cueKey=e.target.value;st.mask=-1;render()});
  $('rcPre').addEventListener('change',e=>{st.pre=+e.target.value;st.mask=-1;render()});$('rcSuf').addEventListener('change',e=>{st.suf=+e.target.value;render()});
  $('rcAn').addEventListener('change',e=>{st.an=e.target.value;st.mask=-1;render()});
  $('rcAdj').addEventListener('change',e=>{st.adj=['big','brown'].slice(0,+e.target.value);st.mask=-1;render()});$('rcTail').addEventListener('change',e=>{st.tail=+e.target.value;render()});
  const rr=mulberry32(2024);
  $('rcRand').addEventListener('click',()=>{const pick=a=>a[Math.floor(rr()*a.length)];st.k=pick(['R','R','L','A']);st.mask=-1;
    if(st.k==='A'){st.an=pick(Object.keys(L.ANIMALS));st.adj=L.ADJ.slice().sort(()=>rr()-.5).slice(0,Math.floor(rr()*3));st.tail=Math.floor(rr()*3)}
    else{cues();st.name=pick(L.NAMES);const isP=rr()<.5,n=(st.k==='R'?L.PER_R:L.PER_L).length;st.cueKey=(isP?'P':'L')+Math.floor(rr()*n);st.pre=Math.floor(rr()*L.PREFIX.length);st.suf=Math.floor(rr()*L.SUFFIX.length)}
    vis();sync();if(st.k==='A'){const o=$('rcAdj');o.value=Math.min(2,st.adj.length)}render()});
  cues();st.cueKey='P3';vis();sync();
  let drawn=false;onTab('t-run',()=>{if(!drawn){drawn=true;try{render()}catch(e){__jsErr('run: '+e.message)}}else render()});
  $('rParams').textContent=fmt(BM.models.bert.params);
})();

// ---- measured results ----
(function(){
  const sizes=RES.sizes;
  function go(){const t=$('rrT').value,sub=$('rrS').value,M=RES[t].mean,vs=Object.keys(M);
    lineChart($('rrChart'),vs.map(v=>({n:VN[v],c:VC[v],da:v==='scratch'?'4 3':null,y:sizes.map(n=>M[v][n]?M[v][n][sub]:null)})),
      {xt:sizes.map(String),xl:'labelled fine-tuning sentences (seen cues only)',y:[.4,1],ystep:.1,yf:v=>Math.round(v*100)+'%',label:'Accuracy against labelled examples',pr:150});
    let h='<table><thead><tr><th>Pretraining</th>'+sizes.map(n=>'<th class="num">'+n+'</th>').join('')+'</tr></thead><tbody>';
    vs.forEach(v=>{h+='<tr><td>'+VN[v]+'</td>'+sizes.map(n=>{const m=M[v][n],sd=RES[t].sd[v][n];return '<td class="num">'+(m?pct(m[sub])+'<span class="small mute"> ±'+(sd[sub]*100).toFixed(1)+'</span>':'')+'</td>'}).join('')+'</tr>'});
    $('rrTab').innerHTML=h+'</tbody></table><p class="small mute">Mean ± standard deviation over 3 fine-tuning seeds. Chance is 50%.</p>';
    const g=(v,k,n)=>RES.tok.mean[v][n||128][k],gs=(v,k,n)=>RES.sent.mean[v][n||128][k];
    $('rrRead').innerHTML='<div class="t">What reproduces</div><p class="small" style="margin:2px 0">'+
      '<b>Bidirectionality on token-level outputs reproduces, independently:</b> with 128 labelled sentences, names whose cue comes after them are tagged '+pct(g('bert','R'))+' by BERT and '+pct(g('ltr','R'))+' by the left-to-right model, which cannot see the cue; with the cue before, both reach '+pct(g('bert','L'))+' and '+pct(g('ltr','L'))+'. On the sentence-level task the left-to-right model reads its last token and gets '+pct(gs('ltr','R'))+' on the same right-cue sentences (BERT '+pct(gs('bert','R'))+'): the paper\'s pattern, a small loss on SST-2 and MNLI and a large one on SQuAD (<a href="'+PAPER.meta.ax+'#S5.T5" target="_blank" rel="noopener noreferrer">Table 5</a>). '+
      '<b>A fresh bidirectional layer on top</b> recovers part of it ('+pct(g('ltr_bi','R'))+'), as the BiLSTM recovers part of SQuAD. '+
      '<b>Pretraining transfers to cues the labels never showed:</b> on right-side cues held out of the labels, BERT tags '+pct(g('bert','R_unseen'))+' against '+pct(g('scratch','R_unseen'))+' with no pretraining. '+
      '<b>NSP helps here, for a toy-made reason:</b> '+nspNote()+'</p>';
  }
  ['rrT','rrS'].forEach(i=>$(i).addEventListener('change',go));onTab('t-run',go);
  // toy Figure 5
  onTab('t-run',()=>{const F=RES.fig5,steps=F.steps;lineChart($('rf5Chart'),[{n:'Masked LM (toy BERT)',c:'var(--c1)',y:F.bert},{n:'Left to right',c:'var(--c2)',y:F.ltr}],
    {xt:steps.map(s=>s>=1000?(s/1000)+'k':String(s)),xl:'toy pretraining steps (128 labels, all names)',y:[.4,1],ystep:.1,yf:v=>Math.round(v*100)+'%',label:'Toy Figure 5'});
    $('rf5Note').innerHTML='Mean of 3 seeds per point. At the first checkpoint ('+steps[0]+' steps) the left-to-right model is at '+pct(F.ltr[0])+' and BERT at '+pct(F.bert[0])+'; at the last, '+pct(F.ltr[F.ltr.length-1])+' and '+pct(F.bert[F.bert.length-1])+'. The left-to-right model\'s ceiling is set by the right-cue half of the test, which it cannot see.'});
  // training curves
  onTab('t-run',()=>{const lg=RES.logs,xs=lg.bert.map(r=>r[0]);const pick=(a,k)=>a.map(r=>r[k]);
    const ser=[{n:'BERT masked LM',c:'var(--c1)',y:pick(lg.bert,1)},{n:'BERT NSP',c:'var(--c3)',y:pick(lg.bert,2)},{n:'No NSP masked LM',c:'var(--c6)',y:pick(lg.nonsp,1),da:'4 3'},{n:'Left-to-right LM',c:'var(--c2)',y:pick(lg.ltr,1)}];
    const ev=xs.map((x,i)=>i%Math.ceil(xs.length/6)===0||i===xs.length-1?(x>=1000?(x/1000)+'k':String(x)):'');
    lineChart($('rcurChart'),ser,{xt:ev,xl:'step',y:[0,3],ystep:.5,yf:v=>v.toFixed(1),label:'Pretraining losses',pr:140});
    const P=RES.pre;$('rPre').innerHTML=stat('Masked-word accuracy (BERT)',pct(P.bert.lm_accuracy),'held-out pairs, chosen positions; quantised '+pct(P.bert_q.lm_accuracy))+stat('NSP accuracy (BERT)',pct(P.bert.nsp_accuracy),'held-out pairs; quantised '+pct(P.bert_q.nsp_accuracy)+'; paper 97% to 98%')+
      stat('Animal from its verb (BERT)',pct(P.bert.animal_from_right),'"the [MASK] barked", 1,000 sentences')+stat('Animal, left to right',pct(P.ltr.animal_from_right),'chance is 25%')});
})();

// ---- in-browser test ----
(function(){const L=LANG;
  function sample(r){const pick=a=>a[Math.floor(r()*a.length)];const name=pick(L.NAMES),role=r()<.5?'PER':'LOC',side=r()<.5?'L':'R';
    if(side==='R'){const c=pick(role==='PER'?L.PER_R:L.LOC_R),pre=pick(L.PREFIX);return {w:[...pre,name,...c,...pick(L.SUFFIX)],at:pre.length,role,side}}
    const c=pick(role==='PER'?L.PER_L:L.LOC_L);return {w:[...c,name,...pick(L.SUFFIX)],at:c.length,role,side}}
  $('tstGo').addEventListener('click',()=>{const b=$('tstGo');b.disabled=true;const r=mulberry32(Math.floor(Math.random()*1e9)),N=400,tally={};let i=0;
    const Ms={bert_tag:BM.load('bert_tag'),ltr_tag:BM.load('ltr_tag')};
    function chunk(){for(let k=0;k<50&&i<N;k++,i++){const s=sample(r);for(const m in Ms){const R=BM.run(Ms[m],s.w),l=R.tag[s.at+1];let a=0;for(let j=1;j<3;j++)if(l[j]>l[a])a=j;
        const key=m+s.side,t=tally[key]=tally[key]||[0,0];t[0]+=BM.tags[a]===s.role;t[1]++}}
      if(i<N){$('tstOut').innerHTML='<p class="small mute">'+i+' of '+N+'...</p>';setTimeout(chunk,0);return}
      const f=k=>tally[k]?pct(tally[k][0]/tally[k][1])+' <span class="small mute">('+tally[k][0]+' of '+tally[k][1]+')</span>':'n/a';
      $('tstOut').innerHTML=stat('BERT, cue after',f('bert_tagR'))+stat('Left to right, cue after',f('ltr_tagR'))+stat('BERT, cue before',f('bert_tagL'))+stat('Left to right, cue before',f('ltr_tagL'));b.disabled=false}
    chunk()})})();

// ---- the honesty box ----
(function(){const O=RES.overlap,C=RES.check;
  $('rHonest').innerHTML='<ul class="lst">'+
  '<li><b>Scale and simplifications.</b> 2 layers of width 24 against 12 of 768; whole words instead of WordPiece; pairs of at most 21 tokens, so no 128-then-512 length schedule; masks drawn fresh at every step (dynamic, like RoBERTa) rather than BERT\'s 10 static copies; '+fmt(RES.cfg.steps)+' pretraining steps of '+RES.cfg.batch+' pairs, learning rate 1e-3 with '+RES.cfg.warmup+' warmup steps (toy values, not the paper\'s 1e-4 and 10,000). Fine-tuning runs 400 steps of 32 sentences.</li>'+
  '<li><b>Test sets.</b> 2,000 sentences drawn with a fixed seed from the whole grammar. '+pct(O.test_in_labels)+' of them also occur in the 128-sentence labelled set of seed 0 (the grammar has only '+fmt(O.space)+' distinct sentences). Pretraining was unlabelled and saw '+pct(O.test_in_pretraining)+' of the test sentences, as BERT\'s Wikipedia contains SQuAD\'s passages; the labels are what is held out, and the held-out cue subsets are never in any labelled set.</li>'+
  '<li><b>Quantisation.</b> Weights ship at 6 bits per matrix entry with a scale per row, vectors in float16; BERT\'s masked-word accuracy moves from '+pct(RES.pre.bert.lm_accuracy)+' to '+pct(RES.pre.bert_q.lm_accuracy)+', the BERT tagger on the test set from '+pct(RES.tagq.bert_tag.float)+' to '+pct(RES.tagq.bert_tag.q)+', the left-to-right tagger from '+pct(RES.tagq.ltr_tag.float)+' to '+pct(RES.tagq.ltr_tag.q)+'.</li>'+
  '<li><b>This page against PyTorch.</b> On 200 inputs per model, the JavaScript forward pass gives the same argmax everywhere ('+C.agree+'), logits within '+C.logit.toExponential(1)+', attention within '+C.att.toExponential(1)+', NSP probabilities within '+C.nsp.toExponential(1)+' (<code>check_forward.py</code>).</li>'+
  '<li><b>Pretraining seed.</b> The 3 fine-tuning seeds of each point share one pretrained model, so they hide pretraining-seed noise. Repeating BERT and No NSP with a second pretraining seed (seed 8, everything else identical) moved BERT\'s tagging accuracy at 128 labels from '+pct(RES.tok.mean.bert[128].all)+' to '+pct(RES.seed2.tok.bert[128])+': read single-seed gaps of a few points between pretrained variants as noise.</li>'+
  '<li><b>Not reproduced, and not tuned to reproduce:</b> model size (one size only); NSP\'s benefit reproduces only for a reason specific to the toy (above). The task was designed before training so that right-side cues would separate the two directions; the measured gaps were not tuned afterwards.</li></ul>'})();
