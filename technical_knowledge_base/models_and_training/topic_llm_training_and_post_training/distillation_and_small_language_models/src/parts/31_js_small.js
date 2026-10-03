// ---- Small models tab: size against Artificial Analysis's own runs, with the best-so-far line animated by quarter ----
(function(){
  const $=id=>document.getElementById(id);if(!$('sm'))return;
  const L=DS.land,R=L.rows;
  const reg=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-small']=window.TAB_RENDER['t-small']||[]).push(f)};
  const MEAS=[['gpqa','GPQA Diamond (%)',25],['aa_index','Intelligence Index v4.3',null],['ifbench','IFBench (%)',null],['hle','Humanity\'s Last Exam (%)',null],['aime25','AIME 2025 (%)',null],['livecodebench','LiveCodeBench (%)',null],['tau2','τ²-Bench (%)',null],['terminalbenchHard','Terminal-Bench Hard (%)',null]];
  $('smM').innerHTML=MEAS.map(m=>'<option value="'+m[0]+'">'+m[1]+' · '+R.filter(r=>r[m[0]]!=null).length+' models</option>').join('');
  const HOW={seq:'--c4',s2w:'--c2',logit:'--c6',prune:'--c5'};
  $('smH').innerHTML+=Object.keys(HOW).map(k=>'<option value="'+k+'">'+L.tags[k]+'</option>').join('');
  $('smL').innerHTML='<span><i style="background:var(--c1);opacity:.35"></i>2023</span><span><i style="background:var(--c1);opacity:.6"></i>2024</span><span><i style="background:var(--c1);opacity:.85"></i>2025</span><span><i style="background:var(--acc)"></i>2026</span>'+Object.keys(HOW).map(k=>'<span><i style="background:none;border:2.5px solid var('+HOW[k]+')"></i>'+L.tags[k]+'</span>').join('')+'<span><i style="background:none;border:1.5px dashed var(--ink)"></i>best at this size or smaller, so far</span>';
  $('smX').innerHTML='Artificial Analysis lists DeepSeek LLM 67B Chat at 7B parameters, so it is left out; it dates Phi-4-mini to 26 February 2024, a year early, so it is plotted at 26 February 2025 (its Hugging Face repository was created on 19 February 2025).';
  // quarters from 2023 Q3 to the quarter of the read date; each ends on its last day
  const QE=['03-31','06-30','09-30','12-31'],Q=[];
  for(let y=2023;y<=2026;y++)for(let q=0;q<4;q++){const end=y+'-'+QE[q],start=y+'-'+String(q*3+1).padStart(2,'0')+'-01';
    if(end<'2023-09-30'||start>L.meta.read_date)continue;Q.push({y,q:q+1,end:end<L.meta.read_date?end:L.meta.read_date})}
  let sel=null,cut=Q.length-1;
  function filt(){const m=$('smM').value,rm=$('smR').value,hm=$('smH').value;
    return R.filter(r=>r[m]!=null&&r.release&&(rm==='all'||String(+!!r.reasoning)===rm)&&(hm==='all'||r.how===hm))}
  function draw(qi){
    if(qi!=null)cut=qi;
    const el=$('smC'),W=RD.width(el),H=Math.min(380,Math.max(260,W*0.56)),l=40,r=10,t=12,b=34,pw=W-l-r,ph=H-t-b;
    const m=$('smM').value,MM=MEAS.find(x=>x[0]===m),all=filt(),end=Q[cut].end,rows=all.filter(r=>r.release<=end);
    const xs=[0.25,0.5,1,2,4,8,16],X=v=>l+pw*(Math.log2(Math.max(0.25,v))-Math.log2(0.25))/(Math.log2(16)-Math.log2(0.25));
    const ymax=Math.max(10,...all.map(r=>r[m]))*1.06,Y=v=>t+ph*(1-v/ymax);
    let s='';
    for(let k=0;k<=4;k++){const v=ymax*k/4;s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(l-4)+'" y="'+(Y(v)+4)+'" text-anchor="end" font-size="10.5" fill="var(--mute)">'+Math.round(v)+'</text>'}
    xs.forEach(v=>s+='<text x="'+X(v)+'" y="'+(H-18)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">'+(v<1?v:v)+'B</text>');
    s+='<text x="'+(l+pw/2)+'" y="'+(H-3)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">total parameters (log scale)</text>';
    if(MM[2])s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(MM[2])+'" y2="'+Y(MM[2])+'" stroke="var(--mute)" stroke-dasharray="2 3"/><text x="'+(W-r)+'" y="'+(Y(MM[2])-3)+'" text-anchor="end" font-size="10" fill="var(--mute)">chance</text>';
    // best at this size or smaller, among models released by the cut
    const srt=rows.slice().sort((a,b)=>a.params-b.params);let best=-1,d='';
    srt.forEach(r=>{if(r[m]>best){d+=(d?'L'+X(r.params).toFixed(1)+' '+Y(best).toFixed(1):'M'+X(r.params).toFixed(1)+' '+Y(r[m]).toFixed(1));best=r[m];d+=' L'+X(r.params).toFixed(1)+' '+Y(best).toFixed(1)}});
    if(d)s+='<path d="'+d+' L'+X(16)+' '+Y(best).toFixed(1)+'" fill="none" stroke="var(--ink)" stroke-dasharray="5 4" stroke-width="1.5"/>';
    rows.forEach((r,i)=>{const yr=+r.release.slice(0,4),op=yr<=2023?.35:yr===2024?.6:yr===2025?.85:1,est=m==='aa_index'&&r.aa_index_estimated,isSel=sel===r.slug;
      const cx=X(r.params),cy=Y(r[m]);
      s+='<circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="'+(isSel?7:4.5)+'" fill="'+(est?'var(--bg)':'var('+(yr>=2026?'--acc':'--c1')+')')+'" fill-opacity="'+(est?1:op)+'" stroke="'+(r.how?'var('+HOW[r.how]+')':est?'var(--c1)':'none')+'" stroke-width="'+(r.how?2.5:1.2)+'" data-s="'+r.slug+'" style="cursor:pointer"/>';
      if(isSel){const right=cx>W*0.6;s+='<text x="'+(right?cx-9:cx+9)+'" y="'+(cy-6)+'" font-size="11" font-weight="600"'+(right?' text-anchor="end"':'')+'>'+RD.esc(r.name)+'</text>'}});
    el.innerHTML=PF.svg(W,H,'Small open models, '+MM[1]+' against size, released by '+end,s);
    const bestIn=(lo,hi)=>{const c=rows.filter(r=>r.params>lo&&r.params<=hi).sort((a,b)=>b[m]-a[m])[0];return c?c[m].toFixed(1)+' · '+RD.esc(c.name):'none'};
    $('smO').innerHTML=RD.stat('Models shown',rows.length+' of '+all.length,'released by '+end)+RD.stat('Best up to 2B',bestIn(0,2))+RD.stat('Best 2B to 5B',bestIn(2,5))+RD.stat('Best 5B to 16B',bestIn(5,16));
    $('smT').textContent='Released by '+end+' ('+Q[cut].y+' Q'+Q[cut].q+')';
    const prev=cut>0?all.filter(r=>r.release<=Q[cut-1].end):[];const newOnes=rows.filter(r=>!prev.includes(r));
    const top=newOnes.slice().sort((a,b)=>b[m]-a[m])[0];
    $('smP').textContent=newOnes.length?newOnes.length+' new this quarter'+(top?'; the highest is '+top.name+' ('+top.params+'B) at '+top[m].toFixed(1)+'.':'.'):'No new models with this measure this quarter.';
    $('smF').innerHTML='Source: <a href="https://artificialanalysis.ai/models/qwen3-8b-instruct-reasoning" target="_blank" rel="noopener noreferrer">Artificial Analysis</a> model data, read '+L.meta.read_date+'; '+L.meta.index+'. Hollow points (index only): estimated values. Release dates are Artificial Analysis\'s.';
    detail();
  }
  function detail(){
    const r=R.find(x=>x.slug===sel);if(!r){$('smD').textContent='Tap a point.';return}
    const ev=MEAS.filter(x=>r[x[0]]!=null).map(x=>x[1].replace(' (%)','')+' '+r[x[0]].toFixed(1)+(x[0]==='aa_index'&&r.aa_index_estimated?' (estimated)':'')).join(' · ');
    $('smD').innerHTML='<b>'+RD.esc(r.name)+'</b> · '+RD.esc(r.creator||'')+' · '+r.params+'B'+(r.active?' ('+r.active+'B active)':'')+' · released '+r.release+(r.license?' · '+RD.esc(r.license):'')+'<br>'+ev+
      (r.how?'<br>Made by: <b>'+L.tags[r.how]+'</b> (<a href="'+r.how_src+'" target="_blank" rel="noopener noreferrer">source</a>)':'<br><span class="mute">How it was made: not marked here.</span>')+(r.fix?'<br><span class="warn">Date corrected:</span> '+RD.esc(r.fix):'');
  }
  $('smC').addEventListener('click',e=>{const c=e.target.closest('[data-s]');if(!c)return;sel=c.dataset.s;draw()});
  ['smM','smR','smH'].forEach(id=>$(id).addEventListener('change',()=>draw()));
  const AN=RD.anim({card:'sm',ctl:'smA',n:Q.length,start:Q.length-1,ms:900,label:'Quarter',draw:i=>draw(i)});
  reg(()=>AN.redraw());addEventListener('resize',()=>{if($('sm').offsetParent)AN.redraw()});
})();
