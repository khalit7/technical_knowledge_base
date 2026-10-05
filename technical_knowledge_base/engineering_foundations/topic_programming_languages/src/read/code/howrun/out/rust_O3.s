	.build_version macos, 11, 0
	.section	__TEXT,__text,regular,pure_instructions
	.globl	_count_tokens
	.p2align	2
_count_tokens:
	.cfi_startproc
	cbz	x1, LBB0_3
	sub	sp, sp, #112
	.cfi_def_cfa_offset 112
	stp	d15, d14, [sp, #48]
	stp	d13, d12, [sp, #64]
	stp	d11, d10, [sp, #80]
	stp	d9, d8, [sp, #96]
	.cfi_offset b8, -8
	.cfi_offset b9, -16
	.cfi_offset b10, -24
	.cfi_offset b11, -32
	.cfi_offset b12, -40
	.cfi_offset b13, -48
	.cfi_offset b14, -56
	.cfi_offset b15, -64
	.cfi_remember_state
	cmp	x1, #32
	b.hs	LBB0_4
	mov	x8, #0
	mov	w11, #0
	mov	x9, x0
	b	LBB0_8
LBB0_3:
	.cfi_def_cfa wsp, 0
	.cfi_same_value b8
	.cfi_same_value b9
	.cfi_same_value b10
	.cfi_same_value b11
	.cfi_same_value b12
	.cfi_same_value b13
	.cfi_same_value b14
	.cfi_same_value b15
	mov	x0, #0
	ret
LBB0_4:
	.cfi_restore_state
	and	x10, x1, #0xffffffffffffffe0
	add	x9, x0, x10
	add	x8, x0, #16
	movi.2d	v0, #0000000000000000
	mov	w11, #1
	dup.2d	v16, x11
	and	x11, x1, #0xffffffffffffffe0
	movi.2d	v8, #0000000000000000
	movi.2d	v19, #0000000000000000
	movi.2d	v5, #0000000000000000
	movi.2d	v23, #0000000000000000
	movi.2d	v10, #0000000000000000
	movi.2d	v21, #0000000000000000
	movi.2d	v20, #0000000000000000
	movi.2d	v25, #0000000000000000
	movi.2d	v22, #0000000000000000
	movi.2d	v27, #0000000000000000
	movi.2d	v26, #0000000000000000
	movi.2d	v30, #0000000000000000
	movi.2d	v24, #0000000000000000
	movi.2d	v29, #0000000000000000
	movi.2d	v28, #0000000000000000
	movi.2d	v31, #0000000000000000
LBB0_5:
	stp	q5, q10, [sp]
	str	q8, [sp, #32]
	ldp	q1, q2, [x8, #-16]
	movi.16b	v4, #208
	add.16b	v3, v1, v4
	add.16b	v4, v2, v4
	movi.16b	v6, #10
	cmhi.16b	v3, v6, v3
	movi.16b	v7, #64
	cmhi.16b	v5, v1, v7
	cmhi.16b	v4, v6, v4
	cmhi.16b	v18, v2, v7
	movi.16b	v6, #91
	cmhi.16b	v8, v6, v1
	cmhi.16b	v9, v6, v2
	bit.16b	v3, v8, v5
	movi.16b	v6, #96
	cmhi.16b	v5, v1, v6
	bit.16b	v4, v9, v18
	cmhi.16b	v18, v2, v6
	movi.16b	v6, #123
	cmhi.16b	v1, v6, v1
	cmhi.16b	v2, v6, v2
	bif.16b	v1, v3, v5
	ext.16b	v3, v0, v1, #15
	mov.16b	v0, v18
	bsl.16b	v0, v2, v4
	ext.16b	v2, v1, v0, #15
	bic.16b	v1, v1, v3
	bic.16b	v10, v0, v2
	mov	b8, v1[0]
	mov.b	v8[4], v1[1]
	mov	b9, v1[2]
	mov.b	v9[4], v1[3]
	mov	b11, v1[4]
	mov.b	v11[4], v1[5]
	mov	b12, v1[6]
	mov.b	v12[4], v1[7]
	mov	b13, v1[8]
	mov.b	v13[4], v1[9]
	mov	b15, v1[10]
	mov.b	v15[4], v1[11]
	mov	b2, v1[12]
	mov.b	v2[4], v1[13]
	mov	b5, v1[14]
	mov.b	v5[4], v1[15]
	mov	b14, v10[0]
	mov.b	v14[4], v10[1]
	mov	b1, v10[2]
	mov.b	v1[4], v10[3]
	mov	b3, v10[4]
	mov.b	v3[4], v10[5]
	mov	b4, v10[6]
	mov.b	v4[4], v10[7]
	mov	b18, v10[8]
	mov.b	v18[4], v10[9]
	mov	b6, v10[10]
	mov.b	v6[4], v10[11]
	mov	b7, v10[12]
	mov.b	v7[4], v10[13]
	mov	b17, v10[14]
	mov.b	v17[4], v10[15]
	ushll.2d	v5, v5, #0
	and.16b	v5, v5, v16
	add.2d	v25, v25, v5
	ldp	q5, q10, [sp]
	ushll.2d	v2, v2, #0
	and.16b	v2, v2, v16
	add.2d	v20, v20, v2
	ushll.2d	v2, v15, #0
	and.16b	v2, v2, v16
	add.2d	v21, v21, v2
	ushll.2d	v2, v13, #0
	and.16b	v2, v2, v16
	add.2d	v10, v10, v2
	ushll.2d	v2, v12, #0
	and.16b	v2, v2, v16
	add.2d	v23, v23, v2
	ushll.2d	v2, v11, #0
	and.16b	v2, v2, v16
	add.2d	v5, v5, v2
	ushll.2d	v2, v9, #0
	and.16b	v2, v2, v16
	add.2d	v19, v19, v2
	ushll.2d	v2, v8, #0
	ldr	q8, [sp, #32]
	and.16b	v2, v2, v16
	add.2d	v8, v8, v2
	ushll.2d	v2, v17, #0
	and.16b	v2, v2, v16
	add.2d	v31, v31, v2
	ushll.2d	v2, v7, #0
	and.16b	v2, v2, v16
	add.2d	v28, v28, v2
	ushll.2d	v2, v6, #0
	and.16b	v2, v2, v16
	add.2d	v29, v29, v2
	ushll.2d	v2, v18, #0
	and.16b	v2, v2, v16
	add.2d	v24, v24, v2
	ushll.2d	v2, v4, #0
	and.16b	v2, v2, v16
	add.2d	v30, v30, v2
	ushll.2d	v2, v3, #0
	and.16b	v2, v2, v16
	add.2d	v26, v26, v2
	ushll.2d	v1, v1, #0
	and.16b	v1, v1, v16
	add.2d	v27, v27, v1
	ushll.2d	v1, v14, #0
	and.16b	v1, v1, v16
	add.2d	v22, v22, v1
	add	x8, x8, #32
	subs	x11, x11, #32
	b.ne	LBB0_5
	add.2d	v1, v30, v23
	add.2d	v2, v31, v25
	add.2d	v3, v27, v19
	add.2d	v4, v29, v21
	add.2d	v5, v26, v5
	add.2d	v6, v28, v20
	add.2d	v7, v22, v8
	add.2d	v16, v24, v10
	add.2d	v7, v7, v16
	add.2d	v5, v5, v6
	add.2d	v5, v7, v5
	add.2d	v3, v3, v4
	add.2d	v1, v1, v2
	add.2d	v1, v3, v1
	add.2d	v1, v5, v1
	addp.2d	d1, v1
	fmov	x8, d1
	cmp	x1, x10
	b.eq	LBB0_10
	umov.b	w11, v0[15]
LBB0_8:
	add	x10, x0, x1
LBB0_9:
	ldrb	w12, [x9], #1
	cmp	w12, #123
	cset	w13, lo
	cmp	w12, #91
	cset	w14, lo
	sub	w15, w12, #48
	cmp	w15, #10
	cset	w15, lo
	cmp	w12, #64
	csel	w14, w14, w15, hi
	eor	w15, w11, #0x1
	cmp	w12, #96
	csel	w11, w13, w14, hi
	and	w12, w11, w15
	add	x8, x8, x12
	cmp	x9, x10
	b.ne	LBB0_9
LBB0_10:
	ldp	d9, d8, [sp, #96]
	ldp	d11, d10, [sp, #80]
	ldp	d13, d12, [sp, #64]
	ldp	d15, d14, [sp, #48]
	add	sp, sp, #112
	.cfi_def_cfa_offset 0
	.cfi_restore b8
	.cfi_restore b9
	.cfi_restore b10
	.cfi_restore b11
	.cfi_restore b12
	.cfi_restore b13
	.cfi_restore b14
	.cfi_restore b15
	mov	x0, x8
	ret
	.cfi_endproc

.subsections_via_symbols
