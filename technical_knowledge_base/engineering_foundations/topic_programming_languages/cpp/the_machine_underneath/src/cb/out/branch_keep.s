__Z9count_bigPKhm:                      ; @_Z9count_bigPKhm
	mov	x8, #0                          ; =0x0
	cbnz	x1, LBB0_3
LBB0_1:
	mov	x0, x8
	ret
LBB0_2:                                 ;   in Loop: Header=BB0_3 Depth=1
	add	x0, x0, #1
	subs	x1, x1, #1
	b.eq	LBB0_1
LBB0_3:                                 ; =>This Inner Loop Header: Depth=1
	ldrsb	w9, [x0]
	tbz	w9, #31, LBB0_2
	; InlineAsm Start
	; InlineAsm End
	ldrb	w9, [x0]
	add	x8, x8, x9
	b	LBB0_2
_main:                                  ; @main
	stp	d9, d8, [sp, #-64]!             ; 16-byte Folded Spill
	stp	x28, x27, [sp, #16]             ; 16-byte Folded Spill
	stp	x20, x19, [sp, #32]             ; 16-byte Folded Spill
	stp	x29, x30, [sp, #48]             ; 16-byte Folded Spill
	add	x29, sp, #48
	sub	sp, sp, #2560
	mov	w0, #33                         ; =0x21
	mov	w1, #0                          ; =0x0
	bl	_pthread_set_qos_class_self_np
	mov	w20, #33554432                  ; =0x2000000
	mov	w0, #33554432                   ; =0x2000000
	bl	__Znwm
	mov	x19, x0
	add	x20, x0, x20
	stur	x0, [x29, #-80]
	stur	x20, [x29, #-64]
	mov	w1, #33554432                   ; =0x2000000
	bl	_bzero
	stur	x20, [x29, #-72]
	mov	w8, #1                          ; =0x1
	str	w8, [sp, #24]
	mov	w9, #35173                      ; =0x8965
	movk	w9, #27655, lsl #16
	add	x10, sp, #24
	mov	w11, #1                         ; =0x1
LBB1_1:                                 ; =>This Inner Loop Header: Depth=1
	eor	w8, w8, w8, lsr #30
	madd	w8, w8, w9, w11
	str	w8, [x10, x11, lsl #2]
	add	x11, x11, #1
	cmp	x11, #624
	b.ne	LBB1_1
	mov	x14, #0                         ; =0x0
	mov	w8, #33554432                   ; =0x2000000
	add	x9, sp, #24
	mov	x10, #3361                      ; =0xd21
	movk	x10, #8402, lsl #16
	movk	x10, #53773, lsl #32
	movk	x10, #3360, lsl #48
	mov	w12, #45279                     ; =0xb0df
	movk	w12, #39176, lsl #16
	mov	w13, #22144                     ; =0x5680
	movk	w13, #40236, lsl #16
LBB1_3:                                 ; =>This Inner Loop Header: Depth=1
	add	x15, x14, #1
	cmp	x15, #624
	csinc	x15, xzr, x14, eq
	ldr	w16, [x9, x14, lsl #2]
	and	w16, w16, #0x80000000
	ldr	w17, [x9, x15, lsl #2]
	and	w0, w17, #0x7ffffffe
	orr	w16, w0, w16
	add	x0, x14, #397
	lsr	x1, x0, #4
	umulh	x1, x1, x10
	lsr	x1, x1, #1
	msub	x0, x1, x11, x0
	ldr	w0, [x9, x0, lsl #2]
	tst	w17, #0x1
	csel	w17, w12, wzr, ne
	eor	w17, w17, w0
	eor	w16, w17, w16, lsr #1
	str	w16, [x9, x14, lsl #2]
	eor	w14, w16, w16, lsr #11
	and	w16, w13, w14, lsl #7
	eor	w14, w16, w14
	lsl	w16, w14, #15
	and	w16, w16, #0xffc7ffff
	eor	w16, w16, w14
	eor	w14, w14, w16, lsr #18
	strb	w14, [x19], #1
	mov	x14, x15
	subs	x8, x8, #1
	b.ne	LBB1_3
	sub	x8, x29, #80
	str	x8, [sp, #16]
	adrp	x1, l_.str@PAGE
	add	x1, x1, l_.str@PAGEOFF
	add	x0, sp, #16
	bl	__ZZ4mainENK3$_0clEPKc
	fmov	d8, d0
	ldp	x0, x1, [x29, #-80]
	sub	x2, x29, #49
	bl	__ZNSt3__16__sortIRNS_6__lessIhhEEPhEEvT0_S5_T_
	adrp	x1, l_.str.1@PAGE
	add	x1, x1, l_.str.1@PAGEOFF
	add	x0, sp, #16
	bl	__ZZ4mainENK3$_0clEPKc
	fdiv	d0, d8, d0
	str	d0, [sp]
	adrp	x0, l_.str.2@PAGE
	add	x0, x0, l_.str.2@PAGEOFF
	bl	_printf
	ldur	x0, [x29, #-80]
	cbz	x0, LBB1_9
	stur	x0, [x29, #-72]
	bl	__ZdlPv
LBB1_9:
	mov	w0, #0                          ; =0x0
	add	sp, sp, #2560
	ldp	x29, x30, [sp, #48]             ; 16-byte Folded Reload
	ldp	x20, x19, [sp, #32]             ; 16-byte Folded Reload
	ldp	x28, x27, [sp, #16]             ; 16-byte Folded Reload
	ldp	d9, d8, [sp], #64               ; 16-byte Folded Reload
	ret
LBB1_10:
	b	LBB1_12
LBB1_11:
LBB1_12:
	mov	x19, x0
	ldur	x0, [x29, #-80]
	cbz	x0, LBB1_14
	stur	x0, [x29, #-72]
	bl	__ZdlPv
LBB1_14:
	mov	x0, x19
	bl	__Unwind_Resume
GCC_except_table1:
Lexception0:
Lcst_begin0:
Lcst_end0:
__ZZ4mainENK3$_0clEPKc:                 ; @"_ZZ4mainENK3$_0clEPKc"
	sub	sp, sp, #112
	stp	d11, d10, [sp, #32]             ; 16-byte Folded Spill
	stp	d9, d8, [sp, #48]               ; 16-byte Folded Spill
	stp	x22, x21, [sp, #64]             ; 16-byte Folded Spill
	stp	x20, x19, [sp, #80]             ; 16-byte Folded Spill
	stp	x29, x30, [sp, #96]             ; 16-byte Folded Spill
	add	x29, sp, #96
	mov	x19, x1
	mov	x20, x0
	bl	__ZNSt3__16chrono12steady_clock3nowEv
	scvtf	d0, x0
	mov	x8, #225833675390976            ; =0xcd6500000000
	movk	x8, #16845, lsl #48
	fmov	d9, x8
	fdiv	d8, d0, d9
	ldr	x8, [x20]
	ldr	x0, [x8]
	mov	w1, #33554432                   ; =0x2000000
	bl	__Z9count_bigPKhm
	str	x0, [sp, #24]
	add	x21, sp, #24
	; InlineAsm Start
	; InlineAsm End
	bl	__ZNSt3__16chrono12steady_clock3nowEv
	scvtf	d0, x0
	fdiv	d0, d0, d9
	fsub	d0, d0, d8
	fminnm	d8, d0, d9
	bl	__ZNSt3__16chrono12steady_clock3nowEv
	scvtf	d0, x0
	fdiv	d10, d0, d9
	ldr	x8, [x20]
	ldr	x0, [x8]
	mov	w1, #33554432                   ; =0x2000000
	bl	__Z9count_bigPKhm
	str	x0, [sp, #24]
	; InlineAsm Start
	; InlineAsm End
	bl	__ZNSt3__16chrono12steady_clock3nowEv
	scvtf	d0, x0
	fdiv	d0, d0, d9
	fsub	d0, d0, d10
	fcmp	d0, d8
	fcsel	d8, d0, d8, mi
	bl	__ZNSt3__16chrono12steady_clock3nowEv
	scvtf	d0, x0
	fdiv	d10, d0, d9
	ldr	x8, [x20]
	ldr	x0, [x8]
	mov	w1, #33554432                   ; =0x2000000
	bl	__Z9count_bigPKhm
	str	x0, [sp, #24]
	; InlineAsm Start
	; InlineAsm End
	bl	__ZNSt3__16chrono12steady_clock3nowEv
	scvtf	d0, x0
	fdiv	d0, d0, d9
	fsub	d0, d0, d10
	fcmp	d0, d8
	fcsel	d8, d0, d8, mi
	bl	__ZNSt3__16chrono12steady_clock3nowEv
	scvtf	d0, x0
	fdiv	d10, d0, d9
	ldr	x8, [x20]
	ldr	x0, [x8]
	mov	w1, #33554432                   ; =0x2000000
	bl	__Z9count_bigPKhm
	str	x0, [sp, #24]
	; InlineAsm Start
	; InlineAsm End
	bl	__ZNSt3__16chrono12steady_clock3nowEv
	scvtf	d0, x0
	fdiv	d0, d0, d9
	fsub	d0, d0, d10
	fcmp	d0, d8
	fcsel	d8, d0, d8, mi
	bl	__ZNSt3__16chrono12steady_clock3nowEv
	scvtf	d0, x0
	fdiv	d10, d0, d9
	ldr	x8, [x20]
	ldr	x0, [x8]
	mov	w1, #33554432                   ; =0x2000000
	bl	__Z9count_bigPKhm
	str	x0, [sp, #24]
	; InlineAsm Start
	; InlineAsm End
	bl	__ZNSt3__16chrono12steady_clock3nowEv
	scvtf	d0, x0
	fdiv	d0, d0, d9
	fsub	d0, d0, d10
	fcmp	d0, d8
	fcsel	d8, d0, d8, mi
	mov	x8, #4494592428115755008        ; =0x3e60000000000000
	fmov	d0, x8
	fmul	d0, d8, d0
	fmul	d0, d0, d9
	ldr	x8, [sp, #24]
	str	x8, [sp, #16]
	str	x19, [sp]
	str	d0, [sp, #8]
	adrp	x0, l_.str.4@PAGE
	add	x0, x0, l_.str.4@PAGEOFF
	bl	_printf
	fmov	d0, d8
	ldp	x29, x30, [sp, #96]             ; 16-byte Folded Reload
	ldp	x20, x19, [sp, #80]             ; 16-byte Folded Reload
	ldp	x22, x21, [sp, #64]             ; 16-byte Folded Reload
	ldp	d9, d8, [sp, #48]               ; 16-byte Folded Reload
	ldp	d11, d10, [sp, #32]             ; 16-byte Folded Reload
	add	sp, sp, #112
	ret




