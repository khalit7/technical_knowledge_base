# Surviving mutants, read by hand (2026-10-15)

Run: scripts/pd_code.py 300 50 (300 seeded problems of open-r1/verifiable-coding-problems-python_decontaminated-tested
file 1; tests capped at 50 per problem; macOS sandbox-exec, 4 s per test). Gold passed its own (capped) tests in 295
of 300 (the 5 failures are timeouts or capped-test effects on a loaded machine, not investigated further). 870 mutants
on those 295 problems; 167 survived every test.

Sample: 20 survivors drawn with random.Random(9) from code_full.json; each diff read by the page agent (reasoning about
the code, not executed on new inputs, so these labels are judgements).

| Label | Count | Problems (row in file 1, mutation) |
|---|---|---|
| Changes the output on some valid input: the tests are too weak | 10 | 3005 arith (prints a-b as a+b, 2 tests), 4779 arith, 1066 const, 9 const, 1477 arith, 186 cmp (== to !=), 1432 minmax, 108 const, 515 arith (modulus 10^6+3 to 10^6-3), 565 cmp |
| Boundary change whose case may never occur in valid inputs (ties, edge equality), or code that may be unreachable | 7 | 3486, 4125, 2131, 2746 (cmp), 4662, 475 (const), 2127 (inside a branch that special-cases specific inputs: the gold solution itself hard-codes answers) |
| Equivalent mutant (same behaviour on every input) | 3 | 316 (min to max inside a slice bound), 2724 ((j-i)%2 to (j+i)%2, same parity), 4813 (array size 100 to 101) |

Reading: about half of the survivors (10 of 20) are behaviour changes the tests miss, so roughly 1 in 10 mutants
(167/870 x 10/20) passes tests it should fail. Problems with a single test in the dataset had a survivor in 41 of 70;
problems with more than 20 tests in 43 of 154.
