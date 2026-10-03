// ---- Reading tab: numbers from recompute.py, the predict reveals, the capability chart ----
(function(){
  const RC=PAPER.rc,T=PAPER.tables;
  const get=(o,path)=>path.split('.').reduce((a,k)=>a==null?a:a[k],o);
  document.querySelectorAll('.js[data-rc]').forEach(e=>{const v=get(RC,e.dataset.rc);e.textContent=v==null?'?':(typeof v==='number'?fmt(v,v%1?1:0):v)});
  // horizontal bars helper: rows [{n, v, c, note}], scale from lo to hi
  function hbars(host,rows,lo,hi,title){fit(host,w=>{const lw=Math.min(170,w*.42),bw=w-lw-52;let s=title?tx(0,12,title,{fs:11,c:'var(--mute)'}):'';const y0=title?20:4;
    rows.forEach((r,i)=>{const y=y0+i*24,x=bw*(r.v-lo)/(hi-lo);s+=tx(0,y+13,r.n,{fs:11})+rc(lw,y+2,Math.max(1,x),14,r.c,{r:2,op:.85})+tx(lw+x+4,y+13,(r.t||r.v.toFixed(r.d==null?1:r.d)),{fs:11,w:600})});
    host.innerHTML=svgW(w,y0+rows.length*24+4,s,title||'')})}
  PRED_REVEAL['pr-extra']=()=>hbars($('prExtraChart'),[{n:'Gemma 2 2B',v:47.9,c:'var(--dim)'},{n:'+ 6T more tokens',v:48.57,c:'var(--c1)',d:2},{n:'2B-2B, adapted',v:49.7,c:'var(--c3)'}],45,50.5,'PT score (axis from 45)');
  PRED_REVEAL['pr-long']=()=>{const host=$('prLongChart');const L4=T.B4.groups['Long Context'],L5=T.B5.groups['Long Context'];
    fit(host,w=>{const bs=['Ruler 32K','Ruler 128K','MRCR 32K','MRCR 128K'];const half=w<560?w:w/2-8;let s='';
      [[L4,'Pretrained (Table 4)'],[L5,'Post-trained (Table 5)']].forEach(([L,ttl],pi)=>{const ox=w<560?0:pi*(half+16),oy=w<560?pi*160:0;
        s+=tx(ox,oy+12,ttl,{fs:11,c:'var(--mute)'});const gw=(half-10)/bs.length,bw=Math.min(22,gw/2.6),base=oy+128,hm=100;
        bs.forEach((b,i)=>{const g=+L[b][2],t=+L[b][7],x=ox+i*gw+gw/2-bw;s+=rc(x,base-g/100*hm,bw,g/100*hm,'var(--dim)',{r:1})+rc(x+bw,base-t/100*hm,bw,t/100*hm,'var(--c4)',{r:1});
          s+=tx(x+bw,base-Math.max(g,t)/100*hm-4,(t-g>0?'+':'')+(t-g).toFixed(1),{fs:11,a:'middle',w:600,c:t>=g?'var(--good)':'var(--bad)'});
          s+=tx(x+bw,base+13,b.replace('Ruler','RULER'),{fs:11,a:'middle'})});
        s+=ln2(ox,base,ox+half-6,base,'var(--line)')});
      const lg=legend([['Gemma 3 4B','var(--dim)'],['T5Gemma 2 4B-4B','var(--c4)']],0,(w<560?320:160)+4,w);s+=lg.s;
      host.innerHTML=svgW(w,(w<560?320:160)+lg.h+6,s,'Long-context scores at 4B')})};
  // capability deltas, T5Gemma 2 minus Gemma 3, pretrained and post-trained
  function capChart(){const host=$('capChart');if(!host)return;const D4=RC.B4_deltas,D5=RC.B5_deltas;
    const cats=[['Reasoning and Factuality','Reasoning','Reasoning'],['Stem and Code','Stem and Code','STEM and code'],['Multilingual','Multilingual','Multilingual'],['Multimodal','Multimodal','Multimodal'],['Long Context','Long Context','Long context']];
    const sizes=['270M','1B','4B'],cols=['var(--c5)','var(--c1)','var(--c4)'];
    fit(host,w=>{const narrow=w<560,half=narrow?w:w/2-10;let s='';const lo=-5,hi=30;
      [[D4,0,'Pretrained (Table 4)'],[D5,1,'Post-trained (Table 5)']].forEach(([D,pi,ttl])=>{const ox=narrow?0:pi*(half+20),oy=narrow?pi*230:0;
        s+=tx(ox,oy+12,ttl,{fs:11,c:'var(--mute)'});const lw=Math.min(92,half*.36),bw=half-lw-34,z=ox+lw+bw*(0-lo)/(hi-lo);
        cats.forEach((c,ci)=>{const y=oy+22+ci*40;s+=tx(ox,y+16,c[2],{fs:11});
          sizes.forEach((sz,si)=>{const v=D[pi?c[1]:c[0]]?D[pi?c[1]:c[0]][sz]:null;const yy=y+si*12;
            if(v==null){s+=tx(z+3,yy+10,'n/a at '+sz,{fs:11,c:'var(--mute)'});return}
            const x1=ox+lw+bw*(Math.max(lo,Math.min(hi,v))-lo)/(hi-lo);s+=rc(Math.min(z,x1),yy+1,Math.abs(x1-z),10,cols[si],{r:1,op:.85})+tx(Math.max(z,x1)+3,yy+10,(v>0?'+':'')+v.toFixed(1),{fs:11})})});
        s+=ln2(z,oy+18,z,oy+22+cats.length*40,'var(--mute)')});
      const lg=legend(sizes.map((x,i)=>[x+' (T5Gemma 2 '+x+'-'+x+' minus Gemma 3 '+x+')',cols[i]]),0,(narrow?460:230)+4,w);s+=lg.s;
      host.innerHTML=svgW(w,(narrow?460:230)+lg.h+6,s,'T5Gemma 2 minus Gemma 3 by capability')})}
  onTab('t-read',capChart);
  // highlight the nav chip of the section in view
  const nav=$('nav');if(nav&&'IntersectionObserver' in window){const as=[...nav.querySelectorAll('a')];const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){as.forEach(a=>a.classList.toggle('cur',a.getAttribute('href')==='#'+e.target.id))}})},{rootMargin:'-20% 0px -70% 0px'});
    as.forEach(a=>{const t=document.getElementById(a.getAttribute('href').slice(1));if(t)io.observe(t)})}
})();
