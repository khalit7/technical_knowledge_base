# macOS host: which hypervisor runs Docker Desktop's Linux VM (redacted: the disk path, the serial fifo, the vpnkit token).
echo "### Docker Desktop $(defaults read /Applications/Docker.app/Contents/Info.plist CFBundleShortVersionString), macOS $(sw_vers -productVersion), $(sysctl -n machdep.cpu.brand_string), $(sysctl -n hw.ncpu) cores, kern.hv_support=$(sysctl -n kern.hv_support)"
pid=$(pgrep -f qemu-system-aarch64 | head -1)
echo "### the VM process (arguments, one per line)"
ps -o args= -p "$pid" | tr ' ' '\n' | grep -v '^$' | sed -E 's#vpnkit\.connect=.*#vpnkit.connect=<removed>#; s#file=[^,]*#file=<disk image>#; s#pipe:[^ ]*#pipe:<fifo>#; s#mac=[^ ,]*#mac=<mac>#; s#/'Users'/[^ ]*#<home>#g' | sed 's#^/Applications/Docker.app/Contents/#<Docker.app>/#' | paste -sd' ' - | fold -s -w 120
echo "### version"; /Applications/Docker.app/Contents/MacOS/qemu-system-aarch64 --version | head -1
echo "### host threads of the VM process (one per vCPU plus I/O threads)"; ps -M -p "$pid" | tail -n +2 | wc -l
