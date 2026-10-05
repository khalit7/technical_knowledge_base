. /exp/lib.sh
sec "the checkpoint volume"
run "df -h /ckpt | tail -n 1"
sec "saving in place (torch.save straight to ckpt.pt)"
run "python /exp/ckpt_full.py naive"
rm -f /ckpt/*
sec "write to ckpt.pt.tmp, fsync, rename"
run "python /exp/ckpt_full.py rename"
rm -f /ckpt/*
sec "what the error message does not say: strace shows the failing write"
run "strace -f -Z -e trace=write python /exp/ckpt_full.py naive 2>&1 | grep -m 2 ENOSPC | sed -E 's/\"([^\"\\\\]|\\\\.)*\"(\\.\\.\\.)?/\"...\"/'"
