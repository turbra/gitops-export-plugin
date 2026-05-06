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
        'getting-started/first-export',
        'getting-started/argocd-application',
        'getting-started/build-image',
      ],
    },
    {
      type: 'category',
      label: 'Concepts',
      collapsed: false,
      items: [
        'concepts/overview',
        'concepts/classification',
        'concepts/sanitization',
        'concepts/output',
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
        'reference/local-development',
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
      label: 'Project',
      collapsed: false,
      items: ['project/architecture', 'project/testing', 'project/related'],
    },
  ],
};

export default sidebars;
