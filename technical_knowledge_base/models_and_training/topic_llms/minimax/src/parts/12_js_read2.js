// ---- Reading tab: kernel intensity, CISPO weight, request cost ----
(function(){ // MSA kernel: Q-outer against KV-outer arithmetic intensity (paper eqs 13 to 16)
  if(!$('ki'))return;
  const BS=[32,64,128,256],GS=[4,8,16,32],HKV=4;
  function draw(){const Bk=BS[+$('kiB').value],G=GS[+$('kiG').value],H=G*HKV,k=SELT/Bk;
    $('kiBv').textContent=Bk+' tokens';$('kiGv').textContent=G+(G===16?' (M3)':'');
    const qo=(4*H*k*Bk)/(4*H+4*HKV*k*Bk),ko=(4*H*k*Bk)/(4*HKV+4*H*k+2*H*(k+1));
    $('kiOut').innerHTML=stat('Q outer, gather KV',qo.toFixed(1)+' FLOP per byte','about G = '+G)+stat('KV outer, gather Q',ko.toFixed(1)+' FLOP per byte','about ⅔ B<sub>k</sub> = '+(2*Bk/3).toFixed(1))+stat('KV-outer advantage',(ko/qo).toFixed(1)+'×',k+' blocks of '+Bk+' = 2,048 keys per group');
    $('kiCap').innerHTML='Same token budget throughout (2,048 selected keys per query and group, so <i>k</i> = 2,048 / <i>B<sub>k</sub></i>), '+H+' query heads over 4 KV heads, BF16 traffic. Defaults reproduce the paper\'s two approximations (about <i>G</i> and about ⅔ <i>B<sub>k</sub></i>) <b>independently</b> from its eqs. 13 to 16; the exact kernel also depends on scheduling and hot blocks, which this ignores.'}
  $('kiB').addEventListener('input',draw);$('kiG').addEventListener('input',draw);draw();
})();

(function(){ // CISPO against PPO-clip: gradient weight on grad log pi as a function of r
  if(!$('cp'))return;let Asg=1;
  function draw(){const r=+$('cpR').value/100,e=+$('cpE').value/100;$('cpRv').textContent=r.toFixed(2);$('cpEv').textContent=e.toFixed(2);
    const ppo=x=>Asg>0?(x>1+e?0:x):(x<1-e?0:-x),cis=x=>Asg*Math.min(x,1+e);
    const W=vw('cpSvg',640,400),H=230,pl=44,pr=14,pt=14,pb=34,X=x=>pl+(W-pl-pr)*x/3,y0=Asg>0?0:-3,y1=Asg>0?3:0,Y=y=>pt+(H-pt-pb)*(1-(y-y0)/(y1-y0));
    let s='<rect x="'+X(1-e)+'" y="'+pt+'" width="'+(X(1+e)-X(1-e))+'" height="'+(H-pt-pb)+'" fill="var(--acc2)" opacity=".6"/>';
    s+='<text x="'+X(1)+'" y="'+(pt+12)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">clip range</text>';
    for(let t=0;t<=3;t++){s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(Asg*t)+'" y2="'+Y(Asg*t)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(Y(Asg*t)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+(Asg<0&&t?'−':'')+t+'</text>';
      s+='<text x="'+X(t)+'" y="'+(H-pb+15)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+t+'</text>'}
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">importance ratio r</text>';
    s+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">weight on ∇ log π</text>';
    const path=f=>{let d='';for(let i=0;i<=300;i++){const x=i/100,yy=f(x),px=X(x).toFixed(1),py=Y(yy).toFixed(1);const prev=i?f((i-1)/100):yy;d+=(i===0||Math.abs(prev-yy)>0.05?'M':'L')+px+','+py}return d};
    s+='<path d="'+path(cis)+'" fill="none" stroke="var(--acc)" stroke-width="2.6"/><path d="'+path(ppo)+'" fill="none" stroke="var(--bad)" stroke-width="2" stroke-dasharray="6 4"/>';
    s+='<line x1="'+X(r)+'" x2="'+X(r)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--ink)" stroke-dasharray="2 3"/>';
    s+='<circle cx="'+X(r)+'" cy="'+Y(cis(r))+'" r="4.5" fill="var(--acc)"/><circle cx="'+X(r)+'" cy="'+Y(ppo(r))+'" r="4" fill="var(--bad)"/>';
    s+='<text x="'+(W-pr-4)+'" y="'+(Asg>0?Y(1+e)-8:Y(-(1+e))+16)+'" font-size="11" text-anchor="end" fill="var(--acc)">CISPO: sg(clip r) × Â</text>';
    s+='<text x="'+(W-pr-4)+'" y="'+(Asg>0?Y(0)-6:Y(-3)+14)+'" font-size="11" text-anchor="end" fill="var(--bad)">PPO-clip</text>';
    $('cpSvg').innerHTML=svgEl(W,H,s,'Gradient weight of PPO-clip and CISPO against the importance ratio');
    const wp=ppo(r),wc=cis(r),f=v=>(v<0?'−':'')+Math.abs(v).toFixed(2);
    $('cpOut').innerHTML=stat('PPO-clip weight',f(wp),wp===0?'clipped branch active: gradient exactly zero':'unclipped: r × Â')+stat('CISPO weight',f(wc),'min(r, 1 + ε) × Â, never zero')+stat('Token silenced by PPO?',wp===0&&r!==0?'yes':'no',Asg>0?'happens when r > 1 + ε':'happens when r < 1 − ε')}
  segBind('cpA',m=>{Asg=+m;draw()});$('cpR').addEventListener('input',draw);$('cpE').addEventListener('input',draw);draw();
})();

(function(){ // request cost: M3 against M2.7 (MiniMax pay-as-you-go, read 1 Oct 2026)
  if(!$('rq'))return;
  const tin=v=>Math.round(1000*Math.pow(1000,v/100)/100)*100,tout=v=>Math.round(100*Math.pow(1000,v/60)/100)*100||100;
  function draw(){const I=tin(+$('rqI').value),O=tout(+$('rqO').value),c=+$('rqC').value/100,Ic=I*c;
    $('rqIv').textContent=fmt(I);$('rqOv').textContent=fmt(O);$('rqCv').textContent=Math.round(c*100)+'%';
    const hi=I>512000,m3p=hi?[0.6,2.4,0.12]:[0.3,1.2,0.06];
    const cost=p=>((I-Ic)*p[0]+Ic*p[2]+O*p[1])/1e6;
    const rows=[['M3',I+O<=1000000?cost(m3p):null,'var(--acc)',hi?'whole call at the above-512K rate':'standard rate'],
      ['M2.7',I+O<=204800?cost([0.3,1.2,0.06]):null,'var(--c2)','204,800-token window'],
      ['M2.7-highspeed',I+O<=204800?cost([0.6,2.4,0.12]):null,'var(--c4)','twice M2.7'],
      ['M3.1-Flash-Preview',null,'var(--mute)','not sold per token']];
    const mx=Math.max(...rows.map(r=>r[1]||0));
    $('rqBars').innerHTML=rows.map(r=>'<div class="row"><span class="nm" title="'+r[3]+'">'+r[0]+'</span><span class="track">'+(r[1]!=null?'<span class="fill" style="width:'+(100*r[1]/mx).toFixed(1)+'%;background:'+r[2]+'"></span>':'')+'</span><span class="val">'+(r[1]!=null?'$'+r[1].toFixed(r[1]<0.1?4:3):(r[0].startsWith('M3.1')?'no price':'too long'))+'</span></div>').join('');
    $('rqCap').innerHTML='Cost of one call = (uncached input × input price + cached input × cache-read price + output × output price) / 10<sup>6</sup>. M3: $0.30 / $1.20, cache read $0.06, up to 512K input; $0.60 / $2.40, $0.12 above. M2.7: $0.30 / $1.20, $0.06 cache read (cache writes, $0.375, not counted). Windows count input plus output. Source: '+A('https://platform.minimax.io/docs/guides/pricing-paygo','MiniMax pricing')+'.'}
  ['rqI','rqO','rqC'].forEach(id=>$(id).addEventListener('input',draw));draw();
})();
