import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';

export function GitOpsExportIntroCard() {
  const { t } = useTranslation('plugin__gitops-export-console');

  return (
    <Card isCompact>
      <CardHeader className="gitops-export-console__introHeader">
        <div className="gitops-export-console__introSummary">
          <CardTitle>{t('Cluster-first to GitOps')}</CardTitle>
          <p className="gitops-export-console__introLead gitops-export-console__subtle">
            {t('Scan and review resources in the active namespace from this details page.')}
          </p>
        </div>
      </CardHeader>
      <CardBody className="gitops-export-console__introMeta">
        <div className="gitops-export-console__introMetaItem">
          <span className="gitops-export-console__label">{t('Access')}</span>
          <span className="gitops-export-console__subtle">
            {t('Results follow your OpenShift RBAC in this namespace.')}
          </span>
        </div>
        <div className="gitops-export-console__introMetaItem">
          <span className="gitops-export-console__label">{t('Current limitation')}</span>
          <span className="gitops-export-console__subtle">
            {t(
              'ZIP download and Argo CD Application generation are local only. Git provider push is not available yet.',
            )}
          </span>
        </div>
      </CardBody>
    </Card>
  );
}
