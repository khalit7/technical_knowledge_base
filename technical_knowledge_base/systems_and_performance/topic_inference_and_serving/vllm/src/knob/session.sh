#!/bin/sh
# KV cache 3 GiB for the sweeps: 4 GiB did not fit next to the float32 model in the 9.7 GiB Docker VM.
# One bench-lock session for the page's runs: the stepper traces, then the knob sweeps (one.sh).
# Needs INF_DIR and VL_WORK. Usage: session.sh [traces] [knobs]
H=$(cd "$(dirname "$0")" && pwd); I=${INF_DIR:?}; export VL_WORK INF_DIR
$I/lock.sh acquire bench vl 7200 || exit 1
t(){ $I/lock.sh touch bench vl >/dev/null; }
case " $* " in *" traces "*)
  $H/../stepper/run_trace.sh "pc_off 20 0 64" "pc_on 20 1 64" "nochunk 20 1 2048" "tight9 9 1 64 4 48" "tight10 10 1 64 4 48" "tight11 11 1 64 4 48"; t;;
esac
case " $* " in *" knobs "*)
  SEQ="--mode closed --conc 16 --n 32 --prompt-words 400 --max-tokens 64 --seed 1 --extra {\"ignore_eos\":true}"
  [ -f $VL_WORK/knob/k0_default.meta.json ] || $H/one.sh k0_default "" 2 "--mode closed --conc 4 --n 12 --prompt-words 400 --max-tokens 64 --seed 1 --extra {\"ignore_eos\":true}"; t
  for r in 1 2; do
    for s in 2 4 16; do $H/one.sh seqs${s}_r$r "--max-num-seqs $s" 3 "$SEQ"; t; done
    [ -f $VL_WORK/knob/kv1_r$r.meta.json ] || { $H/one.sh kv1_r$r "--max-num-seqs 16" 1 "$SEQ"; t; }
    for c in 128 2048; do
      $H/one.sh chunk${c}_r$r "--max-num-batched-tokens $c --max-num-seqs 16" 3 \
        "--mode closed --conc 3 --n 9 --prompt-words 60 --max-tokens 128 --seed 2 --extra {\"ignore_eos\":true}" \
        "--mode poisson --rate 0.08 --n 4 --prompt-words 1500 --max-tokens 8 --seed 3 --warmup 0 --extra {\"ignore_eos\":true}"; t
    done
  done
  $H/one.sh evict_patched "--max-num-seqs 16" 1 "--mode closed --conc 8 --n 32 --prefix-words 900 --prompt-words 150 --max-tokens 32 --seed 4 --extra {\"ignore_eos\":true}" "" 1; t
;; esac
$I/lock.sh release bench vl
echo SESSION DONE
