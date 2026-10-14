// ---- Shuffle and resume tab ----
(function(){
  const U=SLU,$=U.$;if(!$('t-shuf'))return;
  const SH=SL.shuf,K=SH.K,S=SH.S,N=K*S,B=SH.batch,NB=Math.floor(N/B);
  const COL=Array.from({length:K},(_,k)=>'hsl('+Math.round(k*360/K)+',62%,52%)');
  const dec=s=>Array.from(s,c=>parseInt(c,36));
  const BV=[1,2,5,10,20,30,50,75,100,150,200,300,400,500,600,800,1000,1200,1500,1800,2000,2200,2200];
  // seeded PRNG (mulberry32)
  const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  function shufArr(a,r){for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
  // source order: list of sample ids (shard*S + i)
  function source(shardOrder,rr){const shards=shardOrder.map(k=>Array.from({length:S},(_,i)=>k*S+i));
    if(!rr)return shards.flat();
    // datasets 5: up to 10 groups read round robin (shard g, g+10, ... form group g), until all are exhausted
    const G=Math.min(10,K),groups=Array.from({length:G},(_,g)=>shards.filter((_,j)=>j%G===g).flat()),out=[],pos=new Array(G).fill(0);let left=N;
    while(left>0){for(let g=0;g<G;g++){if(pos[g]<groups[g].length){out.push(groups[g][pos[g]++]);left--}}}return out}
  function bufferShuffle(src,b,r){const buf=[],out=[];for(const x of src){if(buf.length<b){buf.push(x);continue}const j=Math.floor(r()*b);out.push(buf[j]);buf[j]=x}return out.concat(shufArr(buf,r))}
  function live(){const b=BV[+$('sl-s-b').value],r=rng(42),order=[...Array(K).keys()];if($('sl-s-so').checked)shufArr(order,r);
    return bufferShuffle(source(order,$('sl-s-rr').checked),b,r).map(x=>Math.floor(x/S))}
  function metrics(o){const tv=[],dist=[];for(let b=0;b<NB;b++){const c=new Array(K).fill(0);for(let i=b*B;i<(b+1)*B;i++)c[o[i]]++;
      tv.push(0.5*c.reduce((a,v)=>a+Math.abs(v/B-1/K),0));dist.push(c.filter(v=>v>0).length)}
    return {tv,tvm:tv.reduce((a,b)=>a+b,0)/NB,dm:dist.reduce((a,b)=>a+b,0)/NB}}
  // recorded schemes
  const sel=$('sl-s-rec');Object.keys(SH.orders).forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=(window.SL_SHN||{})[k]||k;sel.appendChild(o)});
  sel.value='hf_buf1000_mbis1';
  let src='rec',ord=null,met=null;
  function compute(){if(src==='rec'){ord=dec(SH.orders[sel.value]);met=metrics(ord);const m=SH.m[sel.value];
      // the browser recomputation must agree with the Python metrics
      met.check=Math.abs(met.tvm-m.batch_tv_mean)<1e-6&&Math.abs(met.dm-m.batch_distinct_mean)<1e-6}
    else{ord=live();met=metrics(ord);met.check=null}
    $('sl-s-bv').textContent=U.f0(BV[+$('sl-s-b').value])}
  function draw(i){if(!ord)compute();const W=RD.width($('sl-s-card')),per=100,cw=(W-8)/per,ch=Math.max(5,Math.min(9,cw*1.6)),rows=N/per,shown=Math.min(N,i*B);
    let s='';for(let p=0;p<shown;p++){const r=Math.floor(p/per),c=p%per;s+='<rect x="'+(4+c*cw).toFixed(2)+'" y="'+(r*(ch+1)).toFixed(1)+'" width="'+Math.max(0.6,cw-0.3).toFixed(2)+'" height="'+ch.toFixed(1)+'" fill="'+COL[ord[p]]+'"/>'}
    if(i>0&&i<=NB){const p0=(i-1)*B;for(let p=p0;p<p0+B;p++){const r=Math.floor(p/per),c=p%per;s+='<rect x="'+(4+c*cw).toFixed(2)+'" y="'+(r*(ch+1)).toFixed(1)+'" width="'+cw.toFixed(2)+'" height="'+ch.toFixed(1)+'" fill="none" stroke="var(--ink)" stroke-width="1"/>'}}
    $('sl-s-strip').innerHTML=RD.svg(W,rows*(ch+1)+2,s,'Read order');
    // batch TV chart
    const H=110,pw=(W-40)/NB;let t='<line x1="34" x2="'+(W-4)+'" y1="'+(H-18)+'" y2="'+(H-18)+'" stroke="var(--line)"/>';
    const y=v=>H-18-v/0.95*(H-30);[0,0.25,0.5,0.75].forEach(v=>{t+=RD.t(30,y(v)+4,v.toFixed(2),{fs:10,a:'end',fill:'var(--mute)'})});
    const gm=SH.m.global.batch_tv_mean;t+='<line x1="34" x2="'+(W-4)+'" y1="'+y(gm).toFixed(1)+'" y2="'+y(gm).toFixed(1)+'" stroke="var(--good)" stroke-dasharray="4 3"/>';
    const nb=Math.min(NB,i);for(let b=0;b<nb;b++)t+='<rect x="'+(36+b*pw).toFixed(1)+'" y="'+y(met.tv[b]).toFixed(1)+'" width="'+Math.max(1,pw-1).toFixed(1)+'" height="'+(H-18-y(met.tv[b])).toFixed(1)+'" fill="var(--acc)"/>';
    t+=RD.t(36,H-4,'batch 1',{fs:10,fill:'var(--mute)'})+RD.t(W-4,H-4,'batch '+NB,{fs:10,a:'end',fill:'var(--mute)'})+RD.t(36,10,W<600?'Batch distance from the true mix (dashed: global)':'Distance of each batch from the true mix (0 = perfect, 0.91 = one shard); dashed: global permutation mean',{fs:10.5,fill:'var(--mute)'});
    $('sl-s-tv').innerHTML=RD.svg(W,H,t,'Batch distance');
    let cap;if(i===0)cap='Press play to read the stream batch by batch ('+NB+' batches of '+B+').';
    else if(i<=NB){const c=new Array(K).fill(0);for(let p=(i-1)*B;p<i*B;p++)c[ord[p]]++;const top=c.indexOf(Math.max(...c));
      cap='<b>Batch '+i+'</b>: '+c.filter(v=>v>0).length+' of 11 shards; the largest, <i>'+U.esc(SH.names[top])+'</i>, is '+U.pc(c[top]/B,0)+' of it; distance '+met.tv[i-1].toFixed(2)+'.'}
    else cap='Whole epoch read.';
    $('sl-s-cap').innerHTML=cap;
    $('sl-s-out').innerHTML=RD.stat('Shards per batch',met.dm.toFixed(1),'mean over '+NB+' batches')+RD.stat('Mean distance',met.tvm.toFixed(3),'global permutation: '+gm.toFixed(3))+
      RD.stat('Source',src==='rec'?'real library':'this page\'s mirror',src==='rec'?(met.check?'browser recomputation matches Python':'MISMATCH with Python'):'B = '+U.f0(BV[+$('sl-s-b').value]));
    $('sl-s-leg').innerHTML=SH.names.map((n,k)=>'<span><i style="background:'+COL[k]+'"></i>'+U.esc(n)+'</span>').join('')}
  const A=RD.anim({card:'sl-s-card',ctl:'sl-s-ctl',n:NB+2,ms:160,label:'Batch',draw,tab:'t-shuf',start:NB+1});
  function upd(){compute();A.go(NB+1);$('sl-s-note').innerHTML=src==='rec'?'Recorded by <code>src/scripts/shuffle.py</code> with datasets '+SH.versions.datasets+', torch '+SH.versions.torch+', mosaicml-streaming '+SH.versions['mosaicml-streaming']+' <span class="sl-lbl meas">measured</span>. With 4 DataLoader workers each batch comes from one worker, which reads only its own shards.':
    'Computed in your browser: the shard order shuffled with a seeded generator, then a buffer shuffle following <code>BufferShuffledExamplesIterable</code> (pick a random slot, emit it, put the next example in its place). With B = 1,000 and no round robin it lands close to the recorded run (shards per batch '+SH.m.hf_buf1000_mbis1.batch_distinct_mean.toFixed(1)+') without being the same sequence. <span class="sl-lbl ill">illustrative mirror</span>'}
  RD.seg($('sl-s-src'),v=>{src=v;$('sl-s-livectl').hidden=v!=='live';$('sl-s-recl').hidden=v!=='rec';upd()});
  sel.addEventListener('change',upd);['sl-s-b','sl-s-so','sl-s-rr'].forEach(id=>$(id).addEventListener('input',upd));
  // ---- resume panel ----
  let rm='index';
  function rdraw(){const k=+$('sl-r-k').value,b=BV[Math.min(BV.length-1,+$('sl-r-b').value)];$('sl-r-kv').textContent=U.f0(k);$('sl-r-bv').textContent=U.f0(b);
    const r=rng(7),order=shufArr([...Array(K).keys()],r),src0=source(order,false);const full=bufferShuffle(src0,b,rng(42));
    let res;
    if(rm==='index')res=full.slice();
    else if(rm==='restart')res=full.slice(0,k).concat(full);
    else{ // state = position in the source; the buffer's b examples are lost; refill from there
      const consumed=Math.min(N,k+b);res=full.slice(0,k).concat(bufferShuffle(src0.slice(consumed),b,rng(43)))}
    const W=RD.width($('sl-r-card')),per=110,cw=(W-8)/per,ch=6,seen={};const rowsA=Math.ceil(N/per),rowsB=Math.ceil(res.length/per);
    let s='';full.forEach((x,p)=>{s+='<rect x="'+(4+(p%per)*cw).toFixed(2)+'" y="'+(Math.floor(p/per)*(ch+1)+14)+'" width="'+Math.max(0.5,cw-0.3).toFixed(2)+'" height="'+ch+'" fill="'+COL[Math.floor(x/S)]+'"/>'});
    const y0=rowsA*(ch+1)+34;let tw=0,same=0;
    res.forEach((x,p)=>{seen[x]=(seen[x]||0)+1;const twice=seen[x]>1;if(twice)tw++;const eq=full[p]===x;if(eq&&!twice)same++;
      s+='<rect x="'+(4+(p%per)*cw).toFixed(2)+'" y="'+(Math.floor(p/per)*(ch+1)+y0)+'" width="'+Math.max(0.5,cw-0.3).toFixed(2)+'" height="'+ch+'" fill="'+(twice?'var(--c5)':eq?'var(--good)':'var(--dim)')+'"/>'});
    const kp=k;s+='<rect x="'+(4+(kp%per)*cw).toFixed(1)+'" y="'+(Math.floor(kp/per)*(ch+1)+y0-2)+'" width="2" height="'+(ch+4)+'" fill="var(--bad)"/>';
    s+=RD.t(4,10,'Uninterrupted epoch (colour = shard)',{fs:10.5,fill:'var(--mute)'})+RD.t(4,y0-6,'Stopped after '+U.f0(k)+' and resumed (red mark = the stop)',{fs:10.5,fill:'var(--mute)'});
    $('sl-r-plot').innerHTML=RD.svg(W,y0+rowsB*(ch+1)+4,s,'Resume comparison');
    const never=N-Object.keys(seen).length;
    $('sl-r-out').innerHTML=RD.stat('Never read',U.f0(never),rm==='buffer'?'= the buffer size B':'')+RD.stat('Read twice',U.f0(tw),rm==='restart'?'= k':'')+RD.stat('Same position as uninterrupted',U.pc(same/N),'grey: right document set, different order')}
  RD.seg($('sl-r-m'),v=>{rm=v;rdraw()});['sl-r-k','sl-r-b'].forEach(id=>$(id).addEventListener('input',rdraw));
  RD.onRender(()=>{A.redraw();rdraw()},'t-shuf');RD.onResize(()=>{A.redraw();rdraw()},'t-shuf');
  compute();upd();rdraw();
})();
