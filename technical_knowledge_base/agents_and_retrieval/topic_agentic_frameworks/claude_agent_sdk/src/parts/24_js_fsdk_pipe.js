// ---- Reading tab, section 5: each recorded tool call through the six permission stages ----
(function(){
  const F=window.FSDK,R=F.runs,esc=RD.esc;
  const ST=[['Hooks (PreToolUse)','your hook callbacks run first'],['Deny rules','none were set in these runs'],['Ask rules','none were set'],
            ['Permission mode','default: passes everything on'],['Allow rules, or the tool approves itself','e.g. reads inside the working directory'],['can_use_tool callback','your function; without one, "ask" means deny']];
  const RO=new Set(['mcp__repo__list_files','mcp__repo__read_file']);
  function argOf(inp){if(!inp)return '';return inp.path||inp.file_path||inp.command||inp.skill||'';}
  // build the step list for a run from its recorded events
  function steps(L){
    const ev=R[L].ev,res={},denied=new Set();
    ev.forEach(e=>{if(e[0]==='res')res[e[4]]={text:e[3],err:e[5]};if(e[0]==='denied')denied.add(e[4]);});
    const perms=ev.filter(e=>e[0]==='cb'&&e[3].kind==='permission').map(e=>e[3]);let pi=0;
    const out=[];
    ev.forEach(e=>{
      if(e[0]!=='call'||e[2])return;      // main-thread calls only
      const name=e[3],id=e[5],r=res[id]||{text:'',err:false};let at,v,why;
      if(L==='s3_bare'){
        if(denied.has(id)){at=5;v='deny';why='No callback was given, so "ask" became a refusal: '+r.text.slice(0,120);}
        else{at=4;v='allow';why='Approved without asking (a read, a read-only command or a skill) in the working directory.';}
      }else if(RO.has(name)){at=0;v='allow';why='Our hook answered permissionDecision "allow" ("read-only tool"); the callback never saw it.';}
      else if(name==='StructuredOutput'){at=4;v='allow';why='Claude Code\'s own tool for the final answer.';}
      else{const p=perms[pi++]||{};at=5;v=p.decision||'allow';
        why=v==='deny'?'Our callback said no: "'+(p.message||r.text).slice(0,110)+'"':'The hook passed it on; nothing else settled it; our can_use_tool returned allow.';}
      out.push({name:name.replace('mcp__repo__',''),arg:argOf(e[4]),at,v,why,res:r.text,err:r.err});
    });
    return out;
  }
  let L='s1_wire',S=steps(L);
  const calls=document.getElementById('fsdk-pipe-calls'),pipe=document.getElementById('fsdk-pipe'),cap=document.getElementById('fsdk-pipe-cap'),stats=document.getElementById('fsdk-pipe-stats');
  function draw(i){
    const s=S[i];
    calls.innerHTML=S.map((c,j)=>'<span class="'+(j===i?'cur ':'')+(j<=i?(c.v==='deny'?'no':'ok'):'')+'">'+(j+1)+'. '+esc(c.name)+'</span>').join('');
    pipe.innerHTML=ST.map((st,k)=>{const cls=k<s.at?'past':k===s.at?'on':'skip';
      const v=k<s.at?'<span class="v pass">passed on</span>':k===s.at?'<span class="v '+s.v+'">'+s.v+'</span>':'<span class="v pass">not reached</span>';
      return '<div class="fsdk-st '+cls+'"><span><b>'+(k+1)+'.</b> '+st[0]+'</span>'+v+'<span class="why">'+(k===s.at?esc(s.why):st[1])+'</span></div>';}).join('');
    cap.innerHTML='<div class="t">Call '+(i+1)+' of '+S.length+': '+esc(s.name)+(s.arg?' <code>'+esc(String(s.arg).slice(0,70))+'</code>':'')+'</div><p>Tool result'+(s.err?' (error)':'')+': '+esc(String(s.res||'').replace(/\s+/g,' ').slice(0,160))+'</p>';
    const done=S.slice(0,i+1);
    const c=k=>done.filter(k).length;
    stats.innerHTML=RD.stat('Settled by a hook',c(x=>x.at===0),'')+RD.stat('Approved without asking',c(x=>x.at===4),'')+
      RD.stat('Allowed by your callback',c(x=>x.at===5&&x.v==='allow'),'')+RD.stat('Refused',c(x=>x.v==='deny'),L==='s3_bare'?'nobody to ask':'');
  }
  const A=RD.anim({card:'fsdk-pipe-card',ctl:'fsdk-pipe-ctl',n:S.length,draw,ms:1700,label:'Tool call'});
  RD.seg(document.getElementById('fsdk-pipe-mode'),m=>{L=m;S=steps(L);A.reset(S.length);A.play();});
})();
