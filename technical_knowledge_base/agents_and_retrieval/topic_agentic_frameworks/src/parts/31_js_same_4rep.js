// ---- Same agent, six ways: replay a recorded run, call by call ----
(function(){
  const {D,esc,fmt,stat,anim}=SAMEUI;
  const PER=25;
  const NAMES={a1:'1. Plain loop',a2:'2. LangGraph',a3:'3. Pydantic AI',a4:'4. OpenAI Agents SDK',a5:'5. smolagents CodeAgent',a5b:'5b. smolagents ToolCallingAgent',a6:'6. Claude Agent SDK',a6b:'6b. Claude Code prompt appended',a6c:'6c. Claude built-in tools'};
  const runs=[];
  Object.keys(D.local).sort().forEach(k=>{const r=D.local[k];if(r.transcript)runs.push({k,kind:'local',r})});
  Object.keys(D.claude).sort().forEach(k=>{const r=D.claude[k];if(r.transcript)runs.push({k,kind:'claude',r})});
  function label(x){const id=x.k.split('_')[0],m=x.r.meta;const fixed=m.tests_pass&&m.tests_unchanged;
    const how=x.kind==='local'?(/_t07_/.test(x.k)?'local 4B, temperature 0.7':'local 4B, greedy'):(/sonnet/.test(x.k)?'Sonnet':'Haiku 4.5');
    return (NAMES[id]||id)+' ('+how+'): '+(fixed?'fixed':'not fixed')+' ['+x.k+']'}
  const sel=document.getElementById('same-repSel');
  sel.innerHTML=runs.map((x,i)=>'<option value="'+i+'">'+esc(label(x))+'</option>').join('');
  // Build steps: one per model call. Each step = the model's output, then the observations it caused.
  function steps(x){
    const tr=x.r.transcript,out=[];let cur=null;
    tr.forEach((m,i)=>{
      if(x.kind==='local'&&i<2)return; // system prompt and task: shown as the header
      if(m.role==='assistant'){if(!cur||cur.obs.length){cur={as:[],obs:[]};out.push(cur)}cur.as.push(m)}
      else if(cur)cur.obs.push(m)});
    out.forEach((s,j)=>{const c=x.r.calls[j];if(!c)return;
      s.tin=x.kind==='local'?c.in:(c.in||0)+(c.cw||0)+(c.cr||0);s.tout=c.out;s.sec=c.s;s.cr=c.cr});
    return out}
  // Arguments arrive as a JSON string; show each argument on its own line, strings unescaped.
  function fmtArgs(a){let o;try{o=typeof a==='string'?JSON.parse(a):a}catch(e){return ' '+esc(a)}
    if(!o||typeof o!=='object'||!Object.keys(o).length)return ' (no arguments)';
    return Object.keys(o).map(k=>'\n<b>'+esc(k)+'</b>: '+esc(typeof o[k]==='string'?o[k]:JSON.stringify(o[k]))).join('')}
  function msgHtml(m,kind){
    if(m.thinking)return '<div class="same-msg as"><div class="who">model: thinking (text not returned, only its tokens)</div></div>';
    if(m.role==='assistant'){let h='<div class="same-msg as"><div class="who">model output</div>';
      if(m.text)h+='<pre>'+esc(m.text)+'</pre>';
      (m.calls||[]).forEach(c=>{h+='<pre><b>tool call: '+esc(c.name)+'</b>'+fmtArgs(c.args)+'</pre>'});return h+'</div>'}
    return '<div class="same-msg '+(m.role==='tool'?'tl':'us')+'"><div class="who">'+(m.role==='tool'?'tool result':'observation sent back as a '+esc(m.role)+' message')+'</div><pre>'+esc(m.text)+'</pre></div>'}
  let X,S,an;
  function draw(i){
    const s=S[i];let cumIn=0,cumOut=0,cumS=0;
    S.slice(0,i+1).forEach(t=>{cumIn+=t.tin||0;cumOut+=t.tout||0;cumS+=t.sec||0});
    const prev=i?(S[i-1].tin||0):0,nowIn=s.tin||0;
    let sq='';const a=Math.round(Math.min(prev,nowIn)/PER),b=Math.round(nowIn/PER);
    for(let j=0;j<b;j++)sq+='<i style="background:'+(j<a?'var(--dim)':'var(--acc)')+'"></i>';
    document.getElementById('same-repCtx').innerHTML=sq;
    const st=[SAMEUI.stat('Model call',(i+1)+' of '+S.length),SAMEUI.stat('Prompt tokens, this call',fmt(s.tin),X.kind==='claude'&&s.cr!=null?fmt(s.cr)+' read from cache':''),
      SAMEUI.stat('Prompt tokens so far',fmt(cumIn),'summed over calls: history is re-sent each time'),SAMEUI.stat('Output tokens so far',fmt(cumOut))];
    if(X.kind==='local')st.push(SAMEUI.stat('Seconds in model calls',(Math.round(cumS*10)/10)+' s','local 4B on M1 Pro'));
    document.getElementById('same-repStats').innerHTML=st.join('');
    const tool=s.as.flatMap(m=>(m.calls||[]).map(c=>c.name));
    document.getElementById('same-repCap').innerHTML='Call '+(i+1)+': the model saw <b>'+fmt(s.tin)+'</b> prompt tokens'+(i?' (<b>'+fmt(nowIn-prev)+'</b> more than the previous call: grey is what it had already seen, blue is new)':'')+
      (tool.length?' and asked for <b>'+esc(tool.join(', '))+'</b>.':(i===S.length-1?' and answered without a tool call: the loop stops here.':' and replied in text.'));
    const feed=document.getElementById('same-repFeed');
    feed.innerHTML=S.slice(0,i+1).map((t,j)=>'<div'+(j===i?' class="cur-step"':'')+'>'+t.as.map(m=>msgHtml(m)).join('')+t.obs.map(m=>msgHtml(m)).join('')+'</div>').join('');
    const cur=feed.querySelector('.cur-step');if(cur)feed.scrollTop=cur.offsetTop-feed.offsetTop;
  }
  function load(){X=runs[+sel.value];S=steps(X);
    document.getElementById('same-repDiff').textContent=X.r.diff||'(no change)';
    if(!an)an=anim({card:'same-repCard',ctl:'same-repCtl',n:S.length,draw,ms:1600,autoplay:false});else an.reset(S.length)}
  sel.onchange=load;sel.value=String(Math.max(0,runs.findIndex(x=>x.k==='a1_1')));load();
})();
