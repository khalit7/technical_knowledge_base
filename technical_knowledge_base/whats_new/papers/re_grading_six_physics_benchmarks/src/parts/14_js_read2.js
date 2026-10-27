// ---- The paper tab: two graders on the paper's cases, the defect floor, the third predict question ----
// A tiny expression evaluator: numbers, names, + - * / ^, parentheses, unary minus, sqrt exp ln.
function evalExpr(src,vars){let i=0;const s=src.replace(/\s+/g,'');
  const peek=()=>s[i],eat=c=>{if(s[i]===c){i++;return true}return false};
  function prim(){if(eat('(')){const v=add();if(!eat(')'))throw Error('missing )');return v}
    if(eat('-'))return -pow();
    const m=/^(\d+\.?\d*(?:e-?\d+)?)/.exec(s.slice(i));if(m){i+=m[1].length;return +m[1]}
    const n=/^([A-Za-z]\w*)/.exec(s.slice(i));if(n){i+=n[1].length;const f={sqrt:Math.sqrt,exp:Math.exp,ln:Math.log}[n[1]];
      if(f){if(!eat('('))throw Error('( expected');const v=add();if(!eat(')'))throw Error(') expected');return f(v)}
      if(!(n[1] in vars))throw Error('unknown '+n[1]);return vars[n[1]]}
    throw Error('bad input at '+i)}
  function pow(){const b=prim();if(eat('^'))return Math.pow(b,pow());return b}
  function mul(){let v=pow();for(;;){if(eat('*'))v*=pow();else if(peek()==='/'){i++;v/=pow()}else return v}}
  function add(){let v=mul();for(;;){if(eat('+'))v+=mul();else if(peek()==='-'){i++;v-=mul()}else return v}}
  const v=add();if(i<s.length)throw Error('trailing input');return v}
const GPAIRS=[
 {t:'PHYBench 140: rope tension',m:'P/(3*sqrt(6))',r:'sqrt(6)/18*P',v:['P'],paper:'grader error: equivalent'},
 {t:'PHYBench: bug on a disk',m:'5*m*R*w^2',r:'5*m*w^2*R',v:['m','R','w'],paper:'grader error: equivalent'},
 {t:'PRISM-Physics diver, V(x)',m:'V0*exp(-b*x/m)',r:'V0*exp(-(b/m)*x)',v:['V0','b','x','m'],paper:'grader error: equivalent'},
 {t:'PRISM-Physics diver, x(t)',m:'m/b*ln(1+b*V0/m*t)',r:'m/b*ln(1+b*V0*t/m)',v:['m','b','V0','t'],paper:'grader error: equivalent'},
 {t:'HLE-Physics polymer force law',m:'-3*E*x/(n^2*l^2)*exp(3*x^2/(2*n^2*l^2))',r:'3*E*x/(n*l)^2',v:['E','x','n','l'],paper:'grader error: equal in the small-x limit, up to a sign convention',lim:'x'},
 {t:'HLE-Physics four stars (the key is wrong)',m:'2-sqrt(2)',r:'-sqrt(2)',v:[],paper:'benchmark error: the reference is wrong, the model is right'}
];
(function(){const sel=$('grSel');let seed=7;GPAIRS.forEach((g,i)=>{const o=document.createElement('option');o.value=i;o.textContent=g.t;sel.appendChild(o)});
  function run(){const g=GPAIRS[+sel.value],rnd=mulberry32(seed);const strEq=g.m.replace(/\s/g,'')===g.r.replace(/\s/g,'');
    let rows='',worst=0;for(let k=0;k<3;k++){const vs={};g.v.forEach(n=>vs[n]=+(0.5+1.5*rnd()).toFixed(3));
      const a=evalExpr(g.m,vs),b=evalExpr(g.r,vs),rel=Math.abs(a-b)/Math.max(1e-300,Math.abs(a),Math.abs(b));worst=Math.max(worst,rel);
      rows+='<tr><td class="mono">'+(g.v.length?g.v.map(n=>n+' = '+vs[n]).join(', '):'no symbols')+'</td><td class="num">'+a.toPrecision(6)+'</td><td class="num">'+b.toPrecision(6)+'</td></tr>'}
    const numEq=worst<1e-9;let lim='';
    if(g.lim){const vs={E:1.3,n:40,l:1.1,x:1e-4},a=evalExpr(g.m,vs),b=evalExpr(g.r,vs);
      lim='<p class="small">Small separation (x = 0.0001, n = 40, l = 1.1, E = 1.3): |model| / |reference| = '+(Math.abs(a)/Math.abs(b)).toFixed(6)+'. A spot check at random values cannot know that only the small-x limit was asked for, or that the sign is a convention.</p>'}
    $('grOut').innerHTML='<div class="ex"><div class="ans"><div><div class="h">Model</div><span class="mono">'+g.m+'</span></div><div><div class="h">Reference</div><span class="mono">'+g.r+'</span></div></div>'+
      '<div class="gr3"><div><div class="h">Exact string match</div><div class="v '+(strEq?'v-ok':'v-no')+'">'+(strEq?'equal':'rejects')+'</div></div><div><div class="h">Numeric spot check, 3 random draws</div><div class="v '+(numEq?'v-ok':'v-no')+'">'+(numEq?'equal':'differs')+'</div><div class="small mute">largest relative difference '+(worst<1e-12?'below 1e-12':worst.toExponential(1))+'</div></div><div><div class="h">The paper\'s audit</div><div class="v">'+g.paper+'</div></div></div>'+
      '<div class="tw"><table><tr><th>Values drawn</th><th class="num">Model</th><th class="num">Reference</th></tr>'+rows+'</table></div>'+lim+'</div>'}
  sel.addEventListener('change',run);$('grDraw').addEventListener('click',()=>{seed=(seed*16807)%2147483647;run()});
  PRED_REVEAL.pr2=run})();

// The defect floor: measured error against true model error, for a defect share d and a grader false-rejection rate g.
(function(){const host=$('flPlot');let P='HLE-Physics';
  const E=(e,d,g)=>d+(1-d)*(e+(1-e)*g), share=(e,d,g)=>{const m=E(e,d,g);return m>0?(1-d)*e/m:0};
  let cur={};const get=()=>cur;
  function preset(b){const p=PRESET[b];cur={d:p.d,g:p.g,e:1-p.a};$('flD').value=(100*cur.d).toFixed(1);$('flG').value=(100*cur.g).toFixed(1);$('flE').value=(100*cur.e).toFixed(1)}
  function draw(w){const {d,g,e}=get();$('flDv').textContent=(100*d).toFixed(1)+'%';$('flGv').textContent=(100*g).toFixed(1)+'%';$('flEv').textContent=(100*e).toFixed(1)+'%';
    const nar=w<520,pl=44,pr=nar?10:16,pt=14,pb=40,H0=nar?250:280,X=v=>pl+(w-pl-pr)*v/0.6,Y=v=>pt+(H0-pt-pb)*(1-v);let s='',H=H0;
    [0,.25,.5,.75,1].forEach(v=>{s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-6,Y(v)+4,(100*v)+'%',{fs:11,a:'end',c:'var(--mute)'})});
    [0,.1,.2,.3,.4,.5,.6].forEach(v=>{if(nar&&Math.round(v*10)%2)return;s+=tx(X(v),H-pb+15,(100*v).toFixed(0)+'%',{fs:11,a:v>=.59?'end':'middle',c:'var(--mute)'})});
    s+=tx((pl+w-pr)/2,H-6,'true model error on valid questions',{fs:11,a:'middle',c:'var(--mute)'});
    s+=ln2(X(0),Y(0),X(0.6),Y(0.6),'var(--mute)',{da:'4 4'});
    const fl=E(0,d,g);s+=ln2(X(0),Y(fl),X(0.6),Y(fl),'var(--lq)',{da:'5 4',sw:1.4});
    let p1='',p2='';for(let k=0;k<=60;k++){const v=k/100;p1+=(k?'L':'M')+X(v).toFixed(1)+','+Y(E(v,d,g)).toFixed(1);p2+=(k?'L':'M')+X(v).toFixed(1)+','+Y(share(v,d,g)).toFixed(1)}
    s+='<path d="'+p1+'" fill="none" stroke="var(--ink)" stroke-width="2.2"/><path d="'+p2+'" fill="none" stroke="var(--lm)" stroke-width="2.2" stroke-dasharray="2 3"/>';
    // crossover: model's share of measured errors = 50%
    let lo=0,hi=0.6,cx=null;if(share(0.6,d,g)>=0.5&&share(0,d,g)<0.5){for(let k=0;k<50;k++){const m=(lo+hi)/2;if(share(m,d,g)<0.5)lo=m;else hi=m}cx=hi;
      s+=ln2(X(cx),Y(0),X(cx),Y(1),'var(--lm)',{op:.4})+tx(X(cx)+4,Y(0.04),'half the errors are the model\'s',{fs:11,c:'var(--lm)'})}
    s+='<circle cx="'+X(e).toFixed(1)+'" cy="'+Y(E(e,d,g)).toFixed(1)+'" r="5.5" fill="var(--ink)"/><circle cx="'+X(e).toFixed(1)+'" cy="'+Y(share(e,d,g)).toFixed(1)+'" r="4.5" fill="var(--lm)"/>';
    const lg=[['measured error','var(--ink)',''],['perfect benchmark (y = x)','var(--mute)','4 4'],['floor: a perfect model\'s error','var(--lq)','5 4'],['model\'s share of errors','var(--lm)','2 3']];let lx=pl,ly=H+4;
    lg.forEach(([n,c,da])=>{const lw2=n.length*6.2+30;if(lx+lw2>w-4&&lx>pl){lx=pl;ly+=16}s+=ln2(lx,ly-4,lx+20,ly-4,c,{sw:2.2,da})+tx(lx+24,ly,n,{fs:11});lx+=lw2});
    H=ly+8;
host.innerHTML=svgW(w,H,s,'Measured error against true model error');
    const m=E(e,d,g),sh=share(e,d,g),p=PRESET[P];
    $('flOut').innerHTML=stat('Measured score',(100*(1-m)).toFixed(1)+'%','what the benchmark reports')+stat('True accuracy on valid questions',(100*(1-e)).toFixed(1)+'%','what the model can do')+stat('Errors that are the model\'s',(100*sh).toFixed(0)+'%','of everything marked wrong')+stat('Floor',(100*fl).toFixed(1)+'%','measured error of a perfect model');
    const atP=Math.abs(d-p.d)<1e-9&&Math.abs(g-p.g)<1e-9&&Math.abs(e-(1-p.a))<1e-9;
    $('flNote').innerHTML=(atP?'<b>Defaults reproduce the audit run by construction:</b> '+P+' rejected '+p.rej+' of '+p.N+' ('+(100*p.rej/p.N).toFixed(1)+'%), the measured error shown. ':'')+'Preset values from '+A(ax('A3.T2'),'Table 2')+' and '+A(ax('A2.SS3'),'Appendix B.3')+': <i>d</i> = benchmark errors / questions, <i>e</i> = model errors / valid questions, <i>g</i> = grader errors / correct answers. On HLE-Physics and PHYBench the audit run allowed up to five attempts, so a "model error" there means failing all of them. Measured error = <i>d</i> + (1 − <i>d</i>)(<i>e</i> + (1 − <i>e</i>)<i>g</i>); it assumes every defective question is marked wrong.'}
  [['flD','d'],['flG','g'],['flE','e']].forEach(([id,k])=>$(id).addEventListener('input',ev=>{cur[k]=+ev.target.value/100;refit(host)}));
  segBind('flP',m=>{P=m;setPressed('flP',m);preset(m);refit(host)});preset(P);fit(host,draw)})();

// Third predict question: what the one-sided audit cannot see, on the HLE-Physics preset.
function scoreBars(host,rows,w){const lw=w<520?124:210,x0=lw,x1=w-50,rh=30,H=rows.length*rh+8,X=v=>x0+(x1-x0)*v;let s='';
  rows.forEach((r,i)=>{const y=4+i*rh;s+=tx(4,y+17,r.n,{fs:12});s+=rc(x0,y+4,x1-x0,20,'var(--soft)',{r:3})+rc(x0,y+4,X(r.v)-x0,20,r.c,{r:3})+tx(X(r.v)+5,y+19,(100*r.v).toFixed(1)+'%',{fs:12,w:600})});
  host.innerHTML=svgW(w,H,s,'Scores compared')}
PRED_REVEAL.pr3=function(){const p=Object.assign({},PRESET['HLE-Physics'],{f:0.03,c:0.05}),r=auditSim(p);
  fit($('p3Plot'),w=>{const n=w<520;scoreBars($('p3Plot'),[{n:n?'Raw score':'Raw score (audit run)',v:r.raw,c:'var(--mute)'},{n:n?'Paper\'s corrected':'Paper\'s corrected score',v:r.prot,c:'var(--lok)'},{n:n?'True accuracy':'True accuracy, valid questions',v:r.truth,c:'var(--ink)'}],w)})};
