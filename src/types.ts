export type ObjectMeta = {
  name: string;
  namespace?: string;
  creationTimestamp?: string;
};

export type Condition = {
  type: string;
  status: string;
  reason: string;
  message: string;
  lastTransitionTime?: string;
};

export type GroupVersionKind = {
  group?: string;
  version?: string;
  kind: string;
};

export type ResourceSummary = {
  total?: number;
  included?: number;
  includedWithCleanup?: number;
  needsReview?: number;
  excluded?: number;
};

export type ResourceClassification = {
  apiVersion: string;
  kind: string;
  name: string;
  namespace?: string;
  classification: 'include' | 'cleanup' | 'review' | 'exclude';
  reason: string;
  preview?: string;
  sanitizedResource?: ResourceObject;
};

export type ResourceObject = {
  apiVersion: string;
  kind: string;
  metadata: ObjectMeta & {
    annotations?: Record<string, string>;
    labels?: Record<string, string>;
    ownerReferences?: unknown[];
    finalizers?: string[];
  };
  spec?: Record<string, unknown>;
  status?: unknown;
  [key: string]: unknown;
};

export type NamespaceScan = {
  metadata: {
    namespace: string;
    scannedAt: string;
  };
  spec: {
    namespace: string;
    includeResourceTypes?: GroupVersionKind[];
    secretHandling?: string;
  };
  status: {
    phase: 'Completed';
    resourceSummary: ResourceSummary;
    resourceDetails: ResourceClassification[];
    conditions?: Condition[];
  };
};
