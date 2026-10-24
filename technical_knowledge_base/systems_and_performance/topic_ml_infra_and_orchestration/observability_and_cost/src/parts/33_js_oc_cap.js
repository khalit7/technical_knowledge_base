// ---- Capacity planner tab UI (engine OCP in 16_js_oc_plan.js) ----
(function(){
  const $=id=>document.getElementById(id);if(!$('oc-cp-card'))return;
  const P=OCP,B=(window.OC&&OC.buy)||{},PR=(window.OC&&OC.prices)||[];
  const f0=(x,d)=>x.toLocaleString('en-US',{maximumFractionDigits:d||0,minimumFractionDigits:d||0});
  const big=x=>x>=1e6?f0(x/1e6,2)+'M':x>=1e3?f0(x/1e3,1)+'K':f0(x);
  const usd=x=>'$'+(x>=1e9?f0(x/1e9,2)+'B':x>=1e6?f0(x/1e6,1)+'M':f0(x));
  $('oc-cp-model').innerHTML=Object.keys(P.MODELS).map(k=>'<option value="'+k+'">'+P.MODELS[k][0]+'</option>').join('');
  const res=PR.filter(p=>p.gpu==='H100'&&/reserved/.test(p.kind)),od=PR.filter(p=>p.gpu==='H100'&&/on-demand/.test(p.kind));
  $('oc-cp-res').innerHTML=res.map((p,i)=>'<option value="'+i+'"'+(/Capacity Block/.test(p.kind)?' selected':'')+'>'+p.provider+' '+p.kind+': $'+p.usd.toFixed(2)+'</option>').join('');
  $('oc-cp-od').innerHTML=od.map((p,i)=>'<option value="'+i+'"'+(p.provider==='AWS'?' selected':'')+'>'+p.provider+' '+p.kind+': $'+p.usd.toFixed(2)+'</option>').join('');
  const set=(id,v)=>{$(id).value=v};
  set('oc-cp-tok',15.6);set('oc-cp-mfu',40);set('oc-cp-rate',P.LLAMA_RATE.toFixed(3));set('oc-cp-stall',60);set('oc-cp-rs',10);set('oc-cp-dl',90);
  set('oc-cp-runs',1);set('oc-cp-extra',50);set('oc-cp-sched',85);
  set('oc-cp-capex',B.capex_gpu);set('oc-cp-net',B.net*100);set('oc-cp-life',B.life_y);set('oc-cp-kw',B.kw_gpu);set('oc-cp-load',B.load*100);set('oc-cp-pue',B.pue);set('oc-cp-kwh',B.usd_kwh);set('oc-cp-ops',B.ops*100);
  $('oc-cp-capex-src').textContent=B.capex_src||'';$('oc-cp-life-src').textContent=B.life_src||'';$('oc-cp-kw-src').textContent=B.kw_src||'';$('oc-cp-pue-src').textContent=B.pue_src||'';$('oc-cp-kwh-src').textContent=B.kwh_src||'';
  $('oc-cp-model').addEventListener('change',()=>{set('oc-cp-tok',P.MODELS[$('oc-cp-model').value][2]);calc()});
  const num=id=>{const v=parseFloat($(id).value);return isFinite(v)?v:0};
  let last=null;
  function calc(){const m=P.MODELS[$('oc-cp-model').value],rv=res[+$('oc-cp-res').value]||{usd:5.97},ov=od[+$('oc-cp-od').value]||{usd:6.88};
    const k={params:m[1],tokens_t:Math.max(.01,num('oc-cp-tok')),gpu:$('oc-cp-gpu').value,mfu:Math.max(.01,num('oc-cp-mfu')/100),price:rv.usd,rate_k:num('oc-cp-rate'),stall_s:num('oc-cp-stall'),restart_min:num('oc-cp-rs'),idle:0};
    const dl=Math.max(1,num('oc-cp-dl')),n=P.gpusFor(dl,k);
    if(!n){$('oc-cp-out1').innerHTML=RD.stat('GPUs for the deadline','none','no count up to 200,000 GPUs meets it: failures grow with size faster than the run shrinks');$('oc-cp-out2').innerHTML='';$('oc-cp-out3').innerHTML='';$('oc-cp-svg').innerHTML='';$('oc-cp-cap').textContent='';return}
    const r=P.runYD(k,n);
    $('oc-cp-out1').innerHTML=RD.stat('GPUs for '+f0(dl)+' days',f0(n),'smallest multiple of 8 that meets it')+RD.stat('Wall-clock',f0(r.wall_days,1)+' days','goodput '+f0(r.goodput*100,1)+'%')+
      RD.stat('Job MTBF',f0(r.mtbf_h,2)+' h','checkpoint every '+Math.round(r.yd_min)+' min (Young/Daly)')+RD.stat('Paid GPU-hours',big(r.paid_h),'ideal '+big(r.ideal_h)+'; at the reserved price '+usd(r.cost));
    const fl=P.fleet(n,r.paid_h,Math.max(0,num('oc-cp-runs')),num('oc-cp-extra')/100,Math.min(1,Math.max(.3,num('oc-cp-sched')/100)));
    $('oc-cp-out2').innerHTML=RD.stat('GPU-hours demanded a year',big(fl.demand_h),'main runs and everything else')+RD.stat('GPUs the hours need',f0(Math.ceil(fl.by_hours)),'demand / (8,760 h x scheduling efficiency)')+
      RD.stat('Fleet',f0(fl.gpus)+' GPUs',fl.binding==='deadline'?'set by the deadline run: the rest of the year has spare hours':'set by the year’s hours, not by the big run');
    const b={capex_gpu:num('oc-cp-capex'),net:num('oc-cp-net')/100,life_y:Math.max(.5,num('oc-cp-life')),kw_gpu:num('oc-cp-kw'),load:num('oc-cp-load')/100,pue:Math.max(1,num('oc-cp-pue')),usd_kwh:num('oc-cp-kwh'),ops:num('oc-cp-ops')/100};
    const o=P.own(b),fu=Math.min(1,fl.demand_h/(fl.gpus*8760)),be=o.per_hour/ov.usd;
    $('oc-cp-out3').innerHTML=RD.stat('Owned, per GPU-year',usd(o.annual),'capital '+usd(o.capital)+', energy '+usd(o.energy)+', ops '+usd(o.ops))+
      RD.stat('Owned, per calendar hour','$'+f0(o.per_hour,2),'paid whether used or not, like a reservation ($'+rv.usd.toFixed(2)+')')+
      RD.stat('Fleet busy share',f0(fu*100,0)+'%','this plan’s GPU-hours over the fleet’s')+
      RD.stat('Owning beats on-demand above',f0(be*100,0)+'% busy','$'+f0(o.per_hour,2)+' / $'+ov.usd.toFixed(2))+
      RD.stat('Fleet for a year',usd(fl.gpus*o.annual)+' owned','against '+usd(fl.gpus*rv.usd*8760)+' reserved; buying it costs '+usd(fl.gpus*b.capex_gpu*(1+b.net))+' up front');
    last={o,rv,ov,fu};draw()}
  function draw(){if(!last)return;const {o,rv,ov,fu}=last;
    $('oc-cp-cap').innerHTML='Cost per <b>useful</b> GPU-hour: owned and reserved capacity cost the same every hour, so their price per useful hour is the hourly cost divided by the share that does useful work; on-demand is flat but has no guaranteed capacity for a multi-node run. Owned comes to <b>$'+(o.per_hour/Math.max(fu,.01)).toFixed(2)+'</b> per useful hour at this plan’s '+Math.round(fu*100)+'% busy share, reserved to <b>$'+(rv.usd/Math.max(fu,.01)).toFixed(2)+'</b>. Every point of utilisation the dashboards win back lowers both. <span class="oc-der">derived</span> The curve against the busy share is drawn in Reading section 10.';
  }
  document.querySelectorAll('#oc-cp-card input,#oc-cp-card select').forEach(e=>{e.addEventListener('input',calc);e.addEventListener('change',calc)});
  calc();
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-cap']=window.TAB_RENDER['t-cap']||[]).push(draw);
  addEventListener('resize',()=>{if(!$('t-cap').hidden)draw()});
})();
