"""Locate and extract the Slurm source lines quoted on the page, at tag slurm-24-11-5-1
(commit e4788bed70462dc5e14b1b170d271d7495a0f334). Each quote is found by a pattern, never by a hard-coded line,
so the page's line numbers are what this script finds.
usage: python3 quote_source.py <slurm source dir> <out json>"""
import json, sys
root = sys.argv[1]
Q = [  # id, file, pattern of the anchor line, lines before, lines after
 ('main_fail_part', 'src/slurmctld/job_scheduler.c', 'Do not schedule more jobs in this partition or on', 4, 3),
 ('main_depth', 'src/slurmctld/job_scheduler.c', 'already tested %u jobs, breaking out', 1, 3),
 ('def_depth', 'src/slurmctld/job_scheduler.c', 'static int def_job_limit = 100;', 0, 0),
 ('nodes_down_msg', 'src/slurmctld/job_scheduler.c', 'Nodes required for job are DOWN, DRAINED%s', 4, 1),
 ('prio_sum', 'src/plugins/priority/multifactor/priority_multifactor.c', 'priority = job_ptr->prio_factors->priority_age', 0, 13),
 ('prio_age', 'src/plugins/priority/multifactor/priority_multifactor.c', 'if (diff < max_age)', 0, 5),
 ('prio_js', 'src/plugins/priority/multifactor/priority_multifactor.c', '} else {	/* favor large */', 0, 7),
 ('prio_tres', 'src/plugins/priority/multifactor/priority_multifactor.c', 'tres_factors[i] = value /', 4, 1),
 ('prio_part', 'src/plugins/priority/multifactor/priority_multifactor.c', 'job_ptr->part_ptr->norm_priority;', 4, 0),
 ('prio_qos', 'src/plugins/priority/multifactor/priority_multifactor.c', 'job_ptr->qos_ptr->usage->norm_priority;', 4, 0),
 ('part_norm', 'src/slurmctld/read_config.c', 'part_ptr->norm_priority = (double)part_ptr->priority_job_factor /', 0, 1),
 ('pp_tier', 'src/plugins/preempt/partition_prio/preempt_partition_prio.c', '(preemptor->part_ptr->priority_tier >', 0, 1),
 ('maint_msg', 'src/slurmctld/node_scheduler.c', '"ReqNodeNotAvail, Reserved for maintenance");', 3, 0),
 ('sched_int', 'src/slurmctld/job_scheduler.c', 'sched_interval = 60;', 0, 0),
 ('def_minage', 'src/common/read_config.h', '#define DEFAULT_MIN_JOB_AGE', 0, 0),
 ('def_decay', 'src/common/read_config.h', '#define DEFAULT_PRIORITY_DECAY', 0, 1),
 ('def_array', 'src/common/read_config.h', '#define DEFAULT_MAX_ARRAY_SIZE', 0, 0),
 ('def_timeouts', 'src/common/read_config.h', '#define DEFAULT_SLURMCTLD_TIMEOUT', 0, 2),
 ('def_killwait', 'src/common/read_config.h', '#define DEFAULT_KILL_WAIT', 0, 0),
 ('def_sched', 'src/common/read_config.h', '#define DEFAULT_SCHEDTYPE', 0, 1),
]
out = {}
for qid, f, pat, before, after in Q:
    lines = open(f'{root}/{f}').read().split('\n')
    hits = [i for i, l in enumerate(lines) if pat in l]
    assert hits, (qid, pat)
    i = hits[0]
    a, b = max(0, i - before), i + after
    if before < 0: a, b = i + before, i + after   # anchor below the quoted block
    out[qid] = {'file': f, 'start': a + 1, 'lines': [l.replace('\t', '    ') for l in lines[a:b + 1]]}
json.dump({'tag': 'slurm-24-11-5-1', 'commit': 'e4788bed70462dc5e14b1b170d271d7495a0f334', 'quotes': out}, open(sys.argv[2], 'w'), indent=1)
for k, v in out.items(): print(k, v['file'].split('/')[-1], v['start'], '|', v['lines'][0].strip()[:70])
