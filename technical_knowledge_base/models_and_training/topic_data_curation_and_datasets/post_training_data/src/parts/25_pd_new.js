// ---- Reading: hero (four kinds of row), SFT lineage dot plot, prompt-reuse diagram (prefix pd; added 2026-10-24) ----
// Facts (double-at keys) are filled by build.sh from data/facts.json, as in the HTML.
(function(){
const $=id=>document.getElementById(id),E=RD.esc;
// wrap text to lines of at most n characters
function wrap(s,n){const w=String(s).split(' ');const L=[];let c='';w.forEach(x=>{if((c+' '+x).trim().length>n&&c){L.push(c);c=x}else c=(c+' '+x).trim()});if(c)L.push(c);return L}
function lines(x,y,arr,o){return arr.map((s,i)=>RD.t(x,y+i*14,E(s),o)).join('')}
function box(x,y,w,h,cls,stroke){return '<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+w.toFixed(1)+'" height="'+h+'" rx="6" fill="'+(cls==='sig'?'var(--acc2)':cls==='bad'?'var(--bg)':'var(--soft)')+'" stroke="'+(stroke||'var(--line)')+'" stroke-width="'+(cls?1.6:1)+'"/>'}
function arrow(x,y1,y2){return '<line x1="'+x+'" x2="'+x+'" y1="'+y1+'" y2="'+(y2-5)+'" stroke="var(--mute)" stroke-width="1.3"/><path d="M'+(x-4)+' '+(y2-6)+' L'+x+' '+y2+' L'+(x+4)+' '+(y2-6)+'" fill="var(--mute)"/>'}

// 1. hero
const K=[
 {k:'SFT',c:'var(--c1)',p:'an instruction',s:'a written answer (a person or a teacher model)',t:'trains: copy its tokens',f:'@@si_dolly_pct@@ of Dolly\'s human instructions are near-duplicates (ROUGE-L > 0.7)'},
 {k:'Preference',c:'var(--c2)',p:'a prompt',s:'chosen beats rejected (a judge decided)',t:'trains: DPO or a reward model',f:'the chosen answer is the longer one in 67% of Dolci DPO pairs'},
 {k:'Verifiable reward',c:'var(--c3)',p:'a problem',s:'a label plus a checker program',t:'trains: RL on the verdict',f:'six checkers accept @@ck_min_pct@@ to @@ck_max_pct@@ of the same R1 answers'},
 {k:'Environment',c:'var(--c4)',p:'an issue in a repository',s:'tests run in a container (FAIL_TO_PASS)',t:'trains: agent RL, or SFT on wins',f:'@@env_resolved_pct@@ of 3,000 agent trajectories resolve the issue'}];
function hero(){const el=$('pd-hero');if(!el)return;const w=RD.width(el);const cols=w>=640?4:2,gap=10,cw=(w-gap*(cols-1))/cols;const ch=Math.max(14,Math.floor((cw-14)/6.3));
  const W2=K.map(k=>({P:wrap(k.p,ch),S:wrap(k.s,ch),T:wrap(k.t,ch),F:wrap(k.f,ch)}));
  const hgt=x=>32+(10+14*x.P.length)+16+(10+14*x.S.length)+(10+14*x.T.length)+16+(10+14*x.F.length);
  const rows=Math.ceil(K.length/cols),RH=[];for(let r=0;r<rows;r++)RH.push(Math.max(...W2.slice(r*cols,r*cols+cols).map(hgt)));
  let g='';K.forEach((k,i)=>{const r=Math.floor(i/cols),x=(i%cols)*(cw+gap);let y0=0;for(let j=0;j<r;j++)y0+=RH[j]+12;const {P,S,T,F}=W2[i];
    g+='<rect x="'+x.toFixed(1)+'" y="'+y0+'" width="'+cw.toFixed(1)+'" height="5" rx="2" fill="'+k.c+'"/>'+RD.t(x+2,y0+22,E(k.k),{w:600,fs:13});
    let y=y0+32;g+=box(x,y,cw,10+14*P.length)+lines(x+7,y+15,P,{fill:'var(--mute)'});y+=10+14*P.length;
    g+=arrow(x+cw/2,y+2,y+14);y+=16;
    g+=box(x,y,cw,10+14*S.length,'sig','var(--acc)')+lines(x+7,y+15,S,{w:600});y+=10+14*S.length;
    g+=lines(x+7,y+17,T,{fill:'var(--mute)'});y+=10+14*T.length;
    g+=arrow(x+cw/2,y+2,y+14);y+=16;
    g+=box(x,y,cw,10+14*F.length,'bad','var(--bad)')+lines(x+7,y+15,F,{fill:'var(--bad)'})});
  const H=RH.reduce((a,b)=>a+b+12,0);el.innerHTML=RD.svg(w,H,g,'Four kinds of post-training row: prompt, signal, what it trains, and the measured failure')}

// 2. lineage dot plot (published sizes; dates and sizes from the lineage table in 20_read_b.html)
const W={human:['people','var(--c1)'],templ:['templated NLP tasks','var(--c5)'],model:['a model','var(--c2)'],mix:['mixture of models and people','var(--c4)'],trace:['reasoning traces from a model','var(--c3)']};
const L=[['FLAN',2021.7,null,'templ','60+ tasks'],['InstructGPT SFT',2022.2,12725,'human'],['Self-Instruct',2022.95,52445,'model'],['Flan 2022',2023.05,null,'templ','1,800+ tasks'],['Alpaca',2023.2,52002,'model'],['Vicuna (ShareGPT)',2023.25,70000,'model','about 70K'],['Dolly 15k',2023.3,15011,'human'],['WizardLM (Evol)',2023.32,70000,'model','70k'],['UltraChat',2023.4,1500000,'model','1.5M'],['LIMA',2023.4,1000,'human'],['OpenHermes-2.5',2023.85,1000000,'model','about 1M'],['Magpie',2024.45,300000,'model','300K'],['Tulu 3 SFT',2024.85,939344,'mix'],['DeepSeek-R1 SFT',2025.05,804745,'trace'],['s1K',2025.08,1000,'trace'],['SmolTalk',2025.1,1000000,'mix','1M'],['OpenThoughts3',2025.45,1200000,'trace','1.2M'],['OLMo 3 Dolci Think',2025.95,2268468,'trace']];
const f0=x=>Math.round(x).toLocaleString('en-US');
function lineage(){const el=$('pd-lineage');if(!el)return;const w=RD.width(el);const narrow=w<520;const LW=narrow?118:170,R=w-(narrow?62:80),rh=19,top=22;
  const lx=v=>LW+(R-LW)*(Math.log10(v)-3)/(Math.log10(3e6)-3);let g='';
  [1e3,1e4,1e5,1e6].forEach(v=>{const x=lx(v);g+='<line x1="'+x+'" x2="'+x+'" y1="'+(top-6)+'" y2="'+(top+L.length*rh)+'" stroke="var(--line)"/>'+RD.t(x,top-9,v>=1e6?'1M':v>=1e3?(v/1e3)+'k':v,{a:'middle',fill:'var(--mute)'})});
  L.forEach((d,i)=>{const y=top+i*rh+rh/2;const yr=Math.floor(d[1]);g+=RD.t(4,y+4,E(narrow?d[0].replace(' (ShareGPT)','').replace(' (Evol)',''):d[0])+(narrow?'':' '+yr),{});
    if(d[2]==null){g+=RD.t(LW+4,y+4,E(d[4])+' (no row count)',{fill:'var(--mute)'});return}
    const x=lx(d[2]);g+='<line x1="'+LW+'" x2="'+x.toFixed(1)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)" stroke-dasharray="2 3"/><circle cx="'+x.toFixed(1)+'" cy="'+y+'" r="5.5" fill="'+W[d[3]][1]+'"><title>'+E(d[0])+': '+f0(d[2])+'</title></circle>'+RD.t(x+9,y+4,d[4]||f0(d[2]),{fill:'var(--mute)'})});
  let lg='',lxp=4,ly=top+L.length*rh+18;Object.values(W).forEach(v=>{const tw=v[0].length*6.2+22;if(lxp+tw>w){lxp=4;ly+=16}lg+='<circle cx="'+(lxp+5)+'" cy="'+(ly-4)+'" r="5" fill="'+v[1]+'"/>'+RD.t(lxp+14,ly,E(v[0]),{});lxp+=tw});
  el.innerHTML=RD.svg(w,ly+8,g+lg,'SFT sets by date and size, coloured by who wrote the answers')}

// 8. prompt reuse
function reuse(){const el=$('pd-reuse');if(!el)return;const w=RD.width(el);const narrow=w<560;let g='';
  const S=[['SFT','answer to copy','var(--c1)'],['Preference','chosen against rejected','var(--c2)'],['RL (RLVR)','checker or constraint','var(--c3)']];
  if(!narrow){const pw=Math.min(210,w*0.3),ph=96,py=20;g+=box(0,py,pw,ph)+lines(10,py+22,['One prompt pool','Tulu 3 SFT subsets: Persona Hub,','Evol CodeAlpaca, Aya, WildChat,','WildJailbreak, WildGuardMix ...'],{})+'';
    const sx=pw+60,sw=w-sx-2;S.forEach((s,i)=>{const y=6+i*44;g+='<path d="M'+pw+' '+(py+ph/2)+' C'+(pw+30)+' '+(py+ph/2)+' '+(sx-30)+' '+(y+18)+' '+(sx-4)+' '+(y+18)+'" fill="none" stroke="var(--mute)" stroke-width="1.3"/>'+box(sx,y,sw,36,'sig','var(--acc)')+RD.t(sx+8,y+15,E(s[0]),{w:600})+RD.t(sx+8,y+29,'signal: '+E(s[1]),{fill:'var(--mute)'})});
    g+=RD.t(0,py+ph+34,'the same base prompt; a contaminated prompt is contaminated in all three',{fill:'var(--bad)'});el.innerHTML=RD.svg(w,py+ph+42,g,'One prompt pool feeds SFT, preference and RL');return}
  g+=box(0,0,w,52)+lines(10,18,['One prompt pool (Tulu 3 SFT subsets:','Persona Hub, Evol CodeAlpaca, Aya, safety ...)'],{});
  g+='<line x1="12" x2="12" y1="52" y2="'+(74+2*48+18)+'" stroke="var(--mute)" stroke-width="1.3"/>';
  S.forEach((s,i)=>{const y=74+i*48;g+='<line x1="12" x2="24" y1="'+(y+18)+'" y2="'+(y+18)+'" stroke="var(--mute)" stroke-width="1.3"/><path d="M23 '+(y+14)+' L29 '+(y+18)+' L23 '+(y+22)+'" fill="var(--mute)"/>'+box(30,y,w-30,36,'sig','var(--acc)')+RD.t(38,y+15,E(s[0]),{w:600})+RD.t(38,y+29,'signal: '+E(s[1]),{fill:'var(--mute)'})});
  g+=RD.t(0,74+3*48+12,'a contaminated prompt is contaminated in all three',{fill:'var(--bad)'});el.innerHTML=RD.svg(w,74+3*48+20,g,'One prompt pool feeds SFT, preference and RL')}
function all(){hero();lineage();reuse()}
RD.onRender(all);RD.onResize(all);all();
})();
