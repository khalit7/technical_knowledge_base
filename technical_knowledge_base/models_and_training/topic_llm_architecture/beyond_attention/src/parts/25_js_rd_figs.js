// ---- Reading: three static annotated figures drawn at the measured width.
// rd-lin (section 2): linear attention's two forms; rd-gran (section 6): one forget rate per head against one per key
// channel (rates illustrative); rd-snap (section 10): rolling back a KV cache against a recurrent state. ----
(function(){
  const $=id=>document.getElementById(id);
  if(!window.RD)return;
  const box=(x,y,w,h,f,o,st)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" fill="'+f+'"'+(o!==undefined?' fill-opacity="'+o+'"':'')+(st?' stroke="'+st+'"':'')+'/>';
  // 1. linear attention, two forms
  function lin(){const el=$('rd-lin');if(!el)return;
    const W=Math.min(760,RD.width(el)),narrow=W<520,T=8,D=6;
    const pw=narrow?W:(W-40)/2,c=Math.min(22,Math.floor((pw-20)/T)),side=c*T;
    let s='';
    const L0=narrow?(W-side)/2:(pw-side)/2,top=22;
    s+=RD.t(L0,14,'training: all positions at once',{fs:11,w:600});
    for(let i=0;i<T;i++)for(let j=0;j<T;j++){const on=j<=i;
      s+=box(L0+j*c+1,top+i*c+1,c-2,c-2,on?'var(--acc)':'var(--soft)',on?(0.3+0.25*((i+2*j)%3)).toFixed(2):1,on?'':'var(--line)')}
    s+=RD.t(L0,top+side+14,'T &times; T scores, masked above the diagonal',{fs:11,fill:'var(--mute)'});
    const R0=narrow?(W-D*c)/2:pw+40+(pw-D*c)/2,top2=narrow?top+side+76:top;
    s+=RD.t(R0,top2-8,'decoding: one token at a time',{fs:11,w:600});
    s+=box(R0,top2,D*c,D*c,'var(--c4)',0.45,'var(--c4)');
    s+=RD.t(R0+D*c/2,top2+D*c/2-4,'state S',{a:'middle',fs:11});
    s+=RD.t(R0+D*c/2,top2+D*c/2+12,'d<tspan font-size="9" dy="3">k</tspan><tspan dy="-3"> &times; d</tspan><tspan font-size="9" dy="3">v</tspan>',{a:'middle',fs:11});
    s+=RD.t(R0,top2+D*c+14,'S += &#966;(k)v&#8868;, then read with &#966;(q)',{fs:11,fill:'var(--mute)'});
    if(!narrow)s+=RD.t(pw+20,top+side/2+5,'=',{a:'middle',fs:18,w:600});
    else s+=RD.t(W/2,top+side+44,'= the same output',{a:'middle',fs:12,w:600});
    const H=(narrow?top2+D*c:top+side)+24;
    el.innerHTML=RD.svg(W,H,s,'Linear attention computed as a masked T by T product for training and as a fixed d by d state for decoding')}
  // 2. decay granularity
  const RATE=[0.98,0.93,0.55,0.88,0.3,0.99,0.45,0.8];
  function gran(){const el=$('rd-gran');if(!el)return;
    const W=Math.min(760,RD.width(el)),narrow=W<480,N=8;
    const pw=narrow?W:(W-30)/2,c=Math.min(20,Math.floor((pw-60)/N)),side=c*N;
    let s='';
    const panel=(x0,y0,title,rate)=>{let b=RD.t(x0,y0-8,title,{fs:11,w:600});
      for(let i=0;i<N;i++){const a=rate(i);for(let j=0;j<N;j++)b+=box(x0+j*c+1,y0+i*c+1,c-2,c-2,'var(--acc)',(0.08+0.8*a).toFixed(2));
        b+=RD.t(x0+side+5,y0+i*c+c*0.7,a.toFixed(2),{fs:10.5,fill:'var(--mute)'})}
      return b};
    const x1=narrow?(W-side-34)/2:(pw-side-34)/2,y1=20;
    s+=panel(x1,y1,'Gated DeltaNet: one &#945; per head',()=>0.7);
    const x2=narrow?x1:pw+30+(pw-side-34)/2,y2=narrow?y1+side+40:y1;
    s+=panel(x2,y2,'KDA: one &#945; per key channel',i=>RATE[i]);
    const H=(narrow?y2:y1)+side+12;
    el.innerHTML=RD.svg(W,H,s,'A head state decayed by one rate, against one rate per key channel')}
  // 3. rollback: KV cache against state snapshots
  function snap(){const el=$('rd-snap');if(!el)return;
    const W=Math.min(760,RD.width(el)),N=16,K=10,c=Math.min(40,Math.floor((W-8)/N)),x0=(W-c*N)/2;
    let s='';const y1=20,y2=y1+c+46;
    s+=RD.t(x0,y1-7,'KV cache: one entry per token',{fs:11,w:600});
    for(let t=1;t<=N;t++){const keep=t<=K;s+=box(x0+(t-1)*c+1,y1,c-2,c-2,keep?'var(--acc)':'var(--soft)',keep?0.55:1,keep?'':'var(--line)');
      if(c>=18||t%2===0||t===1)s+=RD.t(x0+(t-0.5)*c,y1+c*0.62,String(t),{a:'middle',fs:10.5,fill:keep?'var(--ink)':'var(--mute)'})}
    s+='<line x1="'+(x0+K*c)+'" x2="'+(x0+K*c)+'" y1="'+(y1-4)+'" y2="'+(y1+c+4)+'" stroke="var(--bad)" stroke-width="2"/>';
    s+=RD.t(x0+K*c+4,y1+c+15,'drop 11 to 16',{fs:11,fill:'var(--bad)'});
    s+=RD.t(x0,y2-7,'recurrent state: snapshots every 4 tokens',{fs:11,w:600});
    for(let t=1;t<=N;t++){const re=t===9||t===10,lost=t>K;
      s+=box(x0+(t-1)*c+1,y2,c-2,c-2,re?'var(--c4)':lost?'var(--soft)':'var(--soft)',re?0.6:1,'var(--line)');
      if(t%4===0)s+='<rect x="'+(x0+(t-1)*c+3)+'" y="'+(y2+3)+'" width="'+(c-6)+'" height="'+(c-6)+'" fill="none" stroke="'+(t===8?'var(--acc)':'var(--mute)')+'" stroke-width="'+(t===8?2.5:1.2)+'"/>';
      if(c>=18||t%2===0||t===1)s+=RD.t(x0+(t-0.5)*c,y2+c*0.62,String(t),{a:'middle',fs:10.5,fill:lost?'var(--mute)':'var(--ink)'})}
    s+='<path d="M'+(x0+7.5*c)+' '+(y2+c+4)+' q '+(c)+' 14 '+(2*c)+' 0" fill="none" stroke="var(--c4)" stroke-width="2"/>';
    s+=RD.t(x0+7*c,y2+c+28,'restore 8, recompute 9 and 10',{fs:11,fill:'var(--c4)'});
    el.innerHTML=RD.svg(W,y2+c+36,s,'Rolling back to token 10: the cache drops entries, the recurrent layer restores a snapshot and recomputes')}
  function all(){lin();gran();snap()}
  RD.onRender(all);RD.onResize(all);all();
})();
