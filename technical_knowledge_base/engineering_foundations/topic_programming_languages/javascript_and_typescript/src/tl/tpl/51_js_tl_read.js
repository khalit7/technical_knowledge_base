// ---- Part 3 (tl) Reading: the stream inspector and the cancellation before/after. Uses RD.anim; redraws registered on t-tl-read ----
(function(){
  const D=window.TL,esc=RD.esc,reg=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-tl-read']=window.TAB_RENDER['t-tl-read']||[]).push(f)};
  const $=id=>document.getElementById(id);

  // ---------- stream inspector ----------
  const CAP={
    message_start:'The message object comes first: id, model, input token count. Its content is empty and stop_reason is null; both fill in later.',
    content_block_start:d=>d.content_block.type==='tool_use'?'A tool_use block opens at index '+d.index+': the tool name and id arrive now, the arguments ("input") are still {}.':'A text block opens at index '+d.index+', empty.',
    ping:'A keep-alive event. The SDK drops it: code iterating the stream never sees it.',
    text_delta:'One piece of text: append it to the block. This is what you print as it arrives.',
    input_json_delta:'A fragment of the tool arguments as JSON text. On its own it is not valid JSON; the SDK re-parses the whole string so far to show a partial object.',
    content_block_stop:'The block is complete. For a tool call, the arguments are now whole JSON.',
    message_delta:d=>'The final stop_reason ('+d.delta.stop_reason+') and the output token count arrive at the end, not at the start.',
    message_stop:'End of the message. finalMessage() resolves now with the assembled Message.',
    'response.created':'The Responses API opens with the whole response object, status in_progress, output empty.',
    'response.output_item.added':'An output item opens: a message (a function_call would be another kind of item).',
    'response.content_part.added':'A content part opens inside the message: output_text, empty.',
    'response.output_text.delta':'One piece of text, with item_id, output_index and content_index saying where it goes.',
    'response.output_text.done':'The full text of the part, repeated once complete.',
    'response.content_part.done':'The part is complete.',
    'response.output_item.done':'The message item is complete.',
    'response.completed':'The final response object with status completed and usage. Every OpenAI event also carries a sequence_number.'
  };
  function capOf(f){const d=f.data;let c=CAP[f.ev];if(f.ev==='content_block_delta')c=CAP[d.delta.type];return typeof c==='function'?c(d):(c||f.ev)}
  let sxMode='anthropic';
  function sxDraw(i){
    const F=D.stream[sxMode],f=F[i];let acc='',json='',bytes=0;
    for(let k=0;k<=i;k++){const g=F[k],d=g.data;bytes+=g.raw.length+2;
      if(g.ev==='content_block_delta'&&d.delta.type==='text_delta')acc+=d.delta.text;
      if(g.ev==='content_block_delta'&&d.delta.type==='input_json_delta')json+=d.delta.partial_json;
      if(g.ev==='response.output_text.delta')acc+=d.delta}
    let asm;
    if(sxMode==='tool'){let ok='not valid JSON yet';try{ok='valid JSON: '+JSON.stringify(JSON.parse(json))}catch(e){}
      asm='<div class="tl-mono">text block: '+(acc?esc(acc):'<span class="mute">(none yet)</span>')+'</div><div class="tl-mono" style="margin-top:4px">tool_use input so far: '+esc(JSON.stringify(json))+'</div><div class="small mute">'+(json?esc(ok):'(no argument text yet)')+'</div>'}
    else asm='<div class="tl-mono">'+(acc?esc(acc):'<span class="mute">(no text yet)</span>')+'</div>';
    $('tl-sx-view').innerHTML='<div class="tl-olab">frame '+(i+1)+' of '+F.length+' on the wire</div><pre class="tl-raw">'+esc(f.raw)+'</pre>'+
      '<div class="tl-olab">assembled so far</div><div class="tl-raw" style="border:1px solid var(--line);border-radius:0 6px 6px 6px;padding:8px 10px">'+asm+'</div>';
    $('tl-sx-cap').innerHTML='<b>'+esc(f.ev)+'</b>: '+esc(capOf(f));
    $('tl-sx-cnt').innerHTML='frames <b>'+(i+1)+'/'+F.length+'</b> &middot; bytes received <b>'+bytes+'</b> &middot; '+(sxMode==='tool'?'argument characters <b>'+json.length+'</b>':'text characters <b>'+acc.length+'</b>');
  }
  const sx=RD.anim({card:'tl-sx-card',ctl:'tl-sx-ctl',n:D.stream.anthropic.length,draw:sxDraw,ms:900,label:'Stream frame'});
  RD.seg($('tl-sx-mode'),m=>{sxMode=m;sx.reset(D.stream[m].length);sx.play()});
  reg(()=>sx.redraw());

  // ---------- cancellation before/after ----------
  const C=D.cancel;let cxMode='with';
  function cxSteps(m){const c=C[m],ev=c.events,total=c.total;const close=ev.find(e=>/closing/.test(e.text)),t0=close.ms;
    const S=[{t:null,gen:3,txt:'The browser asked; your server called the model and is forwarding each piece as an SSE event. The browser has shown 3 pieces.',lanes:['reading','forwarding','generating']}];
    S.push({t:0,gen:3,txt:'The user closes the tab. The browser aborts its fetch (its AbortController), which closes the TCP connection.',lanes:['gone','forwarding','generating']});
    const notice=ev.find(e=>/went away/.test(e.text));
    S.push({t:notice.ms-t0,gen:C.with.sent,txt:"Node fires the response's close event on your server "+(notice.ms-t0)+' ms later.'+(m==='with'?'':' (Event count at this moment estimated from the other run.)'),lanes:['gone','notified','generating']});
    if(m==='with'){const ab=ev.find(e=>/aborted/.test(e.text));
      S.push({t:ab.ms-t0,gen:c.sent,txt:'The server calls ac.abort(). The SDK closes its HTTP request to the model API and throws APIUserAbortError, which the server catches.',lanes:['gone','aborted','stopped']});
      S.push({t:null,gen:c.sent,txt:'The model API saw its client leave after '+c.sent+' of '+total+' events and stopped generating. Nothing more is paid for.',lanes:['gone','done','stopped']});}
    else{const fin=ev.find(e=>/upstream finished/.test(e.text));
      S.push({t:null,gen:Math.round(total/2),txt:'Nobody told the model call. It keeps generating, and the server keeps writing each piece to a socket that is already closed (estimated midpoint: the model sends one event every 20 ms).',lanes:['gone','writing to nobody','generating']});
      S.push({t:fin.ms-t0,gen:total,txt:'The model finishes all '+total+' events '+(fin.ms-t0)+' ms after the user left. Every token after the third was paid for and never read.',lanes:['gone','done','finished']});}
    return S}
  function cxDraw(i){const S=cxSteps(cxMode),s=S[i],c=C[cxMode],total=c.total,read=3;
    let cells='';for(let k=0;k<total;k++){const col=k<read?'var(--good)':k<s.gen?'var(--bad)':'var(--dim)';cells+='<i style="display:inline-block;width:9px;height:9px;margin:1px;border-radius:2px;background:'+col+'"></i>'}
    const lane=(n,v)=>'<div><b>'+n+'</b><span>'+esc(v)+'</span></div>';
    $('tl-cx-view').innerHTML='<div class="tl-stack">'+lane('Browser',s.lanes[0])+lane('Your server',s.lanes[1])+lane('Model API',s.lanes[2])+'</div>'+
      '<div class="small mute" style="margin-top:6px">The model answer\'s '+total+' events: <span style="color:var(--good)">read by the user</span>, <span style="color:var(--bad)">generated, paid for, never read</span>, <span class="mute">never generated</span></div><div style="line-height:0;margin:4px 0">'+cells+'</div>';
    $('tl-cx-cap').innerHTML=(s.t!==null?'<b>+'+s.t+' ms</b>: ':'')+esc(s.txt);
    $('tl-cx-cnt').innerHTML='events generated <b>'+s.gen+'/'+total+'</b> &middot; read <b>'+read+'</b> &middot; wasted <b>'+Math.max(0,s.gen-read)+'</b>';
  }
  const cx=RD.anim({card:'tl-cx-card',ctl:'tl-cx-ctl',n:cxSteps('with').length,draw:cxDraw,ms:1800,label:'Cancellation step'});
  RD.seg($('tl-cx-mode'),m=>{cxMode=m;cx.reset(cxSteps(m).length);cx.play()});
  reg(()=>cx.redraw());
})();
