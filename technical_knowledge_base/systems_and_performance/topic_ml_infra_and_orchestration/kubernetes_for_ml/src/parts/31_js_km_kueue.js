// ---- Kueue admission tab (t-kmq): replays recorded Workloads ----
window.KMQ=(function(){
  const K=window.KM,$=id=>document.getElementById(id),E=RD.esc;if(!$('km-q-card'))return {};
  const QUOTA={flavors:[['km-b1',8,'block b1: worker, worker2'],['km-b2',4,'block b2: worker3']],tas:[['km-tas',12,'all three workers, topology km-topo']]};
  const BLOCKS=[['b1',['mi-kind-worker','mi-kind-worker2']],['b2',['mi-kind-worker3']]];
  const WN={'mi-kind-worker':'worker','mi-kind-worker2':'worker2','mi-kind-worker3':'worker3'};
  let mode='flavors',steps=[];
  const gpus=w=>w.podsets[0].count*Number(w.podsets[0].req['example.com/gpu']);
  const short=n=>n.replace(/^job-(km-\w+)-\w+$/,'$1');
  function hosts(topo){if(!topo)return {};const out={};topo.slices.forEach(s=>{const v=s.valuesPerLevel[0].individual,pc=s.podCounts;
    v.roots.forEach((r,i)=>{out[v.prefix+r]=pc.individual?pc.individual[i]:pc.universal})});return out}
  function load(){const W=(mode==='flavors'?K.kueue.flavors:K.kueue.tas).slice().sort((a,b)=>a.name<b.name?-1:1);steps=[];
    const used={};QUOTA[mode].forEach(q=>used[q[0]]=0);
    W.forEach((w,wi)=>{const g=gpus(w),ps=w.podsets[0];const ann=ps.ann?Object.entries(ps.ann)[0]:null;
      if(mode==='tas')QUOTA.tas.forEach(q=>used[q[0]]=0);  // the TAS jobs ran one at a time
      steps.push({wi,kind:'new',w,g,used:{...used},c:short(w.name)+' arrives: '+ps.count+' pods x '+ps.req['example.com/gpu']+' GPUs = '+g+' GPUs'+(ann?', annotation '+ann[0].replace('kueue.x-k8s.io/','')+': '+ann[1]:'')+'. Kueue made it suspended; it is a Workload in the queue.'});
      if(mode==='flavors'){for(const q of QUOTA.flavors){const fits=used[q[0]]+g<=q[1];
          steps.push({wi,kind:'try',w,g,fl:q[0],used:{...used},fits,c:'Try flavor '+q[0]+' ('+q[2]+'): '+used[q[0]]+' of '+q[1]+' GPUs used, needs '+g+(fits?': fits.':': '+(used[q[0]]+g-q[1])+' more needed.')});
          if(fits)break}}
      else steps.push({wi,kind:'try',w,g,fl:'km-tas',used:{...used},fits:w.admitted,c:'Quota: '+used['km-tas']+' of 12 GPUs used, needs '+g+': fits. Then topology: '+(ann&&/required/.test(ann[0])?'all '+ps.count+' pods must fit inside one block.':'prefer one block, else the fewest domains.')});
      if(w.admitted){const fl=w.flavors['example.com/gpu'];used[fl]+=g;const H=hosts(w.topo);
        steps.push({wi,kind:'adm',w,g,used:{...used},H,c:'Admitted to '+w.cq+' with flavor '+fl+'. '+(mode==='flavors'?'Kueue injects the flavor\'s labels into the pod template (nodeSelector mi.example.com/block: '+(fl==='km-b1'?'b1':'b2')+') and unsuspends the Job.':'Kueue assigns pods to hosts and pins each pod with a nodeSelector on kubernetes.io/hostname: '+Object.entries(H).map(([h,n])=>WN[h]+' x'+n).join(', ')+'.')})}
      else steps.push({wi,kind:'no',w,g,used:{...used},c:'Not admitted. Message on the Workload: "'+w.msg+'"'})});}
  function draw(i){const s=steps[i],W=(mode==='flavors'?K.kueue.flavors:K.kueue.tas).slice().sort((a,b)=>a.name<b.name?-1:1);
    $('km-q-wl').innerHTML=W.map((w,k)=>{const done=steps.slice(0,i+1).some(x=>x.wi===k&&(x.kind==='adm'||x.kind==='no'));
      return '<div class="'+(k===s.wi?'cur ':'')+(done?(w.admitted?'ok':'no'):'')+'"><b>'+short(w.name)+'</b><br>'+w.podsets[0].count+' x '+w.podsets[0].req['example.com/gpu']+' GPUs'+(done?(w.admitted?'<br>admitted: '+w.flavors['example.com/gpu']:'<br>waiting'):'')+'</div>'}).join('');
    let v='<div class="qb">';QUOTA[mode].forEach(q=>{const u=s.used[q[0]],add=(s.kind==='try'&&s.fl===q[0])?s.g:0,tot=q[1];
      v+='<div class="row"><span>'+q[0]+' GPUs</span><span class="tr"><span class="fi" style="left:0;width:'+(Math.min(u,tot)/tot*100)+'%;background:var(--c1)"></span>'+
        (add?'<span class="fi" style="left:'+(Math.min(u,tot)/tot*100)+'%;width:'+(Math.min(add,Math.max(0,tot-u))/tot*100)+'%;background:'+(u+add<=tot?'var(--good)':'var(--bad)')+';opacity:.7"></span>':'')+'</span><span class="v">'+u+(add?' + '+add:'')+' / '+tot+'</span></div>'});v+='</div>';
    if(mode==='tas'){const H=s.kind==='adm'?s.H:{},req=/required/.test(Object.keys(s.w.podsets[0].ann||{})[0]||''),per=Number(s.w.podsets[0].req['example.com/gpu']);
      v+='<div class="topo">'+BLOCKS.map(([b,hs])=>{const cap=hs.length*4,fitsPods=hs.reduce((a,h)=>a+Math.floor(4/per),0);
        const cls=s.kind==='try'||s.kind==='no'?(req?(fitsPods>=s.w.podsets[0].count?'ok':'bad'):''):'';
        return '<div class="blk '+cls+'"><b>block '+b+'</b> <span class="small mute">'+cap+' GPUs, room for '+fitsPods+' of these pods</span><div class="hosts">'+hs.map(h=>{const n=H[h]||0;
          return '<div class="host">'+WN[h]+'<div class="sl">'+[0,1,2,3].map(j=>'<i class="'+(j<n*per?'u':'')+'"></i>').join('')+'</div></div>'}).join('')+'</div></div>'}).join('')+'</div>'}
    $('km-q-viz').innerHTML=v;$('km-q-cap').innerHTML='<div class="t">'+short(s.w.name)+', step '+(i+1)+' of '+steps.length+'</div>'+E(s.c)}
  load();const A=RD.anim({card:'km-q-card',ctl:'km-q-ctl',n:steps.length,draw,ms:1700,label:'Admission step'});
  RD.seg($('km-q-mode'),m=>{mode=m;load();A.reset(steps.length)});
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-kmq']=[()=>A.redraw()];
  return {steps:()=>steps};
})();
