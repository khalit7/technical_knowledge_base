// ---- Hero: the paper's Figure 2 redrawn on the toy's Swiss roll; static, exact Eq. 4 arithmetic, one seeded noise draw ----
(function(){const host=$('heroSvg');if(!host||typeof DM==='undefined')return;
  const N=300,X0=DM.roll(N,42),g=DM.gauss(4242),E=new Float64Array(2*N);for(let i=0;i<2*N;i++)E[i]=g();
  const TS=[1000,500,250,100,0];
  function draw(W){const nar=W<560,gap=nar?14:30,pw=Math.min(150,(W-gap*4)/5),x0=(W-(pw*5+gap*4))/2,top=34,R=3.1,s=pw/(2*R);
    let o='';const ar=(x1,y,x2,c,da)=>{const d=x2>x1?1:-1;return ln2(x1,y,x2,y,c,{sw:1.6,da})+'<path d="M'+x2+','+y+' l'+(-7*d)+',-4 l0,8 z" fill="'+c+'"/>'};
    TS.forEach((t,k)=>{const px=x0+k*(pw+gap),ab=DM.abar[t]||1,a=Math.sqrt(t?ab:1),b=Math.sqrt(t?1-ab:0);
      o+=rc(px,top,pw,pw,'var(--soft)',{s:'var(--line)',r:6});
      for(let i=0;i<N;i++){const x=a*X0[2*i]+b*E[2*i],y=a*X0[2*i+1]+b*E[2*i+1];if(Math.abs(x)>R||Math.abs(y)>R)continue;
        o+='<circle cx="'+(px+pw/2+x*s).toFixed(1)+'" cy="'+(top+pw/2-y*s).toFixed(1)+'" r="1.4" fill="var(--c1)" opacity=".8"/>'}
      o+=tx(px+pw/2,top+pw+16,t===1000?'x<tspan dy="3" font-size="11">T</tspan>':'x<tspan dy="3" font-size="11">'+t+'</tspan>',{fs:13,a:'middle',w:600});
      o+=tx(px+pw/2,top+pw+31,t===1000?'t = 1,000':'t = '+t,{fs:11,a:'middle',c:'var(--mute)'});
      if(k<4){const xa=px+pw+3,xb=px+pw+gap-3;o+=ar(xb,top-12,xa,'var(--mute)','4 3');o+=ar(xa,top+pw+46,xb,'var(--c3)')}});
    const sb=v=>'<tspan dy="3" font-size="11">'+v+'</tspan><tspan dy="-3">';
    o+=tx(x0,top-20,'q(x'+sb('t')+' | x'+sb('t−1')+'): fixed, adds noise</tspan>',{fs:12,c:'var(--mute)'});
    o+=tx(x0,top+pw+66,'p'+sb('θ')+'(x'+sb('t−1')+' | x'+sb('t')+'): learned, removes the predicted noise</tspan>',{fs:12,c:'var(--c3)',w:600});
    host.innerHTML=svgW(W,top+pw+74,o,'Five panels of the Swiss roll from pure noise at t = 1,000 to clean data at t = 0, with dashed forward arrows and solid reverse arrows')}
  fit(host,draw)})();
