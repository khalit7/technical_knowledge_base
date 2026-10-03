// ---- Reading, DoRA: one 2-D column turned 60 degrees at the same length, LoRA's additive path against DoRA's magnitude and direction ----
(function(){
  const $=id=>document.getElementById(id);if(!$('dr'))return;
  const TH0=10*Math.PI/180,TURN=60*Math.PI/180,L0=1,NS=6;
  const w0=[L0*Math.cos(TH0),L0*Math.sin(TH0)],wt=[L0*Math.cos(TH0+TURN),L0*Math.sin(TH0+TURN)];
  let mode='lora';
  const state=(m,t)=>m==='lora'?[w0[0]+t*(wt[0]-w0[0]),w0[1]+t*(wt[1]-w0[1])]:[L0*Math.cos(TH0+t*TURN),L0*Math.sin(TH0+t*TURN)];
  const len=v=>Math.hypot(v[0],v[1]),ang=v=>Math.atan2(v[1],v[0]);
  function draw(i){
    const t=i/(NS-1),el=$('drP'),W=RD.width(el),H=Math.min(260,Math.max(200,W*.5)),s=H*0.72,ox=Math.min(W*.35,W/2-s*0.15),oy=H-26;
    const P=v=>[ox+s*v[0],oy-s*v[1]];
    const arrow=(v,col,w,dash,lab,op)=>{const p=P(v),a=Math.atan2(-(p[1]-oy),p[0]-ox),hx=p[0]-9*Math.cos(a-.4),hy=p[1]+9*Math.sin(a-.4),gx=p[0]-9*Math.cos(a+.4),gy=p[1]+9*Math.sin(a+.4);
      return '<g opacity="'+(op||1)+'"><line x1="'+ox+'" y1="'+oy+'" x2="'+p[0]+'" y2="'+p[1]+'" stroke="'+col+'" stroke-width="'+w+'"'+(dash?' stroke-dasharray="5 4"':'')+'/><path d="M'+p[0]+','+p[1]+'L'+hx+','+hy+'L'+gx+','+gy+'Z" fill="'+col+'"/>'+(lab?'<text x="'+(p[0]+6)+'" y="'+(p[1]-4)+'" font-size="11.5" fill="'+col+'">'+lab+'</text>':'')+'</g>'};
    let h='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="One weight column moving from its start to a target">';
    h+='<path d="M'+(ox+s)+','+oy+' A'+s+','+s+' 0 0 0 '+(ox+s*Math.cos(100*Math.PI/180))+','+(oy-s*Math.sin(100*Math.PI/180))+'" fill="none" stroke="var(--line)" stroke-dasharray="2 4"/>';
    h+='<line x1="'+(ox-10)+'" y1="'+oy+'" x2="'+(ox+s+12)+'" y2="'+oy+'" stroke="var(--line)"/>';
    // path taken so far
    let p='';for(let k=0;k<=i;k++){const q=P(state(mode,k/(NS-1)));p+=(k?'L':'M')+q[0].toFixed(1)+','+q[1].toFixed(1)}
    if(mode==='lora'){const a=P(w0),b=P(wt);h+='<line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'" stroke="var(--dim)" stroke-dasharray="3 3"/>'}
    h+='<path d="'+p+'" fill="none" stroke="var(--acc)" stroke-width="2.5" opacity=".5"/>';
    h+=arrow(w0,'var(--mute)',1.5,false,'start',.8)+arrow(wt,'var(--c2)',1.5,true,'target',.9);
    const cur=state(mode,t);
    if(mode==='lora'&&i>0){const a=P(w0),b=P(cur);h+='<line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'" stroke="var(--c3)" stroke-width="3"/><text x="'+((a[0]+b[0])/2+6)+'" y="'+((a[1]+b[1])/2+14)+'" font-size="11" fill="var(--c3)">BA column</text>'}
    h+=arrow(cur,'var(--acc)',2.5,false,'',1);
    if(mode==='dora'){const u=[Math.cos(ang(cur)),Math.sin(ang(cur))].map(x=>x*0.45);h+=arrow(u,'var(--c4)',2,false,'direction',1);
      const bx=Math.min(W-60,ox+s+30),bh=s*0.8;h+='<rect x="'+bx+'" y="'+(oy-bh)+'" width="16" height="'+bh+'" fill="var(--soft)" stroke="var(--line)"/><rect x="'+bx+'" y="'+(oy-bh*len(cur)/1.2)+'" width="16" height="'+(bh*len(cur)/1.2)+'" fill="var(--c5)"/><text x="'+(bx+8)+'" y="'+(oy+14)+'" text-anchor="middle" font-size="11" fill="var(--mute)">m</text>'}
    el.innerHTML=h+'</svg>';
    const z=x=>Math.abs(x)<0.05?0:x;const dl=z((len(cur)/L0-1)*100),da=(ang(cur)-TH0)*180/Math.PI;
    let mn=1;for(let k=0;k<=i;k++)mn=Math.min(mn,len(state(mode,k/(NS-1))));
    $('drN').innerHTML=RD.stat('Turned so far',da.toFixed(0)+'°','of 60°')+RD.stat('Length now',(dl>=0?'+':'')+dl.toFixed(1)+'%','against the start')+RD.stat('Shortest along the way',z((mn-1)*100).toFixed(1)+'%','0% means the length never moved');
    const C={lora:['The start: one column of W₀, length 1','Training adds the update\'s column (BA, green) to the original. To turn the column 60° it moves the tip along the straight chord. The length is not a separate number: turning drags it down, by up to 13% halfway, then back.','Same target reached. In LoRA a change of length and a change of angle come from the same few numbers, so they move together; the DoRA paper measured exactly this coupling (a positive correlation) in LoRA, and its absence in full fine-tuning.'],
             dora:['The start, split in two: a length m and a direction','LoRA now updates only the direction (purple, always unit length after renormalising), and the length m (yellow bar) is its own trainable number per column. The column can turn without its length moving at all.','Same target reached, along the arc. Length and angle are decoupled: one can change a lot while the other barely moves, the pattern the paper measured in full fine-tuning.']};
    const c=C[mode];$('drCap').innerHTML='<div class="t">'+(mode==='lora'?'LoRA':'DoRA')+', step '+(i+1)+' of '+NS+'</div>'+(i===0?c[0]:i<NS-1?c[1]:c[2]);
  }
  const A=RD.anim({card:'dr',ctl:'drCtl',n:NS,draw,ms:1100,label:'Step of the DoRA animation'});
  $('drM').addEventListener('click',e=>{const b=e.target.closest('button[data-m]');if(!b)return;mode=b.dataset.m;
    $('drM').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));A.reset(NS);A.play()});
  addEventListener('resize',()=>A.redraw());
})();
