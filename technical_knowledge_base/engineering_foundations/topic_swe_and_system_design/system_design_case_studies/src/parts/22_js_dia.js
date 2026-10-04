// ---- Build-up diagram: one design grows step by step, naive design first, then each bottleneck found (red) and fixed (green) ----
// Spec: {lanes:[names], nodes:[{id,l,s,c(lane),r(row),in(step it appears),out(step it goes)}], edges:[{a,b,in,out,d(dashed)}],
//        steps:[{k:'naive'|'bad'|'fix', t, p, hot:[ids]}], counters:[{l, v:[value per step or null], fmt}]}
// Counters show the naive design's value (struck through) beside the current one, so every step is a before/after on the same load.
window.DIA=(function(){
  const NS=28;
  function layout(sp,W){
    const narrow=W<600, L=sp.lanes.length;
    const rows=Math.max(...sp.nodes.map(n=>n.r))+1;
    let pos={},H,bw,bh=46;
    if(!narrow){
      const gap=14, lw=(W-gap*(L-1))/L; bw=Math.min(lw-6,170);
      H=NS+rows*(bh+18)+8;
      sp.nodes.forEach(n=>{const x=n.c*(lw+gap)+(lw-bw)/2, y=NS+n.r*(bh+18);pos[n.id]={x,y,w:bw,h:bh}});
      return {pos,H,narrow,lanePos:sp.lanes.map((_,i)=>({x:i*(lw+gap),w:lw}))};
    }
    // narrow: lanes stacked vertically, rows side by side
    const per=[];sp.lanes.forEach((_,i)=>per[i]=Math.max(1,...sp.nodes.filter(n=>n.c===i).map(n=>n.r+1)));
    const cols=Math.max(...per); const gap=8,G=14; bw=(W-G-gap*(cols-1))/cols; bh=50;
    let y=0;const lanePos=[];
    sp.lanes.forEach((_,i)=>{lanePos.push({y,h:18+bh+10});
      sp.nodes.filter(n=>n.c===i).forEach(n=>{pos[n.id]={x:G+n.r*(bw+gap),y:y+18,w:bw,h:bh}});y+=18+bh+12});
    return {pos,H:y,narrow,lanePos};
  }
  function wrap(s,maxc){const w=String(s).split(' ');const out=[];let cur='';
    w.forEach(x=>{if((cur+' '+x).trim().length>maxc&&cur){out.push(cur);cur=x}else cur=(cur+' '+x).trim()});if(cur)out.push(cur);return out.slice(0,2)}
  function edgePts(a,b){const ax=a.x+a.w/2,ay=a.y+a.h/2,bx=b.x+b.w/2,by=b.y+b.h/2;
    function clip(cx,cy,w,h,dx,dy){const sx=dx?(w/2)/Math.abs(dx):1e9,sy=dy?(h/2)/Math.abs(dy):1e9;const s=Math.min(sx,sy);return [cx+dx*s,cy+dy*s]}
    const dx=bx-ax,dy=by-ay;const p=clip(ax,ay,a.w+6,a.h+6,dx,dy),q=clip(bx,by,b.w+8,b.h+8,-dx,-dy);return [p[0],p[1],q[0],q[1]]}
  function draw(sp,host,i,uid){
    const W=RD.width(host),Ly=layout(sp,W),st=sp.steps[i],hot=new Set(st.hot||[]);
    const vis=n=>n.in<=i&&(n.out===undefined||i<n.out);
    const isNew=n=>n.in===i&&i>0&&st.k==='fix';
    let s='<svg viewBox="0 0 '+W+' '+Ly.H+'" width="'+W+'" height="'+Ly.H+'" role="img" aria-label="'+RD.esc(st.t)+'">';
    s+='<defs><marker id="ah'+uid+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
    sp.lanes.forEach((ln,k)=>{const p=Ly.lanePos[k];
      if(!Ly.narrow)s+='<rect x="'+p.x+'" y="0" width="'+p.w+'" height="'+Ly.H+'" rx="8" fill="var(--soft)"/><text x="'+(p.x+p.w/2)+'" y="16" text-anchor="middle" font-size="11" fill="var(--mute)">'+RD.esc(ln)+'</text>';
      else s+='<rect x="0" y="'+p.y+'" width="'+W+'" height="'+(p.h)+'" rx="8" fill="var(--soft)"/><text x="16" y="'+(p.y+13)+'" font-size="11" fill="var(--mute)">'+RD.esc(ln)+'</text>'});
    const byId={};sp.nodes.forEach(n=>byId[n.id]=n);
    (sp.edges||[]).forEach(e=>{const a=byId[e.a],b=byId[e.b];if(!a||!b||!vis(a)||!vis(b))return;if(e.in!==undefined&&e.in>i)return;if(e.out!==undefined&&i>=e.out)return;
      const A=Ly.pos[a.id],B=Ly.pos[b.id],dash=(e.d?' stroke-dasharray="4 3"':'');
      if(Math.abs(a.c-b.c)>1){
        // an edge that skips a lane is routed around the boxes in between: below the row (wide) or down the left gutter (narrow)
        let d;
        if(!Ly.narrow){const gy=Math.max(A.y+A.h,B.y+B.h)+8,ax=A.x+A.w/2,bx=B.x+B.w/2;d='M'+ax.toFixed(1)+','+(A.y+A.h)+'V'+gy+'H'+bx.toFixed(1)+'V'+(B.y+B.h+5);}
        else{const gx=5,ty=B.y-5;d='M'+A.x.toFixed(1)+','+(A.y+A.h/2)+'H'+gx+'V'+ty+'H'+(B.x+Math.min(22,B.w/4)).toFixed(1)+'V'+(B.y-1);}
        s+='<path d="'+d+'" fill="none" stroke="var(--mute)" stroke-width="1.3"'+dash+' marker-end="url(#ah'+uid+')"/>';return}
      const P=edgePts(A,B);
      s+='<line x1="'+P[0].toFixed(1)+'" y1="'+P[1].toFixed(1)+'" x2="'+P[2].toFixed(1)+'" y2="'+P[3].toFixed(1)+'" stroke="var(--mute)" stroke-width="1.3"'+dash+' marker-end="url(#ah'+uid+')"/>'});
    sp.nodes.forEach(n=>{if(!vis(n))return;const p=Ly.pos[n.id];const h=hot.has(n.id),nw=isNew(n);
      const stroke=h?'var(--bad)':nw?'var(--good)':'var(--line)',fill=h?'var(--bad2)':nw?'var(--good2)':'var(--bg)';
      const r=n.kind==='store'?2:8;
      s+='<rect x="'+p.x.toFixed(1)+'" y="'+p.y+'" width="'+p.w.toFixed(1)+'" height="'+p.h+'" rx="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+(h||nw?2.2:1.2)+'"/>';
      if(n.kind==='store')s+='<line x1="'+p.x.toFixed(1)+'" y1="'+(p.y+7)+'" x2="'+(p.x+p.w).toFixed(1)+'" y2="'+(p.y+7)+'" stroke="'+stroke+'" stroke-width="1"/>';
      const mc=Math.max(8,Math.floor(p.w/6.4));const L1=wrap(n.l,mc);const sub=n.s?wrap(n.s,Math.floor(p.w/5.4)).slice(0,3-L1.length):[];
      const lines=L1.length+sub.length;let y=p.y+p.h/2-(lines-1)*6.2+4;
      L1.forEach(t=>{s+='<text x="'+(p.x+p.w/2).toFixed(1)+'" y="'+y.toFixed(1)+'" text-anchor="middle" font-size="11.5" font-weight="600">'+RD.esc(t)+'</text>';y+=12.5});
      sub.forEach(t=>{s+='<text x="'+(p.x+p.w/2).toFixed(1)+'" y="'+y.toFixed(1)+'" text-anchor="middle" font-size="10" fill="var(--mute)">'+RD.esc(t)+'</text>';y+=12});
    });
    s+='</svg>';host.innerHTML=s;
  }
  function mount(id,sp){
    const root=document.getElementById(id);
    root.innerHTML='<div class="leg"><span style="--sw:var(--bad)">bottleneck found</span><span style="--sw:var(--good)">added to fix it</span><span style="--sw:var(--line)">already there</span></div>'+
      '<div class="rd-svg" id="'+id+'-svg"></div><div class="an-cap" id="'+id+'-cap"></div><div class="an-cnt" id="'+id+'-cnt"></div><div class="an-ctl" id="'+id+'-ctl"></div>';
    const host=document.getElementById(id+'-svg'),cap=document.getElementById(id+'-cap'),cnt=document.getElementById(id+'-cnt');
    const lab={naive:'The naive design',bad:'Bottleneck',fix:'Fix'};
    function show(i){const st=sp.steps[i];draw(sp,host,i,id);
      cap.className='an-cap '+(st.k==='bad'?'bad':st.k==='fix'?'good':'');
      cap.innerHTML='<div class="t">Step '+(i+1)+' of '+sp.steps.length+'. '+lab[st.k]+': '+st.t+'</div><p>'+st.p+'</p>';
      cnt.innerHTML=(sp.counters||[]).map(c=>{const v0=c.v[0],v=c.v[i];const f=c.fmt||(x=>RD.fmt(x));
        const changed=i>0&&v!==v0;
        return '<div class="stat"><div class="k">'+c.l+'</div><div class="v">'+(changed?'<s title="naive design">'+f(v0)+'</s>':'')+f(v)+'</div>'+(c.d?'<div class="d">'+c.d+'</div>':'')+'</div>'}).join('');
    }
    const a=RD.anim({card:id,ctl:id+'-ctl',n:sp.steps.length,ms:4200,draw:show,label:'Design step'});
    RD.onResize(()=>{if(root.offsetParent)a.redraw()});
    return a;
  }
  return {mount};
})();
