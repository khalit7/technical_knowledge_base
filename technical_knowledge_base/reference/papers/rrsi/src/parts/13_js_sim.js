// ---- The paper tab: noise-chasing toy, the same candidate stream through two selection rules ----
// Illustrative. Rules: Eq. 2 (keep the best measured score) against Eq. 5, 7 and 17 with the coding instance's released
// values. Candidate distribution fitted to the released coding run (RC.simdef); common random numbers across the two rules.
const SIM=(function(){
  const D=RC.simdef,T=20,M=2,BASE=74.2,SE=D.noise_sd_diff/Math.SQRT2;
  const P={mu:-0.023,spec:.25,crit:.5,delta:0.034,b0:.10,b1:44.5,wc:15,ws:0};
  function gauss(r){let u=0,v=0;while(u===0)u=r();v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
  function draws(seed){const r=mulberry32(seed*2654435761>>>0);const out=[];const e0=gauss(r)*SE;
    for(let t=0;t<T;t++){const row=[];for(let j=0;j<M;j++){const g=P.mu+D.tau*gauss(r),isS=r()<P.spec,sp=Math.max(0,.015+.007*gauss(r)),dC=Math.max(-.5,D.dC_med+D.dC_sd*gauss(r)),cu=r(),e=gauss(r)*SE;row.push({g,isS,sp:isS?sp:0,dC,cu,e})}out.push(row)}return {e0,out}}
  function run(dr,rule){let tE=BASE/100,tH=BASE/100,tok=1,sh=tE+dr.e0,Sst=sh;const rec=[{sh,tH,tE,tok,c:[],kept:0}];let kept=0;
    for(let t=0;t<T;t++){const cs=dr.out[t].map((d,j)=>({j,tE:tE+d.g+d.sp,tH:tH+d.g,tok:tok*(1+d.dC),sh:tE+d.g+d.sp+d.e,dC:d.dC,spec:d.isS,why:''}));
      let adm=[];
      for(const c of cs){
        if(rule==='g'){adm.push(c);continue}
        if(c.spec&&dr.out[t][c.j].cu<P.crit){c.why='critic';continue}
        const dS=c.sh-sh;
        if(c.sh<Sst-P.delta){c.why='floor';continue}
        if(dS>P.delta){if(c.dC<=P.b0+P.b1*dS)adm.push(c);else c.why='cost'}
        else{if((P.ws||0)*dS-P.wc*c.dC>0)adm.push(c);else c.why='band'}}
      let win=null;if(adm.length){win=adm.reduce((a,b)=>b.sh>a.sh?b:a);if(rule==='g'&&win.sh<=sh){win.why='lower';win=null}}
      cs.forEach(c=>{if(c===win)c.why='kept';else if(!c.why)c.why=rule==='g'?'lower':'peer'});
      if(win){tE=win.tE;tH=win.tH;tok=win.tok;sh=win.sh;kept++;Sst=Math.max(Sst,sh)}
      rec.push({sh,tH,tE,tok,c:cs,kept,Sst})}
    return rec}
  function mc(n){const o={g:[0,0,0,0],r:[0,0,0,0]};for(let s=1;s<=n;s++){const dr=draws(1000+s);for(const k of ['g','r']){const R=run(dr,k),a=R[0],z=R[R.length-1];o[k][0]+=(z.sh-a.sh)*100/n;o[k][1]+=(z.tH-a.tH)*100/n;o[k][2]+=z.tok/n;o[k][3]+=(z.tH<a.tH?1:0)/n}}return o}
  return {P,draws,run,mc,T,BASE}})();
(function(){
  let seed=1,R={},modes={g:[],r:[]};
  const why={kept:'kept',lower:'not above the incumbent',peer:'admissible, lost to the other',critic:'removed by the critic',floor:'below the floor',cost:'cost rule (Eq. 7)',band:'inside the band, no token saving (Eq. 17)'};
  const pts=v=>{const x=Math.round(v*1000)/10;return (x>0?'+':x<0?'−':'±')+Math.abs(x).toFixed(1)};
  function build(){const dr=SIM.draws(seed);R={g:SIM.run(dr,'g'),r:SIM.run(dr,'r')};
    for(const m of ['g','r']){const A=R[m];modes[m].length=0;
      modes[m].push({t:'Start: the base harness, measured once',c:'True quality 74.2 points by construction; the loop sees '+(A[0].sh*100).toFixed(1)+' because one evaluation carries noise. '+(m==='g'?'Rule: keep whichever candidate scores highest, if it beats the incumbent\'s score (Eq. 2).':'Rules: critic first, then the floor S* − δ, then the cost rule (Eq. 7) above the band or the token rule (Eq. 17) inside it.')});
      for(let t=1;t<A.length;t++){const a=A[t],p=A[t-1];const cs=a.c.map((c,i)=>'candidate '+'AB'[i]+(c.spec?' (benchmark-specific)':'')+': seen '+pts(c.sh-p.sh)+', true '+pts(c.tH-p.tH)+' on new tasks, tokens '+(c.dC>=0?'+':'')+(c.dC*100).toFixed(0)+'%; '+why[c.why]).join('. ');
        modes[m].push({t:'Round '+t+(a.kept>p.kept?': an edit is kept':': nothing kept'),c:cs+'.'})}}}
  const anim=makeAnim({id:'sm',modes,mode:'g',dur:1400,
    draw:(m,k,e,w)=>{const H=Math.min(300,Math.max(230,w*.5)),pl=44,pr=12,pt=12,pb=34;const A=R[m],O=R[m==='g'?'r':'g'];
      let lo=0,hi=0;[A,O].forEach(X=>X.forEach(a=>{lo=Math.min(lo,a.sh-.742,a.tH-.742);hi=Math.max(hi,a.sh-.742,a.tH-.742);a.c.forEach(c=>{lo=Math.min(lo,c.sh-.742);hi=Math.max(hi,c.sh-.742)})}));
      lo=Math.floor(lo*100-1);hi=Math.ceil(hi*100+1);
      const X=t=>pl+(w-pl-pr)*t/SIM.T,Y=v=>pt+(H-pt-pb)*(1-(v*100-lo)/(hi-lo));let s='';
      const st=Math.max(1,Math.round((hi-lo)/6));for(let v=Math.ceil(lo/st)*st;v<=hi;v+=st)s+=ln2(pl,Y(v/100),w-pr,Y(v/100),v===0?'var(--mute)':'var(--line)')+tx(pl-6,Y(v/100)+4,(v>0?'+':'')+v,{a:'end',fs:11,c:CG});
      [0,5,10,15,20].forEach(t=>s+=tx(X(t),H-pb+15,t,{a:'middle',fs:11,c:CG}));
      s+=tx((pl+w-pr)/2,H-4,'round; points relative to the base harness',{a:'middle',fs:11,c:CG});
      const col=m==='g'?CO:CB,oc=m==='g'?CB:CO;
      const line=(X2,key,upto,c,da,op)=>{let d='';for(let t=0;t<=upto;t++){const v=X2[t][key]-.742;d+=(t?'L':'M')+X(t).toFixed(1)+','+Y(v).toFixed(1)}return '<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+(op<1?1.3:2.2)+'"'+(da?' stroke-dasharray="5 4"':'')+' opacity="'+op+'"/>'};
      s+=line(O,'sh',SIM.T,oc,false,.25)+line(O,'tH',SIM.T,oc,true,.25);
      s+=line(A,'sh',k,col,false,1)+line(A,'tH',k,col,true,1);
      if(k>0){const a=A[k];a.c.forEach((c,i)=>{const x=X(k)+(i?5:-5);s+=G(e,'<circle cx="'+x+'" cy="'+Y(c.sh-.742)+'" r="4.5" fill="'+(c.why==='kept'?col:'var(--bg)')+'" stroke="'+col+'" stroke-width="1.6"/>')})}
      const z=A[k];s+=tx(X(k)+6,Y(z.sh-.742)-6,'seen '+pts(z.sh-.742),{fs:11,c:col,w:600})+tx(X(k)+6,Y(z.tH-.742)+14,'true '+pts(z.tH-.742),{fs:11,c:col});
      return svgW(w,H,s,'Two selection rules on the same candidates')},
    counters:(m,k)=>{const A=R[m],z=A[k],a=A[0];return stat('Edits kept',z.kept+' of '+(2*k),'')+stat('Score the loop sees',pts(z.sh-a.sh)+' pts','since the start')+stat('True quality on new tasks',pts(z.tH-a.tH)+' pts','')+stat('Tokens per trial','× '+z.tok.toFixed(2),'relative to the base')}});
  function mcDraw(){const o=SIM.mc(400);const box=(n,v,c)=>'<div class="stat" style="border-color:'+c+'"><div class="k">'+n+'</div><div class="v">seen '+pts(v[0]/100)+', true '+pts(v[1]/100)+'</div><div class="d">tokens × '+v[2].toFixed(2)+'; true quality below the start in '+Math.round(v[3]*100)+'% of runs</div></div>';
    $('smMc').innerHTML=box('Keep the best score, 400 seeds',o.g,CO)+box('RRSI\'s selection rules, 400 seeds',o.r,CB)}
  function lab(){const P=SIM.P;$('smMuV').textContent=(P.mu*100).toFixed(1)+' pts';$('smSpV').textContent=Math.round(P.spec*100)+'%';$('smCrV').textContent=Math.round(P.crit*100)+'%';$('smDV').textContent=P.delta.toFixed(3)}
  function redo(){lab();build();if(anim){anim.st.k=Math.min(anim.st.k,modes.g.length-1);anim.st.t=1;anim.draw()}mcDraw()}
  build();lab();
  $('smSeed').addEventListener('change',e=>{seed=+e.target.value;redo()});
  $('smMu').addEventListener('input',e=>{SIM.P.mu=+e.target.value/1000;redo()});
  $('smSp').addEventListener('input',e=>{SIM.P.spec=+e.target.value/100;redo()});
  $('smCr').addEventListener('input',e=>{SIM.P.crit=+e.target.value/100;redo()});
  $('smD').addEventListener('input',e=>{SIM.P.delta=[0,0.017,0.034][+e.target.value];redo()});
  $('smW').addEventListener('change',e=>{SIM.P.ws=+e.target.value;redo()});
  PRED_REVEAL.pr1=()=>{refit($('smSvg'));mcDraw()};
})();
