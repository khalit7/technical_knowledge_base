// ---- The paper tab: objectives animation, suite table, recipe chart, Figure 1 and 2 rebuilt, predict reveals ----
(function(){
const P=window.PAPER,T=P.tables,RC=P.rc;
const KC={enc:'var(--c1)',dec:'var(--c2)',efd:'var(--c3)',dfe:'var(--c5)'};
const KN={enc:'Encoder',dec:'Decoder',efd:'Enc-from-dec',dfe:'Dec-from-enc'};
const SZ=['17M','32M','68M','150M','400M','1B'],SM=[17,32,68,150,400,1000];
window.ETT={KC,KN,SZ,SM};

// ===== 1. Objectives animation (four modes on one toy document) =====
const DOC=['[BOS]','ann','red','cup','.','bob','blue','box','.','so','bob','blue','box','.','[EOS]'];
const TGT=11; // the restated colour "blue": the position every mode is asked about in the last step
function maskSet(rate,seed){const r=mulberry32(seed),cand=[];for(let i=1;i<DOC.length-1;i++)if(i!==TGT)cand.push(i);
  const n=Math.max(1,Math.round((DOC.length-2)*rate))-1,out=[TGT];for(let k=0;k<n;k++){out.push(cand.splice(Math.floor(r()*cand.length),1)[0])}return out.sort((a,b)=>a-b)}
const MS={mlm:maskSet(.30,5),mntp:maskSet(.15,9)};
const MODES={
  clm:{causal:true,label:'Decoder (CLM)',model:'dec',steps:[
    {t:'The document',c:'A toy document: two facts, then one restated. A decoder reads it as it is, with nothing hidden.'},
    {t:'The attention mask: causal',c:'Each token may read only itself and the tokens to its left: the lower triangle. Row <i>i</i> never sees column <i>j</i> &gt; <i>i</i>.'},
    {t:'Every position predicts the next token',c:'The output at position <i>i</i> is scored on token <i>i</i> + 1. Every one of the 14 positions gives a loss, from "ann" after [BOS] to [EOS] after the last full stop.'},
    {t:'Asked about "blue" in the restatement',c:'The decoder reads its prediction for "blue" at the position before it, "bob", having seen only the left context, which here contains the answer: bob blue box. Live probability from this page\'s small toy decoder.'}]},
  mlm:{causal:false,label:'Encoder (MLM)',model:'enc',steps:[
    {t:'The document, with 30% of tokens masked',c:'The encoder\'s input: 30% of the tokens (here 4 of 13) are chosen; 80% of those become [MASK], 10% a random word, 10% stay. Ettin masks 30% for most of training and 15% in the decay phase.'},
    {t:'The attention mask: bidirectional',c:'Every token reads every token, left and right: the full square. Nothing leaks, because the answers at the masked positions are no longer in the input.'},
    {t:'Only the masked positions predict',c:'Each masked position is scored on its own original token. The other positions give no loss: a third of the signal per document compared with the decoder, the paper\'s explanation of why MLM needs more data.'},
    {t:'Asked about "blue" in the restatement',c:'The encoder reads its prediction for "blue" at the masked position itself, using both sides. Live probability from this page\'s small toy encoder, which had not yet learned this lookup when its 8,000 steps ran out (the decoder learned it by step 1,500): MLM\'s data inefficiency at toy scale, measured in the Train the pairs tab.'}]},
  mntp:{causal:false,label:'Encoder-from-decoder (MNTP)',model:'efd',steps:[
    {t:'A trained decoder, 15% of tokens masked',c:'Cross-objective training starts from the final decoder. MNTP masks 15% of tokens (footnote 10: "a middle ground").'},
    {t:'The attention mask: now bidirectional',c:'The causal mask is removed: every token reads every token, as in an encoder. The weights were trained with the triangle; this is the change they must adapt to.'},
    {t:'Masked token, predicted one position earlier',c:'The twist from LLM2Vec: the masked token at <i>i</i> is scored at position <i>i</i> − 1, the position that predicted it when the model was a decoder. The head keeps its old job; only the context it sees grows.'},
    {t:'Asked about "blue" in the restatement',c:'Read at "bob", the position before the mask, with both sides visible. Live probability from the toy encoder-from-decoder (the small toy decoder after 2.5% of its pretraining budget of MNTP, the paper\'s ratio).'}]},
  dfe:{causal:true,label:'Decoder-from-encoder (CLM)',model:'dfe',steps:[
    {t:'A trained encoder, nothing masked',c:'Cross-objective training the other way starts from the final encoder and feeds it plain documents.'},
    {t:'The attention mask: now causal',c:'The triangle is imposed on weights that were trained to read both ways: every head loses its right-hand context.'},
    {t:'Every position predicts the next token',c:'Plain CLM: position <i>i</i> is scored on token <i>i</i> + 1, a different job for the prediction head, which used to fill a mask at its own position.'},
    {t:'Asked about "blue" in the restatement',c:'Read at "bob" with left context only. Live probability from the small toy decoder-from-encoder (2.5% of pretraining spent on CLM), which inherits the small encoder\'s missing lookup.'}]}};
const live={};
function liveProb(mode){if(live[mode]!=null)return live[mode];if(!window.EM)return null;
  const M=MODES[mode];let p=null;try{const m=EM.load(M.model),blue=EM.IDX.blue;
    if(mode==='clm'||mode==='dfe'){const ids=DOC.slice(0,TGT).map(w=>w==='[BOS]'?EM.BOS:EM.IDX[w]);const H=EM.hidden(m,ids,true);p=EM.softmax(EM.logits(m,H.X[TGT-1]))[blue]}
    else{const ms=MS[mode],ids=DOC.map((w,i)=>w==='[BOS]'?EM.BOS:w==='[EOS]'?EM.EOS:ms.includes(i)?EM.MASK:EM.IDX[w]);const H=EM.hidden(m,ids,false);p=EM.softmax(EM.logits(m,H.X[mode==='mntp'?TGT-1:TGT]))[blue]}}catch(e){p=null}
  return live[mode]=p}
function inputOf(mode){if(mode==='mlm'||mode==='mntp'){const ms=MS[mode];return DOC.map((w,i)=>ms.includes(i)?'[M]':w)}return DOC}
function scored(mode){// [from position, target position]
  if(mode==='clm'||mode==='dfe')return DOC.slice(0,-1).map((_,i)=>[i,i+1]);
  if(mode==='mlm')return MS.mlm.map(i=>[i,i]);return MS.mntp.map(i=>[i-1,i])}
function drawOx(mode,k,e,w){const M=MODES[mode],n=DOC.length,inp=inputOf(mode),sc=scored(mode);
  const lw=46,cell=Math.max(9,Math.min(22,Math.floor((w-lw-8)/n))),gw=cell*n,x0=Math.max(lw,Math.floor((w-gw)/2)),top=58,H=top+gw+70;
  let s='';
  // token row (columns) with rotated labels
  inp.forEach((t,j)=>{const x=x0+j*cell+cell/2,m=t==='[M]';s+='<text x="'+x.toFixed(1)+'" y="'+(top-6)+'" font-size="11" transform="rotate(-60 '+x.toFixed(1)+' '+(top-6)+')" fill="'+(m?'var(--c3)':'var(--ink)')+'"'+(m?' font-weight="600"':'')+'>'+t.replace('[BOS]','BOS').replace('[EOS]','EOS').replace('[M]','MASK')+'</text>'});
  // row labels on the left (every other one when cramped)
  inp.forEach((t,i)=>{if(cell<12&&i%2)return;s+=tx(x0-4,top+i*cell+cell/2+4,t.replace('[BOS]','BOS').replace('[EOS]','EOS').replace('[M]','MASK'),{fs:11,a:'end',c:t==='[M]'?'var(--c3)':'var(--mute)'})});
  // grid
  const fillTo=k===0?0:k===1?e:1;
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){const allowed=!M.causal||j<=i,shown=allowed&&(i+1)/n<=fillTo+1e-9;
    s+=rc(x0+j*cell+.5,top+i*cell+.5,cell-1,cell-1,shown?'var(--acc)':'var(--soft)',{r:1.5,op:shown?.55:1})}
  // scored positions
  if(k>=2){const op=k===2?e:1;sc.forEach(([a,b])=>{const xa=x0+a*cell+cell/2,xb=x0+b*cell+cell/2,y=top+gw+12;
      s+=G(op,ln2(xa,y,xb,y+18,'var(--c2)',{sw:1.6})+'<circle cx="'+xa.toFixed(1)+'" cy="'+y+'" r="2.6" fill="var(--c2)"/><circle cx="'+xb.toFixed(1)+'" cy="'+(y+18)+'" r="3.2" fill="none" stroke="var(--c2)" stroke-width="1.4"/>')});
    s+=tx(4,top+gw+48,'dot: the position whose output is scored',{fs:11,c:'var(--mute)'})+tx(4,top+gw+62,'ring: the token it must predict',{fs:11,c:'var(--mute)'})}
  if(k===3){const [a,b]=sc.find(([a,b])=>b===TGT)||[TGT-1,TGT],xa=x0+a*cell+cell/2;s+=rc(x0+b*cell,top-50,cell,gw+50,'none',{s:'var(--c5)',sw:2,r:3})+rc(xa-cell/2,top+a*cell,cell,cell,'none',{s:'var(--c5)',sw:2.4,r:2})}
  return svgW(w,H,s,'Attention mask and scored positions for '+M.label)}
function oxCount(mode,k,e){const M=MODES[mode],n=DOC.length,sc=scored(mode),cells=M.causal?n*(n+1)/2:n*n,p=liveProb(mode);
  return stat('Tokens',n,'including BOS and EOS')+stat('Attention cells open',k>=1?fmt(cells)+' of '+fmt(n*n):'·',k>=1?(M.causal?'causal: the lower triangle':'bidirectional: all of them'):'')+
    stat('Positions with a loss',k>=2?sc.length+' of '+(n-1):'·',k>=2?Math.round(100*sc.length/(n-1))+'% of predictable tokens':'')+
    stat('P("blue") from the toy',k>=3?(p==null?'n/a':(100*p).toFixed(1)+'%'):'·',k>=3?'read at '+(mode==='mlm'?'the mask itself':'"bob", one position earlier'):'')}
makeAnim({id:'ox',mode:'clm',modes:Object.fromEntries(Object.entries(MODES).map(([k,v])=>[k,v.steps])),draw:drawOx,counters:oxCount,dur:2600});

// ===== 2. Suite table: Table 1 with the recount =====
(function(){const el=$('suiteT');if(!el)return;const t1=T.T1,row=n=>t1.rows.find(r=>r.name===n).v;
  let h='<table><thead><tr><th>Size</th><th class="num">Layers</th><th class="num">Hidden</th><th class="num">GLU width</th><th class="num">Heads</th><th class="num">Peak LR</th><th class="num">Params (Table 11)</th><th class="num">Recounted</th><th class="num">of which embeddings</th></tr></thead><tbody>';
  RC.params.forEach((p,i)=>{h+='<tr><td>'+t1.sizes[i]+' <span class="mute">'+t1.size_names[i]+'</span></td><td class="num">'+p.layers+'</td><td class="num">'+p.hidden+'</td><td class="num">'+fmt(p.inter)+'</td><td class="num">'+p.heads+'</td><td class="num">'+row('Learning Rate')[i]+'</td><td class="num">'+p.printed[0]+'</td><td class="num">'+p.total_M.toFixed(1)+'M</td><td class="num">'+p.embed_M.toFixed(1)+'M ('+Math.round(100*p.embed_M/p.total_M)+'%)</td></tr>'});
  el.innerHTML=h+'</tbody></table>'})();

// ===== 3. Recipe chart =====
function drawRecipe(w){const el=$('recipeC'),mode=$('recipeS').value;
  const pl=44,pr=10,pt=24,H=230,pb=46,W=w,iw=W-pl-pr;
  // piecewise x axis (not to scale): pretraining 52%, context extension 22%, decay 12%, cross-objective 14%
  const nw=w<620,ph=[[nw?'Pretrain':'Pretraining','1.7T',0,.52],[nw?'Extend':'Context extension','250B',.52,.74],['Decay','50B',.74,.87],[nw?'Cross':'Cross-objective','50B',.89,1]];
  const X=f=>pl+iw*f;let s='';
  ph.forEach(([n,t,a,b],i)=>{s+=rc(X(a),pt,X(b)-X(a)-2,H-pt-pb,i===3?'var(--soft)':'var(--bg)',{s:'var(--line)',r:3});s+=tx((X(a)+X(b))/2,H-pb+14,n,{fs:11,a:'middle'})+tx((X(a)+X(b))/2,H-pb+28,t,{fs:11,a:'middle',c:'var(--mute)'})});
  if(mode==='lr'){const y=v=>pt+(H-pt-pb)*(1-v);
    [0,.5,1].forEach(v=>{s+=tx(pl-6,y(v)+4,v===1?'peak':v===.5?'1/2':'0',{fs:11,a:'end',c:'var(--mute)'})});
    let d='';const N=200;for(let i=0;i<=N;i++){const f=i/N;let v,x;
      if(f<.52){const u=f/.52;v=u<.03?u/.03:1;x=X(f)}else if(f<.74){const u=(f-.52)/.22;v=1/Math.sqrt(1+3*u);x=X(f)}else if(f<.87){const u=(f-.74)/.13;v=.5/Math.sqrt(1+624*u);x=X(f)}else continue;d+=(d?'L':'M')+x.toFixed(1)+','+y(v).toFixed(1)}
    s+='<path d="'+d+'" fill="none" stroke="var(--c1)" stroke-width="2"/>';
    let d2='';for(let i=0;i<=60;i++){const u=i/60,v=u<3/50?u/(3/50):u<40/50?1:1-(u-40/50)/(10/50)*.98;d2+=(d2?'L':'M')+X(.89+.11*u).toFixed(1)+','+y(v).toFixed(1)}
    s+='<path d="'+d2+'" fill="none" stroke="var(--c1)" stroke-width="2" stroke-dasharray="5 3"/>';
    const ym=v=>y(v*2);s+='<path d="M'+X(0)+','+ym(.3)+'H'+X(.74)+'V'+ym(.15)+'H'+X(.87)+'" fill="none" stroke="var(--c3)" stroke-width="2"/>'+'<path d="M'+X(.89)+','+ym(.15)+'H'+X(1)+'" fill="none" stroke="var(--c3)" stroke-width="2" stroke-dasharray="5 3"/>';
    s+=tx(X(.02),ym(.3)-5,'encoder masking 30%',{fs:11,c:'var(--c3)'})+tx(X(.745),ym(.15)-5,'15%',{fs:11,c:'var(--c3)'})+tx(X(.3),y(1)-5,'learning rate',{fs:11,c:'var(--c1)'});
    $('recipeN').innerHTML='Phases are drawn side by side, not to scale (pretraining is 34 times the decay phase; on narrow screens the phases are labelled Pretrain, Extend, Decay and Cross). The learning-rate endpoints are the paper\'s (peak, half the peak, 0.02 of the peak); the curve between them is an inverse square root drawn to hit those endpoints, an illustration, since the paper names the schedule but not its constants. The cross-objective schedule (dashed) is a new trapezoid: 3B tokens of warmup, 10B of decay; its end value is not stated (drawn at 0.02). The masking ratio (green, drawn at twice the scale) applies to the encoder; the encoder-from-decoder\'s MNTP uses 15%. Peak learning rates per size are in the suite table above.'}
  else{const cats={};T.T2.rows.forEach(r=>{cats[r.cat]=cats[r.cat]||[0,0,0];[1,3,5].forEach((c,i)=>{const v=r.v[c];if(v!=='–'&&v!=='-')cats[r.cat][i]+=parseFloat(v)})});
    const cn=Object.keys(cats),cols=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--dim)','var(--acc)'];
    [0,1,2].forEach(i=>{const [n,t,a,b]=ph[i];let y0=H-pb;cn.forEach((c,ci)=>{const v=cats[c][i],h=(H-pt-pb)*v/100;if(v>0){s+='<g><title>'+c+': '+v.toFixed(1)+'% of '+n.toLowerCase()+' tokens</title>'+rc(X(a)+6,y0-h,X(b)-X(a)-14,h,cols[ci%cols.length],{r:0})+'</g>';if(h>13&&X(b)-X(a)>60)s+=tx((X(a)+X(b))/2,y0-h/2+4,c+' '+Math.round(v)+'%',{fs:11,a:'middle',c:'#fff'})}y0-=h})});
    if(!nw)s+=tx(X(.945),pt+(H-pt-pb)/2,'decay data',{fs:11,a:'middle',c:'var(--mute)'})+tx(X(.945),pt+(H-pt-pb)/2+14,'again',{fs:11,a:'middle',c:'var(--mute)'});
    const L=legend(cn.map((c,i)=>[c,cols[i%cols.length]]),pl,8,iw);s+='<g transform="translate(0,0)">'+L.s.replace(/<line[^>]*\/>/g,m=>m.replace('stroke-width="2.2"','stroke-width="6"'))+'</g>';
    $('recipeN').innerHTML='Shares of each phase\'s tokens by category, from '+A(P.meta.ax+'#S3.T2','Table 2')+'; hover a block for its value. Phases are drawn side by side, not to scale. The pretraining column sums to 99.8% as printed. The decay phase\'s rows sum to 76.3B tokens against the 50B the text trains on: the table lists source sizes, and sources are sampled, repeated or under-sampled to hit the token counts (the caption). Cross-objective training reuses the decay data.'}
  el.innerHTML=svgW(W,mode==='mix'?H+0:H,s,'Ettin training recipe')}
fit($('recipeC'),drawRecipe);$('recipeS').addEventListener('change',()=>refit($('recipeC')));

// ===== 4. Figure 1 rebuilt from Table 9 =====
const F1=RC.fig1_data,TN={mnli:'MNLI accuracy',msmarco:'MS MARCO dev nDCG@10',gen:'generative average'};
function drawF1(w){const t=$('f1T').value,hl=$('f1H').value,d=F1[t];
  const all=[].concat(...Object.values(d)),lo=Math.floor(Math.min(...all)-1),hi=Math.ceil(Math.max(...all)+1);
  const W=w,H=Math.min(330,Math.max(250,w*.55)),pl=40,pr=12,pt=14,pb=40,lx=v=>pl+(W-pl-pr)*(Math.log10(v)-Math.log10(14))/(Math.log10(1200)-Math.log10(14)),ly=v=>pt+(H-pt-pb)*(1-(v-lo)/(hi-lo));
  let s='';const step=(hi-lo)>12?4:(hi-lo)>6?2:1;
  for(let v=Math.ceil(lo/step)*step;v<=hi;v+=step){s+=ln2(pl,ly(v),W-pr,ly(v),'var(--line)')+tx(pl-5,ly(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})}
  SM.forEach((m,i)=>{s+=tx(lx(m),H-pb+16,SZ[i],{fs:11,a:'middle',c:'var(--mute)'})});s+=tx((pl+W-pr)/2,H-6,'model size (log scale)',{fs:11,a:'middle',c:'var(--mute)'});
  const on=k=>hl==='all'||(hl==='pair'&&(k==='enc'||k==='dec'))||(hl==='conv'&&true);
  ['enc','dec','efd','dfe'].forEach(k=>{const op=on(k)?1:.15,da=(k==='efd'||k==='dfe')?'5 3':null;let dd='';d[k].forEach((v,i)=>{dd+=(i?'L':'M')+lx(SM[i]).toFixed(1)+','+ly(v).toFixed(1)});
    s+='<g opacity="'+op+'"><path d="'+dd+'" fill="none" stroke="'+KC[k]+'" stroke-width="2"'+(da?' stroke-dasharray="'+da+'"':'')+'/>';
    d[k].forEach((v,i)=>{s+='<circle cx="'+lx(SM[i]).toFixed(1)+'" cy="'+ly(v).toFixed(1)+'" r="'+(k==='efd'||k==='dfe'?3:4)+'" fill="'+(k==='efd'||k==='dfe'?'var(--bg)':KC[k])+'" stroke="'+KC[k]+'" stroke-width="1.6"><title>'+KN[k]+' '+SZ[i]+': '+v+'</title></circle>'});s+='</g>'});
  if(hl==='conv'){// arrows from the native model to its conversion
    [['dec','efd'],['enc','dfe']].forEach(([a,b])=>d[a].forEach((v,i)=>{s+=ln2(lx(SM[i])+3,ly(v),lx(SM[i])+3,ly(d[b][i]),KC[b],{sw:1.2,op:.8})}))}
  const L=legend(['enc','dec','efd','dfe'].map(k=>[KN[k],KC[k],(k==='efd'||k==='dfe')?'5 3':null]),pl+4,pt+12,W-pl-pr);
  $('f1C').innerHTML=svgW(W,H,s+'<g opacity=".95">'+L.s+'</g>','Figure 1 rebuilt: '+TN[t]);
  const g=RC.fig1_gaps,r=RC.size_ratio;let n='';
  if(t==='mnli')n='Encoder minus decoder at each size: '+d.enc.map((v,i)=>(v-d.dec[i]).toFixed(1)).join(', ')+'. The encoder-from-decoder minus the decoder it came from: '+g.mnli_efd_minus_dec.join(', ')+' (no gain; worse at 400M and 1B). Largest size ratio a native encoder beats a native decoder at: '+r.mnli_enc_vs_dec.ratio+'x ('+r.mnli_enc_vs_dec.small+' over '+r.mnli_enc_vs_dec.big+', '+r.mnli_enc_vs_dec.v_small+' against '+r.mnli_enc_vs_dec.v_big+').';
  if(t==='msmarco')n='MNTP\'s lift over the decoder: '+g.msmarco_efd_minus_dec.join(', ')+'. The encoder\'s remaining lead over the encoder-from-decoder: '+g.msmarco_enc_minus_efd.join(', ')+' (the standard error of such a difference is up to about '+RC.noise.marco_diff_se_bound+' on 6,980 queries). Largest size ratio a native encoder beats a native decoder at: '+r.msmarco_enc_vs_dec.ratio+'x, by '+(r.msmarco_enc_vs_dec.v_small-r.msmarco_enc_vs_dec.v_big).toFixed(2)+'.';
  if(t==='gen')n='Decoder minus decoder-from-encoder: '+g.gen_dec_minus_dfe.join(', ')+' (the 1B models had a third of the pretraining and a third of the conversion budget). CLM continued training lifts the encoder by '+g.gen_dfe_minus_enc.join(', ')+'. Largest size ratio a native decoder beats an encoder used generatively at: '+r.gen_dec_vs_enc.ratio+'x.';
  $('f1N').innerHTML='<p class="small mute" style="margin:6px 0 0">'+n+' Values from '+A(P.meta.ax+'#A7.T9','Table 9')+'; sizes plotted at 17M to 1B (Figure 1\'s axis is labelled 15M, 30M, 70M, 110M, 340M, 770M, but its points sit at the true sizes, decoded from the SVG).</p>'}
fit($('f1C'),drawF1);['f1T','f1H'].forEach(id=>$(id).addEventListener('change',()=>refit($('f1C'))));

// ===== 5. Predict reveals =====
function gapBars(el,rows,unit){fit(el,w=>{const W=w,bh=16,gap=8,pl=48,H=rows.length*(2*bh+gap)+30,mx=Math.max(...rows.flatMap(r=>[Math.abs(r.a),Math.abs(r.b)]))*1.15,x0=pl+(W-pl-60)*0.08,sx=v=>(W-pl-60)*v/mx;
  let s='';rows.forEach((r,i)=>{const y=6+i*(2*bh+gap);s+=tx(pl-6,y+bh+4,r.n,{fs:11,a:'end'});
    [[r.a,r.ca,r.la],[r.b,r.cb,r.lb]].forEach(([v,c,l],j)=>{const yy=y+j*bh;const x=v>=0?x0:x0+sx(v);s+=rc(x,yy+2,Math.abs(sx(v)),bh-4,c,{r:2})+tx(Math.max(x0,x0+sx(v))+4,yy+bh-4,(v>0?'+':'')+v.toFixed(1)+(j===0?'':''),{fs:11,c:'var(--mute)'})})});
  s+=ln2(x0,0,x0,H-26,'var(--mute)');const L=legend([[rows[0].la,rows[0].ca],[rows[0].lb,rows[0].cb]],pl,H-8,W-pl);el.innerHTML=svgW(W,H+4,s+L.s,'gaps')})}
PRED_REVEAL['pr-mnli']=()=>{const d=F1.mnli;gapBars($('prMnli'),SZ.map((n,i)=>({n,a:+(d.enc[i]-d.dec[i]).toFixed(1),b:+(d.enc[i]-d.efd[i]).toFixed(1),ca:KC.dec,cb:KC.efd,la:'encoder lead over the decoder',lb:'lead left after 50B tokens of MNTP'})))};
PRED_REVEAL['pr-ratio']=()=>{const r=RC.size_ratio,row=(t,x,w)=>x?'<tr><td>'+t+'</td><td class="num"><b>'+x.ratio+'x</b></td><td>'+x.small+' '+w+' over '+x.big+' '+KN[x.loser].toLowerCase()+'</td><td class="num">'+x.v_small+' against '+x.v_big+'</td></tr>':'<tr><td>'+t+'</td><td class="num">none</td><td colspan="2">no smaller native model wins</td></tr>';
  $('prRatio').innerHTML='<div class="tw"><table><thead><tr><th>Task</th><th class="num">Largest ratio</th><th>Which models</th><th class="num">Scores</th></tr></thead><tbody>'+
   row('MNLI, encoder against decoder',r.mnli_enc_vs_dec,'encoder')+row('MNLI, encoder against enc-from-dec',r.mnli_enc_vs_efd,'encoder')+row('MS MARCO, encoder against decoder',r.msmarco_enc_vs_dec,'encoder')+row('MS MARCO, encoder against enc-from-dec',r.msmarco_enc_vs_efd,'encoder')+row('Generative, decoder against encoder',r.gen_dec_vs_enc,'decoder')+row('Generative, decoder against dec-from-enc',r.gen_dec_vs_dfe,'decoder')+'</tbody></table></div>'};

// ===== 6. Figure 2 rebuilt =====
function drawF2(w){const f=RC.fig2_counts,panels=Object.keys(f),W=w,ph=150,H=panels.length*(ph+34)+36,pl=34,pr=8;let s='';const cs={male:'var(--c1)',female:'var(--c5)',neutral:'var(--c3)'};
  panels.forEach((p,pi)=>{const y0=pi*(ph+34)+24,bw=(W-pl-pr)/6;s+=tx(pl,y0-8,p.replace('Ettin-',''),{fs:12,w:600});
    [0,50,100].forEach(v=>{const y=y0+ph*(1-v/100);s+=ln2(pl,y,W-pr,y,'var(--line)')+tx(pl-4,y+4,v+'%',{fs:11,a:'end',c:'var(--mute)'})});
    Object.keys(f[p]).forEach((sz,i)=>{let yb=y0+ph;['male','female','neutral'].forEach(k=>{const c=f[p][sz][k],h=ph*c/240;s+='<g><title>'+p+' '+sz+': '+k+' '+c+' of 240 ('+(100*c/240).toFixed(1)+'%)</title>'+rc(pl+i*bw+bw*.15,yb-h,bw*.7,h,cs[k],{r:0})+'</g>';if(h>14)s+=tx(pl+i*bw+bw/2,yb-h/2+4,Math.round(100*c/240)+'%',{fs:11,a:'middle',c:'#fff'});yb-=h});
      s+=tx(pl+i*bw+bw/2,y0+ph+14,sz,{fs:11,a:'middle',c:'var(--mute)'})})});
  const L=legend([['male',cs.male],['female',cs.female],['neutral',cs.neutral]],pl,H-6,W-pl);$('f2C').innerHTML=svgW(W,H,s+L.s.replace(/stroke-width="2.2"/g,'stroke-width="6"'),'Figure 2 rebuilt: predicted pronouns')}
fit($('f2C'),drawF2);
})();
