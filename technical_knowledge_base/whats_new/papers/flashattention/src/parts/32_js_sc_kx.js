// ---- Scene, Fig. 2: one forward pass, three ways, tile by tile (renderer v2) ----
// Data: the page's own simulator (12_js_fa.js, FA.simulate, checked against recompute.py by check_page.mjs) on the toy of 14_js_run.js
// (window.__kx: N = 32, d = 4, blocks of 8, seed 7 until "New random input"). Every block that moves, every count and the followed row's
// running maximum m, sum l and output come from the simulator's recorded steps. HBM is the large slab on the floor, SRAM the raised one;
// each matrix is a glass plate with one cell per value (rows along the depth). Reads and writes stream as dots between the two.
// Steps: #sx-kx-std, #sx-kx-stdmd, #sx-kx-fa, #sx-kx-fa2. A FlashAttention step is one outer iteration: it plays its T inner iterations.
(function(){
  if(!document.getElementById('stg-kx')||!window.S3||!window.__kx)return;const {mix}=S3,K=window.__kx,KX=K.KX;
  const N=KX.N,d=KX.d,B=KX.B,T=N/B,u=.075,Z0=-1.0,YT=.16,SY=2.0,SZ0=-2.75;
  const X={Q:-4.9,K:-4.45,V:-4.0,O:-3.55,l:-3.1,S:-2.6,P:.2};          // left edges of the HBM plates
  const WD={Q:d,K:d,V:d,O:d,l:2,S:N,P:N};                               // columns of each plate
  const SX={K:-4.4,V:-3.95,Q:-3.5,O:-3.05,l:-2.6,S:-2.15,P:-1.35};    // left edges of the SRAM slots
  let mode='std';
  const listId=()=>'sx-kx-'+(mode==='std'&&KX.md?'stdmd':mode);
  // stage step k (and its raw progress) -> the simulator's step
  function simStep(k,raw){const n=KX.sims[mode].steps.length;if(mode==='std')return Math.min(k,n-1);
    if(k===0)return 0;if(k>T)return n-1;const sub=Math.min(T-1,Math.floor(raw*T));return 1+(k-1)*T+sub}
  const rowZ=r=>Z0+(r+.5)*u;
  function draw(R,k,e,st){const P=R.P,col={Q:P.q,K:P.k,V:P.v,O:P.c3,l:P.mute,S:P.c5,P:P.c1};R.grid(-5.6,4.6,-3.4,2.4,.5);
    const raw=S3.RM?1:(st&&st.e!=null?st.e:1),sim=KX.sims[mode],si=simStep(k,raw),S=sim.steps[si],std=mode==='std';
    // the two memories
    R.box([-1.15,0,.25],[8.4,.12,3.1],{fill:mix(P.paper,P.line,.25),dz:60});
    R.label([-5.3,YT,-1.25],'HBM',{al:'left',fs:13,b:1,c:P.mute,dy:-8});
    R.box([-1.5,SY-.12,-2.45],[6.9,.12,1.0],{fill:mix(P.paper,P.acc,.22),shadow:false,dz:60});
    R.label([-4.9,SY,-1.95],'SRAM',{al:'right',dx:-6,fs:13,b:1,c:P.acc});
    // HBM plates: inputs always; O and the statistics as the mode keeps them; S and P full under standard, outlines otherwise
    const pl=(m,rows,a,nu,nv)=>R.glass([X[m],YT,Z0],[WD[m]*u,0,0],[0,0,rows*u],{c:col[m],a,nu,nv,th:.015});
    ['Q','K','V'].forEach(m=>{pl(m,N,.9,d,N);R.label([X[m]+d*u/2,YT,Z0+N*u+.1],m,{serif:true,fs:14,b:1,c:col[m],dy:12})});
    const oRows=std?(S.have.O?N:0):mode==='fa'?N:(S.oRows||0);
    R.glass([X.O,YT,Z0],[d*u,0,0],[0,0,N*u],{c:col.O,a:.15,nu:1,nv:1,th:.01});if(oRows>0)pl('O',oRows,.9,d,oRows);
    R.label([X.O+d*u/2,YT,Z0+N*u+.1],'O',{serif:true,fs:14,b:1,c:col.O,dy:12});
    if(!std){R.glass([X.l,YT,Z0],[2*u,0,0],[0,0,N*u],{c:col.l,a:.15,nu:1,nv:1,th:.01});if(oRows>0)pl('l',oRows,.9,2,oRows);
      R.label([X.l+u,YT,Z0+N*u+.1],mode==='fa'?'ℓ, m':'L',{fs:12.5,c:P.mute,dy:28,dx:6})}
    ['S','P'].forEach(m=>{const has=std&&S.have[m];R.glass([X[m],YT,Z0],[N*u,0,0],[0,0,N*u],{c:col[m],a:has?.85:.14,nu:has?N:T,nv:has?N:T,th:has?.015:.01});
      R.label([X[m]+N*u/2,YT,Z0+N*u+.1],std?m+(m==='S'?' = QKᵀ':' = softmax(S)')+' · N × N':(m==='S'?'S: tiles computed on chip only':'P: 0 values in HBM'),{fs:12.5,b:1,c:col[m],dy:12,a:has||!std?1:.5,wide:1})});
    // FlashAttention: the tiles of S computed so far, the current one bright (column by column under Algorithm 1, row by row under FA-2's order)
    if(!std){(S.tiles||[]).forEach(([i,j])=>{const x=X.S+j*B*u,z=Z0+i*B*u,cur=S.cur&&S.cur[0]===i&&S.cur[1]===j;
        R.quad([[x,YT+.02,z],[x+B*u,YT+.02,z],[x+B*u,YT+.02,z+B*u],[x,YT+.02,z+B*u]],{fill:col.S,a:cur?.75:.22,edge:false,dz:20})})}
    // the followed row, marked across Q and O
    if(!std){const z=rowZ(sim.row);R.line([[X.Q-.08,YT+.03,z],[X.l+2*u+.08,YT+.03,z]],{c:P.ink,w:1.6,a:.8});R.label([X.Q-.1,YT,z],'row '+(sim.row+1),{al:'right',dx:-4,fs:12,c:P.ink,grp:'row'})}
    // on chip: the blocks this step holds
    const slot={};(S.sram||[]).forEach(([nm,r,c,key])=>{const x=SX[key==='P'?'P':key],w=c*u,dz=r*u;slot[key]={x:x+w/2,z:SZ0+dz/2};
      R.glass([x,SY,SZ0],[w,0,0],[0,0,dz],{c:col[key],a:.95,nu:c,nv:r,th:.015});R.label([x+w/2,SY,SZ0],nm,{fs:12,c:col[key],dy:-10,grp:'sram'})});
    // reads stream up, writes stream down; kept matrices get a ring
    (S.ev||[]).forEach(ev=>{const m=ev.m,r0=ev.r0==null?0:ev.r0,r1=ev.r1==null?N:Math.min(N,ev.r1),cols=WD[m],vals=(r1-r0)*cols;
      const h=[X[m]+cols*u/2,YT+.03,Z0+(r0+r1)/2*u];
      if(ev.k==='k'){R.glass([X[m]-.04,YT+.03,Z0-.04],[cols*u+.08,0,0],[0,0,N*u+.08],{c:P.good,a:.9,nu:1,nv:1,th:.01});return}
      const s=slot[m]||slot[m==='l'?'l':'O']||{x:-2,z:SZ0+.3},c=[s.x,SY+.03,s.z],big=Math.min(1,vals/(N*N));
      R.flowArc(ev.k==='r'?h:c,ev.k==='r'?c:h,.5,{c:col[m],r:.045+.05*big,n:Math.round(4+10*big),speed:1.3})});
    // the running HBM count against standard attention's whole run, as a bar on a plinth
    const tot=S.rd+S.wr,ref=K.total('std'),hmax=2.0,sc=hmax/8704,bx=3.7,bz=.3;
    R.box([bx,0,bz],[.9,.06,.7],{shadow:false});
    if(!std){R.box([bx,.06,bz],[.5,ref*sc,.4],{fill:P.c2,a:.18,shadow:false});R.label([bx+.3,.06+ref*sc,bz],'standard: '+fmt(ref),{al:'left',dx:6,fs:12,c:P.c2,grp:'cnt'})}
    R.box([bx,.06,bz],[.5,Math.max(.01,tot*sc),.4],{fill:std?P.c2:P.acc});
    R.label([bx,.06+tot*sc,bz],fmt(tot),{fs:13,b:1,c:std?P.c2:P.acc,dy:-11});R.label([bx,0,bz+.45],'HBM traffic, values',{fs:12,c:P.mute,dy:12});
    // the followed row on chip: its running maximum m, sum l and output O as bars on a plinth (real values of this step)
    if(!std){const tr=S.tr,fin=sim.steps[sim.steps.length-1].tr,px=0,pz=-2.45,y=SY,ri=S.ri&&S.rowb?S.ri:null;
      const mM=Math.max(...sim.steps.map(s=>s.tr&&isFinite(s.tr.m)?Math.abs(s.tr.m):0),1e-9),lM=Math.max(...sim.steps.map(s=>s.tr?s.tr.l:0),1e-9),oM=Math.max(...fin.o.map(Math.abs),...sim.Oref[sim.row].map(Math.abs),1e-9);
      R.box([px+.55,y,pz],[2.3,.04,.5],{shadow:false});
      const bar=(x,v,mx,c,lab)=>{const h=Math.max(.012,Math.abs(v)/mx*.55);R.box([x,v>=0?y+.04:y-h,pz],[.2,h,.22],{fill:c,shadow:false,lw:.7});if(lab)R.label([x,y+.04+(v>=0?h:0),pz],lab,{fs:12,c,dy:-10,grp:'rd'})};
      if(isFinite(tr.m))bar(px-.4,tr.m,mM,P.c2,'m '+tr.m.toFixed(2));R.label([px-.4,y,pz+.42],'m',{fs:12,c:P.mute,dy:12,grp:'rdl'});
      bar(px+.15,tr.l,lM,P.c4,'ℓ '+tr.l.toFixed(2));R.label([px+.15,y,pz+.42],'ℓ',{fs:12,c:P.mute,dy:12,grp:'rdl'});
      tr.o.forEach((v,i)=>bar(px+.75+i*.3,v,oM,col.O,null));R.label([px+1.2,y,pz+.42],mode==='fa2'&&!S.end&&!(S.fin&&S.rowb)?'Õ (unnormalised)':'O row '+(sim.row+1),{fs:12,c:P.mute,dy:12,grp:'rdl'});
      if(ri&&ri.mo!==-Infinity&&ri.mn>ri.mo)R.label([px+1.2,y+.6,pz],'max rose: × '+ri.fac.toFixed(3),{fs:12.5,b:1,c:P.bad,dy:-8})}
    if(si!==lastSi||mode!==lastMode){lastSi=si;lastMode=mode;try{K.readout(mode,si)}catch(err){}}
  }
  let lastSi=-1,lastMode='';
  const full={cam:[.1,.8],bounds:[[-5.4,0,-3.0],[4.4,2.3,2.0]]};
  const stg=S3.stage({id:'stg-kx',list:'sx-kx-std',fig:'Fig. 2 · HBM and SRAM, one forward pass (toy, N = 32, d = 4)',cam:full.cam,bounds:full.bounds,aspect:.62,dur:4400,hold:4200,draw,
    margin:w=>w<520?[16,8,16,8]:[22,110,24,40],
    // on a phone the long row of plates turns into depth (a rotated, steeper camera), so the plates draw larger
    view:()=>innerWidth<520?{cam:[-.5,.9],bounds:full.bounds}:null});
  const show=()=>{['std','stdmd','fa','fa2'].forEach(x=>{document.getElementById('sx-kx-'+x).hidden=('sx-kx-'+x)!==listId()});lastSi=-1;stg.list(listId())};
  const seg=document.getElementById('kxM');
  seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});mode=b.dataset.m;show()}));
  document.getElementById('kxMd').addEventListener('change',e=>{K.setMd(e.target.checked);show()});
  document.getElementById('kxNew').addEventListener('click',()=>{K.newInput();lastSi=-1;stg.draw()});
  K.readout(mode,0);window.__kxStage={stg,mode:()=>mode,simStep};
})();
