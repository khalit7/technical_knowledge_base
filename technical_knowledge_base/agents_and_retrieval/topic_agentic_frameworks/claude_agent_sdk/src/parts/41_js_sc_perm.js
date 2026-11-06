// ---- Scene: Fig. 2, the permission check (section 5, renderer v2). The six stages of the documented order as glass gates inside Claude Code;
// every main-thread tool call of runs s1, s2 and s3 is a ball, grouped by the stage that settled it, read from the recording (hook output,
// callback log, refusal text): the same classification the old stepper used. Stage 1 (your hooks) and stage 6 (your can_use_tool) are your code
// (green); 2 to 5 are Claude Code's rules (blue). Allowed calls go on to the tool; refused ones go back to the model as an error result. ----
(function(){
  if(!document.getElementById('stg-perm'))return;const {at,mix,lerp,lerp3}=S3;
  const F=window.FSDK,R0=F.runs,esc=RD.esc;
  const RO=new Set(['mcp__repo__list_files','mcp__repo__read_file']);
  const argOf=inp=>inp?(inp.path||inp.file_path||inp.command||inp.skill||''):'';
  // each main-thread tool call of a run: the stage that settled it (0..5) and the verdict
  function calls(L){const ev=R0[L].ev,res={},denied=new Set();
    ev.forEach(e=>{if(e[0]==='res')res[e[4]]={text:e[3],err:e[5]};if(e[0]==='denied')denied.add(e[4])});
    const perms=ev.filter(e=>e[0]==='cb'&&e[3].kind==='permission').map(e=>e[3]);let pi=0;const out=[];
    ev.forEach(e=>{if(e[0]!=='call'||e[2])return;const name=e[3],id=e[5];let at,v;
      if(L==='s3_bare'){if(denied.has(id)){at=5;v='deny'}else{at=4;v='allow'}}
      else if(RO.has(name)){at=0;v='allow'}
      else if(name==='StructuredOutput'){at=4;v='allow'}
      else{const p=perms[pi++]||{};at=5;v=p.decision||'allow'}
      out.push({name:name.replace('mcp__repo__',''),arg:String(argOf(e[4])),at,v})});
    return out}
  // steps: the queue, then one step per (stage, verdict) group in the order of the gates, then the tally
  const ORD=[[0,'allow'],[4,'allow'],[5,'allow'],[5,'deny']];
  const RUNS={s1_wire:'sx-perm-s1',s2_deny:'sx-perm-s2',s3_bare:'sx-perm-s3'};
  const D={};Object.keys(RUNS).forEach(L=>{const c=calls(L),g=ORD.filter(([a,v])=>c.some(x=>x.at===a&&x.v===v));c.forEach(x=>x.g=1+g.findIndex(([a,v])=>x.at===a&&x.v===v));D[L]={c,g,n:g.length+2}});
  let L='s1_wire';
  const GN=['hooks','deny rules','ask rules','mode','allow rules','can_use_tool'],GX=i=>-2.75+i*1.1,MX=-4.9,TX=4.2,ZW=.75;
  function draw(R,k,e){const P=R.P,d=D[L],nar=R.W<520,cs=d.c,n=cs.length,bare=L==='s3_bare',last=k===d.n-1;R.grid(-6,5.4,-2.4,2.4,.5);
    const cur=k>=1&&k<d.n-1?d.g[k-1]:null;
    // the model, where calls come from, and the tool, where allowed calls go
    R.box([MX,0,0],[1.1,.75,1.6],{fill:mix(P.paper,P.c2,.25)});R.label([MX,.75,0],'model',{fs:13.5,b:1,c:P.c2,dy:-14});R.label([MX,0,.8],'its tool calls',{fs:12,c:P.mute,dy:16,wide:1});
    R.box([TX,0,0],[1.1,.75,1.6],{fill:mix(P.paper,P.acc,.2)});R.label([TX,.75,0],'tool runs',{fs:13.5,b:1,c:P.acc,dy:-14});
    // the six gates; your code's two stand on green, and reach back to your process
    GN.forEach((g,i)=>{const mine=i===0||i===5,absent=bare&&mine,hl=cur&&cur[0]===i,c=mine?P.good:P.acc,a=absent?.18:cur?(hl?1:.35):1;
      R.glass([GX(i),.02,-ZW],[0,0,2*ZW],[0,1.0,0],{c,a,nu:4,nv:4});
      if(!nar||hl||k===0)R.label([GX(i),0,ZW],(i+1)+' · '+g,{fs:12.5,b:hl,c:hl?c:mix(P.ink,c,.3),dy:14,a:Math.max(.55,a)})});
    // your process behind the two gates it owns: the hook and the callback
    [[0,'your hook'],[5,'your callback']].forEach(([i,t])=>{const hl=cur&&cur[0]===i,a=bare?.15:cur?(hl?1:.3):.85;
      R.box([GX(i),0,-2.1],[.95,.45,.6],{fill:mix(P.paper,P.good,.4),a});R.label([GX(i),.45,-2.1],bare?'none given':t,{fs:12.5,b:1,c:P.good,dy:-12,a:Math.max(.45,a),wide:1})});
    // balls: where each call is at this step
    const z=j=>(j-(n-1)/2)*Math.min(.22,1.3/Math.max(1,n-1));
    cs.forEach((x,j)=>{const zz=z(j),start=[MX+.75,.5,zz],gate=[GX(x.at)-.18,.5,zz],done=x.v==='allow'?[TX-.75,.5,zz]:[MX+.75,.5,zz+.0];
      let p,a=1,c=x.v==='deny'?P.bad:P.good;
      if(x.g>k||k===0){p=start;c=P.c2;a=k===0?1:.55}
      else if(x.g===k){const t=e;if(t<.55){const u=t/.55;p=lerp3(start,gate,u);c=P.c2}else{const u=(t-.55)/.45;p=x.v==='allow'?lerp3(gate,done,u):R.arcPt(gate,done,.6,u)}}
      else{p=done;a=last?1:.55}
      R.ball(p,.09,{c,a})});
    // flows on the current group's path: to the settling gate, out to your code and back when it is yours, then on to the tool or back to the model
    if(cur){const [gi,v]=cur,cnt=cs.filter(x=>x.g===k).length,nn=Math.max(3,Math.min(12,2+cnt*2)),c=v==='deny'?P.bad:P.good;
      R.flow([[MX+.6,.62,0],[GX(gi)-.12,.62,0]],{c:P.c2,r:.05,n:nn,speed:1.3});
      if((gi===0||gi===5)&&!bare){R.flowArc([GX(gi),.95,-.2],[GX(gi),.5,-2.1],.35,{c:P.c4,r:.05,n:5,speed:1});R.flowArc([GX(gi)+.12,.45,-2.1],[GX(gi)+.12,.95,-.2],.35,{c:P.good,r:.05,n:5,speed:1})}
      if(v==='allow')R.flow([[GX(gi)+.12,.62,.15],[TX-.6,.62,.15]],{c,r:.05,n:nn,speed:1.3});
      else R.flowArc([GX(gi)-.1,.7,.25],[MX+.6,.7,.25],.7,{c,r:.055,n:nn,speed:1.1});
      R.label([GX(gi),1.02,ZW],cnt+(cnt===1?' call ':' calls ')+(v==='deny'?'refused':'allowed'),{fs:13.5,b:1,c,dy:-12,a:e})}
    // the tally under each gate that settled something
    if(last){const cnt={};cs.forEach(x=>{const kk=x.at+x.v;cnt[kk]=(cnt[kk]||0)+1});
      ORD.forEach(([gi,v])=>{const m=cnt[gi+v];if(m)R.label([GX(gi),1.02,ZW],m+' '+(v==='deny'?'refused':'allowed'),{fs:13.5,b:1,c:v==='deny'?P.bad:P.good,dy:v==='deny'?-32:-12})})}
    if(k===0)R.label([MX,0,.8],n+' calls',{fs:13,b:1,c:P.c2,dy:36})}
  // the calls of the run as chips under the step list, the current group marked
  const chips=document.getElementById('fsdk-perm-calls');
  function readout(k){const d=D[L];chips.innerHTML=d.c.map((x,j)=>'<span class="'+(x.g===k?'cur ':'')+(x.g<=k&&k>0?(x.v==='deny'?'no':'ok'):'')+'" title="'+esc(x.arg.slice(0,80))+'">'+(j+1)+'. '+esc(x.name)+'</span>').join('')}
  const full={cam:[.6,.5],bounds:[[-5.5,0,-2.4],[4.8,1.1,1.1]]};
  const st=S3.stage({id:'stg-perm',list:'sx-perm-s1',fig:'Fig. 2 · every tool call through the six stages',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1700,hold:5000,draw,
    margin:w=>w<520?[22,10,14,10]:[34,16,14,16],onStep:k=>{try{readout(k)}catch(err){}}});
  RD.seg(document.getElementById('fsdk-perm-mode'),m=>{L=m;Object.entries(RUNS).forEach(([r,id])=>document.getElementById(id).hidden=r!==L);st.list(RUNS[L])});
})();
