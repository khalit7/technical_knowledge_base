// ---- Run a ViT: composer (random, chosen shapes, drawing), live prediction, attention maps, fresh-image test, training curves ----
(function(){
if(!window.VIT){__jsErr('model weights missing');return}
const st={img:null,label:-1,model:'vit',view:'roll',q:24,tool:'draw',L:null};
const can=$('rnCan'),cx=can.getContext('2d');
['rnK0','rnK1','rnK2'].forEach((id,i)=>{$(id).innerHTML=KIND.map((k,j)=>'<option value="'+j+'"'+(j===[0,0,3][i]?' selected':'')+'>'+k+'</option>').join('')});
let seedN=0;
function setSample(s){st.img=Float32Array.from(s.img);st.label=s.label;st.L=s.L;run()}
function newRandom(){setSample(TOYGEN.sample(SEED_PAGE+100000+(seedN++)))}
function place(){const ks=['rnK0','rnK1','rnK2'].map(id=>+$(id).value);let L=null,s=SEED_PAGE+200000+(seedN++);for(let t=0;t<50&&!L;t++)L=TOYGEN.layout(s+t*7919,ks);
  if(!L){$('rnT').textContent='Could not place three shapes; try again.';return}
  setSample({img:TOYGEN.render(L,s,TOYGEN.NOISE),label:TOYGEN.labelOf(L),L})}
function paint(){const W=can.width,c=W/28;const d=cx.createImageData(W,W);
  for(let y=0;y<W;y++)for(let x=0;x<W;x++){const v=Math.round(255*st.img[Math.floor(y/c)*28+Math.floor(x/c)]),i=4*(y*W+x);d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}
  cx.putImageData(d,0,0);
  if($('rnGrid').checked){cx.strokeStyle='rgba(95,195,209,.55)';cx.lineWidth=1;for(let i=1;i<7;i++){cx.beginPath();cx.moveTo(i*W/7,0);cx.lineTo(i*W/7,W);cx.stroke();cx.beginPath();cx.moveTo(0,i*W/7);cx.lineTo(W,i*W/7);cx.stroke()}}
  if(st.view==='patch'){const q=st.q;cx.strokeStyle='#e8915c';cx.lineWidth=3;cx.strokeRect((q%7)*W/7+1.5,Math.floor(q/7)*W/7+1.5,W/7-3,W/7-3)}}
let R=null;
function run(){paint();const m=VIT.load(st.model);R=VIT.forward(m,st.img);
  fit($('rnP'),w=>{$('rnP').innerHTML=probBars(R.probs,st.label,Math.min(w,420))});
  const best=R.probs.indexOf(Math.max(...R.probs));
  $('rnT').innerHTML='Model answer: <b>'+KIND[best]+'</b> ('+pct(R.probs[best])+'). '+(st.label>=0?'Generator label: <b>'+KIND[st.label]+'</b> '+(best===st.label?'<span class="ok">correct</span>':'<span class="no">wrong</span>'):'This image has no single repeated kind (edited or composed that way), so there is no right answer.');
  maps()}
function maps(){if(!R)return;const T=VIT.cfg.T,H=VIT.cfg.H;
  fit($('rnMaps'),w=>{let s='';
    if(st.view==='roll'){const Rl=VIT.rollout(R.atts),v=[];for(let j=0;j<49;j++)v.push(Rl[1+j]);const S=Math.min(w,260);
      s=svgW(S,S,svgImg(st.img,0,0,S)+heat(v,0,0,S,'var(--c2)',{op:.85,rel:1}),'attention rollout');$('rnMapsN').innerHTML='Attention rollout from the class token to the patches, as the paper computes its Figure 6 (Abnar and Zuidema): heads averaged, the residual added, multiplied through all 4 layers. Shaded from the least-attended patch (clear) to the most (darkest); the actual range is '+pct(Math.min(...v))+' to '+pct(Math.max(...v))+' per patch.'}
    else{const q=st.view==='cls'?0:st.q+1,cols=H,ms=Math.max(40,Math.min(110,Math.floor((w-26)/cols-8))),pw=cols*(ms+8);let h='';
      R.atts.forEach((al,l)=>{h+=tx(0,l*(ms+22)+ms/2+4,'L'+(l+1),{fs:11,c:'var(--mute)'});al.forEach((a,hh)=>{const x=24+hh*(ms+8),y=l*(ms+22);const v=[];for(let j=0;j<49;j++)v.push(a[q*T+1+j]);
        h+=svgImg(st.img,x,y,ms)+heat(v,x,y,ms,'var(--c2)',{op:.9});if(q>0)h+=rc(x+(st.q%7)*ms/7,y+Math.floor(st.q/7)*ms/7,ms/7,ms/7,'none',{r:0,s:'var(--c6)',sw:1.5});if(l===0)h+=tx(x+ms/2,y-4,'head '+(hh+1),{a:'middle',fs:11,c:'var(--mute)'})})});
      s=svgW(24+pw,R.atts.length*(ms+22)+4,'<g transform="translate(0,14)">'+h+'</g>','attention maps by layer and head');
      $('rnMapsN').innerHTML=(q===0?'The class token\'s attention':'The attention of patch row '+(Math.floor(st.q/7)+1)+', column '+(st.q%7+1)+' (outlined)')+' over the 49 patches, per layer and head, each map scaled to its own maximum. The weight on the class token itself is left out.'}
    $('rnMaps').innerHTML=s})}
// drawing
let down=false;
function at(e){const r=can.getBoundingClientRect();return [Math.floor((e.clientX-r.left)/r.width*28),Math.floor((e.clientY-r.top)/r.height*28)]}
function stroke(e){const [x,y]=at(e);if(x<0||y<0||x>27||y>27)return;if($('rnPen').checked){const v=st.tool==='draw'?.9:0;st.img[y*28+x]=v;st.label=-1;paint()}else{st.q=Math.floor(y/4)*7+Math.floor(x/4);if(st.view!=='patch')setView('patch');paint();maps()}}
can.addEventListener('pointerdown',e=>{down=true;can.setPointerCapture&&can.setPointerCapture(e.pointerId);stroke(e);e.preventDefault()});
can.addEventListener('pointermove',e=>{if(down&&$('rnPen').checked)stroke(e)});
const up=()=>{if(down){down=false;run()}};can.addEventListener('pointerup',up);can.addEventListener('pointercancel',up);
$('rnNew').addEventListener('click',newRandom);$('rnPlace').addEventListener('click',place);
$('rnClr').addEventListener('click',()=>{st.img=new Float32Array(784);st.label=-1;run()});
$('rnGrid').addEventListener('change',paint);
segBind('rnTool',m=>{st.tool=m;$('rnPen').checked=true;$('rnTool').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'))});
function setView(m){st.view=m;$('rnView').querySelectorAll('button').forEach(b=>{b.classList.toggle('on',b.dataset.m===m);b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false')})}
segBind('rnView',m=>{setView(m);paint();maps()});
const MODS=['vit','vit_small','vitnopos'];
$('rnMod').querySelectorAll('button').forEach(b=>{if(!VIT.models.includes(b.dataset.m)){b.disabled=true;b.title='not in this build'}});
segBind('rnMod',m=>{if(!VIT.models.includes(m))return;st.model=m;$('rnMod').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));run()});
// fresh-image test
$('rnTest').addEventListener('click',()=>{const n=+$('rnTestN').value,out=$('rnTestO');delete out.dataset.done;out.textContent='Running...';
  setTimeout(()=>{const res=MODS.filter(k=>VIT.models.includes(k)).map(k=>{const m=VIT.load(k);let ok=0;for(let i=0;i<n;i++){const s=TOYGEN.sample(SEED_PAGE+i),r=VIT.forward(m,s.img);if(r.probs.indexOf(Math.max(...r.probs))===s.label)ok++}
      const ref=W_REF(k);return '<b>'+LABEL[k]+'</b>: '+ok+' of '+n+' ('+pct(ok/n)+')'+(ref?'; offline test set '+pct(ref):'')});
    out.innerHTML=res.join('<br>')+'<br><span class="small mute">Seeds 2<sup>30</sup> to 2<sup>30</sup> + '+(n-1)+'. With '+n+' images the standard error of an accuracy near 90% is about '+(100*Math.sqrt(.09/n)).toFixed(1)+' points, so small differences from the offline test set (5,000 images) are noise.</span>';out.dataset.done=1},20)});
const LABEL={vit:'Trained on 64,000',vit_small:'Trained on 2,000',vitnopos:'No position embeddings (64,000)'};
const W_REF=k=>VITW.models[k]&&VITW.models[k].test_q;
// training curves
const rs=(RUNS.runs||[]).slice().sort((a,b)=>a.arch.localeCompare(b.arch)||a.n-b.n);
const NAME={vit:'ViT',cnn:'ResNet',vitnopos:'ViT, no position embeddings'};
$('rcRun').innerHTML=rs.map((r,i)=>'<option value="'+i+'"'+(r.arch==='vit'&&r.n===2000?' selected':'')+'>'+NAME[r.arch]+', '+fmt(r.n)+' images</option>').join('');
let rcM='acc';
function curves(){const r=rs[+$('rcRun').value];if(!r)return;
  fit($('rcSvg'),w=>{const ser=rcM==='acc'?[{name:'train (first 2,000)',c:'var(--c2)',pts:r.log.map(l=>[l[0],+(100*l[2]).toFixed(1)])},{name:'validation',c:'var(--c1)',pts:r.log.map(l=>[l[0],+(100*l[3]).toFixed(1)])}]
      :[{name:'mean training loss over the last 200 steps',c:'var(--c3)',pts:r.log.map(l=>[l[0],l[1]])}];
    $('rcSvg').innerHTML=lineChart(ser,Math.min(w,640),{xt:[200,600,1000,1400,1800],fmtx:v=>fmt(v),xlab:'step',ylab:rcM==='acc'?'accuracy, %':'cross-entropy',h:220,label:'training curve'}).svg});
  $('rcO').innerHTML='Best validation <b>'+pct(r.val)+'</b> at step '+fmt(r.best_step)+' (the checkpoint kept, early stopping); held-out test <b>'+pct(r.test)+'</b>; '+r.epochs+' passes over the training set; '+fmt(r.params)+' parameters, '+fmt(r.macs)+' multiply-adds per image; '+Math.round(r.secs)+' s of wall-clock training on a shared laptop CPU.'}
$('rcRun').addEventListener('change',curves);
segBind('rcM',m=>{rcM=m;$('rcM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));curves()});
// honesty lines
function honesty(){const c=RUNS.check||{},rep=RUNS.report||{};const v=runOf('vit',64000);
  $('rbParams').innerHTML=v?fmt(v.params)+' parameters, '+fmt(v.macs)+' multiply-adds per image.':'';
  const ks=Object.keys(rep);
  $('rbCheck').innerHTML=(c.verdict?'the JavaScript forward pass reproduces PyTorch on 300 test images per model ('+c.verdict+': '+ks.map(k=>c[k]?LABEL[k]+' '+c[k].same_class+'/300 same answer, logits within '+c[k].max_logit_diff.toExponential(1)+', attention within '+c[k].max_att_diff.toExponential(1):'').filter(Boolean).join('; ')+')':'forward check not run')+
    '. Quantising to 6 bits changes held-out accuracy '+ks.map(k=>LABEL[k]+' '+pct(rep[k].test_float)+' to '+pct(rep[k].test_q)).join(', ')+'.';
  const tot=ks.reduce((a,k)=>a+rep[k].chars,0);$('rbSize').textContent=fmt(tot)+' characters ('+(tot/1024).toFixed(0)+' KB) for '+ks.length+' models'}
onTab('t-run',()=>{if(!run.done){run.done=1;try{honesty()}catch(e){__jsErr('honesty: '+e.message)}const D=demoSample();setSample(D.s);curves()}else{refit($('rnP'));refit($('rnMaps'));refit($('rcSvg'))}});
})();
