// flags: -O2 -S
// cmd: sed -n '/^__Z3addii:/,/ret/p' prog
int add(int a, int b) {
    return a + b;
}
