// ---- Hero: every copy one chat request can hit, outermost first, with hit time and who keeps it correct (static annotated diagram) ----
(function(){
  const box=document.getElementById('rd-hero-svg');if(!box||!window.CA)return;
  const L=CA.layers,P=CA.pg,S=CA.sem;
  const ms=v=>v<0.001?(v*1e6).toFixed(0)+' ns':v<1?v.toFixed(3)+' ms':v.toFixed(1)+' ms';
  // [name, hit time, who keeps it correct, kind: you | sys | src | wrong | exact]
  const WEB=[
    ['Browser cache','0 network','nobody can purge','you'],
    ['CDN edge','about 20 ms','you: purge','you'],
    ['In-process dict',ms(L.dict_ns*1e-6),'you, per process','you'],
    ['Redis or Valkey',ms(P.costs.redis_get.median_ms),'you: delete, TTL','you'],
    ['Postgres buffers',ms(P.warm.second_pass.ms_per_lookup),'Postgres','sys'],
    ['OS page cache',L.pagecache_us.toFixed(2)+' µs','the kernel','sys'],
    ['SSD: the source','102 µs','','src']];
  const LLM=[
    ['Semantic cache','embed '+S.mini.ms_per_query_single.toFixed(1)+' ms','can be wrong (12)','wrong'],
    ['Provider prompt cache','reads billed 0.1×','exact (11)','exact'],
    ['GPU KV cache','skips prefill','exact (10)','exact'],
    ['The model: the source','full prefill','','src']];
  const col={you:'var(--acc)',sys:'var(--line)',src:'var(--mute)',wrong:'var(--bad)',exact:'var(--good)'};
  function node(x,y,w,h,r){
    const dash=r[3]==='src'?' stroke-dasharray="4 3"':'';
    return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="var(--soft)" stroke="'+col[r[3]]+'" stroke-width="'+(r[3]==='you'||r[3]==='wrong'?2:1.2)+'"'+dash+'/>';
  }
  function draw(){
    const W=Math.min(RD.width(box),900);let g='',H;
    if(W>=800){
      const n=WEB.length,gap=12,bw=(W-gap*(n-1))/n,bh=62,y1=26,y2=y1+bh+58;
      const lane=(arr,y,cols)=>{const w=(W-gap*(cols-1))/cols;arr.forEach((r,i)=>{const x=i*(w+gap);
        g+=node(x,y,w,bh,r)+RD.t(x+w/2,y+18,r[0],{a:'middle',fs:11.5,w:600,fill:'var(--ink)'})+RD.t(x+w/2,y+35,r[1],{a:'middle',fs:11,fill:r[3]==='wrong'?'var(--bad)':'var(--ink)'})+
          (r[2]?RD.t(x+w/2,y+52,r[2],{a:'middle',fs:11,fill:'var(--mute)'}):'');
        if(i<arr.length-1)g+='<path d="M'+(x+w+1)+','+(y+bh/2)+' L'+(x+w+gap-2)+','+(y+bh/2)+'" stroke="var(--mute)" stroke-width="1.4" marker-end="url(#hm)"/>'})};
      g+='<defs><marker id="hm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--mute)"/></marker></defs>';
      g+=RD.t(0,14,'Web lane: a miss falls through to the next copy',{fs:11.5,w:600,fill:'var(--ink)'});
      // braces over who invalidates
      const x4=4*(bw+gap)-gap;g+='<line x1="0" x2="'+x4+'" y1="'+(y1+bh+10)+'" y2="'+(y1+bh+10)+'" stroke="var(--acc)" stroke-width="2"/>'+RD.t(x4/2,y1+bh+24,'you invalidate these: sections 3, 4, 7 and 9',{a:'middle',fs:11,fill:'var(--acc)'});
      g+='<line x1="'+(x4+gap)+'" x2="'+(x4+gap+2*bw+gap)+'" y1="'+(y1+bh+10)+'" y2="'+(y1+bh+10)+'" stroke="var(--line)" stroke-width="2"/>'+RD.t(x4+gap+bw+gap/2,y1+bh+24,'kept correct for you',{a:'middle',fs:11,fill:'var(--mute)'});
      lane(WEB,y1,n);
      g+=RD.t(0,y2-12,'LLM lane: the same idea three times; only the first can answer the wrong question',{fs:11.5,w:600,fill:'var(--ink)'});
      lane(LLM,y2,4);H=y2+bh+4;
    }else{
      const rh=46,gap=10;let y=0;
      const lane=(title,arr)=>{g+=RD.t(0,y+13,title,{fs:11.5,w:600,fill:'var(--ink)'});y+=22;
        arr.forEach((r,i)=>{g+=node(0,y,W,rh-gap,r)+RD.t(10,y+15,r[0],{fs:11.5,w:600,fill:'var(--ink)'})+RD.t(W-10,y+15,r[1],{a:'end',fs:11,fill:r[3]==='wrong'?'var(--bad)':'var(--ink)'})+
          (r[2]?RD.t(10,y+30,r[2],{fs:11,fill:r[3]==='you'?'var(--acc)':'var(--mute)'}):'');y+=rh});y+=6};
      lane('Web lane, outermost first: a miss falls through',WEB);
      lane('LLM lane: only the first can be wrong',LLM);H=y;
    }
    box.innerHTML=RD.svg(W,H,g,'Every cache one chat request can hit, with hit time and who keeps each correct');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
