// ---- The paper tab: the toy Figure 2, the batch matrix and pseudocode, and the inline charts (the objective and zero-shot figures are 3D stages: 32_js_sc_obj.js, 33_js_sc_zs.js) ----
(function(){
const lse=v=>{const m=Math.max(...v);return m+Math.log(v.reduce((s,x)=>s+Math.exp(x-m),0))};
function batchLoss(L){const n=L.length;let li=0,lt=0;for(let i=0;i<n;i++){li+=lse(L[i])-L[i][i];const col=L.map(r=>r[i]);lt+=lse(col)-L[i][i]}return {li:li/n,lt:lt/n,l:(li+lt)/(2*n)}}
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
fit($('f7Svg'),w=>{const E=PAPER.tables.figures.figure7.examples_per_class,K=Object.keys(E).sort((a,b)=>E[b]-E[a]);
  $('f7Svg').innerHTML=hbars(K.map(k=>({n:k,v:Math.log10(Math.max(E[k],.5)),c:k==='ImageNet'?'var(--c1)':'var(--dim)',b:k==='ImageNet',t:k+': '+E[k]+' labelled examples per class to match zero-shot'})),w,{min:Math.log10(.5),max:Math.log10(200),fmt:v=>{const x=10**v;return x<1?x.toFixed(1):x<10?x.toFixed(1):Math.round(x)+''},lw:Math.min(110,w*.32),h:12,label:'Figure 7 labels, log scale'})+'<p class="small mute">Figure 7\'s printed labels on a log scale (the figure uses a linear one).</p>'});
fit($('f13Svg'),w=>{const R=PAPER.rc.fig13.rows;let s='';const lw=Math.min(120,w*.3),pw=w-lw-50,bh=11;
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
