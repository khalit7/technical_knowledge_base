// ---- Section 5: functional split, before and after (static toggle, schematic) ----
(function(){
  const box=document.getElementById('fsSvg');if(!box)return;
  let mode='before';
  const L='var(--line)',A='var(--acc)',B='var(--bad)',G='var(--good)',S='var(--soft)';
  const GR=[['users, chats, messages','chat'],['credits, billing events','billing'],['audit log','audit'],['rate-limit counters','limits']];
  const rect=(x,y,w,h,st,sw,fill)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="7" fill="'+(fill||'var(--bg)')+'" stroke="'+st+'" stroke-width="'+(sw||1.2)+'"/>';
  function draw(){
    const W=Math.max(300,RD.width(box)),dk=W<560,g=[];let H;
    if(mode==='before'){
      H=dk?200:150;const x=8,w=W-16;
      g.push(rect(x,8,w,H-16,A,2));g.push(RD.t(x+12,28,'one primary: every write of every table',{fs:12,w:600}));
      const cols=dk?2:4,cw=(w-24-(cols-1)*8)/cols,chH=34;
      GR.forEach((t,i)=>{const r=Math.floor(i/cols),c=i%cols,cx=x+12+c*(cw+8),cy=40+r*(chH+8);
        g.push(rect(cx,cy,cw,chH,L,1.2,S)+RD.t(cx+cw/2,cy+21,t[0],{a:'middle',fs:11}))});
      const by=40+Math.ceil(4/cols)*(chH+8)+4;
      const x1=x+12,x2=dk?x+12+cw*2+8:x+12+cw*2+8;
      g.push('<path d="M'+x1+' '+by+' v8 H'+x2+' v-8" fill="none" stroke="'+G+'" stroke-width="2.5"/>');
      g.push(RD.t(x1,by+24,(dk?'credit + reply: one transaction':'deduct a credit + save the reply: one transaction'),{fs:11.5,fill:G,w:600}));
      document.getElementById('fsCap').textContent='Before: the busiest table group slows all the others, because they share one machine and one write-ahead log; but a transaction can touch any of them.';
    } else {
      const cols=dk?2:4,cw=(W-16-(cols-1)*10)/cols,ch=62,rows=Math.ceil(4/cols);H=16+rows*(ch+24)+30;
      const pos=[];GR.forEach((t,i)=>{const r=Math.floor(i/cols),c=i%cols,x=8+c*(cw+10),y=10+r*(ch+24);pos.push([x,y]);
        const lab=t[1]==='limits'?'Redis':t[1]+' DB';
        g.push(rect(x,y,cw,ch,i<2?A:L,i<2?2:1.2)+RD.t(x+cw/2,y+22,lab,{a:'middle',fs:12,w:600})+RD.t(x+cw/2,y+42,t[0],{a:'middle',fs:11,fill:'var(--mute)'}))});
      const [ax,ay]=pos[0],[bx,by]=pos[1];
      const xm1=ax+cw/2,xm2=bx+cw/2,py=ay+ch+12,ly=10+rows*(ch+24);
      g.push('<path d="M'+xm1+' '+(ay+ch)+' V'+py+' H'+xm2+' V'+(by+ch)+'" fill="none" stroke="'+B+'" stroke-width="2.5" stroke-dasharray="6 4"/>');
      g.push(RD.t(8,ly+8,(dk?'credit + reply: two writes, can half-fail':'deduct + save: now two writes on two servers; can half-fail'),{fs:11.5,fill:B,w:600}));
      document.getElementById('fsCap').textContent='After: each server carries only its own writes and keeps full SQL inside itself; the credit-and-reply transaction is cut in two and needs the outbox pattern or a saga.';
    }
    box.innerHTML=RD.svg(W,H,g.join(''),'Functional split');
  }
  RD.seg(document.getElementById('fsM'),v=>{mode=v;draw()});RD.onRender(draw);RD.onResize(draw);draw();
})();
