// ---- Reading tab, sections 0 to 5 (prefix pd). Data: window.PD (data/pd_data.json, made by build_data.py) ----
(function(){
const P=window.PD,E=RD.esc,$=id=>document.getElementById(id);
const f0=x=>Math.round(x).toLocaleString('en-US'),pc=(a,b,d)=>(100*a/b).toFixed(d==null?1:d)+'%';
window.PDU={f0,pc};
// generic bars: rows [[label,value,colour?,note?]], max
function bars(el,rows,o){o=o||{};const mx=o.max||Math.max(...rows.map(r=>r[1]),1e-9);
  el.innerHTML=rows.map(r=>'<div'+(r[4]?' class="hl"':'')+'><span class="nm" title="'+E(r[0])+'">'+E(r[0])+'</span><span class="tr"><span style="width:'+(100*r[1]/mx).toFixed(2)+'%;background:'+(r[2]||'var(--acc)')+'"></span></span><span class="v">'+(r[3]!=null?r[3]:f0(r[1]))+'</span></div>').join('')}
window.PDU.bars=bars;
// predict-then-reveal widgets
document.querySelectorAll('#t-read .pr').forEach(pr=>{const ans=pr.querySelector('.ans');pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
  pr.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',x.dataset.ok==='1');x.classList.toggle('wrong',x===b&&x.dataset.ok!=='1')});ans.hidden=false}))});

// 0. four kinds
$('pd-kinds').innerHTML=P.kinds.map(k=>'<div style="--kc:'+k.c+'"><b>'+E(k.k)+'</b><span class="small mute">'+E(k.src)+'</span><div class="row">'+E(k.row)+'</div><span class="chk">'+E(k.chk)+'</span></div>').join('');

// 2. Self-Instruct animation
(function(){
  const TK=s=>(s.toLowerCase().match(/[a-z0-9]+/g)||[]);
  function lcs(a,b){if(a.length<b.length){const t=a;a=b;b=t}let prev=new Array(b.length+1).fill(0);
    for(const x of a){const cur=[0];for(let j=0;j<b.length;j++)cur.push(x===b[j]?prev[j]+1:Math.max(prev[j+1],cur[j]));prev=cur}return prev[b.length]}
  const rl=(a,b)=>a.length&&b.length?2*lcs(a,b)/(a.length+b.length):0;
  const seeds=P.si.seeds.map(TK),stream=P.si.stream,ST=stream.map(TK);
  function run(filter){const pool=seeds.map((t,i)=>({t,txt:P.si.seeds[i],s:1}));const steps=[];let rej=0,dupIn=0;
    for(let i=0;i<ST.length;i++){let best=0,bi=-1;pool.forEach((p,j)=>{const v=rl(ST[i],p.t);if(v>best){best=v;bi=j}});
      const over=best>0.7+1e-9,admit=!filter||!over;if(admit){pool.push({t:ST[i],txt:stream[i],s:0});if(over)dupIn++}else rej++;
      steps.push({i,best,near:bi>=0?pool[bi].txt:'',nearSeed:bi>=0&&bi<seeds.length,admit,over,size:pool.length,rej,dupIn})}
    return steps}
  const R={on:run(true),off:run(false)};let mode='on';
  const n=ST.length+1;
  function draw(k){const S=R[mode];const cnt=$('pd-si-cnt'),cap=$('pd-si-cap'),pool=$('pd-si-pool'),now=$('pd-si-now');
    const done=S.slice(0,k);const last=done[done.length-1];
    let h='';for(let i=0;i<seeds.length;i++)h+='<span class="s"></span>';
    done.forEach((s,j)=>{h+='<span class="'+(s.admit?'g':'r')+(j===k-1?' n':'')+'" title="'+E(stream[s.i])+'"></span>'});pool.innerHTML=h;
    cnt.innerHTML=RD.stat('Pool size',f0(last?last.size:seeds.length))+RD.stat('Candidates seen',k?k:0)+RD.stat('Rejected',last?last.rej:0)+RD.stat('Near-duplicates admitted',last?last.dupIn:0,'ROUGE-L above 0.7');
    if(!k){cap.innerHTML='<div class="t">Start: the 175 human-written seed tasks</div><p>Each square is one instruction in the pool. The next '+stream.length+' candidates are real Dolly instructions (written by people, never filtered), fed in one at a time.</p>';now.innerHTML='';return}
    const s=last;cap.innerHTML='<div class="t">Candidate '+k+': best ROUGE-L against the pool '+s.best.toFixed(2)+(s.over?(mode==='on'?', rejected':', admitted anyway (filter off)'):', admitted')+'</div><p>'+(s.over?'It shares most of its words, in order, with an instruction already in the pool.':'Different enough in wording from everything in the pool.')+'</p>';
    now.innerHTML='<div class="pd-cand"><div class="m">candidate</div>'+E(stream[s.i])+'<div class="m" style="margin-top:4px">most similar in pool ('+(s.nearSeed?'a seed':'an earlier candidate')+', ROUGE-L '+s.best.toFixed(2)+')</div>'+E(s.near)+'</div>'}
  const an=RD.anim({card:'pd-si-card',ctl:'pd-si-ctl',n,draw,ms:1500,label:'Candidate'});
  RD.seg($('pd-si-mode'),m=>{mode=m;an.redraw()});
})();

// 2. mixtures by skill
(function(){const seg=$('pd-mix-seg');const SK=['Math','Code','Chat','Instruction following','Safety','Multilingual','Science and NLP tasks','Reasoning and puzzles','Tool use','Identity'];
  const col=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--bad)','var(--c6)','var(--c5)','var(--closed)','var(--open)','var(--mute)'];
  seg.innerHTML=P.mix.map((m,i)=>'<button data-m="'+i+'"'+(i===0?' class="on"':'')+'>'+E(m.label)+'</button>').join('');
  function show(i){const m=P.mix[i];const tot=m.skills.reduce((a,b)=>a+b[1],0);
    bars($('pd-mix'),m.skills.filter(s=>s[1]>0).map(s=>[s[0],s[1],col[SK.indexOf(s[0])],f0(s[1])+' ('+pc(s[1],tot,0)+')']),{max:Math.max(...P.mix.flatMap(x=>x.skills.map(s=>s[1])))});
    $('pd-mix').className='rd-bars';
    $('pd-mix-note').innerHTML=E(m.repo)+': '+f0(m.total)+' rows. Sources in each skill: '+Object.entries(m.sources).map(([k,v])=>'<b>'+E(k)+'</b> '+v.map(x=>E(x[0])+' '+f0(x[1])).join(', ')).join('; ')}
  RD.seg(seg,m=>show(+m));show(0)})();

// 2. lineage table
(function(){const r=P.lin;$('pd-lin').innerHTML='<div class="tw"><table style="min-width:900px"><thead><tr><th>Set</th><th>Year</th><th>Answers by</th><th class="num">Rows measured</th><th class="num">Median prompt tokens</th><th class="num">Median answer tokens</th><th class="num">Tokens with loss</th><th class="num">Exact duplicate prompts</th><th class="num">English</th></tr></thead><tbody>'+
  r.map(x=>'<tr><td style="min-width:11em">'+E(x.label)+'</td><td>'+x.year+'</td><td class="small" style="min-width:9em">'+E(x.author)+'</td><td class="num">'+f0(x.n)+'</td><td class="num">'+f0(x.p_tok)+'</td><td class="num">'+f0(x.r_tok)+'</td><td class="num">'+pc(x.trained,1,0)+'</td><td class="num">'+f0(x.exact)+'</td><td class="num">'+pc(x.en,x.n,0)+'</td></tr>').join('')+'</tbody></table></div><p class="small mute">Prompt = first user turn; answer = all assistant turns. The trajectory set\'s first user turn is a fixed template ("uploaded a python code repository ..."), so its duplicate prompts are the template, not repeated tasks. The Tulu 3 sample is 1,000 rows from each of five subsets (one is the multilingual Aya subset), so its English share describes the sample, not the mixture.</p>'})();

// 3. generators
(function(){const g=P.gen;const el=$('pd-gen');
  el.innerHTML='<div class="rd-two"><div><div class="pd-lab">OLMo 2 7B preference mix: who wrote the chosen answer ('+f0(g.olmo2.total)+' rows)</div><div class="rd-bars" id="pd-gen-a"></div></div><div><div class="pd-lab">Dolci-Instruct-DPO (OLMo 3): chosen ('+f0(g.dolci.total)+' rows)</div><div class="rd-bars" id="pd-gen-b"></div><div class="pd-lab">and rejected</div><div class="rd-bars" id="pd-gen-c"></div></div></div>';
  const c=n=>/^gpt-4/.test(n)||/^gpt-4o/.test(n)?'var(--bad)':'var(--acc)';
  bars($('pd-gen-a'),g.olmo2.chosen.map(x=>[x[0],x[1],c(x[0]),pc(x[1],g.olmo2.total,1)]));
  bars($('pd-gen-b'),g.dolci.chosen.map(x=>[x[0],x[1],/^gpt-4/.test(x[0])?'var(--bad)':'var(--acc)',pc(x[1],g.dolci.total,1)]));
  bars($('pd-gen-c'),g.dolci.rejected.map(x=>[x[0],x[1],'var(--c2)',pc(x[1],g.dolci.total,1)]));
  $('pd-gen-note').innerHTML='Orange: OpenAI GPT-4-family models, whose terms restrict using outputs to build competing models. Counts are Hugging Face\'s statistics over every row (fetched 2026-10-15); in the OLMo 2 mix, 19,890 gpt-4o rows are the persona instruction-following subset, where both answers are GPT-4o\'s.'})();

// 4. traces
(function(){const t=P.trace;const s=$('pd-trace-stats');
  s.innerHTML=RD.stat('Tokens per generation (median)',f0(t.tok['0.5']),'p90 '+f0(t.tok['0.9'])+'; Qwen3 tokens')+RD.stat('Share in the thinking',pc(t.think_share['0.5'],1,0),'median, before &lt;/think&gt;')+
   RD.stat('"wait" in the thinking',f0(t.wait['0.5']),'median per trace; p90 '+f0(t.wait['0.9']))+RD.stat('Marked incomplete',f0(t.incomplete),'is_reasoning_complete = false')+
   RD.stat('Stopped at the length limit',f0(t.length_stop)+' of '+f0(t.finish_known),'rows that record finish_reasons')+RD.stat('With CJK characters',f0(t.cjk),'language mixing to filter')+
   RD.stat('Median tokens, right vs wrong',f0(t.correct_tok['0.5'])+' / '+f0(t.wrong_tok['0.5']),'by the recorded Math-Verify verdict')})();
(function(){const j=P.judge;bars($('pd-judge-bars'),j.map((x,i)=>[x[0],x[1],i===4?'var(--bad)':'var(--good)',x[1]+' of 30']),{max:30})})();

// 5. one row's tokens and the mask
(function(){const t=P.tok;$('pd-tok').innerHTML=t.pieces.map(p=>'<span class="'+(p[1]?'l':'m')+'">'+E(p[0])+'</span>').join('');
  $('pd-tok-note').textContent='Row '+t.id+' (Persona Hub math, synthetic): '+f0(t.n)+' tokens, '+f0(t.trained)+' with loss ('+pc(t.trained,t.n,0)+'). Grey: template headers and the prompt.';
  bars($('pd-mask-bars'),P.lin.map(x=>[x.label,x.trained,x.trained>0.9?'var(--c4)':x.trained<0.3?'var(--c2)':'var(--acc)',pc(x.trained,1,0)]),{max:1})})();
})();
