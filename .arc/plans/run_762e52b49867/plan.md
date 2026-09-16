summary: |
  This repository is currently empty apart from a README (no package.json, no source tree, no
  framework of any kind — confirmed via a full recursive glob). There is also no existing
  implementation of the parent epic's defect submission form to attach onto. This plan therefore
  builds the minimal, test-first slice needed to satisfy TEST-REAL-PROJECT-STORY-010 in isolation:
  a small Express + TypeScript backend exposing a defect-creation endpoint, a framework-free
  TypeScript/DOM frontend controller that manages an in-memory attachment queue with inline
  validation errors, and a shared pure-logic module (used by both sides) that enforces the
  allowed-type / 10 MB / 5-file rules. It intentionally does NOT build the rest of the defect
  submission form (all fields, role-based visibility, "New" status) — that is the parent epic's
  broader scope and out of bounds for this work item.

scope:
  - description: |
      Add baseline project tooling so any code/tests can run at all: `package.json`,
      `tsconfig.json`, and `vitest.config.ts` (using `jsdom` as the test environment so DOM-based
      controller tests work alongside plain Node unit/integration tests).
    files:
      - package.json
      - tsconfig.json
      - vitest.config.ts
    rationale: |
      The repo has zero tooling today (verified: only `README.md` and `.env` exist at the root).
      Nothing else in this plan can be written test-first without a test runner and TS config in
      place first.

  - description: |
      Create the shared, framework-free validation module that both the client and server call to
      enforce type/size/count rules. This is the core logic behind ACs 1-4 and 7-10.
      Signature:
      ```ts
      export interface AttachmentFile { name: string; sizeBytes: number; mimeType: string }
      export interface RejectedAttachment {
        file: AttachmentFile;
        reason: 'unsupported_type' | 'file_too_large' | 'max_count_exceeded';
        message: string;
      }
      export interface ValidationResult { accepted: AttachmentFile[]; rejected: RejectedAttachment[] }
      export function validateNewAttachments(
        existingCount: number,
        incoming: AttachmentFile[],
      ): ValidationResult
      ```
    files:
      - src/shared/attachmentValidation.ts
      - src/shared/attachmentValidation.test.ts
    rationale: |
      Keeping this pure and dependency-free lets every type/size/count rule (including the
      multi-file partial-accept/partial-reject and 5-file-cap-split cases in ACs 7-10) be unit
      tested directly, and lets the server re-run the exact same rule set server-side as
      defense-in-depth without duplicating logic.

  - description: |
      Add the backend defect-creation endpoint and an in-memory defect store, so AC5 ("attached
      files are saved with the defect record") is real and testable end-to-end.
      Route behavior: `POST /api/defects` accepts `multipart/form-data` with an `attachments[]`
      file field; it maps `req.files` to `AttachmentFile[]`, calls `validateNewAttachments(0, files)`,
      and either creates the defect (201) or returns 400 with the rejection messages.
    files:
      - src/server/index.ts
      - src/server/app.ts
      - src/server/routes/defects.ts
      - src/server/storage/defectStore.ts
      - src/server/routes/defects.test.ts
    rationale: |
      No backend exists yet. An in-memory store (a `Map` keyed by generated id) is the minimal
      persistence needed to prove attachments are saved with the defect record — no database is
      implied anywhere in this repo, so a real DB layer would be speculative for this work item.

  - description: |
      Add the client-side attachment form controller: wires a `<input type="file" multiple>` to
      `validateNewAttachments`, renders inline errors per rejected file, keeps an in-memory queued
      list of accepted files, and preserves that queued list across a failed submit (AC6).
      Signature:
      ```ts
      export class AttachmentFormController {
        constructor(
          fileInput: HTMLInputElement,
          errorContainer: HTMLElement,
          listContainer: HTMLElement,
          submitFn: (files: AttachmentFile[]) => Promise<void>,
        )
        getQueuedFiles(): AttachmentFile[]
        handleFilesSelected(incoming: AttachmentFile[]): void
        handleSubmit(): Promise<void>
      }
      ```
    files:
      - src/client/attachmentFormController.ts
      - src/client/attachmentFormController.test.ts
      - src/client/index.html
      - src/client/main.ts
    rationale: |
      This is the minimal form scaffold needed to host attachment upload/validation per this work
      item's boundary — it is not the full defect submission form from the parent epic (no other
      fields, no role-based visibility, no status transition), which is out of scope here.

tests:
  - |
    AC1 — allowed types (PDF/PNG/JPG/DOCX/TXT) are accepted and queued.
    File: src/shared/attachmentValidation.test.ts
    ```ts
    const files = [pdfFile, pngFile, jpgFile, docxFile, txtFile]; // each < 10MB, allowed mimeType
    const result = validateNewAttachments(0, files);
    expect(result.accepted).toEqual(files);
    expect(result.rejected).toHaveLength(0);
    ```
  - |
    AC2 — an unsupported type is rejected with an inline error identifying the unsupported type.
    File: src/shared/attachmentValidation.test.ts
    ```ts
    const exe = { name: 'tool.exe', sizeBytes: 1000, mimeType: 'application/x-msdownload' };
    const result = validateNewAttachments(0, [exe]);
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected[0].reason).toBe('unsupported_type');
    expect(result.rejected[0].message).toContain('tool.exe');
    ```
  - |
    AC3 — a file over 10 MB is rejected with an error stating the per-file size limit.
    File: src/shared/attachmentValidation.test.ts
    ```ts
    const big = { name: 'scan.pdf', sizeBytes: 11 * 1024 * 1024, mimeType: 'application/pdf' };
    const result = validateNewAttachments(0, [big]);
    expect(result.rejected[0].reason).toBe('file_too_large');
    expect(result.rejected[0].message).toContain('10 MB');
    ```
  - |
    AC4 — attaching a 6th file after 5 already attached is rejected with an error stating the max
    file count.
    File: src/shared/attachmentValidation.test.ts
    ```ts
    const sixth = { name: 'f6.txt', sizeBytes: 10, mimeType: 'text/plain' };
    const result = validateNewAttachments(5, [sixth]);
    expect(result.rejected[0].reason).toBe('max_count_exceeded');
    expect(result.rejected[0].message).toContain('5');
    ```
  - |
    AC5 — between 0 and 5 valid files are saved with the defect record on submit.
    File: src/server/routes/defects.test.ts
    ```ts
    const res = await request(app)
      .post('/api/defects')
      .field('title', 'Login button broken')
      .attach('attachments', Buffer.from('pdf-bytes'), { filename: 'a.pdf', contentType: 'application/pdf' })
      .attach('attachments', Buffer.from('txt-bytes'), { filename: 'b.txt', contentType: 'text/plain' });
    expect(res.status).toBe(201);
    expect(res.body.attachments.map((a: { name: string }) => a.name)).toEqual(['a.pdf', 'b.txt']);
    ```
  - |
    AC6 — on submission failure, the already-attached files list is preserved in memory.
    File: src/client/attachmentFormController.test.ts
    ```ts
    const failingSubmit = vi.fn().mockRejectedValue(new Error('network error'));
    const controller = new AttachmentFormController(input, errorEl, listEl, failingSubmit);
    controller.handleFilesSelected([validPdf, validTxt]);
    await controller.handleSubmit().catch(() => {});
    expect(controller.getQueuedFiles()).toEqual([validPdf, validTxt]);
    ```
  - |
    AC7 — multi-select with some valid/some invalid: valid ones are accepted and queued.
    File: src/shared/attachmentValidation.test.ts
    ```ts
    const result = validateNewAttachments(0, [validPdf, badExe, validPng]);
    expect(result.accepted).toEqual([validPdf, validPng]);
    ```
  - |
    AC8 — multi-select with some valid/some invalid: invalid ones are rejected with an inline
    error identifying each violation.
    File: src/shared/attachmentValidation.test.ts
    ```ts
    const result = validateNewAttachments(0, [validPdf, badExe, oversizedPng]);
    expect(result.rejected).toHaveLength(2);
    expect(result.rejected.map(r => r.reason)).toEqual(['unsupported_type', 'file_too_large']);
    ```
  - |
    AC9 — with 3 already attached, selecting 4 more valid files accepts only enough to reach 5.
    File: src/shared/attachmentValidation.test.ts
    ```ts
    const fourNew = [f1, f2, f3, f4]; // all valid type/size
    const result = validateNewAttachments(3, fourNew);
    expect(result.accepted).toEqual([f1, f2]);
    ```
  - |
    AC10 — with 3 already attached, the files beyond the 5-file max are rejected with an error
    stating the maximum file count.
    File: src/shared/attachmentValidation.test.ts
    ```ts
    const fourNew = [f1, f2, f3, f4];
    const result = validateNewAttachments(3, fourNew);
    expect(result.rejected).toEqual([
      expect.objectContaining({ file: f3, reason: 'max_count_exceeded' }),
      expect.objectContaining({ file: f4, reason: 'max_count_exceeded' }),
    ]);
    expect(result.rejected[0].message).toContain('5');
    ```

assumptions_or_open_questions:
  - |
    The repository has no existing tech stack (verified by a full recursive glob: only
    `README.md` and `.env` exist). I chose Express + vanilla TypeScript/DOM + Vitest as the
    smallest coherent stack, matching the `ARC_DEV_PORT` (backend) / `ARC_WEB_PORT` (web) split
    already implied by `.env`. If the team has a different intended stack (e.g. a specific
    frontend framework), this plan should be revised before implementation.
  - |
    Persistence uses an in-memory `Map` in `defectStore.ts`, not a real database, since no
    datastore is referenced anywhere in the repo. A real persistence layer is treated as out of
    scope for this work item.
  - |
    "Queued for submission" (AC1) is interpreted as: an accepted file is added to an in-memory
    list and displayed to the user, but no network upload occurs until the defect form is
    actually submitted (single multipart POST carrying all queued files).
  - |
    Server-side validation re-runs the same allow-list/size/count rules as defense-in-depth. If
    any file in a submission violates a rule, the whole `POST /api/defects` request is rejected
    with 400 (all-or-nothing), consistent with AC5's "all attached files are saved" implying a
    single successful save operation rather than partial persistence.
  - |
    MIME-type detection relies on the browser's reported `File.type` client-side and multer's
    `file.mimetype` server-side; this can be spoofed by a malicious client. Magic-byte/content
    sniffing is not required by any AC and is treated as future hardening, not in scope here.
  - |
    This plan builds only the minimal form scaffold needed to host attachment upload (a file
    input, error/list containers, and a submit hook) — not the full defect submission form from
    the parent epic (other fields, role-based visibility, "New" status transition).

package_dependencies:
  - name: express
    version: ^4.19.2
    ecosystem: npm
    rationale: Backend HTTP framework for the `POST /api/defects` endpoint (AC5).
  - name: multer
    version: ^1.4.5-lts.1
    ecosystem: npm
    rationale: Parses `multipart/form-data` file uploads on the server for the defect-creation endpoint.
  - name: typescript
    version: ^5.5.4
    ecosystem: npm
    rationale: Project has no build tooling at all; both client and server code in this plan are written in TypeScript.
  - name: vitest
    version: ^2.0.5
    ecosystem: npm
    rationale: Test runner for all unit/integration tests specified in `tests` (no test runner exists in the repo today).
  - name: jsdom
    version: ^24.1.1
    ecosystem: npm
    rationale: DOM environment for vitest so `AttachmentFormController` tests can exercise real `HTMLInputElement`/DOM APIs.
  - name: supertest
    version: ^7.0.0
    ecosystem: npm
    rationale: HTTP assertion library used to test `POST /api/defects` (AC5) against the Express app without a real server socket.
  - name: tsx
    version: ^4.16.0
    ecosystem: npm
    rationale: Runs the TypeScript server entrypoint directly during development on `ARC_DEV_PORT`.
  - name: "@types/express"
    version: ^4.17.21
    ecosystem: npm
    rationale: Type definitions for express, required since the server is written in TypeScript.
  - name: "@types/multer"
    version: ^1.4.11
    ecosystem: npm
    rationale: Type definitions for multer's `Express.Multer.File` used when mapping uploads to `AttachmentFile`.
  - name: "@types/supertest"
    version: ^6.0.2
    ecosystem: npm
    rationale: Type definitions for supertest used in the backend integration test.
  - name: "@types/node"
    version: ^20.14.0
    ecosystem: npm
    rationale: Node type definitions needed for `Buffer`, `process.env.ARC_DEV_PORT`, etc. in TypeScript server code.

notes: |
  This work item is being planned against a genuinely empty repository (confirmed via recursive
  glob — no `package.json`, no source directories, nothing besides `README.md` and `.env`), and
  the parent epic's defect submission form does not exist yet either. Rather than treating that as
  a blocker, this plan builds the smallest possible vertical slice: a shared validation module,
  a backend endpoint, and a minimal client controller — enough to make every acceptance criterion
  independently testable without speculatively building the rest of the parent epic's form.

  Because scope spans both a client layer and a server layer around a shared module, here is how
  the new pieces call each other:

  ```mermaid
  flowchart TD
    classDef touched fill:#f96,color:#000

    IndexHtml["src/client/index.html"]:::touched
    MainTs["src/client/main.ts"]:::touched
    Controller["src/client/attachmentFormController.ts"]:::touched
    SharedValidation["src/shared/attachmentValidation.ts"]:::touched
    ServerIndex["src/server/index.ts"]:::touched
    App["src/server/app.ts"]:::touched
    DefectsRoute["src/server/routes/defects.ts"]:::touched
    Store["src/server/storage/defectStore.ts"]:::touched

    IndexHtml -->|loads| MainTs
    MainTs -->|instantiates| Controller
    Controller -->|"validates on file select (AC1-4,7-10)"| SharedValidation
    Controller -->|"POST /api/defects on submit (AC5,6)"| DefectsRoute
    ServerIndex -->|starts on ARC_DEV_PORT| App
    App -->|mounts| DefectsRoute
    DefectsRoute -->|"re-validates server-side (defense in depth)"| SharedValidation
    DefectsRoute -->|"persists accepted files (AC5)"| Store
  ```
