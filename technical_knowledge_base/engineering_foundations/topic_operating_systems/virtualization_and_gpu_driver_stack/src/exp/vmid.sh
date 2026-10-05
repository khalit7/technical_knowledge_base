# What the guest can see of its virtual machine (run in kb-os-lab:1, unprivileged).
sec(){ echo; echo "### $*"; }
sec "kernel and command line (vpnkit address and token removed)"; uname -srm; sed -E "s/vpnkit.connect=[^ ]*/vpnkit.connect=<removed>/" /proc/cmdline
sec "CPU (first CPU of /proc/cpuinfo) and CPU count"; awk 'NR<=9' /proc/cpuinfo; nproc; grep -c ^processor /proc/cpuinfo
sec "hypervisor hints"; ls /sys/hypervisor 2>&1 | head -3; ls -l /dev/kvm 2>&1; grep -i -E "hypervisor|kvm" /proc/cpuinfo | head -3; echo "(none above means no x86-style hypervisor flag; arm64 has no such flag)"
sec "device tree model and compatible"; tr -d '\0' < /sys/firmware/devicetree/base/model 2>/dev/null; echo; tr '\0' ' ' < /sys/firmware/devicetree/base/compatible 2>/dev/null; echo; ls /sys/firmware/devicetree/base 2>/dev/null | tr '\n' ' '; echo
sec "PCI devices (vendor:device class driver)"; for d in /sys/bus/pci/devices/*; do printf "%s %s:%s class %s driver %s\n" "$(basename $d)" "$(cat $d/vendor)" "$(cat $d/device)" "$(cat $d/class)" "$(basename $(readlink $d/driver) 2>/dev/null)"; done
sec "virtio devices (device id, driver, features bits)"; for d in /sys/bus/virtio/devices/*; do printf "%s device %s vendor %s driver %s features %s\n" "$(basename $d)" "$(cat $d/device)" "$(cat $d/vendor)" "$(basename $(readlink $d/driver) 2>/dev/null)" "$(cat $d/features)"; done
sec "block devices"; ls /sys/block; cat /sys/block/vda/queue/scheduler 2>/dev/null; cat /sys/block/vda/mq/*/nr_tags 2>/dev/null | head -2; ls /sys/block/vda/mq 2>/dev/null | tr '\n' ' '; echo
sec "clock sources"; cat /sys/devices/system/clocksource/clocksource0/available_clocksource /sys/devices/system/clocksource/clocksource0/current_clocksource
sec "cpuidle"; ls /sys/devices/system/cpu/cpuidle 2>&1; cat /sys/devices/system/cpu/cpuidle/current_driver 2>&1; ls /sys/devices/system/cpu/cpu0/cpuidle 2>&1
sec "/proc/interrupts"; cat /proc/interrupts
sec "steal time (/proc/stat cpu lines: user nice system idle iowait irq softirq steal)"; grep ^cpu /proc/stat
sec "kernel config (virtualization-related)"; if [ -r /proc/config.gz ]; then zcat /proc/config.gz | grep -E "^CONFIG_(KVM|VIRTIO|PARAVIRT|HYPERVISOR_GUEST|ARM_GIC|VFIO|IOMMU_SUPPORT|ARM_SMMU|HAVE_KVM|VHOST|ARM64_VHE|ARM_PSCI|HZ=|NO_HZ|MEMBARRIER|CPU_IDLE|ARM_ARCH_TIMER)" ; else echo "no /proc/config.gz"; fi
sec "iommu"; ls /sys/class/iommu 2>&1; ls /sys/kernel/iommu_groups 2>&1 | head
sec "memory"; head -3 /proc/meminfo
