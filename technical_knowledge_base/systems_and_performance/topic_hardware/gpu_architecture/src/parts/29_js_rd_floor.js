// ---- Reading s9: any two chips compared as a table (the plans per GPC below also drive Fig. 3, 43_js_sc_gen.js) ----
(function(){
  const G=window.GA,$=id=>document.getElementById(id),C=id=>G.chips.find(c=>c.id===id);
  // SMs per GPC: [full, enabled]; which GPC loses SMs is illustrative (not published)
  const PLAN=window.GA_PLAN={
    a100:{dies:[{gpcs:[[16,16],[16,16],[16,16],[16,15],[16,15],[16,15],[16,15],[16,0]]}],mem:{kind:'hbm',sites:6,on:5},l2:'40 MB L2 (two partitions)',l2s:'40 MB L2'},
    h100:{dies:[{gpcs:[[18,18],[18,16],[18,16],[18,16],[18,16],[18,18],[18,16],[18,16]]}],mem:{kind:'hbm',sites:6,on:5},l2:'50 MB L2 (60 MB on the full die)',l2s:'50 MB L2'},
    b200:{dies:[{gpcs:[[19,19],[18,18],[19,19],[18,18]]},{gpcs:[[19,19],[18,18],[19,19],[18,18]]}],mem:{kind:'hbm',sites:8,on:8},l2:'L2 size n/s (4 partitions, independent paper)',l2s:'L2: size n/s',unk:'148 SMs in 8 GPCs from an independent paper; how they split across GPCs and dies, and how many SMs the full dies have, is not published (drawn evenly).'},
    b300:{dies:[{gpcs:[[20,20],[20,20],[20,20],[20,20]]},{gpcs:[[20,20],[20,20],[20,20],[20,20]]}],mem:{kind:'hbm',sites:8,on:8},l2:'L2 size n/s',unk:'NVIDIA describes 160 SMs in 8 GPCs; the split per die and how many a shipping B300 enables are not stated (drawn evenly, all enabled).'},
    rubin:{dies:[{flat:112},{flat:112}],mem:{kind:'none'},l2:'"large centralized L2", size n/s',l2s:'L2: size n/s',unk:'224 SMs on two dies; GPCs, L2 size and HBM4 stack count are not stated, so SMs are drawn as one block per die and no stacks are drawn.'},
    rtx5090:{dies:[{gpcs:[[16,16],[16,16],[16,16],[16,16],[16,16],[16,15],[16,15],[16,15],[16,15],[16,15],[16,15],[16,0]]}],mem:{kind:'gddr',n:16},l2:'96 MB L2 (128 MB on the full die)',l2s:'96 MB L2'}
  };
  const ids=['a100','h100','b200','b300','rubin','rtx5090'];
  ['fl-a','fl-b'].forEach((s,j)=>{$(s).innerHTML=ids.map(id=>'<option value="'+id+'"'+((j===0&&id==='h100')||(j===1&&id==='b200')?' selected':'')+'>'+C(id).name+'</option>').join('')});
  const rowsDef=[['Architecture',c=>c.arch],['Year',c=>c.year],['Compute capability',c=>c.cc||'n/s'],['Dies',c=>c.dies],['GPCs enabled (full die)',c=>(c.gpc_on!=null?c.gpc_on:'n/s')+(c.gpc_full!=null?' ('+c.gpc_full+')':'')],
    ['SMs enabled (full die)',c=>(c.sm_on!=null?c.sm_on:'n/s')+(c.sm_full!=null?' ('+c.sm_full+')':'')],['Tensor cores per SM',c=>c.tc_sm],['FP32 lanes per SM',c=>c.fp32_sm!=null?c.fp32_sm:'n/s'],
    ['L1 + shared per SM, KB',c=>c.l1_kb!=null?c.l1_kb:'n/s'],['Max shared per SM, KB',c=>c.smem_kb!=null?c.smem_kb:'n/s'],['L2, MB',c=>c.l2_mb!=null?c.l2_mb:'n/s'],
    ['Memory',c=>c.gb+' GB '+c.mem],['Stacks (sites)',c=>c.stacks_on!=null?c.stacks_on+(c.stacks_full!==c.stacks_on?' of '+c.stacks_full:''):'n/a or n/s'],['Memory controllers',c=>c.mc],['Bandwidth, TB/s',c=>c.tbs],
    ['Process',c=>c.node],['Transistors, billions',c=>c.xtors],['Die area, mm²',c=>c.area!=null?c.area:(c.dies>1?'n/s (two reticle-sized dies)':'n/s')]];
  function render(){
    const a=$('fl-a').value,b=$('fl-b').value,A=C(a),B=C(b);
    $('fl-na').textContent=A.name+': '+(PLAN[a].unk||'Which SMs, GPCs and stack sites are disabled varies from chip to chip; positions are illustrative, counts are published.');
    $('fl-nb').textContent=B.name+': '+(PLAN[b].unk||'Which SMs, GPCs and stack sites are disabled varies from chip to chip; positions are illustrative, counts are published.');
    $('fl-table').innerHTML='<thead><tr><th></th><th class="num">'+A.name+'</th><th class="num">'+B.name+'</th></tr></thead><tbody>'+rowsDef.map(r=>{const va=String(r[1](A)),vb=String(r[1](B));const d=va!==vb?' diff':'';return '<tr><td>'+r[0]+'</td><td class="num'+d+'">'+va+'</td><td class="num'+d+'">'+vb+'</td></tr>'}).join('')+'</tbody>';
  }
  $('fl-a').addEventListener('change',render);$('fl-b').addEventListener('change',render);
  RD.onRender(render);render();
  RD.onResize(render);
})();
