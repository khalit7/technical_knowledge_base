// ---- Judge atlas (t-judges), part c: one metric at a time (dot chart, by date or ranked) ----
(function(){
  const A=window.JUDGE_ATLAS,JA=window.JA;if(!A||!JA)return;
  const $=id=>document.getElementById(id),M=A.metrics,esc=JA.esc,fd=JA.fd,fv=JA.fv;
  const cnt={};A.readings.forEach(x=>cnt[x.m]=(cnt[x.m]||0)+1);
  const MS=Object.keys(M).filter(m=>cnt[m]>=4);
  let cur='jb_acc',view=null,pick=null;
  $('ja-mch').innerHTML=MS.map(m=>'<button data-m="'+m+'" aria-pressed="'+(m===cur)+'"'+(m===cur?' class="on"':'')+'>'+esc(M[m].n)+' ('+cnt[m]+')</button>').join('');
  $('ja-mch').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=b.dataset.m;view=null;pick=null;
    $('ja-mch').querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',String(x===b))});render()});
  $('ja-view').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;view=b.dataset.v;render()});
  const tms=d=>{const m=String(d).match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);return Date.UTC(+m[1],+m[2]-1,m[3]?+m[3]:15)};
  const COL={ind:'var(--k-ind)',self:'var(--k-self)',vendor:'var(--k-vendor)',ref:'var(--k-ref)'};
  function render(){
    const el=$('ja-plot');const W=Math.max(280,Math.min(el.clientWidth||$('ja-ch-s').clientWidth||600,900));
    const mm=M[cur],pts=A.readings.filter(x=>x.m===cur).slice();
    const dates=new Set(pts.map(x=>x.d));const canDate=dates.size>=3;
    const v=view||(canDate?'date':'rank');
    $('ja-view').querySelectorAll('button').forEach(b=>{b.classList.toggle('on',b.dataset.v===v);b.disabled=(b.dataset.v==='date'&&!canDate);b.title=b.disabled?'All readings on this metric share one date':''});
    $('ja-mdesc').innerHTML='<b>'+esc(mm.n)+'.</b> '+esc(mm.t)+'.'+(mm.ch!=null?' Chance: '+(mm.u==='%'?mm.ch+'%':mm.ch)+'.':'')+(mm.hi?'':' Lower is better.');
    const ks=[...new Set(pts.map(x=>x.k))];
    $('ja-ch-leg').innerHTML=ks.map(k=>'<span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4.5" fill="'+(k==='ind'?COL[k]:'none')+'" stroke="'+COL[k]+'" stroke-width="1.6"/></svg> '+esc(A.enums.k[k][0])+'</span>').join('')+(mm.ch!=null?'<span><svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" stroke="var(--mute)" stroke-dasharray="3 3"/></svg> chance</span>':'');
    const vals=pts.map(x=>x.v).concat(mm.ch!=null?[mm.ch]:[]);
    let lo=Math.min(...vals),hi=Math.max(...vals);const pad=(hi-lo)*0.08||1;lo=lo-pad;hi=hi+pad;
    if(mm.u==='%'){lo=Math.max(0,Math.floor(lo/10)*10);hi=Math.min(100,Math.ceil(hi/10)*10)}else if(mm.u!=='frac'&&mm.u!=='r'&&mm.u!=='rho'){lo=Math.floor(lo*10)/10;hi=Math.ceil(hi*10)/10}
    const fmtT=t=>mm.u==='%'?t+'%':(+t.toFixed(2)).toString();
    const ticks=[];const raw=(hi-lo)/5,mag=Math.pow(10,Math.floor(Math.log10(raw))),step=[1,2,2.5,5,10].map(f=>f*mag).find(s=>s>=raw);lo=Math.floor(lo/step+1e-9)*step;hi=Math.ceil(hi/step-1e-9)*step;for(let t=lo;t<=hi+step/2;t+=step)ticks.push(+t.toFixed(6));
    let svg='';
    if(v==='date'){
      const H=Math.round(Math.min(420,Math.max(260,W*0.55))),L=44,Rr=12,T=12,B=30;
      const t0=Math.min(...pts.map(x=>tms(x.d))),t1=Math.max(...pts.map(x=>tms(x.d)));const tp=(t1-t0)*0.06||86400000*30;
      const X=t=>L+(t-(t0-tp))/((t1+tp)-(t0-tp))*(W-L-Rr),Y=val=>T+(1-(val-lo)/(hi-lo))*(H-T-B);
      svg+='<svg width="'+W+'" height="'+H+'" role="img" aria-label="'+esc(mm.n)+' by date">';
      ticks.forEach(t=>{svg+='<line x1="'+L+'" x2="'+(W-Rr)+'" y1="'+Y(t)+'" y2="'+Y(t)+'" stroke="var(--line)"/><text x="'+(L-4)+'" y="'+(Y(t)+3.5)+'" text-anchor="end">'+fmtT(+t.toFixed(3))+'</text>'});
      const y0=new Date(t0-tp).getUTCFullYear(),y1=new Date(t1+tp).getUTCFullYear();
      for(let y=y0;y<=y1;y++)for(const mo of [0,6]){const t=Date.UTC(y,mo,1);if(t<t0-tp||t>t1+tp)continue;const x=X(t);svg+='<line x1="'+x+'" x2="'+x+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--line)" stroke-dasharray="2 4"/>'+(W>420||mo===0?'<text x="'+x+'" y="'+(H-B+14)+'" text-anchor="middle">'+(mo?'Jul ':'')+y+'</text>':'')}
      if(mm.ch!=null)svg+='<line x1="'+L+'" x2="'+(W-Rr)+'" y1="'+Y(mm.ch)+'" y2="'+Y(mm.ch)+'" stroke="var(--mute)" stroke-dasharray="4 4"/>';
      // spread dots sharing a date sideways so none hides another
      const seen={};const P=pts.map(x=>{const key=x.d+'|'+Math.round(Y(x.v)/7);seen[key]=(seen[key]||0)+1;return [x,X(tms(x.d))+(seen[key]-1)*7,Y(x.v)]});
      const top=pts.slice().sort((a,b)=>mm.hi?b.v-a.v:a.v-b.v).slice(0,W>520?4:2).map(x=>x.id);
      const used=[];
      P.forEach(([x,cx,cy])=>{svg+='<circle data-id="'+x.id+'" cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="'+(pick===x.id?6.5:4.8)+'" fill="'+(x.k==='ind'?COL[x.k]:'var(--bg)')+'" stroke="'+COL[x.k]+'" stroke-width="'+(pick===x.id?2.6:1.7)+'"><title>'+esc(x.j+': '+fv(x)+' ('+fd(x.d)+')')+'</title></circle>';
        if(top.indexOf(x.id)>=0||pick===x.id){let lx=cx+8,anc='start';const lab=x.j.length>30?x.j.slice(0,29)+'.':x.j;if(lx+lab.length*5.6>W-Rr){lx=cx-8;anc='end'}let ly=cy+3.5;while(used.some(u=>Math.abs(u-ly)<12))ly+=12;used.push(ly);svg+='<text class="lbl" x="'+lx.toFixed(1)+'" y="'+ly.toFixed(1)+'" text-anchor="'+anc+'">'+esc(lab)+'</text>'}});
      svg+='</svg>';
    }else{
      const srt=pts.slice().sort((a,b)=>mm.hi?b.v-a.v:a.v-b.v),rowH=19,T=8,B=26;
      const lw=Math.min(Math.max(120,W*0.42),260),L=lw+8,Rr=44,H=T+B+srt.length*rowH;
      const X=val=>L+(val-lo)/(hi-lo)*(W-L-Rr);
      svg+='<svg width="'+W+'" height="'+H+'" role="img" aria-label="'+esc(mm.n)+' ranked">';
      ticks.forEach(t=>{svg+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--line)"/><text x="'+X(t)+'" y="'+(H-B+14)+'" text-anchor="middle">'+fmtT(+t.toFixed(3))+'</text>'});
      if(mm.ch!=null)svg+='<line x1="'+X(mm.ch)+'" x2="'+X(mm.ch)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--mute)" stroke-dasharray="4 4"/>';
      const maxc=Math.floor(lw/5.7);
      srt.forEach((x,i)=>{const cy=T+i*rowH+rowH/2,lab=x.j.length>maxc?x.j.slice(0,maxc-1)+'.':x.j;
        svg+='<text class="lbl" x="'+lw+'" y="'+(cy+3.5)+'" text-anchor="end">'+esc(lab)+'</text><line x1="'+L+'" x2="'+X(x.v)+'" y1="'+cy+'" y2="'+cy+'" stroke="var(--line)"/>'
          +'<circle data-id="'+x.id+'" cx="'+X(x.v).toFixed(1)+'" cy="'+cy+'" r="'+(pick===x.id?6.5:4.8)+'" fill="'+(x.k==='ind'?COL[x.k]:'var(--bg)')+'" stroke="'+COL[x.k]+'" stroke-width="'+(pick===x.id?2.6:1.7)+'"><title>'+esc(x.j+': '+fv(x))+'</title></circle>'
          +'<text x="'+(X(x.v)+8)+'" y="'+(cy+3.5)+'">'+esc(fv(x))+'</text>'});
      svg+='</svg>';
    }
    el.innerHTML=svg;
    if(pick){const x=JA.rdId[pick];if(x&&x.m===cur)tip(x)}else $('ja-tip').innerHTML='Click or tap a dot for the reading and its source.';
  }
  function tip(x){$('ja-tip').innerHTML='<b>'+esc(x.j)+': '+esc(fv(x))+'</b>'+JA.kd(x.k)+' '+esc(M[x.m].n)+'; '+esc(x.set)+'; '+fd(x.d)+(x.run?' (run '+esc(x.run)+')':'')+'. Source: '+JA.sa(x.s,'paper or page')+(x.note?'. '+esc(x.note):'')
    +(x.row?' <button class="jump" data-id="'+x.row+'" style="font-size:12px;padding:0 8px">open "'+esc(JA.byId[x.row].n)+'" in the grid</button>':'')}
  $('ja-plot').addEventListener('click',e=>{const c=e.target.closest('circle[data-id]');if(!c)return;pick=c.dataset.id;render()});
  $('ja-tip').addEventListener('click',e=>{const b=e.target.closest('button.jump');if(b)JA.show(b.dataset.id,true)});
  window.TAB_RENDER=window.TAB_RENDER||{};(window.TAB_RENDER['t-judges']=window.TAB_RENDER['t-judges']||[]).push(render);
  let rt=0;addEventListener('resize',()=>{if($('t-judges').hidden)return;clearTimeout(rt);rt=setTimeout(render,120)});
  render();
})();
