# inside fl-exact: name nproc norebuild split
run(){ n=$1; np=$2; nr=$3; split=$4; L=/work/$n; mkdir -p $L
  if [ "$split" = 1 ]; then
    FL_NOREBUILD=$nr torchrun --standalone --nproc-per-node=$np /opt/fl_wrap.py --steps 100 --ckpt-every 50 --ckpt-dir $L/ckpt --log-dir $L/logs > $L/a.out 2>&1
  fi
  FL_NOREBUILD=$nr torchrun --standalone --nproc-per-node=$np /opt/fl_wrap.py --steps 200 --ckpt-every 50 --ckpt-dir $L/ckpt --log-dir $L/logs > $L/b.out 2>&1
}
run w4_ref 4 0 0; run w4_split 4 0 1; run w4nr_ref 4 1 0; run w4nr_split 4 1 1; run w2_ref 2 0 0; run w2_split 2 0 1
