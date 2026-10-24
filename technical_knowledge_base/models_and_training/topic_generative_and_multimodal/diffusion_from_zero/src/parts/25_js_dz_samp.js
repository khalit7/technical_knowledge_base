// ---- Section 5: the sampler workbench (moved from its own tab into the Reading flow on 2026-10-24) ----
(function(){
  const D=window.DZ;if(!D||!document.getElementById('dz-sw-cv'))return;
  const S=D.samplers,model={m4:D.samp.m4,m8:D.samp.m8};
  const st={m:'m4',s:'ddpm',n:50,metric:'fd'};
  const segS=document.getElementById('dz-sw-s'),segN=document.getElementById('dz-sw-n');
  segS.innerHTML=S.map(s=>'<button data-m="'+s.key+'"'+(s.key===st.s?' class="on"':'')+'>'+RD.esc(s.label)+'</button>').join('');
  function stepsOf(){const r=model[st.m][st.s]||{};return Object.keys(r).map(Number).sort((a,b)=>a-b)}
  function buildN(){const ns=stepsOf();if(!ns.includes(st.n))st.n=ns.includes(50)?50:ns[ns.length-1];
    segN.innerHTML=ns.map(n=>'<button data-m="'+n+'"'+(n===st.n?' class="on"':'')+'>'+DZC.f(n)+'</button>').join('')}
  function buildS(){segS.querySelectorAll('button').forEach(b=>{b.disabled=!model[st.m][b.dataset.m];b.classList.toggle('on',b.dataset.m===st.s)})}
  const img=new Image();
  function strip(){const r=model[st.m][st.s][st.n];const cv=document.getElementById('dz-sw-cv');
    if(!r||!D.strips[r.strip]){cv.width=280;cv.height=28;cv.getContext('2d').clearRect(0,0,280,28);return}
    img.onload=()=>{cv.width=img.width;cv.height=img.height;cv.getContext('2d').drawImage(img,0,0)};img.src=D.strips[r.strip]}
  function counters(){const r=model[st.m][st.s][st.n];const lab=S.find(s=>s.key===st.s);
    document.getElementById('dz-sw-cnt').innerHTML=RD.stat('FD',DZC.f(r.fd,1),'real images '+D.f.floor)+RD.stat('Class accuracy',DZC.pct(r.acc,1),'real '+D.f.real_acc)+
      RD.stat('Diversity',DZC.f(r.div,2),'real '+D.f.real_div)+RD.stat('Network calls',DZC.f(r.nfe),r.sec!=null?DZC.f(r.sec,1)+' s for 1,000 images':'')+
      RD.stat('Source',r.src==='lab'?'root lab recording':'this page','sample_tiny.py / dz_sample.py');
    document.getElementById('dz-sw-note').textContent=lab.note||''}
  function chart(){const m=st.metric,ser=S.filter(s=>model[st.m][s.key]).map(s=>({name:s.label,color:s.color,dash:s.dash,
      pts:Object.entries(model[st.m][s.key]).map(([n,r])=>[r.nfe,m==='acc'?100*r.acc:r[m]]).sort((a,b)=>a[0]-b[0])}));
    const hl=S.find(s=>s.key===st.s).label;
    DZC.chart({el:document.getElementById('dz-sw-chart'),series:ser,xlog:true,ylog:m==='fd',xlab:'network calls (log scale)',ylab:m==='fd'?'FD (log scale)':m==='acc'?'class accuracy, %':'diversity',hl,
      hlines:m==='fd'?[{y:D.num.floor,label:'1,000 real images'}]:m==='acc'?[{y:100*D.num.real_acc,label:'real images'}]:[{y:D.num.real_div,label:'real images'}]});
    DZC.legend(document.getElementById('dz-sw-leg'),ser)}
  function walks(){const w=D.walks;document.getElementById('dz-sw-walks').innerHTML='<table><thead><tr><th>Scheduler</th><th>Timesteps called</th></tr></thead><tbody>'+
    Object.entries(w).map(([k,v])=>'<tr><td>'+RD.esc(v.label)+'</td><td style="overflow-wrap:anywhere">'+v.t.join(', ')+'</td></tr>').join('')+'</tbody></table>'}
  function all(){buildS();buildN();strip();counters();chart()}
  segS.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;st.s=b.dataset.m;all()});
  segN.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.n=+b.dataset.m;all()});
  RD.seg(document.getElementById('dz-sw-model'),m=>{st.m=m;if(!model[m][st.s])st.s='ddpm';all()});
  RD.seg(document.getElementById('dz-sw-metric'),m=>{st.metric=m;chart()});
  walks();RD.onRender(all);RD.onResize(chart);
})();
