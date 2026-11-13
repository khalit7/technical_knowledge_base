// ---- Scene (LoRA on one real matrix, Fig. 2): SmolLM2-135M layer 14 q_proj, the frozen W0, the thin A and B, the best rank-r update and the real one (renderer v2) ----
// Data: PF_DATA.show (delta_probe.py): the top-left 32 x 32 corner of W0, of the real update dW (Instruct minus base) and of its best rank-r approximations
// (truncated SVD, r = 1, 4, 16, 64), int8 with one scale per matrix; E the cumulative share of the update's squared size held at each rank.
// The plates show the top-left 16 x 16 entries as signed bars (up positive, down negative); W0 at its own scale, both updates at theirs (amW / amD times finer).
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-lora')||!window.S3)return;const {at,off,lerp,mix}=S3;
  const D=PF_DATA.show,C=D.crop,N=D.shape[0],K=D.shape[1],NK=N*K,G=16;
  const dec=(b,s)=>{const t=atob(b),a=new Float32Array(t.length);for(let i=0;i<t.length;i++){let v=t.charCodeAt(i);if(v>127)v-=256;a[i]=v/127*s}return a};
  const W0=dec(D.W0,D.amW),dW=dec(D.dW,D.amD),AP={};for(const r in D.approx)AP[r]=dec(D.approx[r],D.amD);
  let R=16;
  const share=r=>(100*D.E[r-1]).toFixed(0)+'%';
  // the numbers written in the step list and the readout (static defaults in the HTML are for r = 16; check_stages.mjs compares them)
  function texts(){const tr=2*R*N,set=(k,v)=>document.querySelectorAll('[data-lo="'+k+'"]').forEach(e=>e.textContent=v);
    set('r',R);set('tr',PF.comma(tr));set('share',share(R));set('state',PF.bytes(NK*2+tr*16));set('ship',PF.bytes(tr*2));
    set('fstate',PF.bytes(NK*16));set('fship',PF.bytes(NK*2));set('nk',PF.comma(NK));set('scale',(D.amW/D.amD).toFixed(0));
    set('rel',(100*D.rel).toFixed(1)+'%');set('r90',D.E.findIndex(v=>v>=.9)+1)}
  const Y0=.5,S=2.4,cell=S/G,bw=cell*.72,WX=-2.3,DX=2.3,PZ=-.6,FZ=-3.7,SA=1.7,AZ=1.95,AX=-.35,BX=1.45;
  const src=[-4.2,Y0+.15,1.3],out=[4.2,Y0+.15,1.3];
  // a 16 x 16 field of signed bars on a flat glass plate centred at (cx, Y0, cz); vals: the 32 x 32 crop, m: its scale
  function field(R3,cx,cz,vals,m,fill,a,glassC,hmax){if(a<=.01)return;const P=R3.P;
    R3.glass([cx-S/2,Y0,cz-S/2],[S,0,0],[0,0,S],{c:glassC,a:a*.9,nu:8,nv:8,th:.03});
    if(!vals)return;for(let i=0;i<G;i++)for(let j=0;j<G;j++){const v=vals[i*C+j],h=Math.max(.008,Math.abs(v)/m*hmax),x=cx-S/2+cell*(j+.5),z=cz-S/2+cell*(i+.5);
      R3.box([x,v>=0?Y0:Y0-h,z],[bw,h,bw],{fill,a,shadow:false,lw:.5})}}
  // a thin factor: a solid slab of size w (x) by d (z), centred, its thin side drawn to scale (at least .06)
  const slab=(R3,c,w,d,col,a)=>R3.box([c[0],Y0-.04,c[2]],[w,.08,d],{fill:col,a,shadow:false,lw:.7});
  function draw(R3,k,e){const P=R3.P;R3.grid(-5.5,5.5,-5.2,3.2,.5);
    const t=Math.max(.06,R/K*SA),grey=mix(P.paper,P.mute,.25),acc=mix(P.paper,P.acc,.7),org=mix(P.paper,P.c2,.75);
    // 1. the frozen matrix and the input streaming through it (it recedes while step 4 compares the two updates)
    const wa=k===3?.12:k===4?1:1,merged=k===4?e:0;
    let wv=W0;if(merged>0){wv=new Float32Array(W0.length);const u=AP[R];for(let i=0;i<W0.length;i++)wv[i]=W0[i]+merged*u[i]}
    field(R3,WX,PZ,wv,D.amW,merged>.5?mix(P.paper,P.acc,.25*merged):P.paper,wa,P.mute,.9);
    R3.label([WX,Y0+1.05,PZ-S/2],merged>.5?'W = W₀ + ΔW · '+N+' × '+K:(R3.W<520?'W₀ · frozen':'W₀ · '+N+' × '+K+' · frozen'),{mono:true,fs:12.5,b:1,c:merged>.5?P.acc:P.ink,a:k===3?0:1});
    const fa=k===3?.15:1;
    R3.flowArc(src,[WX,Y0+.2,PZ],.6,{c:P.c1,a:fa*(k===0?Math.min(1,e*1.6):1),r:.06,speed:1.3,n:10});
    R3.flowArc([WX,Y0+.2,PZ],out,.9,{c:P.c1,a:fa*(k===0?Math.min(1,e*1.6):1),r:.06,speed:1.3,n:16});
    if(k!==3){R3.label(src,'x',{serif:true,fs:15,b:1,dx:-12,c:P.c1});if(k&&k!==4)R3.label(out,'h',{serif:true,fs:15,b:1,dx:12,c:P.c1})}
    // 2. the LoRA path: A (r x 576, random) then B (576 x r, zeros), to scale; its output is zero until training moves B
    const la=k===0?0:k===1?Math.min(1,e*1.5):k===3?.12:k===4?1-e:1;
    if(la>.01){slab(R3,[AX,Y0,AZ],SA,t,k>=2?acc:grey,la);slab(R3,[BX,Y0,AZ],t,SA,k>=2?acc:grey,la);
      R3.label([AX,Y0,AZ+.15],'A · '+R+' × '+K+(k===1?' · random':k>=2?' · trained':''),{mono:true,fs:12,dy:16,c:k>=2?P.acc:P.mute,a:k===3?0:la,wide:1});
      R3.label([BX+t/2,Y0,AZ-SA/2+.2],'B · '+N+' × '+R+(k===1?' · zeros':k>=2?' · trained':''),{mono:true,fs:12,al:'left',dx:10,c:k>=2?P.acc:P.mute,a:k===3?0:la,wide:1});
      R3.flowArc(src,[AX-SA/2+.1,Y0+.1,AZ],.25,{c:P.c1,a:la*.9,r:.055,speed:1.3,n:7});
      R3.flow([[AX-SA/2+.1,Y0+.1,AZ],[BX,Y0+.1,AZ]],{c:P.acc,a:la,r:.05,speed:1.3,n:Math.max(2,Math.round(R/4))});
      if(k>=2)R3.flowArc([BX,Y0+.1,AZ],out,.25,{c:P.acc,a:la,r:.06,speed:1.3,n:8})}
    // 3. the update: empty while B = 0, then the best rank-r matrix (training moves only A and B; gradients stream back along the LoRA path)
    const da=k===0?0:k===1?Math.min(1,e*1.5):k===4?1-e:1,dx=k===4?lerp(DX,WX,e):DX;
    if(da>.01){if(k<2){R3.quad([[dx-S/2,Y0,PZ-S/2],[dx+S/2,Y0,PZ-S/2],[dx+S/2,Y0,PZ+S/2],[dx-S/2,Y0,PZ+S/2]],{ec:P.mute,ea:.8*da,dash:[5,4],lw:1.2});
        R3.label([dx,Y0+.3,PZ],'ΔW = (α/r)·BA = 0',{mono:true,fs:12.5,b:1,c:P.mute,a:da})}
      else{const g=k===2?e:1;const u=AP[R],v=new Float32Array(u.length);for(let i=0;i<u.length;i++)v[i]=u[i]*g;
        field(R3,dx,PZ,v,D.amD,acc,da,P.acc,.9);
        R3.label(k===3?[dx,Y0-.2,PZ+S/2]:[dx,Y0+1.05,PZ-S/2],(R3.W<520?'rank-'+R+' ΔW · '+share(R):'best rank-'+R+' ΔW · holds '+share(R)),{mono:true,fs:12.5,b:1,c:P.acc,a:da,dy:k===3?18:0})}}
    if(k===2){const ga=Math.min(1,e*1.6);R3.flowArc(out,[BX,Y0+.12,AZ+.2],.35,{c:P.c5,a:ga,r:.055,speed:1.1,n:8});R3.flow([[BX,Y0+.12,AZ+.2],[AX-SA/2+.1,Y0+.12,AZ+.2]],{c:P.c5,a:ga,r:.05,speed:1.1,n:9});
      R3.label([BX,Y0,AZ+SA/2],'gradients reach A and B only',{mono:true,fs:12,dy:20,c:P.c5,a:ga,wide:1})}
    // 4. before / after: the real update full fine-tuning made (SFT then DPO), behind the best rank-r copy, at the same scale
    const ra=k===3?Math.min(1,e*1.4):0;
    if(ra>.01){field(R3,DX,FZ,dW,D.amD,org,ra,P.c2,.9);R3.label([DX,Y0+1.05,FZ-S/2],(R3.W<520?'real ΔW · 100%':'real ΔW · full fine-tuning · 100%'),{mono:true,fs:12.5,b:1,c:P.c2,a:ra})}
  }
  const full={cam:[.16,.8],bounds:[[-4.4,0,-1.9],[4.4,1.2,2.9]]},close={cam:[.3,.62],bounds:[[-4.5,0,-1.9],[-.6,1.3,1.6]]};
  const st=S3.stage({id:'stg-lora',list:'sx-lora',fig:'Fig. 2 · LoRA on SmolLM2-135M, layer 14 query matrix',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,24,18,24],
    view:k=>k===0||k===4?close:k===3?{cam:[.42,.6],bounds:[[.8,0,-5.1],[3.8,1.3,.7]]}:full});
  const ch=$('loraR');ch.innerHTML=[1,4,16,64].map(r=>'<button data-r="'+r+'"'+(r===R?' class="on"':'')+'>r = '+r+'</button>').join('');
  ch.addEventListener('click',ev=>{const b=ev.target.closest('button[data-r]');if(!b)return;R=+b.dataset.r;ch.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));texts();st.st.user=true;st.pause();st.draw()});
  texts();
})();
