// ---- Reading: SVG bar helper shared by the Reading figures (drawn at the measured width, redrawn on resize) ----
window.HBV=(function(){
  const esc=RD.esc, draws=[];
  function redraw(){draws.forEach(f=>{try{f()}catch(e){}})}
  RD.onRender(redraw);RD.onResize(redraw);
  // rows: [{head}] or [{label, segs:[{v,c,t}], right}]; opt: {max, legend:[[colour,text]], label}
  function hbars(el,rows,opt){
    if(!el)return;opt=opt||{};
    const draw=()=>{
      const w=RD.width(el), narrow=w<560, R=narrow?62:74, L=narrow?0:Math.min(270,Math.round(w*0.4));
      const max=opt.max||Math.max(...rows.filter(r=>r.segs).map(r=>r.segs.reduce((s,x)=>s+x.v,0)));
      let y=4,g='';
      rows.forEach(r=>{
        if(r.head){g+=RD.t(0,y+13,esc(r.head),{fs:12,w:600,fill:'var(--ink)'});y+=20;return}
        if(narrow){g+=RD.t(0,y+12,esc(r.label),{fs:11.5,fill:'var(--ink)'});y+=16}
        else g+=RD.t(0,y+12,esc(r.label),{fs:12,fill:'var(--ink)'});
        const x0=L+(narrow?0:8), bw=w-x0-R;
        g+='<rect x="'+x0+'" y="'+(y+2)+'" width="'+bw+'" height="13" rx="3" fill="var(--soft)" stroke="var(--line)"/>';
        let x=x0;r.segs.forEach(s=>{const sw=bw*s.v/max;if(sw>0)g+='<rect x="'+x.toFixed(1)+'" y="'+(y+2)+'" width="'+sw.toFixed(1)+'" height="13" rx="2" fill="'+s.c+'"><title>'+esc(s.t||'')+'</title></rect>';x+=sw});
        g+=RD.t(w-2,y+13,esc(r.right),{a:'end',fs:12,fill:'var(--ink)'});
        y+=narrow?22:21;
      });
      el.innerHTML=RD.svg(w,y+2,g,opt.label||'Bar chart')+
        (opt.legend?'<div class="small mute" style="margin-top:4px">'+opt.legend.map(l=>'<span style="color:'+l[0]+'">&#9632;</span> '+esc(l[1])).join(' &nbsp; ')+'</div>':'');
    };
    draws.push(draw);draw();
  }
  return {hbars,draws,redraw};
})();
