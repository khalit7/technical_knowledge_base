// Reading: DCLM Table 5 bars, reference-set table, DCLM vocabulary, Nemotron-CC confusion matrix, repetition calculator
(function(){
  const D=window.QC, esc=RD.esc, pc=x=>x==null?'n/a':(x*100).toFixed(x<0.1&&x>0?1:0)+'%';
  // Table 5 bars
  const t5=document.getElementById('qc-t5');
  if(t5&&D.t5){t5.innerHTML=D.t5.map((r,i)=>'<div'+(i===0?' class="hl"':'')+'><span class="nm">'+esc(r.name)+'</span><span class="tr"><span style="width:'+(r.core/45*100).toFixed(1)+'%"></span></span><span class="v">'+r.core.toFixed(1)+'</span></div>').join('')+
    '<div class="small mute" style="display:block">Bars: Core (0 to 45 shown). MMLU: '+D.t5.map(r=>esc(r.name.split(',')[0])+(r.name.includes('15')?' (15%)':r.name.includes('20')?' (20%)':'')+' '+r.mmlu.toFixed(1)).join('; ')+'.</div>'}
  // reference table
  const rt=document.getElementById('qc-reftab');
  if(rt&&D.reftab){let h='<table><thead><tr><th>Classifier</th><th class="num">Keeps at its cut</th><th class="num">Overlap: DCLM</th><th class="num">Overlap: FineWeb-Edu</th><th class="num">Hand precision (n)</th><th class="num">Llama AUC</th></tr></thead><tbody>';
    D.reftab.forEach(r=>{h+='<tr><td style="min-width:10em">'+esc(r.label)+'</td><td class="num">'+pc(r.pub_keep)+'</td><td class="num">'+(r.key==='dclm'?'(itself)':pc(r.j_dclm))+'</td><td class="num">'+pc(r.j_edu)+'</td><td class="num">'+pc(r.hand_prec)+' <span class="mute">('+r.hand_kept+')</span></td><td class="num">'+(r.annot_auc==null?'n/a':r.annot_auc.toFixed(3))+'</td></tr>'});
    rt.innerHTML=h+'</tbody></table>'}
  // vocabulary lists
  const vl=(id,arr,cls)=>{const el=document.getElementById(id);if(el&&arr)el.innerHTML=arr.map(([w,s])=>'<span style="display:inline-block;margin:0 10px 2px 0;color:'+(cls==='k'?'var(--good)':'var(--bad)')+'">'+esc(w)+' <span class="mute">'+(s>0?'+':'')+s+'</span></span>').join('')};
  vl('qc-vtop',D.vtop,'k');vl('qc-vbot',D.vbot,'x');
  // Nemotron-CC confusion matrix
  function nemo(){
    const el=document.getElementById('qc-nemo');if(!el||!D.nemo)return;
    const L=D.nemo.levels,M=D.nemo.conf,W=Math.min(RD.width(el),560),lab=W<420?78:104,cell=Math.min(70,(W-lab-8)/5),H=cell*5+36;
    let g='',mx=0;M.forEach(r=>r.forEach(v=>{if(v>mx)mx=v}));
    L.forEach((l,j)=>{g+=RD.t(lab+cell*j+cell/2,16,l.replace('medium-','med-'),{a:'middle',fs:10.5})});
    M.forEach((r,i)=>{g+=RD.t(lab-6,30+cell*i+cell/2+4,L[i].replace('medium-','med-'),{a:'end',fs:10.5});
      r.forEach((v,j)=>{const x=lab+cell*j,y=30+cell*i;g+='<rect x="'+x+'" y="'+y+'" width="'+(cell-2)+'" height="'+(cell-2)+'" rx="3" fill="'+(i===j?'var(--good)':'var(--acc)')+'" fill-opacity="'+(0.08+0.8*v/mx).toFixed(2)+'"/>'+RD.t(x+cell/2-1,y+cell/2+4,v,{a:'middle',fs:11.5,w:i===j?600:400})})});
    el.innerHTML=RD.svg(W,H,g,'Confusion matrix of the rebuilt Nemotron-CC ensemble against published levels');
  }
  RD.onRender(nemo);RD.onResize(nemo);nemo();
  // repetition calculator
  const rc=document.getElementById('qc-rep-ctl');
  if(rc&&D.rep){
    rc.innerHTML='<label>Pool after dedup (trillion tokens) <input type="number" id="qc-rep-p" value="15" min="0.1" step="0.5"></label><label>Keep share <b id="qc-rep-kv">10%</b><input type="range" id="qc-rep-k" min="1" max="100" value="10"></label><label>Training tokens (trillion) <input type="number" id="qc-rep-t" value="15" min="0.1" step="0.5"></label>';
    const R=D.rep.rstar;
    function calc(){
      const P=+document.getElementById('qc-rep-p').value||15,k=+document.getElementById('qc-rep-k').value/100,T=+document.getElementById('qc-rep-t').value||15;
      document.getElementById('qc-rep-kv').textContent=Math.round(k*100)+'%';
      const U=P*k,ep=T/U,Rr=Math.max(0,ep-1),Deff=U+U*R*(1-Math.exp(-Rr/R));
      document.getElementById('qc-rep-out').innerHTML=RD.stat('Unique tokens kept',U.toFixed(2)+'T','pool x keep share')+RD.stat('Epochs needed',ep.toFixed(1),ep>4?'beyond about 4, repeats lose value fast':'repeats nearly as good as new')+
        RD.stat('Effective tokens',Deff.toFixed(2)+'T',(100*Deff/T).toFixed(0)+'% of the '+T+'T trained (Muennighoff fit)');
      const el=document.getElementById('qc-rep-svg'),W=Math.min(RD.width(el),640),H=170,Lm=46,iw=W-Lm-12,ih=H-46;
      let pts=[];for(let q=1;q<=100;q++){const u=P*q/100,e=T/u,rr=Math.max(0,e-1),d=u+u*R*(1-Math.exp(-rr/R));pts.push((Lm+(q-1)/99*iw).toFixed(1)+','+(10+ih-Math.min(1,d/T)*ih).toFixed(1))}
      let g='<rect x="'+Lm+'" y="10" width="'+iw+'" height="'+ih+'" fill="none" stroke="var(--line)"/><polyline fill="none" stroke="var(--acc)" stroke-width="2" points="'+pts.join(' ')+'"/>';
      const xk=Lm+(k*100-1)/99*iw;g+='<line x1="'+xk+'" x2="'+xk+'" y1="10" y2="'+(10+ih)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
      [0,0.5,1].forEach(v=>g+=RD.t(Lm-5,10+ih-v*ih+4,(v*100)+'%',{a:'end',fs:10.5}));[1,25,50,75,100].forEach(v=>g+=RD.t(Lm+(v-1)/99*iw,H-20,v+'%',{a:v===100?'end':v===1?'start':'middle',fs:10.5}));
      g+=RD.t(Lm+iw/2,H-4,'keep share of the pool',{a:'middle',fs:11})+RD.t(Lm+6,24,'effective / trained tokens',{fs:11,fill:'var(--acc)'});
      el.innerHTML=RD.svg(W,H,g,'Effective tokens as a share of training tokens against keep share');
    }
    rc.addEventListener('input',calc);RD.onRender(calc);RD.onResize(calc);calc();
  }
})();
