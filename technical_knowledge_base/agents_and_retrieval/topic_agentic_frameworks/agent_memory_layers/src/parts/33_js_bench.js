// ---- Published numbers tab (t-bench): LOCOMO dispute dot plot and the full claims table ----
(function(){
  const M0='https://arxiv.org/abs/2504.19413',ZB='https://www.getzep.com/blog/lies-damn-lies-statistics-is-mem0-really-sota-in-agent-memory/',
    ZI='https://github.com/getzep/zep-papers/issues/5',LB='https://www.letta.com/blog/benchmarking-ai-agent-memory/',
    ZD='https://www.getzep.com/blog/the-retrieval-tradeoff-what-50-experiments-taught-us-about-context-engineering/',
    MR='https://github.com/mem0ai/mem0',ZP='https://arxiv.org/abs/2501.13956',MG='https://arxiv.org/abs/2310.08560',
    MAB='https://arxiv.org/abs/2507.05257',LME='https://arxiv.org/abs/2410.10813',MD='https://docs.mem0.ai/core-concepts/memory-evaluation';
  // step groups of the LOCOMO story; w: v vendor own, r rival, b baseline
  const G=[
    {d:'28 Apr 2025',t:'Mem0 paper',c:'Mem0\'s paper runs every system itself with gpt-4o-mini: Mem0 66.88, its graph variant Mem0g 68.44, Zep 65.99, and the full-context baseline 72.90, above both Mem0 variants. Mem0 leads on latency and tokens (1,764 memory tokens per conversation against 26,031 for full context), not on accuracy.',
     p:[['Full context',72.90,'b',M0,'Mem0 paper, Table 2'],['Mem0g',68.44,'v',M0,'Mem0 paper, Table 2'],['Mem0',66.88,'v',M0,'Mem0 paper, Table 2'],['Zep',65.99,'r',M0,'run by Mem0'],['Best RAG',60.97,'b',M0,'k=2, chunk 256'],['LangMem',58.10,'r',M0,'run by Mem0'],['OpenAI memory',52.90,'r',M0,'run by Mem0'],['A-Mem',48.38,'r',M0,'re-run by Mem0']]},
    {d:'6 May 2025',t:'Zep replies: 84%',c:'Zep\'s blog reruns Zep with its own configuration and reports 84%, blaming three setup errors in Mem0\'s run (both speakers given the user role, timestamps appended to text instead of the created_at field, sequential searches inflating latency).',
     p:[['Zep',84,'v',ZB,'first version of the post, later corrected']]},
    {d:'8 May 2025',t:'Mem0 replies: 58.44%',c:'Mem0\'s CTO opens an issue on Zep\'s repository: the 84% put correct answers on category 5 (the adversarial questions, excluded from the denominator) into the numerator. Mem0\'s own rerun gives Zep 58.44%.',
     p:[['Zep',58.44,'r',ZI,'Mem0\'s rerun, GitHub issue']]},
    {d:'12 May 2025',t:'Zep corrects: 75.14%',c:'Zep accepts the calculation error and corrects its score to 75.14% (plus or minus 0.17 over 10 runs), still above Mem0\'s best 68.44, and stands by its critique of Mem0\'s setup.',
     p:[['Zep',75.14,'v',ZI,'10 runs, mean']]},
    {d:'12 Aug 2025',t:'Letta: a file system scores 74%',c:'Letta stores the conversation as files and gives a gpt-4o-mini agent grep, search_files, open and close: 74.0%. Its point: whether the agent can use a retrieval tool well matters more than the retrieval mechanism.',
     p:[['Letta filesystem',74.0,'v',LB,'gpt-4o-mini agent with file tools']]},
    {d:'9 Dec 2025',t:'Zep sweeps its retrieval budget',c:'Zep varies how many edges and nodes it retrieves: 69.62% at 5 edges and 2 nodes, 77.06% at its default 15/5, 80.32% at 30/30, with gpt-4o-mini as agent and grader. The same product moves 10 points with one setting.',
     p:[['Zep',69.62,'v',ZD,'5 edges / 2 nodes'],['Zep',77.06,'v',ZD,'default 15 / 5'],['Zep',80.32,'v',ZD,'30 / 30']]},
    {d:'Apr 2026',t:'Mem0\'s new algorithm: 92.5',c:'Mem0 announces its ADD-only algorithm with LOCOMO 92.5 (old 71.4) at "a top_200 retrieval budget", on its managed platform, "which includes proprietary optimizations not available in the open-source SDK". Not comparable with any number above: different product, retrieval budget and (unstated) answer model.',
     p:[['Mem0 platform',92.5,'v',MR,'top_200 retrieval, managed platform'],['Mem0 (old, per README)',71.4,'v',MR,'README table']]}
  ];
  const ROWS=['Mem0','Zep','Letta','Baselines and others'];
  const row=n=>/^Mem0/.test(n)?0:n==='Zep'?1:/^Letta/.test(n)?2:3;
  const col=w=>w==='v'?'var(--c2)':w==='r'?'var(--c4)':'var(--dim)';
  const el=document.getElementById('fmem-bx-plot'),det=document.getElementById('fmem-bx-det');
  let cur=0,sel=null;
  function draw(i){cur=i;const W=RD.width(el),pl=Math.min(150,W*.3),pr=14,top=22,rh=46,H=top+rh*ROWS.length+26;
    const x=v=>pl+(v-45)/(95-45)*(W-pl-pr);let s='';
    for(let v=50;v<=90;v+=10){s+='<line x1="'+x(v)+'" x2="'+x(v)+'" y1="'+(top-6)+'" y2="'+(H-22)+'" stroke="var(--line)"/>'+RD.t(x(v),H-8,v+'%',{a:'middle',fs:10.5,fill:'var(--mute)'})}
    ROWS.forEach((r,k)=>{s+=RD.t(6,top+rh*k+rh/2+4,r,{fs:12,w:600})});
    let all=[];G.forEach((g,gi)=>{if(gi<=i)g.p.forEach((p,pi)=>all.push({p,gi,pi}))});
    const cnt={};all.forEach(o=>{const k=row(o.p[0]);cnt[k]=(cnt[k]||0)+1;o.k=k;o.j=cnt[k]});
    all.forEach(o=>{const cy=top+rh*o.k+8+((o.j-1)%3)*14,cx=x(o.p[1]),nw=o.gi===i;
      s+='<circle data-g="'+o.gi+'" data-p="'+o.pi+'" cx="'+cx+'" cy="'+cy+'" r="'+(nw?7:5.5)+'" fill="'+col(o.p[2])+'" stroke="'+(nw?'var(--ink)':'var(--bg)')+'" stroke-width="1.5" style="cursor:pointer"><title>'+RD.esc(o.p[0]+' '+o.p[1]+'%')+'</title></circle>';
      if(nw)s+=RD.t(cx+(cx>W-90?-10:10),cy+4,o.p[1],{fs:10.5,a:cx>W-90?'end':'start'})});
    el.innerHTML=RD.svg(W,H,s,'LOCOMO scores published for Mem0, Zep, Letta and baselines, revealed in date order');
    const g=G[i];det.innerHTML='<b>'+g.d+': '+RD.esc(g.t)+'.</b> '+RD.esc(g.c);}
  el.addEventListener('click',e=>{const c=e.target.closest('circle');if(!c)return;const p=G[+c.dataset.g].p[+c.dataset.p];
    det.innerHTML='<b>'+RD.esc(p[0])+': '+p[1]+'%</b> ('+G[+c.dataset.g].d+'; '+(p[2]==='v'?'vendor, own product':p[2]==='r'?'rival\'s run':'baseline')+'; '+RD.esc(p[4])+'). <a href="'+p[3]+'" target="_blank" rel="noopener noreferrer">source</a>'});
  const A=RD.anim({card:'fmem-bx-plot',ctl:'fmem-bx-ctl',n:G.length,ms:2600,draw,label:'Step through the LOCOMO dispute',tab:'t-bench',start:G.length-1});
  RD.onResize(()=>A.redraw(),'t-bench');
  // full table
  const T=[
    ['LOCOMO','Mem0','66.88 (Mem0g 68.44)','v','gpt-4o-mini','28 Apr 2025',M0,'Paper system (1.x pipeline); full context 72.90 in the same table'],
    ['LOCOMO','Zep','65.99','r','gpt-4o-mini','28 Apr 2025',M0,'Run by Mem0'],
    ['LOCOMO','Zep','84 (retracted)','v','gpt-4o-mini','6 May 2025',ZB,'Category-5 correct answers counted in the numerator only'],
    ['LOCOMO','Zep','58.44','r','gpt-4o-mini','8 May 2025',ZI,'Mem0\'s rerun with Mem0\'s template'],
    ['LOCOMO','Zep','75.14 &plusmn; 0.17','v','gpt-4o-mini','12 May 2025',ZI,'10 runs'],
    ['LOCOMO','Letta (file tools)','74.0','v','gpt-4o-mini','12 Aug 2025',LB,'grep, search_files, open, close'],
    ['LOCOMO','Zep','69.62 to 80.32','v','gpt-4o-mini (agent and grader)','9 Dec 2025',ZD,'5/2 to 30/30 edges/nodes; default 15/5 77.06'],
    ['LOCOMO','Mem0 platform','92.5','v','not stated','Apr 2026',MD,'top_200 retrieval; managed platform, not the open-source SDK'],
    ['LongMemEval S','Zep','63.8 vs full context 55.4','v','gpt-4o-mini','20 Jan 2025',ZP,'115K-token histories; Zep context 1.6K tokens'],
    ['LongMemEval S','Zep','71.2 vs full context 60.2','v','gpt-4o','20 Jan 2025',ZP,'the "+18.5%" is relative; Zep lower on single-session-assistant (94.6 to 80.4)'],
    ['LongMemEval S','GPT-4o, no memory system','60.6 (vs 87.0 given only the evidence sessions)','i','gpt-4o','14 Oct 2024',LME,'the benchmark paper: "30% to 60%" drops for long-context models'],
    ['LongMemEval','Mem0 platform','94.4 (old 67.8)','v','not stated','Apr 2026',MD,'top_200 retrieval; managed platform'],
    ['DMR','MemGPT','93.4 (GPT-4 Turbo alone 35.3)','v','gpt-4-turbo','12 Oct 2023',MG,'baseline is a fixed window with recursive summaries'],
    ['DMR','Zep','94.8 (MemGPT 93.4, full conversation 94.4)','v','gpt-4-turbo','20 Jan 2025',ZP,'conversations fit in the window'],
    ['MemoryAgentBench','Mem0 / Zep / MemGPT','21.1 / 24.0 / 28.3 overall','i','gpt-4o-mini','v4 28 Jun 2026',MAB,'BM25 41.5, long context 42.2; 2025 product versions, chunked documents'],
    ['AMA-Bench','Mem0 / MemGPT','0.210 / 0.330 average','i','Qwen-32B','26 Feb 2026','https://arxiv.org/abs/2602.22769','agent trajectories, not chat; MemoRAG 0.461 best']
  ];
  const tb=document.getElementById('fmem-bx-tbl');
  tb.innerHTML='<tr><th>Benchmark</th><th>System</th><th>Score (%)</th><th>Runner</th><th>Answer model</th><th>Date</th><th>Notes</th></tr>'+T.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td class="num"><a href="'+r[6]+'" target="_blank" rel="noopener noreferrer">'+r[2]+'</a></td><td><span class="who '+r[3]+'">'+(r[3]==='v'?'vendor':r[3]==='r'?'rival':'independent')+'</span></td><td>'+r[4]+'</td><td style="white-space:nowrap">'+r[5]+'</td><td>'+r[7]+'</td></tr>').join('');
})();
