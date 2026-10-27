// ---- The paper tab: the 2x2 grid, Figure 1, the one-prefix gradient card, Figures 3 and 5, the RLVR table ----
(function(){
  if(!window.PAPER||!$('t-read'))return;
  const TB=PAPER.tables,RC=PAPER.rc,V=window.OPDV,CF=V.CF,CR=V.CR;
  const CFG=['OnPD F-KL','OnPD R-KL','OffPD F-KL','OffPD R-KL'];
  const bar=(k,l)=>TB.F1.bars_id.find(b=>b.config===k&&b.lr===l);
  const spb=(k,l)=>TB.F1.bars_sparsity.find(b=>b.config===k&&b.lr===l);
  // scatter points carry the OOD SEM; their LR is the one whose bar matches their ID accuracy
  const oodPt=(k,l)=>{const v=bar(k,l).value;return TB.F1.scatter.filter(s=>s.config===k).sort((a,b)=>Math.abs(a.id-v)-Math.abs(b.id-v))[0]};
  const base=TB.F1.scatter.find(s=>s.config==='untrained baseline');

  // the 2 x 2 of rollout policy and KL direction
  (function(){const el=$('pairsSvg');if(!el)return;
    const cell=(k,conv)=>{const a=bar(k,'1e-5').value,b=bar(k,'5e-5').value,best=Math.max(a,b),c=/F-KL/.test(k)?CF:CR;
      return '<td style="border-left:4px solid '+c+';padding:8px 10px;vertical-align:top"><div style="font-size:22px;font-weight:700">'+best.toFixed(0)+'%</div><div class="small mute">'+a.toFixed(1)+'% at 10⁻⁵, '+b.toFixed(1)+'% at 5×10⁻⁵</div>'+(conv?'<div class="small"><b>conventional pairing</b></div>':'<div class="small mute">crossed pairing</div>')+'</td>'};
    el.innerHTML='<div class="tw"><table style="width:100%;table-layout:fixed"><thead><tr><th style="width:28%"></th><th>forward KL</th><th>reverse KL</th></tr></thead><tbody>'
      +'<tr><th style="text-align:left">Teacher writes (OffPD)</th>'+cell('OffPD F-KL',true)+cell('OffPD R-KL',false)+'</tr>'
      +'<tr><th style="text-align:left">Student writes (OnPD)</th>'+cell('OnPD F-KL',false)+cell('OnPD R-KL',true)+'</tr></tbody></table></div>'})();

  // Figure 1 as grouped bars
  (function(){const el=$('f1Svg');if(!el)return;let m='id';
    const caps={id:'Held-out task accuracy, mean of MedReason, Science and Countdown-3. Forward KL is flat; reverse KL depends on both the rollout policy and the learning rate.',
      ood:'Change in mean out-of-distribution score from the untrained student. The learning rate splits the bars into two groups; the rollout policy moves them by at most three points.',
      sp:'Share of parameters that moved by less than 10⁻⁶. Again the learning rate splits them; off-policy is at least as sparse as on-policy in each matched pair.'};
    function draw(w){const H=w<520?250:270,pl=44,pr=8,pt=26,pb=48;
      let rows=[];CFG.forEach(k=>['1e-5','5e-5'].forEach(l=>{let v,e;
        if(m==='id'){const b=bar(k,l);v=b.value;e=b.sem}else if(m==='sp'){const b=spb(k,l);v=b.value;e=b.sem}else{const p=oodPt(k,l);v=p.ood-base.ood;e=p.sem_ood}
        rows.push({k,l,v,e})}));
      const y=m==='id'?[0,100]:m==='sp'?[0,100]:[-16,4];
      const F=linFrame({W:w,H,pl,pr,pt,pb,x:[0,1],y,xt:[],fy:v=>v+(m==='ood'?'':'%'),yl:m==='id'?'accuracy (%)':m==='sp'?'parameters barely moved (%)':'change (points)'});
      let s=F.s;const gw=(w-pl-pr)/4,bw=Math.min(28,gw*.32);
      if(m==='ood')s+=ln2(pl,F.Y(0),w-pr,F.Y(0),'var(--mute)',{sw:1});
      rows.forEach((r,i)=>{const g=Math.floor(i/2),j=i%2,cx=pl+gw*g+gw/2+(j?bw*.6:-bw*.6),c=/F-KL/.test(r.k)?CF:CR;
        const y0=F.Y(m==='ood'?0:y[0]),y1=F.Y(r.v);
        s+=rc(cx-bw/2,Math.min(y0,y1),bw,Math.abs(y1-y0),c,{r:2,op:j?1:.5});
        if(r.e)s+=ln2(cx,F.Y(r.v-r.e),cx,F.Y(r.v+r.e),'var(--ink)',{sw:1});
        const ly=m==='ood'?(r.v<0?y1+13:y1-4):F.Y(r.v+(r.e||0))-4;
        s+=tx(cx,ly,(m==='ood'&&r.v>0?'+':'')+r.v.toFixed(m==='ood'?1:0),{fs:11,a:'middle'})});
      CFG.forEach((k,g)=>{const cx=pl+gw*g+gw/2;s+=tx(cx,H-pb+16,k.split(' ')[0],{fs:11,a:'middle',w:'700'})+tx(cx,H-pb+30,/F-KL/.test(k)?'forward':'reverse',{fs:11,a:'middle',c:/F-KL/.test(k)?CF:CR})});
      s+=rc(pl,4,12,12,'var(--mute)',{op:.5,r:2})+tx(pl+16,14,'10⁻⁵',{fs:11})+rc(pl+58,4,12,12,'var(--mute)',{r:2})+tx(pl+74,14,'5 × 10⁻⁵ (learning rate)',{fs:11});
      el.innerHTML=svgW(w,H,s,'Figure 1 rebuilt');$('f1Cap').textContent=caps[m]}
    segBind('f1M',v=>{m=v;refit(el)});onTab('t-read',()=>fit(el,draw));fit(el,draw)})();

  // one prefix, two gradients (Theorem C.2's two-token case and its mirror)
  (function(){const el=$('grSvg');if(!el)return;let m='spike';
    function state(){const e=Math.pow(10,+$('grS').value);
      const pS=m==='spike'?[.5,.5]:[e,1-e],pT=m==='spike'?[e,1-e]:[.5,.5];
      const r=pS.map((p,i)=>Math.log(p/pT[i])),D=pS[0]*r[0]+pS[1]*r[1];
      const gF=pS.map((p,i)=>p-pT[i]),gR=pS.map((p,i)=>p*(r[i]-D));return {e,pS,pT,gF,gR,D}}
    function draw(w){const S=state(),n=v=>Math.hypot(v[0],v[1]);
      $('grL').textContent=m==='spike'?'teacher probability δ of token A':'student probability ε of token A';$('grV').textContent=S.e<1e-3?S.e.toExponential(1):S.e.toFixed(3);
      const H1=128,H2=170,pl=8,bw=Math.min(40,w/10),cx=[w*0.27,w*0.73];let s='';
      // probabilities
      s+=tx(pl,12,'next-token probabilities',{fs:11,c:'var(--mute)'})+tx(w-pl,12,'■ student  ■ teacher',{fs:11,a:'end',c:'var(--mute)'});
      ['A','B'].forEach((t,i)=>{const hh=76;
        [ [S.pS[i],'var(--c1)'],[S.pT[i],'var(--c3)']].forEach(([p,c],j)=>{const x=cx[i]-bw-4+j*(bw+8),h=Math.max(1,p*hh);s+=rc(x,26+hh-h,bw,h,c,{r:2})+tx(x+bw/2,26+hh-h-3,p<0.001?p.toExponential(0):p.toFixed(3),{fs:11,a:'middle'})});
        s+=tx(cx[i],H1-8,'token '+t,{fs:12,a:'middle',w:'700'})});
      s=s.replace('■ student  ■ teacher','<tspan fill="var(--c1)">■</tspan> student  <tspan fill="var(--c3)">■</tspan> teacher');
      // gradients on one symmetric scale
      const G=Math.max(1.3,Math.abs(S.gR[0])*1.15,Math.abs(S.gR[1])*1.15),mid=H1+16+(H2-24)/2,sc=(H2-44)/2/G;
      s+=tx(pl,H1+12,'gradient on each logit',{fs:11,c:'var(--mute)'})+tx(w-pl,H1+12,'<tspan fill="'+CF+'">■</tspan> forward KL  <tspan fill="'+CR+'">■</tspan> reverse KL',{fs:11,a:'end',c:'var(--mute)'});
      s+=ln2(pl,mid,w-pl,mid,'var(--mute)',{sw:1});
      s+=ln2(pl,mid-sc,w-pl,mid-sc,CF,{da:'4 3',op:.6})+ln2(pl,mid+sc,w-pl,mid+sc,CF,{da:'4 3',op:.6});
      ['A','B'].forEach((t,i)=>{
        [ [S.gF[i],CF],[S.gR[i],CR]].forEach(([g,c],j)=>{const x=cx[i]-bw-4+j*(bw+8),h=g*sc;s+=rc(x,h>0?mid-h:mid,bw,Math.max(1,Math.abs(h)),c,{r:2});
          s+=tx(x+bw/2,h>0?mid-h-3:mid-h+12,(g>=0?'+':'')+(Math.abs(g)<0.001&&g!==0?g.toExponential(0):g.toFixed(3)),{fs:11,a:'middle'})})});
      el.innerHTML=svgW(w,H1+H2,s,'student and teacher probabilities and the two logit gradients');
      const nf=n(S.gF),nr=n(S.gR);
      $('grCnt').innerHTML=stat('forward-KL gradient length',nf.toFixed(3),'never above √2 = 1.414')+stat('reverse-KL gradient length',nr<0.001?nr.toExponential(1):nr.toFixed(3),m==='spike'?'(√2 / 4) log((1 − δ)/δ)':'shrinks with ε')+stat('reverse / forward',(nr/nf).toFixed(nr/nf<0.01?4:2)+'×','');
      $('grCap').innerHTML=m==='spike'?'The student splits evenly; the teacher gives token A only δ. Forward KL asks for a change of about 0.5 on each logit however small δ gets. Reverse KL asks for (1/4) log((1 − δ)/δ): at δ = 10⁻⁸ that is 4.6 per logit. One such prefix in a batch can dominate the update, which is what gradient clipping is there to stop (Appendix A.1).'
        :'The teacher splits evenly; the student gives token A only ε. Forward KL pushes token A up by about 0.5 whatever ε is. Reverse KL multiplies by ε: at ε = 10⁻⁴ its push is about 0.0004 per logit, so a teacher mode the student has dropped is almost never recovered. Only the student\'s own probability opens the door, which is why reverse KL wants the student\'s own rollouts.'}
    segBind('grM',v=>{m=v;$('grS').value=v==='spike'?-3:-4;refit(el)});$('grS').addEventListener('input',()=>refit(el));onTab('t-read',()=>fit(el,draw));fit(el,draw)})();

  // Figure 3 rebuilt
  (function(){const el=$('f3Svg');if(!el)return;let m=0;
    const meta=[{y:[0,100],yl:'held-out accuracy (%)',fy:v=>v+'%'},{y:[-18,4],yl:'change in OOD score (points)',fy:v=>String(v)},{y:[55,92],yl:'parameters barely moved (%)',fy:v=>v+'%'}];
    function draw(w){const P=TB.F3[m],ser=[];
      [['forward','f'],['reverse','r']].forEach(([n,k])=>['1e-5','5e-5'].forEach(l=>ser.push({n:n+' KL, '+(l==='1e-5'?'10⁻⁵':'5×10⁻⁵'),c:V.col(k),da:l==='1e-5'?'5 3':null,pts:P[n+' '+l].map(r=>[r[0]+0,r[1],r[2]])})));
      el.innerHTML=V.lamChart(w,ser,{y:meta[m].y,yl:meta[m].yl,fy:meta[m].fy,leg:[['forward KL',CF,'l'],['reverse KL',CR,'l'],['dashed: LR 10⁻⁵','var(--mute)','da']],label:'Figure 3 rebuilt'})}
    segBind('f3M',v=>{m=+v;refit(el)});onTab('t-read',()=>fit(el,draw));fit(el,draw)})();

  // Figure 5 rebuilt
  (function(){const el=$('f5Svg');if(!el)return;let m='3';
    function draw(w){const F=TB.F5,get=n=>F.find(p=>p.panel===n).rows_lambda_p1_sem_p10_sem,ser=[];
      const t=m==='3'?'Countdown-3':'Countdown-4E';
      [['forward','f'],['reverse','r']].forEach(([n,k])=>{const R=get(t+' '+n);ser.push({n:n+' KL pass@1',c:V.col(k),da:'5 3',pts:R.map(r=>[r[0]+0,r[1],r[2]])});ser.push({n:n+' KL pass@10',c:V.col(k),pts:R.map(r=>[r[0]+0,r[3],r[4]])})});
      el.innerHTML=V.lamChart(w,ser,{y:m==='3'?[0,100]:[0,40],yl:'pass@k (%)',fy:v=>v+'%',leg:[['forward KL',CF,'l'],['reverse KL',CR,'l'],['dashed: pass@1','var(--mute)','da']],label:'Figure 5 rebuilt'})}
    segBind('f5M',v=>{m=v;refit(el)});onTab('t-read',()=>fit(el,draw));fit(el,draw)})();

  // RLVR after distillation (Figures 6 and 26), as a table of decoded curve summaries
  (function(){const el=$('f6');if(!el)return;const rl=RC.rl,f=v=>v.toFixed(2);
    let h='<div class="card"><div class="tw"><table><thead><tr><th>distilled with</th><th>LR</th><th class="num">start</th><th class="num">peak (step)</th><th class="num">last 50 steps</th></tr></thead><tbody>';
    [['F6','10⁻⁵'],['F26','5×10⁻⁵']].forEach(([F,l])=>['OffPD F-KL','OnPD F-KL','OffPD R-KL','OnPD R-KL'].forEach(k=>{const r=rl[F+' '+k];
      h+='<tr><td><span style="color:'+(/F-KL/.test(k)?CF:CR)+'">■</span> '+k+'</td><td>'+l+'</td><td class="num">'+r.start.map(f).join(', ')+'</td><td class="num">'+r.peak.map((v,i)=>f(v)+' ('+r.peak_step[i]+')').join(', ')+'</td><td class="num">'+r.end50.map(f).join(', ')+'</td></tr>'}));
    el.innerHTML=h+'</tbody></table></div><p class="small mute" style="margin:6px 0 0">Mean training reward on Countdown-4 per distillation seed (three numbers per cell), decoded from %F626%: reward is 2 per correct answer, so 0.20 means 10% correct. "Last 50 steps" averages the logged rewards from step 250 to 300 to smooth the batch noise. One RLVR seed (42) throughout.</p></div>'.replace('%F626%','<a href="'+PAPER.meta.ax+'#S5.F6" target="_blank" rel="noopener noreferrer">Figures 6</a> and <a href="'+PAPER.meta.ax+'#A4.F26" target="_blank" rel="noopener noreferrer">26</a>')})();
})();
