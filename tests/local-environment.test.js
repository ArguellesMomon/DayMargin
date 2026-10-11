import { expect, test } from 'vitest';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyLocalEnvironment, loadLocalEnvironment } from '../server/local-environment.js';

test('branch changes reload Auth and database together without retaining the removed branch', () => {
  const root = mkdtempSync(join(tmpdir(), 'daymargin-env-'));
  const names = ['NEON_AUTH_BASE_URL', 'DATABASE_URL', 'GROQ_MODEL'];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  try {
    for (const name of names) delete process.env[name];
    process.env.GROQ_MODEL = 'shell-selected-model';
    writeFileSync(join(root, '.env.local'), 'NEON_AUTH_BASE_URL=https://test.example/auth\nDATABASE_URL=postgres://test.example/db\nGROQ_MODEL=file-model\n');
    applyLocalEnvironment(loadLocalEnvironment('development', root));
    expect(process.env.NEON_AUTH_BASE_URL).toBe('https://test.example/auth');
    writeFileSync(join(root, '.env.local'), 'NEON_AUTH_BASE_URL=https://production.example/auth\nDATABASE_URL=postgres://production.example/db\nGROQ_MODEL=file-model\n');
    applyLocalEnvironment(loadLocalEnvironment('development', root));
    expect(process.env.NEON_AUTH_BASE_URL).toBe('https://production.example/auth');
    expect(process.env.DATABASE_URL).toBe('postgres://production.example/db');
    expect(process.env.GROQ_MODEL).toBe('shell-selected-model');
    // Removing a file variable also clears the last value we injected.
    writeFileSync(join(root, '.env.local'), '');
    applyLocalEnvironment(loadLocalEnvironment('development', root));
    expect(process.env.NEON_AUTH_BASE_URL).toBeUndefined();
    expect(process.env.DATABASE_URL).toBeUndefined();
  } finally {
    loadLocalEnvironment('development', root);
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
    unlinkSync(join(root, '.env.local'));
    rmdirSync(root);
  }
});
