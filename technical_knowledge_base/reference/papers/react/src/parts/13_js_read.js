// ---- Reading tab: inline charts (Table 1 bars, Table 2 splits, Figure 3 bars, ALFWorld bars) and derived numbers ----
const TB=PAPER.tables,RC=PAPER.rc;
const KC={base:'var(--rq)',reason:'var(--c2)',act:'var(--ra)',react:'var(--rt)',combo:'var(--c3)',sota:'var(--dim)',im:'var(--c5)',il:'var(--dim)',human:'var(--c6)'};
const MC={Standard:'var(--rq)',CoT:'var(--c2)',Act:'var(--ra)',ReAct:'var(--rt)'};
const seP=(p,n)=>100*Math.sqrt(p/100*(1-p/100)/n);
// horizontal bars as HTML rows (text stays at CSS size): rows [{n, v, c, se, hl, lab}]
function hbars(host,rows,max,f){if(!host)return;host.innerHTML=rows.map(r=>{const w=100*r.v/max,s=r.se?'<span class="se" style="left:'+(100*(r.v-r.se)/max).toFixed(2)+'%;width:'+(200*r.se/max).toFixed(2)+'%"></span>':'';
  return '<div class="row'+(r.hl?' hl':'')+'"><span class="nm" title="'+esc(r.n)+'">'+esc(r.n)+'</span><span class="track"><span class="fill" style="width:'+w.toFixed(2)+'%;background:'+r.c+'"></span>'+s+'</span><span class="val">'+(f?f(r.v):r.v)+(r.lab||'')+'</span></div>'}).join('')}
// words of the exemplars
(function(){const P=RC.prompt_words,set=(id,v)=>{const e=$(id);if(e)e.textContent=v};
  set('pwReact',fmt(P['HotpotQA ReAct'])+' words');set('pwStd',fmt(P['HotpotQA Standard (6 exemplars)']));set('pwCot',fmt(P['HotpotQA CoT']));set('pwAct',fmt(P['HotpotQA Act']));
  set('pwRatio',fmt(P['HotpotQA ReAct'])+' words of HotpotQA exemplars against '+fmt(P['HotpotQA Standard (6 exemplars)'])+', '+P['ReAct over Standard, HotpotQA']+' times; '+fmt(P['FEVER ReAct'])+' against '+fmt(P['FEVER Standard (3 exemplars)'])+' on FEVER');
  const g=RC.se['hotpotqa ReAct vs CoT'];set('seHq','about '+g.se_gap.toFixed(1)+' points, so z = '+g.z.toFixed(1));})();
// Table 1 mini bars
function t1bars(host,key){const rows=TB.t1.rows.map(r=>({n:r.m.replace(/ -> /g,' → '),v:+r[key],c:KC[r.kind],se:r.kind==='sota'?0:seP(+r[key],500),hl:r.m==='ReAct'}));hbars(host,rows,100,v=>v.toFixed(1))}
let t1mk='hq';const drawT1m=()=>t1bars($('t1m'),t1mk);segBind('t1mM',m=>{t1mk=m;drawT1m()});PRED_REVEAL['pr-cot']=drawT1m;
// Table 2 mini: stacked splits
(function(){const h=$('t2m');if(!h)return;const R=TB.t2.rows,c={'True positive':'var(--good)','False positive':'var(--c5)','Reasoning error':'var(--c6)','Search result error':'var(--ra)','Hallucination':'var(--bad)','Label ambiguity':'var(--dim)'};
  const line=(m,grp)=>{const rs=R.filter(r=>r.grp===grp&&r[m]);return '<span class="small"><b>'+(m==='react'?'ReAct':'CoT')+'</b> '+(grp==='Success'?'successes':'failures')+'</span><div class="sb" role="img" aria-label="'+m+' '+grp+'">'+rs.map(r=>'<span style="width:'+r[m]+'%;background:'+c[r.type]+'" title="'+r.type+' '+r[m]+'%">'+(r[m]>=12?r[m]+'%':'')+'</span>').join('')+'</div>'};
  h.innerHTML='<div class="split" style="grid-template-columns:max-content minmax(0,1fr)">'+line('react','Success')+line('cot','Success')+line('react','Failure')+line('cot','Failure')+'</div><div class="ctxk">'+Object.entries(c).map(([k,v])=>'<span><i style="background:'+v+'"></i>'+k.toLowerCase()+'</span>').join('')+'</div><p class="small mute" style="margin:0">Table 2: share of each method\'s 50 correct (successes) and 50 incorrect (failures) trajectories.</p>'})();
// Figure 3 grouped bars (SVG drawn at the measured width)
function f3draw(host,panels){fit(host,W=>{const F=RC.fig3,sizes=['8B','62B','540B'],M=['Standard','CoT','Act','ReAct'],np=panels.length;
  const H=230,pl=34,pr=8,pt=24,pb=40,gap=14,pw=(W-pl-pr-gap*(np-1))/np,y=v=>pt+(H-pt-pb)*(1-v/35);let s='';
  panels.forEach((p,pi)=>{const x0=pl+pi*(pw+gap);s+=tx(x0+pw/2,14,p==='prompt'?'Prompted':'Fine-tuned',{fs:12,a:'middle',w:600});
    [0,10,20,30].forEach(v=>{s+=ln2(x0,y(v),x0+pw,y(v),'var(--line)');if(pi===0)s+=tx(pl-4,y(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})});
    sizes.forEach((z,zi)=>{const gx=x0+zi*pw/3,bw=pw/3/5;s+=tx(gx+pw/6,H-pb+15,z,{fs:11,a:'middle'});
      M.forEach((m,mi)=>{const v=F[p][z]&&F[p][z][m];if(v==null)return;const bx_=gx+bw*(mi+.5);s+=rc(bx_,y(v),bw-1,y(0)-y(v),MC[m],{r:1});
        if(bw>=13&&(m==='ReAct'||W>560))s+=tx(bx_+bw/2,y(v)-3,v.toFixed(0),{fs:11,a:'middle',c:'var(--mute)'})});
      if(!F[p][z])s+=tx(gx+pw/6,y(4),'not run',{fs:11,a:'middle',c:'var(--mute)'})})});
  const L=legend(M.map(m=>[m,MC[m]]),pl,H-6,W-pl);s+=L.s;host.innerHTML=svgW(W,H+L.h-10,s,'HotpotQA exact match by model size, prompted and fine-tuned')})}
let f3mk='prompt';const drawF3m=()=>f3draw($('f3m'),[f3mk]);segBind('f3mM',m=>{f3mk=m;refit($('f3m'));drawF3m()});PRED_REVEAL['pr-ft']=drawF3m;
// ALFWorld mini bars
PRED_REVEAL['pr-alf']=()=>{const r=TB.t3.rows,g=m=>r.find(x=>x.m===m).All;
  hbars($('alfm'),[{n:'ReAct, best of 6',v:g('ReAct (best of 6)'),c:KC.react,hl:1},{n:'ReAct, average',v:g('ReAct (avg)'),c:KC.react},{n:'ReAct, worst trial',v:48,c:KC.react,lab:' (text)'},{n:'Act, best of 6',v:g('Act (best of 6)'),c:KC.act},{n:'ReAct-IM, best of 6',v:g('ReAct-IM (best of 6)'),c:KC.im},{n:'BUTLER, best of 8',v:g('BUTLER (best of 8)'),c:'var(--rq)'}].map(x=>Object.assign(x,{se:seP(x.v,134)})),100,v=>v+'%')};
