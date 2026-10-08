#!/usr/bin/env node
// Real built worker, controlled response revision; no backend or user content.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { onboardSkip, hold, routineButton, STORE_KEY } = require('./lib.cjs');
let generation=1;
const root=path.resolve('dist');
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  let file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file=path.join(root,'index.html');
  const type={'.js':'application/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.json':'application/json','.png':'image/png'}[path.extname(file)] || 'application/octet-stream';
  res.setHeader('Content-Type',type);
  res.setHeader('Cache-Control','no-store');
  const bytes=fs.readFileSync(file);
  res.end(pathname==='/sw.js'?Buffer.concat([bytes,Buffer.from(`\n// test worker generation ${generation}\n`)]):bytes);
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch();
  try {
    const context=await browser.newContext({locale:'en-CA',serviceWorkers:'allow'});
    await context.addInitScript(()=>{ delete window.BeforeInstallPromptEvent; });
    const page=await context.newPage();
    await page.clock.install({time:new Date(2026,9,6,10)});
    await page.goto(base,{waitUntil:'networkidle'});
    assert.equal(await page.evaluate(()=> 'BeforeInstallPromptEvent' in window),false,'test must run without install-prompt support');
    await page.evaluate(()=>navigator.serviceWorker.ready);
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    assert.equal(await page.getByText('New version available',{exact:true}).count(),0,'first install must not claim an update');
    console.log('SW first install ready');
    await onboardSkip(page);
    await hold(page,routineButton(page,'Daily text'));
    const saved=await page.evaluate(key=>localStorage.getItem(key),STORE_KEY);
    assert.ok(JSON.parse(saved).log.length>0,'completed routine persisted');
    console.log('Testing offline navigation');
    await context.setOffline(true);
    await page.goto(`${base}/plans`,{waitUntil:'domcontentloaded'});
    await page.getByRole('heading',{name:'Plans',exact:true}).waitFor();
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),STORE_KEY),saved,'offline navigation retained all stored state');
    await page.goto(`${base}/share?text=offline%20capture`,{waitUntil:'domcontentloaded'});
    await page.getByText('offline capture',{exact:true}).waitFor();
    await context.setOffline(false);
    await page.goto(base,{waitUntil:'networkidle'});
    console.log('Testing waiting worker update');
    generation=2;
    await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
    await page.getByText('New version available',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>!!navigator.serviceWorker.controller),true);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),STORE_KEY),saved,'waiting update did not replace user state');
    await Promise.all([
      page.waitForNavigation({waitUntil:'networkidle'}),
      page.getByRole('button',{name:'Update',exact:true}).click()
    ]);
    console.log('Testing offline navigation');
    await context.setOffline(true);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.getByTestId('today').waitFor();
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),STORE_KEY),saved,'activated update and offline reload retained state');
    await context.setOffline(false);
    const newerRaw=JSON.stringify({...JSON.parse(saved),version:4,futureNotes:['Synthetic note']},null,2);
    await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:STORE_KEY,raw:newerRaw});
    await page.reload({waitUntil:'networkidle'});
    await page.getByRole('heading',{name:'Update Faithful Days to open your data'}).waitFor();
    generation=3;
    await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
    await page.getByText('New version available',{exact:true}).waitFor();
    await Promise.all([
      page.waitForNavigation({waitUntil:'networkidle'}),
      page.getByRole('button',{name:'Update',exact:true}).click()
    ]);
    await page.getByRole('heading',{name:'Update Faithful Days to open your data'}).waitFor();
    await context.setOffline(true);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.getByRole('heading',{name:'Update Faithful Days to open your data'}).waitFor();
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),STORE_KEY),newerRaw,'recovery update and offline reload retained unknown newer data exactly');
    console.log('Recovery worker update without install-prompt support retained newer data.');
    console.log('SW install, offline deep links/lazy Share, waiting update, activation and retained state passed.');
    await context.close();
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
