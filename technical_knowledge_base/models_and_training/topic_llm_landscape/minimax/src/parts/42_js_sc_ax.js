// ---- Scene (Fig. 5, stg-ax): one decoded token through one layer of each route, to scale in blocks.
// Each glass plate is one KV head's cache over the whole context, one cell per block of 128 earlier tokens (the context select sets how many);
// MSA (M3): 4 KV heads plus the shared index-key plate (gold); each GQA group lights its own 16 blocks. Full GQA (M2): 8 KV heads, every block read.
// Lightning (MiniMax-01): no cache in this layer, 64 fixed 128 x 128 state plates; the softmax layer that follows every 7 is drawn last.
// Block scores and selections are illustrative (a fixed seed with a sink block and a few hot regions, the pattern of the MSA paper's Figure 5);
// every count and byte figure is computed from the configs (10b_js_model.js). ----
(function(){
  if(!document.getElementById('stg-ax'))return;const {at,lerp,mix}=S3;
  let mode='msa',n=131072,nb,gc,gr,heat,sel;
  function gen(){nb=n/KB;gc=2**Math.ceil(Math.log2(Math.sqrt(nb)));gr=nb/gc;const R=mulberry32(7+nb);heat=[];sel=[];
    const hot=[0,1,2,3].map(()=>[0,1,2].map(()=>Math.floor(R()*(nb-2))));
    for(let g=0;g<4;g++){const h=new Float32Array(nb);
      for(let b=0;b<nb;b++){let v=R()*0.35;v+=Math.exp(-b/2)*1.2;v+=Math.exp(-(nb-1-b)/3)*0.9;hot[g].forEach((c,j)=>{v+=(0.9-0.15*j)*Math.exp(-Math.abs(b-c)/(1.5+nb/600))});h[b]=v}
      heat.push(h);sel.push([nb-1,...[...h.keys()].filter(b=>b!==nb-1).sort((a,b)=>h[b]-h[a]).slice(0,KSEL-1)])}}
  gen();
  // numbers for one layer at context n (bytes, BF16), for the step text
  const NUM={kvM3:()=>2*4*128*2,ikey:()=>128*2,idxRead:()=>n*256,selRead:()=>4*SELT*2*128*2,kvM2:()=>2*8*128*2,kM2:()=>n*8*128*2,state:()=>64*128*128*2};
  window.MM_AX={NUM,get n(){return n},get nb(){return nb},sel:()=>sel};
  const PW=2.1,GAP=.4,GC=P=>[P.c1,P.c4,P.c6,P.c2];
  // every plate is drawn square (depth PW) at any context; at 1M the 128 x 64 blocks are drawn as cells twice as deep as wide
  // plate layout: MSA 4 KV heads in a row with the index plate in front; M2 8 heads in two rows of 4
  function plates(){const D=PW,xs=i=>(i-1.5)*(PW+GAP);
    if(mode==='msa')return{D,kv:[0,1,2,3].map(i=>({x:xs(i),z:0})),idx:{x:0,z:D+.9}};
    if(mode==='full')return{D,kv:[0,1,2,3,4,5,6,7].map(i=>({x:xs(i%4),z:i<4?-(D+.5):0}))};
    return{D,kv:[0,1,2,3,4,5,6,7].map(i=>({x:xs(i%4),z:i<4?-(D+.5):0}))}}
  // the world point of block b on a plate whose front-left corner is (x - PW/2, z)
  const cellP=(pl,b,D,y)=>[pl.x-PW/2+((b%gc)+.5)*PW/gc,y||0,pl.z-(Math.floor(b/gc)+.5)*D/gr];
  function draw(R,k,e,st){const P=R.P,L=plates(),D=L.D,cs=PW/gc,G=GC(P),tok=[0,.55,(L.idx?L.idx.z:0)+1.3];
    R.grid(-6,6,-6,5.5,.5);
    // the new token: a ball with a glow, in front of everything
    const ta=k===0?e:1;R.glow(tok,.38,{c:P.ink,a:ta*.35});R.ball(tok,.15,{c:mode==='lin'?P.c3:mode==='full'?P.c2:P.acc,a:ta});
    R.label(tok,'new token at position '+fmt(n),{fs:12.5,b:1,dy:22,c:P.ink,a:ta});
    const plate=(pl,c,a,lab,lc)=>{R.glass([pl.x-PW/2,.02,pl.z],[PW,0,0],[0,0,-D],{c,nu:8,nv:8,a,th:.04});if(lab)R.label([pl.x,.02,pl.z],lab,{fs:12.5,b:1,dy:13,c:lc||P.mute,a:Math.max(a,.5),wide:1})};
    const slot=(pl,a,c)=>{if(a<=.01)return;const p=cellP(pl,nb-1,D),s=Math.max(cs*1.8,.09);R.box([p[0],.03,p[2]],[s,.16,s],{fill:c,a,shadow:false,lw:.8})};
    if(mode==='msa'){
      // KV-head plates (grey glass) and the shared index-key plate (gold)
      const pa=k===0?.35+.65*e:1;
      L.kv.forEach((pl,g)=>plate(pl,P.mute,pa*(k>=4?.75:.55),k>=4?'group '+(g+1):'KV head '+(g+1),k>=4?G[g]:P.mute));
      plate(L.idx,P.c5,pa*(k===2||k===3?1:.6),'index keys, shared by all 4 groups',mix(P.c5,P.ink,.3));
      // 2. append: the token's K and V to every head, its index key to the index plate
      if(k===1){L.kv.forEach(pl=>{slot(pl,e,P.acc);R.flow([tok,cellP(pl,nb-1,D,.2)],{c:P.acc,a:e,n:4,r:.06})});slot(L.idx,e,P.c5);R.flow([tok,cellP(L.idx,nb-1,D,.2)],{c:P.c5,a:e,n:4,r:.06});
        R.label(cellP(L.kv[3],nb-1,D,.2),'+2,048 bytes K, V',{al:'left',dx:12,mono:true,fs:12,b:1,c:P.acc,a:e,wide:1});R.label(cellP(L.idx,nb-1,D,.2),'+256 bytes index key',{al:'left',dx:12,mono:true,fs:12,b:1,c:mix(P.c5,P.ink,.3),a:e,wide:1})}
      // 3. the index branch scores every earlier token: a sweep over the index plate, the token reading all of it
      // 4. max-pooled block scores (group 1) as heat on the index plate
      const step=nb>2048?4:1,cw=cs*step;
      if(k===2||k===3){const sw=k===2?e:1;for(let b=0;b<nb;b+=step){if(b/nb>sw)break;let v=heat[0][b];for(let j=1;j<step;j++)v=Math.max(v,heat[0][b+j]);
          const p=cellP(L.idx,b,D,.05),s=cs/2,u=Math.min(1,Math.max(0,(v-.3)/1.3)),a=k===2?.3:.04+.9*Math.pow(u,1.4);
          R.quad([[p[0]-s,.05,p[2]-s],[p[0]-s+cw,.05,p[2]-s],[p[0]-s+cw,.05,p[2]+s],[p[0]-s,.05,p[2]+s]],{fill:k===2?P.c5:mix(P.c5,P.ink,.45),fa:a,edge:false})}
        // the highest block scores of group 1 stand up as bars (one strong token lifts its block)
        if(k===3){const top=[...heat[0].keys()].sort((x,y)=>heat[0][y]-heat[0][x]).slice(0,40),mx=heat[0][top[0]],bw=Math.max(cs*1.4,.06);top.forEach(b=>{const p=cellP(L.idx,b,D);R.box([p[0],.05,p[2]],[bw,.45*e*heat[0][b]/mx,bw],{fill:mix(P.c5,P.ink,.2),a:1,shadow:false,lw:.5})})}
        R.flow([[L.idx.x,.12,L.idx.z-D/2],tok],{c:P.c5,a:1,n:8,r:.07,speed:1.2})}
      // 5. each group keeps its own 16 blocks: columns rise on that group's plate; 6. they stream to the token
      if(k>=4){const grow=k===4?e:1,s=Math.max(cs*1.7,.075);
        for(let g=0;g<4;g++){const pl=L.kv[g];sel[g].forEach(b=>{const p=cellP(pl,b,D);R.box([p[0],.04,p[2]],[s,.05+.3*grow,s],{fill:G[g],a:grow,shadow:false,lw:.6})});
          if(k===4)R.flow([[L.idx.x+(g-1.5)*.3,.15,L.idx.z-D],[pl.x,.4,pl.z-D/2]],{c:G[g],a:e,n:5,r:.06});
          if(k===5)sel[g].forEach(b=>{const p=cellP(pl,b,D,.35);R.flow([p,[tok[0]+(g-1.5)*.12,tok[1],tok[2]-.1]],{c:G[g],a:.85,n:2,r:.05,speed:1.6})})}}
      if(k===5)R.label([0,.4,-D],'each group reads its own 16 blocks: 4 × 2,048 keys',{dy:-14,fs:12.5,b:1,c:P.ink,wide:1});
    } else if(mode==='full'){
      const pa=k===0?.35+.65*e:1;
      L.kv.forEach((pl,h)=>plate(pl,P.c2,pa*(k>=2?.9:.5),null));R.label([0,.1,-2*D-.5],'8 KV heads, one plate each',{dy:-14,fs:12.5,b:1,c:mix(P.c2,P.ink,.3),wide:1});
      if(k===1)L.kv.forEach(pl=>{slot(pl,e,P.c2);R.flow([tok,cellP(pl,nb-1,D,.2)],{c:P.c2,a:e,n:3,r:.06})});
      if(k===1)R.label(cellP(L.kv[7],nb-1,D,.2),'+4,096 bytes K, V',{al:'left',dx:12,mono:true,fs:12,b:1,c:P.c2,a:e,wide:1});
      // 3. every key, 4. every value: the whole plate lights and streams to the token
      if(k>=2){const sw=k===2?e:1;L.kv.forEach(pl=>{const zz=pl.z-D*sw;R.quad([[pl.x-PW/2,.06,pl.z],[pl.x+PW/2,.06,pl.z],[pl.x+PW/2,.06,zz],[pl.x-PW/2,.06,zz]],{fill:k===3?P.c4:P.c2,fa:.28,edge:false});
          R.flow([[pl.x,.15,pl.z-D/2],tok],{c:k===3?P.c4:P.c2,a:sw,n:7,r:.07,speed:1.3})})}
    } else {
      // lightning: no cache in this layer, only the 64 fixed state plates, 128 x 128 each
      const sa=k===0?.35+.65*e:1,SP=.46,sx=i=>((i%8)-3.5)*SP,sz=i=>-.35-Math.floor(i/8)*SP*.9,fa=k===3?1-e:1;
      for(let i=0;i<64;i++)R.glass([sx(i)-.18,.2,sz(i)],[.36,0,0],[0,.36,0],{c:P.c3,nu:4,nv:4,a:sa*fa,th:.03});
      R.label([0,.6,sz(63)],'no cache: 64 states, 128 × 128 each, 2 MiB at any context',{dy:-14,fs:12.5,b:1,c:mix(P.c3,P.ink,.3),a:sa*fa,wide:1});
      if(k===1)for(let i=0;i<64;i+=3)R.flow([tok,[sx(i),.38,sz(i)]],{c:P.c3,a:e,n:2,r:.05,speed:1.4});
      if(k===2)for(let i=0;i<64;i+=3)R.flow([[sx(i),.38,sz(i)],tok],{c:P.c3,a:e,n:2,r:.05,speed:1.4});
      // 4. the softmax layer after every seven lightning layers: 8 KV heads, a full cache, all of it read
      if(k===3){L.kv.forEach(pl=>{plate(pl,P.c2,e*.9,null);
          R.quad([[pl.x-PW/2,.06,pl.z],[pl.x+PW/2,.06,pl.z],[pl.x+PW/2,.06,pl.z-D],[pl.x-PW/2,.06,pl.z-D]],{fill:P.c2,fa:.25*e,edge:false});
          R.flow([[pl.x,.15,pl.z-D/2],tok],{c:P.c2,a:e,n:5,r:.07,speed:1.3})});
        R.label([0,.1,-2*D-.5],'every 8th layer: softmax, 8 KV heads, a full cache',{dy:-14,fs:12.5,b:1,c:mix(P.c2,P.ink,.3),a:e,wide:1})}
    }
  }
  const bnd=()=>{const D=PW;return mode==='msa'?[[-4.9,0,-D-.4],[4.9,.5,D+2.4]]:[[-5,0,-2*D-.6],[5,.7,1.5]]};
  const stg=S3.stage({id:'stg-ax',list:'sx-ax-msa',fig:'Fig. 5 · one decoded token through one layer',cam:[.0,.95],bounds:st=>bnd(),aspect:.56,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,8,30,8]:[20,16,30,16]});
  // the step text's context-dependent numbers
  function fill(){const set=(c,t)=>document.querySelectorAll('.'+c).forEach(x=>x.textContent=t);
    set('ax-n',fmt(n));set('ax-nb',fmt(nb));set('ax-ib',fmtBytes(NUM.idxRead()));set('ax-k2',fmtBytes(NUM.kM2()));set('ax-r2',fmtBytes(2*NUM.kM2()));
    set('ax-m2w',n>196608?' (beyond M2\'s 196,608-token window: what full attention would cost there)':'');set('ax-rm',fmtBytes(NUM.idxRead()+NUM.selRead()));set('ax-of',fmt(KSEL*4)+' of '+fmt(nb))}
  const ids={msa:'sx-ax-msa',full:'sx-ax-full',lin:'sx-ax-lin'};
  function show(){Object.entries(ids).forEach(([m,id])=>{document.getElementById(id).hidden=m!==mode})}
  document.querySelectorAll('#axM button').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.m;document.querySelectorAll('#axM button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});show();stg.list(ids[mode])}));
  document.getElementById('axT').addEventListener('change',e=>{n=+e.target.value;gen();fill();stg.list(ids[mode])});
  fill();show();
})();
