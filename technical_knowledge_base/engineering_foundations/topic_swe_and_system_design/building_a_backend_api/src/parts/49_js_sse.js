// ---- Reading, section 10: replay the captured SSE stream at its real arrival times ----
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
