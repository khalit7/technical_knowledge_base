// ---- Scene (Gated units, Fig. 3): one real token through a plain GELU block (GPT-2 small) and a SwiGLU block (SmolLM2-135M) (renderer v2) ----
// Vectors recorded by src/real_models.py (DATA.real.models[].tok, decoded by AFD.dq): the first 24 numbers of x and y and the first 32 hidden
// units are drawn as signed bars on plinths; weight matrices are glass plates sized by the models' real widths (d tall, hidden width wide, the
// same scale for both blocks, so two plates of d x 4d cover the same area as three of d x 8d/3). The step lists' numbers are whole-vector
// shares written here from the same data (check_stages.mjs compares).
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-gf')||!window.S3||!window.AFD||!window.AF)return;const {at,off,lerp,mix}=S3;
  const {dq,M,rms,share}=AFD,g2=M.gpt2.tok,sm=M.smol.tok;
  const Pl={x:dq(g2.x),pre:dq(g2.pre),y:dq(g2.y)};Pl.h=Pl.pre.map(AF.BY.gelut.f);
  const Sg={x:dq(sm.x),g:dq(sm.gate),u:dq(sm.up),y:dq(sm.y)};
  const GF={silu:AF.BY.silu.f,sigmoid:AF.sig,relu:AF.BY.relu.f,gelu:AF.BY.gelu.f,id:x=>x};
  const GN={silu:'SiLU',sigmoid:'sigmoid',relu:'ReLU',gelu:'GELU',id:'no function'};
  let mode='plain',gate='silu',Ga,Hs;
  function prep(){Ga=Sg.g.map(GF[gate]);Hs=Ga.map((v,i)=>v*Sg.u[i])}prep();
  const near=v=>{const r=rms(v);return share(v,a=>Math.abs(a)<0.1*r)},pc=v=>(v*100).toFixed(1)+'%',mil=n=>(n/1e6).toFixed(2)+' million';
  const dP=M.gpt2.d,hP=M.gpt2.width,dS=M.smol.d,hS=M.smol.width;
  function writeList(){const set=(k,v)=>document.querySelectorAll('[data-gf="'+k+'"]').forEach(e=>e.textContent=v);
    set('pneg',pc(share(Pl.pre,a=>a<0)));set('pnear',pc(near(Pl.h)));set('phneg',pc(share(Pl.h,a=>a<0)));set('ppar',mil(2*dP*hP));set('p1',mil(dP*hP));
    set('gneg',pc(share(Sg.g,a=>a<0)));set('s2',mil(2*dS*hS));set('snear',pc(near(Sg.g.map(GF.silu).map((v,i)=>v*Sg.u[i]))));
    set('sneg',pc(share(Sg.g.map(GF.silu).map((v,i)=>v*Sg.u[i]),a=>a<0)));set('spar',mil(3*dS*hS));set('dS',dS);set('hS',hS.toLocaleString('en-US'));set('dP',dP);set('hP',hP.toLocaleString('en-US'))}
  writeList();
  function readout(){const el=$('gfN');if(!el)return;
    el.innerHTML=mode==='plain'?'GPT-2 block, whole vector: '+pc(near(Pl.h))+' of the 3,072 hidden values near zero, '+pc(share(Pl.h,a=>a<0))+' negative.':
      'SwiGLU block with '+GN[gate]+' as the gate, whole vector: '+pc(near(Hs))+' of the 1,536 products near zero, '+pc(share(Hs,a=>a<0))+' negative'+(gate==='silu'?' (as trained).':' (illustrative: SmolLM2 was trained with SiLU).')}
  const NX=24,NH=32,K=.62,PW=w=>w*K;                     // K: world units per d; a plate is K deep and (hidden / d) K wide, lying on the floor
  const ZX=2.9,ZP=2.05,ZH=1.2,ZM=.35,ZD=-.5,ZY=-1.35;
  const mx=a=>Math.max(1e-9,...a.map(Math.abs));
  // a vector as signed bars on a white plinth (positive up, negative hanging below), the reference scene's look
  function comb(R,c,vals,m,col,a,hmax,wd){if(a<=.01)return;const P=R.P,nb=vals.length,bw=wd/nb,y=c[1];
    R.box([c[0],y-.045,c[2]],[wd+.12,.045,.26],{a,shadow:false});
    if(y>.12)[-1,1].forEach(sx=>R.box([c[0]+sx*(wd/2),0,c[2]],[.03,y-.05,.03],{a:a*.9}));
    vals.forEach((v,i)=>{const hg=Math.max(.012,Math.min(1,Math.abs(v)/m)*hmax),bx=c[0]-wd/2+bw*(i+.5);
      R.box([bx,v>=0?y:y-.045-hg,c[2]],[bw*.7,hg,.09],{fill:col||P.paper,a,shadow:false,lw:.6})})}
  // a weight matrix: a glass plate lying on the floor, hidden width wide and d deep, its name and shape written on it
  function plate(R,cx,z,w,c,a,name){if(a<=.01)return;R.glass([cx-w/2,.02,z+K/2],[w,0,0],[0,0,-K],{c,a,nu:Math.max(2,Math.round(w/K*3)),nv:3,th:.02});
    R.label([cx,.03,z],name,{mono:true,fs:12.5,b:1,c:mix(R.P.ink,c,.55),a})}
  const YP=.36;
  function draw(R,k,e){const P=R.P;R.grid(-3,3,-2.4,3.6,.5);
    const CX=P.ink,CG=P.c2,CU=P.c1,CH=P.c4;
    const xs=mode==='plain'?Pl.x:Sg.x,ys=mode==='plain'?Pl.y:Sg.y,d=mode==='plain'?dP:dS,h=mode==='plain'?hP:hS,last=mode==='plain'?3:5;
    const rec=i=>k===i||k===last?1:.45;                       // what this step is about at full strength; earlier parts recede
    const sideL=(z,t,c,a)=>R.label([-HW()-.1,YP,z],t,{mono:true,fs:12,al:'right',dx:-6,c,a,grp:'side'});
    const X=xs.slice(0,NX),xw=PW(h/d)*.75;comb(R,[0,YP,ZX],X,mx(X),mix(P.paper,CX,.12),k===0?Math.max(.2,e):rec(0),.42,xw);sideL(ZX,'x · '+d+' numbers',P.mute,1);
    if(mode==='plain'){const pw=PW(h/d),pre=Pl.pre.slice(0,NH),hh=Pl.h.slice(0,NH),m=mx(pre);
      if(k>=1){plate(R,0,ZP,pw,CU,k===1?e:rec(1)*.9,'W₁ · '+dP+' × '+hP.toLocaleString('en-US'));
        if(k===1)[-1,0,1].forEach(o=>R.flow([[o*xw/3,YP+.3,ZX],[o*pw/3,.25,ZP],[o*pw/3,YP+.3,ZH]],{c:CU,a:e,r:.065,speed:1.2,n:7}));
        const vh=k<2?pre:pre.map((v,i)=>lerp(v,hh[i],k===2?e:1));
        comb(R,[0,YP,ZH],vh,m,k>=2?CH:CU,k===1?e:k===2||k===last?1:.5,.6,pw);
        sideL(ZH,k>=2?'h = GELU(·) · 32':'x W₁ + b₁ · 32 of 3,072',k>=2?CH:CU,1)}
      if(k>=3){plate(R,0,ZD,pw,CH,e,'W₂ · '+hP.toLocaleString('en-US')+' × '+dP);
        [-1,0,1].forEach(o=>R.flow([[o*pw/3,YP+.3,ZH],[o*pw/3,.25,ZD],[o*xw/3,YP+.3,ZY]],{c:CH,a:e,r:.065,speed:1.2,n:7}));
        const Y=ys.slice(0,NX);comb(R,[0,YP,ZY],Y,mx(Y),mix(P.paper,CX,.12),e,.42,xw);sideL(ZY,'y · back to '+dP,P.mute,e);
        R.label([-HW()-.1,0,ZD],'2 × d × 4d = 8d²',{mono:true,fs:12.5,b:1,al:'right',dx:-6,c:CH,a:e,grp:'side'})}
    }else{const pw=PW(h/d),G=Sg.g.slice(0,NH),U=Sg.u.slice(0,NH),Gt=Ga.slice(0,NH),H=Hs.slice(0,NH),mg=mx(G),mu=mx(U),xg=-(pw/2+.15),xu=pw/2+.15;
      if(k>=1){plate(R,xg,ZP,pw,CG,k===1?e:rec(1)*.9,'W_gate · '+dS+' × '+hS.toLocaleString('en-US'));
        if(k===1)[-1,0,1].forEach(o=>R.flow([[o*xw/3,YP+.3,ZX],[xg+o*pw/3,.25,ZP],[xg+o*pw/3,YP+.3,ZH]],{c:CG,a:e,r:.065,speed:1.2,n:7}))}
      if(k>=2){plate(R,xu,ZP,pw,CU,k===2?e:rec(2)*.9,'W_up · '+dS+' × '+hS.toLocaleString('en-US'));
        if(k===2)[-1,0,1].forEach(o=>R.flow([[o*xw/3,YP+.3,ZX],[xu+o*pw/3,.25,ZP],[xu+o*pw/3,YP+.3,ZH]],{c:CU,a:e,r:.065,speed:1.2,n:7}))}
      const vg=k<3?G:G.map((v,i)=>lerp(v,Gt[i],k===3?e:1));
      if(k>=1)comb(R,[xg,YP,ZH],vg,mg,CG,k===1?e:k===3||k===4||k===last?1:.5,.55,pw);
      if(k>=2)comb(R,[xu,YP,ZH],U,mu,CU,k===2?e:k===4||k===last?1:.5,.55,pw);
      if(k>=1)sideL(ZH,(k>=3?GN[gate]+'(g)':'g')+(k>=2?', u':'')+' · 32 of 1,536',k>=3?mix(P.ink,CG,.6):P.mute,1);
      if(k>=4){const a4=k===4?e:k===last?1:.6;
        if(k===4){[-1,1].forEach(o=>{R.flowArc([xg+o*pw/3,YP+.35,ZH],[o*pw/6,YP+.35,ZM],.25,{c:CG,a:e,r:.06,speed:1.1,n:6});R.flowArc([xu+o*pw/3,YP+.35,ZH],[o*pw/6,YP+.35,ZM],.25,{c:CU,a:e,r:.06,speed:1.1,n:6})})}
        comb(R,[0,YP,ZM],H,mx(H),CH,a4,.55,pw);sideL(ZM,'h = '+GN[gate]+'(g) ⊙ u',mix(P.ink,CH,.6),a4)}
      if(k>=5){plate(R,0,ZD,pw,CH,e,'W_down · '+hS.toLocaleString('en-US')+' × '+dS);
        [-1,0,1].forEach(o=>R.flow([[o*pw/3,YP+.3,ZM],[o*pw/3,.25,ZD],[o*xw/3,YP+.3,ZY]],{c:CH,a:e,r:.065,speed:1.2,n:7}));
        const Y=ys.slice(0,NX);comb(R,[0,YP,ZY],Y,mx(Y),mix(P.paper,CX,.12),gate==='silu'?e:e*.3,.42,xw);sideL(ZY,gate==='silu'?'y · back to '+dS:'y · as computed with SiLU',P.mute,e);
        R.label([-HW()-.1,0,ZD],'3 × d × 8d/3 = 8d²',{mono:true,fs:12.5,b:1,al:'right',dx:-6,c:CH,a:e,grp:'side'})}
    }
  }
  const HW=()=>mode==='plain'?1.3:1.8,BX=(z0,z1)=>[[-HW(),0,z0],[HW(),.8,z1]];
  const st=S3.stage({id:'stg-gf',list:'sx-gf-plain',fig:'Fig. 3 · one token through two feed-forward blocks',cam:[.12,.85],bounds:()=>BX(-1.6,3.15),aspect:.66,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,14,14,165],
    view:k=>{const top={cam:[.2,.72],bounds:BX(.8,3.15)};if(k===0)return {cam:[.2,.7],bounds:[[-1.1,0,2.4],[1.1,.8,3.3]]};
      if(mode==='glu'&&k>=1&&k<=3)return top;if(mode==='plain'&&(k===1||k===2))return top;
      if(mode==='glu'&&k===4)return {cam:[.2,.72],bounds:BX(-.1,2.4)};return {cam:[.12,.85],bounds:BX(-1.6,3.15)}},
    onStep:()=>readout()});
  readout();
  const MB=$('gfM'),GS=$('gfG'),GL=$('gfGl');
  if(st&&MB)MB.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;mode=b.dataset.m;MB.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    if(GL)GL.hidden=mode!=='glu';$('sx-gf-plain').hidden=mode!=='plain';$('sx-gf-glu').hidden=mode!=='glu';readout();st.list(mode==='plain'?'sx-gf-plain':'sx-gf-glu')});
  if(st&&GS)GS.addEventListener('change',()=>{gate=GS.value;prep();readout();st.draw()});
})();
