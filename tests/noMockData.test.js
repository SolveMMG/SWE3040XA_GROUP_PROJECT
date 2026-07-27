import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const pages = readdirSync('src/pages').map((file) => readFileSync(join('src/pages', file), 'utf8')).join('\n');

describe('live API frontend', () => {
  it('does not depend on the removed mock data module', () => {
    assert.equal(pages.includes('mockData'), false);
  });
});
