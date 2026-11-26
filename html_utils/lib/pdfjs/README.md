pdf.js (pdfjs-dist) 6.5.438, the legacy build (polyfilled for older Safari and Chrome): legacy/build/pdf.min.mjs and
legacy/build/pdf.worker.min.mjs, copied unchanged from the npm package, with its LICENSE (Apache-2.0).
Used by html_utils/kb_reader.js (the paper reader's PDF view); build_site.py publishes this folder as lib/pdfjs-6.5.438/.
To update: npm pack pdfjs-dist@<version>, copy the same two files and LICENSE, change PDFJS_VERSION in build_site.py.
