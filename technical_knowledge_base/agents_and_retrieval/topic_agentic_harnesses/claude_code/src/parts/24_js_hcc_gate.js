// ---- A model of Claude Code's permission layer (2.1.290), shared by the Reading animation and the Permission lab ----
// Built from the permissions, permission-modes and hooks docs (read 6 Oct 2026) plus orderings seen in the recordings.
// It is a teaching model, checked against the 96 recorded decisions in the Permission lab; it is not Claude Code's code.
window.HCCG=(function(){
  const STAGES=[
    {k:'hook',n:'PreToolUse hooks',d:'Your hook scripts run first; exit code 2 (or a JSON "deny") stops the call before any rule is read.'},
    {k:'deny',n:'Deny rules',d:'Any matching deny rule, from any settings level or --disallowedTools, ends it. For file tools this happens inside the tool\'s own input check.'},
    {k:'tool',n:'The tool\'s own checks',d:'Edit and Write on Haiku 4.5 and older need the file read first; Edit needs a unique match.'},
    {k:'ask',n:'Ask rules',d:'A matching ask rule needs a person. In -p nobody answers, so it is refused.'},
    {k:'safe',n:'Built-in safety checks',d:'Variables the harness cannot resolve, in-place sed, shell commands that change files, paths outside the working directories, protected paths.'},
    {k:'mode',n:'Permission mode',d:'plan blocks writes; acceptEdits approves edits and file commands in the working directory; auto asks a classifier; dontAsk turns every remaining ask into a deny.'},
    {k:'allow',n:'Allow rules',d:'A matching allow rule runs it (from a project file only if the folder is trusted; flags and --settings always count).'},
    {k:'ro',n:'Read-only set',d:'Reads in the working directory and a fixed list of read-only commands (ls, cat, echo, pwd, grep, find, git status ...) run in every mode.'},
    {k:'ask2',n:'Nothing decided: ask a person',d:'In an interactive session this is the prompt you see. In -p with no handler it becomes "This command requires approval".'},
    {k:'run',n:'The tool runs',d:'Then PostToolUse (or PostToolUseFailure) hooks, and the result goes back to the model.'}
  ];
  const IDX={};STAGES.forEach((s,i)=>IDX[s.k]=i);
  const RO=['ls','cat','echo','pwd','head','tail','grep','find','wc','which','diff','stat','du','cd','sleep'];
  const FSCMD=['mkdir','touch','rm','rmdir','mv','cp','sed'];
  function split(cmd){return cmd.split(/\s*(?:&&|\|\||;|\||&)\s*/).map(s=>s.trim()).filter(Boolean)}
  function bashMatch(pat,cmd){ // Bash(prefix *) or Bash(exact); ':*' is the same as ' *'
    pat=pat.replace(/:\*$/,' *');
    if(pat.endsWith(' *')){const p=pat.slice(0,-2);return cmd===p||cmd.startsWith(p+' ')}
    if(pat.endsWith('*'))return cmd.startsWith(pat.slice(0,-1));
    return cmd===pat;
  }
  function globMatch(pat,path){ // gitignore-ish: ** any depth, * one segment
    const re='^'+pat.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*\*/g,'\u0000').replace(/\*/g,'[^/]*').replace(/\u0000/g,'.*')+'$';
    return new RegExp(re).test(path);
  }
  function ruleHits(rule,a){
    const m=/^(\w+)(?:\((.*)\))?$/.exec(rule.trim());if(!m)return false;
    const tool=m[1],spec=m[2];
    if(a.tool==='Bash'){if(tool!=='Bash')return false;if(spec==null||spec==='*')return true;return 'parts'}
    const fileTools={Edit:['Edit','Write'],Read:['Read']};
    if(!(fileTools[tool]||[tool]).includes(a.tool))return false;
    if(spec==null)return true;
    return globMatch(spec.replace(/^\.\//,''),a.path);
  }
  // does a rule list match? kind 'allow' needs every subcommand matched; 'deny'/'ask' any subcommand
  function listHits(list,a,kind){
    for(const r of list){const h=ruleHits(r,a);
      if(h===true)return r;
      if(h==='parts'){const m=/^Bash\((.*)\)$/.exec(r.trim());const parts=split(a.cmd);
        const ok=kind==='allow'?parts.every(p=>bashMatch(m[1],p)):parts.some(p=>bashMatch(m[1],p));
        if(ok)return r}}
    return null;
  }
  // a: {tool, cmd|path, outside, readFirst}; c: {mode, allow, ask, deny, untrusted, hook, newModel}
  function decide(a,c){
    const path=[];const out=(k,o,why)=>{path.push(k);return {stage:IDX[k],o,why,path}};
    // 1 hooks
    path.push('hook');
    if(c.hook&&a.tool==='Bash'&&/(^|[;&|]\s*)rm\s|sed\s+-i/.test(a.cmd))return {stage:IDX.hook,o:'deny',why:'The guard hook exits with code 2; its stderr becomes the refusal the model reads.',path};
    // 2 deny
    path.push('deny');
    const dn=listHits(c.deny||[],a,'deny');
    if(dn)return {stage:IDX.deny,o:'deny',why:'Matches the deny rule '+dn+'.',path};
    // 3 tool checks
    path.push('tool');
    if((a.tool==='Edit')&&!a.readFirst&&!c.newModel)return {stage:IDX.tool,o:'tool',why:'Read-before-edit: the file was never read in this conversation.',path};
    // 4 ask
    path.push('ask');
    const ak=listHits(c.ask||[],a,'ask');
    if(ak)return {stage:IDX.ask,o:'deny',why:'Matches the ask rule '+ak+'; no person in a -p run, so refused.',path};
    // 5 built-in safety checks (only report a block here when the mode cannot approve it)
    path.push('safe');
    let safety=null;
    if(a.tool==='Bash'&&/\$/.test(a.cmd))safety='A variable in this command cannot be checked before it runs.';
    else if(a.tool==='Bash'&&/sed\s+-i/.test(a.cmd))safety=c.mode==='acceptEdits'?'sed -i: "contains potentially dangerous operations" (acceptEdits does not approve it).':'sed changes a file in the working directory: needs approval.';
    else if(a.outside&&a.tool!=='Read')safety='The path is outside the working directories.';
    if(safety&&c.mode!=='auto'&&c.mode!=='bypassPermissions'){
      if(c.mode==='plan'&&a.tool!=='Bash')return {stage:IDX.mode,o:'deny',why:'Plan mode: cannot write while planning.',path:path.concat(['mode'])};
      return {stage:IDX.safe,o:'deny',why:safety+(c.mode==='dontAsk'?' dontAsk turns the prompt into a refusal.':' Needs a person; refused in -p.'),path};
    }
    // 6 mode
    path.push('mode');
    const parts=a.tool==='Bash'?split(a.cmd):[];
    const isRO=a.tool==='Read'||(a.tool==='Bash'&&parts.every(p=>RO.includes(p.split(/\s+/)[0])));
    const isFs=a.tool==='Bash'&&parts.every(p=>RO.includes(p.split(/\s+/)[0])||FSCMD.includes(p.split(/\s+/)[0]));
    if(c.mode==='bypassPermissions')return {stage:IDX.mode,o:'allow',why:'bypassPermissions: no prompts (not recorded here).',path:path.concat(['run'])};
    if(c.mode==='auto'&&!isRO)return {stage:IDX.mode,o:'classifier',why:'Auto mode: a classifier model judges whether the action fits your request.',path};
    if(c.mode==='plan'&&(a.tool==='Edit'||a.tool==='Write'))return {stage:IDX.mode,o:'deny',why:'Plan mode: "Cannot write to ... while in plan mode."',path};
    if(c.mode==='acceptEdits'&&((a.tool==='Edit'||a.tool==='Write')&&!a.outside||isFs&&!isRO))return {stage:IDX.mode,o:'allow',why:'acceptEdits approves edits and file commands inside the working directory.',path:path.concat(['run'])};
    // 7 allow rules
    path.push('allow');
    const al=c.untrusted?null:listHits(c.allow||[],a,'allow');
    if(al)return {stage:IDX.allow,o:'allow',why:'Matches the allow rule '+al+'.',path:path.concat(['run'])};
    // 8 read-only
    path.push('ro');
    if(isRO&&!a.outside)return {stage:IDX.ro,o:'allow',why:a.tool==='Read'?'Reading inside the working directory needs no approval.':'Every part is in the read-only command set.',path:path.concat(['run'])};
    // 9 ask
    path.push('ask2');
    if(c.mode==='dontAsk')return {stage:IDX.ask2,o:'deny',why:'dontAsk: "Permission to use '+a.tool+' has been denied because Claude Code is running in don\'t ask mode."',path};
    const fsMsg=a.tool==='Bash'&&isFs?'A shell command that changes files in the working directory needs approval.':(a.tool==='Bash'?'"This command requires approval."':'"Claude requested permissions to write ... but you haven\'t granted it yet."');
    return {stage:IDX.ask2,o:'deny',why:fsMsg+' Nobody can answer in -p.'+(c.untrusted&&(c.allow||[]).length?' (The project file\'s allow rules were ignored: folder not trusted.)':''),path};
  }
  // The twelve scripted actions and the eight recorded configurations
  const ACTS=[
    {tool:'Read',path:'textstats/core.py'},{tool:'Bash',cmd:'ls'},{tool:'Bash',cmd:'python3 tests/test_core.py'},{tool:'Bash',cmd:'python tests/test_core.py'},
    {tool:'Edit',path:'textstats/core.py',readFirst:true},{tool:'Write',path:'notes.txt'},{tool:'Edit',path:'tests/test_core.py'},
    {tool:'Bash',cmd:"sed -i '' 's/Tiny/Small/' README.md"},{tool:'Bash',cmd:'ls && rm -f notes.txt'},{tool:'Bash',cmd:'rm -f notes.txt'},
    {tool:'Bash',cmd:'curl -sI https://example.com'},{tool:'Write',path:'../outside.txt',outside:true}];
  const RULES={allow:['Bash(python3 tests/*)','Edit(textstats/**)'],ask:['Bash(curl *)'],deny:['Edit(tests/**)','Bash(rm *)']};
  const CFGS={
    perm_manual:{mode:'default'},perm_acceptEdits:{mode:'acceptEdits'},perm_plan:{mode:'plan'},perm_dontAsk:{mode:'dontAsk'},
    perm_auto:{mode:'default'},perm_auto_sonnet:{mode:'auto',newModel:true},
    perm_rules:Object.assign({mode:'default',untrusted:true},RULES),perm_rules_flag:Object.assign({mode:'default'},RULES),
    hooks_on:{mode:'acceptEdits',hook:true}};
  // recorded outcome classes -> model outcome classes
  const asModel={ran:'allow',fail:'allow',denied:'deny',tool:'tool'};
  return {STAGES,decide,ACTS,CFGS,RULES,asModel,split};
})();
