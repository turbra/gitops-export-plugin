import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';

export function GitOpsExportIntroCard() {
  return (
    <Card isCompact>
      <CardHeader className="gitops-export-console__introHeader">
        <div className="gitops-export-console__introSummary">
          <CardTitle>Cluster-first to GitOps</CardTitle>
          <p className="gitops-export-console__introLead gitops-export-console__subtle">
            Scan and review resources in the active namespace from this details page.
          </p>
        </div>
      </CardHeader>
      <CardBody className="gitops-export-console__introMeta">
        <div className="gitops-export-console__introMetaItem">
          <span className="gitops-export-console__label">Access</span>
          <span className="gitops-export-console__subtle">
            Results follow your OpenShift RBAC in this namespace.
          </span>
        </div>
        <div className="gitops-export-console__introMetaItem">
          <span className="gitops-export-console__label">Current limitation</span>
          <span className="gitops-export-console__subtle">
            ZIP download and Argo CD Application generation are local only. Git provider push is not available yet.
          </span>
        </div>
      </CardBody>
    </Card>
  );
}
