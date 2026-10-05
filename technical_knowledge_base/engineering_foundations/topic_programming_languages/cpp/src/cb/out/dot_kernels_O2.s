__Z10dot_scalarPKfS0_m:                 ; @_Z10dot_scalarPKfS0_m
	movi	d0, #0000000000000000
	cbz	x2, LBB0_2
LBB0_1:                                 ; =>This Inner Loop Header: Depth=1
	ldr	s1, [x0], #4
	ldr	s2, [x1], #4
	fmadd	s0, s1, s2, s0
	subs	x2, x2, #1
	b.ne	LBB0_1
LBB0_2:
	ret
__Z8dot_autoPKfS0_m:                    ; @_Z8dot_autoPKfS0_m
	cbz	x2, LBB1_3
	cmp	x2, #4
	b.hs	LBB1_4
	mov	x8, #0                          ; =0x0
	movi	d0, #0000000000000000
	b	LBB1_13
LBB1_3:
	movi	d0, #0000000000000000
	ret
LBB1_4:
	cmp	x2, #16
	b.hs	LBB1_6
	mov	x8, #0                          ; =0x0
	movi	d0, #0000000000000000
	b	LBB1_10
LBB1_6:
	and	x8, x2, #0xfffffffffffffff0
	add	x9, x1, #32
	add	x10, x0, #32
	movi	d0, #0000000000000000
	mov	x11, x8
LBB1_7:                                 ; =>This Inner Loop Header: Depth=1
	ldp	q1, q2, [x10, #-32]
	ldp	q3, q4, [x10], #64
	ldp	q5, q6, [x9, #-32]
	ldp	q7, q16, [x9], #64
	fmul.4s	v1, v1, v5
	mov	s5, v1[3]
	mov	s17, v1[2]
	mov	s18, v1[1]
	fmul.4s	v2, v2, v6
	mov	s6, v2[3]
	mov	s19, v2[2]
	mov	s20, v2[1]
	fmul.4s	v3, v3, v7
	mov	s7, v3[3]
	mov	s21, v3[2]
	mov	s22, v3[1]
	fmul.4s	v4, v4, v16
	mov	s16, v4[3]
	mov	s23, v4[2]
	mov	s24, v4[1]
	fadd	s0, s0, s1
	fadd	s0, s0, s18
	fadd	s0, s0, s17
	fadd	s0, s0, s5
	fadd	s0, s0, s2
	fadd	s0, s0, s20
	fadd	s0, s0, s19
	fadd	s0, s0, s6
	fadd	s0, s0, s3
	fadd	s0, s0, s22
	fadd	s0, s0, s21
	fadd	s0, s0, s7
	fadd	s0, s0, s4
	fadd	s0, s0, s24
	fadd	s0, s0, s23
	fadd	s0, s0, s16
	subs	x11, x11, #16
	b.ne	LBB1_7
	cmp	x8, x2
	b.eq	LBB1_15
	tst	x2, #0xc
	b.eq	LBB1_13
LBB1_10:
	mov	x11, x8
	and	x8, x2, #0xfffffffffffffffc
	lsl	x10, x11, #2
	add	x9, x0, x10
	add	x10, x1, x10
	sub	x11, x11, x8
LBB1_11:                                ; =>This Inner Loop Header: Depth=1
	ldr	q1, [x9], #16
	ldr	q2, [x10], #16
	fmul.4s	v1, v1, v2
	mov	s2, v1[3]
	mov	s3, v1[2]
	mov	s4, v1[1]
	fadd	s0, s0, s1
	fadd	s0, s0, s4
	fadd	s0, s0, s3
	fadd	s0, s0, s2
	adds	x11, x11, #4
	b.ne	LBB1_11
	cmp	x8, x2
	b.eq	LBB1_15
LBB1_13:
	sub	x9, x2, x8
	lsl	x10, x8, #2
	add	x8, x1, x10
	add	x10, x0, x10
LBB1_14:                                ; =>This Inner Loop Header: Depth=1
	ldr	s1, [x10], #4
	ldr	s2, [x8], #4
	fmadd	s0, s1, s2, s0
	subs	x9, x9, #1
	b.ne	LBB1_14
LBB1_15:
	ret
__Z8dot_neonPKfS0_m:                    ; @_Z8dot_neonPKfS0_m
	cmp	x2, #16
	b.hs	LBB2_2
	mov	x8, #0                          ; =0x0
	movi.2d	v0, #0000000000000000
	b	LBB2_5
LBB2_2:
	mov	x8, #0                          ; =0x0
	add	x9, x1, #32
	add	x10, x0, #32
	movi.2d	v0, #0000000000000000
	movi.2d	v1, #0000000000000000
	movi.2d	v2, #0000000000000000
	movi.2d	v3, #0000000000000000
LBB2_3:                                 ; =>This Inner Loop Header: Depth=1
	ldp	q4, q5, [x10, #-32]
	ldp	q6, q7, [x9, #-32]
	fmla.4s	v0, v6, v4
	fmla.4s	v1, v7, v5
	ldp	q4, q5, [x10], #64
	ldp	q6, q7, [x9], #64
	fmla.4s	v2, v6, v4
	add	x11, x8, #32
	fmla.4s	v3, v7, v5
	add	x8, x8, #16
	cmp	x11, x2
	b.ls	LBB2_3
	fadd.4s	v0, v1, v0
	fadd.4s	v1, v3, v2
	fadd.4s	v0, v1, v0
LBB2_5:
	faddp.4s	v0, v0, v0
	faddp.2s	s0, v0
	subs	x9, x2, x8
	b.ls	LBB2_20
	cmp	x9, #4
	b.hs	LBB2_8
	mov	x9, x8
	b	LBB2_18
LBB2_8:
	cmp	x9, #16
	b.hs	LBB2_10
	mov	x10, #0                         ; =0x0
	b	LBB2_15
LBB2_10:
	and	x11, x2, #0xf
	sub	x10, x9, x11
	add	x12, x8, x11
	sub	x12, x12, x2
	lsl	x13, x8, #2
	add	x14, x13, #32
	add	x13, x1, x14
	add	x14, x0, x14
LBB2_11:                                ; =>This Inner Loop Header: Depth=1
	ldp	q1, q2, [x14, #-32]
	ldp	q3, q4, [x14], #64
	ldp	q5, q6, [x13, #-32]
	ldp	q7, q16, [x13], #64
	fmul.4s	v1, v1, v5
	mov	s5, v1[3]
	mov	s17, v1[2]
	mov	s18, v1[1]
	fmul.4s	v2, v2, v6
	mov	s6, v2[3]
	mov	s19, v2[2]
	mov	s20, v2[1]
	fmul.4s	v3, v3, v7
	mov	s7, v3[3]
	mov	s21, v3[2]
	mov	s22, v3[1]
	fmul.4s	v4, v4, v16
	mov	s16, v4[3]
	mov	s23, v4[2]
	mov	s24, v4[1]
	fadd	s0, s0, s1
	fadd	s0, s0, s18
	fadd	s0, s0, s17
	fadd	s0, s0, s5
	fadd	s0, s0, s2
	fadd	s0, s0, s20
	fadd	s0, s0, s19
	fadd	s0, s0, s6
	fadd	s0, s0, s3
	fadd	s0, s0, s22
	fadd	s0, s0, s21
	fadd	s0, s0, s7
	fadd	s0, s0, s4
	fadd	s0, s0, s24
	fadd	s0, s0, s23
	fadd	s0, s0, s16
	adds	x12, x12, #16
	b.ne	LBB2_11
	cbz	x11, LBB2_20
	cmp	x11, #4
	b.hs	LBB2_15
	add	x9, x8, x10
	b	LBB2_18
LBB2_15:
	and	x11, x2, #0x3
	sub	x9, x9, x11
	add	x9, x8, x9
	add	x10, x10, x8
	add	x8, x10, x11
	sub	x8, x8, x2
	lsl	x12, x10, #2
	add	x10, x0, x12
	add	x12, x1, x12
LBB2_16:                                ; =>This Inner Loop Header: Depth=1
	ldr	q1, [x10], #16
	ldr	q2, [x12], #16
	fmul.4s	v1, v1, v2
	mov	s2, v1[3]
	mov	s3, v1[2]
	mov	s4, v1[1]
	fadd	s0, s0, s1
	fadd	s0, s0, s4
	fadd	s0, s0, s3
	fadd	s0, s0, s2
	adds	x8, x8, #4
	b.ne	LBB2_16
	cbz	x11, LBB2_20
LBB2_18:
	sub	x8, x2, x9
	lsl	x10, x9, #2
	add	x9, x1, x10
	add	x10, x0, x10
LBB2_19:                                ; =>This Inner Loop Header: Depth=1
	ldr	s1, [x10], #4
	ldr	s2, [x9], #4
	fmadd	s0, s1, s2, s0
	subs	x8, x8, #1
	b.ne	LBB2_19
LBB2_20:
	ret
