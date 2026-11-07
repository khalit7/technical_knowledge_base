// ---- Reading tab: the shallow/deep copy stepper (section 2, Fig. 3).
// Adapted from the language page's src/pa/tpl/35_js_pa_read.js (2026-10-26). 2026-11-07: the steps are explained by the ol.sx lists on the left
// (sx-names-shallow, sx-names-deep), which replace the per-step caption; RD.anim plays it once in view; a mode switch swaps the list and replays.
// The eager/lazy pipeline stepper of section 3 became the 3D stage in 31_js_sc_pipe.js.
(function(){
  const $=id=>document.getElementById(id), esc=RD.esc;
  if(!window.PA)return;
  // ---------- 1. names -> objects, shallow vs deep copy ----------
  (function(){
    let mode='shallow';
    const card=$('dm-names-card');if(!card)return;
    function draw(i){
      const steps=PA.names[mode],st=steps[i],prev=i>0?steps[i-1]:null;
      const W=Math.min(640,RD.width($('dm-names-svg'))),cw=Math.max(22,Math.min(30,(W-150)/7)),bh=24;
      const objs=st.objs,refd=new Set();objs.forEach(o=>o.items.forEach(x=>{if(/^L\d+$/.test(x))refd.add(x)}));
      const c1=objs.filter(o=>!refd.has(o.id)),c2=objs.filter(o=>refd.has(o.id));
      const x0=70,x2=Math.max(x0+3*cw+40,Math.round(W*0.56)),pos={};
      c1.forEach((o,k)=>pos[o.id]={x:x0+14,y:56+k*58});c2.forEach((o,k)=>pos[o.id]={x:x2,y:12+k*58});
      const names=['row','grid','copy1'],ny={row:12,grid:56,copy1:114};
      names.forEach(n=>{if(n!=='row'&&st.names[n]&&pos[st.names[n]].x===x0+14)ny[n]=pos[st.names[n]].y});
      const H=Math.max(176,Math.max(56+c1.length*58,12+c2.length*58));
      let b='<defs><marker id="dm-arn" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L8,4L0,8z" fill="var(--acc)"/></marker></defs>';
      const prevItems={};if(prev)prev.objs.forEach(o=>prevItems[o.id]=o.items.join(','));
      objs.forEach(o=>{const p=pos[o.id],n=o.items.length,chg=prev&&(prevItems[o.id]===undefined||prevItems[o.id]!==o.items.join(','));
        b+='<rect x="'+p.x+'" y="'+p.y+'" width="'+(Math.max(1,n)*cw)+'" height="'+bh+'" rx="3" fill="'+(chg?'var(--hl)':'var(--soft)')+'" stroke="var(--mute)"/>';
        b+=RD.t(p.x,p.y-3,o.id+' (list)',{fs:11.5,fill:'var(--mute)'});
        o.items.forEach((it,k)=>{const cx=p.x+k*cw;if(k)b+='<line x1="'+cx+'" y1="'+p.y+'" x2="'+cx+'" y2="'+(p.y+bh)+'" stroke="var(--mute)"/>';
          if(/^L\d+$/.test(it)){const q=pos[it],sx=cx+cw/2,sy=p.y+bh/2;b+='<circle cx="'+sx+'" cy="'+sy+'" r="3" fill="var(--acc)"/>';
            const tx=q.x,ty=q.y+bh/2;b+='<path d="M'+sx+','+sy+' C'+(sx+40)+','+(sy+30)+' '+(tx-50)+','+ty+' '+(tx-2)+','+ty+'" fill="none" stroke="var(--acc)" stroke-width="1.3" marker-end="url(#dm-arn)"/>'}
          else b+=RD.t(cx+cw/2,p.y+16,esc(it),{a:'middle',fs:12})});
      });
      names.forEach(n=>{if(!(n in st.names))return;const y=ny[n],t=pos[st.names[n]];
        b+='<rect x="2" y="'+y+'" width="52" height="'+bh+'" rx="12" fill="var(--acc2)" stroke="var(--acc)"/>'+RD.t(28,y+16,n,{a:'middle',fs:12,w:600});
        const ty=t.y+bh/2;b+='<path d="M54,'+(y+bh/2)+' C'+(70)+','+(y+bh/2)+' '+(t.x-30)+','+ty+' '+(t.x-2)+','+ty+'" fill="none" stroke="var(--ink)" stroke-width="1.2" marker-end="url(#dm-arn)"/>'});
      $('dm-names-svg').innerHTML=RD.svg(W,H,b,'Names and list objects after: '+st.line);
      const g=st.names.grid&&objs.find(o=>o.id===st.names.grid),c=st.names.copy1&&objs.find(o=>o.id===st.names.copy1);
      const shared=g&&c?c.items.filter(x=>g.items.includes(x)&&/^L/.test(x)).length:0;
      $('dm-names-cnt').innerHTML='<span>list objects alive: <b>'+objs.length+'</b></span><span>slots of copy1 pointing into the original: <b>'+(c?shared+' of '+c.items.length:'n/a')+'</b></span><span>copy1 prints: <b>'+(c?esc(JSON.stringify(c.items.map(x=>/^L/.test(x)?objs.find(o=>o.id===x).items.map(Number):Number(x))).replace(/,/g,', ')):'n/a')+'</b></span>';
    }
    const an=RD.anim({card:'dm-names-card',ctl:'dm-names-ctl',n:5,draw,ms:4200,label:'Line of the program',list:'sx-names-shallow'});
    RD.seg($('dm-names-mode'),m=>{mode=m;['shallow','deep'].forEach(x=>$('sx-names-'+x).hidden=x!==m);an.reset(PA.names[m].length,'sx-names-'+m)});
    RD.onResize(()=>an.redraw());
  })();


})();
