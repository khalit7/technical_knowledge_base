// ---- Run a tiny CLIP: classify with words, test on fresh images, search, few-shot, curves, honesty ----
(function(){
const RS={a:null,img:null,set:'all',tpl:'photo',shuf:false,seed:SEED_PAGE+3000};
$('rnParams').textContent=fmt(RN.report&&RN.report.params||0);$('rnScale').textContent=CLIP.scale.toFixed(1);$('rnVocab').textContent=TG.VOCAB.length-4;
$('rnVocabL').textContent=TG.VOCAB.slice(4).join(' ');
const fillSel=(id,arr)=>{$(id).innerHTML=arr.map((v,i)=>'<option value="'+i+'">'+v+'</option>').join('')};fillSel('rnShape',TG.SHAPES);fillSel('rnColour',TG.COLOURS);
function setImage(p){RS.a=p.a;RS.img=p.img;RS.seed=p.seed;['Shape','Colour','Size','Pos','Style'].forEach(k=>{$('rn'+k).value=p.a[k.toLowerCase()]});draw()}
function compose(){const o={shape:+$('rnShape').value,colour:+$('rnColour').value,size:+$('rnSize').value,pos:+$('rnPos').value,style:+$('rnStyle').value};setImage(pair(RS.seed,o))}
['rnShape','rnColour','rnSize','rnPos','rnStyle'].forEach(id=>$(id).addEventListener('change',compose));
let ctr=0;const fresh=style=>{ctr++;setImage(pair(SEED_PAGE+3000+ctr*7919+(style?1:0),{style}))};
$('rnNewP').addEventListener('click',()=>fresh(0));$('rnNewD').addEventListener('click',()=>fresh(1));
const TPL={bare:['{}'],photo:['a photo of a {}'],drawing:['a drawing of a {}'],ens:CLIP.templates};
function classes(){const a=RS.a;switch(RS.set){case 'all':return {c:CLASSES,t:labelOf(a)};case 'shape':return {c:TG.SHAPES.slice(),t:a.shape};case 'colour':return {c:TG.COLOURS.map(c=>c+' thing'),t:a.colour};
  case 'size':return {c:['small '+TG.SHAPES[a.shape],'big '+TG.SHAPES[a.shape]],t:a.size};case 'pos':{const n=TG.SHAPES[a.shape];return {c:[n+' on the left',n+' in the middle',n+' on the right'],t:a.pos}}
  case 'style':return {c:['photo','drawing'],t:a.style,tpl:['{}','a {}','my {}']};default:return {c:$('rnOwn').value.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean).slice(0,12),t:-1}}}
const shuffle=(s,seed)=>{const w=s.split(' '),r=TG.rng(seed);for(let i=w.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[w[i],w[j]]=[w[j],w[i]]}return w.join(' ')};
const unk=s=>s.split(/\s+/).filter(w=>w&&TG.VOCAB.indexOf(w)<0);
function scoreAll(img,key,cls,tpls,shuf){const e=CLIP.image(img,key).e;
  const W=cls.map((c,ci)=>{const v=new Float32Array(CLIP.E);tpls.forEach((t,ti)=>{let s=t.replace('{}',c);if(shuf)s=shuffle(s,ci*31+ti+7);const te=CLIP.text(s).e;for(let i=0;i<v.length;i++)v[i]+=te[i]});const n=Math.hypot(...v)||1;return Array.from(v,x=>x/n)});
  const lg=W.map(r=>CLIP.scale*CLIP.dot(r,e));return {lg,p:CLIP.softmax(lg)}}
function draw(){if(!RS.a)return;const host=$('rnImg');const w=Math.min(220,host.clientWidth||220);host.innerHTML=imgTag(RS.img,Math.round(w*.8),'toy image');
  const a=RS.a;$('rnTruth').innerHTML='Truth: a '+TG.SIZES[a.size]+' '+TG.COLOURS[a.colour]+' '+TG.SHAPES[a.shape]+', '+(a.pos===1?'in the middle':'on the '+TG.POS[a.pos])+', as a '+TG.STYLES[a.style]+'. A caption the toy web might give it: "'+TG.caption(a,RS.seed)+'".';
  $('rnOwnL').hidden=RS.set!=='own';const C=classes();const tpls=C.tpl&&RS.tpl!=='bare'?C.tpl:TPL[RS.tpl];
  if(!C.c.length){$('rnOut').innerHTML='<p class="small">Type at least one class.</p>';return}
  const r=scoreAll(RS.img,'s'+RS.seed+'_'+a.style+a.shape+a.colour+a.size+a.pos,C.c,tpls,RS.shuf),ord=r.p.map((v,i)=>i).sort((x,y)=>r.p[y]-r.p[x]).slice(0,8),best=ord[0];
  const ow=$('rnOut').clientWidth||300;
  const items=ord.map(i=>({n:C.c[i]+(i===C.t?' ✓':''),v:100*r.p[i],c:i===best?(C.t<0||i===C.t?'var(--c1)':'var(--c2)'):'var(--dim)',b:i===C.t,t:'"'+tpls[0].replace('{}',C.c[i])+'": logit '+r.lg[i].toFixed(2)}));
  let h=hbars(items,ow,{min:0,max:100,fmt:v=>v.toFixed(1)+'%',lw:Math.min(150,ow*.42),label:'class probabilities'});
  const bad=C.c.flatMap(unk);if(bad.length)h+='<p class="small" style="color:var(--bad)">Not in the vocabulary (read as an unknown token): '+[...new Set(bad)].join(', ')+'</p>';
  h+='<p class="small">'+(C.t<0?'Top answer: <b>'+C.c[best]+'</b>.':(best===C.t?'<span class="ok">Right</span>':'<span class="no">Wrong</span>')+': top answer <b>'+C.c[best]+'</b>, truth <b>'+C.c[C.t]+'</b>.')+(RS.set==='style'?' Templates for this question: "{}", "a {}", "my {}".':'')+(RS.shuf?' Words shuffled: the Transformer text encoder sees a different order but the same bag of words.':'')+'</p>';
  $('rnOut').innerHTML=h}
segBind('rnSet',m=>{RS.set=m;draw()});segBind('rnTpl',m=>{RS.tpl=m;draw()});$('rnShuf').addEventListener('change',e=>{RS.shuf=e.target.checked;draw()});$('rnOwn').addEventListener('input',draw);
onTab('t-run',()=>{if(!RS.a)setImage(pair(SEED_PAGE+3000,{style:0}));else draw()});
// ---------- fresh-image test ----------
$('rnTest').addEventListener('click',()=>{const n=+$('rnTestN').value,btn=$('rnTest'),out=$('rnTestO');btn.disabled=true;delete out.dataset.done;
  const modes=[['bare','bare label',['{}']],['photo','"a photo of a {}"',['a photo of a {}']],['drawing','"a drawing of a {}"',['a drawing of a {}']],['ens','ensemble of 6',CLIP.templates]];
  const W=modes.map(m=>CLIP.classifier(CLASSES,m[2])),hit=modes.map(()=>[0,0]);let i=0;const base=SEED_PAGE+2e6+Math.floor(Math.random()*1e6)*1000;
  function chunk(){const t0=performance.now();while(i<n&&performance.now()-t0<30){for(const st of [0,1]){const p=pair(base+i,{style:st}),e=CLIP.image(p.img).e,y=labelOf(p.a);
        W.forEach((Wm,mi)=>{let b=0,bv=-9;Wm.forEach((r,ci)=>{const v=CLIP.dot(r,e);if(v>bv){bv=v;b=ci}});if(b===y)hit[mi][st]++})}i++}
    out.innerHTML='<p class="small">'+i+' of '+n+' scenes…</p>';if(i<n){setTimeout(chunk,0);return}
    const ref=RN.report&&RN.report.quantised,key={bare:'bare',photo:'photo',drawing:'drawing',ens:'ensemble'};
    const se=(p,k)=>Math.sqrt(p*(1-p)/k);
    out.innerHTML='<div class="tw"><table><thead><tr><th>Prompt</th><th class="num">Photos</th><th class="num">Drawings</th><th class="num">Offline test (5,000)</th></tr></thead><tbody>'+modes.map((m,mi)=>{const pp=hit[mi][0]/n,pd=hit[mi][1]/n;
      return '<tr><td>'+m[1]+'</td><td class="num">'+pct(pp)+' ± '+(100*se(pp,n)).toFixed(1)+'</td><td class="num">'+pct(pd)+' ± '+(100*se(pd,n)).toFixed(1)+'</td><td class="num">'+(ref?pct(ref[key[m[0]]].photo)+' / '+pct(ref[key[m[0]]].drawing):'')+'</td></tr>'}).join('')+'</tbody></table></div>'+
      '<p class="small">'+n+' new scenes, each as a photo and as a drawing; 36 classes; ± one binomial standard error. The last column is the shipped 6-bit model on the offline test files (photos / drawings).</p>';
    out.dataset.done='1';btn.disabled=false}
  chunk()});
// ---------- search ----------
let SR=[];const newSR=()=>{const b=SEED_PAGE+9e6+Math.floor(Math.random()*1e5)*64;SR=[...Array(48)].map((_,i)=>pair(b+i))};
function search(){if(!SR.length)newSR();const q=$('rnQ').value.trim().toLowerCase()||'a red circle',te=CLIP.text(q).e;
  const sc=SR.map((p,i)=>({i,v:CLIP.dot(CLIP.image(p.img,'s'+p.seed).e,te)})).sort((a,b)=>b.v-a.v);
  const u=unk(q);$('rnSearchO').innerHTML='<div class="thumbs">'+sc.slice(0,8).map((s,r)=>'<figure>'+imgTag(SR[s.i].img,56,'result '+(r+1))+'<figcaption class="small">'+(r+1)+'. cos '+s.v.toFixed(2)+'</figcaption></figure>').join('')+'</div>'+
    (u.length?'<p class="small" style="color:var(--bad)">Not in the vocabulary: '+u.join(', ')+'</p>':'')+'<p class="small mute">Top 8 of 48 random images from the toy web by cosine similarity to "'+q.replace(/</g,'&lt;')+'".</p>'}
$('rnSearch').addEventListener('click',search);$('rnSearchNew').addEventListener('click',()=>{newSR();search()});$('rnQ').addEventListener('change',search);
onTab('t-run',()=>{if(!SR.length)search()});
// ---------- few-shot probes ----------
onTab('t-run',()=>fit($('rnProbeSvg'),w=>{const P=RN.probe&&RN.probe.k,c=RUN('clip');if(!P||!c){$('rnProbeSvg').innerHTML='<p class="small">Probe results not found.</p>';return}
  const mean=a=>a.reduce((x,y)=>x+y,0)/a.length,ks=[1,2,4,8,16],zsP=RN.report.quantised.photo.photo,zsD=RN.report.quantised.photo.drawing;
  const se=[{name:'linear probe, photos',c:'var(--c2)',pts:ks.map(k=>[k,100*mean(P[k].photo)])},{name:'linear probe, drawings',c:'var(--c2)',da:'4 3',pts:ks.map(k=>[k,100*mean(P[k].drawing)])},
    {name:'zero-shot, photos',c:'var(--c1)',nodots:true,pts:[[1,100*zsP],[16,100*zsP]]},{name:'zero-shot, drawings',c:'var(--c1)',da:'4 3',nodots:true,pts:[[1,100*zsD],[16,100*zsD]]}];
  $('rnProbeSvg').innerHTML=lineChart(se,w,{xlog:true,xt:ks,ymin:0,ymax:100,xlab:'labelled photos per class (log scale)',ylab:'accuracy, 36 classes (%)',h:230});
  const cross=ks.find(k=>mean(P[k].photo)>=zsP);
  $('rnProbeO').innerHTML='A logistic regression on the shipped model\'s image features (before the projection, as the paper\'s probes use I_f), fitted on <i>k</i> labelled photos per class (5 random draws per <i>k</i>, L2 strength chosen on held-out photos; Appendix A.3\'s protocol at toy size), against zero-shot with "a photo of a {}". '+
    (cross?'The probe first matches zero-shot on photos at <b>'+cross+' examples per class</b>':'No probe up to 16 examples per class matches zero-shot on photos')+' (paper, ImageNet: about 16; Figure 7). All photo labels (30,000): '+pct(mean(P.full.photo))+' on photos and '+pct(mean(P.full.drawing))+' on drawings, against zero-shot '+pct(zsP)+' and '+pct(zsD)+'. Fitting to photo labels buys accuracy on photos and costs some on drawings, the trade Figures 14 and 15 show.'}));
// ---------- curves ----------
let CM='acc';segBind('rnCurveM',m=>{CM=m;refit($('rnCurveSvg'))});
onTab('t-run',()=>fit($('rnCurveSvg'),w=>{const names=['clip','bowcon','bowpred','lm','sup','clipphoto'].filter(n=>RUN(n));
  const se=names.map(n=>({name:RUNNAME[n],c:RUNCOL[n],da:n==='clipphoto'?'4 3':null,nodots:CM==='loss',pts:CM==='acc'?RUN(n).curve.map(p=>[p[0],100*p[1]]):RUN(n).loss.filter((p,i)=>i%3===0).map(p=>[p[0],p[1]])}));
  $('rnCurveSvg').innerHTML=lineChart(se,w,CM==='acc'?{xlog:true,xt:[1e4,1e5,1e6],fmtx:v=>v>=1e6?(v/1e6)+'M':(v/1e3)+'k',ymin:0,ymax:100,xlab:'images processed (log scale)',ylab:'validation accuracy (%)',h:260}:{xlog:true,xt:[1e4,1e5,1e6],fmtx:v=>v>=1e6?(v/1e6)+'M':(v/1e3)+'k',ymin:0,xlab:'images processed (log scale)',ylab:'training loss (nats)',h:260});
  $('rnCurveO').innerHTML='From the training logs, every 50 steps (loss, plotted every third point) and at fixed image counts (validation: 2,000 mixed photos and drawings, zero-shot with "a photo of a {}", or the label head for the supervised run). The last validation point is at about 1.0M images; the test results come after the full '+fmt(RUN('clip').images)+'. One seed per run, '+fmt(RUN('clip').images)+' images at a batch of '+RUN('clip').batch+', AdamW (β₂ 0.98, ε 10⁻⁶, weight decay 0.2 on matrices), warm-up then cosine decay, learning rate '+RUN('clip').lr+'. The losses are not comparable across objectives: contrastive losses are per batch of 256 (ln 256 = 5.55 at chance), the others per word or per label. Wall clock: '+names.map(n=>RUNNAME[n]+' '+Math.round(RUN(n).secs/60*10)/10+' min').join('; ')+'.'}));
// ---------- honesty ----------
(function(){const r=RN.report||{},ck=RN.check||{},ov=RN.overlap||{},tp=ov['test_photo.u8'],tr=ov.train;
  const q=r.quantised,f=r.float;
  $('rnHonestO').innerHTML='<ul class="lst">'+
    '<li><b>Test set.</b> 5,000 scenes from seeds 2²⁹ + 10⁶ upward, rendered as photos and as drawings; training used seeds 1 to 120,000 and the page draws from 2³⁰ up. '+(tp?'No test image is a pixel duplicate of a training image; but every combination of shape, colour, size, position and style in the test also occurs in training ('+tr.attribute_combos+' combinations), and '+pct(tp.caption_in_train)+' of the test photos\' captions occur word for word in training ('+fmt(tr.distinct_captions)+' distinct captions in '+fmt(tr.n)+'). So the test measures new renderings of known concepts, not new concepts.':'')+'</li>'+
    (q&&f?'<li><b>Quantisation.</b> 6-bit weights (one base64 character each, one scale per row) and float16 vectors: '+((r.chars||0)/1024).toFixed(0)+' KB. Zero-shot with "a photo of a {}": '+pct(f.photo.photo)+' → '+pct(q.photo.photo)+' on photos, '+pct(f.photo.drawing)+' → '+pct(q.photo.drawing)+' on drawings.</li>':'')+
    (ck.verdict?'<li><b>JavaScript against PyTorch</b> on the shipped weights: '+ck.verdict+'; the same answer on '+ck.same_answer_default+' of '+ck.images+' images with the default prompt and '+ck.same_answer_ensemble+' with the ensemble; largest differences: image embeddings '+ck.max_image_emb_diff.toExponential(1)+', text embeddings '+ck.max_text_emb_diff.toExponential(1)+', attention '+ck.max_att_diff.toExponential(1)+'.</li>':'')+
    '<li><b>One seed per run</b>, about 1.2 million images each, so differences of a few points between toy runs are within run-to-run noise. The toy batch is 256, so many pairs in a batch share their colour and shape: false negatives the paper\'s 32,768-pair batches have too, at a lower rate.</li>'+
    '<li><b>What does not reproduce.</b> Figure 2\'s 4× gain of contrastive over bag-of-words prediction (the toy\'s captions name the image\'s colour and shape too reliably); the prompt-engineering gains (the toy has no polysemy and few phrasings); and the toy\'s bag-of-words text encoder beat its Transformer, because word order carries almost nothing in these captions.</li></ul>'})();
})();
