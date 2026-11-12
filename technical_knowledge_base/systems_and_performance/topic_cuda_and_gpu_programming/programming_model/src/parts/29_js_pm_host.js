// ---- Reading s1 and s6: the host program as a stepper, CPU and GPU timelines (normal run; a kernel that faults); the steps are explained by #sx-hd and #sx-he ----
(function(){
    // segments: [row 'c'|'g', start, end, kind, label]; kinds: busy, wait, copy, kern, err
  const BASE=[
    {seg:[],mem:{hx:1,hy:0,dx:-1,dy:-1}},
    {seg:[['c',0,0.6,'busy','malloc']],mem:{hx:1,hy:0,dx:0,dy:0}},
    {seg:[['c',0.6,1.6,'wait','wait'],['g',0.6,1.6,'copy','copy in']],mem:{hx:1,hy:0,dx:1,dy:0},arrow:'in'},
    {seg:[['c',1.6,1.9,'busy','launch']],mem:{hx:1,hy:0,dx:1,dy:0},q:1}];
  const OK=BASE.concat([
    {seg:[['c',1.9,2.4,'busy','next lines'],['g',1.9,3.6,'kern','kernel: 4,096 blocks']],mem:{hx:1,hy:0,dx:1,dy:1}},
    {seg:[['c',2.4,4.6,'wait','wait'],['g',3.6,4.6,'copy','copy out']],mem:{hx:1,hy:1,dx:1,dy:1},arrow:'out'},
    {seg:[['c',4.6,5.4,'busy','check, free']],mem:{hx:1,hy:1,dx:-1,dy:-1}}]);
  const BAD=BASE.concat([
    {seg:[['c',1.9,2.4,'busy','cudaSuccess'],['g',1.9,2.9,'err','kernel faults']],mem:{hx:1,hy:0,dx:1,dy:0}},
    {seg:[['c',2.4,2.9,'wait','wait'],['c',2.9,3.3,'err','700']],mem:{hx:1,hy:0,dx:1,dy:0}},
    {seg:[['c',3.3,4.6,'err','every call: 700']],mem:{hx:1,hy:0,dx:1,dy:0}}]);
  const COL={busy:'var(--c4)',copy:'var(--c6)',kern:'var(--c3)',err:'var(--bad)'};
  function make(pre,S,start){
    const fig=document.getElementById(pre+'-fig');if(!fig)return;
    function draw(i){
      const W=RD.width(fig),T=RD.t,st=S[i];let b='';
      b+='<defs><pattern id="'+pre+'-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" style="fill:var(--soft)"></rect><line x1="0" y1="0" x2="0" y2="6" style="stroke:var(--mute);stroke-width:2"></line></pattern></defs>';
      // memory: CPU on the left, GPU on the right
      const mw=(W-30)/2,my=4,mh=58,gx=mw+26;
      b+='<rect x="2" y="'+my+'" width="'+mw.toFixed(1)+'" height="'+mh+'" rx="6" style="fill:none;stroke:var(--line)"></rect>'+T(10,my+16,'CPU memory',{fs:11.5,w:600});
      b+='<rect x="'+gx.toFixed(1)+'" y="'+my+'" width="'+mw.toFixed(1)+'" height="'+mh+'" rx="6" style="fill:none;stroke:var(--line)"></rect>'+T(gx+8,my+16,'GPU memory',{fs:11.5,w:600});
      const chip=(x,nm,v)=>{const cw=Math.min(76,(mw-24)/2);if(v<0)return '<rect x="'+x.toFixed(1)+'" y="'+(my+24)+'" width="'+cw.toFixed(1)+'" height="24" rx="4" style="fill:none;stroke:var(--line);stroke-dasharray:3 3"></rect>';
        return '<rect x="'+x.toFixed(1)+'" y="'+(my+24)+'" width="'+cw.toFixed(1)+'" height="24" rx="4" style="fill:'+(v?'var(--acc2)':'var(--soft)')+';stroke:var(--line)"></rect>'+T(x+cw/2,my+40,nm+(v?'':' (empty)'),{a:'middle',fs:11,fill:'var(--ink)'})};
      const cw=Math.min(76,(mw-24)/2);
      b+=chip(10,'hx',st.mem.hx)+chip(18+cw,'hy',st.mem.hy)+chip(gx+8,'dx',st.mem.dx)+chip(gx+16+cw,'dy',st.mem.dy);
      if(st.arrow){const y=my+mh/2+6,x1=2+mw,x2=gx,dir=st.arrow==='in';
        b+='<line x1="'+(x1+2)+'" y1="'+y+'" x2="'+(x2-2)+'" y2="'+y+'" style="stroke:var(--c6);stroke-width:2.5"></line>';
        b+=dir?'<path d="M'+(x2-2)+' '+y+' l-7 -5 v10 z" style="fill:var(--c6)"></path>':'<path d="M'+(x1+2)+' '+y+' l7 -5 v10 z" style="fill:var(--c6)"></path>'}
      // timelines
      const ty=my+mh+20,lx=34,tw=W-lx-6,u=tw/5.6,rh=24;
      b+=T(2,ty+16,'CPU',{fs:11.5,w:600})+T(2,ty+rh+22,'GPU',{fs:11.5,w:600});
      b+='<line x1="'+lx+'" y1="'+(ty+2*rh+14)+'" x2="'+(lx+tw)+'" y2="'+(ty+2*rh+14)+'" style="stroke:var(--line)"></line>';
      b+=T(lx+tw,ty+2*rh+27,'time (schematic) →',{a:'end',fs:11,fill:'var(--mute)'});
      if(st.q)b+=T(lx+1.95*u,ty+rh+22,'queued: scale',{fs:11,fill:'var(--mute)'});
      for(let k=0;k<=i;k++)S[k].seg.forEach(sg=>{const y=sg[0]==='c'?ty:ty+rh+6,x=lx+sg[1]*u,w=(sg[2]-sg[1])*u,cur=k===i;
        const fill=sg[3]==='wait'?'url(#'+pre+'-hatch)':COL[sg[3]];
        b+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+Math.max(2,w-1).toFixed(1)+'" height="'+rh+'" rx="3" style="fill:'+fill+';stroke:'+(cur?'var(--ink)':'var(--line)')+';stroke-width:'+(cur?1.5:1)+';opacity:'+(cur?1:0.75)+'"></rect>';
        if(sg[4].length*6.4+6<w&&sg[3]!=='wait')b+=T(x+4,y+16,sg[4],{fs:11,fill:'var(--bg)',w:600});
        else if(sg[4].length*6.4+6<w)b+=T(x+4,y+16,sg[4],{fs:11,fill:'var(--ink)',w:600})});
      fig.innerHTML=RD.svg(W,ty+2*rh+32,b,'CPU and GPU memory and timelines, step '+(i+1))}
    const A=RD.anim({card:pre+'-card',ctl:pre+'-ctl',list:'sx-'+pre.slice(3),n:S.length,start:start||0,draw,ms:4200,label:'Program step'});
    RD.onResize(()=>A.redraw());
    return S}
  window.PM_HD={ok:make('pm-hd',OK),bad:make('pm-he',BAD,3)}; // checked by the page test: 7 steps each, one per item of #sx-hd and #sx-he
})();
