// ---- Reading tab: one-screen numbers, architecture drawing, session phases, permission pipeline animation ----
(function(){
  const F=window.FSDK,R=F.runs,esc=RD.esc;
  const fmt=n=>n==null?'n/a':Number(n).toLocaleString('en-US');
  const usd=(x,d)=>'$'+Number(x).toFixed(d==null?4:d);
  const s1=R.s1_wire,s3=R.s3_bare;
  const ctrlOut=F.wire.s1_wire.filter(w=>w[1]==='out'&&w[2]==='control_request');
  const cnt=sub=>ctrlOut.filter(w=>w[3]===sub).length;
  window.FSDK_X={fmt,usd,ctrlOut,cnt};

  // one-screen stats
  const one=document.getElementById('fsdk-onestats');
  one.innerHTML=RD.stat('Questions to your process','<span id="fsdk-n-ctrl">'+ctrlOut.length+'</span>','run s1: '+cnt('hook_callback')+' hooks, '+cnt('can_use_tool')+' permission, '+cnt('mcp_message')+' MCP')+
    RD.stat('First call, own prompt and tools',fmt(s1.n.first_call_in)+' tokens','run s1; defaults (s3): '+fmt(s3.n.first_call_in))+
    RD.stat('Defaults, nobody answering',s3.results[0].denials+' refused','s3: "'+s3.results[0].subtype+'", tests '+s3.n.tests_after+', '+usd(s3.results[0].cost))+
    RD.stat('Options','49 / 69','Python 0.2.163 / TypeScript 0.3.291');

  // architecture drawing, laid out from the measured width
  const nIn=F.wire.s1_wire.filter(w=>w[1]==='in').length, nOut=F.wire.s1_wire.filter(w=>w[1]==='out').length;
  const nMsgOut=F.wire.s1_wire.filter(w=>w[1]==='out'&&w[2]!=='control_request'&&w[2]!=='control_response').length;
  function arch(){
    const el=document.getElementById('fsdk-arch');const W=Math.min(860,RD.width(el));const narrow=W<560;
    const box=(x,y,w,h,title,lines,col)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="8" fill="var(--soft)" stroke="'+col+'" stroke-width="1.5"/>'+
      RD.t(x+10,y+20,title,{fs:13,w:600})+lines.map((l,i)=>RD.t(x+10,y+40+i*17,l,{fs:11.5,fill:'var(--mute)'})).join('');
    const A=['query() loop: your code','can_use_tool: '+cnt('can_use_tool')+' questions','2 hooks: '+cnt('hook_callback')+' calls','@tool server "repo": '+cnt('mcp_message')+' MCP messages'];
    const B=['agent loop, context, compaction','built-in tools (Read, Edit, Bash)','permission check (6 steps)','session file on disk'];
    const C=['the model: '+s1.n.n_calls+' streamed calls','(+1 call seen only in model_usage)'];
    let s='',H;
    if(!narrow){
      const bw=(W-80)/3,bh=118,y=26;H=y+bh+46;
      s+=box(0,y,bw,bh,'Your process (Python SDK)',A,'var(--good)');
      s+=box(bw+40,y,bw,bh,'Claude Code 2.1.286 (child)',B,'var(--acc)');
      s+=box(2*bw+80,y,bw,bh,'Anthropic API',C,'var(--c2)');
      const ax=(x1,x2,yy,lab,col)=>'<line x1="'+x1+'" y1="'+yy+'" x2="'+x2+'" y2="'+yy+'" stroke="'+col+'" stroke-width="2" marker-end="url(#fsdkAr)"/>'+RD.t((x1+x2)/2,yy-5,lab,{fs:10.5,a:'middle',fill:'var(--mute)'});
      s+=ax(bw+2,bw+38,y+44,'stdin','var(--good)')+ax(bw+38,bw+2,y+84,'stdout','var(--acc)');
      s+=ax(2*bw+42,2*bw+78,y+44,'HTTPS','var(--acc)')+ax(2*bw+78,2*bw+42,y+84,'','var(--c2)');
      s+=RD.t(0,14,'stdin: '+nIn+' lines (prompt, initialize, '+(nIn-2)+' answers)   stdout: '+nOut+' lines ('+ctrlOut.length+' questions, '+nMsgOut+' messages and replies)',{fs:11});
      s+=RD.t(0,H-12,'One JSON object per line in both directions; each question carries a request id that its answer echoes.',{fs:11,fill:'var(--mute)'});
    } else {
      const bw=W-2,bh=112;let y=22;H=3*bh+2*44+40;
      s+=box(0,y,bw,bh,'Your process (Python SDK)',A,'var(--good)');
      const ay=(y1,y2,x,lab,col)=>'<line x1="'+x+'" y1="'+y1+'" x2="'+x+'" y2="'+y2+'" stroke="'+col+'" stroke-width="2" marker-end="url(#fsdkAr)"/>'+RD.t(x+8,(y1+y2)/2+4,lab,{fs:10.5,fill:'var(--mute)'});
      s+=ay(y+bh+2,y+bh+40,W*0.3,'stdin '+nIn,'var(--good)')+ay(y+bh+40,y+bh+2,W*0.62,'stdout '+nOut,'var(--acc)');
      y+=bh+44;s+=box(0,y,bw,bh,'Claude Code 2.1.286 (child)',B,'var(--acc)');
      s+=ay(y+bh+2,y+bh+40,W*0.3,'HTTPS','var(--acc)')+ay(y+bh+40,y+bh+2,W*0.62,'','var(--c2)');
      y+=bh+44;s+=box(0,y,bw,bh-40,'Anthropic API',C,'var(--c2)');
      s+=RD.t(0,14,'Run s1: '+ctrlOut.length+' questions to your process',{fs:11});
    }
    const defs='<defs><marker id="fsdkAr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
    el.innerHTML=RD.svg(W,H,defs+s,'Your process, the Claude Code child process and the API, with the message counts of run s1');
  }
  arch();RD.onRender(arch);RD.onResize(arch);

  // session phases (s4)
  const ph={turn1:['Turn 1','ClaudeSDKClient: run the tests, change nothing'],turn2:['Turn 2','same process: fix the first failure only'],resume:['Resume','new process, resume=session id: fix the rest'],fork:['Fork','new process, fork_session: what is fixed so far?']};
  document.getElementById('fsdk-sess').innerHTML=R.s4_session.results.map(r=>'<div class="fsdk-ph"><b>'+ph[r.phase][0]+'</b><span class="s">'+ph[r.phase][1]+'</span><br>reported '+usd(r.cost)+'<br>own '+usd(r.own_cost)+'<br><span class="s">'+r.num_turns+(r.num_turns===1?' turn, ':' turns, ')+r.session+'</span></div>').join('');

  // rewind (s9)
  const rw=R.s9_rewind.other.filter(o=>o.kind==='tests');
  document.getElementById('fsdk-rewind').innerHTML='<div class="k">Run s9: tests at three moments</div><div class="v">'+rw.map(o=>esc(o.result)).join(' &#8594; ')+'</div><div class="d">'+rw.map(o=>o.phase.replace(/_/g,' ')).join(' &#8594; ')+'</div>';

  // structured output (s6)
  document.getElementById('fsdk-struct').textContent='structured_output = '+JSON.stringify(R.s6_structured.results[0].structured_output,null,1);
})();
