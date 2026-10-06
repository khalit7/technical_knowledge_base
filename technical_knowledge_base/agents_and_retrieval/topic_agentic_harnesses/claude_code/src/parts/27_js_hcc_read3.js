// ---- Reading tab, part 3: memory canaries, skills and subagent costs, headless limits, the changelog check ----
(function(){
  const {run,esc,fmt,callIn}=HCCR;const r=run('memory');if(!r||!document.getElementById('hcc-mem-card'))return;
  // The eight planted files, in load order, and what the recording showed for each (run memory).
  const F=[
    {f:'../CLAUDE.md (parent directory)',c:'HOTEL-PARENT',when:1},
    {f:'CLAUDE.md (project root)',c:'ALPHA-ROOT',when:2},
    {f:'docs/style.md (imported with @docs/style.md)',c:'BRAVO-IMPORT',when:2},
    {f:'CLAUDE.local.md',c:'CHARLIE-LOCAL',when:-3},
    {f:'.claude/rules/general.md (no paths)',c:'DELTA-RULE',when:4},
    {f:'.claude/rules/python.md (paths: textstats/**)',c:'ECHO-PATHRULE',when:7},
    {f:'textstats/CLAUDE.md (subdirectory)',c:'FOXTROT-SUBDIR',when:7},
    {f:'AGENTS.md',c:'GOLF-AGENTS',when:-5}];
  const STEP=[
    ['Launch: walk from the filesystem root down','CLAUDE.md files above the working directory load first. The parent directory\'s file is in the session although nobody opened that folder.'],
    ['The project CLAUDE.md and its import','The import is expanded at launch, so it costs the same as writing its text inline.'],
    ['CLAUDE.local.md is skipped','These runs pass --setting-sources project; the docs: "CLAUDE.local.md is skipped if you exclude local from --setting-sources".'],
    ['Rules without paths load like CLAUDE.md','.claude/rules/general.md is in; python.md waits for a matching file.'],
    ['AGENTS.md is skipped','A CLAUDE.md exists, so by default Claude Code reads only that (2.1.277 and later).'],
    ['Model call 1: four canaries','Haiku listed HOTEL-PARENT, ALPHA-ROOT, BRAVO-IMPORT and DELTA-RULE, each with its file.'],
    ['Read textstats/core.py','Reading a file under textstats/ attaches that folder\'s CLAUDE.md and the rule whose paths match.'],
    ['Model call 2: six canaries','The two new ones were marked NEW. CHARLIE-LOCAL and GOLF-AGENTS never appeared.']];
  const st=document.getElementById('hcc-mem-stack'),cap=document.getElementById('hcc-mem-cap'),stats=document.getElementById('hcc-mem-stats');
  const c1=r.calls[0],c2=r.calls[1];
  function draw(i){
    cap.innerHTML='<div class="t">'+esc(STEP[i][0])+'</div><p>'+esc(STEP[i][1])+'</p>';
    const s1=i+1;
    st.innerHTML=F.map(x=>{let cls='',tag='';
      if(x.when>0&&s1>=x.when){cls=s1===x.when||(x.when===7&&s1===7)?' new':'';tag=x.when===7?'loaded on demand':'loaded at launch'}
      else if(x.when<0&&s1>=-x.when){cls=' off';tag='not loaded'}
      else{cls=' off';tag=x.when===7?'waiting for a matching file':'not reached yet'}
      return '<div class="hcc-blk'+cls+'"><span><code>'+esc(x.f)+'</code> <b>'+esc(x.c)+'</b></span><span class="w">'+tag+'</span></div>'}).join('');
    const vis=F.filter(x=>x.when>0&&s1>=x.when).length;
    stats.innerHTML=RD.stat('Canaries in context',String(vis),'of 8 planted')+RD.stat('Call 1 input',fmt(callIn(c1))+' tok','Read tool only, memory files included')+RD.stat('Call 2 cache write',fmt(c2[1])+' tok','core.py result plus the two new files');
  }
  RD.anim({card:'hcc-mem-card',ctl:'hcc-mem-ctl',n:STEP.length,draw,ms:2200,label:'Memory step'});
})();

(function(){
  const {run,fmt,usd,bar,callIn}=HCCR;
  const sk=document.getElementById('hcc-sk-bars');
  if(sk){const off=run('skill_ok_off'),on=run('skill_ok_on'),task=run('skill_task');
    const a=callIn(off.calls[0]),b=callIn(on.calls[0]);
    const draw=()=>{sk.innerHTML=bar('No project skill',a,b,'var(--c1)',fmt(a))+bar('One project skill',b,b,'var(--c4)',fmt(b),true);
      const inv=task.ev.find(e=>e.k==='tool'&&e.n==='Skill');const ci=inv?inv.c:2;
      document.getElementById('hcc-sk-note').innerHTML='First-request input with tools Read, Bash and Skill, Haiku 4.5, prompt "Reply with the single word OK." Difference: '+fmt(b-a)+' tokens, the skill\'s name and description. In the task run, the call after the Skill tool wrote '+fmt(task.calls[ci+1][1])+' tokens to the cache: the body. <span class="meas">MEASURED</span>'};
    draw();}
  const sb=document.getElementById('hcc-sub-bars');
  if(sb){const r=run('subagent');const P={in:1,cw:2,cr:.1,out:5};
    const main=r.calls.reduce((s,c)=>s+(c[0]*P.in+c[1]*P.cw+c[2]*P.cr+c[3]*P.out)/1e6,0),sub=r.cost-main;
    const first=r.ev.find(e=>e.k==='task'&&e.tok);const pin=callIn(r.calls[0]);
    sb.innerHTML='<div class="small mute" style="margin:2px 0">Context, tokens</div>'+bar('Parent, 1st request',pin,pin,'var(--c1)',fmt(pin))+bar('Subagent, 1st tool call',first.tok,pin,'var(--c3)',fmt(first.tok))+
      '<div class="small mute" style="margin:8px 0 2px">Cost at list prices</div>'+bar('Parent, 8 calls',main,r.cost,'var(--c1)',usd(main,3))+bar('Subagents, 2 runs',sub,r.cost,'var(--c3)',usd(sub,3))+bar('total_cost_usd',r.cost,r.cost,'var(--mute)',usd(r.cost,3),true);
    document.getElementById('hcc-sub-note').innerHTML='Parent cost recomputed from its per-call usage at Haiku 4.5 list prices ($1 input, $2 one-hour cache write, $0.10 cache read, $5 output per million tokens); the subagents\' share is the rest of <code>total_cost_usd</code>. The subagent figure is the <code>total_tokens</code> of its first progress record. <span class="meas">MEASURED</span>'}
  const hd=document.querySelector('#hcc-hd-table tbody');
  if(hd){const rows=[['maxturns','--max-turns 2'],['budget','--max-budget-usd 0.02'],['stream','--input-format stream-json, 2 messages'],['resume1','--session-id (persisted)'],['resume2','--resume']];
    hd.innerHTML=rows.map(([id,f])=>{const r=run(id);return '<tr><td><code>'+id+'</code></td><td><code>'+f+'</code></td><td class="num">'+r.calls.length+'</td><td class="num">'+r.turns+'</td><td><code>'+r.stop+'</code>'+(r.pass?' (tests pass)':'')+'</td><td class="num">'+usd(r.cost,4)+'</td></tr>'}).join('')}
})();

// -- the old page's September 2026 deployment list, checked against the changelog --
(function(){
  const {esc}=HCCR;const tb=document.querySelector('#hcc-cl-table tbody'),ch=document.getElementById('hcc-cl-chips');if(!tb)return;
  // [claim (old page), verdict h=holds c=corrected n=not found, what the changelog says (version, date)]
  const C=[
    ['AGENTS.md accepted alongside CLAUDE.md: 2.1.277 when no CLAUDE.md, 2.1.278 as a full alternative','c','2.1.277 (18 Sep): read "in a project with no CLAUDE.md"; nothing in 2.1.278; 2.1.281 extended it to Bedrock, Vertex, Foundry and gateways'],
    ['omitClaudeMd in agent frontmatter (2.1.271)','h','2.1.271 (14 Sep): subagents run without user, project and local CLAUDE.md; managed files still load'],
    ['managedMcpServers pushes HTTP and SSE MCP servers (2.1.259)','h','2.1.259 (2 Sep); entries that name a command are skipped'],
    ['CLAUDE_CODE_MCP_STARTUP_WAIT_MS (2.1.274)','h','2.1.274 (17 Sep): bounds how long the first non-interactive turn waits for MCP servers'],
    ['MCP disconnection notifications (2.1.273)','h','2.1.273 (15 Sep): when reconnection gives up'],
    ['--permission-prompts none for unattended hosts (2.1.259)','h','2.1.259 (2 Sep): anything that would prompt is denied; the mode still decides the rest'],
    ['maxEffortLevel caps reasoning effort on all providers (2.1.267)','h','2.1.267 (9 Sep); the lowest cap from any scope wins'],
    ['Per-command allowed_domains for Bash, PowerShell, Monitor in auto mode (2.1.271)','h','2.1.271 (14 Sep), in auto mode with sandboxing'],
    ['Auto mode defaults to a server-side classifier, "Auto mode server" row in /status (2.1.278)','h','2.1.278 (19 Sep), for Claude API and Enterprise users and on Bedrock, Vertex, Foundry and gateways'],
    ['Gateway pricing through managed settings (2.1.268) and a 1x to 10x multiplier (2.1.271)','h','2.1.268 (10 Sep) and 2.1.271 (14 Sep)'],
    ['--accept-command <sha256> pins plugin installs (2.1.271)','h','2.1.271, for claude plugin install and update'],
    ['CLAUDE_CODE_GATEWAY_HINT_HEADERS=1 (2.1.273)','h','2.1.273: x-claude-code-request-class and four other headers'],
    ['CLAUDE_GATEWAY_PROXY_IS_EGRESS_BOUNDARY=1 and per-upstream headers: maps (2.1.278)','c','Both in 2.1.277 (18 Sep), not 2.1.278'],
    ['2.1.276 fixed every request failing with 400 Input tag advisor_20260301 behind ANTHROPIC_BASE_URL','h','2.1.276 (18 Sep), a 2.1.275 regression'],
    ['Organization policy status line (2.1.261)','h','2.1.261 (4 Sep), in /status and claude doctor'],
    ['bashOutputMaxChars and taskOutputMaxChars up to 128K (2.1.261)','c','Both added in 2.1.261; 2.1.277 removed the TaskOutput tool and taskOutputMaxChars "no longer [has] any effect"'],
    ['/skill-doctor finds unused skills (2.1.261)','h','2.1.261, with their context cost'],
    ['claude plugin eval for reproducible plugin scoring (2.1.269)','h','2.1.269 (11 Sep): JSON and HTML report'],
    ['/plugin install --marketplace (2.1.275)','h','2.1.275 (17 Sep)'],
    ['OpenTelemetry effort attributes, managed-settings events, memory warning (2.1.274)','h','2.1.274 (17 Sep), all three'],
    ['WebFetch times out at 300 seconds (2.1.268)','h','2.1.268 (10 Sep); CLAUDE_CODE_WEBFETCH_DEADLINE_MS overrides'],
    ['Read-only git commands no longer ask unexpectedly (2.1.270)','h','2.1.270 (12 Sep), a 2.1.269 regression'],
    ['macOS 12 launch failures fixed (2.1.258)','h','2.1.258 (1 Sep), a 2.1.255 regression'],
    ['/output-style switches styles "across sessions"; Bash results carry file-change diffs (2.1.269)','c','2.1.269: /output-style works "including over Remote Control and in cloud and other headless sessions"; the Bash diff needs the bashEditDiffEnabled setting'],
    ['/diff panel, prompt-cache diagnostics and MCP management in VS Code (2.1.260)','c','/diff panel and cache-miss causes in 2.1.260 (3 Sep); VS Code MCP add and remove in 2.1.261'],
    ['Ctrl+Enter interrupts and sends queued messages; skills and plugins sync from claude.ai (2.1.275)','h','2.1.275 (17 Sep); 2.1.281 changed send-now to move running tools to the background'],
    ['Remote Control session forking (2.1.273)','h','2.1.273 (15 Sep)'],
    ['Claude Fable 5.1 became the default model in 2.1.257, which also tightened sandbox safeguards','c','2.1.257 (1 Sep): the default Fable model; no sandbox tightening in that entry'],
    ['Agent teams: research preview from v2.1.220, August 2026','c','2.1.32 (5 Feb 2026)'],
    ['Sandboxed bash since v2.0.5','c','2.0.24 (20 Oct 2025)'],
    ['The Task tool launches subagents','n','Renamed Agent in 2.1.63 per the subagents page; the changelog does not mention the rename'],
    ['Launched February 2025','n','Not in the changelog (earliest entry 0.2.21, 2 Apr 2025); confirmed by Anthropic\'s 24 Feb 2025 announcement'] ];
  const V={h:'<span class="pill ok">holds</span>',c:'<span class="pill mid">corrected</span>',n:'<span class="pill bad">not in changelog</span>'};
  const n=k=>C.filter(x=>x[1]===k).length;
  ch.innerHTML='<button data-m="all" class="on">All '+C.length+'</button><button data-m="h">Holds ('+n('h')+')</button><button data-m="c">Corrected ('+n('c')+')</button><button data-m="n">Not in changelog ('+n('n')+')</button>';
  function draw(f){tb.innerHTML=C.filter(x=>f==='all'||x[1]===f).map(x=>'<tr><td>'+esc(x[0])+'</td><td>'+V[x[1]]+'</td><td>'+esc(x[2])+'</td></tr>').join('')}
  RD.seg(ch,draw);draw('all');
})();
