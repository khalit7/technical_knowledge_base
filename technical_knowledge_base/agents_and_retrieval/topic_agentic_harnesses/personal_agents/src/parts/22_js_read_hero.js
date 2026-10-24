// ---- Hero: the resident agent on one page (static annotated diagram, drawn at the measured width) ----
(function(){
  const host=document.getElementById('hp-hero-svg');if(!host)return;
  function wrap(s,w,fs){const max=Math.max(8,Math.floor(w/(fs*0.56)));const out=[];let cur='';
    s.split(' ').forEach(x=>{if((cur+' '+x).trim().length>max&&cur){out.push(cur);cur=x}else cur=(cur+' '+x).trim()});if(cur)out.push(cur);return out}
  function draw(){
    const W=RD.width(host),narrow=W<560,pad=4,gap=8,fs=narrow?11.5:12;
    let y=4,b='';
    // a row of boxes: items [{h:head,t:text,col,fill}]; cols per row
    function row(items,cols){
      const n=Math.min(cols,items.length),bw=(W-2*pad-gap*(n-1))/n;
      const rows=[];for(let i=0;i<items.length;i+=n)rows.push(items.slice(i,i+n));
      rows.forEach(r=>{
        const L=r.map(it=>({it,lines:wrap(it.t,bw-16,fs)}));
        const hh=Math.max(...L.map(o=>o.lines.length))*(fs+3)+(r.some(it=>it.h)?fs+8:0)+12;
        L.forEach((o,k)=>{const x=pad+k*(bw+gap),it=o.it;
          b+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+hh+'" rx="7" fill="'+(it.fill||'var(--soft)')+'" stroke="'+(it.col||'var(--line)')+'" stroke-width="'+(it.col?2:1)+'"/>';
          let ty=y+fs+5;
          if(it.h){b+=RD.t(x+8,ty,RD.esc(it.h),{fs:fs+0.5,w:700,fill:it.col||'var(--ink)'});ty+=fs+4}
          o.lines.forEach(l=>{b+=RD.t(x+8,ty,RD.esc(l),{fs});ty+=fs+3});
        });
        y+=hh+gap;
      });
    }
    function arrow(label){const x=W/2;b+='<line x1="'+x+'" x2="'+x+'" y1="'+(y-4)+'" y2="'+(y+14)+'" stroke="var(--mute)" stroke-width="1.5"/><path d="M'+(x-5)+' '+(y+9)+' L'+x+' '+(y+16)+' L'+(x+5)+' '+(y+9)+'" fill="none" stroke="var(--mute)" stroke-width="1.5"/>';
      if(label)b+=RD.t(x+10,y+11,RD.esc(label),{fs:11,fill:'var(--mute)'});y+=22}
    row([{h:'You',t:'direct messages',col:'var(--c1)'},{h:'Anyone',t:'email, group chats, web pages: open to strangers',col:'var(--c2)'},{h:'Heartbeat',t:'a timer, nobody watching',col:'var(--c5)'},{h:'Schedule',t:'cron jobs, nobody watching',col:'var(--c5)'},{h:'Webhook',t:'another system'}],narrow?2:5);
    arrow('triggers (section 1)');
    row([{h:'Gateway, always running',t:'owns every channel; routes each event to a session (one per sender); delivers replies'}],1);
    arrow('');
    row([{h:'Agent loop',t:'model, tool call, result, repeat (Building a harness)'},{h:'Memory tiers',t:'profile in every prompt, searchable history, skills (Context engineering, section 8)'}],2);
    arrow('proposed action');
    row([{h:'API tools',t:'mail, calendar, messages, payments'},{h:'The screen',t:'screenshot in, click at (x, y) out; or an accessibility tree (section 2)'}],2);
    arrow('');
    row([{h:'The gate, in plain code',t:'decides from which tool and who started the run, never from what the text says (section 6)',col:'var(--acc)'}],1);
    arrow('');
    row([{h:'Read or reversible',t:'run it; log how to undo it',col:'var(--good)'},{h:'Irreversible, you started it',t:'hold for your approval, outside the chat',col:'var(--c5)'},{h:'Irreversible, nobody watching',t:'refuse; draft and tell you instead',col:'var(--bad)'}],narrow?1:3);
    host.innerHTML=RD.svg(W,y,b,'Diagram: triggers flow into a gateway, an agent loop with memory, proposed actions through API tools or the screen, then a gate that allows, holds or refuses');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
