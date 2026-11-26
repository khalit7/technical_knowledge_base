pdf.js (pdfjs-dist) 6.5.438, the legacy build (polyfilled for older Safari and Chrome): legacy/build/pdf.min.mjs and
legacy/build/pdf.worker.min.mjs, with standard_fonts/, cmaps/, iccs/ and wasm/ (its JPEG 2000, JBIG2 and colour decoders, without
quickjs: scripts in a PDF never run), copied unchanged from the npm package, with its LICENSE (Apache-2.0) and theirs.
Used by html_utils/kb_reader.js (the paper reader); build_site.py publishes this folder as lib/pdfjs-6.5.438/.
To update: npm pack pdfjs-dist@<version>, copy the same files and folders, change PDFJS_VERSION in build_site.py.
