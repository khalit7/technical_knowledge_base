// ---- Tab: Attack matters (HarmBench ASR table) ----
(function(){
  const H=window.HB,esc=RD.esc,$=id=>document.getElementById(id);
  const AN={DR:'Direct request',Human:'Human jailbreaks',ZS:'Zero-shot','PAP-top5':'PAP top 5',PAIR:'PAIR',TAP:'TAP','TAP-T':'TAP-T',AutoDAN:'AutoDAN',GCG:'GCG','GCG-M':'GCG-M','GCG-T':'GCG-T',PEZ:'PEZ',GBDA:'GBDA',UAT:'UAT',AP:'AP',SFS:'SFS'};
  const mn=m=>m==='R2D2 (Ours)'?'Zephyr 7B + R2D2':m;
  const ai=a=>H.attacks.indexOf(a);
  function stats(row){const v=row.filter(x=>x!=null);return {max:Math.max(...v),avg:v.reduce((a,b)=>a+b,0)/v.length,n:v.length}}
  function hm(){const S=$('hb-set').value,so=$('hb-sort').value,V=H.v[S];
    const idx=H.models.map((m,i)=>i).filter(i=>V[i].some(x=>x!=null));
    const key=i=>{const r=V[i];if(so==='max')return stats(r).max;if(so==='avg')return stats(r).avg;const x=r[ai(so)];return x==null?-1:x};
    idx.sort((a,b)=>key(a)-key(b));
    let h='<table class="hm"><thead><tr><th class="mh">Model <small>(lowest first)</small></th>'+H.attacks.map(a=>'<th>'+esc(a)+'</th>').join('')+'<th>Range</th></tr></thead><tbody>';
    idx.forEach(i=>{const r=V[i],s=stats(r);h+='<tr><th class="mh">'+esc(mn(H.models[i]))+'</th>'+r.map(x=>x==null?'<td class="na">&middot;</td>':'<td style="background:color-mix(in srgb, var(--bad) '+Math.round(x*0.8)+'%, var(--bg))">'+x.toFixed(1)+'</td>').join('')+'<td class="small">'+Math.min(...r.filter(x=>x!=null)).toFixed(1)+' to '+s.max.toFixed(1)+'</td></tr>'});
    $('hb-hm').innerHTML=h+'</tbody></table>';
  }
  function bump(){const S=$('hb-set').value,V=H.v[S],a1=ai($('hb-a1').value),a2=ai($('hb-a2').value);
    const idx=H.models.map((m,i)=>i).filter(i=>V[i][a1]!=null&&V[i][a2]!=null);const host=$('hb-bump');
    if(idx.length<2){host.innerHTML='<p class="mute small">Fewer than two models have both attacks on this set.</p>';$('hb-sum').textContent='';return}
    const r1=idx.slice().sort((a,b)=>V[a][a1]-V[b][a1]),r2=idx.slice().sort((a,b)=>V[a][a2]-V[b][a2]);
    const w=Math.min(760,RD.width(host)),rowh=17,top=22,h=top+idx.length*rowh+6;const lw=Math.min(170,Math.round(w*0.36));const x1=lw,x2=w-lw;
    const y=k=>top+k*rowh+rowh/2;let b=RD.t(x1,12,esc(AN[H.attacks[a1]])+' (ASR)',{a:'end',fs:11,w:600})+RD.t(x2,12,esc(AN[H.attacks[a2]])+' (ASR)',{fs:11,w:600});
    let flips=0;idx.forEach(i=>{const k1=r1.indexOf(i),k2=r2.indexOf(i);if(Math.abs(k1-k2)>=5)flips++;
      const col=k2<k1-4?'var(--good)':k2>k1+4?'var(--bad)':'var(--mute)';
      b+='<line x1="'+(x1+6)+'" y1="'+y(k1)+'" x2="'+(x2-6)+'" y2="'+y(k2)+'" stroke="'+col+'" stroke-width="1.4" opacity=".8"/>';
      const nm=mn(H.models[i]);const short=w<500&&nm.length>16?nm.slice(0,15)+'.':nm;
      b+=RD.t(x1,y(k1)+4,esc(short)+' '+V[i][a1].toFixed(1),{a:'end',fs:10.5});b+=RD.t(x2,y(k2)+4,V[i][a2].toFixed(1)+' '+esc(short),{fs:10.5})});
    host.innerHTML=RD.svg(w,h,b,'Rank of models under two attacks');
    // Spearman rank correlation with average ranks for ties (checked in recompute.py)
    const ar=a=>{const v=idx.map(i=>V[i][a]);const o=v.map((x,k)=>k).sort((p,q)=>v[p]-v[q]);const r=new Array(v.length);
      for(let s=0;s<o.length;){let e=s;while(e+1<o.length&&v[o[e+1]]===v[o[s]])e++;for(let k=s;k<=e;k++)r[o[k]]=(s+e)/2+1;s=e+1}return r};
    const R1=ar(a1),R2=ar(a2),n=idx.length,m1=R1.reduce((x,y)=>x+y,0)/n,m2=R2.reduce((x,y)=>x+y,0)/n;
    let sxy=0,sxx=0,syy=0;for(let k=0;k<n;k++){sxy+=(R1[k]-m1)*(R2[k]-m2);sxx+=(R1[k]-m1)**2;syy+=(R2[k]-m2)**2}const rho=sxx*syy>0?sxy/Math.sqrt(sxx*syy):null;window.HB_LAST={n:n,rho:rho,flips:flips};
    $('hb-sum').innerHTML=n+' models; '+flips+' move five or more places; Spearman rank correlation (tied values share their average rank) &rho; = '+(rho==null?'not defined (every model has the same value under one attack)':RD.n(rho,2))+'. Green: safer under the second attack than its rank under the first suggests; orange: less safe.';
  }
  window.HB_UI={stats,ai};
  ['hb-a1','hb-a2'].forEach((id,k)=>{$(id).innerHTML=H.attacks.map(a=>'<option value="'+a+'"'+((k===0&&a==='DR')||(k===1&&a==='TAP-T')?' selected':'')+'>'+esc(AN[a])+'</option>').join('')});
  $('hb-set').addEventListener('change',()=>{hm();bump()});$('hb-sort').addEventListener('change',hm);
  $('hb-a1').addEventListener('change',bump);$('hb-a2').addEventListener('change',bump);
  let done=false;RD.onRender(()=>{hm();bump();done=true},'t-hb');RD.onResize(bump,'t-hb');
})();
