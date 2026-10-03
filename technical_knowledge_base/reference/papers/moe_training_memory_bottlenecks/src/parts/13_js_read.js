// ---- The paper tab: which peak runs out first, chunk membership replay, the three-scalar fold, SCO bars, end-to-end labels ----
(function(){
const GB=v=>v>=1e12?(v/1e12).toFixed(2)+' TB':(v/1e9).toFixed(v<10e9?1:0)+' GB';
// 1. Which peak runs out first
const NS=[2048,4096,8192,16384,32768,65536,131072,262144];
function pk(){const m=$('pkM').value,N=NS[+$('pkN').value];$('pkNv').textContent=fmt(N);
  const on={};['disp','logit','bnd','state'].forEach(id=>on[id]=$('pk_'+id).checked);
  const S=liveSets(m,N),peak=roughPeak(S,on);
  fit($('pkSvg'),w=>{const lw=w<600?84:150,pr=8,gw=w-lw-pr,rh=30,top=18;
    const vals=S.map(s=>on[s.id]?s.a:s.b);
    const mx=Math.max(HBM*1.25,peak*1.05,...S.map(s=>s.b));const X=v=>lw+gw*Math.min(1,v/mx);
    let s='';const rows=S.concat([{id:'peak',n:'Rough peak',sn:'Rough peak',c:'var(--ink)'}]);
    rows.forEach((r,i)=>{const y=top+i*rh,isP=r.id==='peak',v=isP?peak:vals[i],full=isP?null:r.b;
      s+=tx(lw-6,y+15,w<600?r.sn:r.n,{fs:12,a:'end',w:isP?600:null});
      if(!isP&&on[r.id])s+=rc(lw,y+4,X(full)-lw,16,r.c,{op:.18,r:2});
      s+=rc(lw,y+4,X(v)-lw,16,r.c,{op:isP?.55:.9,r:2});
      const lab=GB(v),lx=X(v)+4;
      s+=lx+70<w?tx(lx,y+16,lab,{fs:11}):tx(X(v)-4,y+16,lab,{fs:11,a:'end',c:'var(--bg)'});
      if(!isP)s+='<rect x="'+lw+'" y="'+(y+2)+'" width="'+gw+'" height="20" fill="transparent"><title>'+(on[r.id]?'With '+r.op+': '+r.ha.replace(/<[^>]+>/g,''):r.hb.replace(/<[^>]+>/g,''))+'</title></rect>'});
    const hx=X(HBM),H0=top+rows.length*rh;
    s+=ln2(hx,top-6,hx,H0,'var(--bad)',{da:'4 3',sw:1.5})+tx(hx+(hx>w-90?-4:4),top-6,'H200: 141 GB',{fs:11,c:'var(--bad)',a:hx>w-90?'end':null});
    $('pkSvg').innerHTML=svgW(w,H0+6,s,'Per-GPU size of the four live sets')});
  const order=S.map((s,i)=>[s.n,on[s.id]?s.a:s.b]).sort((a,b)=>b[1]-a[1]);
  $('pkTxt').innerHTML='Largest now: <b>'+order[0][0]+'</b> ('+GB(order[0][1])+'), next '+order[1][0]+' ('+GB(order[1][1])+'). Rough peak '+GB(peak)+(peak>HBM?', <span class="no">over the H200\'s 141 GB</span>':', <span class="ok">fits in 141 GB</span>')+'. '+MODELS[m].src+'.'}
['pkM','pkN','pk_disp','pk_logit','pk_bnd','pk_state'].forEach(id=>{$(id).addEventListener('input',pk);$(id).addEventListener('change',pk)});
onTab('t-read',pk);

// 2. Chunk membership: Table 8 against the replay
PRED_REVEAL['pr-chunk']=function(){const T8={'Balanced':[1.00,1.02],'95% / 16':[1.35,2.63],'80% / 16':[2.40,4.00],'50% / 4':[2.29,6.00]},names=Object.keys(T8);
  const R=names.map(n=>{const i=RT.profiles.findIndex(p=>p[0]===n),S=rtData(i);return [n,S.ratio.str,S.ratio.cont]});
  fit($('ckSvg'),w=>{const lw=Math.min(78,w*.2),gw=w-lw-18,gh=56,top=8,X=v=>lw+gw*v/8;let s='';
    R.forEach(([n,a,b],i)=>{const y=top+i*gh;s+=tx(lw-6,y+24,n,{fs:12,a:'end'});
      [[a,T8[n][0],'strided','var(--c3)'],[b,T8[n][1],'contiguous','var(--c2)']].forEach(([v,p,lab,c],j)=>{const yy=y+4+j*22;
        s+=rc(lw,yy,X(v)-lw,16,c,{r:2,op:.85})+ln2(X(p),yy-2,X(p),yy+18,'var(--ink)',{sw:2});
        const t=(w<600?'':lab+' ')+v.toFixed(2)+' (paper '+p.toFixed(2)+')',xe=X(Math.max(v,p))+5;
        s+=xe+t.length*6.3<w?tx(xe,yy+13,t,{fs:11}):tx(X(Math.min(v,p))-5,yy+13,t,{fs:11,a:'end',c:'var(--bg)',w:600})})});
    if(w<600)s+=tx(lw,top+R.length*gh+44,'upper bar strided, lower bar contiguous',{fs:11,c:'var(--mute)'});
    const y0=top+R.length*gh;[1,2,4,6,8].forEach(v=>{s+=ln2(X(v),y0,X(v),y0+4,'var(--mute)')+tx(X(v),y0+16,v+'×',{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx(lw+gw/2,y0+30,w<600?'largest send ÷ mean send':'largest send to one destination ÷ mean send, worst chunk',{fs:11,a:'middle',c:'var(--mute)'});
    $('ckSvg').innerHTML=svgW(w,y0+(w<600?52:36),s,'Send ratio, replay against Table 8')});
  const ok=R.every(([n,a,b])=>Math.abs(a-T8[n][0])<.006&&Math.abs(b-T8[n][1])<.006);
  $('ckTxt').innerHTML='Bars: our replay; black ticks: the paper. '+(ok?'<span class="ok">All eight reproduce to the printed two decimals.</span>':'<span class="no">Some do not reproduce.</span>')+' The largest receive per destination is 12.5% of the Eq. 1 bound under strided chunks on every profile and '+(100*rtData(3).maxRecv.cont/RT.bound).toFixed(1)+'% under contiguous chunks on 50/4, the paper\'s 12.5% and 17.1%.'};

// 3. The three-scalar fold, one token, 24 logits
function ls(){const K=+$('lsK').value,seed=+$('lsS').value;$('lsKv').textContent=K;$('lsSv').textContent=seed;
  const rnd=mulberry32(seed*7919),V=24,y=Array.from({length:V},()=>(rnd()+rnd()+rnd()-1.5)*4),t=Math.floor(rnd()*V);
  const mx=Math.max(...y),lse=mx+Math.log(y.reduce((a,v)=>a+Math.exp(v-mx),0)),dense=lse-y[t];
  let m=-Infinity,z=0,yt=null,rows='<tr><th>Block</th><th class="num">Words</th><th class="num">Running max m</th><th class="num">Running sum z</th><th class="num">Target logit</th></tr>';
  const B=Math.ceil(V/K);for(let b=0;b<K;b++){const lo=b*B,hi=Math.min(V,lo+B);if(lo>=hi)continue;const blk=y.slice(lo,hi),m2=Math.max(m,...blk);
    z=(m===-Infinity?0:Math.exp(m-m2)*z)+blk.reduce((a,v)=>a+Math.exp(v-m2),0);m=m2;if(t>=lo&&t<hi)yt=y[t];
    rows+='<tr><td>'+(b+1)+'</td><td class="num">'+lo+' to '+(hi-1)+'</td><td class="num">'+m.toFixed(4)+'</td><td class="num">'+z.toFixed(4)+'</td><td class="num">'+(yt===null?'not yet':yt.toFixed(4))+'</td></tr>'}
  $('lsT').innerHTML=rows;const ring=m+Math.log(z)-yt;
  $('lsTxt').innerHTML='Target word '+t+'. Folded: m + log z − y<sub>t</sub> = <b>'+ring.toFixed(10)+'</b>; dense log-softmax: <b>'+dense.toFixed(10)+'</b>; difference '+Math.abs(ring-dense).toExponential(1)+'. Three numbers per token crossed every block boundary, whatever the number of blocks.'}
['lsK','lsS'].forEach(id=>$(id).addEventListener('input',ls));PRED_REVEAL['pr-lse']=ls;

// 4. SCO: measured peak HBM and the boundary payload still on the device
PRED_REVEAL['pr-sco']=function(){const rows=[['Off',0,139.790],['8 GiB',21,133.546],['16 GiB',42,125.677],['Full',47,123.728]],bnd=557056/8*2880*2/GiB;
  fit($('scoSvg'),w=>{const lw=56,gw=w-lw-10,rh=30,X=v=>lw+gw*v/150;let s='';
    rows.forEach(([n,k,p],i)=>{const y=6+i*rh,dev=(47-k)*bnd;s+=tx(lw-6,y+15,n,{fs:12,a:'end'})+rc(lw,y+3,X(p)-lw,18,'var(--c3)',{r:2,op:.35})+rc(X(p)-(X(dev)-lw),y+3,X(dev)-lw,18,'var(--c3)',{r:2,op:.9});
      s+=tx(lw+6,y+16,fmt(p,3)+' GiB'+(i?' (−'+(139.790-p).toFixed(2)+')':''),{fs:11,w:600})});
    const y0=6+rows.length*rh;[0,50,100,150].forEach(v=>{s+=ln2(X(v),y0,X(v),y0+4,'var(--mute)')+tx(X(v),y0+16,v+' GiB',{fs:11,a:'middle',c:'var(--mute)'})});
    $('scoSvg').innerHTML=svgW(w,y0+22,s,'Peak HBM by host budget')})};

// 5. End to end, printed labels only
const E2E=[{n:'120B, 16 GPUs',base:128,ours:[[128,1355,91],[1024,642,221]],tp:'7.6× faster at 128K',tf:'1.8× more TFLOP/s at 128K',reach:'8×',batch:['128K','1.5M (12×)']},
  {n:'241B, 32 GPUs',base:32,ours:[[128,866,110],[1024,314,213]],tp:'FSDP2 out of memory at 32K: no shared length',tf:'no shared length',reach:'32×',batch:['256K','1.8M (7×)']},
  {n:'667B, 64 GPUs',base:64,ours:[[128,316,107],[1024,124,233]],tp:'10.4× faster at 64K (the stack has no 64K point)',tf:'2.2× more TFLOP/s at 64K',reach:'16×',batch:['1M','3M (3×)']}];
let e2eI=0;
function e2e(){const M=E2E[e2eI];
  fit($('e2eSvg'),w=>{const pl=46,pr=26,pt=14,ph=150,gap=46,lg=Math.log2,X=k=>pl+(w-pl-pr)*(lg(k)-lg(4))/(lg(1024)-lg(4));let s='';
    [['tokens/s per GPU',1,1500],['TFLOP/s per GPU',2,250]].forEach(([lab,ix,ymax],pI)=>{const y0=pt+pI*(ph+gap),Y=v=>y0+ph*(1-v/ymax);
      s+=rc(X(M.base),y0,X(1024)-X(M.base)+4,ph,'var(--dim)',{r:0,op:.45});
      s+=tx(X(M.base)+4,y0+12,'FSDP2-best out of memory',{fs:11,c:'var(--mute)'});
      [0,ymax/2,ymax].forEach(v=>{s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-4,Y(v)+4,fmt(v),{fs:11,a:'end',c:'var(--mute)'})});
      if(ix===2)s+=ln2(pl,Y(98.95),w-pr,Y(98.95),'var(--mute)',{da:'4 3'})+tx(pl+4,Y(98.95)-4,'10% MFU',{fs:11,c:'var(--mute)'});
      s+=tx(pl,y0-4,lab,{fs:11,c:'var(--mute)'});
      const P=M.ours.map(o=>[X(o[0]),Y(o[ix])]);s+=ln2(P[0][0],P[0][1],P[1][0],P[1][1],'var(--c5)',{sw:2,da:'5 3'});
      M.ours.forEach((o,j)=>{s+='<path d="M'+P[j][0]+','+(P[j][1]-6)+'l6,6l-6,6l-6,-6z" fill="var(--c5)" stroke="var(--ink)" stroke-width=".8"/>'+tx(P[j][0]+(j?-9:9),P[j][1]+(o[ix]>ymax*.8?16:-8),fmt(o[ix]),{fs:11,a:j?'end':null,w:600})});
      [4,16,64,256,1024].forEach(k=>{s+=tx(X(k),y0+ph+14,k===1024?'1M':k+'K',{fs:11,a:'middle',c:'var(--mute)'})})});
    $('e2eSvg').innerHTML=svgW(w,pt+2*ph+gap+18,s,'End-to-end throughput, printed labels')});
  $('e2eTxt').innerHTML='<b>'+M.n+'.</b> Throughput: '+M.tp+'. FLOP rate: '+M.tf+'. Context reach '+M.reach+'; largest global batch '+M.batch[0]+' for FSDP2-best against '+M.batch[1]+' for the stack. Diamonds: the composed stack (printed values); grey: lengths where no FSDP2 configuration fits.'}
segBind('e2eM',m=>{e2eI=+m;$('e2eM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.classList.contains('on')?'true':'false'));e2e()});
onTab('t-read',e2e);
})();
