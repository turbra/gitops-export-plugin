import { execFileSync } from 'child_process';

const exactTagPattern = /^v?(\d+\.\d+\.\d+)$/;
const describedTagPattern = /^v?(\d+\.\d+\.\d+)-(\d+)-g([0-9a-f]+)(-dirty)?$/;
const shaPattern = /^([0-9a-f]+)(-dirty)?$/;

function gitDescribe(): string | null {
  if (process.env.GITOPS_EXPORT_VERSION) {
    return process.env.GITOPS_EXPORT_VERSION;
  }

  try {
    return execFileSync('git', ['describe', '--tags', '--match', 'v[0-9]*', '--dirty', '--always'], {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

export function getBuildVersion(): string {
  const described = gitDescribe();
  if (!described) {
    return '0.0.0';
  }

  const exactMatch = described.match(exactTagPattern);
  if (exactMatch) {
    return exactMatch[1];
  }

  const describedMatch = described.match(describedTagPattern);
  if (describedMatch) {
    const [, tag, commitCount, sha, dirtySuffix] = describedMatch;
    const buildSuffix = dirtySuffix ? `${sha}.dirty` : sha;
    return `${tag}-dev.${commitCount}+${buildSuffix}`;
  }

  const shaMatch = described.match(shaPattern);
  if (shaMatch) {
    const [, sha, dirtySuffix] = shaMatch;
    const buildSuffix = dirtySuffix ? `${sha}.dirty` : sha;
    return `0.0.0-dev+${buildSuffix}`;
  }

  return '0.0.0';
}

const buildVersion = getBuildVersion();

export default buildVersion;
