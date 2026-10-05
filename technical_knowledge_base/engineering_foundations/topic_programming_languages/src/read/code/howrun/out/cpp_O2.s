	.section	__TEXT,__text,regular,pure_instructions
	.build_version macos, 26, 0	sdk_version 26, 0
	.globl	__Z12count_tokensNSt3__117basic_string_viewIcNS_11char_traitsIcEEEE ; -- Begin function _Z12count_tokensNSt3__117basic_string_viewIcNS_11char_traitsIcEEEE
	.p2align	2
__Z12count_tokensNSt3__117basic_string_viewIcNS_11char_traitsIcEEEE: ; @_Z12count_tokensNSt3__117basic_string_viewIcNS_11char_traitsIcEEEE
	.cfi_startproc
; %bb.0:
	cbz	x1, LBB0_3
; %bb.1:
	cmp	x1, #7
	b.hi	LBB0_4
; %bb.2:
	mov	x8, #0                          ; =0x0
	mov	x10, #0                         ; =0x0
	mov	x9, x0
	b	LBB0_8
LBB0_3:
	mov	x8, #0                          ; =0x0
	mov	x0, x8
	ret
LBB0_4:
	and	x10, x1, #0xfffffffffffffff8
	add	x9, x0, x10
	add	x8, x0, #4
	movi.2d	v0, #0000000000000000
	movi.2s	v1, #223
	movi.2s	v2, #191
	movi	d3, #0x0000ff000000ff
	movi.2s	v4, #26
	movi.2s	v5, #208
	mov	w11, #1                         ; =0x1
	dup.2d	v6, x11
	movi.2s	v7, #10
	mov	x11, x10
	movi.2d	v16, #0000000000000000
	movi.2d	v17, #0000000000000000
	movi.2d	v18, #0000000000000000
	movi.2d	v19, #0000000000000000
LBB0_5:                                 ; =>This Inner Loop Header: Depth=1
	ldurb	w12, [x8, #-4]
	fmov	s20, w12
	ldurb	w12, [x8, #-3]
	mov.s	v20[1], w12
	ldurb	w12, [x8, #-2]
	fmov	s21, w12
	ldurb	w12, [x8, #-1]
	mov.s	v21[1], w12
	ldrb	w12, [x8]
	fmov	s22, w12
	ldrb	w12, [x8, #1]
	ldrb	w13, [x8, #2]
	mov.s	v22[1], w12
	fmov	s23, w13
	ldrb	w12, [x8, #3]
	mov.s	v23[1], w12
	and.8b	v24, v20, v1
	and.8b	v25, v21, v1
	and.8b	v26, v22, v1
	and.8b	v27, v23, v1
	add.2s	v24, v24, v2
	bic.2s	v24, #1, lsl #8
	add.2s	v25, v25, v2
	bic.2s	v25, #1, lsl #8
	add.2s	v26, v26, v2
	bic.2s	v26, #1, lsl #8
	add.2s	v27, v27, v2
	bic.2s	v27, #1, lsl #8
	cmhi.2s	v24, v4, v24
	cmhi.2s	v25, v4, v25
	add.2s	v20, v20, v5
	and.8b	v20, v20, v3
	add.2s	v21, v21, v5
	and.8b	v21, v21, v3
	add.2s	v22, v22, v5
	cmhi.2s	v26, v4, v26
	and.8b	v22, v22, v3
	add.2s	v23, v23, v5
	and.8b	v23, v23, v3
	cmhi.2s	v20, v7, v20
	cmhi.2s	v21, v7, v21
	cmhi.2s	v27, v4, v27
	cmhi.2s	v22, v7, v22
	cmhi.2s	v23, v7, v23
	orr.8b	v20, v24, v20
	sshll.2d	v24, v20, #0
	orr.8b	v21, v25, v21
	sshll.2d	v25, v21, #0
	orr.8b	v22, v26, v22
	sshll.2d	v26, v22, #0
	orr.8b	v23, v27, v23
	sshll.2d	v27, v23, #0
	ushll.2d	v20, v20, #0
	and.16b	v20, v20, v6
	ushll.2d	v21, v21, #0
	and.16b	v21, v21, v6
	ushll.2d	v22, v22, #0
	and.16b	v22, v22, v6
	ushll.2d	v23, v23, #0
	ext.16b	v28, v19, v20, #8
	and.16b	v19, v23, v6
	ext.16b	v20, v20, v21, #8
	ext.16b	v21, v21, v22, #8
	ext.16b	v22, v22, v19, #8
	eor.16b	v23, v28, v6
	eor.16b	v20, v20, v6
	eor.16b	v21, v21, v6
	eor.16b	v22, v22, v6
	and.16b	v23, v23, v24
	and.16b	v20, v20, v25
	and.16b	v21, v21, v26
	and.16b	v22, v22, v27
	add.2d	v0, v0, v23
	add.2d	v16, v16, v20
	add.2d	v17, v17, v21
	add.2d	v18, v18, v22
	add	x8, x8, #8
	subs	x11, x11, #8
	b.ne	LBB0_5
; %bb.6:
	add.2d	v0, v16, v0
	add.2d	v0, v17, v0
	add.2d	v0, v18, v0
	addp.2d	d0, v0
	fmov	x8, d0
	cmp	x1, x10
	b.eq	LBB0_10
; %bb.7:
	mov.d	x10, v19[1]
LBB0_8:
	add	x11, x0, x1
LBB0_9:                                 ; =>This Inner Loop Header: Depth=1
	ldrb	w12, [x9], #1
	and	w13, w12, #0xffffffdf
	sub	w13, w13, #65
	and	w13, w13, #0xff
	sub	w12, w12, #48
	cmp	w13, #26
	and	w12, w12, #0xff
	ccmp	w12, #10, #0, hs
	eor	x10, x10, #0x1
	cset	w12, lo
	cmp	w12, #0
	csel	x10, x10, xzr, ne
	add	x8, x8, x10
	mov	x10, x12
	cmp	x9, x11
	b.ne	LBB0_9
LBB0_10:
	mov	x0, x8
	ret
	.cfi_endproc
                                        ; -- End function
.subsections_via_symbols
