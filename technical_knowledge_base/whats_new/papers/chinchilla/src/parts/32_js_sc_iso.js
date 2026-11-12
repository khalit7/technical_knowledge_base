// ---- Scene: Approach 2 in 3D, Fig. 2 (renderer v2), from real runs: the final losses Besiroglu et al. read out of the paper's Figure 4
// (PAPER.pts: N, C, loss), grouped by budget and fitted exactly as the 2D chart below does (window.A2 = approach2 in 13_js_read.js).
// Floor: log10 N across, log10 D = log10(C/6N) in depth; height: the final loss. ----
(function(){
  if(!$('stg-iso'))return;const {at,mix}=S3;
  const R2=window.A2,lg=Math.log10,NL=[7.6,11.1],DL=[8.2,12.4],LTOP=3.3,LB=2.05,HS=1.7;
  const X=lN=>(lN-9.35)*1.25,Z=lD=>(lD-10.3)*1.05,Y=L=>(Math.min(L,LTOP)-LB)*HS;
  const hue=i=>'hsl('+(205-i*20)+',62%,46%)',HI=7;                       // the 2D chart's colours; 1e21 is budget 8 of 9
  const BI=C=>BUDGETS.indexOf(C);
  const pq=(q,lN)=>q.c[0]+q.c[1]*lN+q.c[2]*lN*lN;
  function parab(q){const xs=q.P.map(p=>lg(p[0])),a=Math.min(...xs)-lg(1.3),b=Math.max(...xs)+lg(1.3),s=lg(q.C/6),pts=[];
    for(let i=0;i<=30;i++){const lN=a+(b-a)*i/30,L=pq(q,lN);if(L<=LTOP+.02)pts.push([X(lN),Y(L),Z(s-lN)])}return pts}
  function draw(R,k,e){const P=R.P;R.grid(-3.2,3.2,-3,3,.4);
    // axes on the floor
    if(k>=2){const big=k===4,zf=big?Z(DL[1])+.25:Z(11.6),xr=big?X(NL[1])+.25:X(10.5),nt=big?[[8,'100M'],[9,'1B'],[10,'10B'],[11,'100B']]:[[8,'100M'],[9,'1B'],[10,'10B']],dt=big?[[9,'1B'],[10,'10B'],[11,'100B'],[12,'1T']]:[[9,'1B'],[10,'10B'],[11,'100B']];
      nt.forEach(([v,t])=>R.label([X(v),0,zf],t,{mono:true,fs:12,c:P.mute}));dt.forEach(([v,t])=>R.label([xr,0,Z(v)],t,{mono:true,fs:12,c:P.mute,al:'left',dx:2}));
      R.label([X(big?8.6:9),0,zf+.3],'parameters N',{mono:true,fs:12,c:P.ink,dy:6});R.label([xr+.5,0,Z(big?11.5:10.5)],'tokens D',{mono:true,fs:12,c:P.ink,al:'left',dx:4})}
    if(k===2||k===3){const hp=[X(7.45),0,Z(11.4)];R.line([hp,[hp[0],Y(LTOP),hp[2]]],{c:P.mute,w:1,a:.7});
      [2.2,2.6,3.0].forEach(L=>{R.line([[hp[0]-.06,Y(L),hp[2]],[hp[0]+.06,Y(L),hp[2]]],{c:P.mute,w:1});R.label([hp[0],Y(L),hp[2]],'loss '+L.toFixed(1),{mono:true,fs:12,c:P.mute,al:'right',dx:-6,grp:'ax'})})}
    // the runs, budget by budget: one budget first, all nine from step 3
    R2.iso.forEach(q=>{const i=BI(q.C),one=i===HI,a=one?1:k<2?0:k===2?e:k>=3?.75:0;if(a<=.01)return;const c=hue(i),s=lg(q.C/6);
      const fa=k>=3&&!one?.65:1;
      q.P.forEach(p=>{const lN=lg(p[0]),lD=lg(p[1]/6/p[0]),x=X(lN),z=Z(lD),y=Y(p[2]);
        R.line([[x,0,z],[x,y,z]],{c,w:1,a:a*.35*fa});
        if(p[2]>LTOP){R.box([x,y,z],[.09,.03,.09],{fill:c,a:a*fa,shadow:false})}else R.ball([x,y,z],.055,{c,a:a*fa})});
      // the cut on the floor
      const xs=q.P.map(p=>lg(p[0])),a0=Math.min(...xs)-.1,b0=Math.max(...xs)+.1;R.line([[X(a0),.005,Z(s-a0)],[X(b0),.005,Z(s-b0)]],{c,w:1.4,a:a*.6,dash:[4,3]});
      // its parabola and minimum
      if(k>=1){const pa=one?(k===1?e:1):a;R.line(parab(q),{c,w:one?3:2,a:pa,top:1});
        const lv=lg(q.N),pm=[X(lv),Y(pq(q,lv)),Z(s-lv)];R.ball(pm,.085,{c:P.ink,a:pa,top:1});
        if(k===1&&one){R.glow(pm,.25,{c,a:pa,top:1});R.label(pm,'valley: '+hum(q.N)+', loss '+pq(q,lv).toFixed(2),{fs:12.5,b:1,c:P.ink,dy:-20,a:pa})}
        if(k>=3)R.line([[pm[0],0,pm[2]],pm],{c:P.ink,w:1.2,a:pa*.6,dash:[2,3]})}
      if(one&&k===0){const lab=q.P.slice().sort((u,v)=>u[0]-v[0])[q.P.length>>1];R.label([X(lg(lab[0])),Y(lab[2]),Z(lg(lab[1]/6/lab[0]))],'10²¹ FLOPs: '+q.P.length+' runs',{fs:12.5,b:1,c,dy:-30})}
      if(k===2){const pp=parab(q),e0=pp[pp.length-1];R.label(e0,sciT(q.C,0),{mono:true,fs:12,c,al:'left',dx:8,a,grp:'bud'})}});
    // the minima on one line, and its extension to Gopher's budget
    if(k>=3){const a=k===3?e:1,ms=R2.iso.map(q=>[X(lg(q.N)),.01,Z(lg(q.D))]);
      ms.forEach(m=>R.ball(m,.06,{c:P.c1,a}));
      const C0=R2.iso[0].C,C1=R2.iso[R2.iso.length-1].C,ln=[];for(let i=0;i<=20;i++){const C=C0*Math.pow(C1/C0,i/20);ln.push([X(lg(R2.N(C))),.012,Z(lg(R2.D(C)))])}
      R.line(ln,{c:P.c1,w:3,a});R.flow(ln.map(p=>[p[0],.05,p[2]]),{c:P.c1,a,r:.06,speed:.9});
      if(k===3)R.label(ln[20],'N ∝ C^'+R2.a.toFixed(3),{mono:true,fs:12.5,b:1,c:P.c1,al:'left',dx:10,dy:6,a})}
    if(k>=4){const C1=R2.iso[R2.iso.length-1].C,ln=[];for(let i=0;i<=20;i++){const C=C1*Math.pow(CG/C1,i/20);ln.push([X(lg(R2.N(C))),.012,Z(lg(R2.D(C)))])}
      R.line(ln,{c:P.c1,w:2.4,a:e,dash:[6,4],head:9});R.flow(ln.map(p=>[p[0],.05,p[2]]),{c:P.c1,a:e,r:.06,speed:1.1});
      const end=ln[20];R.glow([end[0],.05,end[2]],.3,{c:P.c1,a:e});R.ball([end[0],.06,end[2]],.08,{c:P.c1,a:e});
      R.label(end,'5.76 × 10²³: '+hum(R2.N(CG))+' on '+hum(R2.D(CG)),{fs:12.5,b:1,c:P.c1,al:'left',dx:14,dy:-18,a:e});
      const ch=[X(lg(70e9)),.06,Z(lg(1.4e12))];R.ball(ch,.07,{c:P.c3,a:e});R.label(ch,'Chinchilla 70B on 1.4T',{fs:12,c:P.c3,al:'left',dx:14,dy:4,a:e})}
  }
  const q21=R2.iso.find(q=>q.C===1e21),l21=lg(q21.N),s21=lg(1e21/6);
  const full={cam:[.62,.6],bounds:[[X(NL[0]),0,Z(DL[0])],[X(NL[1]),Y(LTOP),Z(DL[1])]]};
  const data={cam:[.72,.5],bounds:[[X(7.6),0,Z(8.3)],[X(10.4),Y(LTOP),Z(11.5)]]};
  const near={cam:[.8,.3],bounds:[[X(l21-.9),0,Z(s21-l21-.9)],[X(l21+.9),Y(2.5),Z(s21-l21+.9)]]};
  const set=(id,t)=>{const el=$(id);if(el)el.textContent=t};
  set('iso-n21',q21.P.length);set('iso-v21',hum(q21.N));set('iso-a',R2.a.toFixed(3));set('iso-b',R2.b.toFixed(3));set('iso-gN',hum(R2.N(CG)));set('iso-gD',hum(R2.D(CG)));
  S3.stage({id:'stg-iso',list:'sx-iso',fig:'Fig. 2 · Approach 2 on the extracted runs',cam:full.cam,bounds:full.bounds,aspect:.72,dur:1500,hold:5000,draw,
    view:k=>k<=1?near:k<=3?data:full,margin:w=>w<520?[14,10,14,10]:[18,16,14,60]});
})();
