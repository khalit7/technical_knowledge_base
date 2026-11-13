// ---- The paper tab: patch explorer, position-embedding tiles, data-scale and attention-distance charts ----
(function(){
const PS=[1,2,8,14,16,32],RS=[224,384,512,518];
// 1. patch-size explorer (reveal of the first predict question)
function pz(){const P=PS[+$('pzP').value],R=RS[+$('pzR').value];$('pzPv').textContent=P;$('pzRv').textContent=R;
  fit($('pzSvg'),w=>{const s=Math.min(w,300),g=Math.floor(R/P),cs=s*P/R;let h=rc(0,0,s,s,'var(--soft)',{s:'var(--line)',r:0});
    if(g<=64){for(let i=0;i<=g;i++){h+=ln2(i*cs,0,i*cs,g*cs,'var(--acc)',{sw:.7,op:.7})+ln2(0,i*cs,g*cs,i*cs,'var(--acc)',{sw:.7,op:.7})}}
    else h+=rc(0,0,g*cs,g*cs,'var(--acc)',{r:0,op:.25})+tx(s/2,s/2,g+' × '+g+' cells: too fine to draw',{a:'middle',fs:12});
    h+=rc(0,0,cs,cs,'var(--c2)',{r:0,op:.8});
    $('pzSvg').innerHTML=svgW(s,s,h,'patch grid')});
  const g=Math.floor(R/P),N=g*g,T=N+1,pairs=T*T,pix=(R*R)**2;
  $('pzO').innerHTML='<b>'+g+' × '+g+' = '+fmt(N)+'</b> patches, '+fmt(T)+' tokens with the class token; '+fmt(pairs)+' attention pairs per layer and head, '+(pix/pairs>=10?fmt(pix/pairs):(pix/pairs).toFixed(2))+'× fewer than attention over all '+fmt(R*R)+' pixels. Each patch flattens to '+fmt(P*P*3)+' numbers (RGB).'}
['pzP','pzR'].forEach(id=>$(id).addEventListener('input',pz));
PRED_REVEAL['pr-tok']=pz;

// 2. the before/after (ViT against the ResNet on one image) is the 3D stage in 32_js_sc_vx.js

// 3. position-embedding similarity tiles (Figure 7, centre)
let pecM='vit',pecQ=24;
function gridScore(m){const a=[],b=[];for(let i=0;i<49;i++){const s=VIT.posSim(m,i);for(let j=i+1;j<49;j++){a.push(s[j]);b.push(-Math.hypot(Math.floor(i/7)-Math.floor(j/7),i%7-j%7))}}
  const ma=a.reduce((x,y)=>x+y)/a.length,mb=b.reduce((x,y)=>x+y)/b.length;let n=0,da=0,db=0;for(let i=0;i<a.length;i++){n+=(a[i]-ma)*(b[i]-mb);da+=(a[i]-ma)**2;db+=(b[i]-mb)**2}return n/Math.sqrt(da*db)}
function simCol(v){return v>=0?'var(--c1)':'var(--c2)'}
function pecDraw(){if(!VIT.models.includes(pecM)){$('pecA').innerHTML='<p class="small mute">This model is not in the page.</p>';return}
  const m=VIT.load(pecM);
  fit($('pecA'),w=>{const s=Math.min(w,340),t=s/7,c=t/7*.92;let h='';
    for(let q=0;q<49;q++){const sim=VIT.posSim(m,q),X=(q%7)*t,Y=Math.floor(q/7)*t;h+='<g data-q="'+q+'" style="cursor:pointer">'+rc(X+1,Y+1,t-2,t-2,'var(--bg)',{r:2,s:q===pecQ?'var(--ink)':'var(--line)',sw:q===pecQ?2:1});
      for(let j=0;j<49;j++)h+=rc(X+3+(j%7)*c,Y+3+Math.floor(j/7)*c,c,c,simCol(sim[j]),{r:0,op:Math.min(1,Math.abs(sim[j]))});h+='</g>'}
    $('pecA').innerHTML=svgW(s,s,h,'position embedding similarity, every patch');
    $('pecA').querySelectorAll('g[data-q]').forEach(g=>g.addEventListener('click',()=>{pecQ=+g.dataset.q;refit($('pecA'));pecBig()}))});
  pecBig();
  const gs=gridScore(m),other=VIT.models.includes(pecM==='vit'?'vit_small':'vit')?gridScore(VIT.load(pecM==='vit'?'vit_small':'vit')):null;
  const pc=(window.RUNS&&RUNS.pos)||{},v=pc.vit,sm=pc.vit_small;
  $('pecO').innerHTML='Grid score <b>'+gs.toFixed(2)+'</b> for this model'+(other!=null?' (the other: '+other.toFixed(2)+')':'')+'. Blue is positive similarity, orange negative; darker is larger.'+
   (v?' <b>This does not reproduce Figure 7.</b> The 64,000-image model\'s table has barely moved from its random start (mean norm '+v.norm+' against '+v.norm_init+' at initialisation; a random table scores '+v.grid_random_init+'), and the 2,000-image model\'s grew ('+sm.norm+') without becoming a grid. The likely reason is the task: which kind appears twice does not depend on where the shapes are, so the model has little use for positions, and the no-position model below is as accurate.':'')}
function pecBig(){const m=VIT.load(pecM);fit($('pecB'),w=>{const s=Math.min(w,300),c=s/7,sim=VIT.posSim(m,pecQ);let h='';
  for(let j=0;j<49;j++){h+=rc((j%7)*c,Math.floor(j/7)*c,c-1,c-1,simCol(sim[j]),{r:0,op:Math.min(1,Math.abs(sim[j]))});if(s>200)h+=tx((j%7)*c+c/2,Math.floor(j/7)*c+c/2+4,sim[j].toFixed(1),{a:'middle',fs:11,c:Math.abs(sim[j])>.55?'var(--bg)':'var(--ink)'})}
  $('pecB').innerHTML='<div class="small mute">Patch row '+(Math.floor(pecQ/7)+1)+', column '+(pecQ%7+1)+' against every patch</div>'+svgW(s,s,h,'one tile enlarged')})}
segBind('pecM',m=>{pecM=m;$('pecM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));pecDraw()});

// 4. predict: no position embeddings
PRED_REVEAL['pr-pe']=()=>{const a=runOf('vitnopos',64000),b=runOf('vit',64000);if(!a||!b){$('prPeNo').textContent='(not trained yet)';return}
  $('prPeNo').textContent=pct(a.test);$('prPeYes').textContent=pct(b.test);const d=100*(b.test-a.test);
  $('prPeWhy').innerHTML=d<1?'Here position does not help at all'+(d<0?' (the no-position model is even '+(-d).toFixed(1)+' points ahead, within what one seed can tell apart)':'')+': within a 4 × 4 patch the stroke pattern already says a lot about the kind, and the answer (which kind repeats) does not depend on where the shapes are. The paper\'s natural images reward positions more, and still by only 2.8 points.':'The gap here is '+d.toFixed(1)+' points: without positions the model cannot tell how strokes in neighbouring patches join up into a shape.'};

// 5. Large minus Base by pre-training set (Table 5)
PRED_REVEAL['pr-lb']=()=>fit($('lbSvg'),w=>{const T5=PAPER.tables.t5,pres=['ImageNet','ImageNet-21k','JFT-300M'],cols=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
  const ser=T5.pre.ImageNet.map((r,i)=>({name:r[0],c:cols[i],pts:pres.map((p,k)=>{const row=T5.pre[p][i];return [k,+(+row[3]-+row[1]).toFixed(2)]})}));
  $('lbSvg').innerHTML=lineChart(ser,Math.min(w,620),{xt:[0,1,2],fmtx:k=>pres[k],ylab:'L/16 minus B/16, points',zero:true,h:230,label:'Large minus Base by pre-training dataset'}).svg});

// 6. the toy data-scale experiment
let dscM='test';
function dscDraw(){const N=[500,2000,8000,64000],have=N.filter(n=>runOf('vit',n)&&runOf('cnn',n));if(!have.length){$('dscSvg').innerHTML='<p class="small mute">Runs not available.</p>';return}
  const val=r=>dscM==='test'?+(100*r.test).toFixed(1):+(100*(r.train_at_best-r.test)).toFixed(1);
  fit($('dscSvg'),w=>{const ser=[{name:'toy ViT',c:'var(--c1)',pts:have.map(n=>[n,val(runOf('vit',n))])},{name:'toy ResNet (BiT-style)',c:'var(--c2)',pts:have.map(n=>[n,val(runOf('cnn',n))])}];
    $('dscSvg').innerHTML=lineChart(ser,Math.min(w,640),{xlog:true,xt:have,fmtx:n=>fmt(n),xlab:'training images (log scale)',ylab:dscM==='test'?'held-out accuracy, %':'train minus held-out, points',h:240,label:'toy data-scale experiment'}).svg});
  $('dscO').innerHTML=have.map(n=>{const a=runOf('vit',n),b=runOf('cnn',n);return fmt(n)+': ViT <b>'+pct(a.test)+'</b>, ResNet <b>'+pct(b.test)+'</b>'}).join(' · ')}
segBind('dscM',m=>{dscM=m;$('dscM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));dscDraw()});
function blToy(){const N=[500,2000,8000,64000].filter(n=>runOf('vit',n)&&runOf('cnn',n));if(!N.length)return;const f=N[0],l=N[N.length-1];
  $('blToy').innerHTML='ResNet '+pct(runOf('cnn',f).test)+' against ViT '+pct(runOf('vit',f).test)+' with '+fmt(f)+' training images; '+pct(runOf('cnn',l).test)+' against '+pct(runOf('vit',l).test)+' with '+fmt(l)}

// 7. attention distance on 100 held-out images (Figure 7, right)
function adcDraw(){if(!adcDraw.d){const m=VIT.load('vit'),L=VIT.cfg.L,H=VIT.cfg.H,acc=[];for(let l=0;l<L;l++)acc.push(new Array(H).fill(0));
    for(let k=0;k<100;k++){const r=VIT.forward(m,TOYGEN.sample(SEED_PAGE+5000+k).img);r.atts.forEach((al,l)=>VIT.attnDist(al).forEach((d,h)=>acc[l][h]+=d/100))}adcDraw.d=acc}
  const d=adcDraw.d;
  fit($('adcSvg'),w=>{const W=Math.min(w,520),H=220,L=46,B=34,T=10,R=12,X=l=>L+(l+.5)/d.length*(W-L-R),Y=v=>T+(1-v/20)*(H-T-B);let s='';
    [0,5,10,15,20].forEach(v=>{s+=ln2(L,Y(v),W-R,Y(v),'var(--line)')+tx(L-5,Y(v)+4,v,{a:'end',fs:11,c:'var(--mute)'})});
    d.forEach((hs,l)=>{s+=tx(X(l),H-B+15,'layer '+(l+1),{a:'middle',fs:11,c:'var(--mute)'});hs.forEach((v,h)=>{s+='<circle cx="'+(X(l)+(h-1.5)*7).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="4.5" fill="var(--c'+(h+1)+')"><title>layer '+(l+1)+', head '+(h+1)+': '+v.toFixed(1)+' px</title></circle>'})});
    s+='<text x="12" y="'+((T+H-B)/2)+'" font-size="11" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 12 '+((T+H-B)/2)+')">mean attention distance, px</text>';
    const lg=legend([0,1,2,3].map(h=>['head '+(h+1),'var(--c'+(h+1)+')']),L,12,W-L-R);
    $('adcSvg').innerHTML=svgW(W,H+lg.h,lg.s+'<g transform="translate(0,'+lg.h+')">'+s+'</g>','attention distance by layer and head')});
  const r=d.map(hs=>Math.min(...hs).toFixed(1)+' to '+Math.max(...hs).toFixed(1));let u=0;for(let i=0;i<49;i++)for(let j=0;j<49;j++)u+=Math.hypot(Math.floor(i/7)-Math.floor(j/7),i%7-j%7)*4/2401;
  $('adcO').innerHTML='Range across heads, px: '+r.map((x,l)=>'layer '+(l+1)+' <b>'+x+'</b>').join(' · ')+'. Attention spread evenly over all patches would give '+u.toFixed(1)+' px; attention only on itself, 0.'}

function initRead(){try{pecDraw()}catch(e){__jsErr('pec: '+e.message)}
  try{dscDraw();blToy()}catch(e){__jsErr('dsc: '+e.message)}
  setTimeout(()=>{try{adcDraw()}catch(e){__jsErr('adc: '+e.message)}},400)}
onTab('t-read',()=>{if(!initRead.done){initRead.done=1;initRead()}else{[$('pecA'),$('pecB'),$('dscSvg'),$('adcSvg'),$('lbSvg'),$('pzSvg')].forEach(refit)}});
})();
