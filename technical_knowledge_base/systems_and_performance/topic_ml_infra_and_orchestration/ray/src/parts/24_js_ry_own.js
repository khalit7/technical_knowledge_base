// ---- Ray child page: Reading, the node-loss table in Failures (the replay is the 3D Fig. 3, 43_js_sc_loss.js; the life of a task is Fig. 1) ----
(function(){
const Y=window.RY,E=RD.esc,$=id=>document.getElementById(id),U=window.RYU,f1=U.f1,f2=U.f2;
const reg=f=>{RD.onRender(f);RD.onResize(f)};
const vis=()=>{const t=$('t-read');return t&&!t.hidden};

// 2. node loss replay
const L=Y.lineage;const G=k=>L.gets.find(g=>g.obj===k);
const ITEMS=[
 {k:'D',obj:'D_small_inline',lab:'D: 1 KB task output',owner:'driver',why:'Under 100 KB it came back inside the reply and lives in the driver\'s memory; it was never on w2.'},
 {k:'A',obj:'A_task_output',lab:'A: 8 MB task output',owner:'driver',why:'The owner (driver) is alive and holds the lineage; the task is retryable (max_retries 3), so the owner re-ran it on w1 once w2 was declared dead.'},
 {k:'B',obj:'B_task_output_no_retries',lab:'B: 8 MB, max_retries=0',owner:'driver',why:'The owner is alive but may not re-run the task: retries are disabled.'},
 {k:'C',obj:'C_put_inside_task',lab:'C: ray.put inside a task on w2',owner:'a worker on w2',why:'Its owner was the worker on w2 that called ray.put; owner gone means object gone, and ray.put objects have no lineage anyway.'},
 {k:'a1',obj:'actor_max_restarts_1',lab:'actor, max_restarts=1',owner:'the driver (the GCS restarts actors)',why:'The GCS restarted it on w1 when w2 was declared dead; __init__ ran again, so its counter (5 before) restarted from 0.'},
 {k:'a0',obj:'actor_max_restarts_0',lab:'actor, max_restarts=0',owner:'the driver (the GCS restarts actors)',why:'No restarts allowed: the GCS marked it dead with the node.'}];
function lossTable(){
  $('ry-loss-table').querySelector('tbody').innerHTML=ITEMS.map(it=>{const g=G(it.obj);
    return '<tr><td>'+E(it.lab)+'</td><td>'+E(it.owner)+'</td><td>'+(g.ok?'<b>ok</b>'+(/actor/.test(it.obj)?' (counter '+g.value+', on '+g.host_pid[0]+')':'')+(g.secs>1?' after '+f1(g.secs)+' s':''):'<code>'+E(g.type)+'</code>')+'</td><td>'+E(it.why)+(g.ok?'':'<div class="small mute">"'+E(g.msg.split(' | ').filter(x=>x&&!/^Failed to retrieve|RAY_record_ref/.test(x)).slice(0,1).join(' ').slice(0,260)||g.msg.slice(0,200))+'"</div>')+'</td></tr>'}).join('');}
function all(){if(!vis())return;lossTable()}
reg(all);
lossTable();
})();
