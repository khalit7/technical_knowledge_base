// ---- Diffusion lab: forward process (section 1) and the SNR explorer (section 2) ----
(function(){
  const {D,$}=DF;if(!$('df-fwd'))return;
  const T=1000;
  function cum(b){const a=new Float64Array(T);let p=1;for(let i=0;i<T;i++){p*=1-b[i];a[i]=p}return a}
  const lin=new Float64Array(T),sd=new Float64Array(T),cosb=new Float64Array(T);
  for(let i=0;i<T;i++){lin[i]=1e-4+(0.02-1e-4)*i/(T-1);const r=Math.sqrt(0.00085)+(Math.sqrt(0.012)-Math.sqrt(0.00085))*i/(T-1);sd[i]=r*r}
  const fc=t=>Math.pow(Math.cos((t/T+0.008)/1.008*Math.PI/2),2);for(let i=0;i<T;i++)cosb[i]=Math.min(1-fc(i+1)/fc(i),0.999);
  const AB={linear:cum(lin),cosine:cum(cosb),sd:cum(sd)};
  DF.AB=AB;
  const NAME={linear:'linear (DDPM)',cosine:'cosine',sd:'scaled-linear (SD 1.5)'};
  const COL={linear:'var(--c1)',cosine:'var(--c3)',sd:'var(--c2)'};
  // fixed noise: mulberry32 + Box-Muller
  let s=12345;const rnd=()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const NZ=new Float32Array(10*784);for(let i=0;i<NZ.length;i+=2){const u=Math.max(rnd(),1e-12),v=rnd(),r=Math.sqrt(-2*Math.log(u));NZ[i]=r*Math.cos(2*Math.PI*v);NZ[i+1]=r*Math.sin(2*Math.PI*v)}
  const X0=DF.imgs('test',D.test);
  const el=$('df-fwd');
  el.innerHTML=['original x<sub>0</sub>','linear (DDPM)','<span id="df-fwd-l2"></span>'].map((l,i)=>'<div class="df-row" style="grid-template-columns:minmax(0,4.6em) minmax(0,1fr)"><div class="lb">'+l+'</div><div class="df-strip" id="df-fwd-r'+i+'"></div></div>').join('');
  DF.strip($('df-fwd-r0'),X0,10,0,DF.CLS);
  const buf=new Uint8Array(10*784);
  function noisy(ab){const a=Math.sqrt(ab),b=Math.sqrt(1-ab);for(let i=0;i<buf.length;i++){const x=X0[i]/127.5-1;const v=a*x+b*NZ[i];buf[i]=Math.max(0,Math.min(255,Math.round((Math.max(-1,Math.min(1,v))+1)*127.5)))}return buf}
  function upd(){const t=+$('df-fwd-t').value,k=$('df-fwd-s2').value;$('df-fwd-tv').textContent=t;$('df-fwd-l2').textContent=NAME[k];
    DF.strip($('df-fwd-r1'),noisy(AB.linear[t]),10);DF.strip($('df-fwd-r2'),noisy(AB[k][t]),10);
    const f=ab=>Math.sqrt(ab).toFixed(3),snr=ab=>{const r=ab/(1-ab);return r>=100?r.toFixed(0):r>=0.01?r.toFixed(2):r.toExponential(1).replace('e',' &times; 10<sup>')+'</sup>'};
    $('df-fwd-stats').innerHTML=DF.stat('signal kept, linear','&radic;&#257; = '+f(AB.linear[t]),'SNR '+snr(AB.linear[t]))+DF.stat('signal kept, '+NAME[k],'&radic;&#257; = '+f(AB[k][t]),'SNR '+snr(AB[k][t]))+DF.stat('noise, linear','&radic;(1&minus;&#257;) = '+Math.sqrt(1-AB.linear[t]).toFixed(3),'standard deviation of the added noise')}
  $('df-fwd-t').addEventListener('input',upd);$('df-fwd-s2').addEventListener('change',upd);
  let tm=0;$('df-fwd-play').addEventListener('click',()=>{if(tm){clearInterval(tm);tm=0;return}let t=0;const st=DF.RM?100:10;
    tm=setInterval(()=>{if(!DF.visible()){clearInterval(tm);tm=0;return}$('df-fwd-t').value=Math.min(999,t);upd();t+=st;if(t>999+st){clearInterval(tm);tm=0}},DF.RM?600:40)});
  upd();
  // SNR explorer
  const leg=$('df-snr-leg');DF.leg(leg,['linear','cosine','sd'].map(k=>[NAME[k],COL[k]]));
  let hov=500;
  function snrDraw(){const ser=['linear','cosine','sd'].map(k=>({name:k,color:COL[k],dots:false,pts:Array.from({length:100},(_,j)=>{const t=j*10+(j===99?9:0);return [t,Math.log10(AB[k][t]/(1-AB[k][t]))]})}));
    const c=DF.chart($('df-snr'),ser,{xticks:[0,250,500,750,999],ymin:-9,ymax:4,xlab:'timestep t',ylab:'log10 SNR',label:'log SNR against timestep for three schedules',
      extra:(X,Y)=>'<line x1="'+X(hov)+'" x2="'+X(hov)+'" y1="10" y2="186" stroke="var(--ink)" stroke-dasharray="2 2"/>'});
    const sv=$('df-snr').querySelector('svg');
    const pick=e=>{const r=sv.getBoundingClientRect();const x=(e.touches?e.touches[0].clientX:e.clientX)-r.left;const w=r.width/c.W;const t=Math.round((x/w-c.ml)/(c.W-c.ml-c.mr)*999);if(t>=0&&t<=999){hov=t;snrDraw()}};
    sv.addEventListener('pointermove',pick);sv.addEventListener('click',pick);
    $('df-snr-read').innerHTML='At t = <b>'+hov+'</b>: '+['linear','cosine','sd'].map(k=>NAME[k]+' &radic;&#257; = '+Math.sqrt(AB[k][hov]).toFixed(3)+', log<sub>10</sub> SNR '+Math.log10(AB[k][hov]/(1-AB[k][hov])).toFixed(2)).join('; ')+'. Point or tap the chart to move t. Below 0 the noise outweighs the signal.'}
  DF.onRender(snrDraw);DF.onRender(upd);snrDraw();
})();
