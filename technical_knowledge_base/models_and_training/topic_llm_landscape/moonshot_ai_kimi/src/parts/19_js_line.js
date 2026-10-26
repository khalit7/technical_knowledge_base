// ---- Reading, the line: Kimi releases by date, sized by total parameters; a click opens that release's row in the closed notes ----
(function(){
  const el=$('lnSvg');if(!el)return;
  const R=[
    {id:'chat',n:'Kimi chat',d:'2023-10-01',dl:'2023',open:false,P:null,src:null},
    {id:'k15',n:'Kimi k1.5',d:'2025-01-20',dl:'20 January 2025',open:false,P:null,src:['arXiv 2501.12599','https://arxiv.org/abs/2501.12599']},
    {id:'ml',n:'Moonlight-16B-A3B',d:'2025-02-24',dl:'24 February 2025',open:true,P:16,act:3,lic:'MIT',src:['Muon is Scalable, arXiv 2502.16982','https://arxiv.org/abs/2502.16982']},
    {id:'k2',n:'Kimi K2',d:'2025-07-11',dl:'11 July 2025 (weights; report 28 July)',open:true,P:1040,act:32.6,lic:'Modified MIT',src:['K2 report','https://arxiv.org/abs/2507.20534']},
    {id:'kl',n:'Kimi Linear 48B-A3B',d:'2025-10-30',dl:'30 October 2025',open:true,P:48,act:3,lic:'MIT',src:['arXiv 2510.26692','https://arxiv.org/abs/2510.26692']},
    {id:'k2t',n:'Kimi K2 Thinking',d:'2025-11-04',dl:'November 2025 (repository 4 November)',open:true,P:1026,act:32,lic:'Modified MIT',src:['model card','https://huggingface.co/moonshotai/Kimi-K2-Thinking']},
    {id:'k25',n:'Kimi K2.5',d:'2026-01-29',dl:'29 January 2026',open:true,P:1027,act:32,lic:'Modified MIT',src:['model card','https://huggingface.co/moonshotai/Kimi-K2.5']},
    {id:'k26',n:'Kimi K2.6',d:'2026-04-14',dl:'April 2026 (repository 14 April)',open:true,P:1027,act:32,lic:'Modified MIT',src:['Hugging Face','https://huggingface.co/moonshotai/Kimi-K2.6']},
    {id:'k27',n:'Kimi K2.7 Code',d:'2026-06-11',dl:'June 2026 (repository 11 June)',open:true,P:1027,act:32,lic:'Modified MIT',src:['Hugging Face','https://huggingface.co/moonshotai/Kimi-K2.7-Code']},
    {id:'k3',n:'Kimi K3',d:'2026-07-16',dl:'16 July 2026 (weights by 27 July)',open:true,P:2780,act:104.2,lic:'Kimi K3 License',src:['model card','https://huggingface.co/moonshotai/Kimi-K3']},
    {id:'k31',n:'Kimi K3.1 Pro',d:'2026-10-23',dl:'23 October 2026 (API; weights promised by 4 November)',open:false,P:2780,act:104.2,lic:'not yet named',src:['Kimi blog','https://www.kimi.ai/blog/kimi-k3-1-pro']}];
  let sel='k3';
  const tm=s=>new Date(s+'T00:00:00Z').getTime(),t0=tm('2023-07-01'),t1=tm('2026-11-15');
  function draw(){
    const W=Math.max(560,Math.min(900,el.clientWidth||800)),H=260,pl=50,pr=20,pt=20,pb=46;
    const X=s=>pl+(W-pl-pr)*(tm(s)-t0)/(t1-t0),lo=Math.log10(8),hi=Math.log10(4000),Y=p=>p?pt+(H-pt-pb-26)*(1-(Math.log10(p)-lo)/(hi-lo)):H-pb-8;
    let s='';[[10,'10B'],[100,'100B'],[1000,'1T']].forEach(([v,l])=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(Y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
    s+='<text x="'+(pl-6)+'" y="'+(H-pb-4)+'" font-size="10" text-anchor="end" fill="var(--mute)">n/a</text>';
    ['2024','2025','2026'].forEach(y=>{const x=X(y+'-01-01');s+='<line x1="'+x+'" x2="'+x+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)"/><text x="'+x+'" y="'+(H-pb+16)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+y+'</text>'});
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-8)+'" font-size="11" text-anchor="middle" fill="var(--mute)">release date · height: total parameters (log)</text>';
    R.forEach((r,i)=>{const x=X(r.d),y=Y(r.P),rad=r.P?4+Math.log10(r.P)*2:6,on=r.id===sel;
      s+='<g class="lnd" data-id="'+r.id+'" style="cursor:pointer"><circle cx="'+x+'" cy="'+y+'" r="'+(rad+6)+'" fill="transparent"/><circle cx="'+x+'" cy="'+y+'" r="'+rad+'" fill="'+(r.open?'var(--open)':'var(--bg)')+'" stroke="'+(r.open?'var(--open)':'var(--closed)')+'" stroke-width="2" fill-opacity="'+(on?1:.55)+'"/>'+(on?'<circle cx="'+x+'" cy="'+y+'" r="'+(rad+4)+'" fill="none" stroke="var(--ink)" stroke-dasharray="3 2"/>':'');
      const up=['k25','k26','kl','ml','k15','k31'].includes(r.id),k3=r.id==='k3',k31=r.id==='k31';s+='<text x="'+(k3?x-rad-4:k31?x+rad:x)+'" y="'+(k3?y+4:up?y-rad-6:y+rad+13)+'" font-size="10.5" text-anchor="'+(k3||k31?'end':'middle')+'">'+r.n.replace('Kimi ','')+'</text></g>'});
    el.innerHTML=svgEl(W,H,s,'Kimi release timeline');
    el.querySelectorAll('.lnd').forEach(g=>g.addEventListener('click',()=>pick(g.dataset.id)));
    document.querySelectorAll('#lnTab tr[data-id]').forEach(tr=>tr.classList.toggle('hl2',tr.dataset.id===sel));
  }
  function pick(id){sel=id;draw();const d=$('lnNotes');if(d){d.open=true;const tr=document.querySelector('#lnTab tr[data-id="'+id+'"]');if(tr)tr.scrollIntoView({block:'nearest'})}}
  onTab('t-read',draw);addEventListener('resize',()=>{if(!$('t-read').hidden)draw()});draw();
})();
