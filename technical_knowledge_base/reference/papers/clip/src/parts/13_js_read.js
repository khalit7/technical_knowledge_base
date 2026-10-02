// ---- The paper tab: the objective animation, the batch matrix, the zero-shot animation, and the inline charts ----
(function(){
const OBS=[0,2,8,13].map(k=>pair(SEED_PAGE+k));            // four pairs from the toy web, drawn with the page's generator
const sim=(a,b)=>CLIP.scale*CLIP.dot(a,b);
const lse=v=>{const m=Math.max(...v);return m+Math.log(v.reduce((s,x)=>s+Math.exp(x-m),0))};
function batchLoss(L){const n=L.length;let li=0,lt=0;for(let i=0;i<n;i++){li+=lse(L[i])-L[i][i];const col=L.map(r=>r[i]);lt+=lse(col)-L[i][i]}return {li:li/n,lt:lt/n,l:(li+lt)/(2*n)}}
const ABOUT=new Set([].concat(TG.SHAPES,TG.COLOURS,['big','large','small','little','tiny','left','right','middle','drawing','sketch','drew','photo','picture']));
const words=s=>s.split(/\s+/).filter(Boolean);
const lmRun=RUN('lm'),lmLoss=lmRun&&lmRun.loss.length?lmRun.loss[lmRun.loss.length-1][1]:null;   // nats per token at the end of training
// ---------- objective animation ----------
function obDraw(m,k,e,w){const n=4,ts=Math.max(30,Math.min(46,w*.09)),gap=6;
  const I=OBS.map(p=>CLIP.image(p.img,'s'+p.seed)),T=OBS.map(p=>CLIP.text(p.cap));
  let s='',y0=m==='con'?96:8;const sw=Math.min(120,w*.2),x1=ts+8;
  // images and their embeddings (step 0 onwards)
  OBS.forEach((p,i)=>{const y=y0+i*(ts+gap);s+=svgImg(p.img,0,y,ts);s+=G(k===0?e:1,strip(I[i].e,x1,y+ts/2-6,sw,12))});
  s+=tx(x1,y0-6,'image embeddings',{fs:11,c:'var(--mute)'});
  if(m==='con'){const mx=x1+sw+16,cs=Math.min(48,(w-mx-4)/n);
    // captions' embeddings as vertical strips over the columns
    if(k>=1){T.forEach((t,j)=>{const cx=mx+j*cs+cs/2;s+=G(k===1?e:1,'<g transform="translate('+(cx-6)+',8) rotate(90 0 0) translate(0,-12)">'+strip(t.e,0,0,64,12)+'</g>'+tx(cx,86,'T'+(j+1),{a:'middle',fs:11,w:600}))});
      s+=tx(mx-6,40,'text',{a:'end',fs:11,c:'var(--mute)'})+tx(mx-6,54,'embeddings',{a:'end',fs:11,c:'var(--mute)'})}
    if(k>=2){const L=I.map(a=>T.map(b=>sim(a.e,b.e))),lo=Math.min(...L.flat()),hi=Math.max(...L.flat());
      const shown=k===2?Math.floor(e*n*n+.001):n*n;
      for(let i=0;i<n;i++)for(let j=0;j<n;j++){const q=i*n+j;if(q>=shown)continue;const y=y0+i*(ts+gap)+(ts-cs*.9)/2,x=mx+j*cs;
        let v=(L[i][j]-lo)/(hi-lo),stroke=i===j?'var(--good)':null;
        if(k>=3){const pr=CLIP.softmax(k===3?L[i]:L.map(r=>r[j]));v=k===3?pr[j]:pr[i]}
        s+=heatCell(x+1,y,cs-2,cs*.9,v,{s:stroke,sw:i===j?2:0});
        s+=tx(x+cs/2,y+cs*.45+4,k>=3?((k===3?CLIP.softmax(L[i])[j]:CLIP.softmax(L.map(r=>r[j]))[i])*100).toFixed(0)+'%':L[i][j].toFixed(1),{a:'middle',fs:11,c:v>.55?'#fff':'var(--ink)'})}
      if(k>=3)s+=tx(mx,y0+n*(ts+gap)+12,k===3?'each row: softmax over the 4 captions':'each column: softmax over the 4 images',{fs:11,c:'var(--mute)'})}
    let cy=y0+n*(ts+gap)+(k>=3?30:14);
    if(k>=1)OBS.forEach((p,j)=>{s+=tx(0,cy+j*15,'T'+(j+1)+': '+p.cap,{fs:11});});
    return svgW(w,cy+4*15+4,s,'contrastive objective on four pairs')}
  // captioning: write each caption token by token
  const cx=x1+sw+16,avail=w-cx-4;let maxY=y0+n*(ts+gap);
  if(k>=1){OBS.forEach((p,i)=>{if(k===1&&i>0)return;const ws=words(p.cap).concat(['<eos>']),y=y0+i*(ts+gap);let x=cx,row=0;
      const upto=k===1?Math.floor(e*ws.length+.001):ws.length;
      ws.forEach((wd,q)=>{if(q>=upto)return;const bw=wd.length*6.6+10;if(x+bw>cx+avail){x=cx;row++}
        const filler=k>=3&&!ABOUT.has(wd)&&wd!=='<eos>';const yy=y+row*17+(ts/2-13);
        s+=rc(x,yy,bw,15,filler?'var(--hl)':'var(--soft)',{s:'var(--line)'})+tx(x+bw/2,yy+11.5,wd.replace('<','&lt;').replace('>','&gt;'),{a:'middle',fs:11});x+=bw+3;maxY=Math.max(maxY,yy+20)})});
    if(k===1)s+=wrapTx(cx,y0+ts+gap+ts/2,'each box: one choice out of '+TG.VOCAB.length+' tokens',w-cx-4,{fs:11,c:'var(--mute)'}).s}
  let extra=0;if(k>=3){const q=wrapTx(cx,maxY+12,'highlighted: words the picture cannot predict',w-cx-4,{fs:11,c:'var(--mute)'});s+=q.s;extra=q.h}
  return svgW(w,maxY+8+Math.max(12,extra),s,'captioning objective on four pairs')}
function obCnt(m,k,e){const toks=OBS.reduce((a,p)=>a+words(p.cap).length+1,0),n=4;
  if(m==='con'){const L=OBS.map(p=>OBS.map(q=>sim(CLIP.image(p.img,'s'+p.seed).e,CLIP.text(q.cap).e))),b=batchLoss(L);
    return stat('Choices per image',k>=3?'1 of '+n:'',k>=3?'log₂ '+n+' = 2 bits; at the paper\'s 32,768: 15 bits':'')+stat('Pairs scored',k>=2?Math.min(n*n,Math.floor((k===2?e:1)*n*n+.001))+' of '+n*n:'0','N² for a batch of N')+stat('Loss',k>=4?b.l.toFixed(3):'',k>=4?'image side '+b.li.toFixed(2)+', caption side '+b.lt.toFixed(2)+'; ln 4 = 1.386 at chance':'')}
  const shown=k===0?0:k===1?Math.floor(e*(words(OBS[0].cap).length+1)+.001):toks;
  return stat('Word choices',shown+'',k>=2?'over the 4 captions, '+TG.VOCAB.length+' options each':'')+stat('Most it can ask',k>=2?(toks*Math.log2(TG.VOCAB.length)).toFixed(0)+' bits':'',k>=2?toks+' × log₂ '+TG.VOCAB.length:'')+
    stat('The trained toy captioner still pays',k>=3&&lmLoss!=null?(lmLoss/Math.LN2*toks/4).toFixed(1)+' bits':'',k>=3&&lmLoss!=null?'per caption ('+(lmLoss/Math.LN2).toFixed(2)+' bits per token at the end of training, from its log)':'')}
const OBM={con:[{t:'Encode the images',c:'The image encoder maps each picture to a 32-number embedding (the paper: 512 to 1,024), L2-normalised. Blue cells are positive numbers, orange negative.'},
  {t:'Encode the captions',c:'The text encoder maps each whole caption to an embedding in the same space. It reads "look at this" and "today so cool" too, but nothing asks it to reproduce them.'},
  {t:'Score every pair',c:'Cosine similarity times the learned scale: 16 logits for 4 pairs; the paper scores 32,768² ≈ 1.07 billion per step. The true pairs sit on the diagonal (green outline).'},
  {t:'Each image picks its caption',c:'A softmax across each row: cross-entropy with the true caption as the target. The model only has to tell these four captions apart.'},
  {t:'Each caption picks its image; average the two',c:'A softmax down each column, the same cross-entropy, and the mean of both: Figure 3\'s symmetric loss. Nothing here depends on how many ways the caption could have been phrased.'}],
 cap:[{t:'Encode the images',c:'The same image encoder, the same images. A captioning model now has to turn each embedding back into words.'},
  {t:'Write caption 1, one word at a time',c:'Each word is a softmax over the whole vocabulary ('+TG.VOCAB.length+' tokens in the toy, 49,152 in the paper), conditioned on the image and the words so far.'},
  {t:'Every word of every caption',c:'The loss sums over every token of every caption, including the end-of-text token.'},
  {t:'Most of the words are not about the picture',c:'"look at this", "today", "so cool": the picture cannot predict them, so the model spends capacity on the caption\'s phrasing. This is the paper\'s diagnosis: predicting "the exact words" is hard "due to the wide variety of descriptions, comments, and related text that co-occur with images" (§2.3).'},
  {t:'What each objective asks for',c:'Contrastive: pick 1 of N, 2 bits per image here. Captioning: every word, whatever it is about. In the paper this cost 3× (against the bag of words) and another 4× (against contrastive) in images processed. In the toy, captioning is about 4× slower than the bag of words, but contrastive is no faster than predicting the bag of words (see the curves above).'}]};
makeAnim({id:'ob',modes:OBM,mode:'con',draw:obDraw,counters:obCnt,dur:2600});
// ---------- toy Figure 2 ----------
function at(curve,thr){for(let i=1;i<curve.length;i++){const [x0,y0]=curve[i-1],[x1,y1]=curve[i];if(y0<thr&&y1>=thr){const t=(thr-y0)/(y1-y0);return 10**(Math.log10(x0)+t*(Math.log10(x1)-Math.log10(x0)))}}return null}
fit($('obToy'),w=>{const names=['lm','bowpred','bowcon','clip'].filter(n=>RUN(n));if(!names.length){$('obToy').innerHTML='<p class="small mute">Training logs not found.</p>';return}
  const se=names.map(n=>({name:RUNNAME[n],c:RUNCOL[n],pts:RUN(n).curve.filter(p=>p[0]>=1e4).map(p=>[p[0],100*p[1]])}));
  let h=lineChart(se,w,{xlog:true,xt:[1e4,1e5,1e6],fmtx:v=>v>=1e6?(v/1e6)+'M':(v/1e3)+'k',ymin:0,ymax:100,xlab:'images processed (log scale)',ylab:'zero-shot accuracy, 36 classes (%)',h:250,tipf:p=>p[1].toFixed(1)+'% at '+fmt(p[0])+' images'});
  const thr=.5,need=Object.fromEntries(names.map(n=>[n,at(RUN(n).curve,thr)]));
  const f=v=>v?fmt(Math.round(v/1e3))+'k':'not reached';
  h+='<p class="small">Images processed to reach 50% zero-shot accuracy on the toy\'s 36 classes: captioning '+f(need.lm)+', bag-of-words prediction '+f(need.bowpred)+', bag-of-words contrastive '+f(need.bowcon)+', CLIP (Transformer text) '+f(need.clip)+'.'+
    (need.lm&&need.bowpred&&need.bowcon?' Ratios: captioning to bag of words '+(need.lm/need.bowpred).toFixed(1)+'×, bag-of-words prediction to contrastive '+(need.bowpred/need.bowcon).toFixed(1)+'× (the paper: 3× and 4×).':'')+
    ' <b>Does not reproduce the 4×:</b> in the toy, predicting the bag of words is about as efficient as matching pairs, and only the captioner is clearly slower. The toy captions mention the colour and shape most of the time, so predicting those words is nearly the same task as matching; web captions are far more varied. Final test accuracy (photos, 5,000 images): '+names.map(n=>RUNNAME[n]+' '+pct(RUN(n).test.photo.photo)).join('; ')+'.</p>';
  $('obToy').innerHTML=h});
// ---------- Figure 3 pseudocode, linked to the batch below ----------
const F3=PAPER.tables.figures.figure3.lines;
$('pseudo').innerHTML=F3.map((l,i)=>'<span class="pl'+(l.startsWith('#')?' cm':'')+'" data-i="'+i+'" tabindex="'+(l&&!l.startsWith('#')?0:-1)+'">'+(l.replace(/&/g,'&amp;').replace(/</g,'&lt;')||' ')+'</span>').join('\n');
// ---------- the batch matrix ----------
let BM={seeds:[],swap:false,scale:CLIP.scale};
function newBatch(){const base=SEED_PAGE+500+Math.floor(Math.random()*1e5)*8;BM.seeds=[...Array(8)].map((_,i)=>base+i);BM.swap=false;drawBM()}
const sv=v=>Math.exp(Math.log(100)*v/100);   // slider 0..100 -> scale 1..100 (log)
function bmData(){const P=BM.seeds.map(s=>pair(s)),caps=P.map(p=>p.cap);if(BM.swap){const t=caps[0];caps[0]=caps[1];caps[1]=t}
  const I=P.map(p=>CLIP.image(p.img,'s'+p.seed)),T=caps.map(c=>CLIP.text(c)),C=I.map(a=>T.map(b=>CLIP.dot(a.e,b.e)));return {P,caps,I,T,C,L:C.map(r=>r.map(v=>v*BM.scale))}}
function drawBM(){const host=$('bmSvg');const w=host.clientWidth;if(!w)return;const d=bmData(),n=8,ts=Math.min(34,(w-60)/(n+1.4)),cs=ts,x0=ts+8,y0=18;let s='';
  const lo=Math.min(...d.L.flat()),hi=Math.max(...d.L.flat());
  for(let j=0;j<n;j++)s+=tx(x0+j*cs+cs/2,12,'T'+(j+1),{a:'middle',fs:11,w:600});
  for(let i=0;i<n;i++){const y=y0+i*cs;s+=svgImg(d.P[i].img,0,y+1,cs-2);const pr=CLIP.softmax(d.L[i]),am=pr.indexOf(Math.max(...pr));
    for(let j=0;j<n;j++){const v=(d.L[i][j]-lo)/((hi-lo)||1);s+='<g>'+heatCell(x0+j*cs+1,y+1,cs-2,cs-2,v,{s:i===j?'var(--good)':(j===am?'var(--bad)':null),sw:2})+'<title>image '+(i+1)+' with T'+(j+1)+': cosine '+d.C[i][j].toFixed(3)+', logit '+d.L[i][j].toFixed(2)+', row softmax '+(pr[j]*100).toFixed(1)+'%</title></g>'}}
  const H=y0+n*cs+6;host.innerHTML=svgW(w,H,s,'similarity matrix of a batch of eight');
  const b=batchLoss(d.L),acc=d.L.filter((r,i)=>r.indexOf(Math.max(...r))===i).length;
  $('bmO').innerHTML='<div class="small">'+d.caps.map((c,j)=>'<b>T'+(j+1)+'</b> '+c).join(' · ')+'</div>'+
    '<p>Loss: image side <b>'+b.li.toFixed(3)+'</b>, caption side <b>'+b.lt.toFixed(3)+'</b>, mean <b>'+b.l.toFixed(3)+'</b> (chance ln 8 = 2.079). Images that pick their own caption: <b>'+acc+' of 8</b>. Green outline: the true pair; orange: the row\'s top choice when it is wrong.'+(BM.swap?' Captions 1 and 2 are swapped, so the true pairs are no longer on the diagonal and the loss jumps.':'')+'</p>';
  BM.d=d}
$('bmS').value=Math.round(100*Math.log(CLIP.scale)/Math.log(100));$('bmSv').textContent=CLIP.scale.toFixed(1);
$('bmS').addEventListener('input',e=>{BM.scale=sv(+e.target.value);$('bmSv').textContent=BM.scale.toFixed(1);drawBM()});
$('bmNew').addEventListener('click',newBatch);$('bmSwap').addEventListener('click',()=>{BM.swap=!BM.swap;$('bmSwap').textContent=BM.swap?'Unswap captions':'Swap captions 1 and 2';drawBM()});
$('bmLearn').textContent='a scale of '+CLIP.scale.toFixed(1)+' (temperature '+(1/CLIP.scale).toFixed(3)+')';
BM.seeds=[...Array(8)].map((_,i)=>SEED_PAGE+40+i);fit($('bmSvg'),drawBM);
// pseudocode lines show their value on this batch
const LINEV={9:d=>'I_f: '+d.I.length+' × '+CLIP.D+' image features (the class token after LayerNorm)',10:d=>'T_f: '+d.T.length+' × '+CLIP.D+' text features (at [EOS])',
  13:d=>'I_e: '+d.I.length+' × '+CLIP.E+', every row has norm '+Math.hypot(...d.I[0].e).toFixed(3),14:d=>'T_e: '+d.T.length+' × '+CLIP.E+', every row has norm '+Math.hypot(...d.T[0].e).toFixed(3),
  17:d=>'logits[0][0..2] = '+d.L[0].slice(0,3).map(v=>v.toFixed(2)).join(', ')+' (cosine times '+BM.scale.toFixed(1)+')',20:d=>'labels = [0, 1, ..., 7]: the i-th image goes with the i-th text',
  21:d=>'loss_i = '+batchLoss(d.L).li.toFixed(3),22:d=>'loss_t = '+batchLoss(d.L).lt.toFixed(3),23:d=>'loss = '+batchLoss(d.L).l.toFixed(3)};
const showLine=el=>{const i=+el.dataset.i;document.querySelectorAll('#pseudo .pl').forEach(x=>x.classList.toggle('on',x===el));const f=LINEV[i];if(f&&BM.d){let o=$('pseudoO');if(!o){o=document.createElement('div');o.id='pseudoO';o.className='out small';$('pseudo').after(o)}o.textContent=f(BM.d)}};
document.querySelectorAll('#pseudo .pl').forEach(el=>{el.addEventListener('mouseenter',()=>showLine(el));el.addEventListener('click',()=>showLine(el));el.addEventListener('focus',()=>showLine(el))});
// ---------- zero-shot animation ----------
const ZP=(()=>{for(let k=60;k<200;k++){const p=pair(SEED_PAGE+k,{style:0,size:1});const W=CLIP.classifier(CLASSES,['a photo of a {}']),e=CLIP.image(p.img,'s'+p.seed).e,sc=W.map(r=>CLIP.dot(r,e));if(sc.indexOf(Math.max(...sc))===labelOf(p.a))return p}return pair(SEED_PAGE+60,{style:0})})();
const za=ZP.a,ZC=[nameOf(za),TG.COLOURS[za.colour]+' '+TG.SHAPES[(za.shape+1)%6],TG.COLOURS[za.colour]+' '+TG.SHAPES[(za.shape+3)%6],TG.COLOURS[(za.colour+1)%6]+' '+TG.SHAPES[za.shape],TG.COLOURS[(za.colour+3)%6]+' '+TG.SHAPES[za.shape],TG.COLOURS[(za.colour+2)%6]+' '+TG.SHAPES[(za.shape+2)%6]];
const ZS2=['small '+TG.SHAPES[za.shape],'big '+TG.SHAPES[za.shape]];
function zsDraw(m,k,e,w){const ts=Math.min(64,w*.16),ie=CLIP.image(ZP.img,'s'+ZP.seed);let s=svgImg(ZP.img,0,4,ts);const sw=Math.min(150,w*.3),x1=ts+10;
  s+=G(k===0?e:1,strip(m==='zs'?ie.e:ie.f,x1,4+ts/2-7,sw,14))+tx(x1,4+ts/2+20,m==='zs'?'image embedding':'image features',{fs:11,c:'var(--mute)'});
  let y=ts+30;const rx=0,rw=Math.min(w-4,sw+ts+160);
  if(m==='zs'){const cls=k>=4?ZS2:ZC,pr=cls.map(c=>'a photo of a '+c),W=CLIP.classifier(cls,['a photo of a {}']),lg=W.map(r=>CLIP.scale*CLIP.dot(r,ie.e)),p=CLIP.softmax(lg);
    const nar=w<560,rh=nar?36:20,stx=nar?0:Math.min(w-sw-60,200),sty=nar?16:2,ssw=nar?Math.min(150,w*.45):sw,bx=stx+ssw+8,bw=Math.max(30,w-bx-40);
    if(k>=1){const op=k===1||k===4?e:1;pr.forEach((t,i)=>{const yy=y+i*rh;s+=G(op,tx(rx,yy+12,'"'+t+'"',{fs:11.5}));if(k>=2&&!(k===4&&e<.5))s+=G(k===2?e:1,strip(W[i],stx,yy+sty,ssw,13))});
      s+=tx(nar?0:stx,y-6,nar?'below each: its classifier row':'classifier rows, written by the text encoder',{fs:11,c:'var(--mute)'})}
    if(k>=3&&!(k===4&&e<.6)){pr.forEach((t,i)=>{const yy=y+i*rh,best=p.indexOf(Math.max(...p))===i;s+=rc(bx,yy+sty,bw,13,'var(--soft)',{s:'var(--line)'})+rc(bx,yy+sty,Math.max(1,bw*p[i]),13,best?'var(--c1)':'var(--dim)')+tx(bx+bw+4,yy+sty+11,(p[i]*100).toFixed(0)+'%',{fs:11})})}
    return svgW(w,y+pr.length*rh+8,s,'zero-shot classifier')}
  // supervised head: 36 fixed rows, no names
  const rows=k>=3?0:36,ch=6,cw=Math.min(sw,w-40)/32;
  if(k>=1&&k<3){for(let i=0;i<rows;i++){const yy=y+i*(ch+1);for(let j=0;j<32;j++){const v=Math.sin(i*7.3+j*1.7)*.5+.5;s+=rc(rx+j*cw,yy,cw,ch,'var(--mute)',{r:0,op:(k===1?e:1)*(.15+.5*v)})}
}
    const lx=rx+32*cw+8,lw=w-lx-2;s+=wrapTx(lx,y+12,'36 rows × 32 weights',lw,{fs:11}).s;s+=wrapTx(lx,y+28,'learned from labelled photos, one row per fixed class',lw,{fs:11,c:'var(--mute)'}).s;
    if(k===2)s+=wrapTx(lx,y+90,'the answer is a row index; its name comes from a label file',lw,{fs:11}).s;
    return svgW(w,y+36*(ch+1)+6,s,'supervised head')}
  const q1=wrapTx(0,y+32,'The head can only answer the 36 questions it was trained on.',w-4,{fs:11.5}),q2=wrapTx(0,y+36+q1.h,'To add one: collect labelled examples of each size, then retrain the head.',w-4,{fs:11.5});
  s+=G(k===3?e:1,tx(0,y+14,'"small or big?" There is no row for it.',{fs:12,w:600})+q1.s+(k>=4?q2.s:''));
  return svgW(w,y+40+q1.h+q2.h,s,'supervised head cannot answer')}
function zsCnt(m,k){if(m==='zs')return stat('Classes it can answer','any sentence','limited only by the vocabulary')+stat('Cost to add a class',k>=4?'one text-encoder pass':'','cached once per dataset (§3.1.2)')+stat('Labelled examples used',k>=3?'0':'','');
  return stat('Classes it can answer','36, fixed','the paper\'s baselines: 1,000 or 18,291')+stat('Cost to add a class',k>=3?'new labels + retraining':'','')+stat('Labelled examples used',k>=1?fmt(120000):'','the toy supervised run')}
const ZSM={zs:[{t:'Embed the image',c:'The image encoder and projection give one unit vector.'},{t:'Write each class as a sentence',c:'"a photo of a {class}": the class names become text that looks like a caption.'},{t:'The text encoder writes the classifier',c:'Each sentence\'s embedding becomes one row of a linear classifier: the text encoder is a hypernetwork that generates the weights (§3.1.2).'},
  {t:'Cosine × scale, then softmax',c:'Exactly the training-time score, over the classes instead of a batch. The true class is the first row.'},{t:'Ask a new question by writing it',c:'"small" or "big"? Write two new sentences; the classifier exists as soon as the text encoder has run. No labelled example, no retraining.'}],
 sup:[{t:'Extract features',c:'A supervised model also turns the image into a feature vector (drawn here from the toy CLIP\'s encoder, for illustration).'},{t:'A head learned from labels',c:'A fixed matrix with one row per class, learned from labelled examples. The rows carry no meaning outside the training labels.'},
  {t:'Score and softmax over the fixed classes',c:'The answer is an index into the label list; renaming or adding a class is not possible without new data.'},{t:'Ask a new question',c:'"small or big?" has no row. This is the static softmax the paper wants to replace (§1).'},{t:'Retrain',c:'New labels, a new head, another training run, for every new set of classes.'}]};
makeAnim({id:'zs',modes:ZSM,mode:'zs',draw:zsDraw,counters:zsCnt,dur:2600});
// ---------- prompt engineering in the toy ----------
(function(){const r=RUN('clip'),q=RN.report&&RN.report.quantised;if(!r){$('prToy').textContent='Training log not found.';return}
  const M=[['bare','the bare label: "red circle"'],['photo','"a photo of a red circle"'],['drawing','"a drawing of a red circle"'],['ensemble','the mean of 6 templates']];
  let h='<div class="tw"><table><thead><tr><th>Prompt</th><th class="num">Photos</th><th class="num">Drawings</th></tr></thead><tbody>'+M.map(([k,n])=>'<tr><td>'+n+'</td><td class="num">'+pct(r.test[k].photo)+'</td><td class="num">'+pct(r.test[k].drawing)+'</td></tr>').join('')+'</tbody></table></div>';
  h+='<p class="small">Zero-shot accuracy of the toy CLIP on 5,000 test photos and the same 5,000 scenes drawn as outlines, 36 classes, float weights (the shipped 6-bit weights: within 1.5 points, in %RUN%). The bare label is as good as any template here and the ensemble adds nothing: the toy\'s captions use the bare label rarely, but its text encoder generalises across the few phrasings the toy has. The task-specific prompt helps a little, as in the paper: "a drawing of" gains '+((r.test.drawing.drawing-r.test.photo.drawing)*100).toFixed(1)+' points on drawings and loses '+((r.test.photo.photo-r.test.drawing.photo)*100).toFixed(1)+' on photos. Real class names are polysemous and real captions far more varied, which is where the paper\'s 5 points come from.</p>';
  $('prToy').innerHTML=h.replace('%RUN%','<a href="#" data-tab="t-run" data-to="rnHonest">Run a tiny CLIP</a>')})();
// ---------- Figure 5, recomputed ----------
onTab('t-read',()=>{});
fit($('f5Svg'),w=>{const R=PAPER.rc.fig5.rows.slice().sort((a,b)=>b.delta-a.delta);
  $('f5Svg').innerHTML=hbars(R.map(r=>({n:r.d+(r.match?'':' *'),v:r.delta,c:r.delta>0?'var(--c3)':'var(--c2)',t:r.d+': zero-shot '+r.zs+' minus ResNet-50 linear probe '+r.rn50+' = '+r.delta+' (Figure 5 prints '+r.printed+')'})),w,{min:-50,max:35,fmt:v=>(v>0?'+':'')+v.toFixed(1),lw:Math.min(110,w*.3),h:13,label:'Figure 5 recomputed'});
  const mm=PAPER.rc.fig5.rows.filter(r=>!r.match);
  $('f5Note').innerHTML='Recomputed from %T11% minus %T10%: '+PAPER.rc.fig5.wins+' wins of 27, as printed; '+PAPER.rc.fig5.matches+' of 27 bars match Figure 5\'s labels to 0.05. Marked *: '+mm.map(r=>r.d+' '+r.delta+' (printed '+r.printed+')').join(', ')+'. Differences of 0.1 are rounding; KITTI and UCF101 are not, and the paper\'s text quotes the figure\'s +7.7 for UCF101.';
  $('f5Note').innerHTML=$('f5Note').innerHTML.replace('%T11%','<a href="'+PAPER.meta.ax+'#A1.F22" target="_blank" rel="noopener noreferrer">Table 11</a>').replace('%T10%','<a href="'+PAPER.meta.ax+'#A1.T10" target="_blank" rel="noopener noreferrer">Table 10</a>')});
// ---------- reveals ----------
PRED_REVEAL['pr-shots']=()=>fit($('f7Svg'),w=>{const E=PAPER.tables.figures.figure7.examples_per_class,K=Object.keys(E).sort((a,b)=>E[b]-E[a]);
  $('f7Svg').innerHTML=hbars(K.map(k=>({n:k,v:Math.log10(Math.max(E[k],.5)),c:k==='ImageNet'?'var(--c1)':'var(--dim)',b:k==='ImageNet',t:k+': '+E[k]+' labelled examples per class to match zero-shot'})),w,{min:Math.log10(.5),max:Math.log10(200),fmt:v=>{const x=10**v;return x<1?x.toFixed(1):x<10?x.toFixed(1):Math.round(x)+''},lw:Math.min(110,w*.32),h:12,label:'Figure 7 labels, log scale'})+'<p class="small mute">Figure 7\'s printed labels on a log scale (the figure uses a linear one).</p>'});
PRED_REVEAL['pr-rob']=()=>fit($('f13Svg'),w=>{const R=PAPER.rc.fig13.rows;let s='';const lw=Math.min(120,w*.3),pw=w-lw-50,bh=11;
  R.forEach((r,i)=>{const y=i*32+4;s+=tx(lw-6,y+bh+4,r[0],{a:'end',fs:11.5});s+=rc(lw,y,pw*r[1]/100,bh,'var(--c2)',{r:2})+tx(lw+pw*r[1]/100+4,y+bh-1,r[1]+'',{fs:11});s+=rc(lw,y+bh+2,pw*r[2]/100,bh,'var(--c1)',{r:2})+tx(lw+pw*r[2]/100+4,y+2*bh+1,r[2]+'',{fs:11})});
  const lg=legend([['ImageNet ResNet-101','var(--c2)'],['Zero-shot CLIP','var(--c1)']],lw,12,pw);
  $('f13Svg').innerHTML=svgW(w,R.length*32+lg.h+4,lg.s+'<g transform="translate(0,'+lg.h+')">'+s+'</g>','Figure 13 right, redrawn')+'<p class="small mute">Figure 13\'s printed table (accuracy, %); the deltas recompute exactly. Mean over the five shifted sets: ResNet-101 '+PAPER.rc.fig13.rn101_avg5+'%, CLIP '+PAPER.rc.fig13.clip_avg5+'%.</p>'});
// ---------- Table 2: humans ----------
fit($('t2Svg'),w=>{const R=PAPER.tables.t2.rows;$('t2Svg').innerHTML=hbars(R.map(r=>({n:r[0],v:r[1],c:r[0].includes('CLIP')?'var(--c1)':'var(--c5)',t:r[0]+': '+r[1]+'% accuracy; '+r[3]+'% on guesses'})),w,{min:0,max:100,fmt:v=>v.toFixed(1)+'%',lw:Math.min(130,w*.34),label:'Table 2'})+'<p class="small mute">Average per-class accuracy on the full dataset (Table 2\'s first column); hover for accuracy on the images where people did not answer "I don\'t know".</p>'});
// ---------- robustness in the toy ----------
(function(){const c=RUN('clip'),cp=RUN('clipphoto'),su=RUN('sup'),pb=RN.probe&&RN.probe.k;
  if(!c||!cp||!su){$('robToy').innerHTML='<p class="small">The remaining toy runs are not in the logs yet.</p>';return}
  const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
  const rows=[['Supervised: 36 labels, photos only',su.test.label.photo,su.test.label.drawing],['Linear probe on CLIP features, fitted on all photo labels',pb?mean(pb.full.photo):null,pb?mean(pb.full.drawing):null],
    ['Zero-shot CLIP, web with drawings',c.test.photo.photo,c.test.photo.drawing],['Zero-shot CLIP, web of photos only',cp.test.photo.photo,cp.test.photo.drawing]];
  let h='<div class="tw"><table><thead><tr><th>Toy model</th><th class="num">Photos</th><th class="num">Drawings</th><th class="num">Drop</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+r[0]+'</td><td class="num">'+(r[1]==null?'':pct(r[1]))+'</td><td class="num">'+(r[2]==null?'':pct(r[2]))+'</td><td class="num">'+(r[1]==null?'':((r[1]-r[2])*100).toFixed(1)+' pts')+'</td></tr>').join('')+'</tbody></table></div>';
  h+='<p class="small">The same 5,000 test scenes as photos (the "ImageNet" distribution) and as drawings (the shift). Default prompt "a photo of a {class}". The supervised model and the linear probe see only photo labels. '+
   'Zero-shot CLIP trained on the web with drawings loses '+((c.test.photo.photo-c.test.photo.drawing)*100).toFixed(1)+' points on drawings; trained on photos only, the same recipe loses '+((cp.test.photo.photo-cp.test.photo.drawing)*100).toFixed(1)+'; the supervised model loses '+((su.test.label.photo-su.test.label.drawing)*100).toFixed(1)+'. '+
   'So in the toy, being zero-shot or learning from captions does not by itself give robustness: having drawings in the training data does. That is Fang et al.\'s finding at real scale, and an answer to the question §3.3 leaves open. '+(pb?'Adapting the web CLIP to photo labels with a linear probe moves photos from '+pct(RN.report.quantised.photo.photo)+' to '+pct(mean(pb.full.photo))+' and costs '+((RN.report.quantised.photo.drawing-mean(pb.full.drawing))*100).toFixed(1)+' points on drawings: the toy version of Figure 14. ':'')+'One seed per run.</p>';
  $('robToy').innerHTML=h})();
})();
