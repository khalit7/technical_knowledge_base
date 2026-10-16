// ---- Capacity planner: run -> fleet -> own or rent. Same formulas as src/scripts/recompute.py ----
window.OCP=(function(){
  const PEAK={h100:989.5e12,b200:2250e12};
  const MODELS={l405:['Llama 3.1 405B',405853388800,15.6],l70:['Llama 3.1 70B',70553706496,15.0],l8:['Llama 3.1 8B',8030261248,15.0]};
  const LLAMA_RATE=419/(54*16384)*1000;
  function run(k,n,interval){const flops=6*k.params*k.tokens_t*1e12,ideal=flops/(PEAK[k.gpu]*k.mfu)/3600,lam=k.rate_k/1000/24;
    const mtbf=lam>0?1/(lam*n):Infinity,tau=interval/60,st=k.stall_s/3600,rs=k.restart_min/60;
    let g=1-st/tau-(isFinite(mtbf)?(tau/2+rs)/mtbf:0);g=Math.max(g,0);
    const wall=g>0?ideal/n/g:Infinity,paid=n*wall/(1-k.idle),yd=isFinite(mtbf)?Math.sqrt(2*st*mtbf)*60:Infinity;
    return {flops,ideal_h:ideal,mtbf_h:mtbf,goodput:g,wall_days:wall/24,paid_h:paid,cost:paid*k.price,yd_min:yd}}
  function runYD(k,n){const r0=run(k,n,60);return run(k,n,isFinite(r0.yd_min)?Math.max(1,Math.round(r0.yd_min)):60)}
  function gpusFor(dl,k){for(let n=8;n<=200000;n+=8){if(runYD(k,n).wall_days<=dl)return n}return null}
  function fleet(rg,ph,runs,extra,sched){const d=ph*runs*(1+extra),bh=d/(8760*sched);const n=Math.max(rg,Math.ceil(bh/8)*8);return {demand_h:d,by_hours:bh,gpus:n,binding:rg>=bh?'deadline':'hours'}}
  function own(b){const cap=b.capex_gpu*(1+b.net)/b.life_y,en=b.kw_gpu*b.load*b.pue*8760*b.usd_kwh,op=b.ops*b.capex_gpu,a=cap+en+op;return {capital:cap,energy:en,ops:op,annual:a,per_hour:a/8760}}
  return {PEAK,MODELS,LLAMA_RATE,run,runYD,gpusFor,fleet,own};
})();
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
  function draw(){if(!last)return;const {o,rv,ov,fu}=last,el=$('oc-cp-svg'),W=RD.width(el),H=210,L=46,R=10,T=10,Bm=34;
    const xs=u=>L+(u-.1)/(.9)*(W-L-R),ymax=Math.ceil(Math.max(ov.usd*1.2,rv.usd/.35,o.per_hour/.2)/5)*5,ys=v=>T+(1-Math.min(v,ymax)/ymax)*(H-T-Bm);
    let s='';for(let v=0;v<=ymax;v+=ymax>40?10:5){s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+ys(v)+'" y2="'+ys(v)+'" stroke="var(--line)"/>'+RD.t(L-4,ys(v)+3,'$'+v,{a:'end',fs:10,fill:'var(--mute)'})}
    [.1,.25,.5,.75,1].forEach(u=>{s+=RD.t(xs(u),H-Bm+14,Math.round(u*100)+'%',{a:u>=1?'end':u<=.1?'start':'middle',fs:10,fill:'var(--mute)'})});
    s+=RD.t((L+W-R)/2,H-4,'share of the GPU-hours you pay for that do useful work',{a:'middle',fs:10.5,fill:'var(--mute)'});
    const line=(f,c)=>{let p='';for(let i=0;i<=60;i++){const u=.1+.9*i/60;p+=(i?'L':'M')+xs(u).toFixed(1)+' '+ys(f(u)).toFixed(1)}return '<path d="'+p+'" fill="none" stroke="'+c+'" stroke-width="2" clip-path="url(#oc-cp-clip)"/>'};
    s+=line(u=>o.per_hour/u,'var(--c3)')+line(u=>rv.usd/u,'var(--c1)')+line(()=>ov.usd,'var(--c2)');
    s+='<line x1="'+xs(fu)+'" x2="'+xs(fu)+'" y1="'+T+'" y2="'+(H-Bm)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>'+RD.t(Math.min(xs(fu)+4,W-R-60),T+10,'this plan',{fs:10.5});
    el.innerHTML=RD.svg(W,H,'<defs><clipPath id="oc-cp-clip"><rect x="'+L+'" y="'+T+'" width="'+(W-L-R)+'" height="'+(H-T-Bm)+'"/></clipPath></defs>'+s,'Cost per useful GPU-hour against utilisation');
    $('oc-cp-cap').innerHTML='Cost per <b>useful</b> GPU-hour: owned and reserved capacity cost the same every hour, so their price per useful hour is the hourly cost divided by the share that does useful work; on-demand is flat but has no guaranteed capacity for a multi-node run. Owned comes to <b>$'+(o.per_hour/Math.max(fu,.01)).toFixed(2)+'</b> per useful hour at this plan’s '+Math.round(fu*100)+'% busy share, reserved to <b>$'+(rv.usd/Math.max(fu,.01)).toFixed(2)+'</b>. Every point of utilisation the dashboards win back moves both curves down. <span class="oc-der">derived</span>'}
  document.querySelectorAll('#oc-cp-card input,#oc-cp-card select').forEach(e=>{e.addEventListener('input',calc);e.addEventListener('change',calc)});
  calc();
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-cap']=window.TAB_RENDER['t-cap']||[]).push(draw);
  addEventListener('resize',()=>{if(!$('t-cap').hidden)draw()});
})();
