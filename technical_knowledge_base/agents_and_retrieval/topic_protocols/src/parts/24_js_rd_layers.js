// ---- Reading tab, section 1: the same message wrapped by each layer, drawn to scale, then unwrapped ----
(function(){
  const card=document.getElementById('rd-lay');if(!card)return;
  const viz=document.getElementById('rd-lay-viz'),cap=document.getElementById('rd-lay-cap'),cnt=document.getElementById('rd-lay-cnt');
  // bytes per layer; inner first. JSON/HTTP/TLS measured (src/read/code/out/tls.json); TCP/IP/Ethernet from the specs
  const MODES={
    req:{name:'request',layers:[
      {k:'k1',l:'JSON body',b:117,who:'app',d:'The 117-byte JSON body: model, max_tokens, stream: true, and the user message.'},
      {k:'k2',l:'HTTP head',b:160,who:'HTTP',d:'HTTP/1.1 adds the request line and headers (POST /v1/messages, Host, content-type, x-api-key, content-length): 160 bytes, more than the body.'},
      {k:'k3',l:'TLS',b:22,who:'TLS',d:'TLS encrypts the 277 bytes into one record: a 5-byte record header in front, 1 byte of inner content type and a 16-byte authentication tag behind. 299 bytes, unreadable to anyone on the path.'},
      {k:'k4',l:'TCP',b:32,who:'TCP',d:'TCP adds 20 bytes (source and destination port, sequence and acknowledgement numbers, window, flags, checksum) plus 12 bytes of timestamps option.'},
      {k:'k5',l:'IP',b:20,who:'IP',d:'IPv4 adds 20 bytes: source and destination address, time to live, the protocol number of TCP (6).'},
      {k:'k0',l:'Ethernet',b:18,who:'link',d:'Ethernet adds a 14-byte header (the next device’s hardware address) and a 4-byte checksum. This frame is what crosses the cable.'}]},
    tok:{name:'token',layers:[
      {k:'k1',l:'"The"',b:3,who:'app',d:'The model produced three letters: The. This is all the app wants.'},
      {k:'k6',l:'SSE event + JSON',b:115,who:'app',d:'The API wraps them as one Server-Sent Event: an event line and a data line holding JSON (type, index, delta). 118 bytes of event for 3 bytes of text.'},
      {k:'k2',l:'HTTP chunk',b:6,who:'HTTP',d:'HTTP/1.1 chunked encoding puts the length in hex (76 = 118) and a line break before, and a line break after: 6 bytes.'},
      {k:'k3',l:'TLS',b:22,who:'TLS',d:'One TLS record per write: 5 + 1 + 16 = 22 bytes. 146 bytes on the wire, measured.'},
      {k:'k4',l:'TCP',b:32,who:'TCP',d:'Same 32 bytes of TCP header for a tiny segment as for a big one.'},
      {k:'k5',l:'IP',b:20,who:'IP',d:'Same 20 bytes of IP header.'},
      {k:'k0',l:'Ethernet',b:18,who:'link',d:'Same 18 bytes of Ethernet framing.'}]}
  };
  let mode='req';
  const MAX=369; // largest frame of both modes, so both are drawn on one scale
  const steps=m=>2*MODES[m].layers.length; // wrap L steps, one on the cable, unwrap L-1
  function draw(i){
    const M=MODES[mode],L=M.layers.length;
    const n=i<L?i+1:i===L?L:L-(i-L);
    const on=M.layers.slice(0,n);const tot=on.reduce((a,x)=>a+x.b,0);const pay=M.layers[0].b;
    const where=i<L?'Leaving the laptop (wrapping)':i===L?'On the cable (one frame)':'Arriving at the server (unwrapping)';
    const order=[...on].reverse(); // outermost first, left to right
    let h='<div class="small mute" style="margin:4px 0">'+where+'</div>';
    for(let r=0;r<n;r++){ // one row per layer present: what that layer hands to the one below, to scale
      const inner=M.layers.slice(0,r+1),tt=inner.reduce((a,x)=>a+x.b,0),cur=(r===n-1);
      h+='<div class="layrow" style="opacity:'+(cur?1:.55)+'"><div class="small">'+(r===0?(mode==='req'?'app':'app'):M.layers[r].l)+'</div><div style="min-width:0"><div class="lay" style="width:'+(100*tt/MAX).toFixed(2)+'%;height:'+(cur?26:16)+'px">'+
        [...inner].reverse().map(x=>'<span class="'+x.k+'" style="flex:'+x.b+' 1 0" title="'+x.l+': '+x.b+' B">'+''+'</span>').join('')+'</div></div><div class="n">'+(cur?'<b>'+tt+' B</b>':tt+' B')+'</div></div>';
    }
    h+='<div class="leg" style="margin-top:6px">'+M.layers.map((x,j)=>'<span class="sw'+x.k.slice(1)+'" style="opacity:'+(j<n?1:.3)+'">'+x.l+' '+x.b+' B</span>').join('')+'</div>';
    viz.innerHTML=h;
    let t,p;
    if(i<L){const c=M.layers[i];t=i===0?'The app hands over its data: '+c.b+' B':'+ '+c.l+' ('+c.b+' B)';p=c.d}
    else if(i===L){t='One frame on the cable: '+tot+' bytes';p='Every router on the path reads only the IP header; every switch only the Ethernet header. Nobody in between can read the HTTP or the JSON, because TLS encrypted them.'}
    else{const s=M.layers[n];t='Server strips '+s.l+' ('+s.b+' B)';
      p=s.who==='TLS'?'TLS checks the authentication tag (any changed byte fails it) and decrypts. The HTTP is readable again, only here.':s.who==='HTTP'?'The HTTP server parses the head, then hands the body to the application.':s.who==='app'?'The API’s client library parses the event and keeps the text.':'The '+s.l+' layer checks and removes its own header and passes the rest up. It never looks inside.';
      if(i===2*L-1)p+=mode==='req'?' The API now holds exactly the 117-byte JSON the app sent; every layer below did its job and left no trace.':' The app appends "The" to the chat window: 216 bytes crossed the cable for 3 bytes of text.'}
    cap.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>';
    cnt.innerHTML=RD.stat('Bytes on the wire',tot+' B','this step')+RD.stat('Payload',pay+' B',mode==='req'?'JSON body':'token text')+RD.stat('Payload share',(100*pay/tot).toFixed(1)+'%','payload / total');
  }
  const a=RD.anim({card:'rd-lay',ctl:'rd-lay-ctl',n:steps('req'),draw,ms:1500,label:'Layer step'});
  RD.seg(document.getElementById('rd-lay-seg'),m=>{mode=m;a.reset(steps(m));a.play()});
})();
