// ---- Hero figure (light pass 2026-10-25): the four benchmark results as dumbbells, each labelled with where its skills
// came from, none of them the 1,000-repository library. Numbers: Table 1 (MLE-bench Any Medal, mean of 3 runs), Table 2
// (PaperBench average), Table 3 (FrontierCS score), Table 4 (PassNet AS Score; TorchInductor 1.419). Sources of the skills:
// §4.3, Appendix A.2.1 to A.2.4.
(function(){const el=$('heroSvg');if(!el)return;
  const R=[
    {l:'MLE-bench: Any Medal %, 3 runs each',src:'skills: web search plus up to 24 GPU-h of trials on each competition',a:31.11,b:72.89,lo:0,hi:100,fa:'31.1',fb:'72.9'},
    {l:'PaperBench: replication score, 20 papers',src:'skills: 636 from up to 10 related papers per target',a:29.45,b:39.59,lo:0,hi:100,fa:'29.45',fb:'39.59'},
    {l:'FrontierCS: score, 188 tasks',src:'skills: one graph tuned on development problems; 1.8x tokens',a:70.63,b:77.14,lo:0,hi:100,fa:'70.63',fb:'77.14'},
    {l:'PassNet: AS Score, 200 samples',src:'skills: built from the 4,000+ training instances',a:1.343,b:1.5313,lo:1,hi:1.7,fa:'1.343',fb:'1.5313',tick:1.419}];
  fit(el,w=>{const x0=6,x1=w-10;let s='',y=4;
    R.forEach(r=>{const sx=v=>x0+(v-r.lo)/(r.hi-r.lo)*(x1-x0);
      s+=tx(x0,y+13,r.l,{fs:12.5,w:600});
      const src=w<430?r.src.replace('web search plus ','').replace(' from up to 10 related papers per target',' from related papers').replace('; 1.8x tokens',''):r.src;
      s+=tx(x0,y+29,src,{fs:11.5,c:'var(--mute)'});
      const ly=y+54;
      s+=ln2(x0,ly,x1,ly,'var(--line)',{sw:1});
      s+=tx(x0,ly+15,String(r.lo),{fs:11,c:'var(--mute)'})+tx(x1,ly+15,String(r.hi),{fs:11,a:'end',c:'var(--mute)'});
      if(r.tick){const xt=sx(r.tick);s+=ln2(xt,ly-8,xt,ly+8,'var(--mute)',{sw:1.4})+tx(xt,ly+15,'Inductor',{fs:11,a:'middle',c:'var(--mute)'})}
      const xa=sx(r.a),xb=sx(r.b);
      s+=ln2(xa,ly,xb,ly,'var(--c1)',{sw:3.5});
      s+='<circle cx="'+xa.toFixed(1)+'" cy="'+ly+'" r="5" fill="var(--bg)" stroke="var(--mute)" stroke-width="1.6"/>';
      s+='<circle cx="'+xb.toFixed(1)+'" cy="'+ly+'" r="5.5" fill="var(--c1)"/>';
      s+=tx(xa-8,ly-9,r.fa,{fs:11.5,a:'end',c:'var(--mute)'})+tx(xb+8,ly-9,r.fb,{fs:11.5,c:'var(--ink)',w:600});
      y=ly+30});
    s+=tx(x0,y+6,'hollow: Codex alone; filled: with skills. Library used: none.',{fs:11.5,c:'var(--mute)'});
    el.innerHTML=svgW(w,y+14,s,'Four benchmark results before and after skills: MLE-bench 31.1 to 72.9 percent medalled, PaperBench 29.45 to 39.59, FrontierCS 70.63 to 77.14, PassNet AS Score 1.343 to 1.531; each benchmark used skills built for it, none from the repository library')});
  onTab('t-read',()=>refit(el));
})();
