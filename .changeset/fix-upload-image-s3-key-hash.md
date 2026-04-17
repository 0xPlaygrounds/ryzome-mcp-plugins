---
"@ryzome-ai/ryzome-core": patch
---

fix(upload-image): use SHA-256 content hash as S3 key

The `upload_ryzome_image` tool previously generated S3 keys of the form
`canvas/{canvas_id}/images/{uuid}.{ext}`, which diverged from the canvas
app convention (`apps/canvas/src/lib/s3/s3-client.ts` → `createFileHash`)
where the S3 key is the SHA-256 hex digest of the file contents.
Downstream features (share/publish/clone, file deduplication, workspace
size accounting) rely on that convention, so images uploaded via the
plugin were not correctly handled by those flows. The tool now produces
the same hash-based key as the rest of the product.
