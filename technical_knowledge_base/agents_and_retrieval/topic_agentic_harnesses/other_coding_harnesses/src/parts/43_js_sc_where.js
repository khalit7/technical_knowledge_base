// ---- Scene: Fig. 4, where the loop runs (section 7, renderer v2). Structure from the sources in section 7: the parts of a harness glide
// between your side (front) and the provider's (back) for the three shapes: terminal, cloud agent, hosted loop. Not to scale. ----
(function(){
  if(!document.getElementById('stg-where'))return;const {mix,lerp3}=S3;
  const ZY=1.25,ZP=-1.25;
  // part: label, colour key, [x,z] per step (null: absent in that step)
  const PARTS=[['the loop','c2',[[-2.6,ZY],[-2.6,ZP],[-2.6,ZP]]],['context policy','c4',[[-1.2,ZY],[-1.2,ZP],[-1.2,ZP]]],
    ['tools run','c1',[[.2,ZY],[.2,ZP],[.6,ZY]]],['permissions','c5',[[1.6,ZY],null,[2.0,ZY]]],['the model','c3',[[1.8,ZP],[1.8,ZP],[1.6,ZP]]],
    ['pull request','good',[null,[.2,ZY],null]]];
  const SUB=['','container','if you host the sandbox'];
  function draw(R,k,e){const P=R.P;R.grid(-4,4,-2.6,2.8,.5);
    R.box([0,0,ZY],[7,.08,1.5],{fill:mix(P.paper,P.acc,.12),shadow:false,dz:40});R.box([0,0,ZP],[7,.08,1.5],{fill:mix(P.paper,P.mute,.15),shadow:false,dz:40});
    R.label([-3.4,.08,ZY+.7],'your side',{al:'left',dy:-4,fs:12.5,b:1,c:P.acc});R.label([-3.4,.08,ZP+.7],'provider',{al:'left',dy:-4,fs:12.5,b:1,c:P.mute});
    const pos={};
    PARTS.forEach(([nm,ck,ps])=>{const cur=ps[k],prev=k>0?ps[k-1]:cur;let p,a;
      if(cur&&prev){p=lerp3([prev[0],.08,prev[1]],[cur[0],.08,cur[1]],e);a=1}else if(cur){p=[cur[0],.08,cur[1]];a=e}else if(prev){p=[prev[0],.08,prev[1]];a=1-e}else return;
      if(a<=.01)return;pos[nm]=p;const c=P[ck];
      R.box(p,[1.0,.42,.7],{fill:mix(P.paper,c,.3),a});
      R.label([p[0],p[1]+.42,p[2]],nm,{fs:12,b:1,c,dy:-9,a});
      if(nm==='tools run'&&SUB[k])R.label([p[0],p[1],p[2]+.35],SUB[k],{fs:12,c:P.mute,dy:14,a:a*e,wide:1})});
    const up=(p,h)=>[p[0],p[1]+(h||.3),p[2]];
    // what crosses between the two sides in each shape
    if(e>.6&&pos['the loop']&&pos['the model']){const a=(e-.6)/.4;
      if(k===0){R.flowArc(up(pos['the loop']),up(pos['the model']),.6,{c:P.c2,r:.05,n:8,a});R.flowArc(up(pos['the model'],.2),up(pos['the loop'],.2),.3,{c:P.c3,r:.05,n:6,a})}
      else R.flowArc(up(pos['the loop'],.2),up(pos['the model'],.2),.3,{c:P.c2,r:.04,n:5,a:a*.7})}
    if(k===1&&pos['pull request']&&e>.6)R.flowArc(up(pos['tools run']),up(pos['pull request']),.6,{c:P.good,r:.06,n:8,a:(e-.6)/.4});
    if(k===2&&pos.permissions&&e>.6){const a=(e-.6)/.4;R.flowArc(up(pos['the loop']),up(pos.permissions),.7,{c:P.c2,r:.05,n:8,a});R.flowArc(up(pos.permissions,.2),up(pos['the loop'],.2),.4,{c:P.c5,r:.05,n:6,a})}
  }
  S3.stage({id:'stg-where',list:'sx-where',fig:'Fig. 4 · the further the loop moves, the less you see',cam:[.12,.72],bounds:[[-3.6,0,-2.0],[3.6,.9,2.0]],aspect:.56,dur:1800,hold:5600,draw,
    margin:w=>w<520?[22,10,14,10]:[26,16,16,90]});
})();
