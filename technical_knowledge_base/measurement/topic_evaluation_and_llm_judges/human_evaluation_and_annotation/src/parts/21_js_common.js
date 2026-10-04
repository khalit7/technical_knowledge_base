// Shared statistics for every tab: agreement from coincidence matrices, audits from per-question model choices.
// Every function mirrors src/recompute.py; window.HE_CHECK() returns the same quantities for check_page.mjs.
(function(){
const D=window.HE;if(!D)return;
const S=window.HES={};
S.esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
S.pct=(x,k)=>(100*x).toFixed(k===undefined?1:k)+'%';
S.n3=x=>(x<0?'−':'')+Math.abs(x).toFixed(3);
S.r4=x=>Math.round(x*1e4)/1e4;
// ---- agreement
// units: array of arrays of category indices; k categories. co: each ordered pair weighted 1/(m-1); pr: unweighted symmetric pair counts
S.mats=function(units,k){
  const co=[],pr=[];for(let i=0;i<k;i++){co.push(new Array(k).fill(0));pr.push(new Array(k).fill(0))}
  units.forEach(u=>{const m=u.length;if(m<2)return;
    for(let i=0;i<m;i++)for(let j=0;j<m;j++){if(i===j)continue;co[u[i]][u[j]]+=1/(m-1)}
    for(let i=0;i<m;i++)for(let j=i+1;j<m;j++){pr[u[i]][u[j]]++;pr[u[j]][u[i]]++}});
  return{co,pr}};
S.stats=function(co,pr,ord){
  const k=co.length,nc=co.map(r=>r.reduce((a,b)=>a+b,0)),n=nc.reduce((a,b)=>a+b,0);
  const alpha=d=>{let Do=0,De=0;for(let c=0;c<k;c++)for(let j=0;j<k;j++){Do+=co[c][j]*d(c,j);De+=nc[c]*nc[j]*d(c,j)}return 1-(Do/n)/(De/(n*(n-1)))};
  const nom=(c,j)=>c===j?0:1,itv=(c,j)=>(c-j)*(c-j);
  const ordd=(c,j)=>{const lo=Math.min(c,j),hi=Math.max(c,j);let s=0;for(let g=lo;g<=hi;g++)s+=nc[g];s-=(nc[c]+nc[j])/2;return s*s};
  let P=0,agree=0;for(let c=0;c<k;c++){for(let j=0;j<k;j++)P+=pr[c][j];agree+=pr[c][c]}P/=2;
  const po=agree/2/P,pi=nc.map(x=>x/n),pe=pi.reduce((s,x)=>s+x*x,0),q=nc.filter(x=>x>0).length;
  const peg=pi.reduce((s,x)=>s+x*(1-x),0)/(q-1);
  let Dn=0;for(let c=0;c<k;c++)for(let j=0;j<k;j++)if(c!==j)Dn+=co[c][j];
  const r={pairs:Math.round(P),votes:n,po,shares:pi,pe,kappa_fleiss:(po-pe)/(1-pe),ac1:(po-peg)/(1-peg),pe_ac1:peg,alpha_nominal:alpha(nom),Do_nom:Dn/n,De_nom:null};
  r.De_nom=(n*n-nc.reduce((s,x)=>s+x*x,0))/(n*(n-1));
  if(ord){r.alpha_ordinal=alpha(ordd);r.alpha_interval=alpha(itv);
    let w=0;for(let c=0;c<k;c++)for(let j=0;j<k;j++)if(Math.abs(c-j)<=1)w+=pr[c][j];r.within1=w/2/P}
  return r};
// MT-Bench units are strings of A/T/B (one letter per expert); categories ordered A, T, B so a tie sits between the wins
S.MTC='ATB';
S.mtUnits=(t,noties)=>{let U=D.agree.mtb[t].map(s=>noties?s.replace(/T/g,''):s).filter(s=>s.length>=2);
  return U.map(s=>[...s].map(ch=>noties?(ch==='A'?0:1):S.MTC.indexOf(ch)))};
S.mtStats=(t,noties)=>{const U=S.mtUnits(t,noties),m=S.mats(U,noties?2:3),r=S.stats(m.co,m.pr,!noties);r.units=U.length;r.co=m.co;return r};
S.hsStats=(att,f)=>{const m=D.agree.hs2[att][f],r=S.stats(m.co,m.pairs,true);r.units=m.units;r.co=m.co;return r};
S.hsUnits=att=>D.agree.hs2[att].sample.map(s=>[...s].map(Number));
// ---- audits
S.M=D.audit.models;
S.rankDesc=v=>v.map(x=>1+v.filter(w=>w>x+1e-12).length);
S.spearman=function(a,b){
  const ar=v=>{const o=v.map((x,i)=>i).sort((i,j)=>v[j]-v[i]);const r=new Array(v.length);let i=0;
    while(i<o.length){let j=i;while(j+1<o.length&&Math.abs(v[o[j+1]]-v[o[i]])<1e-12)j++;for(let x=i;x<=j;x++)r[o[x]]=(i+j)/2+1;i=j+1}return r};
  const ra=ar(a),rb=ar(b),n=a.length,ma=ra.reduce((s,x)=>s+x,0)/n,mb=rb.reduce((s,x)=>s+x,0)/n;
  let num=0,da=0,db=0;for(let i=0;i<n;i++){num+=(ra[i]-ma)*(rb[i]-mb);da+=(ra[i]-ma)**2;db+=(rb[i]-mb)**2}return num/Math.sqrt(da*db)};
S.audit=function(s){
  const d=D.audit.subjects[s],it=d.items,n=it.length,M=S.M.length;
  const ok=[],fix=[];it.forEach((x,i)=>{if(x.t==='o')ok.push(i);if(x.t==='o'||(x.t==='w'&&x.c>=0))fix.push(i)});
  const g=i=>it[i].t==='o'?it[i].k:it[i].c;
  const orig=[],clean=[],corr=[];
  for(let m=0;m<M;m++){orig.push(it.filter(x=>+x.p[m]===x.k).length/n);
    clean.push(ok.filter(i=>+it[i].p[m]===it[i].k).length/ok.length);corr.push(fix.filter(i=>+it[i].p[m]===g(i)).length/fix.length)}
  const err=it.map(x=>x.t!=='o'),wg=it.map(x=>x.t==='w');
  const votes=x=>{const c=[0,0,0,0];for(const ch of x.p)c[+ch]++;let b=0;for(let j=0;j<4;j++)if(j!==x.k)b=Math.max(b,c[j]);return b};
  const top=x=>{const c=[0,0,0,0];for(const ch of x.p)c[+ch]++;let b=-1,bj=0;for(let j=0;j<4;j++)if(c[j]>b){b=c[j];bj=j}return[bj,b]};
  const sc={self:it.map(x=>x.mp[x.k]),margin:it.map(x=>x.mp[x.k]-Math.max(...x.mp.filter((p,j)=>j!==x.k))),votes:it.map(x=>-votes(x))};
  const order={},curves={};
  for(const nm in sc){const o=it.map((x,i)=>i).sort((i,j)=>sc[nm][i]-sc[nm][j]||i-j);order[nm]=o;
    let e=0,w=0;curves[nm]={err:o.map(i=>(e+=err[i]?1:0)),wrong:o.map(i=>(w+=wg[i]?1:0))}}
  return{n,ok:ok.length,fix:fix.length,errors:err.filter(Boolean).length,wrong:wg.filter(Boolean).length,orig,clean,corr,
    rank_orig:S.rankDesc(orig),rank_clean:S.rankDesc(clean),rank_corr:S.rankDesc(corr),order,curves,sc,top,votes,err,wg,items:it}};
S.AUD={};Object.keys(D.audit.subjects).forEach(s=>{S.AUD[s]=S.audit(s)});
S.SUBN={virology:'Virology',college_chemistry:'College Chemistry',abstract_algebra:'Abstract Algebra',global_facts:'Global Facts',conceptual_physics:'Conceptual Physics',high_school_biology:'High School Biology'};
S.TAGN={o:'sound',w:'wrong key',q:'unclear question',p:'unclear options',n:'no correct option',m:'several correct options',e:'needs an expert'};
// ---- prose numbers: elements with data-k get their text from here, so the Reading tab cannot drift from the data
const t1=S.mtStats('t1',false),t1n=S.mtStats('t1',true),coh=S.hsStats('coherence','all'),hel=S.hsStats('helpfulness','all'),helK=S.hsStats('helpfulness','kept');
const V=S.V={mt1po:S.pct(t1.po),mt1pairs:String(t1.pairs),mt1npo:S.pct(t1n.po),mt1npairs:String(t1n.pairs),mt1a:t1.alpha_nominal.toFixed(3),
  mt1na:t1n.alpha_nominal.toFixed(3),mt1ao:t1.alpha_ordinal.toFixed(3),hsCohS4:S.pct(coh.shares[4]),hsCohPo:S.pct(coh.po),hsCohW1:S.pct(coh.within1),
  hsCohA:coh.alpha_interval.toFixed(3),hsCohAc1:coh.ac1.toFixed(3),hsHelPo:S.pct(hel.po),hsHelA:hel.alpha_interval.toFixed(3)};
const v20=s=>{const a=S.AUD[s];return a.curves.self.err[19]+' of 20'};
let K=0;const av=S.AUD.virology;while(K<av.n&&av.curves.self.err[K]===K+1)K++;
V.auK=String(K);V.auVir20=v20('virology');V.auChem20=v20('college_chemistry');V.auBio20=v20('high_school_biology');
document.querySelectorAll('[data-k]').forEach(el=>{const k=el.dataset.k;el.textContent=V[k]!==undefined?V[k]:'?'});
const a1=document.getElementById('rd-hs2a1'),a2=document.getElementById('rd-hs2a2');if(a1)a1.textContent=hel.alpha_interval.toFixed(3);if(a2)a2.textContent=helK.alpha_interval.toFixed(3);
// ---- two-rater binary table (the prevalence illustration): a both pass, b and c the disagreements, d both fail
S.kappa2=(a,b,c,d)=>{const n=a+b+c+d,po=(a+d)/n,p1=(a+b)/n,p2=(a+c)/n,pe=p1*p2+(1-p1)*(1-p2),m=(p1+p2)/2,pg=2*m*(1-m);return[po,(po-pe)/(1-pe),(po-pg)/(1-pg)]};
// ---- the check hook
window.HE_CHECK=function(){
  const pick=r=>{const o={};['pairs','po','pe','kappa_fleiss','ac1','alpha_nominal','alpha_ordinal','alpha_interval','within1'].forEach(k=>{if(r[k]!==undefined)o[k]=r[k]});return o};
  const out={mtb:{},hs2:{},audit:{},northcutt:{},paradox:{}};
  ['t1','t2'].forEach(t=>{out.mtb[t]={ties:pick(S.mtStats(t,false)),noties:pick(S.mtStats(t,true))}});
  Object.keys(D.agree.hs2).filter(k=>D.agree.hs2[k].all).forEach(a=>{out.hs2[a]={all:pick(S.hsStats(a,'all')),kept:pick(S.hsStats(a,'kept'))}});
  for(const s in S.AUD){const a=S.AUD[s];const fa={};for(const nm in a.curves){fa[nm]={};[10,20,30,50].forEach(k=>{if(k<=a.n)fa[nm][k]=[a.curves[nm].err[k-1],a.curves[nm].wrong[k-1]]})}
    out.audit[s]={acc_orig:a.orig,acc_clean:a.clean,acc_corr:a.corr,rank_orig:a.rank_orig,rank_clean:a.rank_clean,rank_corr:a.rank_corr,
      spearman_orig_clean:S.spearman(a.orig,a.clean),spearman_orig_corr:S.spearman(a.orig,a.corr),found_at:fa,errors:a.errors,wrong_key:a.wrong}}
  const s1=D.nc.s1,r1=S.rankDesc(s1.map(r=>r.acc1)),c1=S.rankDesc(s1.map(r=>r.cacc1));
  out.northcutt={rank_match:r1.filter((x,i)=>x===s1[i].rank1).length,crank_match:c1.filter((x,i)=>x===s1[i].crank1).length,spearman:S.spearman(s1.map(r=>r.acc1),s1.map(r=>r.cacc1))};
  out.paradox={balanced_45_5_5_45:S.kappa2(45,5,5,45),skewed_85_5_5_5:S.kappa2(85,5,5,5)};
  out.prose=V;return out};
})();
