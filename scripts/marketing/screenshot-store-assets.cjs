#!/usr/bin/env node
// Current Faithful Days UI with synthetic records; no widget/device fabrication.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const sharp=require('sharp');
const BASE=process.argv[2] || 'http://localhost:4173';
const OUT=process.env.STORE_ASSET_DIR || path.resolve('store-screenshots');
const TODAY='2026-10-06';
const targets=[
  {name:'iphone-medium',width:393,height:852,scale:3},
  {name:'iphone-large',width:440,height:956,scale:3},
  {name:'ipad-13',width:1032,height:1376,scale:2},
  {name:'android-phone',width:360,height:640,scale:3},
];
(async()=>{
  const domain=await import(pathToFileURL(path.resolve('src/domain/store.js')));
  const plans=await import(pathToFileURL(path.resolve('src/domain/plans.js')));
  const {addDays}=await import(pathToFileURL(path.resolve('src/domain/day.js')));
  let seed=domain.defaultStore('2026-09-14','en');
  seed.onboardingDone=true;
  seed.lastSeenDay=TODAY;
  seed.schedule[0].meetingDays=[2,0];
  for(let day='2026-09-14',n=0;day<=TODAY;day=addDays(day,1),n++) {
    seed=domain.addCheckIn(seed,{routine:'dailyText',day,value:true});
    seed=domain.addCheckIn(seed,{routine:'bibleReading',day,value:{chapters:[n*3,n*3+1,n*3+2]}});
  }
  let result=plans.createPlan(seed,{title:'Patience in everyday life',kind:'study',steps:[
    {title:'Choose a personal question'},{title:'List practical ideas'},{title:'Try one idea this week'}
  ]},'2026-09-21');
  seed=plans.setActiveStudy(result.store,result.planId);
  seed.plans[0].steps[0].doneOn='2026-10-04';
  seed.plans[0].steps[1].doneOn='2026-10-05';
  seed=plans.createPlan(seed,{title:'Family discussion',kind:'family',steps:[
    {title:'Choose a topic together'},{title:'Plan a practical activity'}
  ]},'2026-09-28').store;
  const {newlyEarned}=await import(pathToFileURL(path.resolve('src/domain/badges.js')));
  for(const id of newlyEarned(seed,TODAY)) seed.badges[id]=TODAY;
  if(!domain.validateStore(seed).ok) throw Error('Synthetic screenshot fixture is invalid');
  fs.mkdirSync(OUT,{recursive:true});
  const browser=await chromium.launch();
  const manifest=[];
  try {
    for(const target of targets) for(const theme of ['light','dark']) {
      for(const shot of [
        {name:'today',route:'/',hour:10},
        {name:'wrap-up',route:'/',hour:21},
        {name:'plans',route:'/plans',hour:10},
        {name:'progress',route:'/progress',hour:10},
        {name:'onboarding',route:'/',hour:10,onboarding:true}
      ]) {
        const ctx=await browser.newContext({locale:'en-CA',viewport:{width:target.width,height:target.height},deviceScaleFactor:target.scale,colorScheme:theme,reducedMotion:'reduce',serviceWorkers:'block'});
        const page=await ctx.newPage();
        await page.clock.install({time:new Date(2026,9,6,shot.hour)});
        const fixture={...seed,theme,onboardingDone:!shot.onboarding};
        await page.addInitScript(store=>{
          localStorage.setItem('jw-habits-v2',JSON.stringify(store));
          localStorage.setItem('fd-boot-theme',store.theme);
          localStorage.setItem('installPromptDismissed','true');
        },fixture);
        await page.goto(BASE.replace(/\/$/,'')+shot.route,{waitUntil:'networkidle'});
        await page.evaluate(()=>document.fonts.ready);
        const file=`${shot.name}-${target.name}-${theme}.png`;
        const bytes=await page.screenshot({fullPage:false,omitBackground:false});
        await sharp(bytes).flatten({background:'#ffffff'}).removeAlpha().png().toFile(path.join(OUT,file));
        const meta=await sharp(path.join(OUT,file)).metadata();
        if(meta.width!==target.width*target.scale || meta.height!==target.height*target.scale || meta.hasAlpha) throw Error('Invalid screenshot export');
        manifest.push({file,width:meta.width,height:meta.height,theme,route:shot.route,synthetic:true,source:'browser-rendered current app; native device recapture required'});
        await ctx.close();
      }
      console.log(`Captured ${target.name} ${theme}`);
    }
  } finally {await browser.close();}
  fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify(manifest,null,2));
  console.log(`Captured ${manifest.length} current UI assets in ${OUT}; widget captures require real native devices.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
