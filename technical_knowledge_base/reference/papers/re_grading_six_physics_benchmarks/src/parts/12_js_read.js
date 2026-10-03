// ---- The paper tab: case gallery, Figure 1 and Figure 2 rebuilt ----
const T=PAPER.tables, RC=PAPER.rc;
const BN=T.t1.map(r=>r.b);
const MN={gpt:'GPT-5.6-Sol',fable:'Fable 5',gem:'Gemini 3.1 Pro'};
const LC={Q:'var(--lq)',G:'var(--lg)',M:'var(--lm)',ok:'var(--lok)',rp:'var(--lrp)',x:'var(--lx)'};
const LN={Q:'Benchmark error',G:'Grader error',M:'Model error'};
const pct=(v,d)=>(v==null?'n/a':v.toFixed(d==null?1:d)+'%');
const ax=a=>PAPER.meta.ax+'#'+a;
// label text on a coloured bar: white on the colours in light mode, near-black in dark mode
const btx=(x,y,t,plain)=>'<text x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'" font-size="11" font-weight="600" text-anchor="middle" class="'+(plain?'':'bt')+'">'+t+'</text>';
function setPressed(id,m){document.querySelectorAll('#'+id+' button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'))}

// Case gallery: the paper's worked examples (Figures 3 to 6, Appendices D and E), final answers only.
const CASES=[
 {t:'PHYBench 140: rope around four balls',l:'G',at:'S3.F3',w:'Figure 3',
  p:'Three identical homogeneous balls touch on a smooth horizontal surface; a rope is wrapped around them at the height of their centres; a fourth identical sphere is placed on top. Find the tension <i>T</i> in the rope, given that each sphere weighs <i>P</i>.',
  m:'<i>T</i> = <i>P</i> / (3√6)',r:'<i>T</i> = (√6 / 18) <i>P</i>',n:'Multiply top and bottom by √6 and one becomes the other. EED score 0.0, binary score 0. Reviewer: "Expressions are algebraically the same."'},
 {t:'PHYBench: a bug on a rotating disk',l:'G',at:'A4.SS2',w:'Appendix D.2',
  p:'A bug of mass <i>m</i> crawls on a disk of radius 2<i>R</i> along a circle of radius <i>R</i> through the centre, at the same angular speed as the disk rotates (<i>ω</i>, same direction). Find the maximum force between bug and disk.',
  m:'<i>F</i><sub>max</sub> = 5<i>mRω</i>²',r:'<i>F</i><sub>max</sub> = 5<i>mω</i>²<i>R</i>',n:'The same factors in a different order. EED score 0.0, binary score 0.'},
 {t:'PRISM-Physics: an Olympic diver',l:'G',at:'A4.SS2',w:'Appendix D.2',
  p:'A diver drops from a 10 m board (<i>g</i> = 9.8 m/s²); under water buoyancy cancels weight and drag is <i>bv</i>². Find the impact speed and time, <i>V</i>(<i>x</i>) under water, the depth where <i>V</i> = <i>V</i><sub>0</sub>/10 for <i>b</i>/<i>m</i> = 2/5 per metre, and <i>x</i>(<i>t</i>).',
  m:'14 m/s, about 1.43 s; <i>V</i> = <i>V</i><sub>0</sub>e<sup>−<i>bx</i>/<i>m</i></sup>; about 5.76 m; <i>x</i> = (<i>m</i>/<i>b</i>) ln(1 + <i>bV</i><sub>0</sub><i>t</i>/<i>m</i>)',r:'14 m/s, 1.43 s; <i>V</i> = <i>V</i><sub>0</sub>e<sup>−(<i>b</i>/<i>m</i>)<i>x</i></sup>; (5/2) ln 10 = 5.76 m; the same <i>x</i>(<i>t</i>) written with (<i>bV</i><sub>0</sub>/<i>m</i>)<i>t</i>',n:'Every part agrees up to notation and rounding. Binary score 0. Reviewer: "The two responses are identical."'},
 {t:'HLE-Physics: polymer force law',l:'G',at:'A4.SS2',w:'Appendix D.2',
  p:'A freely jointed chain of <i>n</i> mass points with struts of length <i>ℓ</i> is thermally isolated. Give the force law between its ends for small, slowly changing separation <i>x</i>, in terms of <i>x</i>, <i>ℓ</i>, <i>n</i> and the kinetic energy at zero extension <i>E</i>(0).',
  m:'<i>F</i> = −(3<i>E</i>(0)<i>x</i> / <i>n</i>²<i>ℓ</i>²) exp(3<i>x</i>² / 2<i>n</i>²<i>ℓ</i>²), which for small <i>x</i> is −3<i>E</i>(0)<i>x</i> / <i>n</i>²<i>ℓ</i>²',r:'<i>F</i> = 3<i>E</i>(0)<i>x</i> / (<i>nℓ</i>)²',n:'Equal in the requested small-<i>x</i> limit; the minus sign only says the force is attractive. Binary score 0. Reviewer: "Answers are the same, after the limit is taken."'},
 {t:'PHYBench: a reference that is always zero',l:'Q',at:'A4.SS1',w:'Appendix D.1',
  p:'Two spacecraft move with equal speeds relative to a medium that flows at <i>u</i>; their lab-frame speeds <i>v</i><sub>1</sub>, <i>v</i><sub>2</sub> and the acute angle <i>α</i> between them are given. Relativistically, find the minimum possible <i>u</i>.',
  m:'<i>u</i><sub>min</sub> = <i>c</i>²|<i>γ</i><sub>1</sub> − <i>γ</i><sub>2</sub>| / √(<i>γ</i><sub>1</sub>²<i>v</i><sub>1</sub>² + <i>γ</i><sub>2</sub>²<i>v</i><sub>2</sub>² − 2<i>γ</i><sub>1</sub><i>γ</i><sub>2</sub><i>v</i><sub>1</sub><i>v</i><sub>2</sub> cos <i>α</i>)',r:'An expression that simplifies to <i>u</i><sub>min</sub> = 0',n:'Reviewer: "Reference answer equals 0, which is incorrect."'},
 {t:'PRISM-Physics: time of flight with no data',l:'Q',at:'A4.SS1',w:'Appendix D.1',
  p:'An electron is emitted and then detected. Select the time of flight <i>t</i><sub>f</sub>: (a) 330 ns, (b) 66 ns, (c) 33 ns.',
  m:'Cannot be determined from the information given; no option can be chosen.',r:'(c) 33 ns',n:'Reviewer: "Not enough information is given in the problem."'},
 {t:'UGPhysics: is critical damping the fastest?',l:'Q',at:'A4.SS1',w:'Appendix D.1',
  p:'A damped oscillator with restoring force −<i>kx</i> and resistance −<i>rẋ</i>: a true-or-false question about whether critical damping returns the particle to equilibrium fastest.',
  m:'True (yes)',r:'No',n:'Reviewer: critical damping is the fastest decay without overshoot, not necessarily the fastest way to reach equilibrium; "perhaps the question meant \'without overshoot,\' but it didn\'t state that." Two readings, two answers.'},
 {t:'HLE-Physics: four stars, one arithmetic slip',l:'Q',at:'A4.SS1',w:'Appendix D.1',
  p:'Four stars appear equally spaced in angle to one observer; another sees <i>S</i><sub>1</sub> and <i>S</i><sub>2</sub> at a right angle and <i>S</i><sub>3</sub> at 3π/4 to both. Find (1 − cos <i>θ</i><sub>14</sub>) / (1 − cos <i>θ</i><sub>34</sub>).',
  m:'2 − √2',r:'−√2',n:'Reviewer: the reference has the right algebraic expression but does the final arithmetic wrong; "they should obtain 2 − √2."'},
 {t:'CritPt 44: which spin operators?',l:'Q',at:'S3.F4',w:'Figure 4',
  p:'The Kitaev honeycomb model at the isotropic point (<i>J</i> = 1) on a 3x2 lattice with periodic boundaries: count the degenerate ground states, those in the flux-free sector, and give the ground-state energy to three decimals.',
  m:'(depends on the convention the model assumes)',r:'(a number fixed only once the convention is fixed)',n:'The Hamiltonian is not written, so <i>J</i> = 1 may multiply Pauli matrices or spin-½ operators <i>S</i> = σ/2, and the energies differ by a factor of four. Repaired by writing <i>H</i> explicitly with Pauli matrices.'},
 {t:'CMT-Benchmark 31: an Ising chain, repaired',l:'Q',at:'A6.F6',w:'Figure 6',
  p:'A quantum Ising model <i>H</i> = −Σ σ<sup>z</sup>σ<sup>z</sup> + <i>h</i> Σ σ<sup>x</sup> + <i>g</i> Σ σ<sup>z</sup>: which of (a) gap closes at <i>h</i> = 1, <i>g</i> = 0; (b) a symmetry-breaking transition at finite <i>h</i>; (c) the zz correlator decays exponentially at <i>h</i> = 10, <i>g</i> = 1; (d) the xx correlator decays as a power law at <i>h</i> = 0.1, <i>g</i> = 1 are correct?',
  m:'a; b (original question); a; b; c after repair',r:'a; c (original); a; b; c after repair',n:'The dimension and bond counting were unstated (<i>h</i> = 1 assumes one dimension), (b) omitted the <i>g</i> = 0 transition, and with <i>g</i> ≠ 0 the ordinary correlator in (c) tends to a nonzero constant; only the connected one decays. The repair states all three and changes the key to a; b; c.'},
 {t:'CritPt 18: a genuine model error',l:'M',at:'A5.F5',w:'Figure 5, Appendix E',
  p:'Two nanoparticles in two Gaussian optical tweezers, polarizabilities <i>α</i><sub>1</sub>, <i>α</i><sub>2</sub>: derive the coupling constants <i>k</i><sub>1</sub>, <i>k</i><sub>2</sub> in their equations of motion along <i>z</i>.',
  m:'<i>k</i><sub>1</sub> ∝ <i>α</i><sub>1</sub><i>α</i><sub>2</sub> cos(<i>kd</i><sub>0</sub>) cos(<i>φ</i><sub>1</sub> − <i>φ</i><sub>2</sub>), <i>k</i><sub>2</sub> ∝ <i>α</i><sub>1</sub><i>α</i><sub>2</sub> sin(<i>kd</i><sub>0</sub>) sin(<i>φ</i><sub>1</sub> − <i>φ</i><sub>2</sub>)',r:'<i>k</i><sub>1</sub> ∝ Re[<i>α</i><sub>1</sub><i>α</i><sub>2</sub>e<sup><i>ikd</i><sub>0</sub></sup>] cos(<i>φ</i><sub>1</sub> − <i>φ</i><sub>2</sub>), <i>k</i><sub>2</sub> ∝ Im[<i>α</i><sub>1</sub><i>α</i><sub>2</sub>e<sup><i>ikd</i><sub>0</sub></sup>] sin(<i>φ</i><sub>1</sub> − <i>φ</i><sub>2</sub>)',n:'All four GPT-5.6-Sol Max attempts assume real polarizabilities, which the problem never states, and so give only a special case of the general result. The common prefactor is omitted here.'}
];
(function(){const sel=$('galSel');CASES.forEach((c,i)=>{const o=document.createElement('option');o.value=i;o.textContent=LN[c.l]+': '+c.t;sel.appendChild(o)});
  function show(){const c=CASES[+sel.value];
    $('galBody').innerHTML='<div><span class="lbx '+c.l.toLowerCase()+'">'+LN[c.l]+'</span> <span class="small mute">'+A(ax(c.at),c.w)+'</span></div><p class="pb">'+c.p+'</p><div class="ans"><div><div class="h">Model\'s final answer</div>'+c.m+'</div><div><div class="h">Benchmark\'s reference answer</div>'+c.r+'</div></div><p class="note">'+c.n+'</p>'}
  sel.addEventListener('change',show);show()})();

// Figure 1 rebuilt: pre-audit (hollow) to corrected (filled) for one model, mean@4 or pass@4.
(function(){let M='gpt',K='mean';const host=$('f1Plot');
  function draw(w){const nar=w<560,lw=nar?96:124,rw=nar?58:96,rh=40,top=10,gh=18,H=top+T.t1.length*rh+2*gh+30;
    const x0=lw,x1=w-rw,X=v=>x0+(x1-x0)*v/100;let s='';
    [0,25,50,75,100].forEach(v=>{s+=ln2(X(v),top+gh,X(v),H-26,'var(--line)')+tx(X(v),H-12,v+'%',{fs:11,a:'middle',c:'var(--mute)'})});
    let gp='',yy=top;T.t1.forEach((r,i)=>{if(r.g!==gp){gp=r.g;s+=tx(4,yy+12,r.g==='public'?'Benchmarks from public sources':'Expert-authored benchmarks',{fs:11,c:'var(--mute)'})+ln2(4,yy+16,w-4,yy+16,'var(--line)');yy+=gh}const y=yy+rh/2+4;yy+=rh;
      s+=tx(4,y+8,nar?r.b.replace('-Benchmark','').replace('-Physics',''):r.b,{fs:12,w:600});
      const [a,b]=r[K][M],ci=K==='pass'?RC.t1_counts[r.b][M].ci_pass_post:null;
      if(ci)s+=ln2(X(ci[0]),y,X(ci[1]),y,'var(--lok)',{sw:1.2,op:.6})+ln2(X(ci[0]),y-4,X(ci[0]),y+4,'var(--lok)',{op:.6})+ln2(X(ci[1]),y-4,X(ci[1]),y+4,'var(--lok)',{op:.6});
      if(a!=null){s+=ln2(X(a),y,X(b)-6,y,'var(--mute)',{sw:2});s+='<circle cx="'+X(a).toFixed(1)+'" cy="'+y+'" r="5.5" fill="var(--bg)" stroke="var(--mute)" stroke-width="2"/>';s+=tx(X(a),y-10,a.toFixed(1),{fs:11,a:'middle',c:'var(--mute)'})}
      else s+=tx(X(2),y-10,'pre-audit not available',{fs:11,c:'var(--mute)'});
      s+='<circle cx="'+X(b).toFixed(1)+'" cy="'+y+'" r="6" fill="var(--lok)"/>'+tx(X(b),y+19,b.toFixed(1),{fs:11,a:'middle',w:600});
      s+=tx(w-4,y+4,r.n0+' → '+r.n1+(nar?'':' questions'),{fs:11,a:'end',c:'var(--mute)'})});
    host.innerHTML=svgW(w,H,s,'Pre-audit and corrected scores by benchmark');
    $('f1Note').innerHTML=(K==='pass'?'Green whiskers: Wilson 95% interval of the corrected pass@4 over the kept questions. ':'')+'CritPt\'s hollow dot is Artificial Analysis\'s mean@5 on 70 challenges'+(M==='fable'?' at Max effort (its corrected score uses High)':'')+'; every other score is the paper\'s own run. '+MN[M]+': '+T.models.find(m=>m.k===M).set+'.'}
  segBind('f1M',m=>{M=m;setPressed('f1M',m);refit(host)});segBind('f1K',m=>{K=m;setPressed('f1K',m);refit(host)});fit(host,draw)})();

// Figure 2 rebuilt: label shares per benchmark (first four: of rejections; CMT and CritPt: of every audited question).
function drawF2(){const host=$('f2Plot');const F=T.funnel;
  const rows=T.t2.map(r=>({b:r.b,n:r.rej,seg:[['Q',r.Q],['G',r.G],['M',r.M]],of:'rejections'}));
  ['CMT-Benchmark','CritPt'].forEach(b=>{const f=F[b],n=f.audited||f.pool;rows.push({b,n,seg:[['Q',f.Q],['M',f.M],['x',n-f.Q-f.M]],of:'questions audited'})});
  rows.push({b:'Pooled four',n:250,seg:[['Q',T.t2_pooled.Q],['G',T.t2_pooled.G],['M',T.t2_pooled.M]],of:'rejections',pool:1});
  fit(host,w=>{const nar=w<560,lw=nar?92:120,rh=34,top=8,H=top+rows.length*rh+44,x0=lw,x1=w-8,X=v=>x0+(x1-x0)*v;let s='';
    rows.forEach((r,i)=>{const y=top+i*rh;let acc=0;s+=tx(4,y+18,nar?r.b.replace('-Benchmark','').replace('-Physics',''):r.b,{fs:12,w:r.pool?700:400});
      r.seg.forEach(([k,v])=>{const f=v/r.n,xx=X(acc),ww=(x1-x0)*f;s+='<g><title>'+r.b+': '+(k==='x'?'no defect found':LN[k])+' '+v+' of '+r.n+' '+r.of+' ('+(100*f).toFixed(1)+'%)</title>'+rc(xx,y+4,ww,22,LC[k==='x'?'x':k],{r:2})+'</g>';
        if(ww>30)s+=btx(xx+ww/2,y+19,ww>58?(100*f).toFixed(0)+'%':v,k==='x');acc+=f});
});
    const lg=[['Benchmark error',LC.Q],['Grader error',LC.G],['Model error',LC.M],['No defect (CMT, CritPt)',LC.x]];let lx=x0,ly=H-26;
    lg.forEach(([n,c])=>{const lw2=n.length*6.3+22;if(lx+lw2>w){lx=x0;ly+=15}s+=rc(lx,ly-9,10,10,c,{r:2})+tx(lx+14,ly,n,{fs:11});lx+=lw2});
    host.innerHTML=svgW(w,H+(ly>H-26?15:0),s,'Error attribution by benchmark')})}
PRED_REVEAL.pr1=drawF2;
