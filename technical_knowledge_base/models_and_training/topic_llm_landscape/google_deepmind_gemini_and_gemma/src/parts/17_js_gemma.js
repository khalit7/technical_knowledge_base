// ---- Gemma on one machine ----
(function(){
  // cache shape from configs; weights (GB) from the Gemma 4 report's memory table
  const GM=[
    {k:'12b',n:'Gemma 4 12B',Lg:8,Ll:40,el:2*8*256,egKV:1*512,W:1024,max:262144,act:11.95,wt:{bf:24.0,q4:7.65},aw:{bf:24.0,q4:7.65},rep:0.28,head:328,c:'var(--c3)'},
    {k:'26b',n:'Gemma 4 26B A4B',Lg:5,Ll:25,el:2*8*256,egKV:2*512,W:1024,max:262144,act:3.8,wt:{bf:52.0,q4:16.2},aw:{bf:7.6,q4:2.8},rep:0.28,head:210,c:'var(--acc)'},
    {k:'31b',n:'Gemma 4 31B',Lg:10,Ll:50,el:2*16*256,egKV:4*512,W:1024,max:262144,act:30.7,wt:{bf:64.0,q4:19.2},aw:{bf:64.0,q4:19.2},rep:1.10,head:840,c:'var(--bad)'}
  ];
  const G3={n:'Gemma 3 27B',Lg:10,Ll:52,el:2*16*128,eg:2*16*128,W:1024,max:131072,c:'var(--c4)'};
  const Ts=[4096,8192,16384,32768,65536,131072,262144];
  let wq='q4',cb=1;
  const eg=(m,kv)=>m.eg!=null?m.eg:(kv?m.egKV:2*m.egKV);
  const kvB=(m,T,b,kv)=>(m.Lg*Math.min(T,m.max)*eg(m,kv)+m.Ll*Math.min(T,m.W,m.max)*m.el)*b;
  window.GEMMA={GM,kvB,Ts,cb:()=>cb};
  function draw(){
    const T=Ts[+$('gmT').value],B=+$('gmB').value,kv=$('gmKV').checked,BW=+$('gmBW').value;
    $('gmTv').textContent=fmt(T)+' tokens';$('gmBWv').textContent=fmt(BW)+' GB/s';
    // fit bars
    const W=640,rowH=34,top=8,lab=130,H=top+rowH*GM.length+22,mx=Math.max(B,...GM.map(m=>m.wt[wq]+kvB(m,T,cb,kv)/1e9))*1.3,sc=v=>v/mx*(W-lab-60);
    let s='';
    GM.forEach((m,i)=>{const y=top+i*rowH,w=m.wt[wq],c=kvB(m,T,cb,kv)/1e9,tot=w+c,ok=tot<=B;
      s+='<text x="0" y="'+(y+17)+'" font-size="12">'+m.n.replace('Gemma 4 ','')+'</text>';
      s+='<rect x="'+lab+'" y="'+(y+4)+'" width="'+sc(w)+'" height="20" fill="'+m.c+'" opacity=".85"><title>weights '+w+' GB</title></rect>';
      s+='<rect x="'+(lab+sc(w))+'" y="'+(y+4)+'" width="'+Math.max(1,sc(c))+'" height="20" fill="'+m.c+'" opacity=".4"><title>KV cache '+c.toFixed(2)+' GB</title></rect>';
      s+='<text x="'+(lab+sc(tot)+6)+'" y="'+(y+18)+'" font-size="11.5" fill="'+(ok?'var(--good)':'var(--bad)')+'" font-weight="600">'+tot.toFixed(1)+' GB '+(ok?'fits':'does not fit')+'</text>'});
    const bx=lab+sc(B);s+='<line x1="'+bx+'" x2="'+bx+'" y1="2" y2="'+(H-16)+'" stroke="var(--ink)" stroke-dasharray="5 3"/><text x="'+bx+'" y="'+(H-3)+'" font-size="11" text-anchor="middle">'+B+' GB budget</text>';
    $('gmFit').innerHTML='<div class="tw"><div style="min-width:540px">'+svgEl(W,H,s,'Weights plus KV cache against the memory budget')+'</div></div><div class="leg"><span><i style="background:var(--mute)"></i>solid: weights ('+(wq==='q4'?'Q4_0':'bf16')+')</span><span><i style="background:var(--dim)"></i>pale: KV cache at '+fmt(T)+' tokens ('+(cb===1?'int8':'bf16')+')</span></div>';
    // per token table
    let t='<tr><th>Model</th><th class="num">Compute, F = 2 N<sub>active</sub></th><th class="num">Weights read</th><th class="num">Cache read</th><th class="num">Decode ceiling</th></tr>';
    GM.forEach(m=>{const F=2*m.act*1e9,aw=m.aw[wq],c=kvB(m,T,cb,kv)/1e9,rd=aw+c;
      t+='<tr><td>'+m.n+'</td><td class="num">'+(F/1e9).toFixed(1)+' GFLOP</td><td class="num">'+aw+' GB</td><td class="num">'+c.toFixed(2)+' GB</td><td class="num">'+fmt(BW/rd)+' tokens/s</td></tr>'});
    $('gmTok').innerHTML=t;
    // cache vs context plot
    const P=640,PH=270,pl=56,pr=150,pt=12,pb=34,x0=Math.log2(4096),x1=Math.log2(262144);
    const lx=v=>pl+(P-pl-pr)*(Math.log2(v)-x0)/(x1-x0),y0=Math.log10(0.01e9),y1=Math.log10(80e9),ly=v=>pt+(PH-pt-pb)*(1-(Math.log10(Math.max(v,0.01e9))-y0)/(y1-y0));
    let q='';[[0.01e9,'10 MB'],[0.1e9,'100 MB'],[1e9,'1 GB'],[10e9,'10 GB'],[80e9,'80 GB']].forEach(([v,l])=>{q+='<line x1="'+pl+'" x2="'+(P-pr)+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(ly(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
    Ts.forEach(v=>{q+='<text x="'+lx(v)+'" y="'+(PH-pb+15)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+(v/1024)+'K</text>'});
    q+='<text x="'+((pl+P-pr)/2)+'" y="'+(PH-3)+'" font-size="11" text-anchor="middle" fill="var(--mute)">context, tokens (log)</text>';
    q+='<line x1="'+lx(T)+'" x2="'+lx(T)+'" y1="'+pt+'" y2="'+(PH-pb)+'" stroke="var(--mute)" stroke-dasharray="2 3"/>';
    const series=[...GM.map(m=>({m,n:m.n.replace('Gemma 4 ',''),f:t=>kvB(m,t,cb,kv)})),{m:G3,n:'Gemma 3 27B',f:t=>kvB(G3,t,cb,kv)},{m:{c:'var(--c4)',max:131072},n:'Gemma 3 27B all global',f:t=>62*Math.min(t,131072)*4096*cb,dash:1}];
    const ends=[];
    series.forEach(sr=>{const pts=[];for(let e=x0;e<=x1+1e-9;e+=0.25){const tt=2**e;if(tt>sr.m.max*1.0001)break;pts.push(lx(tt).toFixed(1)+','+ly(sr.f(tt)).toFixed(1))}
      q+='<path d="M'+pts.join('L')+'" fill="none" stroke="'+sr.m.c+'" stroke-width="2"'+(sr.dash?' stroke-dasharray="5 3"':'')+'/>';
      const te=Math.min(T,sr.m.max);q+='<circle cx="'+lx(te)+'" cy="'+ly(sr.f(te))+'" r="3.5" fill="'+sr.m.c+'"/>';
      ends.push({y:ly(sr.f(sr.m.max)),c:sr.m.c,n:sr.n,how:sr.n+': '+(sr.f(te)/1e9).toFixed(2)+' GB at '+fmt(te)+' tokens'})});
    q+=endLabels(ends,P-pr+6,14);
    $('gmPlot').innerHTML=svgEl(P,PH,q,'KV cache against context');
    // reproduction table (always at the report's settings)
    const g3a=kvB(G3,131072,2,1)/GiB,g3b=62*131072*4096*2/GiB;
    let r='<tr><th>Check</th><th class="num">Recomputed</th><th class="num">Published</th><th>Verdict</th></tr>';
    r+='<tr><td>Gemma 3 27B cache at 131,072 tokens, bf16, windowed / all global</td><td class="num">'+g3a.toFixed(1)+' / '+g3b.toFixed(0)+' GiB</td><td class="num">10.4 / 62 GiB</td><td>reproduces ({{gallery page|n:3c65c17b0d0d81be8a07f2562fa2030a}})</td></tr>';
    GM.forEach(m=>{const per=(m.Lg*m.egKV+m.Ll*m.el)*2/1024,c=kvB(m,32768,1,1)/1e9,d=(c/m.rep-1)*100;
      r+='<tr><td>'+m.n+': headline bytes per token, bf16 (no window credit)</td><td class="num">'+fmt(per)+' KiB</td><td class="num">'+m.head+' KiB</td><td>reproduces ({{gallery|@gallery}})</td></tr>';
      r+='<tr><td>'+m.n+': cache at 32K, int8</td><td class="num">'+c.toFixed(2)+' GB</td><td class="num">'+m.rep.toFixed(2)+' GB</td><td>'+(Math.abs(d)<4?'within '+Math.abs(d).toFixed(0)+'%':'off by '+d.toFixed(0)+'%; the report does not give its arithmetic')+'</td></tr>'});
    r+='<tr><td>26B A4B against 31B: compute per token</td><td class="num">7.6 / 61.4 GFLOP</td><td class="num">3.8B / 30.7B active</td><td>F = 2 N<sub>active</sub>, ×'+(61.4/7.6).toFixed(1)+'</td></tr>';
    $('gmRep').innerHTML=r;
    const m26=GM[1],m31=GM[2],ok26=m26.wt[wq]+kvB(m26,T,cb,kv)/1e9<=B,ok31=m31.wt[wq]+kvB(m31,T,cb,kv)/1e9<=B;
    const def=wq==='q4'&&cb===1&&T===32768&&B===24&&kv;
    if(window.drawRoof)drawRoof();
    $('gmPin').innerHTML='<div class="t">'+(def?'Defaults reproduce the report\'s memory table':'At these settings')+'</div>'+(def?'Q4_0 weights 16.2 and 19.2 GB plus a 32K int8 cache of 0.27 and 1.09 GB (report: 0.28 and 1.10): ':'')+'26B A4B '+(ok26?'fits':'does not fit')+' and 31B '+(ok31?'fits':'does not fit')+' in '+B+' GB. The MoE reads '+m26.aw[wq]+' GB of weights per token against '+m31.aw[wq]+' GB, ×'+(m31.aw[wq]/m26.aw[wq]).toFixed(1)+' less.';
  }
  segBind('gmW',m=>{wq=m;draw()});segBind('gmC',m=>{cb=+m;draw()});['gmT','gmB','gmKV','gmBW'].forEach(id=>$(id).addEventListener('input',draw));
  onTab('t-gemma',draw);
})();
