// ---- Price changes by kind, and one task priced before and after ----
(function(){
  const card=$('v-price');if(!card)return;
  // [name, old name, old {input, output, cache}, new {...}, colour]
  const P=[['Claude Opus 5.5','Opus 5',[5,25,0.5],[4,20,0.2],'var(--c2)'],
    ['GPT-6 Sol','GPT-5.6 Sol',[4,20,0.4],[2,10,0.2],'var(--c1)'],
    ['GPT-6 Luna','GPT-5.6 Luna',[0.2,1.2,0.02],[0.1,0.5,0.01],'var(--c6)'],
    ['Grok 4.7','Grok 4.6',[2,6,0.5],[2,6,0.5],'var(--c4)'],
    ['GPT-6 Astra (reference)',null,null,[10,50,1],'var(--mute)']];
  const KI={input:0,output:1,cache:2},KN={input:'input',output:'output',cache:'cache read'};
  let kind='input';
  const usd2=v=>v>=1?'$'+(+v.toFixed(2)):'$'+(+v.toPrecision(2));
  function chart(){
    const i=KI[kind],box=$('prSvg'),W=Math.max(300,Math.round(box.clientWidth||340)),narrow=W<560;
    const pl=narrow?20:170,pr=24,rh=narrow?44:30,top=8,H=top+P.length*rh+36;
    const lo=kind==='cache'?0.005:kind==='input'?0.05:0.3,hi=kind==='cache'?2:kind==='input'?20:100,lg=Math.log10;
    const X=v=>pl+(W-pl-pr)*(lg(v)-lg(lo))/(lg(hi)-lg(lo));
    let s='';const ticks=[0.005,0.01,0.02,0.05,0.1,0.2,0.5,1,2,5,10,20,50,100].filter(v=>v>=lo&&v<=hi);
    ticks.forEach((v,j)=>{const x=X(v);s+='<line x1="'+x+'" x2="'+x+'" y1="'+top+'" y2="'+(H-30)+'" stroke="var(--line)"/>';if(!narrow||j%2===0)s+='<text x="'+x+'" y="'+(H-16)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+usd2(v)+'</text>'});
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-2)+'" font-size="11" text-anchor="middle" fill="var(--mute)">dollars per million '+KN[kind]+' tokens (log scale)</text>';
    P.forEach((p,r)=>{const y=top+r*rh+(narrow?30:rh/2),nw=p[3][i],od=p[2]&&p[2][i];
      s+='<text x="'+(narrow?pl:pl-8)+'" y="'+(narrow?y-13:y+4)+'" font-size="12" text-anchor="'+(narrow?'start':'end')+'">'+p[0]+(p[1]?' <tspan fill="var(--mute)" font-size="11">from '+p[1]+'</tspan>':'')+'</text>';
      if(od&&od!==nw){s+='<line x1="'+X(od)+'" x2="'+X(nw)+'" y1="'+y+'" y2="'+y+'" stroke="'+p[4]+'" stroke-width="2.5"/><circle cx="'+X(od)+'" cy="'+y+'" r="5" fill="var(--bg)" stroke="'+p[4]+'" stroke-width="2"/>'}
      s+='<circle cx="'+X(nw)+'" cy="'+y+'" r="5.5" fill="'+p[4]+'"/>';
      const lab=usd2(nw)+(od&&od!==nw?' (from '+usd2(od)+', '+Math.round((nw/od-1)*1000)/10+'%)':od?' (unchanged)':'');
      const a=X(od&&od>nw?od:nw)+10,fits=a+lab.length*6<W-pr;
      s+='<text x="'+(fits?a:X(Math.min(nw,od||nw))-10)+'" y="'+(y+4)+'" font-size="11" text-anchor="'+(fits?'start':'end')+'" fill="var(--ink)">'+lab+'</text>'});
    box.innerHTML=svgEl(W,H,s,'Prices per million '+KN[kind]+' tokens');
  }
  function task(){
    const tin=+$('prIn').value*1e3,ca=+$('prCa').value/100,tout=+$('prOut').value*1e3;
    $('prInV').textContent=fmt(tin/1e3)+'K';$('prCaV').textContent=Math.round(ca*100)+'%';$('prOutV').textContent=fmt(tout/1e3)+'K';
    const cost=q=>(tin*(1-ca)*q[0]+tin*ca*q[2]+tout*q[1])/1e6;
    const rows=P.filter(p=>p[2]).map(p=>({n:p[0],o:cost(p[2]),w:cost(p[3]),c:p[4]}));
    const ast=cost(P[4][3]);
    const box=$('prTask'),W=Math.max(300,Math.round(box.clientWidth||340)),narrow=W<560;
    const pl=narrow?8:170,pr=16,rh=narrow?44:30,top=6,H=top+rows.length*rh+8;
    const mx=Math.max(...rows.map(r=>r.o),ast),X=v=>pl+(W-pl-pr-(narrow?0:150))*v/mx;
    let s='';rows.forEach((r,j)=>{const y=top+j*rh+(narrow?30:rh/2);
      s+='<text x="'+(narrow?pl:pl-8)+'" y="'+(narrow?y-13:y+4)+'" font-size="12" text-anchor="'+(narrow?'start':'end')+'">'+r.n+'</text>';
      s+='<rect x="'+pl+'" y="'+(y-7)+'" width="'+Math.max(1,X(r.o)-pl)+'" height="14" rx="3" fill="none" stroke="'+r.c+'" stroke-dasharray="3 2"/>';
      s+='<rect x="'+pl+'" y="'+(y-7)+'" width="'+Math.max(1,X(r.w)-pl)+'" height="14" rx="3" fill="'+r.c+'" opacity=".8"/>';
      const ch=r.o?Math.round((r.w/r.o-1)*1000)/10:0;
      const lab=usd(r.w)+' a task'+(r.o!==r.w?' (was '+usd(r.o)+', '+ch+'%)':' (unchanged)');
      const a=Math.max(X(r.o),X(r.w))+8,fits=a+lab.length*6<W-pr;
      s+='<text x="'+(fits?a:W-pr)+'" y="'+(fits?y+4:y-11)+'" font-size="11" text-anchor="'+(fits?'start':'end')+'">'+lab+'</text>'});
    box.innerHTML=svgEl(W,H,s,'Cost of one task, before and after');
    const op=rows[0],so=rows[1];
    $('prTask').insertAdjacentHTML('beforeend','<div class="out">'+stat('Opus 5.5 against Opus 5',Math.round((1-op.w/op.o)*100)+'% cheaper','list price cut 20%; more with heavy caching')+stat('GPT-6 Astra, same task',usd(ast),'the top of OpenAI\'s range')+stat('Opus 5.5 against GPT-6 Sol',(op.w/so.w).toFixed(1)+'x','per task at list prices')+'</div>');
  }
  segBind('prK',m=>{kind=m;$('prK').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));chart()});
  ['prIn','prCa','prOut'].forEach(i=>$(i).addEventListener('input',task));
  let rw=0;addEventListener('resize',()=>{const w=card.clientWidth;if(w!==rw){rw=w;chart();task()}});
  onTab(card.closest('.tab').id,()=>{chart();task()});
})();
