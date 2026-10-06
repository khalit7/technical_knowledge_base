// ---- Reading tab, sections 9 and 11: cost bars, the connector counts, the old page claim by claim ----
(function(){
  const F=window.FSDK,R=F.runs,esc=RD.esc,X=window.FSDK_X;
  function bars(el,rows,max,fmtv){
    el.innerHTML=rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><span class="nm" title="'+esc(r.name)+'">'+esc(r.name)+(r.sub?'<span class="mute small" style="display:block;font-size:11px;line-height:1.2">'+esc(r.sub)+'</span>':'')+'</span><span class="track"><span class="fill" style="width:'+Math.max(0.6,100*r.v/max).toFixed(2)+'%;background:'+(r.col||'var(--acc)')+'"></span></span><span class="val">'+fmtv(r.v)+'</span></div>').join('');
  }
  const NAMES={s1_wire:['s1 our tools, hook, callback','fixed'],s2_deny:['s2 callback denies tests/','fixed, test not added'],s3_bare:['s3 defaults, nobody answers','not fixed: 6 refusals'],
    s4_session:['s4 two turns, resume, fork','fixed'],s5_subagent:['s5 Sonnet + Haiku subagent','fixed'],s6_structured:['s6 structured output','fixed'],s8_ts:['s8 TypeScript version of s1','fixed'],s9_rewind:['s9 built-in tools, then rewind','fixed, then rewound']};
  const rows=Object.keys(NAMES).map(L=>{const rs=R[L].results;const c=rs[rs.length-1].cost;return {name:NAMES[L][0],sub:NAMES[L][1]+' ('+R[L].n.model.replace('claude-','').replace('-20251001','')+')',v:c,col:L==='s3_bare'?'var(--bad)':'var(--acc)'};});
  bars(document.getElementById('fsdk-cost'),rows,Math.max(...rows.map(r=>r.v)),v=>X.usd(v));
  // connector counts
  const C=F.conn,cr=[];
  const lab=r=>(r.strict_mcp_config?'strict':'not strict')+(r.own_sdk_server?', + our server':'');
  C.batch1.forEach(r=>cr.push({name:'batch 1, '+lab(r),sub:r.mcp_servers+' servers, '+r.tools+' tools, '+X.usd(r.cost_usd),v:r.input_total,col:r.strict_mcp_config?'var(--good)':'var(--bad)'}));
  C.batch2.forEach(r=>cr.push({name:'batch 2, '+lab(r),sub:r.mcp_servers+' servers, '+r.tools+' tools, '+X.usd(r.cost_usd),v:r.input_total,col:r.strict_mcp_config?'var(--good)':'var(--bad)'}));
  bars(document.getElementById('fsdk-conn'),cr,Math.max(...cr.map(r=>r.v)),v=>X.fmt(v));

  // old page, claim by claim (from src/coverage.json, kept in step by check_page.py)
  const OK='<span class="pill ok">holds</span>',BAD='<span class="pill bad">wrong</span>',MID='<span class="pill mid">partly</span>',UPD='<span class="pill mid">updated</span>';
  const T=[
   ['Renamed from the Claude Code SDK "in late 2025"',OK,'29 September 2025; section 1'],
   ['Packages the entire Claude Code harness as a library',MID,'It drives a bundled Claude Code binary as a child process over JSON lines; section 1'],
   ['Tool suite includes glob/grep',MID,'Glob and Grep are not in the default set on macOS or Linux (our init records); Claude Code searches with Bash; section 3'],
   ['Python claude-agent-sdk, TypeScript @anthropic-ai/claude-agent-sdk',OK,'0.2.163 and 0.3.291 on 6 Oct 2026; section 1'],
   ['LangGraph gives primitives, the SDK a finished agent you configure',OK,'Section 10 table'],
   ['Core bet: agents work best with a computer, a filesystem and a shell',OK,'Blog: "give your agents a computer"; section 1'],
   ['query() is stateless per call',BAD,'Each call writes a session file and can be resumed; section 2'],
   ['ClaudeSDKClient (Python) or streaming sessions for multi-turn',OK,'TypeScript has no client class; section 2'],
   ['Managed Agents "since September 2026"',BAD,'Public beta since 8 April 2026; the auto permission policy came on 10 September 2026; section 10'],
   ['A beta command attaches a terminal to a live session',OK,'ant CLI v1.32.0, ant beta:sessions connect (10 Sep 2026, verified on the harnesses pages)'],
   ['OpenAI put the equivalent behind its Agents API the same day',OK,'Agents API public beta 10 Sep 2026; section 10'],
   ['Custom tools in-process via @tool and an in-process MCP server, no subprocess hop',OK,'Measured: 1 to 5 ms per call over the pipe; section 4'],
   ['Permissions: allowedTools, permissionMode, canUseTool as the SDK\'s permission prompt',MID,'canUseTool sees only calls nothing earlier settled; six-step order; section 5'],
   ['MCP servers over stdio, HTTP or SSE',OK,'Section 4'],
   ['Skills: only name and description in the prompt, body on demand',OK,'Filesystem only; the skills option filters them; see Claude Code, taken apart'],
   ['Subagents delegated "via a Task tool"',UPD,'The tool is Agent; Task is an alias still shown in the init record; section 6'],
   ['Hooks as callbacks on PreToolUse, PostToolUse, SessionStart, Stop',MID,'Python callbacks cover 10 events and not SessionStart; TypeScript 33; section 5'],
   ['Sessions resume by id; compaction near the limit',OK,'Sections 2 and 7'],
   ['Structured output: "prompt-level; validate downstream"',BAD,'output_format with a JSON schema, validated and retried; section 8'],
   ['Models: Claude via Bedrock and Vertex',UPD,'Also Foundry and Claude Platform on AWS; section 10'],
   ['Observability: hooks and OpenTelemetry export',OK,'Telemetry is Claude Code\'s, off until enabled; section 10'],
   ['OpenAI Agents SDK: minimal primitives, Runner.run, handoffs, guardrails, output_type, LiteLLM, built-in traces, successor of Swarm',OK,'Section 10 table; depth on Typed agent libraries'],
   ['Docs link docs.claude.com/en/api/agent-sdk/overview',UPD,'Redirects to code.claude.com/docs/en/agent-sdk/overview'],
   ['Best-practices link on anthropic.com/engineering',UPD,'Redirects to code.claude.com/docs/en/best-practices; see Further reading'],
   ['8 min read',UPD,'This page is about 40 minutes: it now carries the runs']
  ];
  document.getElementById('fsdk-old').innerHTML='<thead><tr><th>Old page said</th><th>Verdict</th><th>Where it stands now</th></tr></thead><tbody>'+T.map(r=>'<tr><td>'+esc(r[0])+'</td><td>'+r[1]+'</td><td>'+esc(r[2])+'</td></tr>').join('')+'</tbody>';
  window.FSDK_OLD=T.length;
})();
