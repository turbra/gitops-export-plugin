// @ts-check

const config = {
  title: 'GitOps Export',
  tagline: 'OpenShift console plugin for GitOps-ready namespace exports',
  favicon: 'img/gitops-export-favicon.svg',

  url: 'https://turbra.github.io',
  baseUrl: '/gitops-export-plugin/',
  trailingSlash: true,

  organizationName: 'turbra',
  projectName: 'gitops-export-plugin',

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: 'docs',
          routeBasePath: '/',
          sidebarPath: './sidebars.js',
          editUrl:
            'https://github.com/turbra/gitops-export-plugin/edit/main/website/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      },
    ],
  ],

  themeConfig: {
    image: 'img/gitops-export-favicon.svg',
    navbar: {
      title: 'GitOps Export',
      logo: {
        alt: 'GitOps Export',
        src: 'img/gitops-export-favicon.svg',
      },
      items: [
        {to: '/', position: 'left', label: 'Docs'},
        {
          to: '/getting-started/installation/',
          position: 'left',
          label: 'Getting Started',
        },
        {
          to: '/reference/',
          position: 'left',
          label: 'Reference',
        },
        {
          to: '/examples/',
          position: 'left',
          label: 'Examples',
        },
        {
          href: 'https://github.com/turbra/gitops-export-plugin',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'light',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Overview', to: '/'},
            {label: 'Installation', to: '/getting-started/installation/'},
            {label: 'First Scan', to: '/getting-started/first-scan/'},
            {label: 'Export ZIP', to: '/getting-started/export-zip/'},
            {label: 'Concepts', to: '/concepts/overview/'},
            {label: 'Reference', to: '/reference/'},
            {label: 'Examples', to: '/examples/'},
            {label: 'Development', to: '/development/local-plugin-development/'},
          ],
        },
        {
          title: 'Project',
          items: [
            {
              label: 'Repository',
              href: 'https://github.com/turbra/gitops-export-plugin',
            },
            {
              label: 'Issues',
              href: 'https://github.com/turbra/gitops-export-plugin/issues',
            },
            {
              label: 'Releases',
              href: 'https://github.com/turbra/gitops-export-plugin/releases',
            },
          ],
        },
        {
          title: 'Related',
          items: [
            {
              label: 'scrubctl',
              href: 'https://github.com/turbra/scrubctl',
            },
            {
              label: 'OpenShift Dynamic Plugins',
              href: 'https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/web_console/dynamic-plugins',
            },
          ],
        },
      ],
      copyright: `Apache-2.0. Built from the GitOps Export Plugin repository.`,
    },
    prism: {
      additionalLanguages: ['bash', 'json', 'powershell', 'yaml'],
    },
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 3,
    },
  },
};

export default config;
