// ---- Reading tab, part 3: skill startup cost, headless limits, the changelog check (memory canaries and the subagent run are the scenes 42 and 43) ----
(function(){
  const {run,fmt,usd,bar,callIn}=HCCR;
  const sk=document.getElementById('hcc-sk-bars');
  if(sk){const off=run('skill_ok_off'),on=run('skill_ok_on'),task=run('skill_task');
    const a=callIn(off.calls[0]),b=callIn(on.calls[0]);
    const draw=()=>{sk.innerHTML=bar('No project skill',a,b,'var(--c1)',fmt(a))+bar('One project skill',b,b,'var(--c4)',fmt(b),true);
      const inv=task.ev.find(e=>e.k==='tool'&&e.n==='Skill');const ci=inv?inv.c:2;
      document.getElementById('hcc-sk-note').innerHTML='First-request input with tools Read, Bash and Skill, Haiku 4.5, prompt "Reply with the single word OK." Difference: '+fmt(b-a)+' tokens, the skill\'s name and description. In the task run, the call after the Skill tool wrote '+fmt(task.calls[ci+1][1])+' tokens to the cache: the body. <span class="meas">MEASURED</span>'};
    draw();}
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
