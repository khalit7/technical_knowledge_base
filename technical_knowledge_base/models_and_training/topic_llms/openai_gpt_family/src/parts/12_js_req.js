// ---- What one request costs: calculator, the 272K cliff, prompt caching, effort table ----
// Prices per 1M tokens from the OpenAI pricing page, read 1 Oct 2026: [id, name, input, cached read, cache write, output, ultrafast available]
const PR=[['astra','GPT-6 Astra',10,1,12.5,50,1],['sol61','GPT-6.1 Sol',2,.1,2.5,10,0],['sol6','GPT-6 Sol',2,.2,2.5,10,0],['luna','GPT-6 Luna',.1,.01,.125,.5,0],
  ['sol56','GPT-5.6 Sol (promotional)',4,.4,5,20,0],['terra','GPT-5.6 Terra',2,.2,2.5,12,0],['luna56','GPT-5.6 Luna',.2,.02,.25,1.2,0]];
const LONG=272000,IMAX=922000,OMAX=128000;
function reqCost(p,I,O,h,s,w){ // p: price row; I,O tokens; h cached share 0..1; s tier factor; w: uncached part written to cache
  if(s===6&&!p[6])return null;
  const L=I>LONG,mi=L?2:1,mo=L?1.5:1,Ir=I*h,Iu=I-Ir;
  return s*((Iu*(w?p[4]:p[2])+Ir*p[3])*mi+O*p[5]*mo)/1e6}
(function(){
  const lgI=v=>Math.round(1000*Math.pow(IMAX/1000,v/1000)/1000)*1000, inI=t=>Math.round(1000*Math.log(Math.max(t,1000)/1000)/Math.log(IMAX/1000));
  const lgO=v=>Math.round(100*Math.pow(OMAX/100,v/1000)/100)*100, inO=t=>Math.round(1000*Math.log(Math.max(t,100)/100)/Math.log(OMAX/100));
  const S={I:50000,O:5000,h:0,s:1,w:false,pre:'a'};
  const PRE={a:{I:50000,O:5000,h:0},b:{I:300000,O:10000,h:0},c:{I:272000,O:10000,h:0},d:{I:200000,O:5000,h:75}};
  function sync(){$('rqI').value=inI(S.I);$('rqO').value=inO(S.O);$('rqH').value=S.h;$('rqS').value=S.s;$('rqW').checked=S.w}
  function draw(){
    $('rqIv').textContent=fmt(S.I);$('rqOv').textContent=fmt(S.O);$('rqHv').textContent=S.h+'%';
    const h=S.h/100,rows=PR.map(p=>({p,c:reqCost(p,S.I,S.O,h,S.s,S.w)})),mx=Math.max(...rows.map(r=>r.c||0))||1,a=rows[0].c;
    $('rqBars').innerHTML=rows.map(r=>'<div class="row'+(r.p[0]==='astra'?' hl':'')+'"><span class="nm" title="'+r.p[1]+'">'+r.p[1]+'</span><span class="track"><span class="fill" style="width:'+(r.c==null?0:Math.max(.4,100*r.c/mx))+'%;background:'+(r.p[0]==='astra'?'var(--closed)':r.p[1].startsWith('GPT-6')?'var(--acc)':'var(--dim)')+'"></span></span><span class="val">'+(r.c==null?'n/a':usd(r.c,r.c<0.01?4:r.c<1?3:2))+'</span></div>').join('');
    const L=S.I>LONG,base=reqCost(PR[0],Math.min(S.I,LONG),S.O,h,S.s,S.w),std=S.s*((S.I*(1-h)*(S.w?12.5:10)+S.I*h*1)+S.O*50)/1e6;
    let pin;
    if(S.pre==='a'&&S.s===1&&!S.w)pin='<b>Defaults reproduce the page\'s worked example</b> (by construction: OpenAI\'s pricing rule evaluated at 50,000 in and 5,000 out): Astra '+usd(a,2)+', GPT-6.1 Sol '+usd(rows[1].c,2)+' (one fifth), GPT-6 Luna '+usd(rows[3].c,4)+' (one hundredth).';
    else if(L&&a!=null)pin='Above 272K the <b>whole request</b> is billed at 2× input and 1.5× output: Astra '+usd(a,2)+' against '+usd(std,2)+' at standard rates, '+(a/std).toFixed(2)+'×. '+(S.pre==='b'&&S.s===1&&!S.w&&S.h===0?'This reproduces the page\'s $6.75 against $3.50. ':'')+'Trimming the prompt to 272,000 tokens would cost '+usd(base,2)+'.';
    else if(S.pre==='c'&&S.s===1&&S.h===0&&!S.w)pin='At exactly 272,000 tokens the surcharge does not apply: Astra '+usd(a,2)+'. One token more and the whole request doubles on input and rises half on output.';
    else pin=a==null?'Ultrafast is listed for GPT-6 Astra only.':'Astra '+usd(a,a<1?3:2)+'; the cheapest model here costs '+usd(Math.min(...rows.filter(r=>r.c!=null).map(r=>r.c)),4)+'. Output (including hidden reasoning) is '+Math.round(100*(S.s*S.O*50*(L?1.5:1)/1e6)/a)+'% of Astra\'s bill.';
    $('rqPin').innerHTML=pin;
    // cliff: Astra cost against prompt length at the current O, h, tier
    const W=640,H=230,pl=58,pr=14,pt=14,pb=34,X=v=>pl+(W-pl-pr)*v/IMAX;
    const f=I=>reqCost(PR[0],I,S.O,h,S.s===6?6:S.s,S.w)||0,raw=f(IMAX)*1.05,stp=[.5,1,2,5,10,20,50,100,200].find(v=>raw/v<=5)||500,ymax=Math.ceil(raw/stp)*stp,Y=v=>pt+(H-pt-pb)*(1-v/ymax);
    let s='';const yt=[];for(let v=0;v<=ymax+1e-9;v+=stp)yt.push(v);
    yt.forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(Y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+usd(v,v<10?2:0)+'</text>'});
    [0,200000,400000,600000,800000].forEach(v=>{s+='<text x="'+X(v)+'" y="'+(H-pb+15)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+(v/1000)+'K</text>'});
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-3)+'" font-size="11" text-anchor="middle" fill="var(--mute)">input tokens in the request (output fixed at '+fmt(S.O)+')</text>';
    s+='<line x1="'+X(LONG)+'" x2="'+X(LONG)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--bad)" stroke-dasharray="4 3"/><text x="'+(X(LONG)+4)+'" y="'+(pt+10)+'" font-size="10.5" fill="var(--bad)">272K: whole request repriced</text>';
    s+='<path d="M'+X(0)+' '+Y(f(0))+'L'+X(LONG)+' '+Y(f(LONG))+'" stroke="var(--closed)" stroke-width="2" fill="none"/><path d="M'+X(LONG+1)+' '+Y(f(LONG+1))+'L'+X(IMAX)+' '+Y(f(IMAX))+'" stroke="var(--closed)" stroke-width="2" fill="none"/>';
    s+='<circle cx="'+X(S.I)+'" cy="'+Y(f(S.I))+'" r="5" fill="var(--closed)" stroke="var(--bg)" stroke-width="2"/><text x="'+Math.min(X(S.I)+8,W-pr-60)+'" y="'+(Y(f(S.I))-8)+'" font-size="11">'+usd(f(S.I),2)+'</text>';
    $('rqCliff').innerHTML=svgEl(W,H,s,'GPT-6 Astra request cost against input tokens, with the 272K step');
  }
  $('rqI').addEventListener('input',e=>{S.I=Math.max(1000,lgI(+e.target.value));S.pre='';draw()});
  $('rqO').addEventListener('input',e=>{S.O=Math.max(100,lgO(+e.target.value));S.pre='';draw()});
  $('rqH').addEventListener('input',e=>{S.h=+e.target.value;S.pre='';draw()});
  $('rqS').addEventListener('change',e=>{S.s=+e.target.value;draw()});
  $('rqW').addEventListener('change',e=>{S.w=e.target.checked;draw()});
  const pre=$('rqPre');pre.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{pre.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));Object.assign(S,PRE[b.dataset.p]);S.pre=b.dataset.p;sync();draw()}));
  sync();onTab('t-read',draw);
  // prompt caching
  let N=10,r=.1;
  function cc(){
    $('ccNv').textContent=N;const unc=N,cac=N===1?1.25:1.25+(N-1)*r,mx=Math.max(unc,cac),be=(1.25-r)/(1-r);
    $('ccBars').innerHTML=[['Without caching',unc,'var(--dim)'],['With caching',cac,'var(--good)']].map(([n,v,c])=>'<div class="row"><span class="nm">'+n+'</span><span class="track"><span class="fill" style="width:'+(100*v/mx)+'%;background:'+c+'"></span></span><span class="val">'+v.toFixed(2)+'×</span></div>').join('');
    $('ccPin').innerHTML=(r===.1&&(N===2||N===10)?'<b>Reproduces OpenAI\'s own figures independently</b>: '+(N===2?'one write and one full reuse cost 1.35× a single uncached pass, against 2×':'one write and nine full reads cost 2.15×, against 10×')+' ({{prompt caching guide|@cache}}). ':'')+
      'With caching the prefix costs '+cac.toFixed(2)+'× one uncached pass in total, '+(100*(1-cac/unc)).toFixed(0)+'% '+(cac<unc?'less':'more')+' than without. Break-even is <span class="m">(1.25 − '+r+') / (1 − '+r+') = '+be.toFixed(2)+'</span> uses, so caching already pays on the second request; Eden AI\'s "once a prefix is reused more than twice" does not reproduce from these prices ({{Eden AI|@eden}}).';
  }
  $('ccN').addEventListener('input',e=>{N=+e.target.value;cc()});segBind('ccR',m=>{r=+m;cc()});onTab('t-read',cc);
  // effort table
  const EF=['none','minimal','low','medium','high','xhigh','max'];
  const ET=[['GPT-6 Astra','x-yyyyy','@astra'],['GPT-6.1 Sol','xxydyyy','@sol61'],['GPT-6 Sol','y-ydyyy','@sol6'],['GPT-6 Luna','y-ydyyy','@luna'],['GPT-5.6 Sol, Terra, Luna','y-ydyyy','@sol56'],['gpt-oss (system prompt)','--yyy--','@oss']];
  $('efT').innerHTML='<tr><th>Model</th>'+EF.map(e=>'<th class="num"><code>'+e+'</code></th>').join('')+'</tr>'+ET.map(([n,c])=>'<tr'+(n.startsWith('GPT-6 Astra')?'':'')+'><td>'+n+'</td>'+[...c].map(ch=>'<td class="num">'+(ch==='y'?'<span class="dot"></span>':ch==='d'?'<span class="dot df" title="default"></span>':ch==='x'?'<span class="rejx" title="rejected">✕</span>':'<span class="mute">–</span>')+'</td>').join('')+'</tr>').join('');
})();
