// ---- Fair-share stepper tab: editable threads, CFS (5.10) and EEVDF (6.12) on one CPU ----
(function(){
  const $=id=>document.getElementById(id);if(!$('sc-f-card'))return;
  const F=window.FAIR,V=window.FAIRVIEW,esc=RD.esc,f=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const PRE={
    loader:F.SCEN.loader.tasks,
    nice5:F.SCEN.nice5.tasks,
    three:F.SCEN.three.tasks,
    nine:Array.from({length:9},(_,i)=>({name:'t'+(i+1),nice:0})),
    burst:[{name:'hog',nice:0},{name:'sleeper1',nice:0,run:1000,sleep:3000,start:500},{name:'sleeper2',nice:0,run:2500,sleep:2500,start:800}]};
  let tasks=JSON.parse(JSON.stringify(PRE.loader)),pol='cfs',res={},der={};
  const factorOf=c=>1+Math.floor(Math.log2(Math.min(c,8)));
  function table(){const t=$('sc-f-tasks');
    t.innerHTML='<thead><tr><th>name</th><th>kind</th><th>nice (weight)</th><th>run, us</th><th>sleep, us</th><th>first wake, us</th><th>EEVDF slice, us</th><th></th></tr></thead><tbody>'+
      tasks.map((k,i)=>{const busy=k.run==null;return '<tr data-i="'+i+'"><td><input data-k="name" value="'+esc(k.name)+'" aria-label="name"></td>'+
        '<td><select data-k="kind" aria-label="kind"><option value="busy"'+(busy?' selected':'')+'>busy loop</option><option value="per"'+(busy?'':' selected')+'>periodic</option></select></td>'+
        '<td><select data-k="nice" aria-label="nice">'+Array.from({length:40},(_,j)=>j-20).map(n=>'<option value="'+n+'"'+((k.nice||0)===n?' selected':'')+'>'+n+' ('+F.WEIGHT[n]+')</option>').join('')+'</select></td>'+
        '<td><input data-k="run" type="number" min="50" max="20000" step="50" value="'+(busy?'':k.run)+'"'+(busy?' disabled':'')+' aria-label="run"></td>'+
        '<td><input data-k="sleep" type="number" min="50" max="50000" step="50" value="'+(busy?'':k.sleep)+'"'+(busy?' disabled':'')+' aria-label="sleep"></td>'+
        '<td><input data-k="start" type="number" min="0" max="50000" step="50" value="'+(busy?'':(k.start||0))+'"'+(busy?' disabled':'')+' aria-label="first wake"></td>'+
        '<td><input data-k="slice" type="number" min="100" max="100000" step="50" placeholder="default" value="'+(k.slice||'')+'" aria-label="slice"></td>'+
        '<td><button data-del="'+i+'" aria-label="remove"'+(tasks.length<2?' disabled':'')+'>×</button></td></tr>'}).join('')+'</tbody>';
    $('sc-f-add').disabled=tasks.length>=5}
  $('sc-f-tasks').addEventListener('change',e=>{const tr=e.target.closest('tr[data-i]');if(!tr)return;const k=tasks[+tr.dataset.i],key=e.target.dataset.k,v=e.target.value;
    if(key==='name')k.name=(v||'t').slice(0,12);
    else if(key==='kind'){if(v==='busy'){delete k.run;delete k.sleep;delete k.start}else{k.run=500;k.sleep=3500;k.start=1000}}
    else if(key==='nice')k.nice=+v;
    else if(key==='slice'){if(v==='')delete k.slice;else k.slice=Math.max(100,Math.min(100000,+v||750))}
    else{const lim={run:[50,20000],sleep:[50,50000],start:[0,50000]}[key];k[key]=Math.max(lim[0],Math.min(lim[1],Math.round(+v||lim[0])))}
    clearPreset();table();rerun()});
  $('sc-f-tasks').addEventListener('click',e=>{const b=e.target.closest('button[data-del]');if(!b)return;tasks.splice(+b.dataset.del,1);clearPreset();table();rerun()});
  $('sc-f-add').addEventListener('click',()=>{if(tasks.length>=5)return;tasks.push({name:'t'+(tasks.length+1),nice:0,run:600,sleep:2400,start:700});clearPreset();table();rerun()});
  const clearPreset=()=>$('sc-f-preset').querySelectorAll('button').forEach(b=>b.classList.remove('on'));
  RD.seg($('sc-f-preset'),m=>{tasks=JSON.parse(JSON.stringify(PRE[m]));if(m==='nine')$('sc-f-hz').value='100000';if(m==='nice5')$('sc-f-hz').value='100000';table();rerun()});
  ['sc-f-cpus','sc-f-hz'].forEach(id=>$(id).addEventListener('change',rerun));
  let an=null;
  function draw(i){const r=res[pol];if(!r)return;i=Math.min(i,r.snaps.length-1);V.draw($('sc-f-svg'),r,i,{derived:der[pol],horizon:+$('sc-f-hz').value,span:pol==='eevdf'?[-8,8]:[-12,8]});
    $('sc-f-cap').innerHTML=V.caption(r,i);$('sc-f-cnt').innerHTML=V.counters(r,i,der[pol])}
  function rerun(){const fac=factorOf(+$('sc-f-cpus').value),hz=+$('sc-f-hz').value;
    if(tasks.length>5)tasks=tasks.slice(0,5);const seen={};tasks.forEach((t,i)=>{if(seen[t.name])t.name=t.name+'_'+(i+1);seen[t.name]=1});
    ['cfs','eevdf'].forEach(p=>{res[p]=F.simulate(p,tasks.map(t=>Object.assign({},t)),hz,fac);der[p]=V.derive(res[p])});
    $('sc-f-tun').innerHTML='Tunables for factor '+fac+': CFS latency '+f(6*fac)+' ms, min_granularity '+f(0.75*fac,2)+' ms, wake-up granularity '+f(fac)+' ms, sleeper credit '+f(3*fac)+' ms; EEVDF base slice '+f(0.75*fac,2)+' ms.';
    const tw=tasks.reduce((s,t)=>s+F.WEIGHT[t.nice||0],0);
    const rows=tasks.map((t,j)=>{const c=res.cfs,e=res.eevdf,wc=(c.waits[t.name]||[]),we=(e.waits[t.name]||[]),mean=a=>a.length?f(a.reduce((x,y)=>x+y,0)/a.length/1000,2):'',mx=a=>a.length?f(Math.max(...a)/1000,2):'';
      return '<tr><td>'+esc(t.name)+'</td><td class="num">'+F.WEIGHT[t.nice||0]+'</td><td class="num">'+(t.run==null?f(F.WEIGHT[t.nice||0]/tw*100,1)+'%':'')+'</td><td class="num">'+f((c.cpu[t.name]||0)/hz*100,1)+'%</td><td class="num">'+f((e.cpu[t.name]||0)/hz*100,1)+'%</td><td class="num">'+(t.run==null?'':mean(wc)+' / '+mx(wc))+'</td><td class="num">'+(t.run==null?'':mean(we)+' / '+mx(we))+'</td></tr>'});
    $('sc-f-sum').innerHTML='<table class="tbl-sm"><thead><tr><th>thread</th><th class="num">weight</th><th class="num">weight share (if all busy)</th><th class="num">CPU, CFS</th><th class="num">CPU, EEVDF</th><th class="num">wake wait, CFS: mean / max ms</th><th class="num">wake wait, EEVDF: mean / max ms</th></tr></thead><tbody>'+rows.join('')+'</tbody></table>';
    $('sc-f-sumnote').textContent='Involuntary switches in '+f(hz/1000)+' ms: CFS '+res.cfs.switches+', EEVDF '+res.eevdf.switches+'. Shares over a short window differ from the weight share by up to a slice; lengthen the run to see them converge.';
    if(an){an.reset(res[pol].snaps.length)}}
  table();rerun();
  an=RD.anim({card:'sc-f-card',ctl:'sc-f-ctl',n:res.cfs.snaps.length,draw,ms:800,label:'Scheduling step'});
  RD.seg($('sc-f-pol'),m=>{pol=m;an.reset(res[m].snaps.length);an.play()});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-fair']=window.TAB_RENDER['t-fair']||[]).push(()=>an.redraw());
  addEventListener('resize',()=>{const t=$('t-fair');if(t&&!t.hidden)an.redraw()});
})();
