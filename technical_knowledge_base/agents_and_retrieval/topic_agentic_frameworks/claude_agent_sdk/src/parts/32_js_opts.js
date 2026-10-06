// ---- Options lab: ClaudeAgentOptions -> code, command line (as _build_command() in 0.2.163 builds it), consequences ----
(function(){
  const F=window.FSDK,esc=RD.esc,X=window.FSDK_X;
  const SYS="You are a coding agent working in a small Python repository. Use the tools to look at files, edit code and run the tests. When the tests pass, reply with one sentence saying what you changed. Never use the em-dash character.";
  const SCHEMA={"type":"object","additionalProperties":false,"required":["changes","tests_passing"],"properties":{"changes":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["file","function","bug","fix"],"properties":{"file":{"type":"string"},"function":{"type":"string"},"bug":{"type":"string"},"fix":{"type":"string"}}}},"tests_passing":{"type":"boolean"}}};
  // Python's json.dumps spacing (", " and ": "), as the SDK writes it
  const pyj=v=>v===null?'null':Array.isArray(v)?'['+v.map(pyj).join(', ')+']':typeof v==='object'?'{'+Object.keys(v).map(k=>JSON.stringify(k)+': '+pyj(v[k])).join(', ')+'}':JSON.stringify(v);
  const FIELDS=[
    ['model','model',[['haiku','"haiku"'],['sonnet','"sonnet"'],['opus','"opus"']]],
    ['sys','system_prompt',[['unset','not set (empty prompt)'],['own','our short prompt (a string)'],['emd','one line (the em-dash rule)'],['preset','preset "claude_code"'],['append','preset + append']]],
    ['tools','tools',[['unset','not set (default set)'],['none','[] (no built-ins)'],['reb','["Read","Edit","Bash"]'],['reba','["Read","Edit","Bash","Agent"]'],['preset','preset "claude_code"']]],
    ['own','mcp_servers',[['off','none'],['repo','our 4 tools, in-process']]],
    ['mode','permission_mode',[['unset','not set'],['default','"default"'],['acceptEdits','"acceptEdits"'],['dontAsk','"dontAsk"'],['plan','"plan"'],['auto','"auto"'],['bypassPermissions','"bypassPermissions"']]],
    ['allow','allowed_tools',[['none','[]'],['test','["Bash(python3 tests/test_core.py)"]'],['repo','["mcp__repo__*"]']]],
    ['cb','can_use_tool',[['off','not set'],['on','our callback']]],
    ['hooks','hooks',[['off','none'],['on','PreToolUse + PostToolUse callbacks']]],
    ['agents','agents',[['off','none'],['on','{"test-runner": AgentDefinition(...)}']]],
    ['ss','setting_sources',[['unset','not set (all)'],['none','[]'],['project','["project"]']]],
    ['strict','strict_mcp_config',[['off','False (default)'],['on','True']]],
    ['out','output_format',[['off','none'],['on','JSON schema (as in s6)']]],
    ['sess','session',[['new','new session'],['resume','resume="<id>"'],['fork','resume + fork_session']]],
    ['ckpt','file checkpointing',[['off','off'],['on','enable_file_checkpointing + replay-user-messages']]],
    ['turns','max_turns',[['20','20'],['unset','not set']]]
  ];
  const P={
    s1_wire:{model:'haiku',sys:'own',tools:'none',own:'repo',mode:'unset',allow:'none',cb:'on',hooks:'on',agents:'off',ss:'none',strict:'on',out:'off',sess:'new',ckpt:'off',turns:'20'},
    s3_bare:{model:'haiku',sys:'emd',tools:'preset',own:'off',mode:'default',allow:'none',cb:'off',hooks:'off',agents:'off',ss:'none',strict:'on',out:'off',sess:'new',ckpt:'off',turns:'20'},
    s5_subagent:{model:'sonnet',sys:'append',tools:'reba',own:'off',mode:'acceptEdits',allow:'test',cb:'off',hooks:'off',agents:'on',ss:'none',strict:'on',out:'off',sess:'new',ckpt:'off',turns:'20'},
    s6_structured:{model:'haiku',sys:'own',tools:'none',own:'repo',mode:'unset',allow:'none',cb:'on',hooks:'off',agents:'off',ss:'none',strict:'on',out:'on',sess:'new',ckpt:'off',turns:'20'},
    s9_rewind:{model:'haiku',sys:'own',tools:'reb',own:'off',mode:'acceptEdits',allow:'test',cb:'off',hooks:'off',agents:'off',ss:'none',strict:'on',out:'off',sess:'new',ckpt:'on',turns:'20'},
    svc:{model:'haiku',sys:'own',tools:'none',own:'repo',mode:'dontAsk',allow:'repo',cb:'off',hooks:'on',agents:'off',ss:'none',strict:'on',out:'off',sess:'new',ckpt:'off',turns:'20'}
  };
  let S=Object.assign({},P.s1_wire),preset='s1_wire',lang='py';
  const form=document.getElementById('fo-form');
  form.innerHTML=FIELDS.map(f=>'<label>'+f[1]+'<select data-k="'+f[0]+'">'+f[2].map(o=>'<option value="'+o[0]+'">'+esc(o[1])+'</option>').join('')+'</select></label>').join('');
  const sysText=()=>S.sys==='own'?SYS:S.sys==='emd'?'Never use the em-dash character.':S.sys==='append'?'Delegate every test run to the test-runner agent; do not run tests yourself. Never use the em-dash character.':'';
  const toolList=()=>({none:[],reb:['Read','Edit','Bash'],reba:['Read','Edit','Bash','Agent']})[S.tools];
  const allowList=()=>({none:[],test:['Bash(python3 tests/test_core.py)'],repo:['mcp__repo__*']})[S.allow];
  function argv(){
    const a=['--output-format','stream-json','--verbose'];
    if(S.sys==='unset')a.push('--system-prompt','');else if(S.sys==='own'||S.sys==='emd')a.push('--system-prompt',sysText());else if(S.sys==='append')a.push('--append-system-prompt',sysText());
    if(S.tools==='preset')a.push('--tools','default');else if(S.tools!=='unset')a.push('--tools',toolList().join(','));
    if(allowList().length)a.push('--allowedTools',allowList().join(','));
    if(S.turns!=='unset')a.push('--max-turns',S.turns);
    a.push('--model',S.model);
    if(S.cb==='on')a.push('--permission-prompt-tool','stdio');
    if(S.mode!=='unset')a.push('--permission-mode',S.mode);
    if(S.sess!=='new')a.push('--resume=id');
    if(S.own==='repo')a.push('--mcp-config',pyj({mcpServers:{repo:{type:'sdk',name:'repo'}}}));
    if(S.strict==='on')a.push('--strict-mcp-config');
    if(S.sess==='fork')a.push('--fork-session');
    if(S.ss!=='unset')a.push('--setting-sources='+(S.ss==='project'?'project':''));
    if(S.ckpt==='on')a.push('--replay-user-messages');
    if(S.out==='on')a.push('--json-schema',pyj(SCHEMA));
    a.push('--input-format','stream-json');
    return a;
  }
  const q=s=>s===''?'""':/[\s"{}()*,]/.test(s)?"'"+s+"'":s;
  function initMsg(){
    const o={subtype:'initialize',hooks:S.hooks==='on'?{PreToolUse:[{matcher:null,hookCallbackIds:['hook_0']}],PostToolUse:[{matcher:null,hookCallbackIds:['hook_1']}]}:null};
    if(S.agents==='on')o.agents={'test-runner':{description:'Runs the test suite and reports which tests fail ...',prompt:'Run `python3 tests/test_core.py` with Bash ...',tools:['Bash'],model:'haiku',background:false,maxTurns:4}};
    return JSON.stringify(o,null,1)+(S.ckpt==='on'?'\n\nenvironment: CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING set by the SDK':'');
  }
  function code(){
    const py=[],ts=[];const P1=(k,v)=>py.push('    '+k+'='+v+','),T1=(k,v)=>ts.push('    '+k+': '+v+',');
    P1('model','"'+S.model+'"');T1('model','"'+S.model+'"');
    if(S.sys==='own'||S.sys==='emd'){P1('system_prompt','SYSTEM');T1('systemPrompt','SYSTEM');}
    if(S.sys==='preset'){P1('system_prompt','{"type": "preset", "preset": "claude_code"}');T1('systemPrompt','{ type: "preset", preset: "claude_code" }');}
    if(S.sys==='append'){P1('system_prompt','{"type": "preset", "preset": "claude_code", "append": APPEND}');T1('systemPrompt','{ type: "preset", preset: "claude_code", append: APPEND }');}
    if(S.tools==='preset'){P1('tools','{"type": "preset", "preset": "claude_code"}');T1('tools','{ type: "preset", preset: "claude_code" }');}
    else if(S.tools!=='unset'){const l=JSON.stringify(toolList());P1('tools',l);T1('tools',l);}
    if(S.own==='repo'){P1('mcp_servers','{"repo": create_sdk_mcp_server("repo", tools=[list_files, read_file, edit_file, run_tests])}');T1('mcpServers','{ repo: createSdkMcpServer({ name: "repo", tools: [listFiles, readFile, editFile, runTests] }) }');}
    if(S.mode!=='unset'){P1('permission_mode','"'+S.mode+'"');T1('permissionMode','"'+S.mode+'"');}
    if(allowList().length){P1('allowed_tools',JSON.stringify(allowList()));T1('allowedTools',JSON.stringify(allowList()));}
    if(S.cb==='on'){P1('can_use_tool','can_use_tool');T1('canUseTool','canUseTool');}
    if(S.hooks==='on'){P1('hooks','{"PreToolUse": [HookMatcher(hooks=[pre])], "PostToolUse": [HookMatcher(hooks=[post])]}');T1('hooks','{ PreToolUse: [{ hooks: [pre] }], PostToolUse: [{ hooks: [post] }] }');}
    if(S.agents==='on'){P1('agents','{"test-runner": AgentDefinition(description=..., prompt=..., tools=["Bash"], model="haiku")}');T1('agents','{ "test-runner": { description: ..., prompt: ..., tools: ["Bash"], model: "haiku" } }');}
    if(S.ss!=='unset'){const v=S.ss==='project'?'["project"]':'[]';P1('setting_sources',v);T1('settingSources',v);}
    if(S.strict==='on'){P1('strict_mcp_config','True');T1('strictMcpConfig','true');}
    if(S.out==='on'){P1('output_format','{"type": "json_schema", "schema": SCHEMA}');T1('outputFormat','{ type: "json_schema", schema: SCHEMA }');}
    if(S.sess!=='new'){P1('resume','session_id');T1('resume','sessionId');}
    if(S.sess==='fork'){P1('fork_session','True');T1('forkSession','true');}
    if(S.ckpt==='on'){P1('enable_file_checkpointing','True');P1('extra_args','{"replay-user-messages": None}');T1('enableFileCheckpointing','true');T1('extraArgs',"{ 'replay-user-messages': null }");}
    if(S.turns!=='unset'){P1('max_turns',S.turns);T1('maxTurns',S.turns);}
    const pyc='options = ClaudeAgentOptions(\n'+py.join('\n')+'\n)\n'+(S.cb==='on'?'# can_use_tool needs a streamed prompt in practice: pass an async iterator of user messages\n':'')+'async for message in query(prompt=prompt, options=options):\n    ...';
    const tsc='for await (const message of query({ prompt, options: {\n'+ts.join('\n')+'\n} })) {\n  ...\n}';
    return lang==='py'?pyc:tsc;
  }
  // consequences, each with its evidence
  function warn(){
    const w=[];const add=(c,t,tag)=>w.push('<li class="'+c+'">'+t+'<span class="tg">'+tag+'</span></li>');
    const builtins=S.tools==='unset'||S.tools==='preset'||S.tools==='reb'||S.tools==='reba';
    const hasEditBash=builtins;
    if(S.sys==='unset')add('bad','System prompt is empty: the SDK sends <code>--system-prompt ""</code>; Claude Code\'s own prompt is not used unless you ask for the preset.','SOURCE DOCS');
    if(S.sys==='preset'||S.sys==='append')add('info','Claude Code\'s system prompt is used: about 6,200 more tokens per call on Haiku than a short prompt of your own (7,612 against 1,388 on the frameworks root).','MEASURED');
    if(S.tools==='unset')add('bad','No tools flag: Claude Code\'s full default set (29 tools in our init record), including web access and the subagent tool.','SOURCE MEASURED');
    if(S.ss==='unset')add('bad','Settings from this machine are read: user, project and local settings, their hooks, CLAUDE.md files, skills and commands.','DOCS');
    if(S.ss==='project')add('info','Project settings, CLAUDE.md and .mcp.json of the working directory are read; user settings are not.','DOCS');
    if(S.strict==='off')add('bad','MCP servers from .mcp.json, settings and plugins load, and with a claude.ai login the account\'s connectors may join: we counted 0, 165 and 122 extra tools on three such starts, up to 128,306 tokens for a one-word answer.','MEASURED DOCS');
    else add('ok','Only the MCP servers you pass are loaded (3 of 3 strict starts loaded nothing else).','MEASURED');
    const asks=(S.mode==='unset'||S.mode==='default')&&S.cb==='off';
    if(asks&&hasEditBash&&S.allow!=='test')add('bad','Edits and most shell commands will need approval and nobody answers: they are refused, as in run s3 (6 refusals, tests still failing, subtype "success").','MEASURED');
    else if(asks&&hasEditBash)add('bad','Edits need approval and nobody answers: refused. Only the exact allowed command runs.','MEASURED DOCS');
    if(S.own==='repo'&&S.cb==='off'&&S.allow!=='repo'&&S.mode!=='bypassPermissions'&&S.mode!=='auto')add('bad','Your own MCP tools ask for permission too (every call reached the callback in run s4); with no callback and no allow rule they are refused.','MEASURED');
    if(S.mode==='acceptEdits')add('info','acceptEdits approves file edits and simple file commands in the working directory; other shell commands still need an allow rule or a callback (run s5: three test-command variants refused).','DOCS MEASURED');
    if(S.mode==='dontAsk')add('ok','dontAsk: anything not allowed is denied without asking; the callback is skipped. With an allow list this is an exact whitelist.','DOCS');
    if(S.mode==='plan')add('info','plan: Claude explores and plans without editing; edits and shell writes go to your callback regardless of allow rules.','DOCS');
    if(S.mode==='auto')add('info','auto: a model classifier approves or denies each call. Not available on Haiku 4.5: the Claude Code child saw a silent fallback to the default mode.','DOCS MEASURED');
    if(S.mode==='bypassPermissions')add('bad','bypassPermissions approves everything that deny rules do not stop; "allowed_tools does not constrain bypassPermissions".'+(S.cb==='on'?' Your callback is shadowed: the SDK warns (CanUseToolShadowedWarning).':''),'DOCS SOURCE');
    if(S.cb==='on')add('ok','can_use_tool sets <code>--permission-prompt-tool stdio</code>: questions come to your function over the pipe. It sees only calls nothing earlier settled.','SOURCE MEASURED');
    if(S.cb==='on'&&S.allow==='repo')add('info','mcp__repo__* is allowed, so your callback will never be asked about your own tools.','DOCS');
    if(S.hooks==='on')add('ok','Hooks travel in the initialize message, not as flags; PreToolUse runs before every other permission step and sees every call.','SOURCE DOCS');
    if(S.agents==='on'&&S.tools!=='unset'&&S.tools!=='preset'&&S.tools!=='reba')add('bad','Subagents are defined but the tools list has no Agent tool, so the main agent cannot start them.','DOCS');
    if(S.agents==='on')add('info','Subagents run in the background unless background=False; their cost shows in model_usage, not in usage (run s5).','DOCS MEASURED');
    if(S.out==='on')add('ok','Claude Code adds a StructuredOutput tool (181 more first-call tokens in s6); result.structured_output holds the parsed object.','MEASURED');
    if(S.sess!=='new')add('info','Resumed: total_cost_usd and model_usage include the session\'s earlier spend (s4).'+(S.sess==='fork'?' The fork gets a new session id.':''),'MEASURED DOCS');
    if(S.ckpt==='on')add('ok','rewind_files() can restore files changed by Write, Edit and NotebookEdit; not Bash changes (s9 restored "2 failed").','DOCS MEASURED');
    if(S.turns==='unset')add('info','No max_turns: there is no top-level session timeout either, so a looping agent runs until something else stops it.','DOCS');
    add('info','Every query() writes a session transcript under ~/.claude/projects/ (Python has no switch for it in 0.2.163; TypeScript: persistSession: false).','DOCS MEASURED');
    return w.join('');
  }
  function ctx(){
    if(S.strict==='off')return ['up to 128,306','non-strict start with a claude.ai login (counted)'];
    if(S.tools==='none'&&(S.sys==='own'||S.sys==='emd')&&S.own==='repo')return S.out==='on'?['1,571','run s6']:['1,390','run s1 (TypeScript s8: 1,566)'];
    if(S.tools==='none'&&(S.sys==='preset'||S.sys==='append')&&S.own==='repo')return ['7,612','frameworks root, preset + our tools'];
    if(S.tools==='reb'&&(S.sys==='own'||S.sys==='emd'))return ['5,543','run s9'];
    if(S.tools==='reba'&&(S.sys==='preset'||S.sys==='append'))return S.model==='sonnet'?['7,042','run s5, Sonnet 5.5']:['not measured','Sonnet run s5: 7,042'];
    if((S.tools==='preset'||S.tools==='unset')&&(S.sys==='unset'||S.sys==='emd'))return ['14,703','run s3'];
    return ['not measured','no run with this combination'];
  }
  function render(){
    form.querySelectorAll('select').forEach(s=>{s.value=S[s.dataset.k];});
    const a=argv();
    document.getElementById('fo-argv').textContent='claude '+a.map(q).join(' ');
    document.getElementById('fo-init').textContent=initMsg();
    document.getElementById('fo-code').textContent=code();
    document.getElementById('fo-warn').innerHTML=warn();
    const c=ctx();
    document.getElementById('fo-stats').innerHTML=RD.stat('Nearest measured first call',c[0]+(/\d/.test(c[0])?' tokens':''),c[1])+RD.stat('Flags on the command line',a.filter(x=>x.startsWith('--')).length,'');
    const m=document.getElementById('fo-match');
    const rec=preset&&F.runs[preset]&&F.runs[preset].argv;
    if(rec){const same=JSON.stringify(rec)===JSON.stringify(a);m.className='fo-match '+(same?'ok':'no');m.textContent=same?'Rebuilt command = the command run '+preset.split('_')[0]+' really started ('+rec.length+' arguments, recorded by the stand-in binary).':'Changed from run '+preset.split('_')[0]+': the recorded command differs now.';}
    else{m.className='fo-match';m.textContent='';}
  }
  form.addEventListener('change',e=>{const k=e.target.dataset.k;if(!k)return;S[k]=e.target.value;render();});
  document.getElementById('fo-presets').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;preset=b.dataset.p;S=Object.assign({},P[preset]);if(!F.runs[preset])preset=null;render();});
  RD.seg(document.getElementById('fo-lang'),m=>{lang=m;render();});
  window.FSDK_OPTS={argvFor:p=>{const o=S,pr=preset;S=Object.assign({},P[p]);const a=argv();S=o;preset=pr;return a;}};
  render();
})();
