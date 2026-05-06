---
title: Testing
description: Fixture tests, type checks, linting, and docs validation.
---

# Testing

GitOps Export uses fixture-based tests to validate classification, sanitization, and archive output.

## Fixture Directories

Fixtures live under `testdata/fixtures/`. Each scenario contains:

| File | Purpose |
| --- | --- |
| `input.yaml` | Kubernetes resource as it would appear from the cluster. |
| `expected-classification.json` | Expected `include`, `cleanup`, `review`, or `exclude` result. |
| `expected-sanitized.yaml` | Expected sanitized YAML output. |
| `expected-archive.json` | Expected archive output structure. |
| `fixture.json` | Optional test overrides such as Secret handling mode. |

## Run Tests

```sh
npm run lint:check
npm run check-types
npm run test:fixtures
```

Regenerate expected fixture outputs when behavior intentionally changes:

```sh
npm run generate-fixtures
npm run test:fixtures
```

Review the generated diffs before committing them.

## Build the Plugin

```sh
npm run build
```

## Build the Docs

```sh
cd website
npm ci
npm run build
```

The docs build uses Docusaurus with broken links configured to fail the build.

## Parity With scrubctl

The TypeScript plugin implementation is the oracle for this repository's fixtures. When behavior changes, copy updated `testdata/fixtures/` into the `scrubctl` repository and run:

```sh
go test ./...
```

That confirms the Go CLI and TypeScript console plugin stay aligned.
