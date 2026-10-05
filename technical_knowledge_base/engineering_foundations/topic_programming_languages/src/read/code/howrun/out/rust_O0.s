	.build_version macos, 11, 0
	.section	__TEXT,__text,regular,pure_instructions
	.p2align	2
__RNvMNtCsjIpoRzUjyHQ_4core3stre5bytesCs37fXm7cozba_6tokens:
	.cfi_startproc
	mov	x8, x0
	mov	x0, x8
	add	x1, x8, x1
	ret
	.cfi_endproc

	.p2align	2
__RNvMs4_NtCsjIpoRzUjyHQ_4core3numh21is_ascii_alphanumericCs37fXm7cozba_6tokens:
	.cfi_startproc
	sub	sp, sp, #32
	.cfi_def_cfa_offset 32
	str	x0, [sp, #16]
	ldrb	w9, [x0]
	mov	w8, #48
	subs	w8, w8, w9, uxtb
	b.ls	LBB1_2
	b	LBB1_1
LBB1_1:
	strb	wzr, [sp, #29]
	b	LBB1_3
LBB1_2:
	ldr	x8, [sp, #16]
	ldrb	w8, [x8]
	uxtb	w8, w8
	subs	w8, w8, #57
	cset	w8, ls
	mov	w9, #0
	and	w9, w9, #0x1
	subs	w8, w8, w9
	cset	w8, ne
	strb	w8, [sp, #29]
	b	LBB1_3
LBB1_3:
	ldr	x8, [sp, #16]
	ldrb	w9, [x8]
	mov	w8, #65
	subs	w8, w8, w9, uxtb
	b.ls	LBB1_5
	b	LBB1_4
LBB1_4:
	strb	wzr, [sp, #30]
	b	LBB1_6
LBB1_5:
	ldr	x8, [sp, #16]
	ldrb	w8, [x8]
	uxtb	w8, w8
	subs	w8, w8, #90
	cset	w8, ls
	mov	w9, #0
	and	w9, w9, #0x1
	subs	w8, w8, w9
	cset	w8, ne
	strb	w8, [sp, #30]
	b	LBB1_6
LBB1_6:
	ldr	x8, [sp, #16]
	ldrb	w9, [sp, #29]
	ldrb	w10, [sp, #30]
	orr	w9, w9, w10
	str	w9, [sp, #12]
	ldrb	w9, [x8]
	mov	w8, #97
	subs	w8, w8, w9, uxtb
	b.ls	LBB1_8
	b	LBB1_7
LBB1_7:
	strb	wzr, [sp, #31]
	b	LBB1_9
LBB1_8:
	ldr	x8, [sp, #16]
	ldrb	w8, [x8]
	uxtb	w8, w8
	subs	w8, w8, #122
	cset	w8, ls
	mov	w9, #0
	and	w9, w9, #0x1
	subs	w8, w8, w9
	cset	w8, ne
	strb	w8, [sp, #31]
	b	LBB1_9
LBB1_9:
	ldr	w8, [sp, #12]
	ldrb	w9, [sp, #31]
	orr	w8, w8, w9
	and	w0, w8, #0x1
	add	sp, sp, #32
	.cfi_def_cfa_offset 0
	ret
	.cfi_endproc

	.globl	__RNvXNtNtNtCsjIpoRzUjyHQ_4core4iter6traits7collectNtNtNtB8_3str4iter5BytesNtB2_12IntoIterator9into_iterCs37fXm7cozba_6tokens
	.p2align	2
__RNvXNtNtNtCsjIpoRzUjyHQ_4core4iter6traits7collectNtNtNtB8_3str4iter5BytesNtB2_12IntoIterator9into_iterCs37fXm7cozba_6tokens:
	.cfi_startproc
	ret
	.cfi_endproc

	.globl	__RNvXs2J_NtNtCsjIpoRzUjyHQ_4core5slice4iterINtB6_4IterhENtNtNtNtBa_4iter6traits8iterator8Iterator4nextCs37fXm7cozba_6tokens
	.p2align	2
__RNvXs2J_NtNtCsjIpoRzUjyHQ_4core5slice4iterINtB6_4IterhENtNtNtNtBa_4iter6traits8iterator8Iterator4nextCs37fXm7cozba_6tokens:
	.cfi_startproc
	sub	sp, sp, #32
	.cfi_def_cfa_offset 32
	.cfi_remember_state
	str	x0, [sp]
	ldr	x8, [x0]
	str	x8, [sp, #8]
	ldr	x8, [x0, #8]
	str	x8, [sp, #16]
	b	LBB3_1
LBB3_1:
	ldr	x8, [sp, #8]
	ldr	x9, [sp, #16]
	subs	x8, x8, x9
	b.eq	LBB3_3
	b	LBB3_2
LBB3_2:
	ldr	x9, [sp]
	ldr	x8, [sp, #8]
	add	x8, x8, #1
	str	x8, [x9]
	b	LBB3_4
LBB3_3:
	str	xzr, [sp, #24]
	b	LBB3_6
LBB3_4:
	ldr	x8, [sp, #8]
	str	x8, [sp, #24]
	b	LBB3_5
LBB3_5:
	ldr	x0, [sp, #24]
	add	sp, sp, #32
	.cfi_def_cfa_offset 0
	ret
LBB3_6:
	.cfi_restore_state
	b	LBB3_5
	.cfi_endproc

	.p2align	2
__RNvXs7_NtNtCsjIpoRzUjyHQ_4core3str4iterNtB5_5BytesNtNtNtNtB9_4iter6traits8iterator8Iterator4nextCs37fXm7cozba_6tokens:
	.cfi_startproc
	sub	sp, sp, #32
	.cfi_def_cfa_offset 32
	stp	x29, x30, [sp, #16]
	add	x29, sp, #16
	.cfi_def_cfa w29, 16
	.cfi_offset w30, -8
	.cfi_offset w29, -16
	bl	__RNvXs2J_NtNtCsjIpoRzUjyHQ_4core5slice4iterINtB6_4IterhENtNtNtNtBa_4iter6traits8iterator8Iterator4nextCs37fXm7cozba_6tokens
	str	x0, [sp, #8]
	ldr	x8, [sp, #8]
	subs	x8, x8, #0
	cset	x8, ne
	tbnz	w8, #0, LBB4_1
	b	LBB4_2
LBB4_1:
	ldr	x8, [sp, #8]
	ldrb	w8, [x8]
	strb	w8, [sp, #7]
	mov	w8, #1
	strb	w8, [sp, #6]
	b	LBB4_3
LBB4_2:
	adrp	x9, l_anon.f6c72237a2db09f1c8657f533a29b921.0@PAGE
	adrp	x8, l_anon.f6c72237a2db09f1c8657f533a29b921.0@PAGE
	add	x8, x8, l_anon.f6c72237a2db09f1c8657f533a29b921.0@PAGEOFF
	ldrb	w9, [x9, l_anon.f6c72237a2db09f1c8657f533a29b921.0@PAGEOFF]
	ldrb	w8, [x8, #1]
	and	w9, w9, #0x1
	strb	w9, [sp, #6]
	strb	w8, [sp, #7]
	b	LBB4_3
LBB4_3:
	ldrb	w8, [sp, #6]
	ldrb	w1, [sp, #7]
	and	w0, w8, #0x1
	.cfi_def_cfa wsp, 32
	ldp	x29, x30, [sp, #16]
	add	sp, sp, #32
	.cfi_def_cfa_offset 0
	.cfi_restore w30
	.cfi_restore w29
	ret
	.cfi_endproc

	.globl	_count_tokens
	.p2align	2
_count_tokens:
	.cfi_startproc
	sub	sp, sp, #80
	.cfi_def_cfa_offset 80
	stp	x29, x30, [sp, #64]
	add	x29, sp, #64
	.cfi_def_cfa w29, 16
	.cfi_offset w30, -8
	.cfi_offset w29, -16
	.cfi_remember_state
	str	xzr, [sp, #24]
	sturb	wzr, [x29, #-25]
	bl	__RNvMNtCsjIpoRzUjyHQ_4core3stre5bytesCs37fXm7cozba_6tokens
	bl	__RNvXNtNtNtCsjIpoRzUjyHQ_4core4iter6traits7collectNtNtNtB8_3str4iter5BytesNtB2_12IntoIterator9into_iterCs37fXm7cozba_6tokens
	stur	x0, [x29, #-24]
	stur	x1, [x29, #-16]
	b	LBB5_1
LBB5_1:
	sub	x0, x29, #24
	bl	__RNvXs7_NtNtCsjIpoRzUjyHQ_4core3str4iterNtB5_5BytesNtNtNtNtB9_4iter6traits8iterator8Iterator4nextCs37fXm7cozba_6tokens
	and	w8, w0, #0x1
	sturb	w8, [x29, #-3]
	sturb	w1, [x29, #-2]
	ldurb	w8, [x29, #-3]
	tbnz	w8, #0, LBB5_2
	b	LBB5_3
LBB5_2:
	ldurb	w8, [x29, #-2]
	sub	x0, x29, #1
	sturb	w8, [x29, #-1]
	bl	__RNvMs4_NtCsjIpoRzUjyHQ_4core3numh21is_ascii_alphanumericCs37fXm7cozba_6tokens
	str	w0, [sp, #20]
	tbnz	w0, #0, LBB5_5
	b	LBB5_4
LBB5_3:
	ldr	x0, [sp, #24]
	.cfi_def_cfa wsp, 80
	ldp	x29, x30, [sp, #64]
	add	sp, sp, #80
	.cfi_def_cfa_offset 0
	.cfi_restore w30
	.cfi_restore w29
	ret
LBB5_4:
	.cfi_restore_state
	ldr	w8, [sp, #20]
	sturb	w8, [x29, #-25]
	b	LBB5_1
LBB5_5:
	ldurb	w8, [x29, #-25]
	tbnz	w8, #0, LBB5_4
	b	LBB5_6
LBB5_6:
	ldr	x9, [sp, #24]
	add	x8, x9, #1
	str	x8, [sp, #8]
	subs	x8, x8, x9
	b.lo	LBB5_8
	b	LBB5_7
LBB5_7:
	ldr	x8, [sp, #8]
	str	x8, [sp, #24]
	b	LBB5_4
LBB5_8:
	adrp	x0, l_anon.f6c72237a2db09f1c8657f533a29b921.2@PAGE
	add	x0, x0, l_anon.f6c72237a2db09f1c8657f533a29b921.2@PAGEOFF
	bl	__RNvNtNtCsjIpoRzUjyHQ_4core9panicking11panic_const24panic_const_add_overflow
	.cfi_endproc

	.section	__TEXT,__const
l_anon.f6c72237a2db09f1c8657f533a29b921.0:
	.space	1
	.space	1

	.section	__TEXT,__cstring,cstring_literals
l_anon.f6c72237a2db09f1c8657f533a29b921.1:
	.asciz	"tokens.rs"

	.section	__DATA,__const
	.p2align	3, 0x0
l_anon.f6c72237a2db09f1c8657f533a29b921.2:
	.quad	l_anon.f6c72237a2db09f1c8657f533a29b921.1
	.asciz	"\t\000\000\000\000\000\000\000\t\000\000\000\r\000\000"

.subsections_via_symbols
