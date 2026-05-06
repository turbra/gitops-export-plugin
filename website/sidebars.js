// @ts-check

const sidebars = {
  docs: [
    'home',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/installation',
        'getting-started/first-scan',
        'getting-started/export-zip',
        'getting-started/argocd-application',
      ],
    },
    {
      type: 'category',
      label: 'Concepts',
      collapsed: false,
      items: [
        'concepts/overview',
        'concepts/modes',
        'concepts/classification',
        'concepts/sanitization',
        'concepts/gitops-output',
        'concepts/security',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: false,
      items: [
        'reference/index',
        'reference/install-manifests',
        'reference/rbac',
        'reference/versioning',
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      collapsed: false,
      items: ['examples/index'],
    },
    {
      type: 'category',
      label: 'Development',
      collapsed: false,
      items: [
        'development/local-plugin-development',
        'development/build-image',
        'development/testing',
      ],
    },
    {
      type: 'category',
      label: 'Project',
      collapsed: false,
      items: ['project/architecture', 'project/related'],
    },
  ],
};

export default sidebars;
