import * as JSZip from 'jszip';
import { NamespaceScan, ResourceClassification, ResourceObject } from './types';
import { serializeResource } from './scan-utils';

type ExportableResource = ResourceClassification & {
  classification: 'include' | 'cleanup' | 'review';
  sanitizedResource: ResourceObject;
};

export type ScanArchiveSummary = {
  archiveName: string;
  manifestCount: number;
  warningCount: number;
};

export function countExportableResources(scan: NamespaceScan): number {
  return getExportableResources(scan).length;
}

export function countWarningResources(scan: NamespaceScan): number {
  return scan.status.resourceDetails.filter((resource) => resource.classification !== 'include').length;
}

export async function downloadScanArchive(scan: NamespaceScan): Promise<ScanArchiveSummary> {
  const exportableResources = getExportableResources(scan);
  if (!exportableResources.length) {
    throw new Error('No exportable resources are available for this scan');
  }

  const archiveName = buildArchiveName(scan);
  const zip = new JSZip();
  const manifestPaths = new Set<string>();

  zip.file('README.md', buildReadme(scan, exportableResources));

  const warnings = buildWarnings(scan, exportableResources);
  if (warnings) {
    zip.file('WARNINGS.md', warnings);
  }

  exportableResources.forEach((resource) => {
    const path = buildManifestPath(resource, manifestPaths);
    zip.file(path, serializeResource(resource.sanitizedResource));
  });

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  triggerDownload(blob, archiveName);

  return {
    archiveName,
    manifestCount: exportableResources.length,
    warningCount: countWarningResources(scan),
  };
}

function getExportableResources(scan: NamespaceScan): ExportableResource[] {
  return scan.status.resourceDetails.filter((resource): resource is ExportableResource =>
    resource.classification !== 'exclude' && Boolean(resource.sanitizedResource),
  );
}

function buildArchiveName(scan: NamespaceScan): string {
  return `gitops-export-${sanitizeSegment(scan.metadata.namespace)}-${formatTimestamp(scan.metadata.scannedAt)}.zip`;
}

function buildManifestPath(
  resource: ExportableResource,
  manifestPaths: Set<string>,
): string {
  const baseName = `${toKebabCase(resource.kind)}-${sanitizeSegment(resource.name)}.yaml`;
  let path = `manifests/${resource.classification}/${baseName}`;
  let duplicate = 2;

  while (manifestPaths.has(path)) {
    path = `manifests/${resource.classification}/${baseName.slice(0, -5)}-${duplicate}.yaml`;
    duplicate += 1;
  }

  manifestPaths.add(path);
  return path;
}

function buildReadme(scan: NamespaceScan, resources: ExportableResource[]): string {
  return [
    '# GitOps Export archive',
    '',
    `Namespace: ${scan.spec.namespace}`,
    `Scanned at: ${scan.metadata.scannedAt}`,
    `Secret handling: ${scan.spec.secretHandling || 'redact'}`,
    '',
    'Archive layout:',
    '- manifests/include/: resources classified as include',
    '- manifests/cleanup/: resources classified as cleanup',
    '- manifests/review/: resources classified as review',
    '',
    'Classification handling:',
    '- include resources are exported directly',
    '- cleanup resources are exported and also listed in WARNINGS.md',
    '- review resources are exported and also listed in WARNINGS.md',
    '- exclude resources are not exported',
    '',
    `Manifest files written: ${resources.length}`,
    '',
    'This archive was generated locally in the OpenShift console plugin.',
  ].join('\n');
}

function buildWarnings(scan: NamespaceScan, resources: ExportableResource[]): string {
  const cleanupResources = resources.filter((resource) => resource.classification === 'cleanup');
  const reviewResources = resources.filter((resource) => resource.classification === 'review');
  const skippedResources = scan.status.resourceDetails.filter(
    (resource) => resource.classification === 'exclude' || !resource.sanitizedResource,
  );

  if (!cleanupResources.length && !reviewResources.length && !skippedResources.length) {
    return '';
  }

  const lines = ['# Export warnings', ''];

  if (cleanupResources.length) {
    lines.push('Cleanup resources included in the archive:');
    cleanupResources.forEach((resource) => {
      lines.push(`- ${resource.kind}/${resource.name}: ${resource.reason}`);
    });
    lines.push('');
  }

  if (reviewResources.length) {
    lines.push('Review resources included in the archive:');
    reviewResources.forEach((resource) => {
      lines.push(`- ${resource.kind}/${resource.name}: ${resource.reason}`);
    });
    lines.push('');
  }

  if (skippedResources.length) {
    lines.push('Resources not written to the archive:');
    skippedResources.forEach((resource) => {
      const reason = !resource.sanitizedResource && resource.kind === 'Secret'
        ? 'Secret omitted by current secret handling'
        : resource.reason;
      lines.push(`- ${resource.kind}/${resource.name}: ${reason}`);
    });
  }

  return lines.join('\n').trimEnd();
}

function triggerDownload(blob: Blob, archiveName: string): void {
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = archiveName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 0);
}

function formatTimestamp(value: string): string {
  return value
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z');
}

function sanitizeSegment(value: string): string {
  const sanitized = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return sanitized || 'resource';
}

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase();
}
