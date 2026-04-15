import * as path from 'node:path';
import * as fs from 'node:fs/promises';

import {
  captureArchive,
  classificationForExpectation,
  classifyCuratedResource,
  createFixtureScan,
  listFixtureNames,
  loadFixture,
  sanitizedToYAML,
  writeJSON,
} from './fixture-lib';
import { sanitizeResource } from '../src/scan-utils';

async function main(): Promise<void> {
  for (const name of await listFixtureNames()) {
    const fixture = await loadFixture(name);
    const classification = classifyCuratedResource(fixture.input);
    const sanitized = sanitizeResource(
      fixture.input,
      classification.classification,
      fixture.config.secretHandling || 'redact',
    );
    const scan = createFixtureScan(fixture.input, fixture.config, classification);
    const archive = await captureArchive(scan);

    await writeJSON(
      path.join(fixture.dir, 'expected-classification.json'),
      classificationForExpectation(classification),
    );
    await fs.writeFile(
      path.join(fixture.dir, 'expected-sanitized.yaml'),
      sanitizedToYAML(sanitized),
      'utf8',
    );
    await writeJSON(path.join(fixture.dir, 'expected-archive.json'), archive);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
