// ---- Scene: why depth is the limit (renderer v2). The fixed-depth reader of the lab (22_js_graph.js, GR.layers) on the hero's graph
// (10 vertices, "long paths", seed 13): layer 0 is I or A as a 10 x 10 Boolean matrix on a glass plate; each further layer squares it,
// so layer l knows every pair within 2^l hops. Row s (orange) is what the reader knows from s; dots stream from the rows that row s
// already reaches into the next plate's row s (the OR over m of R[s][m] AND R[m][j]). window.__sq carries the numbers for the checks.
(function(){
  if(!document.getElementById('stg-sq')||!window.GR)return;const {at,off,lerp,mix}=S3;
  const g=GR.graph(10,'local',13),N=g.N,K=3,L=GR.layers(g,K),CS=.26,W=CS*N,GAP=1.1,s=g.s,t=g.t;
  const xc=l=>(l-K/2)*(W+GAP),cx=(l,j)=>xc(l)-W/2+CS*(j+.5),cz=i=>W/2-CS*(i+.5);
  const reach=l=>{const r=[];for(let j=0;j<N;j++)if(L[l][s][j])r.push(j);return r};
  window.__sq={rows:L.map((_,l)=>reach(l)),ones:L.map(M=>M.reduce((a,r)=>a+r.reduce((x,y)=>x+y,0),0)),st:L.map(M=>!!M[s][t]),gates:N*N*N};
  function plate(R,l,a,grow){const P=R.P,M=L[l];if(a<=.01)return;
    R.glass([xc(l)-W/2,.01,-W/2],[W,0,0],[0,0,W],{c:P.c1,a:a*.8,nu:N,nv:N,th:.03});
    for(let i=0;i<N;i++)for(let j=0;j<N;j++)if(M[i][j]){const row=i===s,newer=l>0&&!L[l-1][i][j],h=(row?.34:.12)*(newer?grow:1);
      R.box([cx(l,j),.02,cz(i)],[CS*.66,Math.max(.01,h),CS*.66],{a:a*(row?1:.75),fill:row?mix(P.paper,P.c2,.75):mix(P.paper,P.c1,newer?.6:.3),shadow:false,lw:.6})}
    // the (s, t) cell: ringed until it lights
    {const x=cx(l,t),z=cz(s),h=CS*.5;R.line([[x-h,.04,z-h],[x+h,.04,z-h],[x+h,.04,z+h],[x-h,.04,z+h],[x-h,.04,z-h]],{c:M[s][t]?P.good:P.bad,w:2.4,a});R.glow([x,.05,z],.22,{c:M[s][t]?P.good:P.bad,a:a*.9})}
    R.label([xc(l),0,W/2+.25],'layer '+l+': ≤ '+(2**l)+(l?' hops':' hop'),{mono:true,fs:12,b:1,dy:16,c:P.ink,a:Math.max(.35,a)});
    R.label([xc(l)-W/2-.05,.2,cz(s)],'s',{al:'right',dx:-4,fs:13,b:1,c:P.c2,a});
    R.label([cx(l,t),.25,-W/2],'t',{fs:13,b:1,dy:-8,c:P.ink,a})}
  function feed(R,l,a){const P=R.P;if(a<=.01||l<1)return;const to=[xc(l)-W/2+.1,.36,cz(s)];
    reach(l-1).forEach(m=>R.flowArc([xc(l-1)+W/2-.1,.14,cz(m)],to,.9,{c:P.c2,a:a*.85,r:.055,n:7,speed:1.4}))}
  function draw(R,k,e){R.grid(-8,8,-3,3,.5);
    for(let l=0;l<=K;l++){let a;
      if(k<4){a=l===k?(l===0?1:e):l===k-1?.55:l<k-1?.18:0}else a=1;
      plate(R,l,a,k===l?e:1)}
    if(k>=1&&k<=3)feed(R,k,1);if(k===4)for(let l=1;l<=K;l++)feed(R,l,.45)}
  const B=(l0,l1)=>[[xc(l0)-W/2-.6,0,-W/2-.2],[xc(l1)+W/2+.3,.6,W/2+.6]];
  S3.stage({id:'stg-sq',list:'sx-sq',fig:'Fig. 2 · the fixed-depth reader, one squaring per layer (the lab\'s engine)',cam:[.3,.82],bounds:B(0,K),aspect:.5,
    margin:w=>w<520?[14,10,14,10]:[16,14,14,14],dur:1800,hold:4600,draw,
    view:k=>k===0?{cam:[.3,.9],bounds:B(0,0)}:k<4?{cam:[.3,.82],bounds:B(k-1,k)}:{cam:[.25,.8],bounds:B(0,K)}});
})();
