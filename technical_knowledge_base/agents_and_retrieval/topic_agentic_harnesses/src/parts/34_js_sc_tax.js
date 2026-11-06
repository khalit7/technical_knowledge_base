// ---- Harness atlas, Fig. 2: the harness tax in 3D (renderer v2), driven by window.ATL.anim: two real recordings of Claude Haiku 4.5 on the running example,
// the Loop lab's step 5 harness (s5_haiku, front row) and Claude Code (std_haiku_1, back row). One column per model call, stacked cache read, cache write,
// fresh input and output, in tokens on one scale; the last step morphs every column into its price (list prices per million tokens, Haiku 4.5, read
// 2026-10-05: input 1, 1-hour cache write 2, cache read 0.10, output 5), the same units, so a fresh token keeps its height. Replaces the 2D animation of 2026-10-24. ----
(function(){
  if(!document.getElementById('stg-tax'))return;const {lerp,mix}=S3;const X=window.ATLX;if(!X||!X.A.anim||!X.A.anim.loop)return;
  const AN=X.A.anim,n0=X.n0,PR={in:1,w:2,r:0.1,out:5};
  const L=AN.loop.calls.map(c=>({f:c[0],w:c[1],r:c[2],o:c[3]})),C=AN.cc.calls.map(c=>({f:c[0],w:c[1],r:c[2],o:c[3]}));
  const cost=c=>(c.f*PR.in+c.w*PR.w+c.r*PR.r+c.o*PR.out)/1e6,inp=c=>c.f+c.w+c.r;
  const MAX=Math.max(...L.concat(C).map(c=>inp(c)+c.o)),HM=2.4,h=v=>v/MAX*HM;
  const xs=i=>(i-5.5)*.62,ZL=1.05,ZC=-1.05,W=.42,Dp=.62;
  // how many calls of each row are shown at step k (progress e plays them in one after another)
  const shown=(k,e)=>[k===0?1:k===1?1+(L.length-1)*e:L.length,k<=1?1:k===2?1+(C.length-1)*e:C.length];
  function column(R,c,x,z,a,t,P){const seg=[[c.r,PR.r,mix(P.paper,P.c1,.5)],[c.w,PR.w,mix(P.paper,P.c5,.6)],[c.f,PR.in,P.c2],[c.o,PR.out,mix(P.paper,P.c3,.55)]];
    let y=0;seg.forEach(([v,m,f],j)=>{const hh=h(lerp(v,v*m,t));if(hh<.004)return;R.box([x,y,z],[W,hh,Dp],{fill:f,a,shadow:y===0,lw:.7});y+=hh});
    if(t>0)R.box([x,0,z],[W*1.06,h(inp(c)+c.o),Dp*1.06],{fill:P.paper,a:a*t*.8,fa:.04,shadow:false,ea:.4});return y}
  function draw(R,k,e){const P=R.P,nar=R.W<520,t=k===4?e:0;R.grid(-4.2,4.2,-2.2,2.2,.4);
    const [nl,nc]=shown(k,e);
    [[L,ZL,nl,P.c2,'small harness (Loop lab)'],[C,ZC,nc,P.c1,'Claude Code']].forEach(([S,z,m,fc,name],row)=>{
      const sub=(k===1&&row===1)||(k===2&&row===0)?.35:1;
      S.forEach((c,i)=>{const a=Math.min(1,Math.max(0,m-i))*sub;if(a<=.01)return;const top=column(R,c,xs(i),z,a,t,P);
        if(i<S.length-1&&m>i+1&&k<4)R.flowArc([xs(i)+.1,h(inp(c)),z],[xs(i+1)-.1,h(inp(S[i+1])),z],.1,{c:fc,a:a*.7,r:.045,n:3,speed:.7});
        if(i===0||(i===S.length-1&&m>=S.length)){const lab=k===4?'$'+cost(c).toFixed(4):n0(inp(c));R.label([xs(i),Math.max(top,t>0?h(inp(c)+c.o):0),z],lab,{fs:12,mono:true,c:P.ink,dy:-11,a})}});
      R.label([xs(0)-W/2,.15,z],name,{al:'right',dx:-10,fs:12.5,b:1,c:row?P.c1:P.c2,grp:'rows'})});
    if(k===3&&!nar){const tl=L.reduce((s,c)=>s+inp(c),0),tc=C.reduce((s,c)=>s+inp(c),0);
      R.label([0,HM*.98,ZC],'input read: '+n0(tc)+' against '+n0(tl)+', about '+Math.round(tc/tl)+' times as much',{fs:12.5,b:1,c:P.ink,a:e,wide:1})}
    if(k===4&&!nar){const cl=L.reduce((s,c)=>s+cost(c),0),cc=C.reduce((s,c)=>s+cost(c),0);
      R.label([0,HM*.98,ZC],'API-price equivalent: $'+cc.toFixed(4)+' against $'+cl.toFixed(4),{fs:12.5,b:1,c:P.ink,a:e,wide:1})}
  }
  // the totals so far, under the step list on the left
  function stats(k){const el=document.getElementById('atl-astat');if(!el)return;const [nl,nc]=shown(k,1).map(Math.round);
    const st=(nm,xs,m,all,extra)=>{const u=xs.slice(0,m);return '<div class="stat"><div class="k">'+nm+'</div><div class="v">$'+u.reduce((s,c)=>s+cost(c),0).toFixed(4)+'</div><div class="d">'+m+' of '+xs.length+' calls; read '+n0(u.reduce((s,c)=>s+inp(c),0))+' input tokens ('+n0(u.reduce((s,c)=>s+c.r,0))+' cached), wrote '+n0(u.reduce((s,c)=>s+c.o,0))+'; whole run '+all+'. '+extra+'</div></div>'};
    el.innerHTML=st('Small harness, API-price equivalent so far',L,nl,AN.loop.secs.toFixed(0)+' s','')+st('Claude Code, API-price equivalent so far',C,nc,AN.cc.secs.toFixed(0)+' s','The CLI reported $'+AN.cc.cost.toFixed(4)+' for the whole run.')}
  const full={cam:[.32,.5],bounds:[[-3.8,0,-1.5],[3.8,HM,1.5]]};
  S3.stage({id:'stg-tax',list:'sx-tax',fig:'Fig. 1 · one task, two harnesses, every call',cam:full.cam,bounds:full.bounds,aspect:.56,dur:2400,hold:4800,draw,
    margin:w=>w<520?[16,10,14,10]:[20,16,14,170],onStep:k=>stats(k),
    view:k=>k===0?{cam:[.45,.42],bounds:[[-4,0,-1.5],[-1.2,HM,1.5]]}:full});
})();
