// ---- Scene (Replay tab): Stage 1 replay of a real LFM2-Terminal trace, turn by turn (renderer v2: the commands as tiles on a plinth in front, the
// replayed workspace Ê0 as a slab with one box per file, box height growing with the lines seen, paths known only by name as clear outlines, the
// agent's own files on a tray to the right; each command's read or write flows from its tile to its file; under "replay to the last version" the
// agent's files move onto the slab, which is how the answer leaks in) ----
// Data: window.TRACES (five shipped rows) through RP.run (parts/22_js_replay.js, checked against src/replay.py by check_replay.mjs); the scene draws
// RP.run's own snapshots after each command. Long-replay rule: one step per turn of the session (4 to 6 here, never more than 8: adjacent turns merge
// beyond that), each step playing its commands one by one; the step list is generated from the same events and swapped with S3.stage(...).list when
// the trace or the rule changes. Replaces the 2D one-step-per-command replay (makeAnim rr) of 2026-10-03. window.TURR exposes the groups for the checks.
(function(){
  if(!document.getElementById('stg-rr')||typeof S3==='undefined'||!window.TRACES||typeof RP==='undefined')return;const {at,off,lerp,mix,add}=S3;
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const short=p=>p.replace(/^\/app\//,'');
  const KIND=(P,k)=>k==='read-pre'?P.c3:k==='read-part'?P.c6:k==='list'?P.c5:k==='run'?P.mute:k==='look'?P.paper:P.c2;
  const S={i:0,C:null,R:null,G:[],mode:'early',slots:{},paths:[]};
  // groups: one per turn that issued commands; beyond 8, the two smallest neighbours merge
  function groups(R){let G=[];R.events.forEach((e,j)=>{const g=G[G.length-1];if(g&&g.t[g.t.length-1]===e.t)g.ev.push(j);else G.push({t:[e.t],ev:[j]})});
    while(G.length>8){let b=0,bs=1e9;for(let i=0;i<G.length-1;i++){const s=G[i].ev.length+G[i+1].ev.length;if(s<bs){bs=s;b=i}}G.splice(b,2,{t:G[b].t.concat(G[b+1].t),ev:G[b].ev.concat(G[b+1].ev)})}return G}
  function phrase(e,j,m){const R=S.R,p=e.path?'<code>'+esc(short(e.path))+'</code>':'',before=!R.snaps[j].mut||(j>0&&!R.snaps[j-1].mut&&e.kind==='list');
    switch(e.kind){
      case 'read-pre':return m==='early'?'shows '+e.n+' lines of '+p+' before any change: it enters Ê<sub>0</sub> at this version':'shows '+p+'; kept, at its last version';
      case 'read-part':return 'shows part of '+p+' ('+e.n+' lines): '+(m==='early'?'a partial file in Ê<sub>0</sub>':'the partial view is kept');
      case 'read-held':return 'shows '+p+' only after a change: '+(m==='early'?'it may be the agent\'s output, so it is held back':'kept: the agent\'s result, now in the "environment"');
      case 'write-new':return 'the agent writes '+p+(e.n?' ('+e.n+' lines)':'')+': '+(m==='early'?'excluded, stored as its change':'kept, so the workspace starts with its code');
      case 'write-mod':return 'the agent overwrites '+p+': '+(m==='early'?'Ê<sub>0</sub> keeps the earlier version':'its version replaces the original');
      case 'edit':return 'the agent edits '+p+' in place: '+(m==='early'?'Ê<sub>0</sub> keeps the earlier version':'the last version is unknown');
      case 'list':return 'a listing shows '+e.n+' name'+(e.n===1?'':'s')+': '+(!R.snaps[j].mut?'known to pre-exist, completion must recreate them':'after a change, they prove nothing');
      case 'run':return R.snaps[j-1]&&R.snaps[j-1].mut?'may change the workspace':'may change the workspace: from here on, anything new could be the agent\'s doing';
      default:return 'read-only, nothing to replay'}}
  function counts(j,m){const s=S.R.snaps[j];let l=0;s.e0.forEach(p=>{l+=s.e0n[p][0]});const ag=s.cr.length+s.held.filter(p=>s.cr.indexOf(p)<0).length;
    const kn=s.listed.filter(p=>s.e0.indexOf(p)<0&&!p.endsWith('.gitkeep')).length;
    if(m==='early')return 'Ê<sub>0</sub> '+s.e0.length+' file'+(s.e0.length===1?'':'s')+' ('+l+' lines), '+kn+' known by name, '+ag+' held back';
    const fin=new Set(s.fin.concat(s.cr));return 'workspace '+fin.size+' file'+(fin.size===1?'':'s')+', '+[...fin].filter(p=>s.cr.indexOf(p)>=0||s.held.indexOf(p)>=0).length+' made by the agent'}
  function listHTML(m){const R=S.R;return S.G.map(g=>{const evs=g.ev.map(j=>({e:R.events[j],j}));const parts=[];let looks=0;
      const flush=()=>{if(looks){parts.push(looks+' read-only command'+(looks===1?'':'s'));looks=0}};
      evs.forEach(({e,j})=>{if(e.kind==='look'){looks++;return}flush();parts.push('<code>'+esc(e.cmd.length>48?e.cmd.slice(0,47)+'…':e.cmd)+'</code> '+phrase(e,j,m))});flush();
      const t=g.t.length>1?'Turns '+g.t[0]+' to '+g.t[g.t.length-1]:'Turn '+g.t[0];
      return '<li><b>'+t+': '+g.ev.length+' command'+(g.ev.length===1?'':'s')+'.</b> '+parts.join('; ')+'. <span class="mute">After it: '+counts(g.ev[g.ev.length-1],m)+'.</span></li>'}).join('')}
  function layout(){const R=S.R,s=R.snaps[R.snaps.length-1],seen=[];const push=p=>{if(seen.indexOf(p)<0&&!p.endsWith('.gitkeep'))seen.push(p)};
    s.e0.forEach(push);s.listed.forEach(push);s.fin.forEach(push);s.cr.forEach(push);s.held.forEach(push);S.paths=seen;S.agent=new Set(s.cr.concat(s.held).filter(p=>s.e0.indexOf(p)<0))}
  const N=()=>S.R.events.length,SP=()=>Math.min(.56,10/N()),TX=i=>(i-(N()-1)/2)*SP(),ZT=2.5,WX=-1.5,SZ=-.2,SW=5,SD=2.6,TRX=3.2;
  function slab(i){return [WX-SW/2+.5+(i%6)*.8,.12,SZ-SD/2+.45+Math.floor(i/6)*.8]}
  function tray(i){return [TRX+(i%2?.35:-.35),.08,SZ-.75+Math.floor(i/2)*.6]}
  function hgt(n){return .14+.11*Math.log2(1+(n||0))}
  function draw(R0,k,e){if(!S.R)return;const P=R0.P,R=S.R,m=S.mode,g=S.G[k],cnt=g.ev.length,ui=Math.min(cnt-1,Math.floor(e*cnt)),j=g.ev[ui],ev=R.events[j],s=R.snaps[j];
    R0.grid(-6.5,6.5,-3.4,3.6,.5);
    // the session's commands
    R0.box([0,0,ZT],[N()*SP()+.3,.06,.8],{dz:4});
    R.events.forEach((x,i)=>{const done=i<=j,curr=i===j,col=KIND(P,x.kind);R0.box([TX(i),.06+(curr?.12:0),ZT],[SP()*.8,.12,.48],{fill:col,a:done?1:.22,shadow:false,lw:curr?1.6:.9})});
    const maxc=R0.W<520?24:R0.W<900?40:58,cmd=ev.cmd.length>maxc?ev.cmd.slice(0,maxc-1)+'…':ev.cmd;
    R0.label([TX(j),.3,ZT],'$ '+cmd,{mono:true,fs:12.5,b:1,dy:-14});
    R0.label([0,0,ZT+.4],'the session · '+N()+' commands · now turn '+R.events[j].t,{mono:true,fs:12,c:P.mute,dy:16,wide:1});
    // the workspace and the tray
    R0.box([WX,0,SZ],[SW,.12,SD],{dz:4});R0.label([WX-SW/2,.12,R0.W<520?SZ-SD/2:SZ+SD/2],m==='early'?'replayed workspace Ê₀':'workspace replayed to the last version',{al:'left',dx:2,dy:R0.W<520?-12:16,fs:12.5,b:1});
    if(m==='early'){R0.box([TRX,0,SZ],[1.6,.08,2.3],{dz:2});R0.label([TRX,.1,SZ+1.15],'held back',{fs:12,c:P.c2,b:1,dy:16})}
    const kn=new Set(s.listed),e0=new Set(s.e0),cr=new Set(s.cr),held=new Set(s.held),fin=new Set(s.fin);let ti=0,si=0;const pos={};
    S.paths.forEach(p=>{const ag=S.agent.has(p);let where=null,fill=null,h=.16,da=0;
      if(m==='early'){if(e0.has(p)){where='s';fill=s.e0n[p][1]?P.c3:P.c6;h=hgt(s.e0n[p][0])}else if(ag&&(cr.has(p)||held.has(p))){where='t';fill=P.c2;h=.32}else if(kn.has(p)&&!ag){where='s';fill=P.c5;da=1;h=.3}}
      else{if(fin.has(p)||cr.has(p)){where='s';fill=ag?P.c2:P.c3;h=.3}else if(kn.has(p)){where='s';fill=P.c5;da=1;h=.3}}
      // each path keeps its place on the slab (or tray) for the whole replay
      const sp=ag&&m==='early'?tray(S.slots[p].t):slab(S.slots[p].s);pos[p]=sp;
      if(!where){R0.box(sp,[.5,.04,.5],{fill:P.line,a:.25,shadow:false});return}
      R0.box(sp,[.5,h,.5],{fill,fa:da?.12:1,a:1,shadow:false});
      if(p===ev.path||e0.has(p)||(where==='t'&&m==='early')||(m==='late'&&ag&&where))R0.label(add(sp,[0,h,0]),short(p).split('/').pop(),{mono:true,fs:12,dy:-10,b:p===ev.path,grp:where==='t'?'t':'f',a:p===ev.path?1:.85})});
    // what the current command does, as a flow from its tile
    const from=[TX(j),.3,ZT];
    if(ev.path&&pos[ev.path])R0.flowArc(from,add(pos[ev.path],[0,.35,0]),.8,{c:KIND(P,ev.kind),n:8});
    else if(ev.kind==='list'){s.listed.filter(p=>pos[p]&&!S.agent.has(p)).slice(0,6).forEach(p=>R0.flowArc(from,add(pos[p],[0,.35,0]),.7,{c:P.c5,a:.7,n:5,r:.05}))}
    else if(ev.kind==='run')R0.glow(from,.6,{c:P.mute,a:.6})}
  const st=S3.stage({id:'stg-rr',list:'sx-rr',fig:'Fig. 1 · replay, one turn per step',cam:[.3,.68],bounds:()=>[[-5.3,0,-1.8],[4.4,1.1,3]],aspect:.62,dur:2600,hold:4600,draw});
  function rebuild(replay){const el=document.getElementById('sx-rr');el.innerHTML=listHTML(S.mode);st.list('sx-rr')}
  function load(i){S.i=i;S.C=TRACES[i];S.R=RP.run(S.C);S.G=groups(S.R);layout();let a=0,b=0;S.slots={};S.paths.forEach(p=>{S.slots[p]=S.agent.has(p)?{t:b++,s:a++}:{s:a++}});
    const R=S.R;document.getElementById('rrSum').innerHTML=R.events.length+' commands in '+R.turns+' turns, '+S.G.length+' steps (turns without commands are skipped). Replay recovers '+R.e0_files+' pre-existing file'+(R.e0_files===1?'':'s')+' ('+R.e0_lines+' lines) and '+R.known_only.length+' more by name; '+(R.seed?'it passes':'it fails')+' the seed filter ('+R.end_files+' files, '+R.end_lines+' lines visible at the end; at least 5 and 100 needed).';
    rebuild()}
  const seg=document.getElementById('rrM');
  seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.m===S.mode)return;S.mode=b.dataset.m;seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});rebuild()}));
  window.TURR={load,S,groups:()=>S.G.map(g=>({t:g.t,ev:g.ev.slice()})),st};
})();
