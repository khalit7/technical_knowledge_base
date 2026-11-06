// ---- Scene: Fig. 2, one call through the permission layer (section 3, renderer v2). Driven by the page's gate model (HCCG, 24_js_hcc_gate.js,
// checked against the 96 recorded decisions of the battery) on the twelve recorded actions and seven configurations. The ten checks stand as
// glass gates in the order the harness runs them; the call (a ball) passes the ones it visits, one step per check, and the step list #sx-gate
// is rebuilt from the model's path for each choice: one item per check visited. ----
(function(){
  if(!document.getElementById('stg-gate')||!window.HCCG||!window.HCC)return;const {mix,lerp3}=S3;
  const G=HCCG,D=HCC,MX=D.matrix,esc=RD.esc,cut=(s,n)=>{s=String(s||'');return s.length>n?s.slice(0,n)+' ...':s};
  const selA=document.getElementById('hcc-gate-act'),selC=document.getElementById('hcc-gate-cfg'),list=document.getElementById('sx-gate'),note=document.getElementById('hcc-gate-note');
  const CF=[['perm_manual','Manual (default)'],['perm_acceptEdits','acceptEdits'],['perm_plan','plan'],['perm_dontAsk','dontAsk'],['perm_rules_flag','rules passed with --settings'],['perm_rules','the same rules in the project file (untrusted)'],['hooks_on','acceptEdits plus the guard hook']];
  selA.innerHTML=MX.actions.map((a,i)=>'<option value="'+i+'"'+(i===9?' selected':'')+'>'+(i+1)+'. '+esc(a)+'</option>').join('');
  selC.innerHTML=CF.map(c=>'<option value="'+c[0]+'">'+esc(c[1])+'</option>').join('');
  const NM=['hooks','deny','tool checks','ask','safety','mode','allow','read-only','ask a person','tool runs'];
  const N=G.STAGES.length,GX=i=>-4.3+i*.96,MXX=-5.7,Y=.5;
  const VERD={allow:'runs',deny:'refused',tool:'the tool refuses',classifier:'a classifier decides'};
  let dec=null,act=null;
  function recorded(ai,cid){
    if(cid==='hooks_on'){if(ai===9||ai===8){const r=HCCR.run('hooks_on');const x=r.ev.find(e=>e.k==='res'&&/guard hook/.test(e.s));return x?{o:'denied',m:x.s}:null}return null}
    const col=MX.cols.find(c=>c.id===cid);return col?col.cells[ai]:null}
  function compute(){
    const ai=+selA.value,cid=selC.value;act=Object.assign({},G.ACTS[ai]);
    const col=MX.cols.find(c=>c.id===cid);
    if(col&&ai===6&&col.extra.some(x=>/tests\/test_core/.test(x)))act.readFirst=true; // that run read the test file first
    dec=G.decide(act,G.CFGS[cid]);dec.rec=recorded(ai,cid);
    // one step-list item per check the call visits
    list.innerHTML=dec.path.map((key,j)=>{const i=G.STAGES.findIndex(s=>s.k===key),S=G.STAGES[i],decides=i===dec.stage&&key!=='run';
      if(key==='run')return '<li><b>The tool runs.</b> '+esc(S.d)+'</li>';
      if(decides)return '<li><b>'+esc(S.n)+': '+VERD[dec.o]+'.</b> '+esc(dec.why)+'</li>';
      return '<li><b>'+esc(S.n)+': no match, go on.</b> '+esc(S.d)+'</li>'}).join('');
    const rc=dec.rec;
    note.innerHTML=rc?'Recorded in this configuration: <b>'+({ran:'ran',fail:'ran (the command itself failed)',denied:'refused',tool:'refused by the tool',missing:'not attempted'}[rc.o]||rc.o)+'</b>. Message: <code>'+esc(cut(rc.m,200))+'</code>':'Not recorded in this configuration: the model\'s answer only.';
  }
  const gi=key=>G.STAGES.findIndex(s=>s.k===key);
  const gcol=(P,i)=>[P.c4,P.bad,P.c6,P.c5,P.c5,P.acc,P.good,P.good,P.c5,P.good][i];
  // where the call stands at step k: just before the gate it is being checked at (in the tool box for "runs", in front of the gate when refused)
  function spot(k){const key=dec.path[k],i=gi(key),last=k===dec.path.length-1;
    if(key==='run')return [GX(9),Y,0];
    if(last&&dec.o!=='allow')return [GX(i)-.18,.12,1.05];
    return [GX(i)-.2,Y,0]}
  function draw(R,k,e){if(!dec)return;const P=R.P,nar=R.W<520,path=dec.path,last=k===path.length-1,ci=gi(path[k]);
    R.grid(-6.4,5.2,-1.6,1.9,.5);
    // the model, which asked for the call
    R.box([MXX,0,0],[.9,.8,1.1],{fill:mix(P.paper,P.c2,.3)});R.label([MXX,.8,0],'model',{fs:13,b:1,c:P.c2,dy:-12});
    R.label([MXX,0,.55],act.tool+(act.cmd?'('+cut(act.cmd,22)+')':'('+act.path+')'),{mono:true,fs:12,b:1,dy:18,al:'left',dx:-30,wide:1});
    // the ten checks: gates 1 to 9 of glass, the tool as a box; visited ones lit, the current at full strength, the rest receding
    G.STAGES.forEach((S,i)=>{const c=gcol(P,i),vis=path.slice(0,k+1).some(x=>gi(x)===i),cur=i===ci,later=path.some(x=>gi(x)===i)&&!vis,a=cur?1:vis?.5:later?.3:.14;
      if(i<9)R.glass([GX(i),.02,-.75],[0,0,1.5],[0,1.05,0],{c,a,nu:3,nv:4});
      else R.box([GX(i)+.15,0,0],[.75,.75,1.0],{fill:mix(P.paper,P.good,.25),a:Math.max(.35,a)});
      const top=i<9?1.05:.75;
      if(!nar||cur)R.label([GX(i),top,0],nar?NM[i]:NM[i],{fs:12,b:cur,c:cur?mix(P.ink,c,.35):P.mute,dy:i%2?-30:-12,a:Math.max(.45,a)})});
    // the call travels from the model to the check of this step; dots stream along the way it came
    const pts=[[MXX+.45,Y,0]];for(let j=0;j<=k;j++){const p=spot(j);if(j===k&&last&&dec.o!=='allow'){pts.push([p[0],Y,0])}pts.push(p)}
    const from=k===0?[MXX+.45,Y,0]:spot(k-1),to=spot(k),pos=lerp3(from,to,e);
    R.flow(pts.slice(0,-1).concat([pos]),{c:P.c2,r:.05,n:Math.max(4,(k+1)*3),speed:1.3,a:.9});
    const out=last&&e>.6,oc=out?(dec.o==='allow'?P.good:dec.o==='classifier'?P.c5:P.bad):P.c2;
    R.ball(pos,.12,{c:oc});
    if(last){const v=path[k]==='run'?'runs':VERD[dec.o];R.label(path[k]==='run'?[GX(9),.75,0]:[GX(ci),.12,1.05],v,{fs:13.5,b:1,c:oc,dy:path[k]==='run'?-48:22,a:e})}
  }
  const full={cam:[.42,.55],bounds:[[-6.2,0,-.9],[4.9,1.2,1.4]]};
  compute();
  const st=S3.stage({id:'stg-gate',list:'sx-gate',fig:'Fig. 2 · one call through the permission layer',cam:full.cam,bounds:full.bounds,aspect:.44,dur:1200,hold:4200,draw,
    // the camera moves in close on the check being made; the first and last steps show the whole chain
    view:k=>{if(!dec||k===0||k===dec.path.length-1)return full;const x=GX(gi(dec.path[k]));return {cam:[.5,.5],bounds:[[x-2.4,0,-.9],[x+2.0,1.2,1.3]]}},
    margin:w=>w<520?[14,10,14,10]:[40,16,16,16]});
  const ch=()=>{compute();if(st)st.list('sx-gate')};selA.addEventListener('change',ch);selC.addEventListener('change',ch);
})();
