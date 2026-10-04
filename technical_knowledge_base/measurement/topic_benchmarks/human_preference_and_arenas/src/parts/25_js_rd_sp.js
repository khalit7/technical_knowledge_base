// ---- Reading: score intervals and rank spreads, top 15 of the 2 Oct 2026 text board (ids rd-sp-) ----
(function(){
  const rows=window.HPD.board.cats.overall.rows.slice(0,15);let lens='sc';
  function draw(){
    const el=document.getElementById('rd-sp-svg');const W=Math.max(300,Math.min(860,RD.width(el)));
    const rs=rows.filter(r=>r[lens]).slice().sort((a,b)=>b[lens][0]-a[lens][0]);
    const narrow=W<520,L=narrow?118:170,mid=narrow?W*0.66:W*0.62,R2=W-10,rowH=21,top=24,H=top+rowH*rs.length+26;
    let lo=Math.min(...rs.map(r=>r[lens][1])),hi=Math.max(...rs.map(r=>r[lens][2]));lo=Math.floor(lo/10)*10;hi=Math.ceil(hi/10)*10;
    const x=v=>L+(v-lo)/(hi-lo)*(mid-10-L);const maxR=Math.max(...rs.map(r=>r.sp[lens][1]));const xr=k=>mid+8+(k-1)/(maxR-1||1)*(R2-mid-8);
    let b='';
    for(let t=lo;t<=hi;t+=10){b+='<line x1="'+x(t)+'" x2="'+x(t)+'" y1="'+(top-4)+'" y2="'+(H-22)+'" stroke="var(--line)"/>';if((t-lo)%20===0)b+=RD.t(x(t),H-8,t,{a:'middle',fs:10,fill:'var(--mute)'})}
    [1,5,10,15,20,25,30].filter(k=>k<=maxR).forEach(k=>{b+='<line x1="'+xr(k)+'" x2="'+xr(k)+'" y1="'+(top-4)+'" y2="'+(H-22)+'" stroke="var(--line)"/>'+RD.t(xr(k),H-8,k,{a:'middle',fs:10,fill:'var(--mute)'})});
    b+=RD.t(L,13,'score',{fs:10.5,fill:'var(--mute)'})+RD.t(mid+8,13,'rank spread',{fs:10.5,fill:'var(--mute)'});
    rs.forEach((r,k)=>{const y=top+k*rowH+rowH/2,v=r[lens],sp=r.sp[lens];
      const nm=r.m.length>(narrow?17:26)?r.m.slice(0,narrow?16:25)+'…':r.m;
      b+=RD.t(L-6,y+4,(k+1)+'. '+RD.esc(nm),{a:'end',fs:narrow?10:11});
      b+='<line x1="'+x(v[1])+'" x2="'+x(v[2])+'" y1="'+y+'" y2="'+y+'" stroke="var(--c1)" stroke-width="2"/><circle cx="'+x(v[0])+'" cy="'+y+'" r="3.5" fill="var(--c1)"/>';
      b+='<line x1="'+xr(sp[0])+'" x2="'+xr(sp[1])+'" y1="'+y+'" y2="'+y+'" stroke="var(--c4)" stroke-width="5" stroke-linecap="round"/>';
    });
    el.innerHTML=RD.svg(W,H,b,'Scores, intervals and rank spreads for the top 15 models');
  }
  RD.seg(document.getElementById('rd-sp-seg'),m=>{lens=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
