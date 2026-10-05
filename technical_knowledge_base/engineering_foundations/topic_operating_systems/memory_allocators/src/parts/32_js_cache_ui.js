// ---- Caching-allocator view: two lanes, same requests, two configurations. Used in the t-cache tab (full)
// and in the Reading tab (compact, fixed scenario). Data: window.CACHE_SCEN (scenarios), CACHESIM (model).
window.CacheView=function(el,o){
  if(!el||!window.CACHESIM||!window.CACHE_SCEN)return;
  const MiB=CACHESIM.MiB,uid=el.id;
  const CFG={'default':{},'expandable_segments:True':{expandable:true},'max_split_size_mb:200':{max_split:200*MiB},
    'roundup_power2_divisions:4':{divisions:4},'max_split_size_mb:200,roundup_power2_divisions:4':{max_split:200*MiB,divisions:4}};
  const fmt=b=>b<=1024?b+' bytes':b<=MiB?(b/1024).toFixed(2)+' KiB':b<=1024*MiB?(b/MiB).toFixed(2)+' MiB':(b/1024/MiB).toFixed(2)+' GiB';
  const mib=b=>(b/MiB).toFixed(b%MiB?1:0)+' MiB';
  const sel=(id,opts,v)=>'<select id="'+uid+id+'">'+opts.map(x=>'<option'+(x===v?' selected':'')+'>'+x+'</option>').join('')+'</select>';
  const scenKeys=Object.keys(CACHE_SCEN);
  let h='';
  if(o.full){h+='<div class="cvc"><label>Scenario '+'<select id="'+uid+'sc">'+scenKeys.map(k=>'<option value="'+k+'"'+(k===o.scen?' selected':'')+'>'+CACHE_SCEN[k].title+'</option>').join('')+'</select></label>'+
    '<label>Left lane '+sel('ca',Object.keys(CFG),o.a)+'</label><label>Right lane '+sel('cb',Object.keys(CFG),o.b)+'</label>'+
    '<label>Device capacity, MiB <input id="'+uid+'cap" type="number" min="64" max="81920" step="64"></label></div>'+
    '<div class="cvc"><label style="grid-column:1/-1">Or your own requests, sizes in MiB (+tag size allocates, -tag frees), e.g. <code>+a 300, +b 30, -a, +c 310</code> <input id="'+uid+'own" type="text" autocomplete="off" placeholder="+a 300, +b 30, -a, +c 310"></label></div>'}
  h+='<div class="leg"><span style="--sw:var(--c1)">weights</span><span style="--sw:var(--c3)">kept activations</span><span style="--sw:var(--c2)">temporaries</span><span style="--sw:var(--c4)">other tensors</span><span style="--sw:var(--bg)">cached, free</span></div>'+
    '<div class="an-ctl" id="'+uid+'ctl"></div><div class="jump"><button data-j="seg">next new segment or map</button><button data-j="free">next release</button><button data-j="oom">first OOM</button><button data-j="end">end</button></div>'+
    '<div class="an-cap" id="'+uid+'cap2"></div><div class="lanes"><div class="lane" id="'+uid+'L0"></div><div class="lane" id="'+uid+'L1"></div></div>';
  el.innerHTML=h;
  const $=s=>document.getElementById(uid+s);
  let ops=[],lanes=[],A=null,cap=0,title='';
  function kind(t){t=String(t);return t==='w'?'c1':/(a|kv)\d+$/.test(t)?'c3':/(t|mlp)\d+$/.test(t)?'c2':'c4'}
  function parseOwn(s){const out=[];s.split(',').forEach(p=>{const m=p.trim().match(/^([+-])\s*([A-Za-z0-9_]+)\s*([\d.]+)?$/);if(!m)return;
    if(m[1]==='+'&&m[3])out.push(['+',m[2],Math.max(1,Math.round(parseFloat(m[3])*MiB))]);else if(m[1]==='-')out.push(['-',m[2]])});return out}
  function build(){
    const sk=o.full?$('sc').value:o.scen,sc=CACHE_SCEN[sk];
    const own=o.full?parseOwn($('own').value):[];
    ops=own.length?own:sc.ops;title=own.length?'your requests':sc.title;
    if(o.full){const cv=parseInt($('cap').value,10);cap=(isFinite(cv)&&cv>=64?cv:sc.cap/MiB)*MiB;if(!isFinite(cv)||cv<64)$('cap').value=sc.cap/MiB}else cap=sc.cap;
    const names=o.full?[$('ca').value,$('cb').value]:[o.a,o.b];
    lanes=names.map(n=>({name:n,steps:CACHESIM.run(ops,Object.assign({capacity:cap},CFG[n]))}));
    const n=ops.length+1;
    if(!A)A=RD.anim({card:uid,ctl:uid+'ctl',n:n,ms:o.ms||260,tab:o.tab,label:'Request',draw:draw});else A.reset(n);
    draw(0);
  }
  function opText(op){return op[0]==='+'?'allocate <b>'+op[1]+'</b> ('+mib(op[2])+')':'free <b>'+op[1]+'</b>'}
  function draw(i){
    const W=Math.max(240,(el.querySelector('.lane')||el).clientWidth-22);
    $('cap2').innerHTML=i===0?'<div class="t">'+title+': '+ops.length+' requests on a '+mib(cap)+' device</div>Press play, or step. The same requests go to both lanes.':
      '<div class="t">Request '+i+' of '+ops.length+': '+opText(ops[i-1])+'</div>';
    lanes.forEach((ln,k)=>{
      const L=$('L'+k),st=ln.steps,s=i===0?null:st[Math.min(i,st.length)-1],dead=st.length<ops.length&&i>=st.length;
      L.classList.toggle('oom',!!(dead||(s&&!s.ok)));
      let ev='';
      if(i===0)ev='nothing reserved yet';
      else if(i>st.length)ev='stopped at request '+st.length+': the program raised OutOfMemoryError there';
      else{const e=s.events,op=ops[i-1];
        if(!s.ok)ev='<b style="color:var(--bad)">out of memory</b>';
        else if(op[0]==='-')ev='freed: the block goes back to the cache (no cudaFree)'+(e.length?'':'');
        else if(!e.length)ev='served from the cache: no driver call';
        else ev=e.map(x=>x[0]==='cudaMalloc'?'new segment: cudaMalloc('+mib(x[1])+')':x[0]==='map'?'expanded: mapped '+mib(x[1])+' more':x[0]==='cudaFree'?'released a cached segment: cudaFree('+mib(x[1])+')':x[0]==='unmap'?'unmapped '+mib(x[1])+' of free pages':x[0]==='OOM'?'no block fits':'').filter(Boolean).join('; ')}
      const H=30,sc=W/cap;let b='<defs><pattern id="'+uid+'h'+k+'" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="var(--bg)"/><line x1="0" y1="0" x2="0" y2="5" stroke="var(--mute)" stroke-width="1.2"/></pattern></defs>';
      b+='<rect x="0" y="2" width="'+W+'" height="'+H+'" fill="var(--soft)" stroke="var(--line)"/>';
      let x=0;
      if(s){let cur=-1;
        s.layout.forEach(r=>{if(r[3]==='U')return;const w=r[2]*sc;
          if(r[0]!==cur){if(cur>=0)b+='<line x1="'+x.toFixed(1)+'" y1="0" x2="'+x.toFixed(1)+'" y2="'+(H+4)+'" stroke="var(--ink)" stroke-width="1"/>';cur=r[0]}
          b+=r[3]==='A'?'<rect x="'+x.toFixed(2)+'" y="2" width="'+Math.max(.6,w).toFixed(2)+'" height="'+H+'" fill="var(--'+kind(r[4])+')" fill-opacity=".85"/>':
            '<rect x="'+x.toFixed(2)+'" y="2" width="'+Math.max(.6,w).toFixed(2)+'" height="'+H+'" fill="url(#'+uid+'h'+k+')"/>';
          x+=w});
        if(x>0)b+='<line x1="'+x.toFixed(1)+'" y1="0" x2="'+x.toFixed(1)+'" y2="'+(H+4)+'" stroke="var(--ink)" stroke-width="1"/>'}
      b+='<text x="0" y="'+(H+16)+'" font-size="10.5" fill="var(--mute)">0</text><text x="'+W+'" y="'+(H+16)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+mib(cap)+' device</text>';
      const t=s?s.stats:{allocated:0,reserved:0,largest_free:0,segments:0,cudaMalloc:0,cudaFree:0,maps:0,unmaps:0,ooms:0};
      let msg='';
      if(s&&!s.ok){const op=ops[Math.min(i,st.length)-1],sz=CACHESIM.roundSize(op[2],0);
        msg='<div class="oomm">torch.OutOfMemoryError: CUDA out of memory. Tried to allocate '+fmt(CACHESIM.allocationSize(sz))+'. GPU 0 has a total capacity of '+fmt(cap)+' of which '+fmt(cap-t.reserved)+' is free. Of the allocated memory '+fmt(t.allocated)+' is allocated by PyTorch, and '+fmt(t.reserved-t.allocated)+' is reserved by PyTorch but unallocated.'+(ln.name.indexOf('expandable')<0?' If reserved but unallocated memory is large try setting PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True to avoid fragmentation.':'')+'</div>'}
      L.innerHTML='<h4>'+ln.name+'</h4><div class="ev">'+ev+'</div><svg viewBox="0 0 '+W+' '+(H+20)+'" width="'+W+'" height="'+(H+20)+'" role="img" aria-label="Device memory: segments and blocks">'+b+'</svg>'+
        '<div class="an-cnt">'+RD.stat('Allocated',mib(t.allocated),'live tensors')+RD.stat('Reserved',mib(t.reserved),'held from the driver')+RD.stat('Reserved, unallocated',mib(t.reserved-t.allocated),'cached')+
        RD.stat('Largest free block',mib(t.largest_free))+RD.stat('Driver calls',(t.cudaMalloc+t.maps)+' / '+(t.cudaFree+t.unmaps),'get / give back')+'</div>'+msg;
    });
  }
  el.querySelector('.jump').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!A)return;const j=b.dataset.j,cur=A.i;
    const N=ops.length;let tgt=N;
    const hit=(st,idx,f)=>idx<st.length&&f(st[idx]);
    if(j==='end')tgt=N;
    else if(j==='oom'){tgt=N;lanes.forEach(l=>{const q=l.steps.findIndex(s=>!s.ok);if(q>=0)tgt=Math.min(tgt,q+1)})}
    else for(let q=cur;q<N;q++){if(lanes.some(l=>hit(l.steps,q,s=>s.events.some(x=>j==='seg'?(x[0]==='cudaMalloc'||x[0]==='map'):(x[0]==='cudaFree'||x[0]==='unmap'))))){tgt=q+1;break}}
    A.go(tgt)});
  if(o.full){['sc','ca','cb'].forEach(s=>$(s).addEventListener('change',()=>{if(s==='sc')$('cap').value='';build()}));$('cap').addEventListener('change',build);$('own').addEventListener('change',build)}
  RD.onRenderTab(o.tab,()=>{if(A)A.redraw()});
  let rt=0;addEventListener('resize',()=>{if(el.offsetParent===null)return;clearTimeout(rt);rt=setTimeout(()=>A&&A.redraw(),80)});
  build();
};
(function(){
  if(window.CACHE_CHECK){const c=document.getElementById('cv-chk');if(c)c.textContent=CACHE_CHECK}
  CacheView(document.getElementById('cv-tab'),{full:true,scen:'batch',a:'default',b:'expandable_segments:True',tab:'t-cache',ms:220});
  CacheView(document.getElementById('cv-read'),{full:false,scen:'batch',a:'default',b:'expandable_segments:True',tab:'t-read',ms:240});
})();
