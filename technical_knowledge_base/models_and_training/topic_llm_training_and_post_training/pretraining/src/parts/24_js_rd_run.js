// ---- Reading, Data stages: a run stage by stage (LR and data mix to scale, playhead, three recipes; each recipe's steps are explained by its step list sx-rn-<recipe>, its sources printed under it) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rn-card'))return;
  const CAT={web:['Web','var(--c1)'],hq:['Filtered high-quality web','var(--c6)'],code:['Code','var(--c3)'],maths:['Maths','var(--c2)'],
    ref:['Papers, books, encyclopedia','var(--c4)'],inst:['Instructions and Q&A','var(--c5)'],nd:['Not disclosed','var(--dim)']};
  const ORDER=['web','hq','code','maths','ref','inst','nd'];
  const B=1e9,T=1e12;
  // cosine to a floor of 10% of peak over [a, b]
  const cosf=(t,a,b)=>0.1+0.9*0.5*(1+Math.cos(Math.PI*Math.min(1,Math.max(0,(t-a)/(b-a)))));
  const R={
    gpt3:{total:300*B,
      segs:[{a:0,b:300*B,mix:{web:60,hq:22,ref:19},lbl:'One mix'}],
      lr:t=>t<0.375*B?t/(0.375*B):(t<260*B?cosf(t,0.375*B,260*B):0.1),
      steps:[
        {t:0.375*B},
        {t:100*B},
        {t:260*B},
        {t:300*B}]},
    olmo2:{total:3.95*T,
      segs:[{a:0,b:3.90*T,mix:{web:95.2,code:2.1,ref:2.1,maths:0.6},lbl:'OLMo 2 Mix'},{a:3.90*T,b:3.95*T,mix:{hq:47.2,inst:19.05,ref:12.96,maths:20.8},lbl:'Dolmino 50B'}],
      lr:t=>t<8.39*B?t/(8.39*B):(t<=3.90*T?cosf(t,0,5*T):cosf(3.90*T,0,5*T)*(1-(t-3.90*T)/(0.05*T))),
      steps:[
        {t:8.39*B},
        {t:2*T},
        {t:3.90*T},
        {t:3.95*T},
        {t:3.95*T}]},
    smol:{total:11.34*T,
      segs:[{a:0,b:8*T,mix:{web:85,code:12,maths:3},lbl:'Stage 1'},{a:8*T,b:10*T,mix:{web:75,code:15,maths:10},lbl:'Stage 2'},
            {a:10*T,b:11.1*T,mix:{web:63,code:24,maths:13},lbl:'Stage 3'},{a:11.1*T,b:11.2*T,mix:{nd:100},lbl:'Long context'},{a:11.2*T,b:11.34*T,mix:{nd:100},lbl:'Reasoning'}],
      lr:t=>t<4.72*B?t/(4.72*B):(t<10*T?1:(t<=11.1*T?1-(t-10*T)/(1.1*T):null)),
      steps:[
        {t:4.72*B},
        {t:8*T},
        {t:10*T},
        {t:11.1*T},
        {t:11.2*T},
        {t:11.34*T}]}
  };
  let key='gpt3';
  // maths tokens up to t
  function mathsTo(r,t){let s=0;r.segs.forEach(g=>{if(t>g.a&&g.mix.maths)s+=(Math.min(t,g.b)-g.a)*g.mix.maths/100});return s}
  function segAt(r,t){return r.segs.find(g=>t>=g.a&&t<=g.b)||r.segs[r.segs.length-1]}
  const fmt=v=>v>=1e12?(v/1e12).toFixed(v>=1e13?1:2).replace(/\.?0+$/,'')+'T':v>=1e9?(v/1e9).toFixed(v>=1e11?0:1).replace(/\.0$/,'')+'B':v>=1e6?(v/1e6).toFixed(0)+'M':'0';
  function svg(r,i){
    const w=RD.width($('rn-plot')),pl=36,pr=8,W=w-pl-pr;
    const H1=90,H2=22,gap=44,Z1=70,Z2=18;
    const y0=10,ym=y0+H1+6,yz=ym+H2+gap,yzm=yz+Z1+6,h=yzm+Z2+22;
    const tcur=r.steps[i].t,zA=r.total*0.95;
    const X=t=>pl+t/r.total*W, XZ=t=>pl+(t-zA)/(r.total-zA)*W;
    let s='<svg id="rn-svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Learning rate and data mix against tokens">';
    // axes labels
    s+='<text x="2" y="'+(y0+8)+'" fill="var(--mute)">LR</text><text x="2" y="'+(y0+H1)+'" fill="var(--mute)">0</text><text x="2" y="'+(y0+18)+'" fill="var(--mute)">peak</text>';
    s+='<line x1="'+pl+'" x2="'+(pl+W)+'" y1="'+(y0+H1)+'" y2="'+(y0+H1)+'" stroke="var(--line)"/>';
    // mix bands (full and zoom)
    function band(Xf,a,b,y,hh){let o='';r.segs.forEach(g=>{const ga=Math.max(g.a,a),gb=Math.min(g.b,b);if(gb<=ga)return;let yy=y;
      ORDER.forEach(c=>{const v=g.mix[c];if(!v)return;const tot=Object.values(g.mix).reduce((p,q)=>p+q,0);const hh2=hh*v/tot;
        o+='<rect x="'+Xf(ga).toFixed(1)+'" y="'+yy.toFixed(1)+'" width="'+Math.max(0.6,Xf(gb)-Xf(ga)).toFixed(1)+'" height="'+hh2.toFixed(1)+'" fill="'+CAT[c][1]+'"'+(c==='nd'?' opacity=".6"':'')+'/>';yy+=hh2});
      o+='<line x1="'+Xf(ga).toFixed(1)+'" x2="'+Xf(ga).toFixed(1)+'" y1="'+y+'" y2="'+(y+hh)+'" stroke="var(--bg)" stroke-width="1"/>';});return o}
    s+=band(X,0,r.total,ym,H2);
    s+='<text x="2" y="'+(ym+14)+'" fill="var(--mute)">mix</text>';
    // LR curve
    function curve(Xf,a,b,y,hh){let p='',on=false;const n=400;for(let k=0;k<=n;k++){const t=a+(b-a)*k/n,v=r.lr(t);if(v==null){on=false;continue}
      p+=(on?'L':'M')+Xf(t).toFixed(1)+' '+(y+hh-v*hh).toFixed(1)+' ';on=true}return '<path d="'+p+'" fill="none" stroke="var(--ink)" stroke-width="1.6"/>'}
    s+=curve(X,0,r.total,y0,H1);
    // not stated LR region
    r.segs.forEach(g=>{if(r.lr((g.a+g.b)/2)==null)s+='<rect x="'+X(g.a).toFixed(1)+'" y="'+y0+'" width="'+(X(g.b)-X(g.a)).toFixed(1)+'" height="'+H1+'" fill="var(--dim)" opacity=".35"/>'});
    // dim future
    const xc=X(tcur);
    s+='<rect x="'+xc.toFixed(1)+'" y="'+(y0-4)+'" width="'+Math.max(0,pl+W-xc).toFixed(1)+'" height="'+(ym+H2-y0+8)+'" fill="var(--bg)" opacity=".62"/>';
    s+='<line x1="'+xc.toFixed(1)+'" x2="'+xc.toFixed(1)+'" y1="'+(y0-4)+'" y2="'+(ym+H2+4)+'" stroke="var(--acc)" stroke-width="2"/>';
    // x ticks
    const tk=[0,0.25,0.5,0.75,1].map(f=>f*r.total);
    tk.forEach((t,k)=>{s+='<text x="'+X(t).toFixed(1)+'" y="'+(ym+H2+13)+'" text-anchor="'+(k===0?'start':k===4?'end':'middle')+'" fill="var(--mute)">'+fmt(t)+'</text>'});
    // zoom box marker
    s+='<rect x="'+X(zA).toFixed(1)+'" y="'+(y0-2)+'" width="'+(X(r.total)-X(zA)).toFixed(1)+'" height="'+(ym+H2-y0+4)+'" fill="none" stroke="var(--mute)" stroke-dasharray="2 2"/>';
    // zoom panel
    s+='<text x="'+pl+'" y="'+(yz-6)+'" fill="var(--mute)">Last 5% of the run, magnified ('+fmt(zA)+' to '+fmt(r.total)+')</text>';
    s+='<line x1="'+pl+'" x2="'+(pl+W)+'" y1="'+(yz+Z1)+'" y2="'+(yz+Z1)+'" stroke="var(--line)"/>';
    s+=band(XZ,zA,r.total,yzm,Z2);s+=curve(XZ,zA,r.total,yz,Z1);
    r.segs.forEach(g=>{if(g.b>zA&&r.lr((Math.max(g.a,zA)+g.b)/2)==null){const a=Math.max(g.a,zA);s+='<rect x="'+XZ(a).toFixed(1)+'" y="'+yz+'" width="'+(XZ(g.b)-XZ(a)).toFixed(1)+'" height="'+Z1+'" fill="var(--dim)" opacity=".35"/>'}});
    r.segs.forEach(g=>{if(g.b>zA){const a=Math.max(g.a,zA),xm=(XZ(a)+XZ(g.b))/2;if(XZ(g.b)-XZ(a)>46)s+='<text x="'+xm.toFixed(1)+'" y="'+(yzm+Z2+13)+'" text-anchor="middle" fill="var(--mute)">'+g.lbl+'</text>'}});
    if(tcur>=zA){const xz=XZ(tcur);s+='<rect x="'+xz.toFixed(1)+'" y="'+(yz-2)+'" width="'+Math.max(0,pl+W-xz).toFixed(1)+'" height="'+(Z1+Z2+10)+'" fill="var(--bg)" opacity=".62"/><line x1="'+xz.toFixed(1)+'" x2="'+xz.toFixed(1)+'" y1="'+(yz-2)+'" y2="'+(yzm+Z2+2)+'" stroke="var(--acc)" stroke-width="2"/>'}
    s+='<text x="2" y="'+(yz+10)+'" fill="var(--mute)">LR</text><text x="2" y="'+(yzm+13)+'" fill="var(--mute)">mix</text>';
    return s+'</svg>';
  }
  function draw(i){
    const r=R[key],st=r.steps[i],t=st.t;
    $('rn-plot').innerHTML=svg(r,i);
    const g=segAt(r,t>0?t-1:t),lr=r.lr(Math.max(0,t-1)),tot=Object.values(g.mix).reduce((p,q)=>p+q,0);
    const mc=((g.mix.maths||0)+(g.mix.code||0))/tot*100;
    $('rn-cnt').innerHTML=RD.stat('Tokens so far',fmt(t),'of '+fmt(r.total)+' drawn')+
      RD.stat('Learning rate',lr==null?'not stated':Math.round(lr*100)+'% of peak','at the playhead')+
      RD.stat('Maths and code in the mix',g.mix.nd?'not disclosed':mc.toFixed(1).replace(/\.0$/,'')+'%',g.lbl)+
      RD.stat('Maths tokens so far',key==='gpt3'?'none listed':fmt(mathsTo(r,t)),key==='gpt3'?'no maths source in Table 2.2':'derived: share × tokens');
  }
  $('rn-leg').innerHTML='<span><i style="background:var(--ink);height:2px"></i>learning rate (share of peak)</span>'+ORDER.map(c=>'<span><i style="background:'+CAT[c][1]+'"></i>'+CAT[c][0]+'</span>').join('');
  const A=RD.anim({card:'rn-card',ctl:'rn-ctl',n:R[key].steps.length,draw:draw,ms:4600,label:'Run step',list:'sx-rn-gpt3'});
  $('rn-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;key=b.dataset.m;
    [...$('rn-mode').children].forEach(x=>x.classList.toggle('on',x===b));
    Object.keys(R).forEach(m=>{$('sx-rn-'+m).hidden=m!==key;document.querySelectorAll('[data-rn-src="'+m+'"]').forEach(q=>q.hidden=m!==key)});A.reset(R[key].steps.length,'sx-rn-'+key);});
  addEventListener('resize',()=>{if($('rn-plot').offsetParent)A.redraw()});
  // ---- hero: the whole SmolLM3 run, static, with the page's decisions numbered on it ----
  function hero(){const el=$('pt-hero-svg');if(!el||!el.offsetParent)return;const r=R.smol;
    let s=svg(r,r.steps.length-1).replace(/<rect x="[^"]*" y="[^"]*" width="[^"]*" height="[^"]*" fill="var\(--bg\)" opacity=".62"\/>/g,'').replace(/<line [^>]*stroke="var\(--acc\)" stroke-width="2"\/>/g,'');
    const w=RD.width(el),pl=36,W=w-pl-8,X=t=>pl+t/r.total*W,y0=10,H1=90;
    const yz=y0+H1+6+22+44,XZ=t=>pl+(t-r.total*0.95)/(r.total*0.05)*W;
    const mk=(x,y,n)=>'<circle cx="'+x.toFixed(1)+'" cy="'+y+'" r="9" fill="var(--bg)" stroke="var(--acc)" stroke-width="2"/><text x="'+x.toFixed(1)+'" y="'+(y+4)+'" text-anchor="middle" fill="var(--acc)" font-weight="700" style="font-size:12px">'+n+'</text>';
    s=s.replace('</svg>',mk(pl+12,y0+H1-30,1)+mk(X(4.72e9)+22,y0+12,2)+mk(X(8e12),y0+H1+6+11,3)+mk(X(10e12)+(X(11.1e12)-X(10e12))/2,y0+30,4)+mk(Math.min(XZ(11.27e12),w-14),yz+30,5)+'</svg>');
    el.innerHTML=s;
    $('pt-hero-leg').innerHTML='<span><i style="background:var(--ink);height:2px"></i>learning rate</span>'+['web','code','maths','nd'].map(c=>'<span><i style="background:'+CAT[c][1]+'"></i>'+CAT[c][0]+'</span>').join('');}
  RD.onRender(hero);addEventListener('resize',hero);hero();
})();
