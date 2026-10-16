// ---- Scheduling lab, section 3: the fairshare calculator (Slurm's Fair Tree, and the classic 2^(-U/S) for comparison) ----
// Fair Tree as in src/plugins/priority/multifactor/fair_tree.c at slurm-24-11-5-1:
//   at each level of the account tree, level_fs = S / U, with S = the association's shares divided by its siblings' total,
//   U = its (decayed) usage divided by its parent's usage (U = 0 gives infinity, S = 0 gives 0);
//   siblings are visited in decreasing level_fs, depth first; users get ranks from the user count down;
//   fs_factor = rank / user_count. Tied users share a rank.
// Usage decays continuously: usage x 0.5^(elapsed / half-life) (priority_multifactor.c: decay_factor = 1 - 0.693/half_life per second).
window.SC_FS=(function(){
  // tree: {name, shares, usage?, children?}; users are leaves. Returns [{name, path, levelFs:[...], rank, fs}]
  function fairTree(root){
    const users=[];(function cnt(n){if(!n.children)users.push(n);else n.children.forEach(cnt)})(root);
    const total=users.length;let rnt=total,rank=total;const out=[];
    const usage=n=>n.children?n.children.reduce((a,c)=>a+usage(c),0):(n.usage||0);
    // _calc_tree_fs: sort siblings by level_fs (users before accounts on ties); a user tied with the previous
    // sibling keeps the previous rank; an account's children inherit its tie. (_count_tied_accounts stops at the
    // first following account, so tied accounts are never merged in practice.)
    function visit(sibs,parentUsage,path,accountTied){
      const sh=sibs.reduce((a,c)=>a+c.shares,0);
      const lv=sibs.map(c=>{const S=sh?c.shares/sh:0,U=parentUsage?usage(c)/parentUsage:0;return {c,S,U,lf:S===0?0:(U===0?Infinity:S/U)}});
      lv.sort((a,b)=>(b.lf-a.lf)||((a.c.children?1:0)-(b.c.children?1:0)));
      let prev=NaN;
      for(let i=0;i<lv.length;i++){const x=lv[i];
        const tied=(i===0&&accountTied)?true:prev===x.lf;
        if(!x.c.children){if(!tied)rank=rnt;out.push({name:x.c.name,path:path.concat([[x.c.name,x.S,x.U,x.lf]]),rank,fs:rank/total});rnt--}
        else visit(x.c.children,usage(x.c),path.concat([[x.c.name,x.S,x.U,x.lf]]),tied);
        prev=x.lf}
    }
    visit(root.children,usage(root),[],false);
    return out;
  }
  // classic (pre-Fair-Tree) factor for a flat set of accounts: F = 2^(-U/S), U and S normalised over the cluster
  function classic(accts){const su=accts.reduce((a,c)=>a+c.usage,0),ss=accts.reduce((a,c)=>a+c.shares,0);
    return accts.map(c=>({name:c.name,S:c.shares/ss,U:su?c.usage/su:0,F:Math.pow(2,-(su?c.usage/su:0)/(c.shares/ss))}))}
  const decay=(u,elapsed,hl)=>u*Math.pow(0.5,elapsed/hl);
  return {fairTree,classic,decay};
})();
(function(){
  const $=SC.$;if(!$('sc-fs-calc'))return;
  const ids=['sc-fs-sa','sc-fs-sb','sc-fs-ua','sc-fs-uc','sc-fs-ub','sc-fs-hl','sc-fs-el'];
  function read(){const v={};ids.forEach(id=>{const el=$(id);v[id.slice(6)]=+el.value;const o=$(id+'-o');if(o)o.textContent=el.value});return v}
  function draw(){
    const v=read();const d=u=>SC_FS.decay(u,v.el,v.hl);
    const tree={name:'root',shares:1,children:[{name:'root (user)',shares:1,usage:0},
      {name:'teama',shares:v.sa,children:[{name:'alice',shares:1,usage:d(v.ua)},{name:'carol',shares:1,usage:d(v.uc)}]},
      {name:'teamb',shares:v.sb,children:[{name:'bob',shares:1,usage:d(v.ub)}]}]};
    const ft=SC_FS.fairTree(tree);
    const cl=SC_FS.classic([{name:'teama',shares:v.sa,usage:d(v.ua+v.uc)},{name:'teamb',shares:v.sb,usage:d(v.ub)}]);
    const f=x=>x===Infinity?'&infin;':SC.fmt(x,3);
    let h='<div class="tw"><table><thead><tr><th>user</th><th>account level: S, U, level_fs</th><th>user level: S, U, level_fs</th><th class="num">rank</th><th class="num">Fair Tree factor</th><th class="num">priority (fairshare part)</th></tr></thead><tbody>';
    ft.filter(u=>u.name!=='root (user)').concat(ft.filter(u=>u.name==='root (user)')).forEach(u=>{const p=u.path;
      const acc=p.length>1?p[0]:null,us=p[p.length-1];
      h+='<tr'+(u.name==='root (user)'?' class="mute"':'')+'><td>'+u.name+'</td><td>'+(acc?acc[0]+': '+SC.fmt(acc[1],3)+', '+SC.fmt(acc[2],3)+', '+f(acc[3]):'(at root level)')+'</td><td>'+SC.fmt(us[1],3)+', '+SC.fmt(us[2],3)+', '+f(us[3])+'</td><td class="num">'+u.rank+' of '+ft.length+'</td><td class="num"><b>'+SC.fmt(u.fs,3)+'</b></td><td class="num">'+Math.round(10000*u.fs)+'</td></tr>'});
    h+='</tbody></table></div>';
    h+='<p class="small">Classic formula on the two accounts (<code>PriorityFlags=NO_FAIR_TREE</code>): '+cl.map(c=>c.name+' F = 2<sup>&minus;'+SC.fmt(c.U,3)+'/'+SC.fmt(c.S,3)+'</sup> = <b>'+SC.fmt(c.F,3)+'</b>').join('; ')+'. Usage after decay: alice '+SC.fmt(d(v.ua),1)+', carol '+SC.fmt(d(v.uc),1)+', bob '+SC.fmt(d(v.ub),1)+' (billed unit-seconds).</p>';
    const order=ft.filter(u=>u.name!=='root (user)').slice().sort((a,b)=>b.fs-a.fs).map(u=>u.name);
    h+='<p class="small">With equal age, the next free GPUs go to: <b>'+order.join(' &gt; ')+'</b>.</p>';
    $('sc-fs-out').innerHTML=h;
  }
  ids.forEach(id=>$(id).addEventListener('input',draw));
  $('sc-fs-reset').addEventListener('click',()=>{ids.forEach(id=>{$(id).value=$(id).defaultValue});draw()});
  SC.onRender(draw);draw();
})();
