// ---- Reading, section 14: replay the captured SSE stream at its real arrival times; section 15: dated versions walked back ----
(function(){
  const D=window.API_DATA,esc=RD.esc,res=D.ex.stream.res,arr=D.stream_ms;
  const body=res.slice(res.indexOf('\r\n\r\n')+4);
  // split the chunked body into chunks: [sizeLine, data]
  const parts=[];let rest=body;while(rest.length){const nl=rest.indexOf('\r\n');if(nl<0)break;const n=parseInt(rest.slice(0,nl),16);
    if(isNaN(n))break;const data=rest.slice(nl+2,nl+2+n);parts.push([rest.slice(0,nl),data]);rest=rest.slice(nl+2+n+2);if(n===0)break}
  // the socket delivered the headers plus first chunk together, then one chunk per arrival
  const head=res.slice(0,res.indexOf('\r\n\r\n'));
  const steps=[{raw:'',txt:'',t:0,cap:'Request sent.'}];
  let raw=head+'\r\n\r\n',txt='';
  parts.forEach((p,i)=>{raw+=p[0]+'\r\n'+p[1]+(p[0]==='0'?'':'\r\n');
    const m=p[1].match(/data: (.*)/);if(m){try{const j=JSON.parse(m[1]);if(j.text)txt+=j.text}catch(e){}}
    const t=arr[Math.min(i,arr.length-1)];steps.push({raw,txt,t,ev:(p[1].match(/event: (\w+)/)||[,'end of body'])[1]})});
  const rawEl=document.getElementById('rd-sse-raw'),ui=document.getElementById('rd-sse-ui'),tEl=document.getElementById('rd-sse-t');
  function draw(i){const s=steps[i];RAW.render(rawEl,s.raw||'(waiting for the first bytes)',null);rawEl.scrollTop=rawEl.scrollHeight;
    ui.innerHTML=esc(s.txt)+(i<steps.length-1&&i>0?'<span style="opacity:.5">&#9612;</span>':'');
    tEl.textContent=i===0?'0 ms: request sent':s.t+' ms after sending: '+(s.ev||'')+' arrived'}
  RD.anim({card:'rd-sse-card',ctl:'rd-sse-ctl',n:steps.length,draw,ms:700,label:'Stream event'});
  window.__SSE=steps;
})();
(function(){
  // Illustrative: three dated versions of the chat API; core code emits the newest shape, modules walk it back.
  const esc=RD.esc;
  const newest={id:'msg_cd10',chat_id:'chat_ae81',role:'assistant',content:[{type:'text',text:'Echo: Summarise this article'}],usage:{input_tokens:5,output_tokens:6},credits_left:990};
  const mods=[
    {date:'2026-10-01',what:'content is a list of blocks',fn:x=>x},
    {date:'2026-06-01',what:'Undo the 2026-10-01 change: content back to a plain string.',fn:x=>{const y=Object.assign({},x);y.content=x.content.map(b=>b.text).join('');return y}},
    {date:'2025-11-01',what:'Undo the 2026-06-01 change: remove usage, rename credits_left back to balance.',fn:x=>{const y=Object.assign({},x);delete y.usage;y.balance=y.credits_left;delete y.credits_left;return y}}];
  const view=document.getElementById('rd-ver-view');
  function show(k){k=+k;let x=newest,h='<div class="small" style="margin:6px 0">The core code always builds the newest response. Then, for a client pinned to an older date, each change module newer than that date is applied in turn, newest first:</div>';
    for(let i=0;i<=k;i++){x=mods[i].fn(x);h+='<div class="small mute" style="margin-top:6px">'+(i===0?'Core output, the '+mods[0].date+' shape: '+esc(mods[0].what):'Module '+i+' applied, giving the '+mods[i].date+' shape. '+esc(mods[i].what))+'</div><div class="raw" style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(JSON.stringify(x,null,1))+'</div>'}
    h+='<div class="small"><b>'+(k===0?'No transform':k+' transform'+(k>1?'s':''))+' run</b> for this client. A new breaking change costs one new module; old clients keep working untouched.</div>';view.innerHTML=h}
  RD.seg(document.getElementById('rd-ver-seg'),show);show(2);
})();
