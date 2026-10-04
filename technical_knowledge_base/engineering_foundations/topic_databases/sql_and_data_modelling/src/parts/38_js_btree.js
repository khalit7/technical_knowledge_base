// ---- Reading, section 8: the same 36 inserts into an index's leaf pages, sequential keys against random keys ----
// Illustrative model: leaf pages of 6 keys, a full page splits in half, except that a key past the end of the last page
// starts a new page and leaves the full one full (what B-tree implementations, Postgres included, do for rightmost inserts).
(function(){
  const svgEl=document.getElementById('rd-bt-svg');if(!svgEl)return;
  const C=6,K=36;
  // deterministic "random" keys: a seeded generator stands in for UUID v4's random bits
  let seed=20261004;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648};
  const RK=[];for(let i=0;i<K;i++)RK.push(Math.floor(rnd()*1e6));
  function simulate(keys){
    const states=[{leaves:[[]],touched:[],key:null,splits:0,writes:0,recent:[]}];
    let leaves=[[]],splits=0,writes=0;const hist=[];
    keys.forEach(x=>{
      let li=leaves.findIndex(l=>l.length&&l[l.length-1]>=x);if(li<0)li=leaves.length-1;
      // a key smaller than everything in leaf li but larger than the previous leaf's max still belongs to li
      const L=leaves[li];let touched=[li];
      if(L.length<C){L.push(x);L.sort((a,b)=>a-b)}
      else{splits++;
        if(li===leaves.length-1&&x>L[L.length-1]){leaves.push([x]);touched=[li,li+1]}
        else{const h=C/2,left=L.slice(0,h),right=L.slice(h);leaves.splice(li,1,left,right);
          (x<=left[left.length-1]?left:right).push(x);left.sort((a,b)=>a-b);right.sort((a,b)=>a-b);touched=[li,li+1]}}
      writes+=touched.length;hist.push(touched.map(t=>leaves[t]));
      const recent=new Set();hist.slice(-10).forEach(ts=>ts.forEach(l=>recent.add(l)));
      states.push({leaves:leaves.map(l=>l.slice()),touched:touched.slice(),key:x,splits,writes,recent:recent.size,keyIdx:states.length});
    });
    return states}
  const S={seq:simulate(Array.from({length:K},(_,i)=>i+1)),rand:simulate(RK)};
  let mode='seq';
  function draw(i){
    const st=S[mode][i];const W=RD.width(svgEl);
    const slot=W<420?9:12,pw=C*slot+8,gap=6,perRow=Math.max(1,Math.floor((W+gap)/(pw+gap))),ph=slot+12;
    let s='';const nL=st.leaves.length;
    st.leaves.forEach((l,k)=>{const x=(k%perRow)*(pw+gap),y=Math.floor(k/perRow)*(ph+gap);const hot=st.touched.includes(k)&&i>0;
      s+='<rect x="'+x+'" y="'+y+'" width="'+pw+'" height="'+ph+'" rx="4" fill="'+(hot?'var(--hl)':'var(--bg)')+'" stroke="'+(hot?'var(--bad)':'var(--line)')+'" stroke-width="'+(hot?2:1)+'"/>';
      for(let j=0;j<C;j++){const filled=j<l.length;const isNew=filled&&l[j]===st.key&&hot;
        s+='<rect x="'+(x+4+j*slot)+'" y="'+(y+6)+'" width="'+(slot-2)+'" height="'+slot+'" rx="2" fill="'+(isNew?'var(--bad)':filled?'var(--acc)':'var(--soft)')+'" stroke="var(--line)" stroke-width=".5"/>'}});
    const rows=Math.ceil(nL/perRow);
    svgEl.innerHTML=RD.svg(W,rows*(ph+gap),s,'Index leaf pages after '+i+' inserts');
    const used=st.leaves.reduce((a,l)=>a+l.length,0),fill=nL?Math.round(100*used/(nL*C)):0;
    document.getElementById('rd-bt-cnt').innerHTML=RD.stat('Keys inserted',i)+RD.stat('Leaf pages',nL)+RD.stat('Average page fill',fill+'%')+RD.stat('Page splits',st.splits)+RD.stat('Pages touched by the last 10 inserts',i?st.recent:0);
    let cap;
    if(i===0)cap='An empty index: one empty leaf page. Press play to insert 36 keys in the order they are generated.';
    else if(mode==='seq')cap=st.touched.length>1?'Key '+st.key+' is past the end of the full last page, so a new page starts and the full one is left full. Only the newest page is ever written.':'Key '+st.key+' belongs after every existing key: it goes into the last page, the only one being written.';
    else cap=st.touched.length>1?'This key belongs inside a full page, so the page splits in half: two pages written, each now half empty.':'This key belongs in the middle of the index (red): a page far from the last insert is written.';
    if(i===K)cap=mode==='seq'?'Done: pages are full and only the last one was ever hot. A cache needs to hold one page to absorb these writes.':'Done: '+fill+'% average fill and writes spread over almost every page. Once the index is bigger than memory, each insert reads a cold page first, and after each checkpoint the first change to every page writes the whole page to the WAL.';
    document.getElementById('rd-bt-cap').innerHTML='<div class="t">'+(mode==='seq'?'Sequential keys':'Random keys')+', insert '+i+' of '+K+'</div><p>'+cap+'</p>';
  }
  const A=RD.anim({card:'rd-btree-card',ctl:'rd-bt-ctl',n:K+1,ms:700,label:'Insert',draw});
  RD.seg(document.getElementById('rd-bt-mode'),m=>{mode=m;A.reset(K+1);A.play()});
  RD.onResize(()=>A.redraw());
  window.RD_BT=S; // exposed for src/check_page.mjs
})();
