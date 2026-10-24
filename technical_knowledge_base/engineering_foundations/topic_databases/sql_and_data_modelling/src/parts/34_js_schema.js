// ---- Reading, the hero: the four tables, their keys, and which section works on each, drawn to the measured width ----
(function(){
  const el=document.getElementById('rd-schema');if(!el)return;
  const T=[
    {n:'users',kind:'50 rows',c:[['id','PK'],['email','UNIQUE'],['name',''],['plan','CHECK'],['country',''],['created_at','']],
     note:'email is the natural key, kept UNIQUE; id is the surrogate PK (7)'},
    {n:'chats',kind:'200 rows',c:[['id','PK'],['user_id','FK'],['title',''],['model',''],['created_at','']],
     note:'one user, many chats: joins follow user_id (2), fan-out starts here'},
    {n:'messages',kind:'2,000 rows',c:[['id','PK'],['chat_id','FK'],['parent_id','FK'],['role','CHECK'],['content',''],['tokens','CHECK'],['created_at','']],
     note:'parent_id points back into messages: a tree, walked with WITH RECURSIVE (5)',hi:1},
    {n:'credits',kind:'50 rows',c:[['user_id','PK, FK'],['balance','CHECK']],
     note:'the PK is also the FK: one to one; CHECK (balance >= 0) (10)'}];
  const L=[[1,1,0,0],[2,1,1,0],[2,2,2,0],[3,0,0,0]];
  function draw(){
    const W=RD.width(el);
    if(W>=760){SV.schema(el,[T[3],T[0],T[1],T[2]],[[2,1,1,0],[3,1,2,0],[3,2,3,0],[0,0,1,0]],{id:'h',label:'The four tables of the chat data, their keys and foreign keys'});return}
    // narrow and medium: two columns, users and chats on top, credits and messages below
    const gap=14,bw=Math.floor((W-8-gap)/2),rh=19,hh=24,pos=[];const order=[0,1,3,2];let s=SV.marker('sch-ar'),rowH=[0,0];
    const hs=T.map(t=>{const nl=SV.wrap(t.note,bw-14,11);return {nl,h:hh+rh*t.c.length+8+nl.length*15}});
    order.forEach((ti,k)=>{const r=Math.floor(k/2);rowH[r]=Math.max(rowH[r],hs[ti].h)});
    order.forEach((ti,k)=>{const col=k%2,r=Math.floor(k/2);pos[ti]={x:col*(bw+gap),y:4+(r?rowH[0]+gap+16:0),w:bw}});
    T.forEach((t,ti)=>{const p=pos[ti],h=hs[ti].h;
      s+='<rect x="'+p.x+'" y="'+p.y+'" width="'+p.w+'" height="'+h+'" rx="7" fill="var(--bg)" stroke="'+(t.hi?'var(--acc)':'var(--line)')+'"/>';
      s+='<rect x="'+p.x+'" y="'+p.y+'" width="'+p.w+'" height="'+hh+'" rx="7" fill="var(--acc2)"/>';
      s+=RD.t(p.x+8,p.y+16,t.n,{fs:12.5,w:600})+RD.t(p.x+p.w-6,p.y+16,t.kind,{fs:10.5,a:'end',fill:'var(--mute)'});
      t.c.forEach((c,i)=>{const y=p.y+hh+rh*i+14,k=c[1];const col=k.indexOf('PK')===0?'var(--acc)':k.indexOf('FK')>=0?'var(--c2)':'var(--ink)';
        s+='<text x="'+(p.x+8)+'" y="'+y+'" font-size="11.5" font-family="ui-monospace,Menlo,monospace" fill="'+col+'"'+(k?' font-weight="600"':'')+'>'+c[0]+'</text>';
        if(k)s+=RD.t(p.x+p.w-6,y,k,{fs:10.5,a:'end',fill:'var(--mute)'})});
      s+=SV.lines(p.x+8,p.y+hh+rh*t.c.length+16,hs[ti].nl,{fs:11,fill:'var(--acc)',lh:15});
    });
    const arrow=d=>'<path d="'+d+'" fill="none" stroke="var(--c2)" stroke-width="1.4" marker-end="url(#sch-ar)" opacity=".9"/>';
    // chats.user_id -> users.id (right to left)
    {const a=pos[1],b=pos[0],y1=a.y+hh+rh*1+10,y2=b.y+hh+10;s+=arrow('M'+a.x+','+y1+' C'+(a.x-gap)+','+y1+' '+(b.x+b.w+gap)+','+y2+' '+(b.x+b.w)+','+y2)}
    // messages.chat_id -> chats.id (up)
    {const a=pos[2],b=pos[1],y1=a.y+hh+rh*1+10,bx=b.x+b.w-4;s+=arrow('M'+(a.x+a.w)+','+y1+' C'+(a.x+a.w+6)+','+y1+' '+(bx+4)+','+(b.y+hs[1].h+30)+' '+bx+','+(b.y+hs[1].h+2))}
    // messages.parent_id -> messages.id (self, loop on the left edge)
    {const a=pos[2],y1=a.y+hh+rh*2+10,y2=a.y+hh+10;s+=arrow('M'+a.x+','+y1+' C'+(a.x-12)+','+y1+' '+(a.x-12)+','+y2+' '+a.x+','+y2)}
    // credits.user_id -> users.id (up)
    {const a=pos[3],b=pos[0],x=a.x+30;s+=arrow('M'+x+','+a.y+' L'+x+','+(b.y+hs[0].h+2))}
    el.innerHTML=RD.svg(W,Math.max(pos[2].y+hs[2].h,pos[3].y+hs[3].h)+6,s,'The four tables of the chat data, their keys and foreign keys');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
