set pagination off
set confirm off
set print frame-arguments none
set print address off
catch syscall madvise
condition 1 $x1 == 1073741824
commands 1
  bt 12
  kill
  quit
end
run
