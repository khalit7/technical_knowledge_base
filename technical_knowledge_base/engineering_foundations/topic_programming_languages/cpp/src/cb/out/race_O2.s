_main:                                  ; @main
	sub	sp, sp, #64
	stp	x20, x19, [sp, #32]             ; 16-byte Folded Spill
	stp	x29, x30, [sp, #48]             ; 16-byte Folded Spill
	add	x29, sp, #48
	mov	w0, #8                          ; =0x8
	bl	__Znwm
	mov	x19, x0
	bl	__ZNSt3__115__thread_structC1Ev
	str	x19, [sp, #24]
	mov	w0, #8                          ; =0x8
	bl	__Znwm
	mov	x3, x0
	stp	x0, xzr, [sp, #16]
	str	x19, [x0]
	adrp	x2, __ZNSt3__114__thread_proxyB8ne200100INS_5tupleIJNS_10unique_ptrINS_15__thread_structENS_14default_deleteIS3_EEEEZ4mainE3$_0EEEEEPvS9_@PAGE
	add	x2, x2, __ZNSt3__114__thread_proxyB8ne200100INS_5tupleIJNS_10unique_ptrINS_15__thread_structENS_14default_deleteIS3_EEEEZ4mainE3$_0EEEEEPvS9_@PAGEOFF
	add	x0, sp, #8
	mov	x1, #0                          ; =0x0
	bl	_pthread_create
	cbnz	w0, LBB0_12
	mov	w0, #8                          ; =0x8
	bl	__Znwm
	mov	x19, x0
	bl	__ZNSt3__115__thread_structC1Ev
	str	x19, [sp, #24]
	mov	w0, #8                          ; =0x8
	bl	__Znwm
	mov	x3, x0
	stp	x0, xzr, [sp, #16]
	str	x19, [x0]
	adrp	x2, __ZNSt3__114__thread_proxyB8ne200100INS_5tupleIJNS_10unique_ptrINS_15__thread_structENS_14default_deleteIS3_EEEEZ4mainE3$_1EEEEEPvS9_@PAGE
	add	x2, x2, __ZNSt3__114__thread_proxyB8ne200100INS_5tupleIJNS_10unique_ptrINS_15__thread_structENS_14default_deleteIS3_EEEEZ4mainE3$_1EEEEEPvS9_@PAGEOFF
	mov	x0, sp
	mov	x1, #0                          ; =0x0
	bl	_pthread_create
	cbnz	w0, LBB0_13
	add	x0, sp, #8
	bl	__ZNSt3__16thread4joinEv
	mov	x0, sp
	bl	__ZNSt3__16thread4joinEv
	mov	x0, sp
	bl	__ZNSt3__16threadD1Ev
	add	x0, sp, #8
	bl	__ZNSt3__16threadD1Ev
	mov	w0, #0                          ; =0x0
	ldp	x29, x30, [sp, #48]             ; 16-byte Folded Reload
	ldp	x20, x19, [sp, #32]             ; 16-byte Folded Reload
	add	sp, sp, #64
	ret
LBB0_12:
	adrp	x1, l_.str@PAGE
	add	x1, x1, l_.str@PAGEOFF
	bl	__ZNSt3__120__throw_system_errorEiPKc
	b	LBB0_14
LBB0_13:
	adrp	x1, l_.str@PAGE
	add	x1, x1, l_.str@PAGEOFF
	bl	__ZNSt3__120__throw_system_errorEiPKc
LBB0_14:
	brk	#0x1
LBB0_15:
	mov	x19, x0
	b	LBB0_22
LBB0_16:
	mov	x8, x19
	mov	x19, x0
	mov	x0, x8
	bl	__ZdlPv
	b	LBB0_23
LBB0_17:
	mov	x19, x0
	b	LBB0_23
LBB0_18:
	mov	x19, x0
	b	LBB0_25
LBB0_19:
	mov	x8, x19
	mov	x19, x0
	mov	x0, x8
	bl	__ZdlPv
	mov	x0, x19
	bl	__Unwind_Resume
LBB0_20:
	mov	x19, x0
	mov	x0, sp
	bl	__ZNSt3__16threadD1Ev
	b	LBB0_23
LBB0_21:
	mov	x19, x0
	add	x0, sp, #16
	bl	__ZNSt3__110unique_ptrINS_5tupleIJNS0_INS_15__thread_structENS_14default_deleteIS2_EEEEZ4mainE3$_1EEENS3_IS7_EEED1B8ne200100Ev
LBB0_22:
	add	x0, sp, #24
	bl	__ZNSt3__110unique_ptrINS_15__thread_structENS_14default_deleteIS1_EEED1B8ne200100Ev
LBB0_23:
	add	x0, sp, #8
	bl	__ZNSt3__16threadD1Ev
	mov	x0, x19
	bl	__Unwind_Resume
LBB0_24:
	mov	x19, x0
	add	x0, sp, #16
	bl	__ZNSt3__110unique_ptrINS_5tupleIJNS0_INS_15__thread_structENS_14default_deleteIS2_EEEEZ4mainE3$_0EEENS3_IS7_EEED1B8ne200100Ev
LBB0_25:
	add	x0, sp, #24
	bl	__ZNSt3__110unique_ptrINS_15__thread_structENS_14default_deleteIS1_EEED1B8ne200100Ev
	mov	x0, x19
	bl	__Unwind_Resume
GCC_except_table0:
Lexception0:
Lcst_begin0:
Lcst_end0:
__ZNSt3__114__thread_proxyB8ne200100INS_5tupleIJNS_10unique_ptrINS_15__thread_structENS_14default_deleteIS3_EEEEZ4mainE3$_0EEEEEPvS9_: ; @"_ZNSt3__114__thread_proxyB8ne200100INS_5tupleIJNS_10unique_ptrINS_15__thread_structENS_14default_deleteIS3_EEEEZ4mainE3$_0EEEEEPvS9_"
	sub	sp, sp, #48
	stp	x20, x19, [sp, #16]             ; 16-byte Folded Spill
	stp	x29, x30, [sp, #32]             ; 16-byte Folded Spill
	add	x29, sp, #32
	mov	x19, x0
	str	x0, [sp, #8]
	bl	__ZNSt3__119__thread_local_dataEv
	ldr	x1, [x19]
	str	xzr, [x19]
	ldr	x0, [x0]
	bl	_pthread_setspecific
	mov	w8, #42                         ; =0x2a
	adrp	x9, _data@PAGE
	str	w8, [x9, _data@PAGEOFF]
	mov	w8, #1                          ; =0x1
	adrp	x9, _ready@PAGE
	strb	w8, [x9, _ready@PAGEOFF]
	ldr	x0, [x19]
	str	xzr, [x19]
	cbz	x0, LBB1_4
	bl	__ZNSt3__115__thread_structD1Ev
	bl	__ZdlPv
LBB1_4:
	mov	x0, x19
	bl	__ZdlPv
	mov	x0, #0                          ; =0x0
	ldp	x29, x30, [sp, #32]             ; 16-byte Folded Reload
	ldp	x20, x19, [sp, #16]             ; 16-byte Folded Reload
	add	sp, sp, #48
	ret
LBB1_5:
	mov	x19, x0
	add	x0, sp, #8
	bl	__ZNSt3__110unique_ptrINS_5tupleIJNS0_INS_15__thread_structENS_14default_deleteIS2_EEEEZ4mainE3$_0EEENS3_IS7_EEED1B8ne200100Ev
	mov	x0, x19
	bl	__Unwind_Resume
GCC_except_table1:
Lexception1:
Lcst_begin1:
Lcst_end1:
__ZNSt3__110unique_ptrINS_5tupleIJNS0_INS_15__thread_structENS_14default_deleteIS2_EEEEZ4mainE3$_0EEENS3_IS7_EEED1B8ne200100Ev: ; @"_ZNSt3__110unique_ptrINS_5tupleIJNS0_INS_15__thread_structENS_14default_deleteIS2_EEEEZ4mainE3$_0EEENS3_IS7_EEED1B8ne200100Ev"
	stp	x20, x19, [sp, #-32]!           ; 16-byte Folded Spill
	stp	x29, x30, [sp, #16]             ; 16-byte Folded Spill
	add	x29, sp, #16
	ldr	x19, [x0]
	str	xzr, [x0]
	cbz	x19, LBB2_4
	mov	x20, x0
	ldr	x0, [x19]
	str	xzr, [x19]
	cbz	x0, LBB2_3
	bl	__ZNSt3__115__thread_structD1Ev
	bl	__ZdlPv
LBB2_3:
	mov	x0, x19
	bl	__ZdlPv
	mov	x0, x20
LBB2_4:
	ldp	x29, x30, [sp, #16]             ; 16-byte Folded Reload
	ldp	x20, x19, [sp], #32             ; 16-byte Folded Reload
	ret
__ZNSt3__110unique_ptrINS_15__thread_structENS_14default_deleteIS1_EEED1B8ne200100Ev: ; @_ZNSt3__110unique_ptrINS_15__thread_structENS_14default_deleteIS1_EEED1B8ne200100Ev
	mov	x8, x0
	ldr	x0, [x0]
	str	xzr, [x8]
	cbz	x0, LBB3_2
	stp	x20, x19, [sp, #-32]!           ; 16-byte Folded Spill
	stp	x29, x30, [sp, #16]             ; 16-byte Folded Spill
	add	x29, sp, #16
	mov	x19, x8
	bl	__ZNSt3__115__thread_structD1Ev
	bl	__ZdlPv
	mov	x8, x19
	ldp	x29, x30, [sp, #16]             ; 16-byte Folded Reload
	ldp	x20, x19, [sp], #32             ; 16-byte Folded Reload
LBB3_2:
	mov	x0, x8
	ret
__ZNSt3__114__thread_proxyB8ne200100INS_5tupleIJNS_10unique_ptrINS_15__thread_structENS_14default_deleteIS3_EEEEZ4mainE3$_1EEEEEPvS9_: ; @"_ZNSt3__114__thread_proxyB8ne200100INS_5tupleIJNS_10unique_ptrINS_15__thread_structENS_14default_deleteIS3_EEEEZ4mainE3$_1EEEEEPvS9_"
	sub	sp, sp, #48
	stp	x20, x19, [sp, #16]             ; 16-byte Folded Spill
	stp	x29, x30, [sp, #32]             ; 16-byte Folded Spill
	add	x29, sp, #32
	mov	x19, x0
	str	x0, [sp, #8]
	bl	__ZNSt3__119__thread_local_dataEv
	ldr	x1, [x19]
	str	xzr, [x19]
	ldr	x0, [x0]
	bl	_pthread_setspecific
	adrp	x8, _data@PAGE
	ldr	w8, [x8, _data@PAGEOFF]
	str	x8, [sp]
	adrp	x0, l_.str.1@PAGE
	add	x0, x0, l_.str.1@PAGEOFF
	bl	_printf
	ldr	x0, [x19]
	str	xzr, [x19]
	cbz	x0, LBB4_4
	bl	__ZNSt3__115__thread_structD1Ev
	bl	__ZdlPv
LBB4_4:
	mov	x0, x19
	bl	__ZdlPv
	mov	x0, #0                          ; =0x0
	ldp	x29, x30, [sp, #32]             ; 16-byte Folded Reload
	ldp	x20, x19, [sp, #16]             ; 16-byte Folded Reload
	add	sp, sp, #48
	ret
LBB4_5:
	mov	x19, x0
	add	x0, sp, #8
	bl	__ZNSt3__110unique_ptrINS_5tupleIJNS0_INS_15__thread_structENS_14default_deleteIS2_EEEEZ4mainE3$_1EEENS3_IS7_EEED1B8ne200100Ev
	mov	x0, x19
	bl	__Unwind_Resume
GCC_except_table4:
Lexception2:
Lcst_begin2:
Lcst_end2:
__ZNSt3__110unique_ptrINS_5tupleIJNS0_INS_15__thread_structENS_14default_deleteIS2_EEEEZ4mainE3$_1EEENS3_IS7_EEED1B8ne200100Ev: ; @"_ZNSt3__110unique_ptrINS_5tupleIJNS0_INS_15__thread_structENS_14default_deleteIS2_EEEEZ4mainE3$_1EEENS3_IS7_EEED1B8ne200100Ev"
	stp	x20, x19, [sp, #-32]!           ; 16-byte Folded Spill
	stp	x29, x30, [sp, #16]             ; 16-byte Folded Spill
	add	x29, sp, #16
	ldr	x19, [x0]
	str	xzr, [x0]
	cbz	x19, LBB5_4
	mov	x20, x0
	ldr	x0, [x19]
	str	xzr, [x19]
	cbz	x0, LBB5_3
	bl	__ZNSt3__115__thread_structD1Ev
	bl	__ZdlPv
LBB5_3:
	mov	x0, x19
	bl	__ZdlPv
	mov	x0, x20
LBB5_4:
	ldp	x29, x30, [sp, #16]             ; 16-byte Folded Reload
	ldp	x20, x19, [sp], #32             ; 16-byte Folded Reload
	ret


