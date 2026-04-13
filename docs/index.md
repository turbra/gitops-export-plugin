---
title: GitOps Export
description: >-
  Documentation home for the GitOps Export OpenShift console plugin.
---

<div class="gxp-badge-row">
  <a href="https://github.com/turbra/gitops-export-plugin/blob/main/LICENSE"><img alt="License: Apache-2.0" src="https://img.shields.io/github/license/turbra/gitops-export-plugin" /></a>
  <img alt="OpenShift console plugin" src="https://img.shields.io/badge/OpenShift-console%20plugin-EE0000" />
  <img alt="Argo CD application YAML" src="https://img.shields.io/badge/Argo%20CD-Application%20YAML-005f60" />
  <img alt="Namespace export flow" src="https://img.shields.io/badge/Workflow-cluster%20to%20GitOps-blue" />
</div>

<div class="gxp-hero">
  <p class="gxp-inline-eyebrow">Cluster-First To GitOps</p>

  <h1>GitOps Export</h1>

  <p class="gxp-hero-lead">
    GitOps Export is an OpenShift console plugin for teams that already built in-cluster
    and now want a clean handoff into Git. It scans a namespace, classifies each live
    resource, strips cluster-generated noise from the manifests, packages the export as a
    ZIP archive, and generates Argo CD Application YAML from that same export context.
  </p>

  <div class="gxp-cta-row">
    <a href="{{ '/documentation-map.html' | relative_url }}"><kbd>OPEN THE DOCS MAP</kbd></a>
    <a href="{{ '/user-guide.html' | relative_url }}"><kbd>OPEN THE USER GUIDE</kbd></a>
    <a href="https://github.com/turbra/gitops-export-plugin"><kbd>VIEW REPOSITORY</kbd></a>
  </div>
</div>

## Start Here

Use these pages in this order when you are orienting yourself:

- <a href="{{ '/documentation-map.html' | relative_url }}"><kbd>DOCUMENTATION MAP</kbd></a>
  for reading order and intent-based navigation across the docs set
- <a href="{{ '/user-guide.html' | relative_url }}"><kbd>USER GUIDE</kbd></a>
  for the shortest install-to-export-to-Argo CD path
- <a href="{{ '/getting-started.html' | relative_url }}"><kbd>GETTING STARTED</kbd></a>
  for deployment details, image builds, and re-apply behavior

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

## Repository

- <a href="https://github.com/turbra/gitops-export-plugin"><kbd>REPOSITORY</kbd></a>
- <a href="https://github.com/turbra/gitops-export-plugin/blob/main/README.md"><kbd>TOP README</kbd></a>
- <a href="https://github.com/turbra/gitops-export-plugin/tree/main/docs"><kbd>DOCS SOURCE</kbd></a>
