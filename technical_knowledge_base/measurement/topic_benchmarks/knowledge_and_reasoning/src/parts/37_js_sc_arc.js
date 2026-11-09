// ---- Scene: Fig. 3, exact match or nothing (stg-arc, renderer v2) ----
// ARC-AGI-1 training task 007bbfb7 as fetched into window.KR.arc: the chosen pair's 3×3 input stands on a plinth, the 81 output cells are built
// block by block under Rule A (copy the whole input into the block of every coloured cell) or Rule B (blow every cell up to a 3×3 block), with dots
// flowing from the input cell that decides each block; then the real output is uncovered and the built grid is graded cell by cell.
(function(){
  if(!document.getElementById('stg-arc')||!window.S3||!window.KR)return;const {mix,lerp,cl}=S3;
  const T=window.KR.arc.find(t=>t.id==='007bbfb7');if(!T)return;
  const PAIRS=T.train.map((p,i)=>({lab:'Demo '+(i+1),p})).concat(T.test.map(p=>({lab:'Test',p})));
  const RULE={a:g=>{const o=[];for(let r=0;r<9;r++){o.push([]);for(let c=0;c<9;c++)o[r].push(g[Math.floor(r/3)][Math.floor(c/3)]?g[r%3][c%3]:0)}return o},
    b:g=>{const o=[];for(let r=0;r<9;r++){o.push([]);for(let c=0;c<9;c++)o[r].push(g[Math.floor(r/3)][Math.floor(c/3)])}return o}};
  let rule='a',pi=0;
  const match=(rl,p)=>{const o=RULE[rl](p.input);let m=0;for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(o[r][c]===p.output[r][c])m++;return m};
  window.KRS=window.KRS||{};KRS.arc={a:PAIRS.map(x=>match('a',x.p)),b:PAIRS.map(x=>match('b',x.p))};
  const XI=-3.5,XO=-.1,XR=3.35,SI=.42,SO=.27,HP=.32,win=(e,a,b)=>cl((e-a)/(b-a),0,1);
  function tile(R,P,x,y,z,s,v,a,o){R.box([x,y,z],[s*.93,.06,s*.93],Object.assign({fill:window.KU.ARC[v],a,shadow:false,lw:.5},o||{}))}
  function slot(R,P,x,z,s,a){const h=s*.44;R.quad([[x-h,.01,z-h],[x+h,.01,z-h],[x+h,.01,z+h],[x-h,.01,z+h]],{a:a*.9,ec:P.mute,lw:.8,dash:[2,2]})}
  function draw(R,k,e){const P=R.P,pr=PAIRS[pi].p,g=pr.input,out=RULE[rule](g),exp=pr.output;R.grid(-5,5,-1.9,1.9,.5);
    // the input on its plinth; the cell deciding the block being built glows
    const ia=k===5?0:k===4?1-e:1;R.box([XI,0,0],[3*SI+.2,HP,3*SI+.2],{a:ia});
    const cur=k>=1&&k<=3?(k-1)*3+Math.min(2,Math.floor(e*3)):-1;
    for(let r=0;r<3;r++)for(let c=0;c<3;c++){const x=XI+(c-1)*SI,z=(r-1)*SI,on=r*3+c===cur&&e<1;tile(R,P,x,HP,z,SI,g[r][c],ia);if(on)R.glow([x,HP+.08,z],SI*.9,{c:P.acc,a:.9})}
    R.label([XI,0,1.5*SI+.1],(PAIRS[pi].lab==='Test'?'test input':'input')+' · 3×3',{fs:12.5,b:1,dy:14,a:ia});
    // the output, built one row of blocks per step
    const built=b=>{const row=Math.floor(b/3)+1;if(k>row)return 1;if(k<row)return 0;return win(e,(b%3)/3,(b%3)/3+.34)};
    const grade=k>=5?(k===5?e:1):0;let right=0;
    for(let r=0;r<9;r++)for(let c=0;c<9;c++){const b=Math.floor(r/3)*3+Math.floor(c/3),u=built(b),x=XO+(c-4)*SO,z=(r-4)*SO,ok=out[r][c]===exp[r][c];if(ok)right++;
      if(u<=0){slot(R,P,x,z,SO,1);continue}
      const lift=!ok?.32*grade:0,y=(1-u)*.9+lift;tile(R,P,x,y,z,SO,out[r][c],Math.min(1,u*1.4)*(grade>0&&ok?1-.35*grade:1),!ok&&grade>0?{ec:P.bad,lw:1.6}:null);
      if(!ok&&grade>.05)R.glow([x,y+.07,z],SO*.8,{c:P.bad,a:.85*grade})}
    // dots from the deciding input cell into its block while it is built
    if(cur>=0&&e<1){const br=Math.floor(cur/3),bc=cur%3,from=[XI+(bc-1)*SI,HP+.1,(br-1)*SI],to=[XO+(bc*3+1-4)*SO,.12,(br*3+1-4)*SO];R.flowArc(from,to,.7,{c:P.acc,a:.9,r:.06,n:7,speed:1.6})}
    R.label([XO,0,4.5*SO+.1],(rule==='a'?'Rule A':'Rule B')+' output · 9×9',{fs:12.5,b:1,dy:14,c:rule==='a'?P.c1:P.q});
    // the real output: covered until step 5
    const rv=k>=4?(k===4?e:1):0;
    for(let r=0;r<9;r++)for(let c=0;c<9;c++){const x=XR+(c-4)*SO,z=(r-4)*SO;if(rv<=0)slot(R,P,x,z,SO,1);else tile(R,P,x,0,z,SO,exp[r][c],rv)}
    if(rv<1)R.glass([XR-4.6*SO,.12+.6*rv,-4.6*SO],[9.2*SO,0,0],[0,0,9.2*SO],{c:P.mute,a:(1-rv)*.9,nu:3,nv:3});
    R.label([XR,0,4.5*SO+.1],rv<1?(PAIRS[pi].lab==='Test'?'real output · hidden from the solver':'real output · covered until graded'):'real output',{fs:12.5,b:1,dy:14,c:rv<1?P.mute:P.ink});
    if(grade>0){const okAll=right===81;R.label([XO,.35,-4.5*SO-.3],okAll?'81 of 81 cells right: solved, score 1':right+' of 81 cells right: task score 0',{fs:13.5,b:1,dy:-14,c:okAll?P.good:P.bad,a:grade})}
  }
  const full={cam:[0,.92],bounds:[[-4.4,0,-1.6],[4.6,.6,1.7]]};
  function readout(k){const el=document.getElementById('ar-cnt');if(!el)return;const pr=PAIRS[pi].p,m=match(rule,pr),blocks=k===0?0:Math.min(9,k*3);
    el.innerHTML=KU.stat('Pair',PAIRS[pi].lab)+KU.stat('Blocks built',blocks+' of 9')+KU.stat('Cells matching',k>=5?m+' of 81':'?','graded at the last step')+KU.stat('Task score',k>=5?(m===81?'1 (solved)':'0'):'?','exact match, no partial credit')}
  const st=S3.stage({id:'stg-arc',list:'sx-arc-a',fig:'Fig. 3 · ARC-AGI-1 task 007bbfb7, exact match',cam:full.cam,bounds:full.bounds,aspect:.46,dur:2400,hold:4600,draw,
    margin:w=>w<520?[18,8,22,8]:[26,16,28,16],
    view:k=>k===5?{cam:[.06,.9],bounds:[[-1.6,0,-1.45],[4.6,.6,1.7]]}:full,
    onStep:k=>{try{readout(k)}catch(err){}}});
  const pb=document.getElementById('ar-pair');pb.innerHTML=PAIRS.map((x,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+x.lab+'</button>').join('');
  const lid=()=>rule==='a'?'sx-arc-a':'sx-arc-b';
  KU.seg(pb,m=>{pi=+m;st.list(lid())});
  KU.seg(document.getElementById('ar-rule'),m=>{rule=m;document.getElementById('sx-arc-a').hidden=m!=='a';document.getElementById('sx-arc-b').hidden=m==='a';st.list(lid())});
  readout(0);
})();
