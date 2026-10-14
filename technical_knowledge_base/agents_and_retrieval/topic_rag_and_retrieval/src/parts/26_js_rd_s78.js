// ---- Reading tab, sections 7 and 8: pipeline against agent loop (token maths), latency measured two ways ----
(function(){
  const D=window.RD_DATA;
  const fmt=x=>Math.round(x).toLocaleString('en-US');
  const rowsEl=document.getElementById('rd-loop-rows');
  if(rowsEl){
    const g=id=>document.getElementById(id),R=4000;
    const P=()=>({n:+g('rd-loop-n').value,s:+g('rd-loop-s').value,r:+g('rd-loop-r').value});
    function draw(i){
      const {n,s,r}=P(),pipe=s+R,maxT=Math.max(pipe,s+n*r);
      g('rd-loop-nv').textContent=n;
      const bar=(a,b,lab,on)=>'<div style="opacity:'+(on?1:0.25)+'"><div>'+lab+'</div><div class="tr"><span style="left:0;width:'+(100*a/maxT)+'%;background:var(--mute)"></span><span style="left:'+(100*a/maxT)+'%;width:'+(100*b/maxT)+'%;background:var(--acc)"></span></div><div class="v">'+(on?fmt(a+b):'')+'</div></div>';
      let h=bar(s,R,'Pipeline, 1 call',true);
      let tot=0;
      for(let c=0;c<=n;c++){const on=c<i;const inp=s+c*r;if(on)tot+=inp;h+=bar(s,c*r,'Agent call '+(c+1),on)}
      rowsEl.innerHTML=h;
      const formula=(n+1)*s+r*n*(n+1)/2;
      const cap=i===0?['The pipeline: one search, one call','It reads s = '+fmt(s)+' tokens of instructions and question plus R = '+fmt(R)+' retrieved tokens once: '+fmt(pipe)+' input tokens. Grey: the part every call re-reads; blue: retrieved text.']:
        i<=n?['Agent call '+i+(i===1?': decide what to search':': read result '+(i-1)+', search again'),'This call re-reads the instructions and all '+(i-1)+' result'+(i===2?'':'s')+' so far: '+fmt(s+(i-1)*r)+' tokens. Running total: '+fmt(tot)+'.']:
        ['Agent call '+i+': answer','After '+n+' search'+(n>1?'es':'')+' the loop has read '+fmt(tot)+' input tokens = (n + 1)s + r n(n + 1)/2 = '+fmt(formula)+', '+(tot/pipe).toFixed(1)+' times the pipeline. Doubling the searches roughly triples the bill.'];
      g('rd-loop-cap').innerHTML='<div class="t">'+cap[0]+'</div><p>'+cap[1]+'</p>';
      g('rd-loop-cnt').innerHTML=RD.stat('Pipeline input tokens',fmt(pipe),'1 call')+RD.stat('Agent input tokens so far',fmt(tot),Math.max(0,i)+' of '+(n+1)+' calls')+RD.stat('Agent / pipeline',i?(tot/pipe).toFixed(1)+'&times;':'?','');
    }
    const an=RD.anim({card:'rd-loop-card',ctl:'rd-loop-ctl',n:P().n+2,draw,ms:1500,label:'Call'});
    ['rd-loop-n','rd-loop-s','rd-loop-r'].forEach(id=>g(id).addEventListener(id==='rd-loop-n'?'input':'change',()=>{an.reset(P().n+2);an.go(P().n+1)}));
  }

  // latency, measured two ways
  const ls=document.getElementById('rd-lat-svg');
  if(ls){
    const L=D.latency;let mode='isolated';
    const st=[['embed','Embed the query','var(--c1)'],['search','Exact search','var(--c6)'],['rerank','Rerank top 30','var(--c5)'],['gen','Generator, first token','var(--c4)']];
    function draw(){
      const W=RD.width(ls),v=L[mode],tot=st.reduce((a,s)=>a+v[s[0]],0),max=Math.max(L.inproc.embed+L.inproc.search+L.inproc.rerank+L.inproc.gen,L.wall_p50)*1.02;
      const lw=Math.min(160,Math.max(130,W*0.3)),rh=26,top=6,H=top+st.length*rh+44,x=t=>lw+(W-lw-8)*t/max;
      let s='',t0=0;
      st.forEach((q,i)=>{const y=top+i*rh,w=Math.max(2,x(t0+v[q[0]])-x(t0));
        s+=RD.t(lw-6,y+15,q[1],{a:'end',fs:11.5});
        s+='<rect x="'+x(t0)+'" y="'+(y+4)+'" width="'+w+'" height="15" rx="2" fill="'+q[2]+'"/>';
        const lab=v[q[0]]<10?v[q[0]].toFixed(1)+' ms':fmt(v[q[0]])+' ms';const lx=x(t0)+w+4;
        s+=lx+60<W?RD.t(lx,y+16,lab,{fs:10.5}):RD.t(x(t0)-4,y+16,lab,{a:'end',fs:10.5});
        t0+=v[q[0]]});
      const yT=top+st.length*rh+8;
      s+='<line x1="'+lw+'" y1="'+yT+'" x2="'+x(tot)+'" y2="'+yT+'" stroke="var(--ink)" stroke-width="2"/>'+RD.t(lw-6,yT+4,'Sum of stages',{a:'end',fs:11.5,w:600})+RD.t(lw,yT+17,fmt(tot)+' ms',{fs:10.5,w:600});
      if(mode==='inproc'){s+='<line x1="'+x(L.wall_p50)+'" y1="'+(yT-6)+'" x2="'+x(L.wall_p50)+'" y2="'+(yT+6)+'" stroke="var(--bad)" stroke-width="2"/>'+RD.t(Math.min(x(L.wall_p50),W-4),yT+31,'end-to-end p50 '+fmt(L.wall_p50)+' ms',{a:'end',fs:10.5,fill:'var(--bad)'})}
      ls.innerHTML=RD.svg(W,H,s,'Latency of one request by stage');
      const iso=L.isolated,inp=L.inproc;
      document.getElementById('rd-lat-note').innerHTML=mode==='isolated'?
        'Measured one stage at a time the request looks like '+fmt(iso.embed+iso.search+iso.rerank+iso.gen)+' ms, nearly all generator. Switch to see the same request in one process.':
        'In one process the embedding stage takes '+fmt(inp.embed)+' ms instead of '+fmt(iso.embed)+', reranking '+fmt(inp.rerank)+' instead of '+fmt(iso.rerank)+': the encoders and the generator queue on one GPU. Measured end to end: p50 '+fmt(L.wall_p50)+' ms to the first token, p90 '+fmt(L.wall_p90)+'.';
    }
    RD.seg(document.getElementById('rd-lat-mode'),m=>{mode=m;draw()});
    RD.onRender(draw);RD.onResize(draw);draw();
  }
})();
