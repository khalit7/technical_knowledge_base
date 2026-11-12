// ---- Reading section 6: the measured tables beside grain's batching (the batches themselves are the 3D stage in 44_js_sc_grain.js) ----
(function(){
  const U=TSU,D=U.D,G=D.grain;if(!G||!document.getElementById('dg-more'))return;
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
