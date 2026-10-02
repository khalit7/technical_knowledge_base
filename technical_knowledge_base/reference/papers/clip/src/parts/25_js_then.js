// ---- Then and now: the recipe step-through, and softmax against sigmoid on one toy batch ----
(function(){
const ax='https://arxiv.org/abs/';
// each step: the recipe card after the change, which field changed, the reported zero-shot ImageNet top-1, and its source
const ST=[
 {y:2021.15,who:'CLIP',f:{data:'WIT, 400M pairs (never released)',img:'ViT-L/14 @ 336 px',txt:'Transformer, 12 layers',loss:'softmax over the batch, both ways',batch:'32,768'},ch:[],zs:76.2,src:['CLIP Table 1',PAPER.meta.ax+'#S3.T1'],
  t:'CLIP (February 2021)',c:'The starting point: contrastive pre-training from scratch on 400 million web pairs; 76.2% zero-shot on ImageNet.'},
 {y:2021.1,who:'ALIGN',f:{data:'1.8B noisy alt-text pairs, minimal filtering',img:'EfficientNet-L2',txt:'BERT-Large'},ch:['data','img','txt'],zs:76.4,src:['ALIGN',ax+'2102.05918'],
  t:'ALIGN: more, noisier data (Google, February 2021)',c:'Almost the same loss, with over a billion alt-text pairs and little cleaning: "the scale of our corpus can make up for its noise". 76.4% zero-shot.'},
 {y:2021.9,who:'LiT',f:{img:'ViT-g/14, pre-trained on labels, frozen',txt:'trained to read the frozen tower'},ch:['img','txt'],zs:85.2,src:['LiT',ax+'2111.07991'],
  t:'LiT: lock the image tower (November 2021)',c:'Start from a strong pre-trained image model, freeze it, and train only the text side contrastively. 85.2% zero-shot on ImageNet with a ViT-g/14, a reminder that these numbers also depend on how the image tower was pre-trained.'},
 {y:2022.3,who:'CoCa',f:{loss:'contrastive + captioning',img:'image encoder + text decoder'},ch:['loss','img'],zs:86.3,src:['CoCa',ax+'2205.01917'],
  t:'CoCa: add the captioning loss back (May 2022)',c:'A contrastive loss between the unimodal embeddings plus a captioning loss on a decoder that cross-attends to the image: the joint training §6 suggested. 86.3% zero-shot.'},
 {y:2022.9,who:'OpenCLIP',f:{data:'LAION-2B, public, CLIP-filtered',img:'ViT-H/14 (ViT-bigG/14: 80.1%)',txt:'Transformer',loss:'softmax over the batch, both ways'},ch:['data','img'],zs:78.0,src:['OpenCLIP README','https://github.com/mlfoundations/open_clip'],
  t:'OpenCLIP on LAION: the recipe in the open (2022)',c:'Open code and open data; reproducible scaling laws found that "the training distribution plays a key role", with OpenAI and OpenCLIP models scaling differently on the same architecture. ViT-H/14: 78.0%.'},
 {y:2023.25,who:'SigLIP',f:{loss:'sigmoid per pair (t = 10, b = −10 at start)',batch:'32k is enough; up to 1M tried',img:'locked pre-trained tower (SigLiT)'},ch:['loss','batch','img'],zs:84.5,src:['SigLIP',ax+'2303.15343'],
  t:'SigLIP: a sigmoid instead of a softmax (Google, March 2023)',c:'Each pair is its own binary decision, so the loss no longer needs the whole batch. With a locked image tower, 84.5% zero-shot "in two days" on four TPUv4 chips. The demo below runs both losses on one toy batch.'},
 {y:2023.33,who:'DataComp',f:{data:'DataComp-1B, filtered from 12.8B',img:'ViT-L/14',txt:'Transformer',loss:'softmax over the batch, both ways',batch:'as CLIP'},ch:['data'],zs:79.2,src:['DataComp',ax+'2304.14108'],
  t:'DataComp: change only the data (April 2023)',c:'Fix CLIP\'s training code and compute and compete on filtering: DataComp-1B trains a ViT-L/14 to 79.2%, "outperforming OpenAI\'s CLIP ViT-L/14 by 3.7 percentage points while using the same training procedure and compute".'},
 {y:2023.75,who:'MetaCLIP',f:{data:'WIT-style metadata balancing on CommonCrawl',img:'ViT-H/14'},ch:['data','img'],zs:80.5,src:['MetaCLIP',ax+'2309.16671'],
  t:'MetaCLIP: rebuild WIT\'s curation (Meta, September 2023)',c:'Reconstructs §2.2\'s query-and-balance curation from CLIP\'s concepts. At ViT-B it beats WIT, 70.8% against 68.3%; ViT-H reaches 80.5%. Its authors\' view: "the main ingredient to the success of CLIP is its data".'},
 {y:2023.75,who:'DFN',f:{data:'DFN-5B, filtered by a learned filtering network',img:'ViT-H/14 @ 378 px'},ch:['data','img'],zs:84.4,src:['DFN',ax+'2309.17425'],
  t:'Data filtering networks (September 2023)',c:'A small CLIP trained on high-quality data filters the web for a big one: a ViT-H reaches 84.4% zero-shot, ahead of models trained on LAION-2B, DataComp-1B or WIT. CLIP-style models now curate their successors\' data.'},
 {y:2025.15,who:'SigLIP 2',f:{loss:'sigmoid + captioning + self-distillation + masked prediction',data:'multilingual, with de-biasing',img:'ViT-B to g (86M to 1B), native aspect ratio'},ch:['loss','data','img'],zs:null,src:['SigLIP 2',ax+'2502.14786'],
  t:'SigLIP 2: everything at once (February 2025)',c:'The sigmoid loss plus captioning, self-supervised losses and online data curation, multilingual, at four sizes, with better transfer "when extracting visual representations for Vision-Language Models". Its abstract reports gains over SigLIP at every size rather than one headline number, so none is plotted.'}];
const FIELDS=[['data','Data'],['img','Image side'],['txt','Text side'],['loss','Loss'],['batch','Batch']];
function card(k){const f={};for(let i=0;i<=k;i++)Object.assign(f,ST[i].f);return f}
function tnDraw(m,k,e,w){const f=card(k),ch=ST[k].ch;let s='';const lw=Math.min(96,w*.24),vw=w-lw-6;let y=4;
  FIELDS.forEach(([key,name])=>{const hi=ch.includes(key);s+=rc(0,y,w,26,hi?'var(--hl)':'var(--soft)',{op:hi?.35+.65*e:1})+tx(8,y+17,name,{fs:11.5,w:600})+tx(lw,y+17,(f[key]||'').slice(0,Math.max(10,Math.floor(vw/6.4))),{fs:11.5});y+=30});
  // zero-shot ImageNet so far, by date
  const P=ST.slice(0,k+1).filter(x=>x.zs!=null),H=150,L=40,R=12,T=y+18,X=v=>L+(v-2021)/(2025.4-2021)*(w-L-R),Y=v=>T+(1-(v-70)/20)*(H-28);
  [70,75,80,85,90].forEach(v=>{s+=ln2(L,Y(v),w-R,Y(v),'var(--line)')+tx(L-5,Y(v)+4,v+'%',{a:'end',fs:11,c:'var(--mute)'})});
  [2021,2022,2023,2024,2025].forEach(v=>{s+=tx(X(v),T+H-10,v,{a:'middle',fs:11,c:'var(--mute)'})});
  s+=tx(4,y+10,w<560?'zero-shot ImageNet top-1, as reported':'zero-shot ImageNet top-1, as each paper reports it (not like for like)',{fs:11,c:'var(--mute)'});
  const pts=P.map(p=>({x:X(p.y),y:Y(p.zs),t:p.who+' '+p.zs,fs:11}));placeLabels(pts,w,T+H);
  pts.forEach((p,i)=>{const last=P[i]===ST[k];s+=G(last?e:1,'<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(last?5:4)+'" fill="'+(last?'var(--c2)':'var(--c1)')+'"/>'+tx(p.lx,p.ly,p.t,{a:p.la,fs:11}))});
  return svgW(w,T+H,s,'recipe and zero-shot ImageNet over time')}
function tnCnt(m,k){const S=ST[k];return stat('Changed',S.ch.length?S.ch.map(c=>FIELDS.find(f=>f[0]===c)[1].toLowerCase()).join(', '):'the starting recipe','')+stat('Zero-shot ImageNet',S.zs!=null?S.zs+'%':'not reported as one number','')+stat('Source','<a href="'+S.src[1]+'" target="_blank" rel="noopener noreferrer">'+S.src[0]+'</a>','')}
makeAnim({id:'tn',modes:{x:ST.map(s=>({t:s.t,c:s.c}))},mode:'x',draw:tnDraw,counters:tnCnt,dur:3200});
// ---------- softmax against sigmoid ----------
const SP=[...Array(8)].map((_,i)=>pair(SEED_PAGE+40+i)),n=8;
const COS=SP.map(a=>SP.map(b=>CLIP.dot(CLIP.image(a.img,'s'+a.seed).e,CLIP.text(b.cap).e)));
const lsig=z=>z>=0?-Math.log1p(Math.exp(-z)):z-Math.log1p(Math.exp(z));
function sgVals(m){if(m==='soft'){const L=COS.map(r=>r.map(v=>v*CLIP.scale)),Pr=L.map(r=>CLIP.softmax(r)),Pc=L.map((r,i)=>CLIP.softmax(L.map(q=>q[i])));
    const lse=v=>{const mx=Math.max(...v);return mx+Math.log(v.reduce((s,x)=>s+Math.exp(x-mx),0))};let li=0,lt=0;for(let i=0;i<n;i++){li+=lse(L[i])-L[i][i];lt+=lse(L.map(r=>r[i]))-L[i][i]}
    return {L,P:Pr,Pc,loss:(li+lt)/(2*n)}}
  const L=COS.map(r=>r.map(v=>10*v-10)),P=L.map(r=>r.map(z=>1/(1+Math.exp(-z))));let l=0;for(let i=0;i<n;i++)for(let j=0;j<n;j++)l-=lsig((i===j?1:-1)*L[i][j]);return {L,P,loss:l/n}}
function sgDraw(m,k,e,w){const v=sgVals(m),cs=Math.min(34,(w-50)/n),x0=cs+8;let s='';
  for(let j=0;j<n;j++)s+=tx(x0+j*cs+cs/2,12,'T'+(j+1),{a:'middle',fs:11,w:600});
  for(let i=0;i<n;i++){s+=svgImg(SP[i].img,0,18+i*cs+1,cs-2);for(let j=0;j<n;j++){const x=x0+j*cs,y=18+i*cs;let val,lab;
    if(k===0){const lo=Math.min(...v.L.flat()),hi=Math.max(...v.L.flat());val=(v.L[i][j]-lo)/(hi-lo);lab=v.L[i][j].toFixed(0)}
    else if(m==='soft'){val=k===1?v.P[i][j]:v.Pc[j][i];lab=Math.round(100*val)}else{val=v.P[i][j];lab=Math.round(100*val)}
    const focus=k===1&&m==='soft'&&i===Math.min(n-1,Math.floor(e*n));
    s+=heatCell(x+1,y+1,cs-2,cs-2,val,{s:i===j?'var(--good)':focus?'var(--c2)':null,sw:2})+tx(x+cs/2,y+cs/2+4,lab,{a:'middle',fs:11,c:val>.55?'#fff':'var(--ink)'})}}
  const H=18+n*cs+20;s+=tx(0,H-4,k===0?'cells: logits':m==='soft'?(k===1?'cells: % of each row (rows sum to 100)':'cells: % of each column (columns sum to 100)'):'cells: σ(logit), % chance this pair is a match',{fs:11,c:'var(--mute)'});
  return svgW(w,H,s,m==='soft'?'softmax loss on a batch':'sigmoid loss on a batch')}
function sgCnt(m,k){const v=sgVals(m);return stat('Each cell\'s loss needs',m==='soft'?'its whole row and column':'only itself','')+stat('Loss',k>=2?v.loss.toFixed(3):'',m==='soft'?'chance: ln 8 = 2.079':'sum over 64 cells, divided by 8')+stat('Logits',m==='soft'?'scale '+CLIP.scale.toFixed(1)+' × cos':'10 × cos − 10','')}
const SGM={soft:[{t:'Logits: the learned scale times cosine',c:'The toy CLIP\'s own similarity matrix for eight pairs; the true pairs are on the diagonal.'},{t:'Softmax across each row',c:'Each image\'s scores are normalised against the other seven captions: one cell\'s probability depends on the whole row. At scale, the row is 32,768 long and spread over many devices.'},{t:'Softmax down each column, then average',c:'The same for each caption over the images; the loss is the mean of both cross-entropies, Figure 3\'s symmetric loss.'}],
  sig:[{t:'Logits: t · cos + b',c:'The same cosines with SigLIP\'s starting values t = 10 and b = −10: every pair begins as a probable "no".'},{t:'A sigmoid on each cell, independently',c:'Each cell is a binary question, "are these two a pair?", answered without looking at the rest of the batch.'},{t:'Sum the 64 binary losses',c:'Label +1 on the diagonal, −1 elsewhere; −Σ log σ(label · logit) / n. No normalisation across the batch, so no all-gather of the whole matrix is needed.'}]};
makeAnim({id:'sg',modes:SGM,mode:'sig',draw:sgDraw,counters:sgCnt,dur:2600});
})();
