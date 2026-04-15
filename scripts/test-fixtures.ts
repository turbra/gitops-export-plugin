import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { load } from 'js-yaml';

import {
  captureArchive,
  classificationForExpectation,
  classifyCuratedResource,
  createFixtureScan,
  listFixtureNames,
  loadFixture,
  normalize,
  readJSON,
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

    const expectedClassification = await readJSON(path.join(fixture.dir, 'expected-classification.json'));
    const expectedArchive = await readJSON(path.join(fixture.dir, 'expected-archive.json'));
    const expectedSanitized = normalize(
      load(await fs.readFile(path.join(fixture.dir, 'expected-sanitized.yaml'), 'utf8')),
    );

    assert.deepStrictEqual(
      classificationForExpectation(classification),
      expectedClassification,
      `${name}: classification mismatch`,
    );
    assert.deepStrictEqual(normalize(sanitized ?? null), expectedSanitized, `${name}: sanitized YAML mismatch`);
    assert.deepStrictEqual(archive, expectedArchive, `${name}: archive mismatch`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
