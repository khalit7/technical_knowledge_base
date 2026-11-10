// ---- Scene, Fig. 5: which image of a fat binary each GPU runs. The binary is PyTorch 2.14's release wheel (CUDA 13, x86_64: six SASS images,
// no PTX, from .ci/manywheel/build_env_setup.py at v2.14.0; window.CSC.fat.wheel) and, in the second mode, the nightly (plus PTX compute_120;
// CSC.fat.nightly). Every outcome is computed by window.CSRUN.decide (31_js_run.js), the port of src/code/compat.py checked 660/660 by
// check/check_js.mjs; nothing was loaded on a GPU. SASS slabs orange, PTX purple, a failed launch red. Steps are explained by #sx-fat / #sx-fatn. ----
(function(){
  if(!document.getElementById('stg-fat'))return;const {at,mix}=S3,C=window.CSC,dec=window.CSRUN.decide;
  const NM={80:'A100',89:'L4',90:'H100',100:'B200',103:'B300',120:'RTX 5090',130:'future GPU'};
  const GPU=[80,89,90,100,103,120,130].map((cc,i)=>({cc,x:-4.2+i*1.4,nm:NM[cc]}));
  const ccs=cc=>(cc/10|0)+'.'+cc%10;
  const MODES={w:{list:'sx-fat',imgs:C.fat.wheel,when:[[],[80,89],[90,100],[103],[120],[130]]},
    n:{list:'sx-fatn',imgs:C.fat.nightly,when:[[],[80,89,90,100,103,120],[130]]}};
  let mode='w';
  const slabY=i=>.06+i*.31,SX=0,SZ=-1.55;
  function draw(R,k,e){const P=R.P,W=R.W,H=R.H,M=MODES[mode],imgs=M.imgs;R.grid(-5.4,5.4,-2.6,2.4,.5);
    const lab=(p,t,o)=>{const q=R.p(p);if(q[0]<6||q[0]>W-6||q[1]<6||q[1]>H-6)return;R.label(p,t,o)};
    // objects fade out as they reach the card's edge, so a close-up never shows a GPU cut by the frame
    const edge=(c,sz)=>{let m=1e9;for(let i=0;i<8;i++){const q=R.p([c[0]+(i&1?.5:-.5)*sz[0],c[1]+(i&2?sz[1]:0),c[2]+(i&4?.5:-.5)*sz[2]]);m=Math.min(m,q[0],W-q[0],q[1],H-q[1])}return Math.max(0,Math.min(1,(m-4)/26))};
    // when each GPU is decided in this mode
    const stepOf={};M.when.forEach((l,s)=>l.forEach(cc=>stepOf[cc]=s));
    const out={};GPU.forEach(g=>out[g.cc]=dec(imgs,g.cc,134,134,false,false));
    const used=new Set();GPU.forEach(g=>{const s=stepOf[g.cc];if(s!=null&&s<=k&&out[g.cc].image)used.add(out[g.cc].image)});
    const cur=new Set();(M.when[k]||[]).forEach(cc=>{if(out[cc].image)cur.add(out[cc].image)});
    // the fat binary: one slab per image, SASS orange, PTX purple, oldest at the bottom
    imgs.forEach((t,i)=>{const ptx=t.startsWith('compute_'),c=ptx?P.c4:P.c2,y=slabY(i),isNew=mode==='n'&&ptx&&k===0;
      const a=isNew?e:cur.has(t)?1:k===0?1:used.has(t)?.6:.35;
      R.box([SX,y,SZ],[2.4,.2,.95],{fill:mix(P.paper,c,cur.has(t)||k===0?.75:.45),a,shadow:i===0});
      if(cur.has(t))R.glow([SX+1.2,y+.09,SZ+.47],.35,{c,a:e*.8});
      lab([SX-1.2,y+.09,SZ+.47],(ptx?'PTX ':'SASS ')+t,{mono:true,fs:12,al:'right',dx:-8,c,b:cur.has(t)||isNew?1:0,grp:'img',a:Math.max(.55,a)})});
    lab([SX,slabY(imgs.length-1)+.17,SZ],mode==='w'?'release wheel: SASS only':'nightly: SASS plus PTX 12.0',{mono:true,fs:12.5,b:1,dy:-12,c:P.ink});
    // the GPUs in front, each named with its compute capability; its outcome appears when its step comes
    GPU.forEach(g=>{const s=stepOf[g.cc],r=out[g.cc],dn=s!=null&&s<=k,now=s===k,ef=edge([g.x,0,1.35],[1.05,.3,.72]),a=(dn?1:.3)*ef;if(ef<.05)return;
      const c=!dn?P.paper:r.outcome==='sass'?mix(P.paper,P.c2,.3):r.outcome==='jit'?mix(P.paper,P.c4,.3):mix(P.paper,P.bad,.3);
      R.box([g.x,0,1.35],[1.05,.3,.72],{fill:c,a});
      if(ef>.6){lab([g.x,0,1.71],g.nm,{fs:12.5,b:1,dy:12,a:Math.max(.5,a),wide:dn?0:1});lab([g.x,0,1.71],'CC '+ccs(g.cc),{mono:true,fs:12,dy:28,c:P.mute,a:Math.max(.5,a),wide:1})}
      if(dn&&ef>.6){const txt=r.outcome==='sass'?r.image:r.outcome==='jit'?(W<520?'JIT':'JIT '+r.image):(W<520?'fails':'no kernel image'),cc=r.outcome==='sass'?P.c2:r.outcome==='jit'?P.c4:P.bad;
        lab([g.x,.3,.99],txt,{mono:true,fs:12,b:1,dy:-12,c:cc,a:now?e:1})}
      // the chosen image streams from its slab to the GPU
      if(now&&r.image){const i=imgs.indexOf(r.image),y=slabY(i)+.09;R.flowArc([SX+.6,y,SZ+.47],[g.x,.32,1.1],.45+.08*Math.abs(g.x),{c:r.outcome==='jit'?P.c4:P.c2,a:Math.min(1,e*1.5),r:.065,speed:1.5,n:9})}
      if(now&&!r.image)R.glow([g.x,.4,1.35],.5,{c:P.bad,a:e*.7})});
  }
  const full=[[-5,0,-2.2],[5,2.1,2.1]];
  const views={w:[full,[[-5,0,-2.2],[1.8,1.9,2.1]],[[-2.6,0,-2.2],[2.6,1.9,2.1]],[[-1.8,0,-2.2],[3.2,1.9,2.1]],[[-1.6,0,-2.2],[5,1.9,2.1]],[[-1.6,0,-2.2],[5,2.1,2.1]]],
    n:[full,full,[[-1.6,0,-2.2],[5,2.2,2.1]]]};
  const st=S3.stage({id:'stg-fat',list:'sx-fat',fig:'Fig. 5 · which image of the binary each GPU runs',cam:[.12,.6],bounds:full,aspect:.56,dur:1400,hold:4800,draw,
    margin:w=>w<520?[14,10,26,10]:[22,16,36,16],view:k=>({cam:[.12,.6],bounds:views[mode][Math.min(k,views[mode].length-1)]})});
  (window.CSSTG=window.CSSTG||{})['stg-fat']=st;
  RD.seg(document.getElementById('cs-fatMode'),m=>{mode=m;document.getElementById('sx-fat').hidden=m!=='w';document.getElementById('sx-fatn').hidden=m!=='n';st.list(MODES[m].list)});
})();
