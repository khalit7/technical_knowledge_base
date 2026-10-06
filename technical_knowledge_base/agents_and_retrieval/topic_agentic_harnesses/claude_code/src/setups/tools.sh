mkdir -p notes
python3 - <<'P'
with open("notes/long.txt","w") as f:
    for i in range(1,3001): f.write("line %d of a long but small file\n" % i)
with open("big.log","w") as f:
    i=0
    while f.tell() < 330000:
        i+=1; f.write("2026-10-06T10:%02d:%02d heartbeat ok worker=%d queue=%d\n" % ((i//60)%60, i%60, i%7, i%13))
open("dup.txt","w").write("x = 1\nprint(x)\nx = 1\n")
P
