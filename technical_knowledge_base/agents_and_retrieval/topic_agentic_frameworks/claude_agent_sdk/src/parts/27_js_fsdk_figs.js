// ---- Reading tab figures drawn from the recordings: s1 against s3 (section 3), where tools run (section 4), run s5 on two lanes (section 6); run s4's sessions are the 3D stage in 42_js_sc_sess.js ----
(function(){
  if(!document.getElementById('fsdk-ba'))return;
  const F=window.FSDK,R=F.runs,T=RD.t;
  const fmt=n=>Number(n).toLocaleString('en-US'),usd=x=>'$'+Number(x).toFixed(4);
  const defs='<defs><marker id="fsdkAr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';

  // 1. s1 against s3: the same task with options set on purpose and with the defaults
  function ba(){
    const el=document.getElementById('fsdk-ba');const W=Math.min(860,RD.width(el));const narrow=W<520;
    const a=R.s1_wire,b=R.s3_bare,ra=a.results[0],rb=b.results[0];
    const rows=[
      ['First model call, input tokens',a.n.first_call_in,b.n.first_call_in,fmt],
      ['Model calls',a.n.n_calls,b.n.n_calls,String],
      ['Tool calls refused',ra.denials,rb.denials,(v,L)=>v+' of '+R[L].n.tool_calls.length],
      ['Cost at list prices',ra.cost,rb.cost,usd]];
    const lw=narrow?0:200,bx=lw,bw=W-lw-(narrow?70:90),rowH=narrow?58:46;let s='',y=8;
    rows.forEach(r=>{
      const mx=Math.max(r[1],r[2])||1;
      if(narrow){s+=T(0,y+10,r[0],{fs:12,w:600});y+=16;}else s+=T(0,y+14,r[0],{fs:12,w:600});
      [['s1 tuned',r[1],'var(--good)','s1_wire'],['s3 defaults',r[2],'var(--bad)','s3_bare']].forEach((c,k)=>{
        const yy=y+k*17,w=Math.max(2,bw*c[1]/mx);
        s+='<rect x="'+bx+'" y="'+yy+'" width="'+w.toFixed(1)+'" height="13" rx="2" fill="'+c[2]+'" opacity=".85"/>';
        s+=T(bx+w+6,yy+11,c[0].split(' ')[0]+': '+r[3](c[1],c[3]),{fs:11});
      });
      y+=rowH-(narrow?16:0);
    });
    s+=T(0,y+12,'Tests afterwards: s1 '+a.n.tests_after+', s3 '+b.n.tests_after+'; both runs reported subtype "'+ra.subtype+'".',{fs:11.5,fill:'var(--mute)'});
    if(narrow)s=s.replace('; both runs reported subtype "'+ra.subtype+'".','.');
    el.innerHTML=RD.svg(W,y+22,s,'Run s1 against run s3: first-call tokens, model calls, refusals, cost and test results');
  }

  // 2. where each kind of tool runs
  function tk(){
    const el=document.getElementById('fsdk-tk');const W=Math.min(860,RD.width(el));const narrow=W<560;
    const box=(x,y,w,h,title,lines,col,hl)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="8" fill="'+(hl?'var(--acc2)':'var(--soft)')+'" stroke="'+col+'" stroke-width="1.5"/>'+
      T(x+10,y+19,title,{fs:12.5,w:600})+lines.map((l,i)=>T(x+10,y+38+i*16,l,{fs:11.5,fill:'var(--mute)'})).join('');
    const P=['Your process (SDK)','@tool functions in','server "repo"','name: mcp__repo__read_file'],
          C=['Claude Code (child)','built-in tools run here:','Read, Edit, Bash ...','name: Read'],
          O=['Outside MCP server','its own process (stdio)','or a remote URL (http)','name: mcp__gh__...'];
    let s='',H;
    if(!narrow){
      const bw=(W-90)/3,bh=96,y=30;H=y+bh+30;
      s+=box(0,y,bw,bh,P[0],P.slice(1),'var(--good)',true)+box(bw+45,y,bw,bh,C[0],C.slice(1),'var(--acc)')+box(2*bw+90,y,bw,bh,O[0],O.slice(1),'var(--c4)');
      const ar=(x1,x2,yy,col)=>'<line x1="'+x1+'" y1="'+yy+'" x2="'+x2+'" y2="'+yy+'" stroke="'+col+'" stroke-width="2" marker-end="url(#fsdkAr2)" marker-start="url(#fsdkAr2)"/>';
      s+=ar(bw+4,bw+41,y+50,'var(--good)')+T(bw+22,y+40,'pipe',{fs:11,a:'middle',fill:'var(--mute)'});
      s+=ar(2*bw+49,2*bw+86,y+50,'var(--c4)')+T(2*bw+67,y+40,'MCP',{fs:11,a:'middle',fill:'var(--mute)'});
      s+=T(0,16,'An in-process tool call is an mcp_message on the pipe: 1 to 5 ms in run s1',{fs:11.5});
      s+=T(0,H-6,'Claude Code is the MCP client in both cases; only the transport differs.',{fs:11,fill:'var(--mute)'});
    }else{
      const bw=W-2,bh=90;let y=6;H=3*bh+2*34+10;
      const ar=(y1,y2,col,lab)=>'<line x1="40" y1="'+y1+'" x2="40" y2="'+y2+'" stroke="'+col+'" stroke-width="2" marker-end="url(#fsdkAr2)" marker-start="url(#fsdkAr2)"/>'+T(52,(y1+y2)/2+4,lab,{fs:11,fill:'var(--mute)'});
      s+=box(0,y,bw,bh,P[0],P.slice(1),'var(--good)',true);s+=ar(y+bh+4,y+bh+30,'var(--good)','pipe: mcp_message, 1 to 5 ms');
      y+=bh+34;s+=box(0,y,bw,bh,C[0],C.slice(1),'var(--acc)');s+=ar(y+bh+4,y+bh+30,'var(--c4)','MCP over stdio or HTTP');
      y+=bh+34;s+=box(0,y,bw,bh,O[0],O.slice(1),'var(--c4)');
    }
    el.innerHTML=RD.svg(W,H,defs+s,'Where built-in, in-process and outside MCP tools run');
  }

  // 3. run s5 on two lanes
  function s5(){
    const el=document.getElementById('fsdk-s5');const W=Math.min(860,RD.width(el));const narrow=W<560;
    const ev=R.s5_subagent.ev,res={},den=new Set();
    ev.forEach(e=>{if(e[0]==='res'&&e[4])res[e[4]]=e;if(e[0]==='denied')den.add(e[4]);});
    const tEnd=ev[ev.length-1][1],L=narrow?8:130,Rm=narrow?8:16,x=t=>L+(W-L-Rm)*t/tEnd;
    const yM=narrow?72:56,yS=narrow?150:128;let s='';
    s+=T(narrow?L:0,narrow?14:yM+4,'Sonnet 5.5 (main)',{fs:11.5,w:600});
    s+=T(narrow?L:0,narrow?yS-26:yS+4,'Haiku test-runner',{fs:11.5,w:600});
    s+='<line x1="'+L+'" y1="'+yM+'" x2="'+(W-Rm)+'" y2="'+yM+'" stroke="var(--line)"/><line x1="'+L+'" y1="'+yS+'" x2="'+(W-Rm)+'" y2="'+yS+'" stroke="var(--line)"/>';
    // subagent spans: task_started to task_notification
    const st=ev.filter(e=>e[0]==='task'&&e[3]==='task_started').map(e=>e[1]),en=ev.filter(e=>e[0]==='task'&&e[3]==='task_notification').map(e=>e[1]);
    const lab=narrow?['cap hit, no report','"0 failed"']:['subagent 1: 4-turn cap, no report','subagent 2: "0 failed"'];
    st.forEach((t0,i)=>{const t1=en[i]||t0;
      s+='<rect x="'+x(t0).toFixed(1)+'" y="'+(yS-11)+'" width="'+(x(t1)-x(t0)).toFixed(1)+'" height="22" rx="4" fill="'+(i?'var(--good)':'var(--bad)')+'" opacity=".14"/>';
      s+=T(x(t0),yS+28,lab[i],{fs:11,fill:i?'var(--good)':'var(--bad)'});
      s+='<line x1="'+x(t0).toFixed(1)+'" y1="'+yM+'" x2="'+x(t0).toFixed(1)+'" y2="'+(yS-11)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>';});
    // calls
    let k=0;
    ev.forEach(e=>{if(e[0]!=='call')return;const sub=!!e[2],y=sub?yS:yM,X=x(e[1]),id=e[5];const r=res[id];
      const bad=den.has(id),err=r&&r[5];
      if(bad){s+='<path d="M'+(X-5)+','+(y-5)+'L'+(X+5)+','+(y+5)+'M'+(X+5)+','+(y-5)+'L'+(X-5)+','+(y+5)+'" stroke="var(--bad)" stroke-width="2.4"/>';}
      else{const hol=err&&!sub&&e[3]!=='Agent';s+='<circle cx="'+X.toFixed(1)+'" cy="'+y+'" r="5.5" fill="'+(hol?'var(--bg)':'var(--good)')+'" stroke="'+(hol?'var(--bad)':'var(--good)')+'" stroke-width="1.8"/>';}
      if(!sub){const nm=e[3]==='SendMessage'?(narrow?'Send':'SendMessage'):e[3];k++;
        s+=T(X,y-(k%2?10:22),nm,{fs:11,a:'middle',fill:'var(--ink)'});}
    });
    // time axis
    const yA=yS+(narrow?48:46);s+='<line x1="'+L+'" y1="'+yA+'" x2="'+(W-Rm)+'" y2="'+yA+'" stroke="var(--mute)"/>';
    for(let t=0;t<=tEnd;t+=5){s+='<line x1="'+x(t)+'" y1="'+yA+'" x2="'+x(t)+'" y2="'+(yA+4)+'" stroke="var(--mute)"/>'+T(x(t),yA+16,t+' s',{fs:11,a:'middle',fill:'var(--mute)'});}
    el.innerHTML=RD.svg(W,yA+22,s,'Run s5: tool calls of the main agent and its subagent over time');
  }

  const all=()=>{ba();tk();s5();};
  all();RD.onRender(all);RD.onResize(all);
})();
