// ---- Harness atlas: self-improving harness papers, drills, interview questions, sources ----
(function(){
  const {A,$,esc}=window.ATLX;
  const np=id=>'https://app.notion.com/p/'+id;
  const a=(u,t)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
  // one line each, taken from this knowledge base's paper pages (which carry the checks and corrections)
  const P=[
    ['3d45c17b0d0d81cd9883f783840e013f','HarnessDev','ByteDance Seed and others, 1 Sep 2026','Can a model build its own harness, then improve it? Six creator models, four domains. The best generated harness averages 67.8 against 86.2 for mature human-built references; evolution feedback agreed with held-out results in only 34 of 64 changes; a code harness written by Opus 4.8 fell from 69.3 to 33.0 on SWE-Pro when another model executed it.'],
    ['3cd5c17b0d0d81148227fbd67dc4b3ee','JIT-Agent','NUS, EverMind and others, 26 Aug 2026','Trains a 27B model to write, repair and evolve a harness per task at inference time. GLM-5.2 goes from 74.1 to 81.8 averaged over nine agent benchmarks with a harness written for it instead of its default one, at 14.9 to 54.1% lower cost than the cheapest fixed harness on three benchmarks.'],
    ['3e95c17b0d0d81dbb1a5e660ed019c8a','RRSI','Google Cloud AI Research, 21 Sep 2026','Regularises recursive harness evolution (an annealed edit budget, a critic, a pruner). +14.1 points on the split the search was scored on; out of distribution, gains of 1.8 to 4.7 points on five benchmarks, each within about one standard error, against +0.6 for unregularised evolution.'],
    ['3e25c17b0d0d81a0bb77f16cbc898bb5','SoL-Pi','NVIDIA, NTU, MIT, 17 Sep 2026','Auto-research loops over the Pi harness find four efficiency techniques (action execution, context compaction, observation handling, delegated reading) that cut recorded token traffic 44.7 to 49.0% at 93.7 to 94.3% of Pi\'s score. Single runs, no error bars.'],
    ['3cd5c17b0d0d81579a02f0431f24c6cb','Prime Agent','Prime Intellect, 24 Aug 2026','An open harness that versions its own prompts, memories, skills and subagent specs across trajectories. 95.5% on ARC-AGI-3 with Opus 5 (best of three runs), against the 30% Opus 5 scored in the official ARC harness, which the paper did not run itself.'],
    ['3c65c17b0d0d81899098d8153e100691','StateM','Independent authors, 15 Aug 2026','A state-machine runbook with checked transitions around a fixed CLI agent lifts GPT-5.5 from 83.1% to 92.1% on Terminal-Bench 2.1, same weights. The runbook was developed on the same 89 tasks it is scored on: a harness-tuned upper bound.'],
    ['3db5c17b0d0d81e3b105e033a359ad24','NeoHorse-1','TokenRhythm and others, 8 Sep 2026','Makes the serving harness the source of the training curriculum: a router\'s signals order the post-training data. Qwen3.5-4B goes from 58.94 to 64.87 averaged over ten benchmarks; the evaluate, select and update loop ran once.']];
  $('atl-papers').innerHTML=P.map(p=>'<div class="sp"><div class="n">'+a(np(p[0]),p[1])+' <span class="rt">'+p[2]+'</span></div><p>'+esc(p[3])+'</p></div>').join('');

  // drills: answers computed from the page data where they are numbers
  const tb=(A.sets.tb20.rows||[]).filter(x=>x.m==='Claude Opus 4.6').sort((x,y)=>y.v-x.v);
  const ccRank=tb.findIndex(x=>x.h==='Claude Code')+1;
  const AN=A.anim||{};const PR={in:1,w:2,r:0.1,out:5};
  const cst=cs=>cs.reduce((s,c)=>s+(c[0]*PR.in+c[1]*PR.w+c[2]*PR.r+c[3]*PR.out)/1e6,0);
  const lc=AN.loop?cst(AN.loop.calls):0,cc=AN.cc?cst(AN.cc.calls):0;
  const D=[
    ['Claude Opus 4.6 appears with '+tb.length+' different agents on the Terminal-Bench 2.0 board. Where does Claude Code, Anthropic\'s own harness, rank?',['First','Somewhere in the middle','Last'],2,
     'Rank '+ccRank+' of '+tb.length+': '+(tb[ccRank-1]?tb[ccRank-1].v:'')+'% against '+(tb[0]?tb[0].v+'% for '+tb[0].h:'')+'. Many of the leaders are third-party harnesses tuned for this board, and many rows are unverified; still, a provider harness is not automatically the best home for its model.'],
    ['HarnessTax ran Claude Fable 5 on the same 30 SWE-bench Lite tasks in Claude Code and in Pi (four tools). What did it find?',['Claude Code solved far more','About the same success; Claude Code cost about twice as much','Pi was cheaper and much worse'],1,
     '97.8% against 96.7% of attempts, at $1.33 against $0.67 per attempt. On easy tasks the harness mostly moves cost.'],
    ['Same model, same task: Claude Code reads about 13,000 tokens per call; the small Loop lab harness about 700 to 2,200. Which run cost more in API-price terms?',['Claude Code, by about 10 times','About the same','The small harness, by 10 times'],1,
     'Small harness $'+lc.toFixed(4)+', Claude Code $'+cc.toFixed(4)+' (computed from the recorded tokens at Haiku 4.5 list prices). Claude Code\'s big prefix is read from the cache at a tenth of the price, and the small harness wrote more output, which costs five times input.'],
    ['In most published SWE reinforcement-learning environments, what produces the reward?',['A judge model reading the patch','The repository\'s tests run in the container after the agent stops','Similarity to the real fix'],1,
     'Fail-to-pass tests run in the container, reward 1 or 0. Exceptions exist and are in the table: SWE-RL scores similarity to the merged patch without running anything, and Dockerless uses a model judge.'],
    ['Our mini-SWE-agent adapter sent each step to the model as plain text. Why did the model keep writing past its command?',['The prompt was unclear','Nothing ended the model\'s turn at the action: no tool-call stop and no stop sequence','The container was slow'],1,
     'A tool-calling API stops generation at the tool call; a text protocol needs a stop sequence. Without either, the model continues the transcript it has seen, including the environment\'s replies.']];
  $('atl-drills').innerHTML=D.map((d,i)=>'<div class="atl-drill" data-i="'+i+'"><div class="q">Predict: '+esc(d[0])+'</div><div class="opts">'+d[1].map((o,j)=>'<button data-j="'+j+'">'+esc(o)+'</button>').join('')+'</div><div class="ans" hidden></div></div>').join('');
  $('atl-drills').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const box=b.closest('.atl-drill');const d=D[+box.dataset.i];const j=+b.dataset.j;
    box.querySelectorAll('button').forEach((q,qq)=>{q.classList.toggle('right',qq===d[2]);q.classList.toggle('wrong',qq===j&&j!==d[2])});
    const an=box.querySelector('.ans');an.hidden=false;an.innerHTML=(j===d[2]?'<b>Right.</b> ':'<b>Not quite.</b> ')+esc(d[3])});

  const Q=[
    ['What is an agent harness? Name its parts.','The program around a model that makes it an agent: the loop (call, parse tool calls, execute, append results, stop), the tools and their schemas, context assembly (system prompt, memory files, compaction), permissions and sandbox, and the interface. The model is swappable; the harness decides what it sees and what it may do.'],
    ['The same model scores 58% in one harness and 76% in another on Terminal-Bench 2.0. How?','Tools, prompts, turn and time limits, retries, how errors are shown, whether it verifies its own work: all harness. Hard, long tasks amplify it. Check the interval (89 tasks), whether the run was verified, and whether the harness was tuned on the same tasks.'],
    ['How would you choose a coding agent for a team?','Start from constraints: models allowed (one vendor or any, local), where code may run (local OS sandbox, container, vendor cloud), CI integration, extensibility (MCP, hooks), audit and permissions, pricing model. Then measure on your own tasks: success and cost per task, since harnesses differ more in cost than success on routine work.'],
    ['Exact-string replace, patch, or whole file: trade-offs?','Exact replace is cheap and fails loudly when ambiguous, so the model can retry. Patches carry anchors and can create, delete and move files. Whole-file rewrites always apply but cost output tokens in proportion to the file and can drop code. Shell-only is general but puts escaping on the model.'],
    ['How do you build an RL environment for a coding agent?','A container image per task or repository at the pre-fix commit, a task statement (real or synthesised), a verifier (fail-to-pass plus pass-to-pass tests), a harness to act through, a reward (usually binary) and a time limit. Then scale: image caching, thousands of sandboxes, defences against reward hacking such as reading the tests.'],
    ['A paper reports a self-improving harness gaining 14 points. What do you ask?','Was it scored on the tasks the search optimised? What happens out of distribution and with a different executing model? How many runs, what intervals, what did it cost? Recent papers show in-distribution gains shrinking to a few points held out.'],
    ['OS sandbox, container or VM?','An OS sandbox (Seatbelt, Landlock, bubblewrap) limits files and network for a local process with little overhead; a container adds its own filesystem and process tree; a VM or cloud machine adds a separate kernel. Pick by what the agent can reach and who else shares the machine.']];
  $('atl-iq').innerHTML=Q.map(q=>'<details class="mist"><summary>'+esc(q[0])+'</summary><div class="b">'+esc(q[1])+'</div></details>').join('');

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
