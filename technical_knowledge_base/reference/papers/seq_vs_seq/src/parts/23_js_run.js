// ---- Train the pairs tab: generation animation, toy Figure 1, budget sweep, composer, logs, in-browser test ----
(function(){
const TY=window.TOY||{},E=window.ETT,KC=E.KC,KN=E.KN;
if(!window.EM){['gxSvg','rC','cpOut'].forEach(id=>{const e=$(id);if(e)e.innerHTML='<p class="small mute">The toy models are not bundled in this build.</p>'});return}
const SZN={s:'small',m:'middle',l:'large'},SIZES=['s','m','l'],SH=EM.models.dec.size;{const e=$('gxSize');if(e)e.textContent=SZN[SH]}
const FR={0.025:'2p5',0.1:'10',0.25:'25'};
const key=(s,k,f)=>s+'_'+k+(f?'_'+FR[f]:'');
const PRM=s=>(TY.logs&&TY.logs[key(s,'enc')]&&TY.logs[key(s,'enc')].params)||({s:11e3,m:28e3,l:146e3})[s];
const disp=w=>w==='[BOS]'||w===EM.vocab[EM.BOS]?'BOS':w===EM.vocab[EM.EOS]?'EOS':w===EM.vocab[EM.MASK]?'MASK':w;
// ===== 1. Generation, two ways =====
let rng=mulberry32(20250715),PR=LANG.prompt(rng);const GEN={};
function gen(kind){if(GEN[kind])return GEN[kind];const M=EM.load(kind);return GEN[kind]=EM.generate(M,EM.enc(PR.words),3)}
const STEPS=k=>{const how=k==='dec'||k==='dfe'?'causal':'mask',o=[];
  for(let j=0;j<3;j++){o.push({t:'Token '+(j+1)+': the input',c:how==='causal'?'The decoder reads the prompt'+(j?' and the '+j+' token'+(j>1?'s':'')+' it has generated':'')+' with causal attention, and predicts the next token at the last position (outlined).':'The encoder gets the prompt'+(j?' plus its '+j+' generated token'+(j>1?'s':''):'')+', then three [MASK] tokens and [EOS], all with bidirectional attention. '+(k==='efd'?'Trained with MNTP, it reads the first mask\'s prediction one position earlier (outlined).':'It reads the first mask (outlined).')});
    o.push({t:'Token '+(j+1)+': the prediction',c:'The top three tokens and their probabilities. The most likely one is appended'+(how==='mask'?', and the masks move one place right':'')+'.'})}
  o.push({t:'Done: three tokens',c:'The answer is compared with the fact in the prompt; all three tokens must be right.'});return o};
function drawGx(k,st,e,w){const S=gen(k),j=Math.min(2,Math.floor(st/2)),phase=st===6?2:st%2,r=S[j];
  const toks=r.input.map(i=>EM.vocab[i]),fs=11,pad=6;let x=4,y=18,s='';const pos=[];
  toks.forEach((t,i)=>{const lab=disp(t),tw=Math.max(18,lab.length*fs*.62+pad*2);if(x+tw>w-4){x=4;y+=26}pos.push([x,y,tw]);x+=tw+3});
  const H=y+26+(phase>=1?92:20);
  toks.forEach((t,i)=>{const [xx,yy,tw]=pos[i],gen_=i>=PR.words.length+1&&i<PR.words.length+1+j,m=t===EM.vocab[EM.MASK];
    s+=rc(xx,yy-14,tw,20,m?'var(--hl)':gen_?'var(--acc2)':'var(--soft)',{s:i===r.read?'var(--c5)':'var(--line)',sw:i===r.read?2.4:1,r:4})+tx(xx+tw/2,yy,disp(t),{fs,a:'middle',c:m?'var(--c2)':'var(--ink)'})});
  if(phase>=1){const p=r.p.map((v,i)=>[v,i]).sort((a,b)=>b[0]-a[0]).slice(0,3),y0=y+26,bw=w-120;
    p.forEach(([v,i],n)=>{const yy=y0+n*24,ok=i===EM.IDX[(PR.answer[j])];s+=tx(4,yy+13,EM.vocab[i],{fs:12,w:n===0?600:400})+rc(60,yy+2,Math.max(1,bw*v*(phase===1?e:1)),16,ok?'var(--good)':'var(--c2)',{r:2,op:.85})+tx(64+Math.max(1,bw*v),yy+14,(100*v).toFixed(1)+'%',{fs:11,c:'var(--mute)'})})}
  return svgW(w,H,s,'Generation by '+KN[k])}
function gxCount(k,st){const S=gen(k),n=Math.min(3,Math.floor((st+1)/2)),got=S.slice(0,n).map(r=>EM.vocab[r.pick]),ok=got.every((g,i)=>g===PR.answer[i]);
  const cur=S[Math.min(2,Math.floor(st/2))];
  return stat('Forward passes',n||'0','one per generated token')+stat('Tokens in this pass',cur.input.length,k==='dec'||k==='dfe'?'prompt plus generated':'prompt, generated, 3 masks, EOS')+stat('Generated',got.length?got.join(' '):'·','right answer: '+PR.answer.join(' '))+stat('Correct so far',got.length?(ok?'yes':'no'):'·','')}
const gxA=makeAnim({id:'gx',mode:'dec',modes:{dec:STEPS('dec'),enc:STEPS('enc'),efd:STEPS('efd'),dfe:STEPS('dfe')},draw:drawGx,counters:gxCount,dur:2200});
$('gxNew').addEventListener('click',()=>{PR=LANG.prompt(rng);Object.keys(GEN).forEach(k=>delete GEN[k]);if(gxA){gxA.st.k=0;gxA.st.t=1;gxA.st.lk=-1;gxA.draw()}});

// ===== 2. Toy Figure 1 =====
function score(task,s,k,f,n){if(task==='cls'){const c=TY.cls&&TY.cls[key(s,k,f)+'@'+n];return c?{v:100*c.mean,sd:100*c.sd}:null}
  const g=TY.gen&&TY.gen[key(s,k,f)];return g?{v:100*g[task]}:null}
function drawR(w){const t=$('rT').value,f=+$('rB').value,n=$('rN').value,W=w,H=Math.min(320,Math.max(240,w*.55)),pl=40,pr=14,pt=14,pb=40;
  const xs=SIZES.map(PRM),lx=v=>pl+(W-pl-pr)*(Math.log10(v)-Math.log10(xs[0]/1.4))/(Math.log10(xs[2]*1.4)-Math.log10(xs[0]/1.4));
  const pts={};['enc','dec','efd','dfe'].forEach(k=>pts[k]=SIZES.map(s=>score(t,s,k,k==='efd'||k==='dfe'?f:null,n)));
  const vals=[].concat(...Object.values(pts)).filter(Boolean).map(p=>p.v),lo=Math.max(0,Math.floor((Math.min(...vals)-5)/10)*10),hi=Math.min(100,Math.ceil((Math.max(...vals)+3)/10)*10),ly=v=>pt+(H-pt-pb)*(1-(v-lo)/(hi-lo||1));
  let s='';for(let v=lo;v<=hi;v+=(hi-lo)>40?20:10){s+=ln2(pl,ly(v),W-pr,ly(v),'var(--line)')+tx(pl-5,ly(v)+4,v+'%',{fs:11,a:'end',c:'var(--mute)'})}
  SIZES.forEach((sz,i)=>{s+=tx(lx(xs[i]),H-pb+16,SZN[sz]+' ('+(xs[i]/1000).toFixed(0)+'k)',{fs:11,a:'middle',c:'var(--mute)'})});s+=tx((pl+W-pr)/2,H-6,'toy size (parameters, log scale)',{fs:11,a:'middle',c:'var(--mute)'});
  ['enc','dec','efd','dfe'].forEach(k=>{const c=KC[k],conv=k==='efd'||k==='dfe';let d='';pts[k].forEach((p,i)=>{if(p)d+=(d?'L':'M')+lx(xs[i]).toFixed(1)+','+ly(p.v).toFixed(1)});
    s+='<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="2"'+(conv?' stroke-dasharray="5 3"':'')+'/>';
    pts[k].forEach((p,i)=>{if(!p)return;if(p.sd)s+=ln2(lx(xs[i]),ly(p.v-p.sd),lx(xs[i]),ly(p.v+p.sd),c,{sw:1});s+='<circle cx="'+lx(xs[i]).toFixed(1)+'" cy="'+ly(p.v).toFixed(1)+'" r="'+(conv?3:4)+'" fill="'+(conv?'var(--bg)':c)+'" stroke="'+c+'" stroke-width="1.6"><title>'+KN[k]+' '+SZN[SIZES[i]]+': '+p.v.toFixed(1)+'%'+(p.sd!=null?' ± '+p.sd.toFixed(1)+' (3 seeds)':'')+'</title></circle>'})});
  const L=legend(['enc','dec','efd','dfe'].map(k=>[KN[k],KC[k],(k==='efd'||k==='dfe')?'5 3':null]),pl+4,pt+12,W-pl-pr);
  $('rC').innerHTML=svgW(W,H,s+L.s,'Toy Figure 1');
  const at=i=>['enc','dec','efd','dfe'].map(k=>pts[k][i]?KN[k]+' '+pts[k][i].v.toFixed(1):'').filter(Boolean).join(', ');
  $('rNote').innerHTML='<p class="small mute" style="margin:6px 0 0">'+SIZES.map((s,i)=>'<b>'+SZN[s]+'</b>: '+at(i)).join('<br>')+'<br>'+(t==='cls'?'Classify: test accuracy on 3,000 held-out statements, mean ± standard deviation of 3 fine-tuning seeds (the error bars); learning rate picked on a separate dev set; '+n+' labelled examples. Chance is 50%.':t==='generate'?'Generate: exact match on 1,000 held-out prompts, greedy.':'Choose: accuracy on 1,000 held-out prompts with four candidates; chance is 25%.')+'</p>'}
fit($('rC'),drawR);['rT','rB','rN'].forEach(id=>$(id).addEventListener('change',()=>refit($('rC'))));

// ===== 3. Budget sweep =====
function drawB(w){const t=$('bT').value,W=w,H=240,pl=44,pr=60,pt=14,pb=38,fr=[0.025,0.1,0.25],lx=v=>pl+(W-pl-pr)*(Math.log10(v)-Math.log10(0.018))/(Math.log10(0.35)-Math.log10(0.018));
  const native=t==='cls'?'enc':'dec',conv=t==='cls'?'efd':'dfe',n='2048';const lines=SIZES.map(s=>({s,v:fr.map(f=>{const a=score(t,s,conv,f,n),b=score(t,s,native,null,n);return a&&b?a.v-b.v:null})}));
  const vals=[].concat(...lines.map(l=>l.v)).filter(v=>v!=null).concat([0]),lo=Math.floor(Math.min(...vals)/10)*10,hi=Math.max(5,Math.ceil(Math.max(...vals)/5)*5),ly=v=>pt+(H-pt-pb)*(1-(v-lo)/(hi-lo||1));
  let s='';const st=(hi-lo)>40?20:10;for(let v=lo;v<=hi;v+=st){s+=ln2(pl,ly(v),W-pr,ly(v),v===0?'var(--mute)':'var(--line)')+tx(pl-5,ly(v)+4,(v>0?'+':'')+v,{fs:11,a:'end',c:'var(--mute)'})}
  fr.forEach(f=>{s+=tx(lx(f),H-pb+16,(100*f)+'%',{fs:11,a:'middle',c:'var(--mute)'})});s+=tx((pl+W-pr)/2,H-4,'cross-objective budget, share of pretraining tokens (log scale)',{fs:11,a:'middle',c:'var(--mute)'});
  const cs=['var(--c4)','var(--c6)','var(--c2)'],ends=[];lines.forEach((l,i)=>{let d='';l.v.forEach((v,j)=>{if(v!=null)d+=(d?'L':'M')+lx(fr[j]).toFixed(1)+','+ly(v).toFixed(1)});s+='<path d="'+d+'" fill="none" stroke="'+cs[i]+'" stroke-width="2"/>';
    l.v.forEach((v,j)=>{if(v!=null)s+='<circle cx="'+lx(fr[j]).toFixed(1)+'" cy="'+ly(v).toFixed(1)+'" r="3.5" fill="'+cs[i]+'"><title>'+SZN[l.s]+', '+(100*fr[j])+'%: '+v.toFixed(1)+' points</title></circle>'});
    const nn=l.v.filter(v=>v!=null);if(nn.length>1)ends.push({y:ly(nn[nn.length-1]),n:SZN[l.s],c:cs[i],how:SZN[l.s]+' toy'});else if(nn.length===1)s+=tx(lx(fr[0])+8,ly(nn[0])+(i===0?-6:12),SZN[l.s],{fs:11,c:cs[i]})});
  s+=endLabels(ends,W-pr+6);$('bC').innerHTML=svgW(W,H,s,'Gap against budget');
  $('bN').innerHTML=KN[conv]+' minus '+KN[native].toLowerCase()+', in points, per toy size. The paper\'s budget is the first point (2.5%); the small and large toys have only that point.'}
fit($('bC'),drawB);$('bT').addEventListener('change',()=>refit($('bC')));

// ===== 4. Composer =====
let cr=mulberry32(7),CF=LANG.facts(cr);
function cpFill(){$('cpN').innerHTML=CF.map(f=>'<option>'+f[0]+'</option>').join('');cpRun()}
function cpRun(){const nm=$('cpN').value,words=LANG.factWords(CF).concat(['so',nm]),ans=LANG.answerOf(CF,nm);
  $('cpFacts').innerHTML='Prompt: <code>'+words.join(' ')+'</code>';
  $('cpOut').innerHTML='<div class="out">'+['dec','enc','efd','dfe'].map(k=>{const S=EM.generate(EM.load(k),EM.enc(words),3),got=S.map(r=>EM.vocab[r.pick]),ok=got.join(' ')===ans.join(' ');
    return stat(KN[k],(ok?'✓ ':'✗ ')+got.join(' '),'confidence in first token '+(100*S[0].p[S[0].pick]).toFixed(0)+'%')}).join('')+'</div>'}
$('cpNew').addEventListener('click',()=>{CF=LANG.facts(cr);cpFill()});$('cpN').addEventListener('change',cpRun);
onTab('t-run',()=>{if(!$('cpN').options.length)cpFill()});

// ===== 5. Training logs =====
function drawLg(w){const sz=$('lgS').value,wh=$('lgW').value,W=w,H=240,pl=44,pr=12,pt=14,pb=38;if(!TY.logs){$('lgC').innerHTML='';return}
  const sfx=TY.logs[sz+'_efd_25']?'25':'10',ser=[['enc',KC.enc,null],['dec',KC.dec,null],['efd_'+sfx,KC.efd,'5 3'],['dfe_'+sfx,KC.dfe,'5 3']].map(([k,c,da])=>{const L=TY.logs[sz+'_'+k];return L?{k,c,da,pts:L.log.filter(r=>wh==='loss'||r.length>3).map(r=>[r[0]+(k.length>3?TY.logs[sz+'_enc'].steps:0),wh==='loss'?r[1]:100*r[3]])}:null}).filter(Boolean);
  const xm=Math.max(...ser.flatMap(s=>s.pts.map(p=>p[0]))),ys=ser.flatMap(s=>s.pts.map(p=>p[1])),lo=wh==='loss'?0:0,hi=wh==='loss'?Math.ceil(Math.max(...ys)*5)/5:100;
  const lx=v=>pl+(W-pl-pr)*v/xm,ly=v=>pt+(H-pt-pb)*(1-(v-lo)/(hi-lo));let s='';
  (wh==='loss'?[0,hi/2,hi]:[0,25,50,75,100]).forEach(v=>{s+=ln2(pl,ly(v),W-pr,ly(v),'var(--line)')+tx(pl-5,ly(v)+4,wh==='loss'?v.toFixed(1):v+'%',{fs:11,a:'end',c:'var(--mute)'})});
  const ps=TY.logs[sz+'_enc'].steps;s+=ln2(lx(ps),pt,lx(ps),H-pb,'var(--mute)',{da:'3 3'})+tx(lx(ps)-4,pt+24,'cross-objective starts',{fs:11,a:'end',c:'var(--mute)'});
  [0,ps/2,ps].forEach(v=>{s+=tx(lx(v),H-pb+16,fmt(v),{fs:11,a:v?'middle':'start',c:'var(--mute)'})});s+=tx((pl+W-pr)/2,H-4,'training step (batch 128)',{fs:11,a:'middle',c:'var(--mute)'});
  ser.forEach(q=>{let d='';q.pts.forEach((p,i)=>{d+=(i?'L':'M')+lx(p[0]).toFixed(1)+','+ly(p[1]).toFixed(1)});s+='<path d="'+d+'" fill="none" stroke="'+q.c+'" stroke-width="1.6"'+(q.da?' stroke-dasharray="'+q.da+'"':'')+'/>'});
  const L=legend([['Encoder (MLM)',KC.enc],['Decoder (CLM)',KC.dec],['Enc-from-dec (MNTP, '+sfx+'%)',KC.efd,'5 3'],['Dec-from-enc (CLM, '+sfx+'%)',KC.dfe,'5 3']],pl+4,H-pb-30,W-pl-pr);
  $('lgC').innerHTML=svgW(W,H,s+L.s,'Training curves');
  $('lgN').innerHTML=wh==='loss'?'Mean training loss per 100 steps, straight from the logs (not smoothed further). MLM and MNTP losses are over masked tokens only, CLM over every token, so the levels are not comparable across objectives; the shapes are.':'Every 500 steps, 200 held-out prompts: is the restated colour the most likely token, read the way the model is being trained (the next token for CLM, the masked colour for MLM, one position before it for MNTP)? This is where the two objectives\' data efficiency shows.'}
fit($('lgC'),drawLg);['lgS','lgW'].forEach(id=>$(id).addEventListener('change',()=>refit($('lgC'))));

// ===== 6. In-browser test =====
$('tstGo').addEventListener('click',()=>{const b=$('tstGo'),N=+$('tstN').value,r=mulberry32(99173),items=[];for(let i=0;i<N;i++)items.push(LANG.prompt(r));b.disabled=true;
  const ks=['dec','enc','efd','dfe'],ok={dec:0,enc:0,efd:0,dfe:0};let i=0;$('tstOut').textContent='Running...';
  function chunk(){const t0=performance.now();while(i<N&&performance.now()-t0<40){const it=items[i++];ks.forEach(k=>{const S=EM.generate(EM.load(k),EM.enc(it.words),3);if(S.map(x=>EM.vocab[x.pick]).join(' ')===it.answer.join(' '))ok[k]++})}
    if(i<N){$('tstOut').textContent='Running... '+i+' of '+N;setTimeout(chunk,0);return}
    const rep=TY.report||{};$('tstOut').innerHTML=ks.map(k=>'<b>'+KN[k]+'</b>: '+(100*ok[k]/N).toFixed(1)+'% exact on '+N+' prompts here'+(rep[k]?' · PyTorch, 1,000 prompts: '+(100*rep[k].quantised.generate).toFixed(1)+'%':'')).join('<br>');b.disabled=false}
  setTimeout(chunk,0)});

// ===== 6b. What the toy shows (computed from the measurements) =====
(function(){const el=$('rSum');if(!el||!TY.logs||!TY.cls||!TY.gen)return;
  const first=(k,th)=>{const L=TY.logs[k];if(!L)return null;const r=L.log.find(x=>x.length>3&&x[3]>=th);return r?r[0]:null};
  const C=(k,n)=>{const c=TY.cls[k+'@'+(n||2048)];return c?(100*c.mean).toFixed(1)+'%':'n/a'};
  const st=SIZES.map(s=>{const e=first(s+'_enc',.9),d=first(s+'_dec',.9);return SZN[s]+': decoder by step '+(d?fmt(d):'never')+', encoder '+(e?'by step '+fmt(e):'not within '+fmt(TY.logs[s+'_enc'].steps)+' steps')}).join('; ');
  const cc=TY.cls_check||{};const ck=k=>cc[k]?(100*cc[k].mean).toFixed(1)+'%':'n/a';
  el.innerHTML='<ol class="lst"><li><b>The decoder learns the lookup first.</b> The held-out probe (is the restated colour the top prediction?) first passes 90% at these steps: '+st+'. Same data, same order, same steps: CLM\'s loss on every token pays off at this tiny budget, as the paper says of small budgets (its §6).</li>'+
  '<li><b>Classification reproduces the paper\'s split, more sharply.</b> With 2,048 labels the encoders reach '+SIZES.map(s=>SZN[s]+' '+C(s+'_enc')).join(', ')+'; the decoders stay at chance ('+SIZES.map(s=>C(s+'_dec')).join(', ')+') even though they generate the same answers perfectly. The middle decoder stays at chance with mean pooling instead of the last token ('+ck('dec_mean_pool')+'), with five times the fine-tuning steps ('+ck('dec_5x_steps')+')'+(cc['dec_lr_0.0001_5x']?', and with lower learning rates ('+ck('dec_lr_0.0001_5x')+' at 1e-4, '+ck('dec_lr_0.0003_5x')+' at 3e-4)':'')+'; the encoder reaches '+ck('enc_5x_steps')+' with the longer run.</li>'+
  '<li><b>MNTP conversion helps classification, CLM conversion destroys it.</b> At the paper\'s 2.5% budget the encoders-from-decoders classify at '+SIZES.map(s=>SZN[s]+' '+C(s+'_efd_2p5')).join(', ')+'; the decoders-from-encoders fall to chance ('+SIZES.map(s=>C(s+'_dfe_2p5')).join(', ')+'). Unlike the paper\'s MNLI result, the toy\'s MNTP lifts the decoder far above where it started, and at the large size it passes the native encoder ('+C('l_efd_2p5')+' against '+C('l_enc')+', whose three fine-tuning seeds spread from '+(100*Math.min(...TY.cls['l_enc@2048'].test)).toFixed(0)+'% to '+(100*Math.max(...TY.cls['l_enc@2048'].test)).toFixed(0)+'%).</li>'+
  '<li><b>Generation saturates.</b> Every model that learned the lookup generates the answer exactly on 98.5% to 100% of prompts, including encoders filling masks and both conversions; only the small encoder (which never learned it) and its conversion fail ('+(100*TY.gen.s_enc.generate).toFixed(1)+'% and '+(100*TY.gen.s_dfe_2p5.generate).toFixed(1)+'%). The paper\'s generative gap lives in knowledge and long continuations that a 26-word world cannot pose, so the toy does not test it.</li></ol>'})();

// ===== 7. Trust notes =====
(function(){const el=$('trustT');if(!el)return;const c=TY.check,o=TY.overlap,rep=TY.report;let h='<ul class="lst">';
  h+='<li><b>What is copied and what is not.</b> Copied: one architecture for both members of each pair (ModernBERT\'s block: pre-norm, bias-free LayerNorm, GLU with GELU, rotary positions, tied prediction head), identical initial weights, the same documents in the same order, the same optimiser and trapezoidal schedule, MLM at 30% then 15% in the decay phase, cross-objective training from the final model with a fresh trapezoid (3/50 warmup, 10/50 decay), MNTP at 15% read one position early, and generation by three masks. Not copied: scale (11 thousand to 146 thousand parameters against 17 million to 1 billion), the context-extension phase, sliding-window attention, dropout, real text.</li>';
  if(c)h+='<li><b>The browser runs the same models.</b> The JavaScript forward pass matches PyTorch on the shipped weights: '+c.summary+'</li>';
  if(rep)h+='<li><b>Quantisation</b> to 6 bits changes exact-match generation by at most '+Math.max(...Object.keys(rep).map(k=>Math.abs((rep[k].quantised.generate-(TY.gen&&TY.gen[SH+'_'+k+(k==='efd'||k==='dfe'?'_2p5':'')]?TY.gen[SH+'_'+k+(k==='efd'||k==='dfe'?'_2p5':'')].generate:rep[k].quantised.generate))*100))).toFixed(1)+' points on 1,000 prompts.</li>';
  if(o)h+='<li><b>Test prompts are new.</b> '+o.summary+'</li>';
  h+='<li><b>One pretraining seed per model</b>; classification has 3 fine-tuning seeds (the error bars), which share one pretrained model and so hide pretraining-seed noise (the lesson from the BERT page). Read differences of a few points as noise.</li>';
  h+='<li><b>The toy measures objectives at a tiny budget.</b> A few thousand steps is the regime where the paper itself says CLM\'s per-token efficiency matters most (its §6 on the concurrent 100B-token study). Where the toy disagrees with the paper, this is the first suspect; the toy is shown beside the paper\'s numbers, not tuned until it agrees.</li></ul>';
  el.innerHTML=h})();
})();
