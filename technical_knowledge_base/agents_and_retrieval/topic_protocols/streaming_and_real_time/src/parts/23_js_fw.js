// ---- Section 1: one answer, four ways (measured runs replayed on one clock) ----
(function(){
  const D=window.SDATA,esc=RD.esc,box=document.getElementById('fw-svg');if(!box)return;
  const M=['short polling','long polling','SSE','WebSocket'];
  const LBL={'short polling':'Polling','long polling':'Long polling','SSE':'SSE','WebSocket':'WebSocket'};
  const TOK=['The',' sky',' is',' blue','.'];
  const OFF=[0,0.12,0.17,0.22,0.27,0.32,0.32];             // when the stand-in model produces each event (s)
  const STEP=0.01,TMAX=0.6,N=Math.round(TMAX/STEP)+1;
  let rtt='50';
  document.getElementById('fw-reps').textContent=D.fw['50'].SSE.reps;
  const fmt=t=>Math.round(t*1000)+' ms';
  function textAt(m,t){let s='';let k=0;D.fw[rtt][m].arr.forEach(([e,ta])=>{if(e==='content_block_delta'){if(ta<=t+1e-9)s+=TOK[k];k++}});return s}
  function reqAt(m,t){return D.fw[rtt][m].req.filter(r=>r[0]<=t+1e-9).length}
  function draw(i){
    const t=i*STEP,W=RD.width(box),lw=Math.min(96,W*0.24),pw=W-lw-12,x=v=>lw+Math.min(v,TMAX)/TMAX*pw;
    const rh=34,H=22+rh*5+8;let b='';
    // time grid
    for(let g=0;g<=TMAX+1e-9;g+=0.1){b+='<line x1="'+x(g)+'" x2="'+x(g)+'" y1="14" y2="'+(H-6)+'" stroke="var(--line)"/>'+RD.t(x(g),11,Math.round(g*1000)+(g===0?' ms':''),{a:'middle',fs:10,fill:'var(--mute)'})}
    const rows=[['Earliest',null]].concat(M.map(m=>[LBL[m],m]));
    rows.forEach(([lab,m],r)=>{
      const y=22+r*rh,cy=y+rh/2;
      b+=RD.t(4,cy+4,lab,{fs:12,w:m?'600':'400',fill:m?null:'var(--mute)'});
      b+='<line x1="'+lw+'" x2="'+(lw+pw)+'" y1="'+cy+'" y2="'+cy+'" stroke="var(--dim)"/>';
      if(!m){OFF.forEach((o,k)=>{const ta=o+(+rtt)/1000;const c=(k===0||k===6)?'var(--mute)':'var(--c1)';
        b+='<circle cx="'+x(ta)+'" cy="'+cy+'" r="4" fill="none" stroke="'+c+'" stroke-width="1.5"/>'});return}
      const d=D.fw[rtt][m];
      d.req.forEach((q,n)=>{if(q[0]>t+1e-9)return;const e=Math.min(q[1],t);
        b+='<rect x="'+(x(q[0])+1)+'" y="'+(cy-9)+'" width="'+Math.max(1.5,x(e)-x(q[0])-2)+'" height="18" rx="3" fill="var(--acc2)" stroke="var(--acc)" stroke-width="1" opacity=".85"/>'});
      d.arr.forEach(([e,ta],k)=>{if(ta>t+1e-9)return;const c=(e==='content_block_delta')?'var(--c1)':'var(--mute)';
        b+='<circle cx="'+x(ta)+'" cy="'+cy+'" r="4.2" fill="'+c+'"/>'});
    });
    b+='<line x1="'+x(t)+'" x2="'+x(t)+'" y1="14" y2="'+(H-6)+'" stroke="var(--bad)" stroke-width="1.5"/>';
    box.innerHTML=RD.svg(W,H,b,'Timeline of the four delivery mechanisms at '+fmt(t));
    // caption: what happened in this step
    const lo=t-STEP+1e-9,hi=t+1e-9,ev=[];
    M.forEach(m=>{const d=D.fw[rtt][m];
      d.req.forEach((q,n)=>{if(q[0]>lo&&q[0]<=hi&&n>0)ev.push(LBL[m]+': request '+(n+1)+' sent');
        if(q[1]>lo&&q[1]<=hi&&(m==='short polling'||m==='long polling'))ev.push(LBL[m]+': request '+(n+1)+' answered with '+q[2]+' event'+(q[2]===1?'':'s'))});
      let k=0;d.arr.forEach(([e,ta])=>{if(e==='content_block_delta'){if(ta>lo&&ta<=hi)ev.push(LBL[m]+': "'+TOK[k].trim()+'" arrives');k++}
        else if(e==='message_stop'&&ta>lo&&ta<=hi)ev.push(LBL[m]+': done')});
    });
    const cap=document.getElementById('fw-cap');
    cap.innerHTML='<div class="t">t = '+fmt(t)+'</div><p>'+(i===0?'Every client sends its first request at 0 ms; the server starts the answer when that request arrives, half a round trip later.':
      ev.length?esc(ev.slice(0,4).join('; ')+(ev.length>4?'; and '+(ev.length-4)+' more':'')):'Nothing reaches any client in this 10 ms.')+'</p>';
    document.getElementById('fw-cnt').innerHTML=M.map(m=>{const d=D.fw[rtt][m];const s=textAt(m,t);
      return RD.stat(LBL[m],'"'+esc(s)+'"',reqAt(m,t)+' request'+(reqAt(m,t)===1?'':'s')+' so far; whole run '+d.up+' B up, '+d.down+' B down')}).join('');
  }
  const A=RD.anim({card:'fw-card',ctl:'fw-ctl',n:N,draw,ms:140,label:'Time step'});
  RD.seg(document.getElementById('fw-rtt'),v=>{rtt=v;A.reset(N);A.play()});
  RD.onResize(()=>A.redraw());
})();
