// ---- Reading: the dumbbell helper (window.RDB) and the SWE-bench probes chart (the hero is the 3D stage in 31_js_sc_hero.js since 2026-11-09) ----
// Every value is published and cited in the captions; the deltas are differences of the printed values.
window.RDB=(function(){
  // wrap a label to lines of at most max characters
  function wrap(s,max){const w=s.split(' '),out=[];let l='';for(const x of w){if(l&&(l+' '+x).length>max){out.push(l);l=x}else l=l?l+' '+x:x}if(l)out.push(l);return out}
  // dumbbell rows: groups [{g, rows:[{lab, a, b}]}]; a = as usually quoted (open dot), b = after the change (filled dot)
  function dumb(W,y0,groups,o){
    o=o||{};const L=8,R=58,cw=6.3,max=Math.max(24,Math.floor((W-L-4)/cw));let s='',y=y0;
    const x=v=>L+(W-L-R)*v/100;
    for(const G of groups){
      if(G.g){y+=14;s+=RD.t(L,y,G.g,{fs:11.5,w:600,fill:'var(--acc)'});y+=4}
      for(const r of G.rows){
        for(const ln of wrap(r.lab,max)){y+=15;s+=RD.t(L,y,RD.esc(ln),{fs:12})}
        y+=24;const ty=y;
        s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+ty+'" y2="'+ty+'" stroke="var(--line)" stroke-width="5" stroke-linecap="round"/>';
        for(const g of [25,50,75])s+='<line x1="'+x(g)+'" x2="'+x(g)+'" y1="'+(ty-4)+'" y2="'+(ty+4)+'" stroke="var(--bg)" stroke-width="1.5"/>';
        const xa=x(r.a),xb=x(r.b);
        s+='<line x1="'+xa+'" x2="'+xb+'" y1="'+ty+'" y2="'+ty+'" stroke="var(--acc)" stroke-width="2.5"/>';
        s+='<circle cx="'+xa+'" cy="'+ty+'" r="5.5" fill="var(--bg)" stroke="var(--ink)" stroke-width="1.8"/><circle cx="'+xb+'" cy="'+ty+'" r="5.5" fill="var(--acc)"/>';
        // value labels above the dots, pushed apart when close, kept inside the track
        let la=xa,lb=xb;const gap=36;if(Math.abs(la-lb)<gap){const m=(la+lb)/2,sg=la<lb?-1:1;la=m+sg*gap/2;lb=m-sg*gap/2}
        // keep both labels inside the track, shifting the pair together so they stay apart
        const lo=Math.min(la,lb),hi=Math.max(la,lb),mn=L+16,mx=W-R-6;let sh=0;if(lo<mn)sh=mn-lo;else if(hi>mx)sh=mx-hi;la+=sh;lb+=sh;
        s+=RD.t(la,ty-9,String(r.a),{a:'middle',fs:11,fill:'var(--mute)'})+RD.t(lb,ty-9,String(r.b),{a:'middle',fs:11,w:600});
        const d=Math.round((r.b-r.a)*10)/10;
        s+=RD.t(W-2,ty+4,(d>0?'+':'−')+Math.abs(d).toFixed(1),{a:'end',fs:12,w:700,fill:'var(--acc)'});
        y+=8;
      }
    }
    // axis
    y+=12;for(const g of [0,25,50,75,100])s+=RD.t(x(g),y,g+'%',{a:'middle',fs:10.5,fill:'var(--mute)'});
    s+=RD.t(W-2,y,o.dl||'points',{a:'end',fs:10.5,fill:'var(--mute)'});
    return {s,y:y+4};
  }
  return {wrap,dumb};
})();
(function(){
  const el=document.getElementById('rd-flaw');if(!el)return;
  const G=[{rows:[
    {lab:'SWE-Agent with GPT-4, % resolved: as graded, then without passes that copied the issue or beat weak tests',a:12.47,b:3.97},
    {lab:'File to edit named from the issue alone, no repository: Verified, then repositories outside SWE-bench',a:76,b:53},
    {lab:'Gold function reproduced (consecutive 5-gram accuracy): Verified, then outside SWE-bench',a:35,b:18}]}];
  function draw(){const W=RD.width(el);const d=RDB.dumb(W,0,G,{dl:'change'});el.innerHTML=RD.svg(W,d.y,d.s,'SWE-Bench+ and SWE-Bench Illusion probes')}
  RD.onRender(draw);RD.onResize(draw);draw();
})();
