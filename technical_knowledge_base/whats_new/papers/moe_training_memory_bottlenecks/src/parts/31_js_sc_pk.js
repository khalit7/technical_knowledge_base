// ---- Scene (Four live sets): which peak runs out first, as two towers of slabs to scale (renderer v2) ----
// One GPU at two moments of a step: inside an MoE layer (model state + boundaries + dispatch buffers) and at the vocabulary head
// (model state + boundaries + logits); the step's rough peak is the taller tower (roughPeak in 12_js_model.js). The four operators
// switch on one per step in the order of the step list #sx-pk; offloaded bytes stream to a host stack on the right. Sizes from
// liveSets() (Table 1's formulas with the constants the paper's measurements show; labelled illustrative on the page), for the model
// and tokens per rank chosen under the steps. The dashed rings and the glass plane are the H200's 141 GB.
(function(){
  if(!document.getElementById('stg-pk'))return;const {at,lerp,mix}=S3;
  const NS=[2048,4096,8192,16384,32768,65536,131072,262144],ORDER=['logit','state','bnd','disp'];
  const GB=v=>v>=1e12?(v/1e12).toFixed(2)+' TB':(v/1e9).toFixed(v<10e9?1:0)+' GB';
  let S=null,model='m667',N=65536;
  const get=id=>S.find(x=>x.id===id);
  // how far operator id is switched on at step k, progress e (it switches on at step ORDER.indexOf(id)+1)
  const onAt=(id,k,e)=>at(k,e,ORDER.indexOf(id)+1);
  const val=(id,k,e)=>{const s=get(id);return lerp(s.b,s.a,onAt(id,k,e))};
  const towers=(k,e)=>{const st=val('state',k,e),bd=val('bnd',k,e);return {A:[st,bd,val('disp',k,e)],B:[st,bd,val('logit',k,e)]}};
  const hostAt=(k,e)=>{const M=MODELS[model];return [12*M.Th/M.W*onAt('state',k,e),get('bnd').b*onAt('bnd',k,e)]};
  // the numbers each step's text states, at the step's end (window.MM_PK is read by check_stages.mjs)
  function nums(){const T=k=>towers(k,1),sum=a=>a[0]+a[1]+a[2],h=hostAt(5,1);
    return {b0:sum(T(0).B),a0:sum(T(0).A),lb:get('logit').b,la:get('logit').a,b1:sum(T(1).B),a1:sum(T(1).A),sb:get('state').b,sa:get('state').a,b2:sum(T(2).B),a2:sum(T(2).A),
      nb:get('bnd').b,na:get('bnd').a,b3:sum(T(3).B),a3:sum(T(3).A),db:get('disp').b,da:get('disp').a,b4:sum(T(4).B),a4:sum(T(4).A),ho:h[0]+h[1]}}
  function compute(){S=liveSets(model,N);const n=nums(),pk=k=>Math.max(n['a'+k],n['b'+k]);
    window.MM_PK={model,N,n,peak:[0,1,2,3,4].map(pk)};
    const fill={b0:GB(n.b0),a0:GB(n.a0),x0:(pk(0)/HBM).toFixed(1),lb:GB(n.lb),la:GB(n.la),b1:GB(n.b1),a1:GB(n.a1),sb:GB(n.sb),sa:GB(n.sa),b2:GB(n.b2),
      v2:pk(2)>HBM?'still over':'now under the 141 GB',nb:GB(n.nb),na:GB(n.na),b3:GB(n.b3),a3:GB(n.a3),v3:pk(3)>HBM?'Still over':'Both moments now fit',
      db:GB(n.db),da:GB(n.da),pe:GB(pk(4)),p0:GB(pk(0)),ho:GB(n.ho)};
    document.querySelectorAll('#sx-pk [data-pk]').forEach(el=>{const v=fill[el.dataset.pk];if(v!=null)el.textContent=v})}
  // geometry: two towers on one GPU board, a host platform on the right
  const XA=-1.75,XB=-.25,TW=1.0,Y0=.08,XH=2.7,HW=.9,TOP=3.0;
  const hk=()=>{const t=towers(0,1);return TOP/Math.max(HBM,t.A[0]+t.A[1]+t.A[2],t.B[0]+t.B[1]+t.B[2])};
  const COL=P=>({state:P.c4,bnd:P.c3,disp:P.c1,logit:P.c2});
  const NAME={state:'model state',bnd:'boundaries',disp:'dispatch',logit:'logits'};
  function tower(R,x,vals,ids,k,e,side){const P=R.P,C=COL(P),u=hk();let y=Y0;const changing=ORDER[k-1];
    vals.forEach((v,i)=>{const id=ids[i],h=v*u,a=k>=1&&k<=4?(id===changing?1:.5):1;
      if(h>.003)R.box([x,y,0],[TW,h,TW],{fill:mix(P.paper,C[id],.62),a,shadow:i===0,lw:.8});
      if(h>.05)R.label([x+side*(TW/2+.12),y+h/2,0],NAME[id]+' · '+GB(v),{al:side>0?'left':'right',dx:side>0?8:-16,mono:true,fs:12,c:C[id],b:id===changing,a:Math.max(.55,a),grp:side>0?'rB':'rA'});
      y+=h});
    return y}
  function draw(R,k,e){const P=R.P,u=hk();R.grid(-4,4.4,-2.2,2.2,.5);
    // the GPU board and the host platform
    R.box([(XA+XB)/2,0,0],[3.3,Y0,1.9],{fill:P.paper,dz:40});R.label([(XA+XB)/2,0,.96],'one H200 · 141 GB HBM',{fs:12.5,b:1,dy:16});
    R.box([XH,0,0],[1.5,Y0,1.5],{fill:mix(P.paper,P.mute,.08),dz:40});R.label([XH,0,.76],'host · pinned CPU memory',{fs:12.5,dy:14,c:P.mute});
    const T=towers(k,e),tA=tower(R,XA,T.A,['state','bnd','disp'],k,e,-1),tB=tower(R,XB,T.B,['state','bnd','logit'],k,e,1);
    R.label([XA,Y0,.76],'inside an MoE layer',{fs:12,c:P.mute,al:'center'});R.label([XB,Y0,.76],'at the head',{fs:12,c:P.mute,al:'center'});
    // the H200's 141 GB: a glass plane across both towers and a dashed ring round each
    const yH=Y0+HBM*u,m=TW/2+.08;
    R.glass([XA-TW/2-.25,yH,-TW/2-.2],[XB-XA+TW+.5,0,0],[0,0,TW+.4],{c:P.bad,a:.24,nu:10,nv:3});
    [XA,XB].forEach(x=>R.line([[x-m,yH,-m],[x+m,yH,-m],[x+m,yH,m],[x-m,yH,m],[x-m,yH,-m]],{c:P.bad,w:1.8,dash:[5,3],top:true}));
    R.label([XA-TW/2-.25,yH,TW/2+.2],'H200 · 141 GB',{mono:true,fs:12.5,b:1,c:P.bad,al:'right',dx:-6,grp:'rA'});
    // the peak: the taller tower, red while over the 141 GB
    const pA=tA-Y0,pB=tB-Y0,peak=Math.max(pA,pB)/u,over=peak>HBM;
    [[XA,tA,pA>=pB],[XB,tB,pB>pA]].forEach(([x,y,isP])=>R.label([x,y,0],(isP?'peak ':'')+GB((y-Y0)/u),{mono:true,fs:13,b:isP,c:isP?(over?P.bad:P.good):P.ink,dy:-14,al:'center'}));
    // step 6: the faint outline of where the step started
    if(k===5){const t0=towers(0,1),h0=Math.max(t0.A[0]+t0.A[1]+t0.A[2],t0.B[0]+t0.B[1]+t0.B[2])*u;R.box([XB,Y0,0],[TW+.06,h0,TW+.06],{fill:P.paper,fa:.04,a:e*.9,shadow:false,lw:.6});
      R.label([XB,Y0+h0,0],'with none: '+GB(h0/u),{mono:true,fs:12,c:P.mute,dy:-14,a:e})}
    // the host stack: what offload and SCO moved off the device, with the bytes streaming over while it happens
    const H=hostAt(k,e);let y=Y0;[['state',H[0]],['bnd',H[1]]].forEach(([id,v])=>{const h=v*u;if(h>.003){R.box([XH,y,0],[HW,h,HW],{fill:mix(P.paper,COL(P)[id],.45),fa:.85,lw:.7,shadow:y===Y0});y+=h}});
    if(y>Y0+.01)R.label([XH,y,0],GB((y-Y0)/u)+' on the host',{mono:true,fs:12,c:P.mute,dy:-14,al:'center'});
    if(k===2||k===3){const id=k===2?'state':'bnd',c=COL(P)[id],yy=Y0+(k===2?T.B[0]/2:T.B[0]+T.B[1]/2)*u;
      [XA,XB].forEach(x=>R.flowArc([x+TW/2,yy,0],[XH-HW/2,Y0+(k===2?H[0]/2:H[0]+H[1]/2)*u,0],.5,{c,r:.06,n:9,speed:1.4,a:Math.min(1,e*3)}))}
    // the bounded sets are cut, not moved: a note at the slab while it happens
    if(k===1)R.label([XB+TW/2+.1,Y0+(T.B[0]+T.B[1])*u,0],'cut into strips of N × V/P',{fs:12,c:P.c2,dx:8,al:'left',a:e,wide:1});
    if(k===4)R.label([XA-TW/2-.1,Y0+(T.A[0]+T.A[1])*u,0],'one chunk at a time',{fs:12,c:P.c1,dx:-8,al:'right',a:e,wide:1});
  }
  function counters(k){const t=towers(k,1),a=t.A[0]+t.A[1]+t.A[2],b=t.B[0]+t.B[1]+t.B[2],p=Math.max(a,b),h=hostAt(k,1);
    document.getElementById('pkCnt').innerHTML=stat('Inside an MoE layer',GB(a),'state + boundaries + dispatch')+stat('At the head',GB(b),'state + boundaries + logits')+
      stat('Rough peak',GB(p),p>HBM?'<span class="no">over the 141 GB by '+GB(p-HBM)+'</span>':'<span class="ok">fits, '+GB(HBM-p)+' to spare</span>')+stat('Moved to the host',GB(h[0]+h[1]),'by offload and SCO');
    document.getElementById('pkTxt').innerHTML=MODELS[model].src+'; tokens per rank '+fmt(N)+'.'}
  compute();
  const full={cam:[.4,.48],bounds:[[-2.9,0,-1.1],[3.5,TOP+.1,1.1]]};
  const lowB=k=>{const u=hk(),t=towers(k,1),top=Math.max(HBM,t.A[0]+t.A[1]+t.A[2],t.B[0]+t.B[1]+t.B[2],hostAt(k,1)[0]+hostAt(k,1)[1])*u;return [[-3.9,0,-1.1],[3.5,Math.min(TOP+.1,top*1.08+.2),1.1]]};
  const stg=S3.stage({id:'stg-pk',list:'sx-pk',fig:'one GPU at two moments of a step · to scale',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1700,hold:5200,draw,
    // the camera moves in as the towers shrink, so the last steps are not lost at the bottom of the frame
    view:k=>{const v=k===3||k===4?{cam:[.44,.44],bounds:lowB(k)}:k===1?{cam:[.34,.44],bounds:[[-2.9,0,-1.1],[1.4,TOP+.1,1.1]]}:full;
      // on a phone the side labels hide, so their room on the left is dropped
      return innerWidth<600?{cam:v.cam,bounds:[[-2.5,0,-1.1],v.bounds[1]]}:v},
    margin:w=>w<520?[24,8,26,8]:[26,16,26,16],onStep:k=>{try{counters(k)}catch(e){}}});
  const upd=()=>{model=document.getElementById('pkM').value;N=NS[+document.getElementById('pkN').value];document.getElementById('pkNv').textContent=fmt(N);compute();if(stg){counters(stg.st.k);stg.draw()}};
  ['pkM','pkN'].forEach(id=>{const el=document.getElementById(id);el.addEventListener('input',upd);el.addEventListener('change',upd)});
  upd();
})();
