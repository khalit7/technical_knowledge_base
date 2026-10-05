// ---- Report reader tab: NVIDIA's sample Nsight Compute reports, before and after, section by section ----
(function(){
  const N=PCD.ncu,f=MC.fmtN,esc=RD.esc;let k=0;
  const head=document.getElementById('nc-head'),stats=document.getElementById('nc-stats'),body=document.getElementById('nc-body'),lab=document.getElementById('nc-lab');
  const num=v=>{const x=+String(v).replace(/,/g,'');return isFinite(x)&&String(v).trim()!==''?x:null};
  function hdr(r,cls){const s=r.session,m=r.kernel.match(/^(.*?) \((\d+, \d+, \d+)\)x\((\d+, \d+, \d+)\)/);const clk=+r.raw['gpc__cycles_elapsed.avg.per_second'][0],u=r.raw['gpc__cycles_elapsed.avg.per_second'][1];
    return '<div class="'+cls+'"><b>'+(cls==='b'?'Before: ':'After: ')+esc(r.stem)+'</b><br><span class="mn">'+esc(m?m[1]:r.kernel)+'</span><br>grid ('+(m?m[2]:'')+') &times; block ('+(m?m[3]:'')+'), '+f(+r.raw['launch__registers_per_thread'][0],0)+' registers per thread<br>'+
      esc(s.display_name||'')+', CC '+esc(s.compute_capability_major||'')+'.'+esc(s.compute_capability_minor||'')+', '+esc(s.multiprocessor_count||'')+' SMs; CUDA '+esc(s['CUDA Version']||'')+', driver '+esc(s['Display Driver Version']||'')+'; profiled '+esc(s.Created||'')+' with Nsight Compute '+esc((s['Nsight Compute Target']||'').split(' ')[0])+
      '<br>SM clock during profiling '+f(u==='Mhz'?clk/1000:clk,2)+' GHz (device maximum '+f(+r.raw['device__attribute_max_gpu_frequency_khz'][0]/1e6,2)+' GHz); '+f(+r.raw['profiler__replayer_passes'][0],0)+' replay passes</div>'}
  function rowsOf(r,sec){const s=r.sections.find(x=>x.name===sec);return s||{tables:[],rules:[]}}
  function table(b,a,sec){const sb=rowsOf(b,sec),sa=rowsOf(a,sec);let h='';
    const titles=[...new Set(sb.tables.map(t=>t.title||'').concat(sa.tables.map(t=>t.title||'')))];
    titles.forEach(ti=>{const tb=sb.tables.find(t=>(t.title||'')===ti),ta=sa.tables.find(t=>(t.title||'')===ti);const labels=[];[tb,ta].forEach(t=>t&&t.rows.forEach(r=>{if(!labels.includes(r[0]))labels.push(r[0])}));
      const g=(t,l)=>{if(!t)return null;const r=t.rows.find(x=>x[0]===l);return r?r:null};
      h+=(ti?'<div class="small" style="margin-top:6px"><b>'+esc(ti)+'</b>'+((tb&&tb.cut)||(ta&&ta.cut)?' <span class="mute">(first rows only)</span>':'')+'</div>':'')+'<div class="tw"><table class="tbl-sm"><thead><tr><th>Metric</th><th>Unit</th><th class="num">Before</th><th class="num">After</th><th class="num">Change</th></tr></thead><tbody>'+
      labels.map(l=>{const rb=g(tb,l),ra=g(ta,l),du=rb&&ra&&rb[1]!==ra[1],vb=rb?rb[2]+(du?' '+rb[1]:''):'',va=ra?ra[2]+(du?' '+ra[1]:''):'',nb=du?null:num(rb?rb[2]:''),na=du?null:num(ra?ra[2]:'');let ch='',cls='';
        if(nb!=null&&na!=null&&nb!==0){const r=na/nb;ch=r>=10||r<=0.1?f(r,r>=10?0:3)+'&times;':(r>=1?'+':'')+f((r-1)*100,0)+'%';cls=Math.abs(r-1)<0.02?'':''}
        const mname=N.labels[l];return '<tr><td class="lab">'+(mname?'<span data-mn="'+esc(mname)+'" tabindex="0">'+esc(l)+'</span>':esc(l))+'</td><td>'+(du?'':esc((rb||ra||['',''])[1]))+'</td><td class="num">'+esc(vb)+'</td><td class="num">'+esc(va)+'</td><td class="num">'+ch+'</td></tr>'}).join('')+'</tbody></table></div>'});
    const rl=(r,w)=>r.rules.map(x=>'<div class="rule '+x.kind+'"><span class="k">'+w+' &middot; '+x.kind+(x.speedup?' &middot; '+esc(x.speedup):'')+'</span>'+esc(x.text)+'</div>').join('');
    return h+rl(sb,'before')+rl(sa,'after')}
  function draw(){
    const p=NCU.PAIRS[k],B=NCU.byStem(p.b),A=NCU.byStem(p.a),D=NCU.pairData(k);
    head.innerHTML=hdr(B,'b')+hdr(A,'a');
    stats.innerHTML=RD.stat('Duration',(D.db>=1000?f(D.db/1000,3)+' ms':f(D.db,2)+' us')+' &rarr; '+(D.da>=1000?f(D.da/1000,3)+' ms':f(D.da,2)+' us'),f((1-D.da/D.db)*100,1)+'% less time')+
      RD.stat('Compute (SM)',f(D.cb,1)+'% &rarr; '+f(D.ca,1)+'%','Speed of Light')+RD.stat('Memory',f(D.mb,1)+'% &rarr; '+f(D.ma,1)+'%','Speed of Light')+
      RD.stat('Rule estimate before',D.est!=null?f(D.est,2)+'%':'none',D.rule?esc(D.rule.text.slice(0,60))+'...':'');
    const secs=[...new Set(B.sections.map(s=>s.name).concat(A.sections.map(s=>s.name)))];
    body.innerHTML=secs.map((s,i)=>'<details class="sec"'+(i<1?' open':'')+'><summary>'+esc(s)+'</summary><div class="in">'+table(B,A,s)+'</div></details>').join('');
    lab.innerHTML='Tap a dotted metric label to see the metric behind it.';
  }
  body.addEventListener('click',e=>{const sp=e.target.closest('[data-mn]');if(!sp)return;lab.innerHTML='<b>'+esc(sp.textContent)+'</b> is <code class="mn">'+esc(sp.dataset.mn)+'</code> (from NVIDIA\'s section files).'});
  document.getElementById('nc-pair').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;document.querySelectorAll('#nc-pair button').forEach(x=>x.classList.toggle('on',x===b));k=+b.dataset.m;draw()});
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-ncu']=[draw];
  draw();
})();
