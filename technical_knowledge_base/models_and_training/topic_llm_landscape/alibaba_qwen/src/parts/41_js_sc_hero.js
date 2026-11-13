// ---- Scene (hero, Fig. 1): Qwen's loop as layer towers, one slab per layer from each config's layer pattern (window.QW, decoded from config.json
// by src/mk_data.py): blue full attention, green Gated DeltaNet, orange QSA. Footprint is proportional to the hidden size, height to the layer count.
// Steps: Qwen3 (and a distilled student), Qwen3-Next tests, Qwen3.5 adopts, Qwen3.8 inherits, one 2.4T block close up, Flash-Next tests QSA. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.QW)return;const {lerp,cl}=S3,Q=QW.by;
  const tw=(st,e,f)=>{const a=f(st.pk),b=f(st.k);return e>=1||a===b?b:lerp(a,b,e)};
  // label alpha: the outgoing label is gone by mid-transition and the incoming one starts after it, so two never share the space
  const la=(st,e,f)=>{const a=f(st.pk),b=f(st.k);if(e>=1||a===b)return b;return a>b?lerp(a,b,Math.min(1,2*e)):lerp(a,b,Math.max(0,2*e-1))};
  const lab=(R,p,t,o)=>{const q=R.p(p);if(q[2]<=0||q[0]<-4||q[0]>R.W+4||q[1]<-4||q[1]>R.H+4)return;R.label(p,t,o)};
  const T=[['Qwen3-235B-A22B','235B-A22B',-5.3,0],['Qwen3-30B-A3B','30B-A3B',-3.9,0],['Qwen3-Next-80B-A3B','Next-80B',-2.4,1],['Qwen3.5-397B-A17B','3.5-397B',-.6,2],
    ['Qwen3.8-27B','3.8-27B',1.1,3],['Qwen3.8-2.4T-A95B','3.8-2.4T',3.0,3],['Qwen3.8-Flash-Next','Flash-Next',5.1,5]].map(([n,s,x,a])=>({r:Q[n],s,x,a}));
  const FOC=[[0,1],[2],[3],[4,5],[5],[6]],DY=.032,TH=.023,side=r=>Math.max(.34,1.3*r.d/8192),top=r=>r.L*DY;
  const col=(P,r,c)=>c==='L'?S3.mix(P.paper,P.c3,.55):r.qsa?P.c2:P.c1;
  const nF=r=>QW.nf(r);
  // the tower's alpha at step s: absent before it appears, full when the step is about it, receding otherwise
  const A=(s,m)=>s<T[m].a?0:FOC[s].includes(m)?1:s===5?.42:.22;
  const BX=5.0,BY=.15,BG=.72; // the exploded block of step 5
  function tower(R,P,m,a,la1){const t=T[m],r=t.r,s=side(r);if(a<=.01)return;
    for(let i=0;i<r.L;i++)R.box([t.x,i*DY,0],[s,TH,s],{fill:col(P,r,r.mix[i]),a,shadow:i===0,lw:.5});
    const sg=m%2?18:0;
    lab(R,[t.x,0,s/2+.1],t.s,{fs:12.5,b:1,dy:14+sg,c:P.ink,a:Math.max(la1,a>.3?.9:.5)});}
  function draw(R,k,e,st){const P=R.P;R.grid(-6.6,6.6,-1.6,1.8,.5);
    T.forEach((t,m)=>tower(R,P,m,tw(st,e,s=>A(s,m)),la(st,e,s=>A(s,m)>=1?1:0)));
    // one note above each tower the step is about
    const note=(m,s,l1,l2)=>{const al=la(st,e,q=>q===s?1:0);if(al<=.01)return;const r=T[m].r,y=top(r)+.05,dx=R.W<520&&m===4?-12:0; // on a phone the 3.8-27B note steps left, clear of the 2.4T tower
      lab(R,[T[m].x,y,0],l1,{fs:12.5,b:1,dx,dy:-30,c:P.ink,a:al});if(l2)lab(R,[T[m].x,y,0],l2,{mono:true,fs:12,dx,dy:-13,c:P.mute,a:al})};
    const R0=T[0].r,R1=T[1].r,R2=T[2].r,R3=T[3].r,R4=T[4].r,R5=T[5].r,R6=T[6].r;
    note(0,0,'Apr 2025 · flagship',R0.L+' full-attention layers');note(1,0,'distilled student',R1.L+' layers');
    note(2,1,'Sep 2025 · tests',(R2.L-nF(R2))+' GDN + '+nF(R2)+' attention');
    note(3,2,'Feb 2026 · adopts',(R3.L-nF(R3))+' GDN + '+nF(R3)+' attention');
    note(4,3,R4.L+' layers',nF(R4)+' attention');note(5,3,'Aug 2026 · inherits',R5.L+' layers, '+nF(R5)+' attention');
    note(6,5,'Aug 2026 · tests QSA',(R6.L-nF(R6))+' GDN + '+nF(R6)+' QSA');
    // the loop's arrows as flows: teacher to student, test to flagship, flagship to mainline
    const arc=(m0,m1,s,c,txt)=>{const a=tw(st,e,q=>q===s?1:0);if(a<=.01)return;const r0=T[m0].r,r1=T[m1].r,p0=[T[m0].x+side(r0)/2,top(r0)*.6,0],p1=[T[m1].x-side(r1)/2,Math.min(top(r1)*.6,top(r0)*.6+.4),0],h=.35;
      R.flowArc(p0,p1,h,{c,a:a*.9,r:.06,n:12,speed:1.2});const mid=R.arcPt(p0,p1,h,.5);if(txt)lab(R,mid,txt,{fs:12.5,b:1,c,dy:-12,a:la(st,e,q=>q===s?1:0)})};
    arc(0,1,0,P.c4,'');arc(2,3,2,P.acc,'adopts');arc(3,4,3,P.acc,'');
    // new tokens going up the stack of the tower in focus (a test model: Next and Flash-Next)
    [[2,1],[6,5]].forEach(([m,s])=>{const a=tw(st,e,q=>q===s?1:0);if(a<=.01)return;const t=T[m],z=side(t.r)/2+.1;R.flow([[t.x,.02,z+.6],[t.x,.02,z],[t.x,top(t.r),z]],{c:P.ink,a:a*.6,r:.045,n:14,speed:1.1})});
    // step 5: one block of Qwen3.8-2.4T-A95B, exploded beside its tower
    const ba=tw(st,e,q=>q===4?1:0),bl=la(st,e,q=>q===4?1:0);
    if(ba>.01){const r=R5,S=1.15;
      R.box([T[5].x,0,0],[side(r)+.08,4*DY,side(r)+.08],{fill:P.paper,fa:.05,ec:P.ink,ea:.9*ba,a:ba,shadow:false,lw:1.2});
      R.flow([[T[5].x+side(r)/2,2*DY,0],[BX-S/2-.05,BY+1.2,0]],{c:P.mute,a:ba*.7,r:.04,n:8,speed:1});
      for(let i=0;i<4;i++){const y=BY+i*BG,c=r.mix[i];
        R.box([BX,y,0],[S,.16,S],{fill:col(P,r,c),a:ba,shadow:i===0,lw:.8});
        R.glass([BX-S/2,y+.3,-S/2],[S,0,0],[0,0,S],{c:P.c5,a:ba*.8,nu:8,nv:8,th:.03});
        lab(R,[BX+S/2,y+.08,0],c==='L'?'Gated DeltaNet · fixed state':'Gated attention · '+r.kvh+' KV heads of '+r.dh,{fs:12.5,b:i===3,al:'left',dx:26,c:c==='L'?P.c3:P.c1,a:bl,wide:1})}
      lab(R,[BX+S/2,BY+3*BG+.3,-S/2],'MoE after every mixer · '+r.k+' + '+r.sh+' of '+r.E+' experts',{fs:12.5,b:1,al:'left',dx:18,dy:-12,c:P.c5,a:bl,wide:1});
      R.flow([[BX,BY-.1,S/2+.12],[BX,BY+4*BG,S/2+.12]],{c:P.ink,a:ba*.6,r:.045,n:12,speed:1.1})}
  }
  const V=[{cam:[.34,.32],bounds:[[-6.1,0,-.8],[-3.3,3.6,.9]]},{cam:[.36,.32],bounds:[[-6.1,0,-.8],[-1.7,3.6,.9]]},{cam:[.36,.32],bounds:[[-3.1,0,-.8],[.4,3.2,.9]]},
    {cam:[.34,.3],bounds:[[-1.4,0,-.9],[4.0,3.6,.9]]},{cam:[.42,.3],bounds:[[2.0,0,-.9],[8.0,3.1,.9]]},{cam:[.3,.26],bounds:[[-6.1,0,-.8],[5.6,3.6,.9]]}];
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · test, adopt, inherit: one slab per layer, from config.json',cam:V[5].cam,bounds:V[5].bounds,aspect:.62,dur:1600,hold:5200,draw,
    margin:w=>w<520?[40,8,44,8]:[44,20,52,20],view:k=>V[k]});
})();
