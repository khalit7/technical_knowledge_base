// ---- Free-list lab UI (tab t-fl): presets from OSTEP ch. 17's homework, the heap drawn to scale, compare mode.
(function(){
  const $=id=>document.getElementById(id),root=$('t-fl');if(!root||!window.FREELIST)return;
  const PRE=[
    ['Q1 best fit','-n 10 -H 0 -p BEST -s 0','Predict each return value and the free list. Notice how the list fills with small pieces over time.'],
    ['Q2 worst fit','-n 10 -H 0 -p WORST -s 0','Same operations, worst fit: it always splits the biggest chunk, so the big chunk is eaten first.'],
    ['Q3 first fit','-n 10 -H 0 -p FIRST -s 0','First fit stops at the first chunk that fits: look at "searched".'],
    ['Q4 orderings','-n 10 -H 0 -p FIRST -s 0 -l SIZESORT-','Keep the list sorted biggest first and first fit becomes worst fit with a search of 1. Try SIZESORT+ (then first fit is best fit).'],
    ['Q5 1,000 ops','-n 1000 -H 0 -p BEST -s 0','Many random operations. Without coalescing, large requests start failing although the heap has free bytes; compare the list sizes.'],
    ['Q6 P = 90','-n 100 -H 0 -p BEST -s 0 -P 90 -r 20','Mostly allocations: the heap fills and requests fail. Try -P 10 too.'],
    ['Q7 fragment it','-A +10,+10,+10,+10,+10,+10,+10,+10,+10,+10,-0,-2,-4,-6,-8,+15 -p BEST','Ten chunks of 10, free every other one: 50 bytes free, yet a request for 15 fails. Coalescing cannot help, the holes are not adjacent.'],
    ['Headers and alignment','-S 100 -b 1000 -H 4 -a 4 -l ADDRSORT -p BEST -n 5 -s 0','The README example: a 4-byte header before each chunk and sizes rounded to 4.']];
  const pre=$('fl-pre');PRE.forEach((p,i)=>{const b=document.createElement('button');b.textContent=p[0];b.dataset.i=i;pre.appendChild(b)});
  let note='';
  function apply(str){const t=str.split(/\s+/);const set=(id,v)=>{$(id).value=v};
    set('fl-pol','BEST');set('fl-ord','ADDRSORT');set('fl-S',100);set('fl-H',0);set('fl-a',-1);set('fl-s',0);set('fl-n',10);set('fl-r',10);set('fl-P',50);set('fl-A','');$('fl-C').checked=false;
    for(let i=0;i<t.length;i++){const k=t[i],v=t[i+1];
      if(k==='-n'){set('fl-n',v);i++}else if(k==='-H'){set('fl-H',v);i++}else if(k==='-p'){set('fl-pol',v);i++}else if(k==='-s'){set('fl-s',v);i++}
      else if(k==='-l'){set('fl-ord',v);i++}else if(k==='-r'){set('fl-r',v);i++}else if(k==='-P'){set('fl-P',v);i++}else if(k==='-A'){set('fl-A',v);i++}
      else if(k==='-S'){set('fl-S',v);i++}else if(k==='-a'){set('fl-a',v);i++}else if(k==='-b'){i++}else if(k==='-C'){$('fl-C').checked=true}}}
  pre.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;pre.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    const p=PRE[+b.dataset.i];apply(p[1]);note=p[2];rebuild()});
  const num=(id,lo,hi,d)=>{let v=parseInt($(id).value,10);if(!isFinite(v))v=d;return Math.max(lo,Math.min(hi,v))};
  function opts(coal){return {seed:num('fl-s',0,4294967295,0),size:num('fl-S',10,2000,100),base:1000,header:num('fl-H',0,16,0),align:(()=>{const a=num('fl-a',-1,64,-1);return a===0?-1:a})(),
    policy:$('fl-pol').value,order:$('fl-ord').value,coalesce:coal,numOps:num('fl-n',1,2000,10),range:num('fl-r',1,500,10),pAlloc:num('fl-P',1,100,50),list:$('fl-A').value.replace(/\s+/g,'')}}
  let runs=[],A=null;
  const COL=['--c1','--c2','--c3','--c4','--c5','--c6'];
  function laneHTML(k){return '<div class="lane"><h4 id="fl-h'+k+'"></h4><div id="fl-svg'+k+'"></div><div class="flist" id="fl-l'+k+'"></div><div class="an-cnt" id="fl-c'+k+'"></div></div>'}
  function rebuild(){
    const cmp=$('fl-cmp').checked,c=$('fl-C').checked;
    runs=cmp?[{t:'Coalescing off',r:FREELIST.run(opts(false))},{t:'Coalescing on (-C)',r:FREELIST.run(opts(true))}]:[{t:c?'Coalescing on (-C)':'Coalescing off',r:FREELIST.run(opts(c))}];
    $('fl-lanes').innerHTML=runs.map((_,k)=>laneHTML(k)).join('');
    const n=Math.max(1,...runs.map(x=>x.r.steps.length));
    if(!A)A=RD.anim({card:'fl-lanes',ctl:'fl-ctl',n:n+1,ms:900,tab:'t-fl',label:'Operation',draw:draw});else A.reset(n+1);
    draw(0);
  }
  function draw(i){
    const W=Math.max(260,($('fl-lanes').clientWidth||600)-24),o=opts(false);
    const st0=runs[0]&&runs[0].r.steps[i-1],hide=$('fl-hide').checked;
    let cap='';
    if(i===0)cap='<div class="t">Start: one free chunk of '+o.size+' bytes at address 1000</div>'+(note?'<div>'+note+'</div>':'');
    else if(st0){const r=st0.res;cap='<div class="t">Step '+i+': '+st0.op+'</div><div class="'+(hide?'hide':'')+'">'+
      (st0.kind==='a'?(r[0]===-1?'<b>failed</b>: no free chunk is large enough':'returned '+(r[0]+(o.list?0:o.header))+', searched '+r[1]+' element'+(r[1]===1?'':'s')):'returned '+r[0])+'</div>'}
    else cap='<div class="t">End of the operations</div>';
    $('fl-cap').innerHTML=cap;
    runs.forEach((x,k)=>{
      const steps=x.r.steps,s=i===0?{free:[[1000,o.size]],used:[]}:(steps[Math.min(i,steps.length)-1]||{free:[[1000,o.size]],used:[]});
      const sc=W/o.size,H=34;let b='';
      b+='<rect x="0" y="4" width="'+W+'" height="'+H+'" fill="var(--soft)" stroke="var(--line)"/>';
      s.used.forEach(u=>{const x0=(u[0]-1000)*sc,w=Math.max(1,u[1]*sc),c='var('+COL[(u[2]||0)%6]+')';
        b+='<rect x="'+x0.toFixed(1)+'" y="4" width="'+w.toFixed(1)+'" height="'+H+'" fill="'+c+'" fill-opacity=".75" stroke="var(--bg)"/>';
        if(o.header>0)b+='<rect x="'+x0.toFixed(1)+'" y="4" width="'+Math.max(1,o.header*sc).toFixed(1)+'" height="'+H+'" fill="var(--ink)" fill-opacity=".35"/>';
        if(w>22)b+='<text x="'+(x0+w/2).toFixed(1)+'" y="'+(4+H/2+4)+'" text-anchor="middle" font-size="11" fill="var(--bg)">p'+u[2]+'</text>'});
      s.free.forEach(f=>{const x0=(f[0]-1000)*sc,w=Math.max(1,f[1]*sc);b+='<rect x="'+x0.toFixed(1)+'" y="4" width="'+w.toFixed(1)+'" height="'+H+'" fill="var(--bg)" stroke="var(--mute)" stroke-dasharray="3 2"/>';
        if(w>26)b+='<text x="'+(x0+w/2).toFixed(1)+'" y="'+(4+H/2+4)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">'+f[1]+'</text>'});
      b+='<text x="0" y="'+(H+18)+'" font-size="10.5" fill="var(--mute)">1000</text><text x="'+W+'" y="'+(H+18)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+(1000+o.size)+'</text>';
      $('fl-svg'+k).innerHTML='<svg viewBox="0 0 '+W+' '+(H+22)+'" width="'+W+'" height="'+(H+22)+'" role="img" aria-label="Heap layout">'+b+'</svg>';
      $('fl-h'+k).textContent=x.t+(i>steps.length&&steps.length?' (finished at step '+steps.length+')':'');
      const fl=s.free,tot=fl.reduce((a,f)=>a+f[1],0),lg=fl.reduce((a,f)=>Math.max(a,f[1]),0);
      const done=steps.slice(0,Math.min(i,steps.length)),fails=done.filter(d=>d.kind==='a'&&d.res[0]===-1).length,al=done.filter(d=>d.kind==='a');
      const avg=al.length?al.reduce((a,d)=>a+d.res[1],0)/al.length:0;
      const shown=fl.slice(0,40).map(f=>'[<b>'+f[0]+'</b> sz '+f[1]+']').join(' ')+(fl.length>40?' ... '+(fl.length-40)+' more':'');
      $('fl-l'+k).innerHTML='Free list ('+o.order+'): '+(fl.length?shown:'empty');
      $('fl-c'+k).innerHTML=RD.stat('Free list length',fl.length)+RD.stat('Free bytes',tot)+RD.stat('Largest free chunk',lg)+
        RD.stat('External fragmentation',tot?(1-lg/tot).toFixed(2):'0.00','1 - largest / total')+RD.stat('Failed allocations',fails)+RD.stat('Mean searched',avg.toFixed(1),'per allocation');
    });
    const txt=runs[0]?runs[0].r.text.split('\n'):[];let upto=14,cnt=0;
    for(let j=14;j<txt.length&&cnt<i;j++){upto=j+1;if(txt[j]==='')cnt++}
    const fo=$('fl-out');fo.textContent=txt.slice(0,i===0?14:upto).join('\n');fo.scrollTop=fo.scrollHeight;
  }
  ['fl-pol','fl-ord','fl-S','fl-H','fl-a','fl-s','fl-n','fl-r','fl-P','fl-A','fl-C','fl-cmp'].forEach(id=>$(id).addEventListener('change',()=>{pre.querySelectorAll('button').forEach(x=>x.classList.remove('on'));note='';rebuild()}));
  $('fl-hide').addEventListener('change',()=>A&&A.redraw());
  if(window.FL_CHECK)$('fl-chk').textContent='(checked: '+FL_CHECK+')';
  pre.querySelector('button').classList.add('on');apply(PRE[0][1]);note=PRE[0][2];
  RD.onRenderTab('t-fl',()=>{if(!runs.length)rebuild();else A.redraw()});
  let rt=0;addEventListener('resize',()=>{if(root.hidden)return;clearTimeout(rt);rt=setTimeout(()=>A&&A.redraw(),80)});
  rebuild();
})();
