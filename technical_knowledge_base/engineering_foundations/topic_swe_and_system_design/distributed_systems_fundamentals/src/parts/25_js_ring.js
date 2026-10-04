// ---- Reading: hash mod N against consistent hashing, on 10,000 real keys, adding one machine ----
// Hash: 32-bit FNV-1a over ASCII, then MurmurHash3's fmix32 finalizer. Keys "user:0".."user:9999"; machine m's points: hash("node-"+m+"-vn-"+v). Mirrored by src/recompute.py.
window.DSF_RING=(function(){
  function fnv(s){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}
    // MurmurHash3's 32-bit finalizer: plain FNV-1a clusters similar strings such as node-0-vn-1, node-0-vn-2
    h^=h>>>16;h=Math.imul(h,0x85ebca6b)>>>0;h^=h>>>13;h=Math.imul(h,0xc2b2ae35)>>>0;h^=h>>>16;return h>>>0}
  const K=10000,keys=new Uint32Array(K);for(let i=0;i<K;i++)keys[i]=fnv('user:'+i);
  const VN=[1,4,16,64,128,256];
  function tokens(n,v){const t=[];for(let m=0;m<n;m++)for(let j=0;j<v;j++)t.push([fnv('node-'+m+'-vn-'+j),m]);t.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);return t}
  function ownersRing(n,v){const t=tokens(n,v),hs=t.map(x=>x[0]),o=new Int16Array(K);
    for(let i=0;i<K;i++){const h=keys[i];let lo=0,hi=hs.length;while(lo<hi){const mid=(lo+hi)>>1;if(hs[mid]<h)lo=mid+1;else hi=mid}o[i]=t[lo===hs.length?0:lo][1]}return o}
  function ownersMod(n){const o=new Int16Array(K);for(let i=0;i<K;i++)o[i]=keys[i]%n;return o}
  function run(mode,n,v){const a=mode==='mod'?ownersMod(n):ownersRing(n,v),b=mode==='mod'?ownersMod(n+1):ownersRing(n+1,v);
    const before=new Array(n).fill(0),after=new Array(n+1).fill(0);let moved=0;
    for(let i=0;i<K;i++){before[a[i]]++;after[b[i]]++;if(a[i]!==b[i])moved++}
    const mx=Math.max(...before),mean=K/n;return {before,after,moved,movedPct:100*moved/K,imb:mx/mean,ideal:100/(n+1)}}
  return {fnv,run,VN,tokens,K};
})();
(function(){
  const $=id=>document.getElementById(id);if(!$('rd-ring-card'))return;
  const R=window.DSF_RING;let mode='mod';
  function draw(){
    const n=+$('rd-ring-n').value,v=R.VN[+$('rd-ring-v').value];
    $('rd-ring-nv').textContent=n;$('rd-ring-vv').textContent=mode==='mod'?'(not used)':v;
    const x=R.run(mode,n,v),el=$('rd-ring-svg');
    let html='';
    if(mode==='ring'){const W=Math.min(640,RD.width(el)),H=190,cx=W/2,cy=95,r=78;
      let g='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="var(--line)" stroke-width="6"/>';
      const t=R.tokens(n+1,Math.min(v,64));
      t.forEach(p=>{const a=p[0]/4294967296*2*Math.PI-Math.PI/2,nw=p[1]===n;
        g+='<line x1="'+(cx+(r-9)*Math.cos(a))+'" y1="'+(cy+(r-9)*Math.sin(a))+'" x2="'+(cx+(r+9)*Math.cos(a))+'" y2="'+(cy+(r+9)*Math.sin(a))+'" stroke="'+(nw?'var(--bad)':'var(--acc)')+'" stroke-width="'+(nw?2.5:1.2)+'"/>'});
      g+=RD.t(cx,cy-4,'hash circle',{a:'middle',fs:11,fill:'var(--mute)'})+RD.t(cx,cy+12,'0 to 2³²',{a:'middle',fs:11,fill:'var(--mute)'});
      html=RD.svg(W,H,g,'Hash ring with machine points');}
    // bars: keys per machine before and after
    const mx=Math.max(...x.before,...x.after);
    let bars='<div class="bars">';
    for(let m=0;m<=n;m++){const b=m<n?x.before[m]:0,a=x.after[m];
      bars+='<div class="row"><span class="nm">Machine '+(m+1)+(m===n?' (new)':'')+'</span><span class="track"><span class="fill" style="width:'+(100*b/mx)+'%;background:var(--dim);bottom:50%"></span><span class="fill" style="width:'+(100*a/mx)+'%;background:'+(m===n?'var(--bad)':'var(--acc)')+';opacity:.8;top:50%"></span></span><span class="val">'+b.toLocaleString('en-US')+' → '+a.toLocaleString('en-US')+'</span></div>'}
    bars+='</div>';
    el.innerHTML=html+bars;
    $('rd-ring-out').innerHTML=RD.stat('Keys that move when machine '+(n+1)+' joins',x.moved.toLocaleString('en-US')+' of 10,000',x.movedPct.toFixed(1)+'%')+
      RD.stat('The new machine\'s fair share',(100/(n+1)).toFixed(1)+'%','1/(N+1): the least that must move on average')+
      RD.stat('Busiest machine before','×'+x.imb.toFixed(2)+' the average','1.00 is perfectly even');
    $('rd-ring-cap').innerHTML=mode==='mod'?'<b>hash mod N.</b> Grey bar: keys per machine before; coloured: after. Going from '+n+' to '+(n+1)+' machines changes the remainder of most keys, so about N/(N+1) of all data moves, nearly all of it between old machines.':
      '<b>Consistent hashing, '+v+' point'+(v>1?'s':'')+' per machine.</b> Blue ticks: the old machines\' points; red: the new machine\'s'+(v>64?' (first 64 per machine drawn)':'')+'. Only keys on the arcs the new points take over move, all to the new machine. With 1 point per machine the shares are very uneven; more points even them out.';
  }
  RD.seg($('rd-ring-seg'),m=>{mode=m;draw()});
  ['rd-ring-n','rd-ring-v'].forEach(id=>$(id).addEventListener('input',draw));
  RD.onRender(draw);RD.onResize(draw);draw();
})();
