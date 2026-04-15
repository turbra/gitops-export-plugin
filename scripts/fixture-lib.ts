import { load, dump } from 'js-yaml';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import {
  RESOURCE_TYPE_OPTIONS,
  buildPreviewFromSanitized,
  classifyResource,
  sanitizeResource,
  summarizeResourceDetails,
} from '../src/scan-utils';
import { downloadScanArchive } from '../src/export-archive';
import { NamespaceScan, ResourceClassification, ResourceObject } from '../src/types';

const JSZipRuntime = require('jszip');

export type FixtureConfig = {
  secretHandling?: 'redact' | 'omit' | 'include';
  namespace?: string;
  scannedAt?: string;
};

export type ExpectedArchive = {
  archiveName?: string;
  manifestCount?: number;
  warningCount?: number;
  error?: string;
  files?: Array<{
    path: string;
    type: 'text' | 'yaml';
    content: unknown;
  }>;
};

export type LoadedFixture = {
  dir: string;
  name: string;
  config: FixtureConfig;
  input: ResourceObject;
};

const FIXTURES_DIR = path.resolve(process.cwd(), 'testdata/fixtures');
const DEFAULT_SCANNED_AT = '2026-04-15T12:00:00Z';

export async function listFixtureNames(): Promise<string[]> {
  const entries = await fs.readdir(FIXTURES_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export async function loadFixture(name: string): Promise<LoadedFixture> {
  const dir = path.join(FIXTURES_DIR, name);
  const input = load(await fs.readFile(path.join(dir, 'input.yaml'), 'utf8')) as ResourceObject;
  const config = await readFixtureConfig(dir);
  return { dir, name, config, input };
}

export function classifyCuratedResource(resource: ResourceObject): ResourceClassification {
  const isCurated = RESOURCE_TYPE_OPTIONS.some(
    (option) => option.kind === resource.kind && option.group === apiGroup(resource.apiVersion) && option.version === apiVersion(resource.apiVersion),
  );

  if (!isCurated) {
    return {
      apiVersion: resource.apiVersion,
      kind: resource.kind,
      name: resource.metadata.name,
      namespace: resource.metadata.namespace,
      classification: 'exclude',
      reason: 'kind not in curated resource set',
    };
  }

  return classifyResource(resource);
}

export function createFixtureScan(
  resource: ResourceObject,
  config: FixtureConfig,
  classification: ResourceClassification,
): NamespaceScan {
  const namespace = config.namespace || resource.metadata.namespace || 'default';
  const secretHandling = config.secretHandling || 'redact';
  const sanitizedResource = sanitizeResource(resource, classification.classification, secretHandling);
  const detail: ResourceClassification = {
    ...classification,
    preview: buildPreviewFromSanitized(sanitizedResource),
    sanitizedResource,
  };

  return {
    metadata: {
      namespace,
      scannedAt: config.scannedAt || DEFAULT_SCANNED_AT,
    },
    spec: {
      namespace,
      secretHandling,
      includeResourceTypes: isCuratedResource(resource)
        ? [{
            group: apiGroup(resource.apiVersion),
            version: apiVersion(resource.apiVersion),
            kind: resource.kind,
          }]
        : [],
    },
    status: {
      phase: 'Completed',
      resourceSummary: summarizeResourceDetails([detail]),
      resourceDetails: [detail],
      conditions: [
        {
          type: 'Completed',
          status: 'True',
          reason: 'LocalNamespaceScanCompleted',
          message: `Scanned 1 selected resource kinds in ${namespace}.`,
        },
      ],
    },
  };
}

export async function captureArchive(scan: NamespaceScan): Promise<ExpectedArchive> {
  let capturedBlob: Blob | undefined;
  const zipModule = resolveJSZip();

  const previousWindow = (globalThis as { window?: unknown }).window;
  const previousDocument = (globalThis as { document?: unknown }).document;

  (globalThis as { window: unknown }).window = {
    URL: {
      createObjectURL(blob: Blob) {
        capturedBlob = blob;
        return 'blob:fixture';
      },
      revokeObjectURL() {},
    },
    setTimeout(callback: (...args: unknown[]) => void) {
      callback();
      return 0;
    },
  };
  (globalThis as { document: unknown }).document = {
    createElement() {
      return {
        href: '',
        download: '',
        style: {},
        click() {},
        remove() {},
      };
    },
    body: {
      appendChild() {},
    },
  };

  try {
    const summary = await downloadScanArchive(scan);
    if (!capturedBlob) {
      throw new Error('download archive blob was not captured');
    }

    const zip = await zipModule.loadAsync(await capturedBlob.arrayBuffer());
    const files = await Promise.all(
      Object.keys(zip.files)
        .sort()
        .filter((filePath) => !zip.files[filePath].dir)
        .map(async (filePath) => {
          const content = await zip.files[filePath].async('string');
          if (filePath.endsWith('.yaml')) {
            return {
              path: filePath,
              type: 'yaml' as const,
              content: normalize(load(content)),
            };
          }
          return {
            path: filePath,
            type: 'text' as const,
            content,
          };
        }),
    );

    return normalize({
      archiveName: summary.archiveName,
      manifestCount: summary.manifestCount,
      warningCount: summary.warningCount,
      files,
    }) as ExpectedArchive;
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown archive error' };
  } finally {
    if (previousWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window: unknown }).window = previousWindow;
    }
    if (previousDocument === undefined) {
      delete (globalThis as { document?: unknown }).document;
    } else {
      (globalThis as { document: unknown }).document = previousDocument;
    }
  }
}

export function classificationForExpectation(classification: ResourceClassification): ResourceClassification {
  return normalize({
    apiVersion: classification.apiVersion,
    kind: classification.kind,
    name: classification.name,
    namespace: classification.namespace,
    classification: classification.classification,
    reason: classification.reason,
  }) as ResourceClassification;
}

export function sanitizedToYAML(resource: ResourceObject | undefined): string {
  return dump(resource ?? null, {
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  });
}

export async function writeJSON(filePath: string, value: unknown): Promise<void> {
  await fs.writeFile(filePath, `${JSON.stringify(normalize(value), null, 2)}\n`, 'utf8');
}

export async function readJSON<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
}

export function normalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item));
  }
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalize((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

function isCuratedResource(resource: ResourceObject): boolean {
  return RESOURCE_TYPE_OPTIONS.some(
    (option) => option.kind === resource.kind && option.group === apiGroup(resource.apiVersion) && option.version === apiVersion(resource.apiVersion),
  );
}

async function readFixtureConfig(dir: string): Promise<FixtureConfig> {
  const filePath = path.join(dir, 'fixture.json');
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8')) as FixtureConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

function apiGroup(value: string): string | undefined {
  const parts = value.split('/');
  return parts.length === 1 ? undefined : parts[0];
}

function apiVersion(value: string): string {
  const parts = value.split('/');
  return parts.length === 1 ? parts[0] : parts[1];
}

function resolveJSZip(): { loadAsync(data: ArrayBuffer): Promise<any> } {
  const runtime = JSZipRuntime as {
    loadAsync?: (data: ArrayBuffer) => Promise<any>;
    default?: { loadAsync?: (data: ArrayBuffer) => Promise<any> };
  };
  if (typeof runtime.loadAsync === 'function') {
    return runtime;
  }
  if (runtime.default && typeof runtime.default.loadAsync === 'function') {
    return runtime.default;
  }
  throw new Error('JSZip loadAsync is not available');
}
