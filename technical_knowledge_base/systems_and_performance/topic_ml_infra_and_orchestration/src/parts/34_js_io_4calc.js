// ---- Storage lab: checkpoint-time calculator (calculation from published numbers; formulas in src/io/recompute.py) ----
(function(){
  const H=window.IO_H;if(!H||!H.$('io-calc'))return;const $=H.$;
  const TIERS={
    nfs:{agg:12.5,label:'One NFS server on a 100 GbE link',kind:'derived',note:'12.5 GB/s is the link rate (100 Gb/s / 8); one server is the ceiling however many nodes write'},
    fsx:{agg:100,label:'FSx for Lustre PERSISTENT-1000, 100 TiB',kind:'vendor',note:'1,000 MB/s per TiB provisioned (AWS docs) x 100 TiB = 100 GB/s'},
    tect:{agg:2000,label:'Meta Tectonic (Llama 3), 2 TB/s sustained',kind:'published',note:'Llama 3 paper section 3.3.1: 2 TB/s sustained, 7 TB/s peak'},
    obj:{agg:Infinity,label:'Object store, limited only by each node’s link',kind:'assumption',note:'no aggregate cap modelled: S3 scales by parallel requests; each node’s link is the limit'},
    custom:{agg:500,label:'Custom aggregate bandwidth',kind:'input',note:'your number'}
  };
  const PRE={
    ex:{n:112577,b:12.31,g:4,gpn:2,tier:'nfs',lab:'Running example'},
    b8:{n:8e9,b:14,g:64,gpn:8,tier:'fsx',lab:'8B on 64 GPUs'},
    b70:{n:70e9,b:14,g:1024,gpn:8,tier:'fsx',lab:'70B on 1,024 GPUs'},
    b405:{n:405e9,b:14,g:16384,gpn:8,tier:'tect',lab:'405B on 16,384 GPUs (Llama 3)'},
    b671:{n:671e9,b:14,g:2048,gpn:8,tier:'fsx',lab:'671B on 2,048 GPUs (DeepSeek-V3 size)'}
  };
  const st={n:405e9,b:14,g:16384,gpn:8,tier:'tect',agg:500,link:50,pcie:63,ivl:30,target:60,keep:5};
  const fB=b=>b>=1e12?(b/1e12).toFixed(b>=1e13?1:2)+' TB':b>=1e9?(b/1e9).toFixed(b>=1e10?1:2)+' GB':b>=1e6?(b/1e6).toFixed(b>=1e7?0:2)+' MB':b>=1e3?(b/1e3).toFixed(1)+' kB':Math.round(b)+' B';
  const fS=s=>!isFinite(s)?'n/a':s>=3600?(s/3600).toFixed(1)+' h':s>=60?(s/60).toFixed(1)+' min':s>=1?s.toFixed(1)+' s':s>=1e-3?(s*1e3).toFixed(s>=0.01?0:1)+' ms':(s*1e6).toFixed(0)+' µs';
  const pct=x=>{const v=100*x;return v<1e-3?'under 0.001%':v<0.1?v.toFixed(3)+'%':v.toFixed(1)+'%'};
  const fP=n=>n>=1e9?(n/1e9).toFixed(n>=1e10?0:1)+'B':n>=1e6?(n/1e6).toFixed(1)+'M':n.toLocaleString('en-US');
  function calc(){
    const S=st.n*st.b, nodes=Math.max(1,Math.ceil(st.g/st.gpn)), agg=st.tier==='custom'?st.agg:TIERS[st.tier].agg;
    const shard=S/st.g, link=st.link*1e9, A=agg*1e9;
    const tCons=S/Math.min(link,A);                       // one writer: its own link or the store, whichever is slower
    const pipe=Math.min(A,nodes*link), tShard=S/pipe;      // every rank writes its shard in parallel
    const tBlock=shard/(st.pcie*1e9);                      // async: copy own shard to host RAM, then train on
    const ivl=st.ivl*60, need=S/st.target;
    return {S,nodes,shard,tCons,tShard,tBlock,pipe,bound:A<=nodes*link?'the storage system':'the nodes’ links',
      ovSync:tShard/(ivl+tShard),ovAsync:tBlock/(ivl+tBlock),drainOK:tShard<ivl,need,
      lustreTiB:need/1e9/1.0,lustre125TiB:need/1e9/0.125,keepCost:st.keep*S/1e9*0.023};
  }
  function draw(){
    const r=calc();
    const set=(id,v)=>{const e=$(id);if(e)e.innerHTML=v};
    set('io-c-size',fB(r.S));set('io-c-size-d',fP(st.n)+' parameters x '+st.b+' bytes');
    set('io-c-shard',fB(r.shard));set('io-c-shard-d','over '+st.g.toLocaleString('en-US')+' GPUs on '+r.nodes.toLocaleString('en-US')+' nodes');
    set('io-c-pipe',r.pipe>=1e12?(r.pipe/1e12).toFixed(2)+' TB/s':(r.pipe/1e9).toFixed(1)+' GB/s');set('io-c-pipe-d','bound by '+r.bound);
    set('io-c-need',(r.need/1e9).toFixed(r.need>=1e10?0:2)+' GB/s');set('io-c-need-d','to write it in '+st.target+' s');
    const rows=[['Consolidated: gather to one rank, one file',r.tCons,'var(--c2)'],['Sharded, synchronous: every rank writes its piece',r.tShard,'var(--c1)'],
      ['Sharded, asynchronous: time the GPUs wait',r.tBlock,'var(--c3)'],['... then the background upload (training continues)',r.tShard,'var(--dim)']];
    const mx=Math.max(...rows.map(x=>x[1]).filter(isFinite)),mn=Math.min(...rows.map(x=>x[1]).filter(x=>x>0));
    const lo=Math.log10(Math.max(1e-6,mn))-0.3,hi=Math.log10(mx)+0.1;
    $('io-c-bars').innerHTML=rows.map(x=>{const w=isFinite(x[1])&&x[1]>0?Math.max(2,(Math.log10(x[1])-lo)/(hi-lo)*100):0;
      return '<div class="row"><span class="nm" title="'+H.esc(x[0])+'">'+H.esc(x[0])+'</span><span class="track"><span class="fill" style="width:'+w.toFixed(1)+'%;background:'+x[2]+'"></span></span><span class="val">'+fS(x[1])+'</span></div>'}).join('');
    set('io-c-ov','Every '+st.ivl+' min, a synchronous sharded checkpoint stops training for <b>'+fS(r.tShard)+'</b> ('+pct(r.ovSync)+' of the time); an asynchronous one for <b>'+fS(r.tBlock)+'</b> ('+pct(r.ovAsync)+')'+
      (r.drainOK?', and its upload finishes well before the next one.':', <b>but its upload ('+fS(r.tShard)+') takes longer than the interval: checkpoints would pile up.</b>'));
    set('io-c-cap','To write it in '+st.target+' s on FSx for Lustre you would provision about <b>'+Math.ceil(r.lustreTiB).toLocaleString('en-US')+' TiB</b> at PERSISTENT-1000 or <b>'+Math.ceil(r.lustre125TiB).toLocaleString('en-US')+' TiB</b> at PERSISTENT-125 (about $'+Math.round(r.lustre125TiB*1024*0.145).toLocaleString('en-US')+' a month at $0.145 per GB-month): on a parallel file system, bandwidth is bought as capacity. Keeping the last '+st.keep+' checkpoints in S3 Standard costs about $'+Math.round(r.keepCost).toLocaleString('en-US')+' a month.');
    const t=TIERS[st.tier];set('io-c-tnote','<span class="io-tag io-'+t.kind+'">'+t.kind+'</span> '+H.esc(t.note));
    $('io-c-aggw').hidden=st.tier!=='custom';
    ['g','gpn','link','pcie','ivl','target','agg'].forEach(k=>{const o=$('io-c-'+k+'-v');if(o)o.textContent=(k==='g'?st.g.toLocaleString('en-US'):st[k])});
    $('io-c-n-v').textContent=fP(st.n);
  }
  function setN(v){st.n=v;$('io-c-n').value=Math.log10(v).toFixed(3)}
  function preset(k){const p=PRE[k];setN(p.n);st.b=p.b;st.g=p.g;st.gpn=p.gpn;st.tier=p.tier;
    $('io-c-g').value=Math.log2(p.g);$('io-c-gpn').value=p.gpn;$('io-c-tier').value=p.tier;
    document.querySelectorAll('#io-c-b button').forEach(b=>b.classList.toggle('on',+b.dataset.m===p.b||(p.b===12.31&&b.dataset.m==='12.31')));draw()}
  $('io-c-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    document.querySelectorAll('#io-c-pre button').forEach(x=>x.classList.toggle('on',x===b));preset(b.dataset.m)});
  H.seg($('io-c-b'),m=>{st.b=+m;draw()});
  $('io-c-n').addEventListener('input',e=>{st.n=Math.round(Math.pow(10,+e.target.value));draw()});
  $('io-c-g').addEventListener('input',e=>{st.g=Math.round(Math.pow(2,+e.target.value));draw()});
  [['gpn',1],['link',1],['pcie',1],['ivl',1],['target',1],['agg',1]].forEach(([k])=>$('io-c-'+k).addEventListener('input',e=>{st[k]=+e.target.value;draw()}));
  $('io-c-tier').addEventListener('change',e=>{st.tier=e.target.value;draw()});
  window.IO_CALC={calc,st,preset};
  preset('b405');H.onRender(draw);
})();
