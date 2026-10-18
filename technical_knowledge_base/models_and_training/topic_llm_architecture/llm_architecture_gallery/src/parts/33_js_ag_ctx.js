// ---- Cache at context tab: one request growing (before/after), and the multi-model calculator ----
(function(){
  const G=window.AG;if(!G||!document.getElementById('cx-plot'))return;
  const {rows,by,$,fmt,fmtB,esc}=G;
  const R=rows.filter(r=>r.mix&&r.kv&&r.status!=='tiny').sort((a,b)=>a.n.toLowerCase()<b.n.toLowerCase()?-1:1);
  const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--ink)','var(--bad)'];
  const lim=r=>{const m=String(r.cx||'').match(/[\d,]{4,}/);let v=m?+m[0].replace(/,/g,''):0;if(v&&r.ctxc&&r.ctxc>v&&r.ctxc<=v*1.05)v=r.ctxc;return v||r.ctxc||0};  // '128,000' on a card means 128K
  const held=(r,T,credit,b)=>(G.cache(r,T,credit)+G.idxAt(r,T))*b/2;
  // ---- the growing request ----
  const am=$('cx-am');am.innerHTML=R.map(r=>'<option>'+esc(r.n)+'</option>').join('');am.value='Gemma 3 27B';
  let conv='w',an=null;const TS=[];for(let k=0;k<=20;k++)TS.push(2**k);
  function drawA(i){const r=by[am.value],T=TS[i],svg=$('cx-anSvg'),W=G.width(svg),H=150,pl=W<520?34:42,pb=18,L=r.L,cw=(W-pl-6)/L,credit=conv==='w';
    const lg=Math.log2,Y=t=>H-pb-(H-pb-8)*(lg(Math.max(1,t)))/20;let s='';
    [[1,'1'],[1024,'1K'],[32768,'32K'],[1048576,'1M']].forEach(([t,l])=>{s+='<line x1="'+pl+'" x2="'+(W-4)+'" y1="'+Y(t).toFixed(1)+'" y2="'+Y(t).toFixed(1)+'" stroke="var(--line)"/><text x="'+(pl-4)+'" y="'+(Y(t)+4).toFixed(1)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
    const own=G.own(r);
    for(let j=0;j<L;j++){const c=r.mix[j],x=pl+j*cw,cl={G:'var(--c1)',S:'var(--c6)',M:'var(--c3)',D:'var(--c4)',L:'var(--c5)',H:'var(--c2)',F:'var(--dim)'}[c];
      if(c==='L'){s+='<rect x="'+x.toFixed(1)+'" y="'+(H-pb-10)+'" width="'+Math.max(1,cw-1).toFixed(1)+'" height="10" fill="'+cl+'"/>';continue}
      if(c==='F'||j>=own||!r.per[c])continue;
      const t=credit&&c==='S'&&r.W?Math.min(T,r.W):T,y=Y(t);s+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(1,cw-1).toFixed(1)+'" height="'+(H-pb-y).toFixed(1)+'" fill="'+cl+'" opacity=".9"/>'}
    if(r.W&&credit&&/S/.test(r.mix))s+='<line x1="'+pl+'" x2="'+(W-4)+'" y1="'+Y(r.W).toFixed(1)+'" y2="'+Y(r.W).toFixed(1)+'" stroke="var(--c6)" stroke-dasharray="4 3"/><text x="'+(W-6)+'" y="'+(Y(r.W)-3).toFixed(1)+'" font-size="10.5" text-anchor="end" fill="var(--c6)" stroke="var(--bg)" stroke-width="3" paint-order="stroke">window '+fmt(r.W)+'</text>';
    s+='<text x="'+pl+'" y="'+(H-3)+'" font-size="10.5" fill="var(--mute)">layer 0</text><text x="'+(W-6)+'" y="'+(H-3)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">layer '+(L-1)+'</text>';
    svg.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Tokens held per layer at '+fmt(T)+' tokens">'+s+'</svg>';
    const a=held(r,T,false,2),b=held(r,T,true,2),st=G.stateB(r),cur=credit?b:a;
    $('cx-anT').textContent=fmt(T)+' tokens in the request'+(lim(r)&&T>lim(r)?' (past the published '+fmt(lim(r))+')':'');
    $('cx-anP').innerHTML=credit?(r.W&&/S/.test(r.mix)?(T<=r.W?'Below the window every layer keeps every token: the two conventions agree.':'Windowed layers stopped at '+fmt(r.W)+' tokens; only the '+(r.mix.match(/[GMDH]/g)||[]).length+' other attention layers keep growing.'):'No windowed layers: crediting changes nothing for this model.'):'The card\'s convention: every attention layer keeps every token, which is the per-token figure times '+fmt(T)+'.';
    $('cx-anC').innerHTML=G.stat('Card convention'+(credit?'':' (drawn)'),fmtB(a),fmtB(a/T)+' per token')+G.stat('Windows credited'+(credit?' (drawn)':''),fmtB(b),a>b?(a/b).toFixed(1)+'× less, '+fmtB(b/T)+' per token':'same as the card')+(st?G.stat('Plus fixed state',fmtB(st),'FP32, any context'):'')}
  an=G.anim({card:'cx-an',ctl:'cx-anCtl',n:TS.length,draw:drawA,ms:700,tab:'t-ctx',label:'Tokens in the request'});
  am.addEventListener('change',()=>an.reset(TS.length));
  G.seg($('cx-av'),m=>{conv=m;an.redraw()});
  // ---- calculator ----
  let pick=['Llama 3.1 70B','Gemma 3 27B','GPT-OSS 120B','Qwen3 Next 80B-A3B','DeepSeek V3','Kimi K3'];
  const CH=['Llama 3.1 8B','Llama 3.1 70B','Gemma 3 27B','GPT-OSS 120B','Qwen3 Next 80B-A3B','DeepSeek V3','DeepSeek V3.2','Kimi K3','Gemma 4 31B','Nemotron 3 Super 120B-A12B','Qwen3.5 397B','Llama 4 Maverick','MiniMax M2 230B','GLM-5 744B','Arcee AI Trinity Large 400B','OLMo 3 32B','Mistral Large 3','Step 3.5 Flash 196B'].filter(n=>by[n]&&by[n].kv);
  function chips(){$('cx-chips').innerHTML=CH.map(n=>'<button data-n="'+esc(n)+'"'+(pick.includes(n)?' class="on" aria-pressed="true"':' aria-pressed="false"')+'>'+esc(n)+'</button>').join('')}
  $('cx-chips').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const n=b.dataset.n;pick=pick.includes(n)?pick.filter(x=>x!==n):pick.concat([n]).slice(-8);chips();calc()});
  const B=()=>+$('cx-p').querySelector('button.on').dataset.m;
  G.seg($('cx-p'),()=>calc());['cx-t','cx-n','cx-b','cx-w','cx-s'].forEach(i=>$(i).addEventListener('input',calc));
  function calc(){const T=Math.round(2**+$('cx-t').value),N=2**+$('cx-n').value,bud=+$('cx-b').value*G.GiB,b=B(),cr=$('cx-w').checked,si=$('cx-s').checked;
    $('cx-tv').textContent=fmt(T)+' tokens';$('cx-nv').textContent=fmt(N);$('cx-bv').textContent=fmt(+$('cx-b').value)+' GiB';
    const sel=pick.map(n=>by[n]).filter(Boolean),el=$('cx-plot'),W=Math.max(300,Math.min(880,G.width(el))),H=W<520?240:280,pl=W<520?46:56,pr=10,pt=10,pb=30;
    const lg=Math.log10,x0=lg(1024),x1=lg(2**20),y0=lg(16*G.MiB),y1=lg(512*G.GiB),X=t=>pl+(W-pl-pr)*(lg(t)-x0)/(x1-x0),Y=v=>pt+(H-pt-pb)*(1-(lg(Math.max(16*G.MiB,v))-y0)/(y1-y0));
    let s='';[[16*G.MiB,'16 MiB'],[256*G.MiB,'256 MiB'],[4*G.GiB,'4 GiB'],[64*G.GiB,'64 GiB']].forEach(([v,l])=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(Y(v)+4).toFixed(1)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
    [[1024,'1K'],[8192,'8K'],[65536,'64K'],[131072,'128K'],[1048576,'1M']].forEach(([t,l])=>{if(W<520&&t===131072)return;s+='<text x="'+X(t).toFixed(1)+'" y="'+(H-12)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+l+'</text>'});
    s+='<line x1="'+X(T).toFixed(1)+'" x2="'+X(T).toFixed(1)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    const bl=bud/N;if(bl>16*G.MiB)s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(bl).toFixed(1)+'" y2="'+Y(bl).toFixed(1)+'" stroke="var(--bad)" stroke-dasharray="6 3"/><text x="'+(pl+4)+'" y="'+(Y(bl)-4).toFixed(1)+'" font-size="10.5" fill="var(--bad)">budget per request</text>';
    sel.forEach((r,i)=>{const c=COL[i%COL.length],m=lim(r);let a='',d='';for(let k=0;k<=40;k++){const t=2**(10+k/4),v=held(r,t,cr,b)+(si?G.stateB(r):0),p=X(t).toFixed(1)+','+Y(v).toFixed(1);if(!m||t<=m)a+=(a?' ':'')+p;else{if(!d&&a)d=a.split(' ').pop();d+=' '+p}}
      s+='<polyline points="'+a+'" fill="none" stroke="'+c+'" stroke-width="2"/>'+(d?'<polyline points="'+d.trim()+'" fill="none" stroke="'+c+'" stroke-width="1.5" stroke-dasharray="4 3"/>':'')});
    s+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">per request (log)</text>';
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Cache per request against context">'+s+'</svg>';
    $('cx-leg').innerHTML=sel.map((r,i)=>'<span><i style="background:'+COL[i%COL.length]+'"></i>'+esc(r.n)+'</span>').join('');
    $('cx-tab').innerHTML='<thead><tr><th>Model</th><th class="num">Per token on the card</th><th class="num">Per request at '+fmt(T)+'</th><th class="num">× '+fmt(N)+' requests</th><th class="num">Requests that fit</th></tr></thead><tbody>'+sel.map(r=>{const v=held(r,T,cr,b)+(si?G.stateB(r):0),tot=v*N,fit=Math.floor(bud/v);
      return '<tr><td>'+esc(r.n)+(lim(r)&&T>lim(r)?' <span class="ag-lab unc">past published context</span>':'')+'</td><td class="num">'+fmtB(r.kv*b/2)+'</td><td class="num">'+fmtB(v)+'</td><td class="num">'+fmtB(tot)+'</td><td class="num"'+(tot>bud?' style="color:var(--bad)"':'')+'>'+fmt(fit)+'</td></tr>'}).join('')+'</tbody>'}
  chips();
  G.onTab('t-ctx',()=>{calc();an.redraw()});
  let rw=0;addEventListener('resize',()=>{const w=$('cx-plot').clientWidth;if(!$('t-ctx').hidden&&w&&Math.abs(w-rw)>40){rw=w;calc();an.redraw()}});
})();
