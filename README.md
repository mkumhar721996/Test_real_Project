# Test_real_Project

## Defects API

`src/server.js` starts a minimal HTTP API (defect list/detail/delete) on `ARC_DEV_PORT`
(defaults to 8005). Run it with `npm start`; run the tests with `npm test`.

### Dependency choice: Node built-ins instead of Express/Jest/Supertest

The original implementation plan for TEST-REAL-PROJECT-STORY-005 called for `express`,
`jest`, and `supertest`. This sandbox's outbound network access is restricted to
`api.anthropic.com` only, so `npm install` for any package from `registry.npmjs.org`
fails with `403 Forbidden` — confirmed by repeated install attempts, not a transient
error. Since dependency installation is not possible in this environment, the API and
its tests are built entirely on Node.js (v22+) built-ins instead:

- `node:http` (`http.createServer`) in place of Express — the routing surface here is
  three routes with no middleware needs, well within what the standard library covers.
- `node:test` + `node:assert/strict` in place of Jest — Node ships a first-class test
  runner (`node --test`) since v18.
- The global `fetch` in place of Supertest — used to drive requests against a real
  `http.Server` listening on an ephemeral port.

The HTTP contract, route behavior, and hard-delete semantics are unchanged from the
plan; only the concrete libraries differ. If a future environment has npm registry
access and the project standardizes on Express/Jest/Supertest, `src/app.js` and
`tests/defects.test.js` can be ported without changing the store or route contracts.