#!/usr/bin/env node
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 12)) {
  console.error(`Faithful Days requires Node 22.12 or newer; found ${process.versions.node}. Use nvm use with the checked-in .nvmrc.`);
  process.exit(1);
}
console.log(`Supported Node runtime ${process.versions.node}`);
