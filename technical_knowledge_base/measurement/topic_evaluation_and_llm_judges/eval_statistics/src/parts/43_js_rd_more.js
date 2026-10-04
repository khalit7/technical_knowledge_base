// ---- Reading: many-slice calculator, MathArena variance split, MT-Bench expert-vote judge noise ----
(function(){
  const S=window.EST;if(!S)return;const $=id=>document.getElementById(id);
  window.ES_CHECK=window.ES_CHECK||{};
  // many slices
  if($('rd-mult-card')){
    function dm(){const m=+$('rd-mult-m').value,a=+$('rd-mult-a').value;$('rd-mult-mv').textContent=m;
      const fw=1-Math.pow(1-a,m),bon=a/m,sid=1-Math.pow(1-a,1/m),z0=S.zq(1-a/2),z1=S.zq(1-bon/2),inf=((z1+S.Z80)/(z0+S.Z80))**2;
      $('rd-mult-cnt').innerHTML=RD.stat('Chance of at least one false alarm',(100*fw).toFixed(1)+'%','no correction')+RD.stat('Bonferroni level per slice',bon<0.001?bon.toExponential(1):bon.toFixed(4),'Šidák '+(sid<0.001?sid.toExponential(1):sid.toFixed(4)))+
        RD.stat('Critical z per slice',z1.toFixed(2),'instead of '+z0.toFixed(2))+RD.stat('Items needed per slice',inf.toFixed(2)+'×','to keep 80% power after the correction');
      if(m===20&&a===.05)window.ES_CHECK.mult20={fw,inf}}
    $('rd-mult-m').addEventListener('input',dm);$('rd-mult-a').addEventListener('change',dm);dm();
  }
  // MathArena: variance split from 4 runs per problem
  if($('rd-ma-card')&&S.D&&S.D.ma){
    const MA=S.D.ma;$('rd-ma-c').innerHTML=MA.map((c,i)=>'<option value="'+i+'">'+c.name+'</option>').join('');
    const pick=()=>{const c=MA[+$('rd-ma-c').value];const ms=c.models.map((m,i)=>[m,i]).filter(x=>{const acc=S.mean([...x[0].s].map(Number))/x[0].r;return acc>0.05&&acc<0.97});
      $('rd-ma-m').innerHTML=ms.map(x=>'<option value="'+x[1]+'">'+RD.esc(x[0].n)+'</option>').join('');const k=ms.findIndex(x=>/o1 \(medium\)|o4-mini \(medium\)|gpt-oss/i.test(x[0].n));$('rd-ma-m').selectedIndex=Math.max(0,k);draw()};
    function stats(m){const r=m.r,x=[...m.s].map(ch=>+ch/r),n=x.length,mean=S.mean(x),vraw=S.varS(x),sig2=S.mean(x.map(v=>v*(1-v)))*r/(r-1),vx=Math.max(0,vraw-sig2/r);
      return{n,r,mean,vx,sig2,seK:Math.sqrt(vraw/n),se1:Math.sqrt((vx+sig2)/n),seAns:Math.sqrt(mean*(1-mean)/(n*r)),seInf:Math.sqrt(vx/n),x}}
    function draw(){const c=MA[+$('rd-ma-c').value],m=c.models[+$('rd-ma-m').value];if(!m)return;const o=stats(m);
      const host=$('rd-ma-svg'),W=Math.min(860,RD.width(host)),sz=W<520?16:20,per=Math.max(1,Math.floor((W-4)/(sz+3)));
      let s='',i=0;o.x.forEach((v,k)=>{const xx=(k%per)*(sz+3),yy=Math.floor(k/per)*(sz+3);const sol=Math.round(v*o.r);
        for(let q=0;q<o.r;q++){const h=sz/o.r;s+='<rect x="'+xx+'" y="'+(yy+q*h)+'" width="'+sz+'" height="'+(h-0.6)+'" fill="'+(q<sol?'var(--good)':'var(--dim)')+'"/>'}});
      const rows=Math.ceil(o.x.length/per);host.innerHTML=RD.svg(W,rows*(sz+3),s,'Problems: runs solved out of '+o.r);
      $('rd-ma-cnt').innerHTML=RD.stat('Accuracy',(100*o.mean).toFixed(1)+'%',o.n+' problems × '+o.r+' runs')+RD.stat('Share of one-run variance that is run-to-run',(o.vx+o.sig2>0?(100*o.sig2/(o.vx+o.sig2)).toFixed(0):'0')+'%','E[σ²] / (Var(x) + E[σ²])')+
        RD.stat('SE, one run → '+o.r+' runs → ∞',(100*o.se1).toFixed(1)+' → '+(100*o.seK).toFixed(1)+' → '+(100*o.seInf).toFixed(1),'points, over problems')+RD.stat('SE if the '+(o.n*o.r)+' answers were independent',(100*o.seAns).toFixed(1),'points: too small by '+(o.seK/o.seAns).toFixed(2)+'×');
      $('rd-ma-cap').innerHTML='Each column is one problem, its '+o.r+' cells the runs (green = solved). Item variance Var(x) is the spread of the true per-problem solve rates (observed spread minus the part explained by finite runs), E[σ²] the average run-to-run variance (unbiased, × '+o.r+'/'+(o.r-1)+'). Source: MathArena\'s released answers on Hugging Face (CC BY-NC-SA 4.0), as compiled by %MB%. The last box is MathArena\'s own counting rule; the Math page shows its consequences for every table row.'.replace('%MB%','<a href="https://app.notion.com/p/3ef5c17b0d0d81ec942edf0040a2f596" target="_blank" rel="noopener noreferrer">Math benchmarks</a>');
    }
    $('rd-ma-c').addEventListener('change',pick);$('rd-ma-m').addEventListener('change',draw);pick();RD.onRender(draw);RD.onResize(draw);
    // check: median share of within-problem variance per competition
    window.ES_CHECK.ma=MA.map(c=>{const sh=c.models.map(m=>{const o=stats(m);return o.vx+o.sig2>0?o.sig2/(o.vx+o.sig2):null}).filter(v=>v!==null).sort((a,b)=>a-b);return{name:c.name,models:c.models.length,medShare:sh[sh.length>>1]}});
  }
  // MT-Bench expert votes: judge noise vs item variance
  if($('rd-hv-card')&&S.D&&S.D.hv){
    const HV=S.D.hv.pairs;$('rd-hv-p').innerHTML=HV.map((p,i)=>'<option value="'+i+'">'+p.a+' vs '+p.b+'</option>').join('');
    function comp(p){const its=p.items.map(x=>[...x[2]].map(ch=>+ch/2));const all=[].concat(...its),multi=its.filter(v=>v.length>1);
      let ss=0,df=0;multi.forEach(v=>{const m=S.mean(v);v.forEach(x=>{ss+=(x-m)*(x-m)});df+=v.length-1});const within=df?ss/df:NaN;
      const means=its.map(v=>S.mean(v)),nbar=S.mean(its.map(v=>v.length)),between=Math.max(0,S.varS(means)-within/nbar);
      const n=its.length,se1=Math.sqrt((between+within)/n),se3=Math.sqrt((between+within/3)/n),seInf=Math.sqrt(between/n);
      return{votes:all.length,n,multi:multi.length,mean:S.mean(all),within,between,share:within/(within+between),se1,se3,seInf,its}}
    const ALL=HV.map(comp);
    function draw(){const i=+$('rd-hv-p').value,o=ALL[i],p=HV[i];
      const host=$('rd-hv-svg'),W=Math.min(860,RD.width(host)),pad=8,bw=W-2*pad,tot=o.between+o.within;
      let s='<rect x="'+pad+'" y="6" width="'+(bw*o.between/tot)+'" height="22" fill="var(--c1)"/><rect x="'+(pad+bw*o.between/tot)+'" y="6" width="'+(bw*o.within/tot)+'" height="22" fill="var(--c2)"/>';
      s+=RD.t(pad+4,21,'items '+(100*(1-o.share)).toFixed(0)+'%',{fs:11.5,fill:'var(--bg)',w:600});if(o.share>0.18)s+=RD.t(pad+bw-4,21,'judges '+(100*o.share).toFixed(0)+'%',{a:'end',fs:11.5,fill:'var(--bg)',w:600});
      host.innerHTML=RD.svg(W,34,s,'Share of vote variance between items and between judges');
      $('rd-hv-cnt').innerHTML=RD.stat('Votes / items',o.votes+' / '+o.n,o.multi+' items with 2 or more judges')+RD.stat('Mean score of '+RD.esc(p.a),(o.mean).toFixed(3),'win 1, tie ½, loss 0')+
        RD.stat('Between-judge variance',o.within.toFixed(3),'same item, different expert')+RD.stat('Between-item variance',o.between.toFixed(3),'true differences across items')+
        RD.stat('SE: 1 judge → 3 → ∞ per item',(o.se1).toFixed(3)+' → '+o.se3.toFixed(3)+' → '+o.seInf.toFixed(3),'on the mean score, '+o.n+' items');
      $('rd-hv-cap').innerHTML='One-way random-effects split <i class="nl d">derived</i>: between-judge variance is the pooled variance of votes within items that have several judges; between-item variance is the variance of item means minus the part that judge noise explains (divided by the average '+(S.mean(o.its.map(v=>v.length))).toFixed(2)+' votes per item). Source: %HJ%, 3,355 votes by 65 judges (authors and experts), 2023.'.replace('%HJ%','<a href="https://huggingface.co/datasets/lmsys/mt_bench_human_judgments" target="_blank" rel="noopener noreferrer">lmsys/mt_bench_human_judgments</a>');}
    $('rd-hv-p').addEventListener('change',draw);draw();RD.onRender(draw);RD.onResize(draw);
    const sh=ALL.map(o=>o.share).sort((a,b)=>a-b);window.ES_CHECK.hv={medShare:sh[sh.length>>1],pairs:ALL.map(o=>({w:o.within,b:o.between}))};
    const el=document.querySelector('.esv[data-k="hv_med"]');if(el)el.textContent=(100*sh[sh.length>>1]).toFixed(0)+'%';
  }
})();
