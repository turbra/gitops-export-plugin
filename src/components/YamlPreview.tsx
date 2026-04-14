import * as React from 'react';
import { Spinner } from '@patternfly/react-core';
import { CodeEditor } from '@openshift-console/dynamic-plugin-sdk';

type YamlPreviewProps = {
  value: string;
};

export function YamlPreview({ value }: YamlPreviewProps) {
  return (
    <div className="gitops-export-console__preview">
      <React.Suspense fallback={<Spinner size="md" />}>
        <CodeEditor
          value={value}
          language="yaml"
          minHeight="18rem"
          showShortcuts={false}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
          }}
        />
      </React.Suspense>
    </div>
  );
}
