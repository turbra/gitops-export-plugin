import { ConsolePluginBuildMetadata } from '@openshift-console/dynamic-plugin-sdk-webpack';
import buildVersion from './version';

const metadata: ConsolePluginBuildMetadata = {
  dependencies: {
    '@console/pluginAPI': '^4.20.0',
  },
  name: 'gitops-export-console',
  displayName: 'GitOps Export',
  version: buildVersion,
  description: 'Scan and review namespace resources for GitOps export from the OpenShift console.',
  exposedModules: {
    GitOpsExportPage: './components/GitOpsExportPage',
  },
};

export default metadata;
