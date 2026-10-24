// ---- Harness atlas: interview questions, sources ----
(function(){
  const {A,$,esc}=window.ATLX;
  const np=id=>'https://app.notion.com/p/'+id;
  const a=(u,t)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
  const Q=[
    ['What is an agent harness? Name its parts.','The program around a model that makes it an agent: the loop (call, parse tool calls, execute, append results, stop), the tools and their schemas, context assembly (system prompt, memory files, compaction), permissions and sandbox, and the interface. The model is swappable; the harness decides what it sees and what it may do.'],
    ['The same model scores 58% in one harness and 76% in another on Terminal-Bench 2.0. How?','Tools, prompts, turn and time limits, retries, how errors are shown, whether it verifies its own work: all harness. Hard, long tasks amplify it. Check the interval (89 tasks), whether the run was verified, and whether the harness was tuned on the same tasks.'],
    ['How would you choose a coding agent for a team?','Start from constraints: models allowed (one vendor or any, local), where code may run (local OS sandbox, container, vendor cloud), CI integration, extensibility (MCP, hooks), audit and permissions, pricing model. Then measure on your own tasks: success and cost per task, since harnesses differ more in cost than success on routine work.'],
    ['Exact-string replace, patch, or whole file: trade-offs?','Exact replace is cheap and fails loudly when ambiguous, so the model can retry. Patches carry anchors and can create, delete and move files. Whole-file rewrites always apply but cost output tokens in proportion to the file and can drop code. Shell-only is general but puts escaping on the model.'],
    ['How do you build an RL environment for a coding agent?','A container image per task or repository at the pre-fix commit, a task statement (real or synthesised), a verifier (fail-to-pass plus pass-to-pass tests), a harness to act through, a reward (usually binary) and a time limit. Then scale: image caching, thousands of sandboxes, defences against reward hacking such as reading the tests.'],
    ['A paper reports a self-improving harness gaining 14 points. What do you ask?','Was it scored on the tasks the search optimised? What happens out of distribution and with a different executing model? How many runs, what intervals, what did it cost? Recent papers show in-distribution gains shrinking to a few points held out.'],
    ['OS sandbox, container or VM?','An OS sandbox (Seatbelt, Landlock, bubblewrap) limits files and network for a local process with little overhead; a container adds its own filesystem and process tree; a VM or cloud machine adds a separate kernel. Pick by what the agent can reach and who else shares the machine.']];
  $('atl-iq').innerHTML=Q.map(q=>'<p><b>'+esc(q[0])+'</b> '+esc(q[1])+'</p>').join('');

  const S=[
    ['https://www.tbench.ai/?version=2.0','Terminal-Bench 2.0 and 2.1 public leaderboards (read through the board\'s own data endpoint, 2026-10-05)'],
    ['https://www.swebench.com/','SWE-bench Verified leaderboard, and the 2026-09-01 commit that dropped the separate bash-only board'],
    ['https://harnesstax.github.io/','HarnessTax data (7 models x 3 harnesses, chart data generated 2026-09-22) and the Arena blog post of 16 Sep 2026'],
    ['https://arxiv.org/abs/2510.11977','HAL: Holistic Agent Leaderboard (Kapoor et al., 2025)'],
    ['https://arxiv.org/abs/2405.15793','SWE-agent: agent-computer interfaces (Yang et al., 2024)'],
    ['https://arxiv.org/abs/2407.01489','Agentless (Xia et al., 2024)'],
    ['https://arxiv.org/abs/2608.17393','LEGO-RL: RL inside native coding harnesses (2026)'],
    ['https://arxiv.org/abs/2605.24220','Polar: rollouts through any agent harness (NVIDIA, 2026)'],
    ['https://pypi.org/project/mini-swe-agent/2.4.6/','mini-swe-agent 2.4.6, used for the failed experiment (its models/utils/actions_text.py recommends tool calls over the text mode)'],
    ['https://platform.claude.com/docs/en/about-claude/pricing','Anthropic pricing, read 2026-10-05'],
    ['https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview','Anthropic tool use: stop_reason "tool_use" ends the turn at the tool call']];
  $('atl-srcs').innerHTML=S.map(s=>'<li>'+a(s[0],esc(s[1]))+'</li>').join('')+(A.rl||[]).map(r=>'<li>'+String(r.src||'').split(/\s*;\s*/).filter(u=>/^https?:/.test(u)).map(u=>a(u.replace(/[)\s].*$/,''),esc(r.name))).join(', ')+' ('+esc(r.date)+')</li>').join('');
})();
