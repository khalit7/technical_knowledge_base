// ---- Scenes: the memory one GPU holds (Fig. 2) and one training step of Llama 3 8B on four GPUs under each split (Figs. 4 to 10), renderer v2 ----
// Numbers: window.ANIM (the page's step-through model, mirrored in src/recompute.py's anim block and checked by check_calc.mjs) and
// window.DTSTEP (the steps; their texts are the step lists). Each GPU is a board with its memory as a stack of slabs (weights blue,
// gradients gold, optimiser state purple, activations green, to scale, with the 80 GB line as a glass plane), its share of the model as
// 8 rows of layers (4 layers each) cut in quarters, front half attention and back half feed-forward, and its data on the floor in front
// (four sequences of eight chunks). Dots flow wherever bytes move: round the ring for all-reduce, reduce-scatter and all-gather, between
// every pair for all-to-all, to the neighbour for pipeline sends, across servers (pink) for InfiniBand.
(function(){
  if(!window.S3||!window.ANIM)return;const {at,off,lerp,mix,rgb}=S3,A=window.ANIM,D=window.DTSTEP,GB=1e9;
  const ibc=()=>rgb(getComputedStyle(document.body).getPropertyValue('--ib').trim()||'#a8456b');
  const SLAB=P=>[P.c1,P.c5,P.c4,P.c3];
  // a stack of slabs: vals in GB, from the floor of the board up; hk world units per GB; alphas per slab
  function tower(R,x,z,w,vals,hk,o){o=o||{};const P=R.P,C=SLAB(P);let y=o.y0||.08;const tops=[];
    vals.forEach((v,i)=>{const h=v*hk;if(h>.004)R.box([x,y,z],[w,h,w],{fill:C[i],a:o.a?o.a[i]:1,shadow:false,lw:.8});y+=h;tops.push(y)});return tops}
  // the 80 GB of an H100: a dashed ring round the stack at that height, drawn over it so it reads as a level
  function line80(R,x,z,w,hk,o){o=o||{};const P=R.P,y=(o.y0||.08)+80*hk,m=w/2+.07;
    R.line([[x-m,y,z-m],[x+m,y,z-m],[x+m,y,z+m],[x-m,y,z+m],[x-m,y,z-m]],{c:P.bad,w:o.w||2,dash:[5,3],top:true,a:o.a==null?1:o.a});return y}

  // ---------- Fig. 2: Llama 3 8B's memory on one H100 ----------
  if(document.getElementById('stg-mem'))(function(){
    const M=[16.060522496,16.060522496,96.363134976,36.507222016],hk=.0145,TX=-.6,TZ=0,W=1.25;
    const NM=['bf16 weights','bf16 gradients','fp32 master + Adam','activations, 8,192 tokens'];
    function draw(R,k,e){const P=R.P;R.grid(-4,4,-2.5,2.5,.5);
      R.box([-.2,0,0],[2.6,.08,2.0],{fill:P.paper,dz:50});R.label([-.2,0,1.05],'one H100, 80 GB',{fs:13,b:1,dy:14});
      const v=M.map((m,i)=>m*(i<k?1:i===k?e:0));const tops=tower(R,TX,TZ,W,v,hk);
      const yl=line80(R,TX,TZ,W,hk,{w:2.4});R.label([TX-W/2-.22,yl,TZ+W/2+.22],'80 GB',{mono:true,fs:12.5,b:1,c:P.bad,al:'right',dx:-6});
      let y=.08;M.forEach((m,i)=>{const a=i<k?.8:i===k?e:0;if(a>.01)R.label([TX+W/2+.3,y+m*hk/2,TZ+W/2],NM[i]+' · '+m.toFixed(1)+' GB',{al:'left',dx:12,mono:true,fs:12.5,b:i===k,c:SLAB(P)[i],a,grp:'mem'});y+=m*hk});
      const tot=v.reduce((s,x)=>s+x,0);R.label([TX,tops[3]||.08,TZ],tot.toFixed(1)+' GB',{mono:true,fs:13,b:1,dy:-16,a:k?1:e});
}
    (window.DTSTG=window.DTSTG||{})['stg-mem']=S3.stage({id:'stg-mem',list:'sx-mem',fig:'Fig. 2 · Llama 3 8B on one 80 GB H100, to scale',cam:[.35,.42],bounds:[[-1.6,0,-1.1],[3.2,2.45,1.1]],aspect:.6,dur:1400,hold:4400,draw,
      margin:w=>w<520?[14,10,14,10]:[16,18,14,40]});
  })();

  // ---------- Figs. 4 to 10: one step of Llama 3 8B on four GPUs ----------
  const GX=g=>(g-1.5)*3.4,TZ=-.35,TW=.95,HK=.0115,MZ=-.35,RH=.15,RS=.185;
  const TX=g=>GX(g)-.82,MX=g=>GX(g)+.55;
  function parts(mode){return mode==='DP'||mode==='CP'||mode==='EP'?[2,2,12]:mode==='ZeRO-1'?[2,2,3]:mode==='ZeRO-2'?[2,.5,3]:mode==='HSDP'?[1,1,6]:[.5,.5,3]}
  function holds(mode,g,r,blk,q){
    if(mode==='DP'||mode==='ZeRO-1'||mode==='ZeRO-2'||mode==='CP')return 1;
    if(mode==='ZeRO-3'||mode==='TP')return q===g?1:0;
    if(mode==='HSDP')return (q>>1)===(g&1)?1:0;
    if(mode==='PP')return r>>1===g?1:0;
    if(mode==='EP')return blk==='A'?1:(q===g?1:0);return 1}
  function data(mode,g,row,c){if(mode==='TP')return 2;if(mode==='CP')return c===g||c===7-g?1:0;if(mode==='PP')return g===0?1:0;return row===g?1:0}
  function mount(id,list,fig,modes,init,ro){
    if(!document.getElementById(id))return null;
    let mode=init,ST=D.steps(mode);
    const isPP=()=>mode==='PP',G=D.sched(4,4);
    function draw(R,k,e){const P=R.P,s=ST[k],N=A.numbers(mode,4),IB=ibc(),prev=ST[k-1];
      R.grid(-7,7,-2,isPP()?3.6:2,.5);
      const pp=parts(mode),bpp=pp.reduce((a,b)=>a+b,0);
      // which layer row is being gathered just in time (ZeRO-3, HSDP): it climbs in forward and comes back down in backward
      const gr=s.gather?(s.ph==='f'?Math.min(7,Math.floor(e*8)):7-Math.min(7,Math.floor(e*8))):-1;
      for(let g=0;g<4;g++){const x=GX(g);
        R.box([x,0,0],[2.95,.08,2.35],{fill:P.paper,dz:50});
        R.label([x,0,1.18],'GPU '+g+(mode==='HSDP'?(g<2?' · server A':' · server B'):''),{fs:13,b:1,dy:13});
        // memory: model states to scale, plus the activations held at this step (eased between steps)
        const a0=prev?(prev.act||0):0,a1=s.act||0,ac=lerp(a0,a1,e)*N.A[g]/GB,stt=N.states/GB;
        const so=s.ph==='o'?[.35,.35,1,.35]:null;
        const tops=tower(R,TX(g),TZ,TW,[stt*pp[0]/bpp,stt*pp[1]/bpp,stt*pp[2]/bpp,ac],HK,{a:so});
        line80(R,TX(g),TZ,TW,HK,{w:1.6});
        R.label([TX(g),tops[3],TZ],(stt+ac).toFixed(1)+' GB',{mono:true,fs:12,b:1,dy:-11,wide:1});
        if(s.ph==='o')R.glow([TX(g),tops[1]+(tops[2]-tops[1])/2,TZ+TW/2+.05],.45,{c:P.c4,a:.6});
        // the model: 8 rows (4 layers each) x 4 quarters x attention (front) and feed-forward (back)
        for(let r=0;r<8;r++){const y=.1+r*RS,lit=s.ph&&s.ph!=='o'&&(s.row==='all'||s.row===r);
          ['A','F'].forEach((blk,bi)=>{const z=MZ+(bi?-.17:.17);for(let q=0;q<4;q++){const hd=holds(mode,g,r,blk,q),cx=MX(g)-.375+q*.25;
            const tmp=!hd&&r===gr&&(mode==='ZeRO-3'||mode==='HSDP');
            const base=mode==='EP'&&blk==='F'?P.c2:P.c1;
            if(hd||tmp)R.box([cx,y,z],[.22,RH,.3],{fill:tmp?mix(P.paper,P.c1,.15):mix(P.paper,base,lit?.55:.38),a:tmp?.85:1,shadow:false,lw:.6});
            else R.box([cx,y,z],[.22,RH,.3],{fa:0,ea:.14,shadow:false,lw:.5})}})}
        // forward climbs the stack, backward comes down it
        if(s.ph==='f'||s.ph==='b'){const top=s.row==='all'?.1+8*RS:.1+RS,xs=MX(g)+.62,pts=[[xs,.12,MZ],[xs,top,MZ]];
          R.flow(s.ph==='f'?pts:pts.slice().reverse(),{c:s.ph==='f'?P.acc:P.c2,r:.06,speed:1.1,n:s.row==='all'?6:2})}
        // the data in front: four sequences of eight chunks (own: dark, the whole batch seen by every GPU: light, not here: outline)
        for(let row=0;row<4;row++)for(let c=0;c<8;c++){const d=data(mode,g,row,c),cx=GX(g)-1.05+c*.3,cz=.42+row*.17;
          if(d)R.box([cx,.08,cz],[.25,.06,.12],{fill:d===2?mix(P.paper,P.ink,.22):mix(P.paper,P.ink,.6),shadow:false,lw:.5});
          else R.box([cx,.08,cz],[.25,.06,.12],{fa:0,ea:.13,shadow:false,lw:.5})}
      }
      // side labels on the first GPU (wide screens)
      if(k===0){const x=GX(0)-1.5,a=1;
        R.label([x,.5,TZ],'memory, to scale',{al:'right',dx:-6,fs:12,c:P.mute,grp:'side',a});
        R.label([x,.08,.68],'data: 4 sequences',{al:'right',dx:-6,fs:12,c:P.mute,grp:'side',a})}
      R.label([MX(3)+.5,.1+3*RS,MZ],mode==='PP'?'layers: 8 per GPU':'32 layers, cut in quarters',{al:'left',dx:8,fs:12,c:P.mute,wide:1,a:k===0?1:0});
      // HSDP: the two servers
      if(mode==='HSDP')[0,2].forEach(g=>{const x0=GX(g)-1.6,x1=GX(g+1)+1.6;R.quad([[x0,.004,-1.3],[x1,.004,-1.3],[x1,.004,1.42],[x0,.004,1.42]],{ec:IB,lw:1.6,dash:[7,5],ea:.9})});
      // the collective of this step
      const c=s.coll,fa=Math.min(1,e*2.2),Y=1.92,cz=-.35,top=g=>[GX(g)+.1,Y,cz];
      if(c){let nm='',col=P.c6;
        if(c==='ar'||c==='rs'||c==='ag'){for(let g=0;g<3;g++)R.flowArc(top(g),top(g+1),.32,{c:P.c6,a:fa,r:.065,speed:1.3});
          R.flowArc([GX(3)+.1,Y-.2,cz-.9],[GX(0)+.1,Y-.2,cz-.9],.55,{c:P.c6,a:fa*.8,r:.06,speed:2.2});
          nm={ar:'all-reduce',rs:'reduce-scatter',ag:'all-gather'}[c]+' · NVLink'}
        else if(c==='ring2'){[[0,1],[2,3]].forEach(([a,b])=>{R.flowArc(top(a),top(b),.3,{c:P.c6,a:fa,r:.065});R.flowArc([GX(b)+.1,Y-.25,cz-.5],[GX(a)+.1,Y-.25,cz-.5],.25,{c:P.c6,a:fa,r:.06})});nm='gather and reduce-scatter inside each server · NVLink'}
        else if(c==='pair'){R.flowArc(top(0),top(2),.75,{c:IB,a:fa,r:.075,speed:1.4});R.flowArc([GX(1)+.1,Y,cz-.6],[GX(3)+.1,Y,cz-.6],.6,{c:IB,a:fa,r:.075,speed:1.4});col=IB;nm='all-reduce across servers · InfiniBand'}
        else if(c==='a2a'){for(let a=0;a<4;a++)for(let b=0;b<4;b++)if(a!==b)R.flowArc([GX(a)+.1,Y,cz+(b>a?.25:-.45)],[GX(b)+.1,Y,cz+(b>a?.25:-.45)],.18+.17*Math.abs(a-b),{c:P.c6,a:fa*.85,r:.05,speed:1.5,n:5});nm='all-to-all · NVLink'}
        else if(c==='p2p'){const fw=k!==3,bw=k>=2;for(let g=0;g<3;g++){if(fw)R.flowArc([GX(g)+.4,Y-.3,cz+.2],[GX(g+1)-.6,Y-.3,cz+.2],.25,{c:P.acc,a:fa,r:.065});if(bw)R.flowArc([GX(g+1)-.6,Y-.3,cz-.5],[GX(g)+.4,Y-.3,cz-.5],.25,{c:P.c2,a:fa,r:.065})}
          col=P.ink;nm=(fw&&bw?'activations forward, gradients back':fw?'activations to the next stage':'gradients to the previous stage')+' · send and receive'}
        R.label([0,Y+.62,cz],nm,{fs:12.5,b:1,c:col,a:fa,wide:1})}
      // PP: the 1F1B timeline on the floor, one row per GPU; ops yet to run are drawn faintly so the whole schedule is seen from step 1
      if(isPP()){const T=G.T,u=12/T,x0=-6,lim=lerp(prev?prev.gantt||0:0,s.gantt||0,e),z0=2.15;
        for(let g=0;g<4;g++){const z=z0+g*.42;R.box([0,.0,z],[12,.02,.34],{fill:P.soft,shadow:false,ea:.25});
          R.label([x0,.02,z],'GPU '+g,{al:'right',dx:-8,fs:12,c:P.mute,grp:'gantt'});
          G.st[g].forEach(o=>{const done=Math.max(0,Math.min(o.d,lim-o.s)),xs=x0+o.s*u,col=o.k==='F'?P.acc:P.c2;
            R.box([xs+o.d*u/2,.02,z],[o.d*u-.05,.05,.3],{fill:mix(P.paper,col,.25),a:.35,shadow:false,lw:.4});
            if(done>0)R.box([xs+done*u/2,.02,z],[done*u-.05,.09,.3],{fill:mix(P.paper,col,.75),shadow:false,lw:.5})})}
        R.label([x0+12,.02,z0+1.5*.42],k>=3?'idle '+(100*A.numbers('PP',4).idle).toFixed(0)+'% of the timeline':'',{al:'left',dx:8,fs:12.5,b:1,c:P.mute,a:k===3?e:1,grp:'gantt'})}
    }
    const st=S3.stage({id,list:list[mode],fig,cam:[.26,.74],bounds:()=>isPP()?[[-6.6,0,-1.3],[6.6,2.7,3.6]]:[[-6.6,0,-1.3],[6.6,2.7,1.3]],aspect:isPP()?.6:.46,dur:2200,hold:4600,draw,
      margin:w=>w<520?[12,8,12,8]:[16,14,14,isPP()?60:110],onStep:k=>readout(k)});
    function readout(k){const el=document.getElementById(ro);if(!el)return;const N=A.numbers(mode,4),K=A.numbers('DP',4);let nv=0,ib=0,cn=0;for(let i=0;i<=k;i++){nv+=ST[i].nv;ib+=ST[i].ib;cn+=ST[i].cn}
      const g=D.gb,g1=D.gb1;
      el.innerHTML='<b>After step '+(k+1)+':</b> model states '+g(N.states)+' per GPU'+(mode!=='DP'?' (DP '+g(K.states)+')':'')+'; sent per GPU so far '+g1(nv+ib)+(ib?' ('+g1(ib)+' on InfiniBand)':'')+' of '+g1(N.nv+N.ib)+' for the whole step'+(mode!=='DP'?' (DP '+g1(K.nv)+')':'')+'; collectives '+cn+' of '+N.coll+(mode==='PP'?'; idle '+(100*N.idle).toFixed(0)+'% of the timeline':'')+'.'}
    if(modes.length>1){const ch=document.getElementById(id+'-m');if(ch)RD.seg(ch,m=>{mode=m;ST=D.steps(mode);Object.values(list).forEach(l=>{const el=document.getElementById(l);if(el)el.hidden=l!==list[mode]});st.list(list[mode])})}
    (window.DTSTG=window.DTSTG||{})[id]=st;return st}
  window.DTS={
    dp:mount('stg-dp',{DP:'sx-dp'},'Fig. 4 · data parallel · one step, 4 GPUs',['DP'],'DP','ro-dp'),
    zero:mount('stg-zero',{'ZeRO-1':'sx-z1','ZeRO-2':'sx-z2','ZeRO-3':'sx-z3',HSDP:'sx-hsdp'},'Fig. 6 · sharded data parallel · same step',['ZeRO-1','ZeRO-2','ZeRO-3','HSDP'],'ZeRO-3','ro-zero'),
    tp:mount('stg-tp',{TP:'sx-tp'},'Fig. 8 · tensor parallel · same step',['TP'],'TP','ro-tp'),
    pp:mount('stg-pp',{PP:'sx-pp'},'Fig. 9 · pipeline parallel, 1F1B · same step',['PP'],'PP','ro-pp'),
    ep:mount('stg-ep',{EP:'sx-ep'},'Fig. 11 · expert parallel · MoE twin',['EP'],'EP','ro-ep'),
    cp:mount('stg-cp',{CP:'sx-cp'},'Fig. 12 · context parallel · same step',['CP'],'CP','ro-cp')};
})();
