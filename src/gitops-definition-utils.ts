import { dump } from 'js-yaml';
import { NamespaceScan, ResourceClassification } from './types';

export type GitOpsSyncMode = 'manual' | 'automated';

export type GitOpsDefinitionFormData = {
  applicationName: string;
  projectName: string;
  argoNamespace: string;
  repositoryUrl: string;
  revision: string;
  sourcePath: string;
  destinationServer: string;
  destinationNamespace: string;
  syncMode: GitOpsSyncMode;
  prune: boolean;
  selfHeal: boolean;
  createNamespace: boolean;
};

export type GitOpsDefinitionValidationErrors = Partial<Record<
  | 'applicationName'
  | 'projectName'
  | 'argoNamespace'
  | 'repositoryUrl'
  | 'revision'
  | 'sourcePath'
  | 'destinationServer'
  | 'destinationNamespace',
  string
>>;

export type GitOpsDefinitionResult = {
  fileName: string;
  kind: 'Application';
  resourceName: string;
  yaml: string;
};

const IN_CLUSTER_DESTINATION_SERVER = 'https://kubernetes.default.svc';
const DEFAULT_ARGO_NAMESPACE = 'openshift-gitops';
const DEFAULT_ARGO_PROJECT = 'default';

export function createDefaultGitOpsDefinitionForm(scan: NamespaceScan): GitOpsDefinitionFormData {
  const namespace = scan.spec.namespace || scan.metadata.namespace || 'application';

  return {
    applicationName: suggestApplicationName(scan),
    projectName: DEFAULT_ARGO_PROJECT,
    argoNamespace: DEFAULT_ARGO_NAMESPACE,
    repositoryUrl: '',
    revision: '',
    sourcePath: '',
    destinationServer: IN_CLUSTER_DESTINATION_SERVER,
    destinationNamespace: namespace,
    syncMode: 'manual',
    prune: true,
    selfHeal: true,
    createNamespace: false,
  };
}

export function getSuggestedSourcePath(scan: NamespaceScan): string {
  return `gitops-export/${scan.spec.namespace || scan.metadata.namespace}/manifests`;
}

export function validateGitOpsDefinitionForm(
  form: GitOpsDefinitionFormData,
): GitOpsDefinitionValidationErrors {
  const errors: GitOpsDefinitionValidationErrors = {};

  if (!form.applicationName.trim()) {
    errors.applicationName = 'Application name is required';
  }
  if (!form.projectName.trim()) {
    errors.projectName = 'Project name is required';
  }
  if (!form.argoNamespace.trim()) {
    errors.argoNamespace = 'Argo CD namespace is required';
  }
  if (!form.repositoryUrl.trim()) {
    errors.repositoryUrl = 'Repository URL is required';
  }
  if (!form.revision.trim()) {
    errors.revision = 'Revision is required';
  }
  if (!form.sourcePath.trim()) {
    errors.sourcePath = 'Path is required';
  }
  if (!form.destinationServer.trim()) {
    errors.destinationServer = 'Cluster URL is required';
  }
  if (!form.destinationNamespace.trim()) {
    errors.destinationNamespace = 'Destination namespace is required';
  }

  return errors;
}

export function generateGitOpsDefinition(
  form: GitOpsDefinitionFormData,
  scan: NamespaceScan,
): GitOpsDefinitionResult {
  const document = {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'Application',
    metadata: {
      name: form.applicationName.trim(),
      namespace: form.argoNamespace.trim(),
      labels: buildCommonLabels(scan),
    },
    spec: {
      project: form.projectName.trim(),
      source: {
        repoURL: form.repositoryUrl.trim(),
        targetRevision: form.revision.trim(),
        path: form.sourcePath.trim(),
        directory: {
          recurse: true,
        },
      },
      destination: {
        server: form.destinationServer.trim(),
        namespace: form.destinationNamespace.trim(),
      },
      ...buildSyncPolicy(form),
    },
  };

  return {
    fileName: `${toFileSafeName(form.applicationName.trim())}.yaml`,
    kind: 'Application',
    resourceName: form.applicationName.trim(),
    yaml: dump(document, {
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
    }),
  };
}

function buildSyncPolicy(form: GitOpsDefinitionFormData): Record<string, unknown> {
  if (form.syncMode !== 'automated' && !form.createNamespace) {
    return {};
  }

  const syncPolicy: Record<string, unknown> = {};

  if (form.syncMode === 'automated') {
    const automated: Record<string, boolean> = {};

    if (form.prune) {
      automated.prune = true;
    }
    if (form.selfHeal) {
      automated.selfHeal = true;
    }

    syncPolicy.automated = automated;
  }

  if (form.createNamespace) {
    syncPolicy.syncOptions = ['CreateNamespace=true'];
  }

  return { syncPolicy };
}

function buildCommonLabels(scan: NamespaceScan): Record<string, string> {
  return {
    'app.kubernetes.io/managed-by': 'gitops-export-console',
    'gitops-export/namespace': scan.spec.namespace || scan.metadata.namespace,
    'gitops-export/scanned-at': toLabelValue(scan.metadata.scannedAt),
  };
}

function suggestApplicationName(scan: NamespaceScan): string {
  const preferredKinds = new Set([
    'Deployment',
    'StatefulSet',
    'DaemonSet',
    'Job',
    'CronJob',
    'BuildConfig',
  ]);
  const preferredResource =
    scan.status.resourceDetails.find(
      (resource) =>
        resource.classification === 'include' && preferredKinds.has(resource.kind),
    ) ??
    scan.status.resourceDetails.find((resource) => resource.classification !== 'exclude');

  return preferredResource?.name || scan.spec.namespace || scan.metadata.namespace;
}

function toFileSafeName(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function toLabelValue(value: string): string {
  const normalized = value
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized.slice(0, 63) || 'scan';
}

export function summarizeExportContext(scan: NamespaceScan): string {
  const includedKinds = new Set(
    scan.status.resourceDetails
      .filter((resource) => resource.classification !== 'exclude')
      .map((resource) => resource.kind),
  );

  return `${includedKinds.size} exportable kinds from ${scan.spec.namespace || scan.metadata.namespace}`;
}

export function hasGeneratedReviewResources(scan: NamespaceScan): boolean {
  return scan.status.resourceDetails.some(
    (resource: ResourceClassification) => resource.classification === 'review',
  );
}
