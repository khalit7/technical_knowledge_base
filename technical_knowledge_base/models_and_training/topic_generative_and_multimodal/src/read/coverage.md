# Coverage against the old Notion pages: TODO

Notion was disconnected while the Reading and Further reading tabs were written (2026-10-17), so the old root page "Topic: generative-and-multimodal" (Notion 3c65c17b0d0d817ab6ade318917bff55) and any child pages under it could not be fetched. Khalid's instruction: "don't trust the current content"; the old pages are unverified notes, a floor and not a scope.

When the connection returns:
1. Fetch the old root page and every child page or sub-page under it; save the fetched text verbatim to `src/read/old/live.md` (and one file per child), copying with a script, never retyping.
2. List every distinct fact, number, mechanism, caveat and link in it, in `src/read/coverage.json`, each with where this page (or a child page) now carries it, or why it is dropped (duplicate, or stale with its correction and source).
3. Check each claim against a primary source before carrying it; corrections go in visible boxes on the page that owns the subject.
4. Note any old child pages, databases or a video on the root: their tags must stay on the Notion page when the HTML is published (`update_content` only; never `replace_content` on a page with children).
5. Report anything the old pages cover that no tab or planned child page covers.
