// ---- Reading: dispatch bars, lazy-pipeline stepper, exception sweeps (data: window.CT_DATA from src/ca/gen.py) ----
(function(){
  if(!window.CT_DATA||!window.RD)return;
  const D=window.CT_DATA,$=id=>document.getElementById(id),esc=RD.esc;
  const med=a=>{const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};
  const f2=v=>v>=100?Math.round(v).toLocaleString('en-GB'):v.toFixed(2);

  // Horizontal bars on a log scale. rows: {name, sub, v, c, hl}; o: {lo, hi, ticks}
  function logBars(el,rows,o){
    const L=Math.log10,pos=v=>Math.max(0.5,Math.min(100,100*(L(v)-L(o.lo))/(L(o.hi)-L(o.lo))));
    let h='<div class="axis" aria-hidden="true"><span></span><span class="sc">'+o.ticks.map(t=>'<span style="left:'+pos(t)+'%">'+t.toLocaleString('en-GB')+'</span>').join('')+'</span><span></span></div>';
    rows.forEach(r=>{
      h+='<div class="row'+(r.hl?' hl':'')+'"><span class="nm">'+r.name+(r.sub?'<span class="rg">'+r.sub+'</span>':'')+'</span><span class="track">'+
        o.ticks.map(t=>'<span class="tick" style="left:'+pos(t)+'%"></span>').join('')+
        '<span class="fill" style="width:'+pos(r.v)+'%;background:'+(r.c||'var(--acc)')+'"></span></span><span class="val">'+f2(r.v)+(o.unit?' '+o.unit:'')+'</span></div>'});
    el.innerHTML=h}

  // 1. Dispatch: eight rows, objects in order or scattered
  (function(){
    const el=$('ct-disp'),seg=$('ct-disp-seg'),rd=$('ct-disp-read');if(!el||!D.dispatch)return;
    const rows=D.dispatch.rows,by={};rows.forEach(r=>by[r.label]=r);
    const col=l=>/mixed/.test(l)?'var(--bad)':(/plain|final/.test(l)?'var(--good)':'var(--acc)');
    let mode='o';
    function draw(){
      logBars(el,rows.map(r=>{const runs=mode==='s'&&r.scat?r.scat:r.order,v=mode==='s'&&r.s!=null?r.s:r.o;
        const flat=!r.scat;return {name:esc(r.label)+(flat?' (flat)':''),sub:'runs: '+Math.min(...runs).toFixed(2)+' to '+Math.max(...runs).toFixed(2),v:v,c:col(r.label),hl:/mixed|one class/.test(r.label)}}),
        {lo:0.2,hi:25,ticks:[0.3,1,3,10],unit:'ns'});
      const g=(l,k)=>f2(by[l][k]);
      rd.innerHTML=mode==='o'?
        '<b>In allocation order</b>, neighbouring objects share cache lines and the prefetcher keeps up, so the call itself shows. One class: '+g('virtual, one class','o')+' ns. Three classes in random order: '+g('virtual, 3 classes mixed','o')+' ns, and the variant and std::function rows pay the same, because each still branches on a type it cannot predict. Sorted by class: back to '+g('virtual, 3 classes sorted','o')+'.':
        '<b>Scattered</b>, each object is a cache miss and every pointer row jumps: plain call '+g('plain struct, pointers','s')+' ns, virtual one class '+g('virtual, one class','s')+', mixed '+g('virtual, 3 classes mixed','s')+'. The flat rows did not change: '+g('plain struct, flat vector','o')+' ns for plain structs stored in the vector. Layout now matters more than dispatch.'}
    RD.seg(seg,m=>{mode=m;draw()});
    draw();RD.onRender(draw)})();

  // 2. (2026-11-07) The vector growth staircase became the 3D stage in 32_js_sc_vec.js

  // 3. The lazy pipeline, one recorded print line per step
  (function(){
    const pipe=$('ct-rng-pipe'),log=$('ct-rng-log');if(!pipe||!D.ranges)return;
    const counts=[12,0,7,31,0,5,18];
    const lines=D.ranges.filter(l=>!/^evens/.test(l));
    // states after each step: replay the trace; filter lines advance through the vector in order
    const states=[];let st=counts.map(()=>''),ptr=-1,cur=-1,got=[];
    lines.forEach(l=>{let m;
      if((m=l.match(/filter (-?\d+)/))){ptr++;cur=ptr;st[ptr]=(+m[1]>0)?'pass':'out'}
      else if((m=l.match(/square (-?\d+)/))){st[cur]='sq'}
      else if((m=l.match(/got (\d+)/))){got=got.concat(+m[1])}
      states.push({st:st.slice(),cur:cur,got:got.slice(),line:l})});
    const lab={'':'not touched',pass:'kept',out:'filtered out',sq:'squared'};
    // each step is explained by its item in the step list #sx-rng (one item per recorded line); the log marks the line
    function draw(i){const S=states[i],last=i===states.length-1;
      pipe.innerHTML=counts.map((c,k)=>{const s=S.st[k];const cls=s==='out'?'out':(s==='sq'?'sq':(last&&!s?'never':''));
        return '<div class="el '+cls+(k===S.cur&&!/got|built/.test(S.line)?' cur':'')+'">'+c+'<small>'+(last&&!s?'never touched':lab[s])+'</small></div>'}).join('');
      log.innerHTML=lines.map((l,k)=>k===i?'<mark>'+esc(l)+'</mark>':(k>i?'<span class="ct-fut">'+esc(l)+'</span>':esc(l))).join('\n')}
    RD.anim({card:'ct-rng-card',ctl:'ct-rng-ctl',n:states.length,draw:draw,ms:3600,label:'Pipeline step',list:'sx-rng'})})();

  // 4. Exceptions against expected by failure rate
  (function(){
    const r=$('ct-exc-r'),rv=$('ct-exc-rv'),el=$('ct-exc-bars'),rd=$('ct-exc-read');if(!r||!D.exc)return;
    const rate=D.exc.rate,t0=med(rate[0][1]),half=rate.find(x=>x[0]===0.5),thr=(med(half[1])-t0)/0.5;
    r.max=rate.length-1;
    const share=p=>p===0?'none':(p>=0.1?Math.round(p*100)+'%':'1 in '+Math.round(1/p).toLocaleString('en-GB'));
    function draw(){const k=+r.value,x=rate[k],p=x[0],t=med(x[1]),e=med(x[2]),model=t0+p*thr;
      rv.textContent=share(p);
      logBars(el,[{name:'exceptions (throw, catch)',sub:'runs: '+f2(Math.min(...x[1]))+' to '+f2(Math.max(...x[1])),v:t,c:'var(--bad)',hl:true},
        {name:'std::expected',sub:'runs: '+f2(Math.min(...x[2]))+' to '+f2(Math.max(...x[2])),v:e,c:'var(--acc)'},
        {name:'model: success + rate &times; one throw',sub:f2(t0)+' + '+p+' &times; '+f2(thr),v:model,c:'var(--dim)'}],
        {lo:0.5,hi:5000,ticks:[1,10,100,1000],unit:'ns'});
      rd.innerHTML='Failing: <b>'+share(p)+'</b>. Exceptions cost '+f2(t)+' ns per call, <code>expected</code> '+f2(e)+': '+(t/e).toFixed(t/e<10?1:0)+' times. The model (no failures '+f2(t0)+' ns, plus '+f2(thr)+' ns per throw, derived from the 50% row) predicts '+f2(model)+'.'}
    r.addEventListener('input',draw);draw();RD.onRender(draw)})();

  // 5. Failure path by depth
  (function(){
    const el=$('ct-depth');if(!el||!D.exc)return;
    const rows=[];D.exc.depth.forEach(d=>{rows.push({name:'throw, '+d[0]+' frame'+(d[0]>1?'s':''),v:med(d[3]),c:'var(--bad)',hl:true});
      rows.push({name:'expected, '+d[0]+' frame'+(d[0]>1?'s':''),v:med(d[4]),c:'var(--acc)'})});
    const draw=()=>logBars(el,rows,{lo:1,hi:100000,ticks:[1,10,100,1000,10000],unit:'ns'});
    draw();RD.onRender(draw)})();
})();
