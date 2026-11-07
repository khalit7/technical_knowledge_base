// ---- Scene: Fig. 1, the hero (section 0; renderer v2). Two glass plates: compile time above, run time on the floor.
// Data: TB.snip['03_strip'] (demo.ts and Node's stripped output: which characters are type syntax) and TB.zodlab (the ten recorded
// model replies, each read by a cast and by the default zod schema in src/tb/zodlab/lab.ts). Nothing here is illustrative except the layout. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.TB)return;const {at,cl,mix,lerp}=S3;
  // demo.ts: characters that Node's stripper turned into spaces are type syntax
  const s3=TB.snip['03_strip'],src=s3.helpers[0].code.split('\n');
  const stripped=s3.out.split('\n').filter(l=>!/^\$ /.test(l)&&!/ExperimentalWarning|--trace-warnings/.test(l)).slice(0,src.length);
  let tc=0,nb=0;src.forEach((l,i)=>{const s=stripped[i]||'';[...l].forEach((c,k)=>{if(c!==' '){nb++;if(s[k]===' ')tc++}})});
  const tFrac=tc/nb;
  // the ten replies: how the cast and the default zod schema handled each
  const kind=(r,w)=>{const c=r.cells.find(x=>x.way===w);return c.threw?'crash':/^rejected/.test(c.out)?'caught':(w==='as'&&/^rejected/.test(r.cells.find(x=>x.way==='zod').out))?'silent':'ok'};
  const R0=TB.zodlab,cast=R0.map(r=>kind(r,'as')),zod=R0.map(r=>kind(r,'zod'));
  const cnt=(a,k)=>a.filter(x=>x===k).length;
  window.TB_HERO={tc,nb,cast:{ok:cnt(cast,'ok'),silent:cnt(cast,'silent'),crash:cnt(cast,'crash')},zod:{ok:cnt(zod,'ok'),caught:cnt(zod,'caught')},n:R0.length};
  const H=1.9,AX=-3.3,TX=-1.0,GX=1.5,OX=3.5,LANE={ok:-1,silent:0,crash:1,caught:0};
  const slot=(i)=>[OX-.25+(i%2)*.48,0,-1.1+Math.floor(i/2)*.55];
  function draw(R,k,e){const P=R.P;R.grid(-5,5.2,-2.4,2.4,.5);
    const col={ok:P.good,silent:P.c5,crash:P.bad,caught:P.c2};
    // the two plates: compile time (glass, above) and run time (the floor)
    R.glass([-4.6,H,-1.1],[7.0,0,0],[0,0,2.2],{c:P.c1,nu:12,nv:4,a:k<=1?.8:.45});
    R.label([-4.6,H,-1.1],'COMPILE TIME · tsc',{al:'left',dx:6,dy:-12,fs:12.5,b:1,c:P.c1});
    R.label(k<=1?[-4.3,0,1.2]:[4.4,0,2.0],'RUN TIME · Node, Bun, a browser',{al:k<=1?'left':'right',dx:k<=1?4:-4,dy:14,fs:12.5,b:1,c:P.acc,wide:1});
    // 1. app.ts: the JavaScript body plus a layer of type syntax (its share is demo.ts's real share), checked by tsc
    const bh=.62,th=bh*tFrac,jh=bh-th,drop=k===0?0:k===1?S3.ease(e):1,y=lerp(H,0,drop);
    R.box([AX,y,0],[1.3,jh,1.0],{fill:P.paper,shadow:y<.05});
    const ta=k===0?1:k===1?1-e:0;R.box([AX,H+jh,0],[1.3,th,1.0],{fill:mix(P.paper,P.c5,.75),a:ta,shadow:false});
    R.label([AX,y+bh+.05,0],k===0||(k===1&&e<.5)?'app.ts':'app.js',{mono:true,fs:13,b:1,dy:-12});
    if(k===0)R.label([AX,H,.5],tc+' of '+nb+' characters are types',{fs:12,b:1,c:P.c5,dy:16,a:e});
    R.box([TX,H,0],[1.1,.5,.9],{fill:mix(P.paper,P.c1,.18),shadow:false,a:k<=1?1:.45});R.label([TX,H+.5,0],'tsc',{mono:true,fs:13,b:1,dy:-12,a:k<=1?1:.6});
    if(k===0){R.flow([[AX+.65,H+.3,0],[TX-.55,H+.3,0]],{c:P.c1,a:e,r:.06,speed:1.2});R.label([TX,H,.5],'checks what it can see',{fs:12,c:P.c1,dy:14,a:e,wide:1})}
    // 2. erased on the way down
    if(k===1){R.flow([[AX,H-.05,0],[AX,.7,0]],{c:P.mute,a:1-e*.5,r:.05,speed:.9});
      R.label([AX+.8,H*.55,0],'types erased: stripped or compiled',{al:'left',dx:8,fs:12,b:1,c:P.c5,a:cl(e*2,0,1)})}
    if(k===1)R.label([AX,0,.55],'plain JavaScript, no types',{fs:12,c:P.mute,dy:16,a:e,wide:1});
    // 3. data from outside: the ten recorded replies queue at the edge of the program
    const ra=at(k,e,2);
    if(ra>0){R.box([OX+1.2,0,0],[.5,.8,1.9],{fill:mix(P.paper,P.c4,.25),a:ra});R.label([OX+1.2,.8,0],'LLM',{fs:12.5,b:1,dy:-12,a:ra});
      if(k===2)R.flow([[OX+.85,.35,0],[OX+.3,.35,0]],{c:P.c4,a:ra,r:.06,speed:1})}
    if(k>=2&&k<=4){
      // where each reply ends: at step 4 (the cast) every one reaches the program; at step 5 (zod) only the valid ones do
      const ways=k===3?cast:zod,ph=k===2?0:k===3?e:cl((e-.35)/.65,0,1),fadeOld=k===4?cl(1-e/.3,0,1):0;
      const lanes={};R0.forEach((r,i)=>{const w=ways[i],q=(lanes[w]=(lanes[w]||0)+1)-1,
          end=w==='caught'?[GX+.5+(q%2)*.46,0,-.9+Math.floor(q/2)*.6]:[AX+1.1+q*.46,0,LANE[w]];
        const s0=slot(i),t=cl(ph*1.4-i*.04,0,1),p=[lerp(s0[0],end[0],t),0,lerp(s0[2],end[2],t)];
        const c=k===2||t<.98?mix(P.paper,P.c4,.35):col[w];
        if(k===4&&fadeOld>0){const cq=(lanes['o'+cast[i]]=(lanes['o'+cast[i]]||0)+1)-1;R.box([AX+1.1+cq*.46,0,LANE[cast[i]]],[.34,.34,.34],{fill:col[cast[i]],a:fadeOld})}
        R.box(p,[.34,.34,.34],{fill:c,a:k===4?cl((e-.25)/.15,0,1):ra});
        if(k>=3&&t>0)R.flow(w==='caught'?[[s0[0],.15,s0[2]],[end[0],.15,end[2]]]:[[s0[0],.15,s0[2]],[GX,.15,lerp(s0[2],end[2],.5)],[end[0],.15,end[2]]],{c:col[w],a:t<1?.6:.3,r:.045,n:4,speed:1.6})});
      if(k===2)R.label([OX+.05,.3,-1.3],R0.length+' replies',{fs:12.5,b:1,c:P.c4,dy:-14});
      if(k===3&&e>.75)[['ok',cast,'correct'],['silent',cast,'printed wrong data'],['crash',cast,'crashed']].forEach(([w,a,t])=>R.label([AX+1.1+(cnt(a,w)-1)*.46+.25,.17,LANE[w]],cnt(a,w)+' '+t,{al:'left',dx:8,fs:12.5,b:1,c:col[w],grp:'res'}));
      if(k===4&&e>.8){R.label([AX+1.1+(cnt(zod,'ok')-1)*.46+.25,.17,LANE.ok],cnt(zod,'ok')+' correct',{al:'left',dx:8,fs:12.5,b:1,c:P.good,grp:'res'});
        R.label([GX+1.2,.3,.3],cnt(zod,'caught')+' rejected, with a reason',{al:'left',dx:8,fs:12.5,b:1,c:P.c2,grp:'res'})}}
    // 4. a cast: nothing stands at the boundary at run time
    if(k===3){R.quad([[GX,0,-1.3],[GX,0,1.3],[GX,1.2,1.3],[GX,1.2,-1.3]],{ec:P.bad,dash:[5,4],a:e,ea:.9});R.label([GX,1.2,-1.3],'as Answer: not there at run time',{fs:12.5,b:1,c:P.bad,dy:-12,a:e})}
    // 5. a zod schema: a real value, so it stands on both plates; z.infer gives tsc the type, parse checks each reply
    if(k===4){const ga=cl(e*2.5,0,1);R.glass([GX,0,-1.3],[0,0,2.6],[0,H+.55,0],{c:P.good,nu:4,nv:5,a:ga});
      R.label([GX,H+.55,0],'zod schema',{mono:true,fs:13,b:1,c:P.good,dy:-12,a:ga});
      R.flowArc([GX,H+.3,0],[TX+.55,H+.35,0],.35,{c:P.good,a:ga,r:.06,speed:1.1});R.label([(GX+TX)/2+.3,H+.75,0],'z.infer: the type',{mono:true,fs:12,b:1,c:P.good,dy:-8,a:ga,wide:1});
      R.label([GX,0,1.3],'.parse: the check',{mono:true,fs:12,b:1,c:P.good,dy:16,a:ga,wide:1})}
  }
  const full={cam:[.62,.34],bounds:[[-4.7,0,-1.6],[4.6,2.6,1.7]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · compile time above, run time below',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1700,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[22,20,16,20],
    // steps 1 and 2 are about the program alone: in close on it and tsc
    view:k=>k<=1?{cam:[.55,.42],bounds:[[-4.7,0,-1.2],[.2,2.7,1.2]]}:full});
})();
