// ---- Scene: Fig. 4, thirty puzzles and every recorded call as a field (renderer v2). One column per puzzle, one row per call or method:
// a tile stands tall and green when that answer has all nine islanders right, and lies flat and red when it does not. Every tile is a
// recorded answer (FM.debate via FMD, 28_js_debate_core.js): five samples, the votes code takes over them, three debate solvers after
// reading each other, the debate's majority, and one judge call. Flows run where answers move: into the votes, between solvers, into the judge. ----
(function(){
  if(!document.getElementById('stg-deb')||!window.FMD||!FMD.P.length)return;const {at,off,mix}=S3;
  const D=FMD,P0=D.P,n=P0.length,by={};D.M.forEach(m=>by[m.id]=m);
  const CALLS=['s1','s2','s3','s4','s5','d1','d2','d3'],cell=(k,p)=>CALLS.includes(k)?D.ok(p,p.calls[k].a):D.ok(p,by[k].ans(p));
  // rows, back to front in the order the story uses them
  const ROWS=[['s1','sample 1'],['s2','sample 2'],['s3','sample 3'],['s4','sample 4'],['s5','sample 5'],['vote3','vote of 3'],['vote5','vote of 5'],
    ['d1','solver 1, round 2'],['d2','solver 2, round 2'],['d3','solver 3, round 2'],['debate','debate (majority)'],['judge','judge over 1 to 3']];
  const Z={};let z=-5.6;ROWS.forEach(([k],i)=>{Z[k]=z;z+=(i===4||i===6||i===9)?1.35:.85});
  const X=j=>(j-(n-1)/2)*.55,TW=.42;
  // which step each row appears at, and the rows each step is about
  const APP={s1:0,s2:0,s3:0,s4:0,s5:0,vote3:1,vote5:1,d1:2,d2:2,d3:2,debate:3,judge:4};
  const FOC=[['s1','s2','s3','s4','s5'],['vote3','vote5'],['d1','d2','d3'],['debate'],['judge']];
  const cnt=k=>P0.filter(p=>cell(k,p)).length;
  const changed=P0.map(p=>[1,2,3].map(i=>[D.ok(p,p.calls['s'+i].a),D.ok(p,p.calls['d'+i].a)]));
  function draw(R,k,e){const P=R.P;R.grid(-9,9,-6.4,6.6,.5);
    ROWS.forEach(([key,name])=>{const s=APP[key];if(k<s)return;const foc=FOC[k].includes(key),a=(k===s?e:1)*(foc?1:.28),zz=Z[key];
      P0.forEach((p,j)=>{const ok=cell(key,p),h=ok?.42:.06;let fill=ok?mix(P.paper,P.good,.55):mix(P.paper,P.bad,.5);
        // round 2: a solver that changed its mind is lit (wrong to right green, right to wrong red)
        if(/^d\d$/.test(key)&&k===2){const [b0,b1]=changed[j][+key[1]-1];if(b0!==b1)R.glow([X(j),h+.05,zz],.32,{c:b1?P.good:P.bad,a:a})}
        if(key==='debate'&&k===3){const a3=['d1','d2','d3'].map(x=>p.calls[x].a);if(a3[0]&&a3.every(x=>x===a3[0])&&a3[0]!==p.truth)R.glow([X(j),.12,zz],.38,{c:P.bad,a})}
        R.box([X(j),0,zz],[TW,h*(k===s?Math.max(.15,e):1),.5],{fill,a,shadow:false,lw:.5})});
      R.label([X(0)-.4,.1,zz],name,{fs:12,al:'right',dx:-6,c:foc?P.ink:P.mute,a:Math.max(.45,a),grp:'rows'});
      R.label([X(n-1)+.4,.1,zz],cnt(key)+' / '+n,{fs:12,mono:true,b:foc,wide:1,al:'left',dx:6,c:foc?(/^s\d$/.test(key)?P.ink:P.c1):P.mute,a:Math.max(.45,a)})});
    // flows where answers move
    const fx=[0,6,12,18,24,29].filter(j=>j<n);
    if(k===1)fx.forEach(j=>{R.flowArc([X(j),.45,Z.s1],[X(j),.45,Z.vote5],.5,{c:P.c2,a:.8,r:.045,n:6});});
    if(k===2)P0.forEach((p,j)=>[1,2,3].forEach(i=>{const [b0,b1]=changed[j][i-1];if(b0===b1)return;
      [1,2,3].filter(o=>o!==i).forEach(o=>R.flowArc([X(j),.45,Z['s'+o]],[X(j),.45,Z['d'+i]],.6,{c:P.c6,a:.85,r:.045,n:7}))}));
    if(k===3)fx.forEach(j=>['d1','d2','d3'].forEach(d=>R.flowArc([X(j),.45,Z[d]],[X(j),.45,Z.debate],.25,{c:P.c4,a:.7,r:.04,n:3})));
    if(k===4)fx.forEach(j=>['s1','s2','s3'].forEach(s=>R.flowArc([X(j),.45,Z[s]],[X(j),.45,Z.judge],.9,{c:P.c4,a:.6,r:.04,n:8})));
    R.label([0,0,Z.judge+.6],'30 puzzles, one column each',{fs:12,c:P.mute,dy:16,wide:1,a:k===0?1:.6});
  }
  const full={cam:[0,1.0],bounds:[[-8.4,0,-6],[8.4,.5,5.9]]};
  const zoom=keys=>{const zs=keys.map(k=>Z[k]);return {cam:[0,.85],bounds:[[-8.4,0,Math.min(...zs)-.8],[8.4,.5,Math.max(...zs)+.8]]}};
  S3.stage({id:'stg-deb',list:'sx-deb',fig:'Fig. 4 · thirty puzzles, every call',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:5200,draw,
    view:k=>k===0?zoom(FOC[0]):k===2?zoom(['s1','d3']):null,
    margin:w=>w<520?[14,10,14,10]:[16,62,14,140]});
})();
