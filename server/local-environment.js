import { loadEnv } from 'vite';

// Vite prefers process.env over files. Keep our own injected values from becoming
// permanent overrides when Vite reloads .env.local after a branch change.
const stateKey = Symbol.for('daymargin.local-api.environment');
const injected = globalThis[stateKey] ||= new Map();
const serverVariable = /^(DATABASE_URL(?:_UNPOOLED)?|NEON_[A-Z_]+|PRIVATE_NEON_API_KEY|GROQ_[A-Z_]+|FINN_[A-Z_]+)$/;

export function loadLocalEnvironment(mode, root) {
  for (const [name, { previous, value }] of injected) {
    if (process.env[name] !== value) continue;
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  }
  injected.clear();
  return loadEnv(mode, root, '');
}

export function applyLocalEnvironment(environment) {
  for (const [name, value] of Object.entries(environment)) {
    if (!serverVariable.test(name)) continue;
    const previous = injected.has(name) ? injected.get(name).previous : process.env[name];
    injected.set(name, { previous, value });
    process.env[name] = value;
  }
}
