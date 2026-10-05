# Timings: release builds (rustc -C opt-level=3), best of 9 runs in process (Python: best of 3). The laptop is in normal use.
rec t_load lang 'sysctl -n vm.loadavg; sysctl -n machdep.cpu.brand_string'
rec t_iterbench lang 'rustc --edition 2024 -C opt-level=3 iterbench.rs && ./iterbench'
rec t_iterbench_py lang 'python3.14 iterbench.py'
rec t_load_after lang 'sysctl -n vm.loadavg'
