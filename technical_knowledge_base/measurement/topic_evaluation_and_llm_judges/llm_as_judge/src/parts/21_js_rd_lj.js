// ---- Page helpers on top of RD (tab-scoped render and resize for the Protocol lab), then LJ: the page's computations ----
RD.onTab=(tab,f)=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[tab]=window.TAB_RENDER[tab]||[]).push(f)};
RD.onResizeTab=(tab,f)=>{let t=0;addEventListener('resize',()=>{const r=document.getElementById(tab);if(!r||r.hidden||r.offsetParent===null)return;clearTimeout(t);t=setTimeout(f,60)})};
// ---- LJ: the page's computations on the released MT-Bench judgments (window.MTB); mirrored by src/recompute.py ----
window.LJ=(function(){
  const D=window.MTB, K=D.keys, V=D.votes, W=D.voters, M=D.models;
  const NAMES={'gpt-4':'GPT-4','claude-v1':'Claude-v1','gpt-3.5-turbo':'GPT-3.5-turbo','vicuna-13b-v1.2':'Vicuna-13B','alpaca-13b':'Alpaca-13B','llama-13b':'LLaMA-13B'};
  const nm=i=>NAMES[M[i]]||M[i];
  // key fields: 0 q, 1 turn, 2 i, 3 j, 4 P, 5 Pinc, 6 sa, 7 sb, 8 f, 9 s, 10 la, 11 lb
  // judge verdict for a key under a protocol: 0 = i wins, 1 = j wins, 2 = tie, null = not available
  function jv(k,p){
    if(p==='P')return k[4]<0?null:k[4];
    if(p==='S')return k[6]<0?null:(k[6]===k[7]?2:(k[6]>k[7]?0:1));
    if(p==='F')return k[8]<0?null:k[8];
    if(p==='B')return k[9]<0?null:k[9];
    if(p==='FB')return k[8]<0?null:(k[8]===k[9]?k[8]:2);
    return null;
  }
  // scope filters on a key: 'all' (15 pairs), 'nov' (10 pairs without Vicuna: the pointwise file graded a later Vicuna), 'g35' (4 pairs against GPT-3.5 with per-order verdicts)
  function inScope(k,sc){if(sc==='nov')return k[6]>=0;if(sc==='g35')return k[8]>=0&&k[6]>=0;return true}
  // o: {scope, experts, turn (0 both), noties, exclGpt4}
  function keep(k,w,o){
    if(o.experts&&W[w]!=='e')return false;
    if(o.turn&&k[1]!==o.turn)return false;
    if(!inScope(k,o.scope))return false;
    if(o.exclGpt4&&(k[2]===0||k[3]===0))return false;
    return true;
  }
  function kappa(cm){let N=0,a=0,pe=0;for(let r=0;r<3;r++)for(let c=0;c<3;c++){N+=cm[r][c];if(r===c)a+=cm[r][c]}
    if(!N)return NaN;for(let r=0;r<3;r++){let rs=0,cs=0;for(let c=0;c<3;c++){rs+=cm[r][c];cs+=cm[c][r]}pe+=rs*cs}
    pe/=N*N;const po=a/N;return pe>=1?NaN:(po-pe)/(1-pe)}
  // agreement of judge protocol p with human votes (Zheng et al.'s definition: every human vote against the judge's verdict on that question, turn and pair)
  function agree(p,o){
    const cm=[[0,0,0],[0,0,0],[0,0,0]];let n=0,a=0,jt=0,lg=0,lgd=0,dis=0,hl=0,ln=0;
    for(const [ki,h,w] of V){const k=K[ki];if(!keep(k,w,o))continue;const v=jv(k,p);if(v===null)continue;
      if(o.noties&&(h===2||v===2))continue;
      n++;if(h===v)a++;if(v===2)jt++;cm[h][v]++;
      if(h!==2&&v!==2&&k[10]!==k[11]){const L=k[10]>k[11]?0:1;ln++;if(v===L)lg++;if(h===L)hl++;if(h!==v){dis++;if(v===L)lgd++}}}
    return {n,agree:n?a/n:NaN,kappa:kappa(cm),ties:n?jt/n:NaN,cm,ln,judgeLonger:ln?lg/ln:NaN,humanLonger:ln?hl/ln:NaN,dis,judgeLongerInDis:dis?lgd/dis:NaN};
  }
  // human-human agreement: every pair of different voters on the same key
  function humans(o){
    const by=new Map();
    for(const [ki,h,w] of V){const k=K[ki];if(!keep(k,w,o))continue;if(!by.has(ki))by.set(ki,[]);by.get(ki).push([w,h])}
    let n=0,a=0;
    for(const L of by.values())for(let x=0;x<L.length;x++)for(let y=x+1;y<L.length;y++){if(L[x][0]===L[y][0])continue;
      if(o.noties&&(L[x][1]===2||L[y][1]===2))continue;n++;if(L[x][1]===L[y][1])a++}
    return {n,agree:n?a/n:NaN};
  }
  // list level: each model's win rate over non-tie verdicts, humans against the judge, on the same votes
  function winRates(p,o){
    const wh=[0,0,0,0,0,0],gh=[0,0,0,0,0,0],wj=[0,0,0,0,0,0],gj=[0,0,0,0,0,0];
    for(const [ki,h,w] of V){const k=K[ki];if(!keep(k,w,o))continue;const v=jv(k,p);if(v===null)continue;
      if(h!==2){gh[k[2]]++;gh[k[3]]++;wh[h===0?k[2]:k[3]]++}
      if(v!==2){gj[k[2]]++;gj[k[3]]++;wj[v===0?k[2]:k[3]]++}}
    const ms=[];for(let m=0;m<6;m++)if(gh[m]>0&&gj[m]>0)ms.push({m,h:wh[m]/gh[m],j:wj[m]/gj[m],nh:gh[m],nj:gj[m]});
    return ms;
  }
  function ranks(xs){const idx=xs.map((x,i)=>i).sort((a,b)=>xs[b]-xs[a]);const r=new Array(xs.length);
    for(let i=0;i<idx.length;){let j=i;while(j+1<idx.length&&xs[idx[j+1]]===xs[idx[i]])j++;for(let k=i;k<=j;k++)r[idx[k]]=(i+j)/2+1;i=j+1}return r}
  function spearman(a,b){const ra=ranks(a),rb=ranks(b),n=a.length;if(n<3)return NaN;const ma=ra.reduce((s,x)=>s+x,0)/n,mb=rb.reduce((s,x)=>s+x,0)/n;
    let sab=0,saa=0,sbb=0;for(let i=0;i<n;i++){sab+=(ra[i]-ma)*(rb[i]-mb);saa+=(ra[i]-ma)**2;sbb+=(rb[i]-mb)**2}return sab/Math.sqrt(saa*sbb)}
  // ---- calibration: binary items "does the target model win this comparison?" over non-tie human votes ----
  // z = human label, zh = judge label (a judge tie counts as not a win)
  function items(t,p){const out=[];
    for(const [ki,h,w] of V){const k=K[ki];if(k[2]!==t&&k[3]!==t)continue;if(h===2)continue;const v=jv(k,p);if(v===null)continue;
      const me=k[2]===t?0:1;out.push([h===me?1:0,v===me?1:0,ki])}
    return out}
  // seeded PRNG (mulberry32) and a partial Fisher-Yates draw of m indices out of n
  function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
  function draw(n,m,seed){const r=rng(seed),a=[];for(let i=0;i<n;i++)a.push(i);for(let i=0;i<m;i++){const j=i+Math.floor(r()*(n-i));const t=a[i];a[i]=a[j];a[j]=t}return a.slice(0,m)}
  // Rogan-Gladen correction and the Lang-Reiczigel adjusted interval, as in Lee et al. (arXiv 2511.21140) eqs. 7 to 12
  function correct(p,n,m0,m1,q0,q1){
    const z=1.96,z2=z*z;
    if(!((q0+q1-1)>0))return {est:NaN,lo:NaN,hi:NaN,ok:false};
    const est=(p+q0-1)/(q0+q1-1);
    const nt=n+z2,m0t=m0+2,m1t=m1+2,pt=(n*p+z2/2)/(n+z2),q0t=(m0*q0+1)/(m0+2),q1t=(m1*q1+1)/(m1+2),den=q0t+q1t-1;
    if(!(den>0))return {est,lo:NaN,hi:NaN,ok:false};
    const tt=(pt+q0t-1)/den,dt=2*z2*(-(1-tt)*q0t*(1-q0t)/m0t+tt*q1t*(1-q1t)/m1t);
    const se=Math.sqrt(pt*(1-pt)/nt+(1-tt)**2*q0t*(1-q0t)/m0t+tt*tt*q1t*(1-q1t)/m1t)/den;
    const c=tt+dt;return {est,lo:Math.max(0,c-z*se),hi:Math.min(1,c+z*se),ok:true};
  }
  // one gold slice: indices into the item list, counts and the corrected estimate
  function calib(I,m,seed){
    const n=I.length,g=draw(n,m,seed);let tp=0,fn=0,fp=0,tn=0;
    for(const i of g){const [z,zh]=I[i];if(z&&zh)tp++;else if(z)fn++;else if(zh)fp++;else tn++}
    const p=I.reduce((s,x)=>s+x[1],0)/n,th=I.reduce((s,x)=>s+x[0],0)/n;
    const m1=tp+fn,m0=fp+tn,q1=m1?tp/m1:NaN,q0=m0?tn/m0:NaN;
    const c=(m1&&m0)?correct(p,n,m0,m1,q0,q1):{est:NaN,lo:NaN,hi:NaN,ok:false};
    // the same m human labels spent directly on a sample of items (Wilson 95% interval)
    let hs=0;for(const i of g)hs+=I[i][0];const ph=hs/m,z=1.96,dn=1+z*z/m,ce=(ph+z*z/(2*m))/dn,hw=z*Math.sqrt(ph*(1-ph)/m+z*z/(4*m*m))/dn;
    return {g,tp,fn,fp,tn,m0,m1,q0,q1,p,th,n,c,human:{est:ph,lo:Math.max(0,ce-hw),hi:Math.min(1,ce+hw)}};
  }
  const pct=(x,d)=>isFinite(x)?(100*x).toFixed(d===undefined?1:d)+'%':'n/a';
  return {D,K,V,W,M,nm,jv,agree,humans,winRates,spearman,items,rng,draw,correct,calib,pct,kappa};
})();
