// ---- Reading: small drawing helpers shared by this page's static figures (window.SV) ----
window.SV=(function(){
  const esc=RD.esc;
  // greedy word wrap for SVG text: about 0.56 em per character in the sans font, 0.62 em in monospace
  function wrap(s,w,fs,mono){const per=Math.max(6,Math.floor(w/((fs||11)*(mono?0.62:0.56))));const out=[];let line='';
    String(s).split(' ').forEach(word=>{if(!line)line=word;else if((line+' '+word).length<=per)line+=' '+word;else{out.push(line);line=word}});if(line)out.push(line);return out}
  function lines(x,y,arr,o){o=o||{};const lh=o.lh||Math.round((o.fs||11)*1.35);return arr.map((l,i)=>'<text x="'+x+'" y="'+(y+i*lh)+'" font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+(o.mono?' font-family="ui-monospace,Menlo,monospace"':'')+(o.a?' text-anchor="'+o.a+'"':'')+'>'+esc(l)+'</text>').join('')}
  const marker=id=>'<defs><marker id="'+id+'" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L8,4L0,8z" fill="var(--c2)"/></marker></defs>';
  // mini schema: tables [{n, c:[[name, tag]], note}] and links [[fromT, fromCol, toT, toCol]]; horizontal when wide, stacked when narrow
  const TAGC=t=>t.indexOf('PK')===0?'var(--acc)':t.indexOf('FK')>=0?'var(--c2)':t?'var(--c4)':'var(--ink)';
  function schema(el,T,L,o){o=o||{};const W=RD.width(el),narrow=W<560,rh=19,hh=24,gap=narrow?14:Math.max(26,Math.min(60,W*0.05));
    const n=T.length,bw=narrow?Math.min(W-46,300):Math.floor((W-12-gap*(n-1))/n),pos=[];let y=4,maxY=0;
    const mk='shm'+(o.id||'');
    T.forEach((t,i)=>{const nl=t.note?wrap(t.note,bw-14,11):[];const h=hh+rh*t.c.length+6+(nl.length?nl.length*15+4:0);
      if(narrow){pos[i]={x:0,y,w:bw,h,nl};y+=h+gap}else pos[i]={x:i*(bw+gap),y:4,w:bw,h,nl};maxY=Math.max(maxY,pos[i].y+h)});
    let s=marker(mk);
    T.forEach((t,i)=>{const p=pos[i];
      s+='<rect x="'+p.x+'" y="'+p.y+'" width="'+p.w+'" height="'+p.h+'" rx="7" fill="var(--bg)" stroke="'+(t.hi?'var(--acc)':'var(--line)')+'"'+(t.hi?' stroke-width="1.6"':'')+'/>';
      s+='<rect x="'+p.x+'" y="'+p.y+'" width="'+p.w+'" height="'+hh+'" rx="7" fill="var(--acc2)"/>';
      s+=RD.t(p.x+8,p.y+16,esc(t.n),{fs:12,w:600});if(t.kind)s+=RD.t(p.x+p.w-6,p.y+16,esc(t.kind),{fs:10.5,a:'end',fill:'var(--mute)'});
      t.c.forEach((c,k)=>{const yy=p.y+hh+rh*k+14;
        s+='<text x="'+(p.x+8)+'" y="'+yy+'" font-size="11.5" font-family="ui-monospace,Menlo,monospace" fill="'+TAGC(c[1]||'')+'"'+(c[1]?' font-weight="600"':'')+'>'+esc(c[0])+'</text>';
        if(c[1])s+=RD.t(p.x+p.w-6,yy,esc(c[1]),{fs:10.5,a:'end',fill:'var(--mute)'})});
      if(p.nl.length)s+=lines(p.x+8,p.y+hh+rh*t.c.length+16,p.nl,{fs:11,fill:'var(--acc)',lh:15});
    });
    (L||[]).forEach(([a,ca,b,cb])=>{const pa=pos[a],pb=pos[b];const ya=pa.y+hh+rh*ca+10,yb=pb.y+(cb<0?12:hh+rh*cb+10);let d;
      if(a===b){const x1=pa.x>20?pa.x:pa.x+pa.w,dx=pa.x>20?-20:20;d='M'+x1+','+ya+' C'+(x1+dx)+','+ya+' '+(x1+dx)+','+yb+' '+x1+','+yb}
      else if(narrow){const x1=pa.x+pa.w,x2=pb.x+pb.w,bx=Math.max(x1,x2)+24+Math.abs(a-b)*4;d='M'+x1+','+ya+' C'+bx+','+ya+' '+bx+','+yb+' '+x2+','+yb}
      else if(pa.x<pb.x){const x1=pa.x+pa.w,x2=pb.x;d='M'+x1+','+ya+' C'+((x1+x2)/2)+','+ya+' '+((x1+x2)/2)+','+yb+' '+x2+','+yb}
      else{const x1=pa.x,x2=pb.x+pb.w;d='M'+x1+','+ya+' C'+((x1+x2)/2)+','+ya+' '+((x1+x2)/2)+','+yb+' '+x2+','+yb}
      s+='<path d="'+d+'" fill="none" stroke="var(--c2)" stroke-width="1.4" marker-end="url(#'+mk+')" opacity=".9"/>'});
    el.innerHTML=RD.svg(W,maxY+6,s,o.label||'Schema diagram');
  }
  return {wrap,lines,marker,schema};
})();
