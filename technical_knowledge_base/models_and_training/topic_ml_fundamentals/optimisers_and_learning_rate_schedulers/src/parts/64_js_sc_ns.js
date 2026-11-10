// ---- Scene (section 4, Fig. 4): Muon's five Newton-Schulz iterations on the singular values of one real gradient (renderer v2) ----
// NS_SV (45_js_ns_0data.js, from ns_data.py): the 32 nonzero singular values of the parent page's toy gradient (layer 8's first FFN matrix,
// 64 x 176), Frobenius norm 1. Each iteration maps every singular value s to a s + b s^3 + c s^5 and keeps the singular vectors, so the scalar maps are exact.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-ns')||!window.S3||!window.NS_SV)return;const {at,off,lerp,mix}=S3;
  const a=3.4445,b=-4.775,c=2.0315,p=s=>a*s+b*s*s*s+c*s*s*s*s*s,IT=[NS_SV.slice()];for(let i=0;i<5;i++)IT.push(IT[i].map(p));
  const n=NS_SV.length,DX=.225,x=i=>(i-(n-1)/2)*DX,HS=2.1,lo=v=>Math.min(...v),hi=v=>Math.max(...v),f2=v=>v.toFixed(2);
  function writeList(){const set=(k,v)=>document.querySelectorAll('[data-ns="'+k+'"]').forEach(e=>e.textContent=v);
    [0,1,2,5].forEach(i=>{set('lo'+i,f2(lo(IT[i])));set('hi'+i,f2(hi(IT[i])))});set('r0',(hi(IT[0])/lo(IT[0])).toFixed(1));set('r5',(hi(IT[5])/lo(IT[5])).toFixed(2));set('n',n)}
  // the map every value goes through, on a glass plate to the right: input s across, output p(s) up
  const MX0=4.4,MW=2.4,MS=MW/1.3,mp=(s,v)=>[MX0+s*MS,v*MS,0];
  function draw(R,k,e){const P=R.P,cS=P.c1,cO=P.c3;R.grid(-4.4,6.8,-1.8,1.6,.5);
    // the heights now: steps 2 and 3 run one iteration each, step 4 runs iterations 3 to 5 in turn
    let v,prev=null;if(k===0)v=IT[0];else if(k<=2){prev=IT[k-1];v=IT[k-1].map((s,i)=>lerp(s,IT[k][i],e))}
    else if(k===3){const u=e*3,j=Math.min(2,Math.floor(u)),t=u-j;prev=IT[2+j];v=IT[2+j].map((s,i)=>lerp(s,IT[3+j][i],t))}else v=IT[5];
    // the matrix the values describe, a glass plate behind the columns, with its strength flowing into them on step 1
    const ma=k===0?1:.35;R.glass([x(0)-.2,0,-.9],[x(n-1)-x(0)+.4,0,0],[0,1.1,0],{c:cS,a:ma,nu:16,nv:6});
    if(k===0)R.label([x(0)-.2,1.1,-.9],'U: the momentum of one 64 × 176 matrix',{fs:12.5,b:1,c:cS,al:'left',dy:-10,a:ma});
    if(k===0)for(let i=0;i<n;i+=4)R.flowArc([x(i),.6,-.85],[x(i),IT[0][i]*HS,0],.25,{c:cS,a:.8*e,r:.045,n:3,speed:.8});
    // ghost of the gradient's own values, once the iterations start
    if(k>=1)IT[0].forEach((s,i)=>R.box([x(i),0,.32],[.13,Math.max(.01,s*HS),.13],{fill:mix(P.paper,P.mute,.35),a:.5,shadow:false,lw:.5}));
    v.forEach((s,i)=>R.box([x(i),0,0],[.16,Math.max(.012,s*HS),.16],{fill:mix(P.paper,k===0?cS:cO,.8),shadow:false,lw:.6}));
    // orthogonal = every value 1: a glass plane at that height
    const pa=k>=2?(k===2?e:1):0;if(pa>.01){R.glass([x(0)-.25,HS,-.35],[x(n-1)-x(0)+.5,0,0],[0,0,.7],{c:P.c2,a:pa*.8,nu:16,nv:1,th:.01});
      R.label([x(0)-.25,HS,0],'orthogonal: every value 1',{mono:true,fs:12.5,b:1,c:P.c2,al:'right',dx:-8,a:pa})}
    const ix=[0,n-1];ix.forEach(i=>R.label([x(i),v[i]*HS,0],f2(v[i]),{mono:true,fs:12.5,b:1,c:k===0?cS:cO,dy:-12}));
    R.label([x(0),0,.5],'strongest',{fs:12,c:P.mute,dy:14,wide:1});R.label([x(n-1),0,.5],'weakest',{fs:12,c:P.mute,dy:14,wide:1});
    // the scalar map, drawn from step 2: dots stream from each value's input to its output
    const ma2=R.W<520?0:k>=1?(k===1?e:k===4?1-e:1):0;if(ma2>.01){R.glass([MX0,0,0],[MW,0,0],[0,MW,0],{c:P.c4,a:ma2*.7,nu:6,nv:6});
      const cur=[],dia=[];for(let i=0;i<=40;i++){const s=1.3*i/40;cur.push(mp(s,Math.min(1.3,p(s))));dia.push(mp(s,s))}
      R.line(dia,{c:P.mute,w:1.2,dash:[4,4],a:ma2,top:1});R.line(cur,{c:P.c4,w:2.4,a:ma2,top:1});
      R.label(mp(1.3,1.3),'out = in',{fs:12,c:P.mute,dy:-10,al:'right',a:ma2,wide:1});R.label(mp(.65,1.3),'σ → aσ + bσ³ + cσ⁵',{mono:true,fs:12.5,b:1,c:P.c4,dy:-12,a:ma2});
      if(prev&&k<=3)prev.forEach((s,i)=>{if(i%3)return;R.flow([mp(s,0),mp(s,Math.min(1.3,p(s)))],{c:cO,a:ma2*.8,r:.04,n:3,speed:.9,top:1})})}
  }
  const nar=()=>$('stg-ns').clientWidth<520,full0={cam:[.28,.42],bounds:[[x(0)-.4,0,-1],[MX0+MW+.2,2.5,.6]]},fullN={cam:[.3,.5],bounds:[[x(0)-.3,0,-1],[x(n-1)+.3,2.5,.6]]},full=()=>nar()?fullN:full0;
  S3.stage({id:'stg-ns',list:'sx-ns',fig:'Fig. 4 · Newton-Schulz on the singular values of one real gradient',cam:full0.cam,bounds:()=>full().bounds,aspect:.4,dur:2400,hold:4600,draw,
    margin:w=>w<520?[18,10,22,10]:[26,20,26,210],
    view:k=>k===4?{cam:[.22,.3],bounds:[[x(0)-.4,0,-.6],[x(n-1)+.4,2.5,.6]]}:full()});
  writeList();
})();
