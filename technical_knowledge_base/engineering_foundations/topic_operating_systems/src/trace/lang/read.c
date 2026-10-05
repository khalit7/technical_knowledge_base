/* The floor every language reaches: the libc wrappers for the system calls, called directly. */
#include <fcntl.h>
#include <stdio.h>
#include <unistd.h>
int main(void) {
    char buf[4096];
    int fd = open("/work/hello.txt", O_RDONLY);   /* openat(2) on Linux */
    ssize_t n = read(fd, buf, sizeof buf);        /* read(2) */
    close(fd);                                    /* close(2) */
    printf("%zd\n", n);
    return 0;
}
