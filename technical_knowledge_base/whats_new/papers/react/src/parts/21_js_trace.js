// ---- The trace replay: the paper's own episodes stepped through, method against method ----
// window.TRACES comes from mk_traces.py. makeTrace(id, episode ids) builds one replay card (its seg buttons,
// then makeAnim). Modes are keyed "episode:mode"; the seg shows only the current episode's buttons.
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const MK={g:'hg',r:'hr',s:'hs',u:'hu'};
const mk=t=>esc(t).replace(/\[\[([grsu]):(.*?)\]\]/g,(m,k,x)=>'<span class="'+MK[k]+'">'+x+'</span>').replace(/\n/g,'<br>');
const plain=t=>String(t).replace(/\[\[[grsu]:(.*?)\]\]/g,'$1');
const nwords=t=>{const s=plain(t).trim();return s?s.split(/\s+/).length:0};
const ROLE={q:['Task','var(--rq)'],t:['Thought','var(--rt)'],a:['Action','var(--ra)'],o:['Observation','var(--ro)'],f:['Answer','var(--ra)'],e:['Elided','var(--rx)']};
const CODE={
 qa:{l:['prompt = exemplars + question','for i in range(1, 8):   <span class="cm"># 7 steps max</span>','  thought, action = llm(prompt)','  obs = env.step(action)','  prompt += thought + action + obs','  if done: break'],
     m:{q:[0],t:[2],a:[2],o:[3,4],e:[1],f:[2]}},
 qaact:{l:['prompt = exemplars + question','for i in range(1, 8):   <span class="cm"># 7 steps max</span>','  action = llm(prompt)','  obs = env.step(action)','  prompt += action + obs','  if done: break'],
     m:{q:[0],t:[2],a:[2],o:[3,4],e:[1],f:[2]}},
 game:{l:['prompt = exemplars + task','for i in range(1, 50):','  action = llm(prompt)    <span class="cm"># think[..] too</span>','  obs = "OK." if think','        else env.step(action)','  prompt += action + obs','  if done: return reward'],
     m:{q:[0],t:[2,3],a:[2],o:[4,5],e:[1],f:[2]}},
 none:{l:['prompt = exemplars + question','answer = llm(prompt)','<span class="cm"># one call, no environment</span>'],
     m:{q:[0],t:[1],f:[1],a:[1],o:[1],e:[1]}}};
const codeFor=(ep,m)=>(m==='std'||m==='cot')?'none':(ep.env==='Wikipedia API'?(m==='act'?'qaact':'qa'):'game');
const SHOW=5;

function makeTrace(id,eps,first){
  const E=TRACES.filter(e=>eps.includes(e.id)),modes={},ix={};
  E.forEach(e=>Object.entries(e.modes).forEach(([m,v])=>{const key=e.id+':'+m;ix[key]=[e,m,v];
    modes[key]=v.steps.map(s=>({t:esc(s.n||ROLE[s.r][0]),c:s.c||({q:'The task goes into the context, after the exemplars.',t:'A thought: written into the context, nothing is sent to the environment.',a:'An action: parsed out of the text and sent to the environment.',o:'The environment\'s reply is appended to the context.',f:'The answer.',e:'Steps the paper elides.'})[s.r]}))}));
  // seg buttons for every mode, hidden unless they belong to the current episode
  const seg=$(id+'M');seg.innerHTML=Object.keys(modes).map(k=>{const [e,m,v]=ix[k];return '<button data-m="'+k+'" data-ep="'+e.id+'" aria-pressed="false">'+esc(v.label)+'</button>'}).join('');
  const startKey=first||Object.keys(modes)[0];
  const showEp=epId=>{seg.querySelectorAll('button').forEach(b=>{b.hidden=b.dataset.ep!==epId})};
  showEp(startKey.split(':')[0]);seg.querySelector('[data-m="'+startKey+'"]').classList.add('on');
  const counters=(key,k)=>{const [e,m,v]=ix[key],S=v.steps.slice(0,k+1);let mw=0,ew=0,th=0,ac=0,ob=0,tw=0;
    S.forEach(s=>{const w=nwords(s.t);if(s.r==='t'){th++;mw+=w}else if(s.r==='a'){ac++;mw+=w}else if(s.r==='f'){mw+=w}else if(s.r==='o'){ob++;ew+=w}else if(s.r==='q')tw+=w});
    const ctx=(v.pw||0)+tw+mw+ew;
    return stat('Thoughts',th,'written by the model, no observation')+stat('Actions',ac,'sent to the environment')+stat('Observations',ob,'returned by it')+
      stat('Words: model / environment',mw+' / '+ew,'this episode so far')+
      stat('Context now',v.pw?fmt(ctx)+' words':(tw+mw+ew)+' words',v.pw?'incl. '+fmt(v.pw)+' words of exemplars (Appendix C)':'exemplars not counted for this task')};
  const draw=(key,k,e,w)=>{const [ep,m,v]=ix[key],S=v.steps,cur=S.slice(0,k+1),n=S.length;
    // context bar, to scale in words
    const segs=[];if(v.pw)segs.push(['x',v.pw]);cur.forEach(s=>segs.push([s.r,Math.max(1,nwords(s.t))]));const tot=segs.reduce((a,b)=>a+b[1],0);
    const col={x:'var(--dim)',q:'var(--rq)',t:'var(--rt)',a:'var(--ra)',f:'var(--ra)',o:'var(--ro)',e:'var(--rx)'};
    const bar=(sg,t)=>'<div class="ctxbar" role="img" aria-label="Context composition">'+sg.map((s,i)=>'<span style="width:'+(100*s[1]/t).toFixed(3)+'%;background:'+col[s[0]]+(i===sg.length-1?';opacity:'+(0.35+0.65*e).toFixed(2):'')+'"></span>').join('')+'</div>';
    const own=segs.filter(s=>s[0]!=='x'),ot=own.reduce((a,b)=>a+b[1],0);
    let h=(v.pw?'<div class="small mute" style="margin-bottom:2px">The whole context, to scale in words (exemplars first):</div>'+bar(segs,tot)+'<div class="small mute" style="margin:4px 0 2px">This episode only:</div>':'<div class="small mute" style="margin-bottom:2px">This episode\'s part of the context, to scale in words:</div>')+bar(own,ot)+
      '<div class="ctxk">'+(v.pw?'<span><i style="background:var(--dim)"></i>exemplars</span>':'')+'<span><i style="background:var(--rq)"></i>task</span><span><i style="background:var(--rt)"></i>thought</span><span><i style="background:var(--ra)"></i>action or answer</span><span><i style="background:var(--ro)"></i>observation</span></div>';
    const from=Math.max(0,cur.length-SHOW);
    let L=from?'<div class="older">+ '+from+' earlier entr'+(from>1?'ies':'y')+' (scrub back to read them)</div>':'';
    cur.slice(from).forEach((s,i)=>{const last=from+i===k;L+='<div class="ent r-'+s.r+(last?' new':'')+'"'+(last?' style="opacity:'+(0.25+0.75*e).toFixed(2)+'"':'')+'><span class="who" style="color:'+ROLE[s.r][1]+'">'+esc(s.n||ROLE[s.r][0])+'</span>'+(s.r==='o'&&s.t.indexOf('\n')>=0?'<pre>'+mk(s.t).replace(/<br>/g,'\n')+'</pre>':'<span class="'+((s.r==='a'||s.r==='t'&&/^(Think|think)/.test(s.t))?'mono':'')+'">'+mk(s.t)+'</span>')+'</div>'});
    if(k===n-1)L+='<div style="margin-top:4px"><span class="verdict '+(v.ok?'ok':'no')+'">'+(v.ok?'✓ Solved':'✗ Not solved')+'</span> <span class="small mute">'+esc(ep.truth)+'</span></div>';
    const C=CODE[codeFor(ep,m)],on=C.m[S[k].r]||[];
    const code='<div class="small mute" style="margin-bottom:2px">The harness, as in the released code (shortened):</div><pre class="code">'+C.l.map((l,i)=>'<div class="'+(on.includes(i)?'on':'')+'">'+l+'</div>').join('')+'</pre><p class="small mute" style="margin:4px 0 0">'+esc(ep.env)+'. Source: '+esc(ep.src)+'.</p>';
    return '<div class="trgrid"><div class="tr">'+h+L+'</div><div>'+code+'</div></div>'};
  const an=makeAnim({id,modes,mode:startKey,draw,counters,dur:2600});
  seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const nt=$(id+'Note');if(nt){const [e]=ix[b.dataset.m];nt.innerHTML=esc(e.note)}}));
  const sel=$(id+'Ep');if(sel){sel.innerHTML=E.map(e=>'<option value="'+e.id+'">'+esc(e.name)+'</option>').join('');sel.value=startKey.split(':')[0];
    sel.addEventListener('change',()=>{showEp(sel.value);const b=seg.querySelector('button[data-ep="'+sel.value+'"][data-m$=":react"]')||seg.querySelector('button[data-ep="'+sel.value+'"]');b.click()})}
  const nt=$(id+'Note');if(nt)nt.innerHTML=esc(ix[startKey][0].note);
  return an}
const RP=makeTrace('rp',['apple'],'apple:react');
const TR=makeTrace('tr',['apple','myst','pepper','keys','web','soyuz'],'apple:react');
onTab('t-run',()=>{if(TR){refit($('trSvg'))}});
