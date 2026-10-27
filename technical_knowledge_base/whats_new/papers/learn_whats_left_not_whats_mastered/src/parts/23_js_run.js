// ---- Train the toy tab: live trainer, all-methods chart, frontier, share table, PyTorch check ----
(function(){
  const TD=window.TOYDATA,MK=Object.keys(TOY.METHODS);
  const MC={grpo:'var(--mute)',gdpo:'var(--c2)',sa25:'#6f9fd6',sa50:'var(--c1)',sa75:'#1f4f8a',sa100:'#12305a',fw50:'#7fb08e',fw25:'var(--c3)',fw10:'#245536',conly:'var(--c4)'};
  const sel=$('runMeth');sel.innerHTML=MK.map(k=>'<option value="'+k+'"'+(k==='sa50'?' selected':'')+'>'+TOY.METHODS[k].n+'</option>').join('')+'<option value="custom">Custom: γ and fixed weight below</option>';
  const pct=v=>(100*v).toFixed(1)+'%';
  const syncCustom=()=>{$('runCustom').style.display=sel.value==='custom'?'':'none';$('runGv').textContent=(+$('runG').value).toFixed(2);$('runW').value;$('runWv').textContent=(+$('runW').value).toFixed(2)};
  sel.addEventListener('change',syncCustom);$('runG').addEventListener('input',syncCustom);$('runW').addEventListener('input',syncCustom);syncCustom();
  let last=null;
  function cfg(){return sel.value==='custom'?{agg:'dec',w:[1,+$('runW').value],gamma:+$('runG').value}:sel.value}
  function train(){const st=$('runSet').value,seed=+$('runSeed').value,t0=performance.now();
    const r=TOY.train({setting:st,method:cfg(),seed}),b=$('runCmp').checked?TOY.train({setting:st,method:'gdpo',seed}):null;
    last={st,r,b,ms:performance.now()-t0,name:sel.value==='custom'?'Custom (γ '+(+$('runG').value).toFixed(2)+', w_len '+(+$('runW').value).toFixed(2)+')':TOY.METHODS[sel.value].n};
    refit($('runSvg'));out()}
  function out(){if(!last)return;const {r,b}=last,f=r.final;let h=stat(last.name,'accuracy '+pct(f.acc),'length reward '+pct(f.len)+' · over the threshold '+pct(f.over)+' · mean length '+fmt(f.tok)+' tokens');
    if(b)h+=stat('GDPO, same seed','accuracy '+pct(b.final.acc),'length reward '+pct(b.final.len)+' · difference in accuracy '+(Math.abs(f.acc-b.final.acc)<0.0005?'0.0':((f.acc-b.final.acc)>0?'+':'−')+Math.abs(100*(f.acc-b.final.acc)).toFixed(1))+' points');
    const n=r.log.w1.length,lw=r.log.w1.slice(-20).reduce((a,c)=>a+c,0)/20;h+=stat('length weight share, last 20 steps',(100*lw).toFixed(1)+'%','start '+(100*r.log.w1[0]).toFixed(1)+'% · trained in '+Math.round(last.ms)+' ms');
    $('runOut').innerHTML=h}
  function drawLive(W){if(!last){$('runSvg').innerHTML='<p class="small mute">Press Train.</p>';return}
    const {r,b}=last,H2=110;const LG=legendW([['accuracy',CC,'l'],['length reward',CF,'l']].concat(b?[['GDPO, same seed','var(--mute)','da']]:[]),44,14,W-50),H1=210+LG.h;const F=linFrame({W,H:H1,pl:44,pr:10,pt:LG.h+18,pb:30,x:[0,150],y:[0,1],xl:'training step',yl:'reward / accuracy',fy:v=>Math.round(v*100)+'%'});let s=F.s;
    const thin=(arr,c)=>lineS(arr.map((v,i)=>[i+1,v]),F.X,F.Y,c,{sw:1,op:0.45});
    s+=thin(r.log.bc,CC)+thin(r.log.bl,CF);
    const ev=(run,k)=>run.log.ev.map(([t,e])=>[t,e[k]]);
    s+=lineS(ev(r,'acc'),F.X,F.Y,CC,{sw:2.4})+lineS(ev(r,'len'),F.X,F.Y,CF,{sw:2.4});
    if(b)s+=lineS(ev(b,'acc'),F.X,F.Y,CC,{sw:1.8,da:'5 3'})+lineS(ev(b,'len'),F.X,F.Y,CF,{sw:1.8,da:'5 3'});
    s+=LG.s;
    const G2=linFrame({W,H:H2,pl:44,pr:10,pt:12,pb:28,x:[0,150],y:[0,0.6],yt:[0,0.25,0.5],xl:'training step',yl:'length share',fy:v=>Math.round(v*100)+'%'});
    let s2=G2.s+lineS(r.log.w1.map((v,i)=>[i+1,v]),G2.X,G2.Y,'var(--c1)',{sw:1.8});if(b)s2+=lineS(b.log.w1.map((v,i)=>[i+1,v]),G2.X,G2.Y,'var(--mute)',{sw:1.4,da:'5 3'});
    $('runSvg').innerHTML=svgW(W,H1,s,'Training curves')+svgW(W,H2,s2,'Length weight share')}
  $('runGo').addEventListener('click',train);
  // all methods, 8 seeds
  let allSet='graded';
  function drawAll(W){const S=TD.settings[allSet],rows=MK.map(k=>({k,...S.methods[k]})),H=24+rows.length*30+34,pl=W<460?118:150,pr=50;
    const X=v=>pl+(W-pl-pr)*v;let s='';[0,0.25,0.5,0.75,1].forEach(v=>{s+=ln2(X(v),18,X(v),H-30,'var(--line)')+tx(X(v),H-16,Math.round(v*100)+'%',{fs:11,a:'middle',c:'var(--mute)'})});
    rows.forEach((m,i)=>{const y=24+i*30;s+=tx(pl-6,y+13,m.n,{fs:11.5,a:'end',w:m.k==='gdpo'?'700':null});
      s+=rc(X(0),y+2,X(m.acc)-X(0),10,CC,{r:2})+ln2(X(m.acc-m.accSE),y+7,X(m.acc+m.accSE),y+7,'var(--ink)',{sw:1.2})+tx(X(m.acc)+4,y+11,pct(m.acc),{fs:11});
      s+=rc(X(0),y+14,X(m.len)-X(0),8,CF,{r:2,op:0.85})+tx(X(m.len)+4,y+22,pct(m.len),{fs:11,c:'var(--mute)'})});
    s+=legendW([['accuracy (±1 SE)',CC,'l'],['length reward',CF,'l']],pl,12,W-pl).s;
    $('runAllSvg').innerHTML=svgW(W,H,s,'Final accuracy and length reward per method');
    const g=S.methods.gdpo,sa=S.methods.sa50,c=S.methods.conly,gr=S.methods.grpo;
    $('runAllNote').innerHTML=allSet==='graded'?'Graded setting: SA-MRPO raises accuracy over GDPO as γ grows (γ = 0.5: '+(100*sa.dAcc).toFixed(1)+' ± '+(100*sa.dAccSE).toFixed(1)+' points, paired by seed) while its length reward falls ('+pct(g.len)+' to '+pct(sa.len)+'), the paper\'s Table 2 and Table 4 pattern. Fixed weights do the same: GDPO with length weight 0.5 gains '+(100*S.methods.fw50.dAcc).toFixed(1)+' points at a length reward of '+pct(S.methods.fw50.len)+'. Correctness only (no length reward at all) reaches '+pct(c.acc)+' with almost every answer over budget.'
      :'Binary-budget setting: every GDPO and SA-MRPO variant ends within half a point (SA-MRPO γ = 0.5 against GDPO: '+((sa.dAcc>=0?'+':'−')+Math.abs(100*sa.dAcc).toFixed(1))+' ± '+(100*sa.dAccSE).toFixed(1)+' points, paired). Plain GRPO (sum first) and correctness only end '+(100*gr.dAcc).toFixed(1)+' and '+(100*c.dAcc).toFixed(1)+' points above GDPO here, with length rewards of '+pct(gr.len)+' and '+pct(c.len)+'. The toy does not reproduce Table 1\'s gains.'}
  segBind('runAllM',m=>{allSet=m;refit($('runAllSvg'))});
  // frontier
  let frSet='graded',FR=null;
  function interpW(ws,len){const p=ws.slice().sort((a,b)=>a.len-b.len);for(let i=0;i+1<p.length;i++){if(len>=p[i].len&&len<=p[i+1].len){const t=(len-p[i].len)/((p[i+1].len-p[i].len)||1);return p[i].acc+t*(p[i+1].acc-p[i].acc)}}return null}
  function drawFront(W){const S=(FR||TD.settings)[frSet].frontier;const all=S.w.concat(S.g),lo=Math.min(...all.map(p=>p.len)),xlo=frSet==='budget'?Math.max(0.9,Math.floor(lo*100-1)/100):Math.max(0,Math.floor(lo*10)/10);
    const ylo=Math.floor(Math.min(...all.map(p=>p.acc))*50)/50-0.01,yhi=Math.ceil(Math.max(...all.map(p=>p.acc))*50)/50+0.01,H=W<460?300:280;
    const F=linFrame({W,H,pl:48,pr:26,pt:30,pb:32,x:[xlo,1.0],y:[ylo,yhi],xl:'final length reward (higher is better)',yl:'final accuracy',fx:v=>Math.round(v*1000)/10+'%',fy:v=>Math.round(v*1000)/10+'%'});let s=F.s;
    const ser=(pts,c,lab)=>{const q=pts.slice().sort((a,b)=>a.len-b.len);let t=lineS(q.map(p=>[p.len,p.acc]),F.X,F.Y,c,{sw:2});
      pts.forEach(p=>{t+=ln2(F.X(p.len),F.Y(p.acc-p.accSE),F.X(p.len),F.Y(p.acc+p.accSE),c,{sw:1})+dotS(F.X(p.len),F.Y(p.acc),3.6,c,{t:lab(p)+': accuracy '+pct(p.acc)+', length reward '+pct(p.len)})});return t};
    s+=ser(S.w,CC,p=>'GDPO, fixed length weight '+p.wl)+ser(S.g,'var(--c1)',p=>'SA-MRPO, γ = '+p.g);
    const lab=[];S.g.forEach(p=>{if([0,0.5,1,3].includes(p.g))lab.push({x:F.X(p.len),y:F.Y(p.acc),t:'γ '+p.g,c:'var(--c1)'})});S.w.forEach(p=>{if([1,0.5,0.25,0.1].includes(p.wl))lab.push({x:F.X(p.len),y:F.Y(p.acc),t:'w '+p.wl,c:CC})});
    placeLabels(lab,W,H).forEach(p=>{s+=tx(p.lx,p.ly,p.t,{fs:11,a:p.la,c:p.c})});
    s+=legendW([['SA-MRPO, γ from 0 to 3','var(--c1)','l'],['GDPO, fixed length weight 1 to 0.05',CC,'l']],48,14,W-54).s;
    $('runFrontSvg').innerHTML=svgW(W,H,s,'Accuracy against length reward');
    const d=S.g.filter(p=>p.g>0).map(p=>{const a=interpW(S.w,p.len);return a==null?null:[p.g,a-p.acc]}).filter(Boolean);
    $('runFrontOut').innerHTML=d.length?stat('fixed weight minus SA-MRPO, at matched length reward',d.map(([g,v])=>'γ '+g+': '+(v>=0?'+':'−')+Math.abs(100*v).toFixed(1)).join(' · '),'accuracy points; positive means the fixed weight did better'):''}
  segBind('runFrontM',m=>{frSet=m;refit($('runFrontSvg'))});
  $('runFrontGo').addEventListener('click',()=>{const SEEDS=TD.seeds,jobs=[];['budget','graded'].forEach(st=>{[1,0.75,0.5,0.4,0.3,0.25,0.2,0.15,0.1,0.05].forEach(wl=>jobs.push([st,'w',wl])),[0,0.25,0.5,0.75,1,1.5,2,3].forEach(g=>jobs.push([st,'g',g]))});
    const R={budget:{frontier:{w:[],g:[]}},graded:{frontier:{w:[],g:[]}}};let i=0,maxd=0;const m=a=>a.reduce((x,y)=>x+y,0)/a.length,se=a=>{const mm=m(a);return Math.sqrt(a.reduce((x,y)=>x+(y-mm)**2,0)/(a.length-1)/a.length)};
    const step=()=>{const t0=performance.now();while(i<jobs.length&&performance.now()-t0<120){const [st,k,v]=jobs[i++];const f=SEEDS.map(sd=>TOY.train({setting:st,method:k==='w'?{agg:'dec',w:[1,v],gamma:0}:{agg:'dec',w:[1,1],gamma:v},seed:sd}).final);
        const p={acc:m(f.map(x=>x.acc)),len:m(f.map(x=>x.len)),accSE:se(f.map(x=>x.acc)),lenSE:se(f.map(x=>x.len))};p[k==='w'?'wl':'g']=v;R[st].frontier[k].push(p);
        const ref=TD.settings[st].frontier[k].find(q=>(k==='w'?q.wl:q.g)===v);maxd=Math.max(maxd,Math.abs(ref.acc-p.acc),Math.abs(ref.len-p.len))}
      $('runFrontSt').textContent=' '+i+' of '+jobs.length+' points';
      if(i<jobs.length)setTimeout(step,0);else{FR=R;$('runFrontSt').textContent=' done: matches the shipped sweep to '+maxd.toExponential(1)+' (the sweep stores 4 decimals)';refit($('runFrontSvg'))}};step()});
  // share table
  function drawShare(){let h='<table><tr><th>setting</th><th>method</th><th class="num">groups where correctness varies (start → end)</th><th class="num">groups where length varies</th><th class="num">length share of the advantage</th><th class="num">final accuracy</th></tr>';
    ['budget','graded'].forEach(st=>['gdpo','sa50','sa100','fw25'].forEach(k=>{const v=TD.settings[st].methods[k];
      h+='<tr><td>'+(st==='budget'?'binary budget':'graded')+'</td><td>'+v.n+'</td><td class="num">'+pct(v.mixC0)+' → '+pct(v.mixC1)+'</td><td class="num">'+pct(v.mixL0)+' → '+pct(v.mixL1)+'</td><td class="num">'+pct(v.shL0)+' → '+pct(v.shL1)+'</td><td class="num">'+pct(v.acc)+'</td></tr>'}));
    $('runShareTbl').innerHTML=h+'</table>'}
  // check
  const C=window.TOYCHECK;$('runCheckOut').innerHTML=C?'<p class="small"><b>'+C.verdict+'</b>: '+C.cases+' batches (both settings, all 10 methods, a policy 40 steps into training). The advantages recomputed in PyTorch from the paper\'s formulas (§3, §4.1, Eq. 1) match the page\'s engine to '+C.max_abs_diff_advantage.toExponential(1)+', and the gradient from autograd of the clipped surrogate at ratio 1 matches to '+C.max_abs_diff_gradient.toExponential(1)+' (<code>check_engine.mjs</code>, <code>check_engine.py</code>).</p>':'<p class="small">check not run</p>';
  onTab('t-run',()=>{if(!last)train();fit($('runSvg'),drawLive);fit($('runAllSvg'),drawAll);fit($('runFrontSvg'),drawFront);drawShare()});
})();
