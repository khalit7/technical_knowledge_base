// ---- Replay tab: the five released traces, turn by turn ----
(function(){
  const TR=window.TRACES,RCT=window.PAPER.rc.traces,PR=window.PAPER.rc.price,CPT=window.PAPER.rc.chars_per_token.median;
  const NAMES=Object.keys(TR);let task='sqlite-with-gcov';
  const LC={recall:'var(--c3)',diagnose:'var(--c2)',check:'var(--c4)'};
  const OPN={SAVE_KNOWLEDGE:'save knowledge',SAVE_PROCEDURAL:'save procedural',DELETE:'delete an entry',UPDATE_STATUS:'update private status'};
  const KEY={mem:'m',base:'b'};
  const trigAt=(t,k)=>TR[t].t.find(x=>x.s===k);
  function mkSteps(t,m){const turns=TR[t][KEY[m]];return turns.map((r,i)=>{let c=esc(r[2]);
    if(m==='mem'){const x=trigAt(t,i);c=(x?(x.i?'<b>Memory agent spoke before this turn</b> ('+x.l+'). ':'Memory agent stayed silent before this turn. '):'No memory step before this turn. ')+'Actor: '+c}
    return {t:'Turn '+(i+1)+' of '+turns.length+' · prompt '+fmt(r[0])+' tokens · '+r[3]+' command'+(r[3]===1?'':'s'),c}})}
  const modes={mem:mkSteps(task,'mem'),base:mkSteps(task,'base')};
  function cum(t,m,k){const turns=TR[t][KEY[m]];let ap=0,ac=0;for(let i=0;i<=k&&i<turns.length;i++){ap+=turns[i][0];ac+=turns[i][1]}
    let mi=0,mo=0,inj=0,steps=0;if(m==='mem')TR[t].t.forEach(x=>{if(x.s<=k){steps++;mi+=2*x.q/CPT;mo+=(x.o.reduce((a,o)=>a+o[1].length,0)+(x.i?x.n:18))/CPT;if(x.i)inj++}});
    const cost=(ap*PR.sonnet_in+ac*PR.sonnet_out+mi*PR.opus_in+mo*PR.opus_out)/1e6;return {ap,ac,mi,mo,inj,steps,cost}}
  function draw(m,k,e,w){const T=TR[task],nb=T.b.length,nm=T.m.length,N=Math.max(nb,nm);const lw=w<520?64:110,pr=6,bw=(w-lw-pr)/N;
    const mx=Math.max(...T.b.map(r=>r[0]),...T.m.map(r=>r[0]));const LH=64,gap=26;let s='';
    const lane=(rows,y0,act,label,col)=>{let q=tx(0,y0+14,label,{fs:12,w:act?600:400,c:act?null:'var(--mute)'});q+=tx(0,y0+29,fmt(Math.round(mx/1000))+'k max',{fs:11,c:'var(--mute)'});
      q+=ln2(lw,y0+LH,w-pr,y0+LH,'var(--line)');
      rows.forEach((r,i)=>{const h=Math.max(1,LH*r[0]/mx),x=lw+i*bw;let o=act?(i<k?1:i===k?1:.28):.45;const hh=act&&i===k?h*(.35+.65*e):h;
        q+=rc(x+.5,y0+LH-hh,Math.max(1,bw-1.5),hh,act&&i===k?'var(--acc)':col,{r:1,op:o})});
      if(act){const x=lw+k*bw+bw/2;q+=ln2(x,y0-4,x,y0+LH+2,'var(--ink)',{sw:1,da:'2 2'})}return q};
    s+=lane(T.b,0,m==='base','Sonnet alone','var(--dim)');
    const y1=LH+gap;s+=lane(T.m,y1,m==='mem','+ memory','var(--c1)');
    // memory steps under the memory lane
    const ym=y1+LH+6,sq=Math.max(3,Math.min(12,bw-2));
    T.t.forEach(x=>{const cx=lw+x.s*bw+(bw-sq)/2,act=m==='mem'&&x.s<=k;
      s+=rc(cx,ym,sq,sq,x.i?LC[x.l]:'var(--bg)',{r:2,s:x.i?null:'var(--mute)',sw:.8,op:act?1:.35})});
    s+=tx(0,ym+10,'memory',{fs:11,c:'var(--mute)'});
    const yax=ym+sq+16;s+=tx(lw,yax,'turn 1',{fs:11,c:'var(--mute)'});s+=tx(w-pr,yax,'turn '+N,{fs:11,a:'end',c:'var(--mute)'});
    return svgW(w,yax+4,s,'Prompt tokens per turn, baseline and memory run')}
  function counters(m,k){const c=cum(task,m,k),R=RCT[task];
    const out=stat('Actor prompt tokens so far',fmt(c.ap),'of '+fmt(m==='mem'?R.mem_prompt:R.base_prompt)+' in the run');
    if(m==='mem')return out+stat('Memory-agent input so far','≈ '+fmt(Math.round(c.mi/1000))+'k tokens','estimated; Opus 4.6')+stat('Reminders',c.inj+' of '+c.steps+' memory steps','run total '+R.inject+' of '+R.triggers)+stat('Cost so far','≈ $'+c.cost.toFixed(2),'actor and memory agent');
    return out+stat('Memory agent','none','')+stat('Cost so far','≈ $'+c.cost.toFixed(2),'actor only')}
  let lastKey='';
  function counters2(m,k,e){const key=task+'|'+m+'|'+k;if(key!==lastKey){lastKey=key;detail(m,k)}return counters(m,k)}
  // detail box: the memory step before this turn
  function detail(m,k){const T=TR[task];let h='';
    if(m==='base'){h='<p class="small">Baseline run ('+T.bd+'): Sonnet 4.5 alone with Terminus 2, the same harness and settings, no memory agent. Turn '+(k+1)+': <span class="mute">'+esc(T.b[k][2])+'</span></p>'}
    else{const x=trigAt(task,k);
      if(!x)h='<p class="small">No memory step ran before this turn (the run ended).</p>';
      else{h='<p class="small" style="margin:0 0 4px"><b>Memory step '+(T.t.indexOf(x)+1)+'</b> (after action step '+x.s+'), bank '+x.k+' knowledge and '+x.p+' procedural entries; prompt ≈ '+fmt(Math.round(x.q/CPT))+' tokens per phase.</p>';
        h+=x.o.length?'<ul class="tight small">'+x.o.map(o=>'<li><b>'+OPN[o[0]]+'</b>'+(o[1]?': '+esc(o[1]):'')+'</li>').join('')+'</ul>':'<p class="small mute">No bank edits.</p>';
        h+=x.i?'<p class="small" style="margin:6px 0 2px"><span class="vtag" style="border-color:'+LC[x.l]+'">'+x.l+'</span> <b>Reminder injected</b> ('+fmt(x.n)+' characters, ≈ '+Math.round(x.n/CPT)+' tokens):</p><div class="small" style="white-space:pre-wrap;border-left:3px solid '+LC[x.l]+';padding:2px 0 2px 10px">'+esc(x.c)+'</div>':'<p class="small"><b>&lt;no_intervention/&gt;</b>: silent.</p>'}}
    $('rpDet').innerHTML=h}
  const an=makeAnim({id:'rp',modes,mode:'mem',draw,counters:counters2,dur:1700});
  // task chips
  $('rpT').innerHTML=NAMES.map(n=>'<button data-m="'+n+'"'+(n===task?' class="on"':'')+'>'+n+'</button>').join('');
  function info(){const R=RCT[task],T=TR[task];$('rpInfo').textContent=R.base_turns+' turns alone, '+R.mem_turns+' with memory; reminders at '+R.inject+' of '+R.triggers+' memory steps'}
  segBind('rpT',n=>{task=n;modes.mem=mkSteps(n,'mem');modes.base=mkSteps(n,'base');an.st.k=0;an.st.t=RM?1:0;an.st.lk=-1;lastKey='';an.draw();info()});
  info();
  // totals table and cost bars
  const tot=window.PAPER.rc.traces_total;
  $('rpTot').innerHTML='<thead><tr><th>Task</th><th class="num">Turns alone / with memory</th><th class="num">Actor prompt tokens alone / with</th><th class="num">Memory-agent input (est.)</th><th class="num">Reminders / steps</th><th>Reminders by kind</th><th class="num">Cost alone / with (est.)</th></tr></thead><tbody>'+
    NAMES.map(n=>{const R=RCT[n];return '<tr><td><code>'+n+'</code></td><td class="num">'+R.base_turns+' / '+R.mem_turns+'</td><td class="num">'+fmt(R.base_prompt)+' / '+fmt(R.mem_prompt)+'</td><td class="num">≈ '+fmt(Math.round(R.mem_in_est/1000))+'k</td><td class="num">'+R.inject+' / '+R.triggers+'</td><td>'+['recall','diagnose','check'].map(l=>R.labels[l]?R.labels[l]+' '+l:'').filter(Boolean).join(', ')+'</td><td class="num">$'+R.base_cost.toFixed(2)+' / $'+(R.act_cost+R.mem_cost).toFixed(2)+'</td></tr>'}).join('')+
    '<tr><td><b>All five</b></td><td class="num">'+NAMES.reduce((a,n)=>a+RCT[n].base_turns,0)+' / '+NAMES.reduce((a,n)=>a+RCT[n].mem_turns,0)+'</td><td class="num">'+fmt(tot.base_prompt)+' / '+fmt(tot.mem_prompt)+'</td><td class="num">≈ '+fmt(Math.round(tot.mem_in_est/1000))+'k</td><td class="num">'+tot.inject+' / '+tot.triggers+'</td><td>'+tot.lab_recall+' recall, '+tot.lab_diagnose+' diagnose, '+tot.lab_check+' check</td><td class="num">$'+tot.base_cost.toFixed(2)+' / $'+(tot.act_cost+tot.mem_cost).toFixed(2)+'</td></tr></tbody>';
  const el=$('rpCost');fit(el,w=>{const rows=[];NAMES.forEach(n=>{const R=RCT[n];rows.push({n:n,v:R.base_cost,c:'var(--dim)',t:'$'+R.base_cost.toFixed(2)+(w<520?'':' alone')});rows.push({n:'',v:R.act_cost+R.mem_cost,c:'var(--c1)',t:'$'+(R.act_cost+R.mem_cost).toFixed(2)+(w<520?'':' (memory $'+R.mem_cost.toFixed(2)+')')})});
    el.innerHTML=hbars(w,rows,8.5,{lw:w<520?150:200,rh:19,label:'cost per run'})+(w<520?'<p class="small mute" style="margin:2px 0 0">Grey: Sonnet alone; blue: with the memory agent (actor plus memory agent).</p>':'')+'<p class="small mute" style="margin:4px 0 0">Total: $'+tot.base_cost.toFixed(2)+' alone against $'+(tot.act_cost+tot.mem_cost).toFixed(2)+' with memory ('+tot.cost_ratio.toFixed(1)+' times), of which the memory agent is '+Math.round(100*tot.mem_share_cost)+'%. Two of the five memory runs were longer than their baselines, which inflates the ratio; the memory agent\'s own input was about '+Math.round(100*tot.mem_over_act_in)+'% of the actor\'s input in the same runs.</p>'});
})();
