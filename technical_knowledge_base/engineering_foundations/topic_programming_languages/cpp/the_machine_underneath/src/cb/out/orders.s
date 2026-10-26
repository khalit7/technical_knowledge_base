__Z12send_relaxedv:                     ; @_Z12send_relaxedv
	mov	w8, #1                          ; =0x1
	adrp	x9, _data@PAGE
	str	w8, [x9, _data@PAGEOFF]
	adrp	x9, _flag@PAGE
	str	w8, [x9, _flag@PAGEOFF]
	ret
__Z12send_releasev:                     ; @_Z12send_releasev
	mov	w8, #1                          ; =0x1
	adrp	x9, _data@PAGE
	str	w8, [x9, _data@PAGEOFF]
	adrp	x9, _flag@PAGE
	add	x9, x9, _flag@PAGEOFF
	stlr	w8, [x9]
	ret
__Z12recv_relaxedv:                     ; @_Z12recv_relaxedv
	adrp	x8, _flag@PAGE
	ldr	w8, [x8, _flag@PAGEOFF]
	adrp	x9, _data@PAGE
	ldr	w9, [x9, _data@PAGEOFF]
	add	w0, w9, w8
	ret
__Z12recv_acquirev:                     ; @_Z12recv_acquirev
	adrp	x8, _flag@PAGE
	add	x8, x8, _flag@PAGEOFF
	ldapr	w8, [x8]
	adrp	x9, _data@PAGE
	ldr	w9, [x9, _data@PAGEOFF]
	add	w0, w9, w8
	ret
__Z12send_seq_cstv:                     ; @_Z12send_seq_cstv
	adrp	x8, _data@PAGE
	add	x8, x8, _data@PAGEOFF
	mov	w9, #1                          ; =0x1
	stlr	w9, [x8]
	adrp	x8, _flag@PAGE
	add	x8, x8, _flag@PAGEOFF
	stlr	w9, [x8]
	ret
__Z12recv_seq_cstv:                     ; @_Z12recv_seq_cstv
	adrp	x8, _flag@PAGE
	add	x8, x8, _flag@PAGEOFF
	ldar	w8, [x8]
	adrp	x9, _data@PAGE
	add	x9, x9, _data@PAGEOFF
	ldar	w9, [x9]
	add	w0, w9, w8
	ret
