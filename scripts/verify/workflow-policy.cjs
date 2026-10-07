#!/usr/bin/env node
// Every remote action must be immutable, including read-only workflows.
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const root = process.argv[2] || '.github/workflows';
let failed = false;
for (const file of fs.readdirSync(root).filter((name) => /\.ya?ml$/.test(name))) {
  const doc = yaml.load(fs.readFileSync(path.join(root, file), 'utf8'));
  for (const [name, job] of Object.entries(doc.jobs || {})) {
    const refs = [job.uses, ...(job.steps || []).map((step) => step.uses)].filter(Boolean);
    for (const ref of refs) {
      if (ref.startsWith('./')) continue;
      if (!/^[\w./-]+@[0-9a-f]{40}$/.test(ref)) {
        console.error(`${file}/${name}: mutable remote action ${ref}`);
        failed = true;
      }
    }
  }
}
if (failed) process.exit(1);
console.log('All remote workflow references are pinned to full commit SHAs.');
