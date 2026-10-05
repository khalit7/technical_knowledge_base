// ---- Orchestration lab: one agent against a lead with two subagents, same task ----
(function(){
  const D=window.ORCH,U=window.OU,esc=U.esc;if(!D||!D.multi)return;
  const R={agent:D.agent,multi:D.multi};const hidN=h=>h.filter(x=>x[1]).length;
  const WHO={lead:'lead agent',sub1:'subagent 1',sub2:'subagent 2'};const WC={lead:'var(--c1)',sub1:'var(--c4)',sub2:'var(--c6)'};
  const tot=r=>r.usage.i+r.usage.cw+r.usage.cr;
  const TMAX=Math.max(...Object.values(R).map(r=>r.steps.length?r.steps[r.steps.length-1].t:0));
  let mode='agent',an=null;
  const vsteps=()=>R[mode].steps.filter(s=>s.k!=='think');
  function draw(i){const r=R[mode],st=vsteps(),cur=st[i]||{t:0,who:'lead'},T=cur.t;const el=document.getElementById('orch-msvg');const W=U.width(el);
    const whos=Object.keys(r.per);const lw=Math.min(96,W*.25),x0=lw+6,x1=W-10,sx=t=>x0+(x1-x0)*t/TMAX;let y=6,s='';
    // lanes: model and tool activity per agent
    whos.forEach(w=>{s+='<text x="0" y="'+(y+12)+'" font-size="11" fill="'+WC[w]+'" font-weight="600">'+WHO[w]+'</text>';
      s+='<line x1="'+x0+'" x2="'+x1+'" y1="'+(y+8)+'" y2="'+(y+8)+'" stroke="var(--line)"/>';
      const mine=r.steps.filter(z=>z.who===w);let prev=mine.length?mine[0].t:0;
      mine.forEach((z,k)=>{if(z.t>T+1e-6)return;const nx=k+1<mine.length?Math.min(mine[k+1].t,T):z.t;
        if(z.k==='tool'){s+='<rect x="'+sx(z.t)+'" y="'+y+'" width="'+Math.max(2.5,sx(nx)-sx(z.t))+'" height="16" rx="2" fill="var(--c2)"><title>'+esc(z.tool)+'</title></rect>'}
        else if(z.k==='result'){s+='<rect x="'+sx(prev)+'" y="'+(y+3)+'" width="'+Math.max(1,sx(z.t)-sx(prev))+'" height="10" fill="none"/>'}
        else{s+='<rect x="'+sx(prev)+'" y="'+(y+4)+'" width="'+Math.max(2,sx(z.t)-sx(prev))+'" height="8" rx="2" fill="'+WC[w]+'" opacity=".55"/>'}
        prev=z.t});
      y+=26});
    const tk=[];for(let t=0;t<=TMAX;t+=10)tk.push(t);
    s+='<line x1="'+x0+'" x2="'+x1+'" y1="'+y+'" y2="'+y+'" stroke="var(--mute)"/>';tk.forEach(t=>{s+='<text x="'+sx(t)+'" y="'+(y+13)+'" text-anchor="middle" font-size="10" fill="var(--mute)">'+t+' s</text>'});
    s+='<line x1="'+sx(T)+'" x2="'+sx(T)+'" y1="0" y2="'+y+'" stroke="var(--bad)" stroke-width="1.5"/>';y+=26;
    // context: tokens each agent re-reads on its latest model call, to one scale for both runs
    const ctx={};r.steps.forEach(z=>{if(z.ui&&z.t<=T+1e-6)ctx[z.who]=z.ui});
    const CMAX=Math.max(...Object.values(R).map(rr=>Math.max(...rr.steps.filter(z=>z.ui).map(z=>z.ui))));
    s+='<text x="0" y="'+(y+10)+'" font-size="11" font-weight="600">Context on latest call (tokens)</text>';y+=18;
    whos.forEach(w=>{const v=ctx[w]||0;s+='<text x="0" y="'+(y+11)+'" font-size="10.5" fill="var(--mute)">'+WHO[w]+'</text><rect x="'+x0+'" y="'+y+'" width="'+(x1-x0)+'" height="14" fill="var(--soft)"/><rect x="'+x0+'" y="'+y+'" width="'+((x1-x0)*v/CMAX)+'" height="14" fill="'+WC[w]+'"/><text x="'+(x1-4)+'" y="'+(y+11)+'" text-anchor="end" font-size="10.5">'+U.fmt(v)+'</text>';y+=20});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+(y+4)+'" width="'+W+'" height="'+(y+4)+'" role="img" aria-label="Agent timeline and context sizes">'+s+'</svg>';
    const what=cur.k==='tool'?'calls <b>'+esc(cur.tool)+'</b>: <code>'+esc(cur.x.slice(0,140))+'</code>':cur.k==='result'?(cur.err?'tool error: ':'tool result: ')+'<code>'+esc(cur.x.slice(0,140))+'</code>':'says: '+esc(cur.x.slice(0,200));
    document.getElementById('orch-mcap').innerHTML='<b>'+T.toFixed(1)+' s</b> <span style="color:'+WC[cur.who]+'">'+WHO[cur.who]+'</span> '+what;
    let proc=0,tools=0;r.steps.forEach(z=>{if(z.t<=T+1e-6){if(z.ui)proc+=z.ui;if(z.k==='tool')tools++}});const end=i>=st.length-1;
    document.getElementById('orch-mcnt').innerHTML=U.stat('tokens processed so far',U.fmt(proc),'every agent, every call')+U.stat('tool calls',tools,'')+U.stat('cost equivalent',end?U.usd(r.cost):'(at the end)',end?'all agents':'')+U.stat('hidden checks',end?hidN(r.hidden)+'/6':'(at the end)','');
    const box=document.getElementById('orch-msteps');box.querySelectorAll('div').forEach((d,k)=>d.classList.toggle('cur',k===i));
    const c=box.children[i];if(c&&box.offsetParent){const top=c.offsetTop-box.offsetTop;if(top<box.scrollTop||top>box.scrollTop+box.clientHeight-30)box.scrollTop=Math.max(0,top-40)}}
  function list(){document.getElementById('orch-msteps').innerHTML=vsteps().map(z=>'<div><span class="mute">'+z.t.toFixed(1)+' s</span><span style="color:'+WC[z.who]+'">'+(z.who==='lead'?'lead':z.who.replace('sub','sub '))+'</span><span class="x">'+(z.k==='tool'?'<b>'+esc(z.tool)+'</b> ':z.k==='result'?(z.err?'[error] ':'[result] '):'')+esc(z.x)+'</span></div>').join('')}
  function rebuild(){list();const n=vsteps().length;if(an)an.reset(n);else an=U.anim({card:'orch-mf',ctl:'orch-mc',n,label:'Transcript step',draw,delay:i=>{const s=vsteps();return Math.max(250,Math.min(1600,((s[i+1]||s[i]).t-s[i].t)*300))}})}
  U.seg(document.getElementById('orch-mm'),m=>{mode=m;rebuild()});rebuild();
  const a=D.agent,m=D.multi,ig=D.multi_ignored;
  const subTok=Object.keys(m.per).filter(k=>k!=='lead').reduce((s,k)=>s+m.per[k].i,0);
  const firstAgent=m.steps.findIndex(z=>z.k==='tool'&&(z.tool==='Agent'||z.tool==='Task'));
  const before=m.steps.slice(0,firstAgent).filter(z=>z.k==='tool');
  document.getElementById('orch-mfind').innerHTML=[
    '<b>Same answer, '+(tot(m)/tot(a)).toFixed(1)+' times the tokens.</b> Both runs wrote the same fix and passed '+hidN(a.hidden)+' and '+hidN(m.hidden)+' of 6 hidden checks. The single agent: '+U.sec(a.wall)+', '+U.fmt(tot(a))+' tokens processed, '+U.usd(a.cost)+'. Lead plus two subagents: '+U.sec(m.wall)+', '+U.fmt(tot(m))+' tokens, '+U.usd(m.cost)+' ('+(m.cost/a.cost).toFixed(1)+' times). Totals from the final <code>modelUsage</code> record, which includes the subagents.',
    '<b>Isolation means re-reading.</b> Each subagent started from an empty context and read <code>core.py</code> and the tests for itself; together they processed '+U.fmt(subTok)+' tokens. Their reports were short, so the lead\'s context stayed small; the work was duplicated, not removed.',
    '<b>The lead had the answer before it delegated.</b> Following its instructions, it ran the tests first, and on the way it used '+before.length+' tools, including a Python snippet that printed both wrong outputs. The subagents then rediscovered what the lead already knew. This is Cognition\'s point in miniature: the subagents did not share the lead\'s trace.',
    '<b>Waiting is not free either.</b> The subagents ran in the background; the lead\'s turn ended, and the harness woke it once per finished subagent (three separate <code>result</code> records: '+m.turns.join(', ')+' turns).',
    '<b>Delegation had to be forced.</b> A first run with a softer instruction ("delegate the investigation of each failing test to its own subagent") simply solved the task alone: '+U.sec(ig.wall)+', '+U.usd(ig.cost)+', no subagents. A model that judges a task too small to split is making the right call. Note also that the init record lists the tool as <code>Task</code> while the model calls it as <code>Agent</code> (as recorded in Claude Code '+m.version+'; both names refer to the same subagent tool).'
  ].map(x=>'<li>'+x+'</li>').join('');
  U.onRender(()=>{if(an)an.redraw()});
})();
