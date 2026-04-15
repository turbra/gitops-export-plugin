---
title: GitOps Export
description: >-
  Documentation home for the GitOps Export OpenShift console plugin.
---

<div class="gxp-badge-row">
  <a href="https://www.apache.org/licenses/LICENSE-2.0"><img alt="License: Apache-2.0" src="https://img.shields.io/badge/License-Apache--2.0-2C7A7B?style=flat-square" /></a>
  <img alt="OpenShift Console Plugin" src="https://img.shields.io/badge/OpenShift-console%20plugin-EE0000?style=flat-square" />
</div>

## Start Here

Use these pages in this order when you are orienting yourself:

- <a href="{{ '/documentation-map.html' | relative_url }}"><kbd>DOCUMENTATION MAP</kbd></a>
  for reading order and intent-based navigation across the docs set
- <a href="{{ '/user-guide.html' | relative_url }}"><kbd>USER GUIDE</kbd></a>
  for the shortest install-to-export-to-Argo CD path
- <a href="{{ '/getting-started.html' | relative_url }}"><kbd>GETTING STARTED</kbd></a>
  for deployment details, image builds, and re-apply behavior

## What The Plugin Covers

<div class="gxp-card-grid">
  <div class="gxp-card">
    <h3>Namespace Scan</h3>
    <p>Lists selected namespaced resource kinds through the OpenShift console proxy using the current user's RBAC.</p>
  </div>
  <div class="gxp-card">
    <h3>Sanitized YAML</h3>
    <p>Removes server-assigned metadata, controller-owned state, and common runtime defaults before export.</p>
  </div>
  <div class="gxp-card">
    <h3>ZIP Archive</h3>
    <p>Writes exportable manifests into include, cleanup, and review directories with README and warning context.</p>
  </div>
  <div class="gxp-card">
    <h3>Argo CD Application</h3>
    <p>Generates a GitOps-ready Application definition from the latest sanitized export without creating cluster resources directly.</p>
  </div>
  <div class="gxp-card">
    <h3>scrubctl</h3>
    <p>Runs the same curated scan, sanitization, ZIP export, and Application generation flow as a standalone CLI, with kubectl compatibility kept secondary.</p>
  </div>
</div>

## Screenshots

<div class="gxp-screenshot-grid">
  <a class="gxp-shot" href="{{ '/gitops-export-result.png' | relative_url }}">
    <img src="{{ '/gitops-export-result.png' | relative_url }}" alt="GitOps Export scan result view" />
    <div class="gxp-shot-copy">
      <span class="gxp-shot-title">Export Review</span>
      <span>Scan summary, classification labels, and per-resource YAML previews inside the OpenShift console.</span>
    </div>
  </a>
  <a class="gxp-shot" href="{{ '/gitops-export-argocd.png' | relative_url }}">
    <img src="{{ '/gitops-export-argocd.png' | relative_url }}" alt="GitOps Export Argo CD application form" />
    <div class="gxp-shot-copy">
      <span class="gxp-shot-title">GitOps Definition</span>
      <span>Application-focused Argo CD form with local defaults and generated YAML review before commit.</span>
    </div>
  </a>
</div>

## Current Operating Model

The current product shape is intentionally narrow:

| Area | Current model |
|------|---------------|
| Scope | Single namespace, browser-side scan |
| Output | Sanitized YAML previews, ZIP archive, Argo CD `Application` YAML |
| Auth model | OpenShift console session and namespace RBAC |
| Runtime | Static plugin served by nginx, no backend API |
| Install path | Kustomize overlay plus one-time console patcher Job |

That shape is deliberate. The plugin is not trying to replace Argo CD or become
a general Kubernetes export utility. It exists to help a user move from live
namespace state to Git-managed manifests with as little ceremony as possible.

## Repository

- <a href="https://github.com/turbra/gitops-export-plugin"><kbd>REPOSITORY</kbd></a>
- <a href="https://github.com/turbra/gitops-export-plugin/blob/main/README.md"><kbd>TOP README</kbd></a>
- <a href="https://github.com/turbra/gitops-export-plugin/tree/main/docs"><kbd>DOCS SOURCE</kbd></a>
