#!/bin/sh
# Which clone flags each way of starting a child uses (strace inside kb-os-lab:1).
HERE=$(cd "$(dirname "$0")" && pwd)
docker run --rm --name os-proc-cl-$$ --cpus 1 --memory 1g kb-os-lab:1 sh -c '
echo "== subprocess.run([\"/bin/true\"]) (Python 3.11)"; strace -f -e trace=clone,clone3,vfork,execve python3 -c "import subprocess; subprocess.run([\"/bin/true\"])" 2>&1 | grep -E "clone|vfork|execve\(\"/bin/true" | sed "s/strace: Process.*//"
echo "== os.fork()"; strace -f -e trace=clone,clone3 python3 -c "import os; p=os.fork(); os._exit(0) if p==0 else os.waitpid(p,0)" 2>&1 | grep -E "clone" | sed "s/strace: Process.*//"
echo "== threading.Thread().start()"; strace -f -e trace=clone,clone3 python3 -c "import threading; t=threading.Thread(target=lambda:None); t.start(); t.join()" 2>&1 | grep -E "clone" | sed "s/strace: Process.*//"
' > "$HERE/out/clone_flags.txt" 2>&1
