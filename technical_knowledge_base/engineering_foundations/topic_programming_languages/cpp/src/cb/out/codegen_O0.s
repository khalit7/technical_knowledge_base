__Z6squarei:                            ; @_Z6squarei
	sub	sp, sp, #16
	str	w0, [sp, #12]
	ldr	w8, [sp, #12]
	ldr	w9, [sp, #12]
	mul	w0, w8, w9
	add	sp, sp, #16
	ret
__Z11sum_squaresi:                      ; @_Z11sum_squaresi
	sub	sp, sp, #32
	stp	x29, x30, [sp, #16]             ; 16-byte Folded Spill
	add	x29, sp, #16
	stur	w0, [x29, #-4]
	str	wzr, [sp, #8]
	str	wzr, [sp, #4]
	b	LBB1_1
LBB1_1:                                 ; =>This Inner Loop Header: Depth=1
	ldr	w8, [sp, #4]
	ldur	w9, [x29, #-4]
	subs	w8, w8, w9
	b.ge	LBB1_4
	b	LBB1_2
LBB1_2:                                 ;   in Loop: Header=BB1_1 Depth=1
	ldr	w0, [sp, #4]
	bl	__Z6squarei
	ldr	w8, [sp, #8]
	add	w8, w8, w0
	str	w8, [sp, #8]
	b	LBB1_3
LBB1_3:                                 ;   in Loop: Header=BB1_1 Depth=1
	ldr	w8, [sp, #4]
	add	w8, w8, #1
	str	w8, [sp, #4]
	b	LBB1_1
LBB1_4:
	ldr	w0, [sp, #8]
	ldp	x29, x30, [sp, #16]             ; 16-byte Folded Reload
	add	sp, sp, #32
	ret
__Z7area_ofRK5Shape:                    ; @_Z7area_ofRK5Shape
	sub	sp, sp, #32
	stp	x29, x30, [sp, #16]             ; 16-byte Folded Spill
	add	x29, sp, #16
	str	x0, [sp, #8]
	ldr	x0, [sp, #8]
	ldr	x8, [x0]
	ldr	x8, [x8, #16]
	blr	x8
	ldp	x29, x30, [sp, #16]             ; 16-byte Folded Reload
	add	sp, sp, #32
	ret
__Z14area_of_squareRK6Square:           ; @_Z14area_of_squareRK6Square
	sub	sp, sp, #32
	stp	x29, x30, [sp, #16]             ; 16-byte Folded Spill
	add	x29, sp, #16
	str	x0, [sp, #8]
	ldr	x0, [sp, #8]
	bl	__ZNK6Square4areaEv
	ldp	x29, x30, [sp, #16]             ; 16-byte Folded Reload
	add	sp, sp, #32
	ret
__ZNK6Square4areaEv:                    ; @_ZNK6Square4areaEv
	sub	sp, sp, #16
	str	x0, [sp, #8]
	ldr	x8, [sp, #8]
	ldr	s0, [x8, #8]
	ldr	s1, [x8, #8]
	fmul	s0, s0, s1
	add	sp, sp, #16
	ret
