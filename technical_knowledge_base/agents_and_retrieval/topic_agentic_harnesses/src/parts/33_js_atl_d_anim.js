// ---- Harness atlas: the harness-tax animation (two real recordings), the experiment table ----
(function(){
  const {A,RM,$,esc,onRender,tabShown,n0}=window.ATLX;
  const AN=A.anim;if(!AN||!AN.loop)return;
  // Haiku 4.5 list prices per million tokens (pricing page read 2026-10-05; FACTS.md): input 1, 1-hour cache write 2, cache read 0.10, output 5
  const PR={in:1,w:2,r:0.1,out:5};
  const L=AN.loop.calls.map(c=>({f:c[0],w:c[1],r:c[2],o:c[3]})),C=AN.cc.calls.map(c=>({f:c[0],w:c[1],r:c[2],o:c[3]}));
  const N=Math.max(L.length,C.length);$('atl-ascrub').max=N;
  const cost=c=>(c.f*PR.in+c.w*PR.w+c.r*PR.r+c.o*PR.out)/1e6;
  const sum=(xs,k)=>xs.reduce((s,c)=>s+(k?c[k]:c.f+c.w+c.r),0);
  const maxIn=Math.max(...L.concat(C).map(c=>c.f+c.w+c.r+c.o));
  let k=0,timer=null,vis=true;
  function cap(){
    if(k===0)return 'Before the first call. Both harnesses get the same task text and the same model. Press play or step forward.';
    const l=L[k-1],c=C[k-1];
    let t='Call '+k+'. ';
    t+=l?'Small harness: reads '+n0(l.f+l.w+l.r)+' tokens, all fresh (it resends its transcript as one block, so nothing is cached), writes '+n0(l.o)+'. ':'Small harness: already finished after '+L.length+' calls. ';
    t+=c?'Claude Code: reads '+n0(c.f+c.w+c.r)+' tokens, '+n0(c.r)+' of them from the cache at a tenth of the price, writes '+n0(c.o)+'.':'Claude Code: finished after '+C.length+' calls.';
    if(k===1)t+=' The gap on call 1 is the harness itself: Claude Code\'s system prompt and six tool definitions, against a short prompt describing four tools.';
    if(k===N)t+=' Both runs passed the tests. Totals below: Claude Code read about '+Math.round(sum(C)/sum(L))+' times as many input tokens.';
    return t}
  function draw(){
    const el=$('atl-anim');const W=Math.max(300,el.clientWidth||600);const narrow=W<520;
    const LW=0,bh=9,gap=3,lane=N*(bh+gap);const top0=16;const H=2*(lane+top0+22)+6;
    const sx=v=>v/maxIn*(W-LW-8);
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Context read per model call in two harnesses">';
    [['Small harness (Loop lab)',L],['Claude Code',C]].forEach((p,j)=>{const y0=j*(lane+top0+22)+top0+14;
      s+='<text x="0" y="'+(y0-6)+'" font-size="12" font-weight="600">'+p[0]+'</text>';
      p[1].forEach((c,i)=>{const y=y0+i*(bh+gap);const show=i<k;let x=LW;
        [['f','var(--c2)'],['w','var(--c5)'],['r','var(--c1)'],['o','var(--c3)']].forEach(q=>{const wv=sx(c[q[0]]);if(wv>0){s+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+Math.max(0.5,wv).toFixed(1)+'" height="'+bh+'" fill="'+q[1]+'" opacity="'+(show?1:0.08)+'"/>';x+=wv+(q[0]==='r'?2:0)}})});
    });
    el.innerHTML=s+'</svg>';
    const upto=xs=>xs.slice(0,k);
    const st=(nm,xs,all,extra)=>'<div class="stat"><div class="k">'+nm+'</div><div class="v">$'+upto(xs).reduce((s,c)=>s+cost(c),0).toFixed(4)+'</div><div class="d">'+Math.min(k,xs.length)+' of '+xs.length+' calls; read '+n0(sum(upto(xs)))+' input tokens ('+n0(sum(upto(xs),'r'))+' cached), wrote '+n0(sum(upto(xs),'o'))+'; whole run '+all+'. '+extra+'</div></div>';
    $('atl-astat').innerHTML=st('Small harness, API-price equivalent so far',L,AN.loop.secs.toFixed(0)+' s','')+st('Claude Code, API-price equivalent so far',C,AN.cc.secs.toFixed(0)+' s','The CLI reported $'+AN.cc.cost.toFixed(4)+' for the whole run.');
    $('atl-astep').textContent=cap();$('atl-ascrub').value=k;
  }
  function stop(){if(timer){clearInterval(timer);timer=null}$('atl-aplay').textContent='Play'}
  function play(){if(timer){stop();return}if(k>=N)k=0;$('atl-aplay').textContent='Pause';
    timer=setInterval(()=>{if(!vis||!tabShown())return;if(k>=N){stop();return}k++;draw()},+$('atl-aspeed').value)}
  $('atl-aplay').addEventListener('click',play);
  $('atl-afwd').addEventListener('click',()=>{stop();k=Math.min(N,k+1);draw()});
  $('atl-aback').addEventListener('click',()=>{stop();k=Math.max(0,k-1);draw()});
  $('atl-ascrub').addEventListener('input',()=>{stop();k=+$('atl-ascrub').value;draw()});
  $('atl-aspeed').addEventListener('change',()=>{if(timer){stop();play()}});
  if('IntersectionObserver' in window)new IntersectionObserver(es=>{vis=es[0].isIntersecting}).observe($('atl-anim'));
  if(RM)k=0;
  onRender(draw);let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(tabShown())draw()},120)});

  // the failed mini-swe-agent attempt
  const X=A.x;if(X&&X.calls){const t=X.totals;
    $('atl-xstat').innerHTML=[['Model calls',t.calls,'stopped by hand'],['Replies with invented output',t.replies_with_invented_output,'the model wrote the command\'s result itself'],['Format errors',t.format_errors,'more than one action in a reply'],['Output tokens',n0(t.out_tokens),'in '+Math.round(t.wall_s)+' s of model time'],['Tests after',X.tests_after.split(' (')[0],'code unchanged']].map(s=>'<div class="stat"><div class="k">'+s[0]+'</div><div class="v">'+s[1]+'</div><div class="d">'+s[2]+'</div></div>').join('');
    $('atl-xtab').innerHTML='<thead><tr><th class="num">Call</th><th class="num">Input</th><th class="num">Output</th><th class="num">Seconds</th><th class="num">Actions in reply</th><th>Ran</th></tr></thead><tbody>'+X.calls.map(c=>'<tr><td class="num">'+c.call+'</td><td class="num">'+n0(c.in)+'</td><td class="num">'+n0(c.out)+'</td><td class="num">'+c.wall_s.toFixed(1)+'</td><td class="num">'+c.actions_in_reply+(c.invented_output?' <span class="ill">invented output</span>':'')+'</td><td><code>'+esc(c.executed||'(rejected)')+'</code></td></tr>').join('')+'</tbody>'}
})();

// ---- RL environment stepper (SFT against RL on the same task), environment table, LEGO-RL bars ----
(function(){
  const {A,RM,$,esc,link,onRender,tabShown}=window.ATLX;
  const ST={sft:[
    ['Task','The running example: a repository with failing tests and one instruction. In supervised fine-tuning (SFT) the task matters only through a transcript someone already recorded.'],
    ['Recorded trajectory','One successful run, for example a Claude Code session from the Trace lab: every message, tool call and tool result, in order.'],
    ['Mask','The transcript becomes tokens; the loss is computed only on the tokens the model wrote (its reasoning and tool calls), not on the tool results it was shown.'],
    ['Loss','Cross-entropy: raise the probability of each recorded token. One trajectory, one fixed target.'],
    ['No environment','Nothing is executed during training. The model never learns what its own, different actions would have caused; it learns to imitate.'],
    ['Update','Cheap and stable, and capped by the trajectories: imitating 35.8k source trajectories scored 36.7 on Terminal-Bench 2.1 in Terminal-Universe, below re-solving the same tasks (52.1).']],
   rl:[
    ['Task','The same task, now an environment: a container image with the repository at the pre-fix commit, the instruction, and a verifier (the fail-to-pass tests).'],
    ['Reset','Start several fresh containers from the same image, one per rollout (4 here, to keep the picture small).'],
    ['Roll out','The current policy acts through the harness in each container: read, edit, run tests, finish. The four transcripts differ because sampling differs.'],
    ['Verify','Run the tests in each container after the agent stops. Reward 1 if the failing tests now pass and the others still pass, else 0: here 1, 0, 1, 0.'],
    ['Advantage','Group-relative (GRPO): reward minus the group mean (0.5), divided by the group standard deviation (0.5): +1, -1, +1, -1. No value network needed.'],
    ['Update','Raise the probability of the tokens in the passing rollouts, lower it in the failing ones, then repeat on new tasks. The model learns from the consequences of its own actions, at the price of running thousands of containers.']]};
  let mode='sft',k=0,timer=null;
  function draw(){
    const el=$('atl-rl');const W=Math.max(300,el.clientWidth||600);const s5=ST[mode];const n=s5.length;
    const narrow=W<560;const cols=narrow?2:n;const bw=(W-(cols-1)*8)/cols,bh=46;const rows=Math.ceil(n/cols);
    const extra=mode==='rl'?78:4;const H=rows*(bh+10)+extra;
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Training steps">';
    s5.forEach((st,i)=>{const c=i%cols,r=Math.floor(i/cols);const x=c*(bw+8),y=r*(bh+10);const cur=i===k,done=i<k;
      s+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="7" fill="'+(cur?'var(--acc2)':'var(--soft)')+'" stroke="'+(cur?'var(--acc)':'var(--line)')+'" stroke-width="'+(cur?2:1)+'" opacity="'+(done||cur?1:0.55)+'"/>';
      s+='<text x="'+(x+bw/2)+'" y="'+(y+20)+'" font-size="12" font-weight="600" text-anchor="middle">'+(i+1)+'. '+esc(st[0])+'</text>';
      s+='<text x="'+(x+bw/2)+'" y="'+(y+36)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+(mode==='sft'?(i===4?'no container runs':'offline'):(i===0?'built once':i<=3?'containers run':'trainer'))+'</text>'});
    const y0=rows*(bh+10)+6;
    if(mode==='rl'){const R=[1,0,1,0],adv=['+1','-1','+1','-1'];const cw=(W-30)/4;
      R.forEach((r,i)=>{const x=i*(cw+10);const on=k>=1;
        s+='<rect x="'+x+'" y="'+y0+'" width="'+cw+'" height="30" rx="5" fill="none" stroke="var(--line)" opacity="'+(on?1:0.3)+'"/>';
        s+='<text x="'+(x+8)+'" y="'+(y0+19)+'" font-size="11" fill="var(--mute)" opacity="'+(on?1:0.3)+'">rollout '+(i+1)+'</text>';
        if(k>=2){const len=(0.35+0.15*((i*7)%3))*(cw-80);s+='<rect x="'+(x+64)+'" y="'+(y0+11)+'" width="'+len.toFixed(1)+'" height="8" rx="2" fill="var(--c1)" opacity="0.7"/>'}
        if(k>=3)s+='<text x="'+(x+cw-6)+'" y="'+(y0+19)+'" font-size="12" font-weight="600" text-anchor="end" fill="'+(r?'var(--good)':'var(--bad)')+'">'+(k>=4?adv[i]:'r='+r)+'</text>';
      });
      s+='<text x="0" y="'+(y0+48)+'" font-size="11" fill="var(--mute)">'+(k>=4?'advantages: (r - 0.5) / 0.5':k>=3?'rewards from the tests':k>=2?'trajectories of different lengths':'four fresh containers')+'</text>'}

    el.innerHTML=s+'</svg>';
    $('atl-rstep').innerHTML='<b>'+esc(s5[k][0])+'.</b> '+esc(s5[k][1]);$('atl-rscrub').value=k;
  }
  function stop(){if(timer){clearInterval(timer);timer=null}$('atl-rplay').textContent='Play'}
  $('atl-rplay').addEventListener('click',()=>{if(timer){stop();return}if(k>=5)k=0;$('atl-rplay').textContent='Pause';timer=setInterval(()=>{if(!tabShown())return;if(k>=5){stop();return}k++;draw()},1800)});
  $('atl-rfwd').addEventListener('click',()=>{stop();k=Math.min(5,k+1);draw()});
  $('atl-rback').addEventListener('click',()=>{stop();k=Math.max(0,k-1);draw()});
  $('atl-rscrub').addEventListener('input',()=>{stop();k=+$('atl-rscrub').value;draw()});
  $('atl-rmode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;$('atl-rmode').querySelectorAll('button').forEach(q=>q.classList.toggle('on',q===b));draw()});
  onRender(draw);let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(tabShown())draw()},120)});

  // environment table
  $('atl-rpat').textContent=A.rlpat||'';
  const R=(A.rl||[]).slice();let sk='date',sd=1;
  const cols=[['name','Environment or method'],['what','What it is'],['size','Size'],['harness','Rollout harness'],['reward','Reward'],['headline','Headline result'],['date','Date']];
  function table(){R.sort((a,b)=>String(a[sk]).localeCompare(String(b[sk]))*sd);
    $('atl-rtab').innerHTML='<thead><tr>'+cols.map(c=>'<th data-k="'+c[0]+'">'+c[1]+(sk===c[0]?(sd>0?' &#9650;':' &#9660;'):'')+'</th>').join('')+'</tr></thead><tbody>'+R.map(r=>'<tr>'+cols.map(c=>'<td style="min-width:'+(c[0]==='what'?'16em':c[0]==='date'?'6em':'9em')+'">'+(c[0]==='name'?link(r.src,r.name):esc(r[c[0]]))+'</td>').join('')+'</tr>').join('')+'</tbody>'}
  $('atl-rtab').addEventListener('click',e=>{const th=e.target.closest('th');if(!th)return;const kk=th.dataset.k;sd=sk===kk?-sd:1;sk=kk;table()});
  table();

  // LEGO-RL before/after bars
  const lg=A.lego||[];const hs=['OpenHands SDK','Claude Code','OpenCode'];
  const v=(pre,h)=>{const r=lg.find(p=>p.model.indexOf(pre)>=0&&p.harness===h);return r?r.value:null};
  $('atl-legobars').innerHTML=hs.map(h=>{const b=v('base',h),a=v('after',h);if(b==null||a==null)return '';
    return '<div class="row"><span class="nm">'+h+'</span><span class="track"><span class="fill" style="width:'+a+'%;background:var(--c3)"></span><span class="fill" style="width:'+b+'%;background:var(--c1)"></span></span><span class="val">'+b+' to '+a+'</span></div>'}).join('')+'<p class="atl-cap"><span style="color:var(--c1)">&#9632;</span> before RL, <span style="color:var(--c3)">&#9632;</span> after RL in that harness; % of 500 SWE-bench Verified tasks.</p>';
})();
