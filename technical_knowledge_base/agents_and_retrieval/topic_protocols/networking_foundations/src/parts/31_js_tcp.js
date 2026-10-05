// ---- TCP timeline tab: an event-driven model of the running request over one TCP connection ----
// Inputs recorded by the root page (src/wire/raw/h1_arrivals.json and h1_response.bin): the server's writes, in bytes,
// and their times after the request arrived. Request: 277 bytes (h1_request.bin). check_embed.py compares these.
window.TCPSIM=(function(){
  const REQ=277,MSS=1448,DACK=40,RTO_FLOOR=200;
  const WRITES=[[2.418,379,'head + message_start'],[123.771,124,'token 1 "The"'],[175.144,125,'token 2 " sky"'],[226.488,124,'token 3 " is"'],[277.989,126,'token 4 " blue"'],[329.086,122,'token 5 "."'],[330.069,62,'message_stop + end']];
  function sim(cfg){
    const R=cfg.rtt,d=R/2;const Q=[];let seq=0;
    const push=(t,f,a)=>{Q.push({t,f,a,k:seq++})};
    const pk=[],ev=[],tok=WRITES.map(w=>({lab:w[2],bytes:w[1],tw:null,td:null}));
    // server sender state
    let una=0,nxt=0,dup=0,rtoAt=null,rto=R+RTO_FLOOR,tlpAt=null,tlpUsed=false,pend=[],segs={},finSent=false,done=false,writesDone=0;
    const lose=new Set();if(cfg.scn==='mid')lose.add(2);if(cfg.scn==='tail')lose.add(6);
    // client receiver state
    let rnxt=0,ooo={},cnt=0,dackAt=null;const delivered=new Set();
    const byteTok=[];let off=0;WRITES.forEach((w,i)=>{byteTok.push([off,off+w[1],i]);off+=w[1]});const TOTAL=off;
    function sendSeg(t,s,len,toks,retx){
      const lost=!retx&&toks.some(i=>lose.has(i))&&!segs[s];
      if(!segs[s])segs[s]={len,toks};
      pk.push({from:'s',t0:t,t1:t+d,lab:(retx?'retransmit ':'')+'data '+toks.map(i=>i===0?'head':i===6?'stop':'tok '+i).join('+')+' ('+len+' B)',kind:'data',lost,retx});
      if(!lost)push(t+d,'cdata',{s,len});
      if(rtoAt===null)rtoAt=t+rto;
      armTlp(t);
    }
    // RFC 8985 s7.2: PTO = 2 SRTT, plus max_ack_delay (here the model's 40 ms) when one segment is in flight, never past the RTO
    function armTlp(t){if(cfg.rec!=='fast'||tlpUsed)return;if(nxt<=una){tlpAt=null;return}
      const fl=Object.keys(segs).map(Number).filter(s=>s>=una&&s<nxt).length;let pto=2*R+(fl<=1?DACK:0);if(rtoAt!==null&&t+pto>rtoAt)pto=rtoAt-t;tlpAt=t+pto}
    function write(t,i){const w=WRITES[i];tok[i].tw=t;writesDone++;
      if(cfg.nagle&&nxt>una&&w[1]<MSS||(cfg.nagle&&pend.length)){pend.push(i);ev.push({t,text:'Server writes '+w[2]+'; Nagle holds it: earlier data is still unacknowledged.'});return}
      sendSeg(t,nxt,w[1],[i],false);nxt+=w[1];ev.push({t,text:'Server writes '+w[2]+' and it leaves at once.'});
    }
    function flush(t){if(!pend.length)return;const len=pend.reduce((a,i)=>a+WRITES[i][1],0);sendSeg(t,nxt,len,pend.slice(),false);nxt+=len;
      ev.push({t,text:'The ACK arrived, so Nagle releases '+pend.length+' held write'+(pend.length>1?'s':'')+' as one segment.'});pend=[]}
    function retransmit(t,why){const s=una;const g=segs[s];if(!g)return;sendSeg(t,s,g.len,g.toks,true);ev.push({t,text:why})}
    function sack(t,ack,why){pk.push({from:'c',t0:t,t1:t+d,lab:'ACK '+ack+(why?' ('+why+')':''),kind:'ack'});push(t+d,'sack',{ack})}
    const H={
      syn:t=>{pk.push({from:'c',t0:t,t1:t+d,lab:'SYN',kind:'ctl'});push(t+d,'synack',{})},
      synack:t=>{pk.push({from:'s',t0:t,t1:t+d,lab:'SYN-ACK',kind:'ctl'});push(t+d,'req',{})},
      req:t=>{pk.push({from:'c',t0:t,t1:t+d,lab:'ACK + request ('+REQ+' B)',kind:'ctl'});ev.push({t,text:'Handshake done after one round trip; the request rides on the third segment.'});push(t+d,'start',{})},
      start:t=>{ev.push({t,text:'The request reaches the server; it starts streaming.'});WRITES.forEach((w,i)=>push(t+w[0],'write',{i}))},
      write:(t,a)=>write(t,a.i),
      cdata:(t,a)=>{
        if(a.s===rnxt){rnxt+=a.len;let filled=false;while(ooo[rnxt]){const L=ooo[rnxt];delete ooo[rnxt];rnxt+=L;filled=true}
          byteTok.forEach(b=>{if(b[1]<=rnxt&&!delivered.has(b[2])){delivered.add(b[2]);tok[b[2]].td=t}});
          if(filled||Object.keys(ooo).length){cnt=0;dackAt=null;sack(t,rnxt,'fills the hole: everything held is delivered');return}
          if(!cfg.dack){sack(t,rnxt);return}
          cnt++;if(cnt>=2){cnt=0;dackAt=null;sack(t,rnxt,'every 2nd segment')}else if(dackAt===null){dackAt=t+DACK;push(dackAt,'dack',{at:dackAt})}}
        else if(a.s>rnxt){ooo[a.s]=a.len;sack(t,rnxt,'duplicate: a hole before this');ev.push({t,text:'Out-of-order data: the client buffers it and repeats its last ACK at once.'})}
        else sack(t,rnxt,'duplicate data');
      },
      dack:(t,a)=>{if(dackAt!==a.at)return;dackAt=null;if(cnt>0){cnt=0;sack(t,rnxt,'delayed ACK timer, 40 ms')}},
      sack:(t,a)=>{
        if(a.ack>una){una=a.ack;dup=0;rto=R+RTO_FLOOR;rtoAt=nxt>una?t+rto:null;armTlp(t);
          if(cfg.nagle&&nxt===una)flush(t);
          if(una>=TOTAL&&writesDone===WRITES.length&&!pend.length&&!finSent){finSent=true;pk.push({from:'s',t0:t,t1:t+d,lab:'FIN',kind:'ctl'});push(t+d,'cfin',{});ev.push({t,text:'All data acknowledged: the server closes (FIN).'})}}
        else if(a.ack===una&&nxt>una){dup++;if(dup===3&&cfg.rec==='fast'){retransmit(t,'Third duplicate ACK: fast retransmit of the missing segment, without waiting for the timer.')}}
      },
      cfin:t=>{pk.push({from:'c',t0:t,t1:t+d,lab:'ACK + FIN',kind:'ctl'});push(t+d,'sfin',{})},
      sfin:t=>{pk.push({from:'s',t0:t,t1:t+d,lab:'ACK (server enters TIME_WAIT)',kind:'ctl'});done=true;ev.push({t,text:'Closed. The server, which closed first, now sits in TIME_WAIT.'})}
    };
    push(0,'syn',{});let guard=0;
    while((Q.length||rtoAt!==null||tlpAt!==null)&&guard++<2000){
      // timers are checked against the next queued event
      Q.sort((x,y)=>x.t-y.t||x.k-y.k);const nextT=Q.length?Q[0].t:Infinity;
      const tm=[rtoAt,tlpAt].filter(x=>x!==null&&x<=nextT);
      if(tm.length){const t=Math.min(...tm);
        if(tlpAt!==null&&t===tlpAt){tlpAt=null;tlpUsed=true;if(nxt>una){const last=Math.max(...Object.keys(segs).map(Number).filter(s=>s<nxt));const g=segs[last];sendSeg(t,last,g.len,g.toks,true);ev.push({t,text:'Tail-loss probe: about two round trips without an ACK (RFC 8985), so the sender resends its last segment to provoke one.'})}continue}
        rtoAt=null;if(nxt>una){retransmit(t,'Retransmission timer fires ('+Math.round(rto)+' ms with nothing acknowledged): resend the oldest unacknowledged segment.');rto*=2;rtoAt=t+rto}continue}
      const e=Q.shift();H[e.f](e.t,e.a);
    }
    pk.sort((x,y)=>x.t0-y.t0);ev.sort((x,y)=>x.t-y.t);
    return {pk,ev,tok,R,end:Math.max(...pk.map(p=>p.t1))};
  }
  return {sim,WRITES,REQ,MSS};
})();
(function(){
  const $=id=>document.getElementById(id);if(!$('t-tcp'))return;const esc=RD.esc,F=NFC.fmt;
  const cfg={scn:'clean',rec:'fast',nagle:false,dack:true,rtt:100};let R=TCPSIM.sim(cfg);
  function draw(i){
    const el=$('tc-svg');const W=Math.max(280,Math.min(880,RD.width(el)));const tmax=Math.max(R.end,400);
    const H=Math.max(420,Math.min(900,tmax*0.9)),T=26,B=10,xc=Math.min(70,W*0.16),xs=W-Math.min(70,W*0.16);
    const Y=t=>T+t/tmax*(H-T-B);let s='';
    s+=RD.t(xc,16,'Client',{a:'middle',w:600,fs:12})+RD.t(xs,16,'Server',{a:'middle',w:600,fs:12});
    NFC.ticks(0,tmax,6).forEach(v=>{s+='<line x1="'+(xc+4)+'" x2="'+(xs-4)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)" stroke-dasharray="2 4"/>'+RD.t(xc-6,Y(v)+3.5,F(v)+' ms',{a:'end',fs:9.5,fill:'var(--mute)'})});
    s+='<line x1="'+xc+'" x2="'+xc+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--mute)" stroke-width="1.5"/><line x1="'+xs+'" x2="'+xs+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--mute)" stroke-width="1.5"/>';
    const tnow=i<R.ev.length?R.ev[i].t:R.end;
    R.pk.filter(p=>p.t0<=tnow+1e-6).forEach(p=>{const c=p.from==='c';const x0=c?xc:xs,x1=c?xs:xc;
      const col=p.lost?'var(--bad)':p.retx?'var(--c5)':p.kind==='ack'?'var(--c3)':p.kind==='ctl'?'var(--mute)':'var(--c1)';
      if(p.lost){const xm=x0+(x1-x0)*0.55,ym=Y(p.t0)+(Y(p.t1)-Y(p.t0))*0.55;s+='<line x1="'+x0+'" y1="'+Y(p.t0)+'" x2="'+xm+'" y2="'+ym+'" stroke="'+col+'" stroke-width="2"/><path d="M'+(xm-5)+' '+(ym-5)+'l10 10m0 -10l-10 10" stroke="'+col+'" stroke-width="2"/>'}
      else s+='<line x1="'+x0+'" y1="'+Y(p.t0)+'" x2="'+x1+'" y2="'+Y(p.t1)+'" stroke="'+col+'" stroke-width="'+(p.kind==='ack'?1.1:1.8)+'"/><circle cx="'+x1+'" cy="'+Y(p.t1)+'" r="2.2" fill="'+col+'"/>';
      if(p.kind!=='ack'||W>520){const tx=c?xc+6:xs-6;s+=RD.t(tx,Y(p.t0)-2,esc(p.lab),{a:c?'start':'end',fs:W<480?8.5:9.5,fill:col})}});
    // token deliveries at the client
    const byT={};R.tok.forEach((k,j)=>{if(k.td!==null&&k.td<=tnow+1e-6&&j>0&&j<6){const key=k.td.toFixed(1);(byT[key]=byT[key]||[]).push(j)}});
    Object.keys(byT).forEach(key=>{const js=byT[key];s+=RD.t(xc-6,Y(+key)+12,'&#9654; tok '+(js.length>1?js[0]+'-'+js[js.length-1]:js[0]),{a:'end',fs:9,fill:'var(--c4)',w:600})});
    el.innerHTML=RD.svg(W,H,s,'TCP time-sequence diagram');
    const e=R.ev[Math.min(i,R.ev.length-1)];
    $('tc-cap').innerHTML='<div class="t">'+(i+1)+' of '+R.ev.length+'. t = '+F(e.t,1)+' ms</div><p>'+esc(e.text)+'</p>';
    const got=R.tok.filter((k,j)=>j>0&&j<6&&k.td!==null&&k.td<=tnow+1e-6).length;
    const lastTok=R.tok[5];const ideal=t=>t.tw+R.R/2;
    const worst=Math.max(...R.tok.slice(1,6).map(k=>k.td-ideal(k)));
    $('tc-cnt').innerHTML=RD.stat('Time',F(tnow,0)+' ms','')+RD.stat('Tokens shown to the app',got+' of 5','')+RD.stat('Packets so far',R.pk.filter(p=>p.t0<=tnow+1e-6).length,'')+
      RD.stat('Worst token delay','+'+F(worst,0)+' ms','beyond the one-way trip (whole run)')+RD.stat('Last byte delivered',F(R.tok[6].td,0)+' ms','');
  }
  function table(){
    $('tc-tab').innerHTML='<table><thead><tr><th>Write</th><th class="num">Written at</th><th class="num">At the client app</th><th class="num">Extra wait</th></tr></thead><tbody>'+
      R.tok.map(k=>{const ex=k.td-(k.tw+R.R/2);return '<tr><td>'+esc(k.lab)+'</td><td class="num">'+F(k.tw,1)+' ms</td><td class="num">'+F(k.td,1)+' ms</td><td class="num'+(ex>1?' late':'')+'">'+(ex>0.05?'+'+F(ex,1)+' ms':'none')+'</td></tr>'}).join('')+
      '</tbody></table><div class="small mute">Extra wait = arrival at the client application minus (write time + one-way delay). Times from the client\'s SYN.</div>';
  }
  const h=RD.anim({card:'t-tcp',ctl:'tc-ctl',n:R.ev.length,draw,ms:1100,label:'Event'});
  function rerun(){R=TCPSIM.sim(cfg);table();h.reset(R.ev.length);h.play()}
  RD.seg($('tc-scn'),m=>{cfg.scn=m;rerun()});RD.seg($('tc-rec'),m=>{cfg.rec=m;rerun()});
  RD.seg($('tc-nag'),m=>{cfg.nagle=m==='on';rerun()});RD.seg($('tc-dack'),m=>{cfg.dack=m==='on';rerun()});
  $('tc-rtt').addEventListener('input',e=>{cfg.rtt=+e.target.value;$('tc-rtt-v').textContent=cfg.rtt+' ms';rerun()});
  table();
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-tcp']=window.TAB_RENDER['t-tcp']||[]).push(()=>h.redraw());
  addEventListener('resize',()=>{if(!$('t-tcp').hidden)h.redraw()});
})();
