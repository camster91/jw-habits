#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const {gzipSync} = require('node:zlib');
const root = process.env.BUDGET_DIST || 'dist';
let js = 0, css = 0;
function walk(dir) {
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const file=path.join(dir,entry.name);
    if(entry.isDirectory()) walk(file);
    else if(/\.(js|css)$/.test(file)) {
      const size=gzipSync(fs.readFileSync(file)).length;
      if(file.endsWith('.js')) js+=size; else css+=size;
    }
  }
}
walk(root);
const measured={jsGzip:js,cssGzip:css};
const limits={jsGzip:Number(process.env.BUDGET_JS_GZIP_BYTES || 210000),cssGzip:30000};
console.log(JSON.stringify({measured,limits},null,2));
if(Object.keys(limits).some(key=>measured[key]>limits[key])) { console.error('Production bundle budget exceeded');process.exit(1); }
