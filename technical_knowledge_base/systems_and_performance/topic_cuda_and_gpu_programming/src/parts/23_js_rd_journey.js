// ---- Reading 1: one call from Python to the GPU, eager (two kernels) against torch.compile (one fused kernel) ----
(function(){
  const box=document.getElementById('rd-jr-fig');if(!box||!window.RD)return;
  const MB=268435456; // one 8192 x 8192 float32 matrix
  const BW_H100=3.35e12, BW_M1=(window.RDC&&RDC.softmax.gbps_median||166)*1e9;
  // events: lane c (CPU) or g (GPU); t0..t1 in time units (0..10); s = first step shown; rw = matrices moved
  const M={
    eager:{n:4,
      ev:[{c:'c',t0:0,t1:1,s:0,l:'dispatch *'},{c:'c',t0:1,t1:1.5,s:1,l:'launch'},{c:'g',t0:1.5,t1:4.5,s:1,l:'multiply kernel',rw:2,col:'var(--c2)'},
          {c:'c',t0:1.6,t1:2.6,s:2,l:'dispatch softmax'},{c:'c',t0:2.6,t1:3.1,s:2,l:'launch'},{c:'g',t0:4.6,t1:7.6,s:2,l:'softmax kernel',rw:2,col:'var(--c1)'},
          {c:'c',t0:3.2,t1:7.6,s:3,l:'wait (sync)',wait:1}],launch:[0,1,2,2]},
    comp:{n:4,
      ev:[{c:'c',t0:0,t1:1.4,s:0,l:'capture, compile (once)'},{c:'c',t0:1.4,t1:1.9,s:1,l:'launch'},{c:'g',t0:1.9,t1:4.9,s:1,l:'fused scale + softmax',rw:2,col:'var(--c3)'},
          {c:'c',t0:2,t1:4.9,s:2,l:'wait (sync)',wait:1}],launch:[0,1,1,1]}
  };
  let mode='eager',an=null;
  function rwAt(i){return M[mode].ev.filter(e=>e.s<=i&&e.rw).reduce((a,e)=>a+e.rw,0)}
  function draw(i){
    const W=RD.width(box),H=150,x0=46,tx=t=>x0+(W-x0-8)*t/10;
    let s='';
    s+=RD.t(4,38,'CPU',{fs:11,w:600})+RD.t(4,88,'GPU',{fs:11,w:600})+RD.t(4,136,'memory',{fs:10,fill:'var(--mute)'});
    s+='<line x1="'+x0+'" y1="50" x2="'+(W-8)+'" y2="50" stroke="var(--line)"/><line x1="'+x0+'" y1="100" x2="'+(W-8)+'" y2="100" stroke="var(--line)"/>';
    s+='<rect x="'+x0+'" y="124" width="'+(W-x0-8)+'" height="18" rx="3" fill="var(--soft)" stroke="var(--line)"/>';
    M[mode].ev.forEach(e=>{if(e.s>i)return;const y=e.c==='c'?24:74,x=tx(e.t0),w=Math.max(4,tx(e.t1)-tx(e.t0));
      const f=e.wait?'var(--dim)':(e.col||'var(--acc2)');
      s+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+w.toFixed(1)+'" height="22" rx="4" fill="'+f+'"'+(e.s===i?' stroke="var(--ink)" stroke-width="1.5"':'')+'/>';
      const lab=e.l,fits=lab.length*5.6<w-4;
      if(fits)s+=RD.t(x+w/2,y+15,lab,{a:'middle',fs:10.5,fill:e.c==='g'?'var(--bg)':'var(--ink)'});
      else if(e.s===i){const lx=Math.min(Math.max(x,x0),W-8-lab.length*5.6);s+=RD.t(lx,y+(e.c==='c'?34:-4),lab,{fs:10,fill:'var(--ink)',w:600})}
      if(e.rw){const xm=x+w/2;s+='<line x1="'+(xm-8)+'" y1="124" x2="'+(xm-8)+'" y2="98" stroke="'+e.col+'" stroke-width="2" marker-end="url(#rdjrA)"/>'+
        '<line x1="'+(xm+8)+'" y1="98" x2="'+(xm+8)+'" y2="124" stroke="'+e.col+'" stroke-width="2" marker-end="url(#rdjrA)"/>'+RD.t(xm+14,118,'read, write',{fs:9.5,fill:'var(--mute)'})}
    });
    const defs='<defs><marker id="rdjrA" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L8,4L0,8z" fill="var(--mute)"/></marker></defs>';
    box.innerHTML=RD.svg(W,H,defs+s,'Timeline of CPU and GPU work for '+(mode==='eager'?'eager':'compiled')+' softmax');
    const rw=rwAt(i),by=rw*MB;
    document.getElementById('rd-jr-cnt').innerHTML=RD.stat('Kernel launches',M[mode].launch[i])+RD.stat('Memory traffic',(by/1048576).toFixed(0)+' MiB',rw+' passes of 256 MiB')+
      RD.stat('At H100 bandwidth',(by/BW_H100*1e3).toFixed(2)+' ms','bytes / 3.35 TB/s')+RD.stat('At M1 Pro softmax rate',(by/BW_M1*1e3).toFixed(1)+' ms','bytes / '+(BW_M1/1e9).toFixed(0)+' GB/s measured');
  }
  // the step list on the left explains each step; the other version's list is hidden
  const LI={eager:'sx-jr-eager',comp:'sx-jr-comp'};
  const showList=()=>Object.keys(LI).forEach(k=>{const l=document.getElementById(LI[k]);if(l){l.hidden=k!==mode;l.previousElementSibling.hidden=k!==mode}});
  RD.seg(document.getElementById('rd-jr-mode'),m=>{mode=m;showList();an.reset(M[mode].n,LI[mode])});
  showList();
  an=RD.anim({card:'rd-jr-card',ctl:'rd-jr-ctl',n:4,draw,ms:4200,label:'Timeline step',list:LI.eager});
  RD.onResize(()=>an.redraw());
})();
