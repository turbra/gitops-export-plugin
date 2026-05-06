---
title: Local Development
description: Run the console plugin locally against an OpenShift cluster.
---

# Local Development

Use the standard OpenShift dynamic-plugin split-terminal workflow.

## Prerequisites

- Node.js 22
- `npm` or `yarn`
- `oc` logged in to a cluster
- `podman` or `docker` for the local console bridge container

## Start the Plugin Dev Server

```sh
npm install
npm run start
```

With yarn:

```sh
yarn install
yarn start
```

The webpack dev server listens on `http://localhost:9001`.

## Start the Local Console

```sh
oc login <cluster-url>
npm run start-console
```

With yarn:

```sh
oc login <cluster-url>
yarn start-console
```

Open `http://localhost:9000` and use the OpenShift console with the plugin loaded from the local dev server.

## Refresh Localization

When UI text changes, regenerate the English catalog.

```sh
npm run i18n
```

## Validation Commands

```sh
npm run lint:check
npm run check-types
npm run test:fixtures
npm run build
```
