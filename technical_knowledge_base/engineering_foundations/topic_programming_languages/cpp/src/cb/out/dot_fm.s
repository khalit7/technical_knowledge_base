__Z17dot_auto_fastmathPKfS0_m:          ; @_Z17dot_auto_fastmathPKfS0_m
	cbz	x2, LBB0_3
	cmp	x2, #4
	b.hs	LBB0_4
	mov	x8, #0                          ; =0x0
	movi	d0, #0000000000000000
	b	LBB0_13
LBB0_3:
	movi	d0, #0000000000000000
                                        ; kill: def $s0 killed $s0 killed $q0
	ret
LBB0_4:
	cmp	x2, #16
	b.hs	LBB0_6
	mov	x8, #0                          ; =0x0
	movi	d0, #0000000000000000
	b	LBB0_10
LBB0_6:
	and	x8, x2, #0xfffffffffffffff0
	add	x9, x1, #32
	add	x10, x0, #32
	movi.2d	v0, #0000000000000000
	mov	x11, x8
	movi.2d	v1, #0000000000000000
	movi.2d	v2, #0000000000000000
	movi.2d	v3, #0000000000000000
LBB0_7:                                 ; =>This Inner Loop Header: Depth=1
	ldp	q4, q5, [x10, #-32]
	ldp	q6, q7, [x10], #64
	ldp	q16, q17, [x9, #-32]
	ldp	q18, q19, [x9], #64
	fmla.4s	v0, v4, v16
	fmla.4s	v1, v5, v17
	fmla.4s	v2, v6, v18
	fmla.4s	v3, v7, v19
	subs	x11, x11, #16
	b.ne	LBB0_7
	fadd.4s	v0, v1, v0
	fadd.4s	v1, v3, v2
	fadd.4s	v0, v1, v0
	faddp.4s	v0, v0, v0
	faddp.2s	s0, v0
	cmp	x8, x2
	b.eq	LBB0_15
	tst	x2, #0xc
	b.eq	LBB0_13
LBB0_10:
	mov	x11, x8
	and	x8, x2, #0xfffffffffffffffc
	movi.2d	v1, #0000000000000000
	mov.s	v1[0], v0[0]
	lsl	x10, x11, #2
	add	x9, x0, x10
	add	x10, x1, x10
	sub	x11, x11, x8
LBB0_11:                                ; =>This Inner Loop Header: Depth=1
	ldr	q0, [x9], #16
	ldr	q2, [x10], #16
	fmla.4s	v1, v0, v2
	adds	x11, x11, #4
	b.ne	LBB0_11
	faddp.4s	v0, v1, v1
	faddp.2s	s0, v0
	cmp	x8, x2
	b.eq	LBB0_15
LBB0_13:
	sub	x9, x2, x8
	lsl	x10, x8, #2
	add	x8, x1, x10
	add	x10, x0, x10
LBB0_14:                                ; =>This Inner Loop Header: Depth=1
	ldr	s1, [x10], #4
	ldr	s2, [x8], #4
	fmadd	s0, s2, s1, s0
	subs	x9, x9, #1
	b.ne	LBB0_14
LBB0_15:
                                        ; kill: def $s0 killed $s0 killed $q0
	ret
