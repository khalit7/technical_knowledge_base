// ---- Scene (stg-moe): one MoE layer of DeepSeek-V3, Kimi K2 and Kimi K3 to scale (renderer v2), from window.KM (configs; DeepSeek-V3 from the
// K2 report's Table 2). Each routed expert is a slab whose footprint is its input width by its hidden width (area proportional to its weights),
// the same camera for all three (so the sizes compare), the active ones lit for one token (which ones is illustrative, seeded); shared experts in front; the attention heads as a row of plates behind.
// K3's routed experts sit behind the shared down-projection W-down (7,168 to 3,584) and return through W-up. window.KM_MOE for the checks. ----
(function(){
  if(!document.getElementById('stg-moe')||!window.KM)return;const {lerp,mix}=S3;
  const M=[KM.v3,KM.k2,KM.k3],NAME=['DeepSeek-V3','Kimi K2','Kimi K2','Kimi K3'],MI=[0,1,1,2];
  const SC=1/24000,G=.045,f=v=>v.toLocaleString('en-GB');
  const lay=M.map(m=>{const ex=m.elat*SC,ez=m.fi*SC,cols=m.experts===896?28:12,rows=Math.ceil(m.experts/cols),W=cols*(ex+G)-G,D=rows*(ez+G)-G;
    const r=mulberry32(11+m.experts),lit=new Set();while(lit.size<m.active)lit.add(Math.floor(r()*m.experts));return {m,ex,ez,cols,rows,W,D,lit}});
  const w3=e=>3*e.elat*e.fi;
  window.KM_MOE={need:[[0,f(M[0].experts)],[0,M[0].active+' active'],[1,f(M[1].experts)],[1,M[1].experts/M[1].active],[2,String(M[0].heads)],[2,String(M[1].heads)],
    [3,f(M[2].experts)],[3,M[2].active+' active'],[3,f(M[2].elat)],[3,M[2].experts/M[2].active],[3,f(w3(M[2]))],[0,f(w3(M[0]))],[3,f(M[2].shared)+' shared']]};
  const lab=(k,e,st,f)=>{const a=f(st.pk),b=f(k);if(e>=1||a===b)return b;return a>b?Math.max(b,a*(1-2*e)):b*Math.max(0,2*e-1)};
  const ZF=.55; // front edge of every grid; the grid runs back from here
  function grid(R,L,a,hl){const P=R.P,{m,ex,ez,cols,W,lit}=L;
    for(let i=0;i<m.experts;i++){const c=i%cols,r=Math.floor(i/cols),x=-W/2+c*(ex+G)+ex/2,z=ZF-r*(ez+G)-ez/2,on=lit.has(i);
      R.box([x,0,z],[ex,on?.1:.035,ez],{fill:on?mix(P.paper,P.acc,.85):mix(P.paper,P.ink,.06),a:a*(on?1:hl),shadow:false,lw:.4,ea:on?.8:.35})}}
  function pos(L,i){const {ex,ez,cols,W}=L,c=i%cols,r=Math.floor(i/cols);return [-W/2+c*(ex+G)+ex/2,.1,ZF-r*(ez+G)-ez/2]}
  function draw(R,k,e,st){const P=R.P;R.grid(-4,4,-6.4,3.2,.5);
    [0,1,2].forEach(j=>{const a=lab(k,e,st,s=>MI[s]===j?1:0);if(a<=.01)return;const L=lay[j],m=L.m,TK=[0,.35,2.6];
      grid(R,L,a,k===2?.35:.9);
      // shared experts in front, full width (7,168 in)
      const sx=m.d*SC,sz=m.fi*SC;for(let s=0;s<m.shared;s++)R.box([(s-(m.shared-1)/2)*(sx+.12),0,ZF+.35+sz/2],[sx,.1,sz],{fill:mix(P.paper,P.c3,.8),a});
      R.label([(m.shared-1)/2*(sx+.12)+sx/2,0,ZF+.35+sz/2],m.shared+' shared',{al:'left',dx:8,fs:12.5,b:1,c:mix(P.c3,P.ink,.25),a:a*lab(k,e,st,s=>s===2?0:1)});
      // the token and its route: to the shared experts and to the active routed experts
      R.glow(TK,.3,{c:P.ink,a:a*.5});R.ball(TK,.09,{c:P.ink,a});
      const k3=j===2,dn=[0,.55,ZF+1.25];
      if(k!==2){[...L.lit].forEach(i=>{const p=pos(L,i);R.flowArc(k3?dn:TK,p,.45,{c:P.acc,a:a*.85,r:.05,n:5,speed:1.3})});
        R.flowArc(TK,[0,.1,ZF+.35+sz/2],.2,{c:P.c3,a:a*.8,r:.05,n:3,speed:1.1})}
      if(k3){R.glass([-1.1,.12,ZF+1.25],[2.2,0,0],[0,.6,0],{c:P.c4,a,nu:8,nv:2});R.label([1.1,.42,ZF+1.25],'W↓ · 7,168 → 3,584',{al:'left',dx:8,fs:12.5,b:1,c:mix(P.c4,P.ink,.2),a,grp:'R'});
        if(k!==2)R.flow([TK,[0,.45,ZF+1.25]],{c:P.ink,a:a*.7,r:.06,n:4,speed:1.1})}
      // the attention heads, a row of plates behind the experts
      const ha=lab(k,e,st,s=>s===2?1:.45)*a,HH=S3.lerp(...[st.pk,k].map(s=>s===2?1.4:.5),e>=1?1:e),n=m.heads,HW=Math.max(L.W,4.2),hz=ZF-L.D-.55,pw=HW/n;
      for(let h=0;h<n;h++)R.glass([-HW/2+h*pw+pw*.15,.02,hz],[pw*.7,0,0],[0,HH,0],{c:P.c5,a:ha,nu:1,nv:1,th:.02});
      // step 3: DeepSeek-V3's 128 heads behind K2's 64, at the same width
      const va=a*lab(k,e,st,s=>s===2?1:0);if(j===1&&va>.01){const n0=M[0].heads,p0=HW/n0,z0=hz-.6;
        for(let h=0;h<n0;h++)R.glass([-HW/2+h*p0+p0*.15,.02,z0],[p0*.7,0,0],[0,HH,0],{c:P.mute,a:va*.8,nu:1,nv:1,th:.02});
        R.label([HW/2,HH,z0],'DeepSeek-V3 · '+n0+' heads',{al:'left',dx:8,fs:12.5,b:1,c:P.mute,a:va,grp:'R'})}
      R.label([HW/2,HH,hz],(j===1&&k===2?'K2 · ':'')+n+' heads',{al:'left',dx:8,fs:12.5,b:1,c:mix(P.c5,P.ink,.35),a:Math.max(ha,a*.6),grp:'R'});
      // the model's name and its count of routed experts
      R.label([-L.W/2,.05,ZF-L.D/2],NAME[k===st.pk||e>=1?k:(e<.5?st.pk:k)]+' · '+f(m.experts)+' routed',{al:'right',dx:-10,fs:13,b:1,c:P.ink,a:a*(k===2?.5:1),grp:'L'});
      R.label([-L.W/2,.05,ZF-L.D/2],m.active+' active per token',{al:'right',dx:-10,dy:18,fs:12.5,c:P.acc,a:a*(k===2?.5:1),grp:'L'});
    })
  }
  const bnd=j=>{const L=lay[j];return [[-L.W/2-1.9,0,ZF-L.D-.7],[L.W/2+1.6,.8,2.75]]};
  S3.stage({id:'stg-moe',list:'sx-moe',fig:'One MoE layer to scale · from config.json',cam:[.12,.78],bounds:(b=>[b[0],[b[1][0],1.6,b[1][2]]])(bnd(2)),aspect:.7,dur:1700,hold:5200,draw,
    margin:w=>w<520?[14,8,14,8]:[16,20,16,20],
    view:null}); // one camera for the three layers, so their sizes compare
})();
