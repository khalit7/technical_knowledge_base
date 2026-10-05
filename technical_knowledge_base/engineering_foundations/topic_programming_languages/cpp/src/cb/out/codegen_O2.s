__Z6squarei:                            ; @_Z6squarei
	mul	w0, w0, w0
	ret
__Z11sum_squaresi:                      ; @_Z11sum_squaresi
	subs	w8, w0, #1
	b.lt	LBB1_2
	sub	w9, w0, #2
	umull	x8, w8, w9
	sub	w9, w0, #3
	mul	w9, w8, w9
	lsr	w9, w9, #1
	mov	w10, #21846                     ; =0x5556
	movk	w10, #21845, lsl #16
	madd	w9, w9, w10, w0
	lsr	x8, x8, #1
	add	w8, w8, w8, lsl #1
	add	w8, w9, w8
	sub	w0, w8, #1
	ret
LBB1_2:
	mov	w0, #0                          ; =0x0
	ret
__Z7area_ofRK5Shape:                    ; @_Z7area_ofRK5Shape
	ldr	x8, [x0]
	ldr	x1, [x8, #16]
	br	x1
__Z14area_of_squareRK6Square:           ; @_Z14area_of_squareRK6Square
	ldr	s0, [x0, #8]
	fmul	s0, s0, s0
	ret
