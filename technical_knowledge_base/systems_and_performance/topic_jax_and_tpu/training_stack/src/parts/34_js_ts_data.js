// ---- Reading section 6: grain batches cell by cell (was the Data lab tab) ----
(function(){
  const U=TSU,D=U.D,G=D.grain,root=document.getElementById('dg-card');if(!root||!G)return;
  let cfg='A',w='2';
  const base=G.G1.A0[0].concat(G.G1.A0[1]),pos={};base.forEach((id,i)=>pos[id]=i);
  const key=()=>cfg==='DL'?('DL'+(w==='4'?'2':w)+'_run0'):(cfg+w);
  const col=id=>'hsl('+Math.round(id/7781*300)+',55%,'+(document.documentElement&&matchMedia('(prefers-color-scheme: dark)').matches?'42%':'48%')+')';
  function draw(k){const B=G.G1[key()],ref=cfg==='DL'?G.G1.DL0_run0:G.G1[cfg+'0'];let n=0,moved=0;
    [0,1].forEach(b=>{let h='';for(let j=0;j<32;j++){const idx=b*32+j,id=B[b][j],shown=idx<k*4;
      const off=ref[b][j]!==id;if(shown&&off)moved++;
      h+='<div class="dg-c'+(shown?(off?' x':''):' e')+'" style="background:'+col(id)+'" title="window '+id+'">'+(shown?(pos[id]!=null?pos[id]:'+'):'')+'</div>'}
      document.getElementById('dg-b'+b).innerHTML=h});
    const total=Math.min(64,k*4);
    const eq=cfg==='DL'?G.G1_equal.DL['0_2']:(G.G1_equal[cfg]['0_'+w]);
    document.getElementById('dg-cap').innerHTML=k===0?'Before: an empty batch. Pipeline '+cfg+', '+w+' worker'+(w==='1'?'':'s')+(cfg==='DL'&&w==='4'?' (DataLoader shown with 2 workers: 4 was not run)':'')+'.':
      total<64?'Records delivered: '+total+' of 64. Numbers are positions in the shuffled order; + means beyond position 63.':
      (w==='0'?'With 0 workers this is the reference stream itself.':(eq?'Same stream as with 0 workers: the worker count does not change what the model sees.':'A different stream from 0 workers: '+moved+' of 64 records are not where the 0-worker pipeline put them. Deterministic for this worker count, but not elastic.'));
    document.getElementById('dg-stats').innerHTML=RD.stat('records shown',total,'two batches of 32')+RD.stat('out of place',moved,'vs 0 workers')+RD.stat('first 6 batches equal to 0 workers',w==='0'?'(reference)':(eq?'yes':'no'),'recorded over 6 batches');}
  const A=RD.anim({card:'dg-card',ctl:'dg-ctl',n:17,draw,ms:260,label:'Records delivered'});
  RD.seg(document.getElementById('dg-cfg'),m=>{cfg=m;A.reset(17)});
  RD.seg(document.getElementById('dg-w'),m=>{w=m;A.reset(17)});
  const G2=G.G2,G5=G.G5,G6=G.G6;
  U.table('dg-more',[['Question'],['Measured answer']],[
    ['First windows of epoch 0 and epoch 1 with '+'<code>shuffle(0).repeat()</code>',G2.epoch0_first8.slice(0,5).join(', ')+' ... / '+G2.epoch1_first8_reseeded.slice(0,5).join(', ')+' ...'],
    ['Epoch 1 with <code>repeat(reseed_each_epoch=False)</code>',G2.epoch1_first8_not_reseeded.slice(0,5).join(', ')+' ... (epoch 0 again)'],
    ['Record 100,000 of the repeated dataset','window '+G2.random_access_record_100000+', computed by index with no iteration'],
    ['Iterator state after 7 batches (2 workers)','<code>'+U.esc(G5.state).slice(0,160)+'...</code>'],
    ['Resume a fresh 2-worker iterator from it',G5.equal?'next 3 batches identical':'different'],
    ['Load it into a 0-worker iterator','<code>'+U.esc(G5.load_into_0_workers_error.type+': '+G5.load_into_0_workers_error.msg)+'</code>'],
    ['Two simulated hosts, <code>ShardOptions(k, 2)</code>',U.int(G6.hosts['0'].n)+' + '+U.int(G6.hosts['1'].n)+' records, disjoint: '+(G6.disjoint?'yes':'no')+', union '+U.int(G6.union)+' of '+U.int(G6.n)]]);
  const T=D.torch_loader;
  if(T)U.table('dg-torch',[['Check'],['Result']],[['Order, num_workers 0 vs 2',T.T1.order_equal_0_2?'identical':'different'],
    ['Crop offsets, num_workers 0 vs 2',(T.T2.fraction_equal*100).toFixed(1)+'% of '+T.T2.records+' records agree'],
    ['Crop offsets, num_workers 0 run twice',T.T2.offsets_equal_rerun_0_workers?'identical':'different'],
    ['Examples (window: offset at 0 workers, at 2)',T.T2.example.map(e=>e[0]+': '+e[1]+', '+e[2]).join('; ')],
    ['<code>DataLoader.state_dict</code> exists',T.T3.has_state_dict?'yes':'no (torchdata\'s StatefulDataLoader adds it; not run here)']]);
})();
