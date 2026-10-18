import * as THREE from 'three'
import { t, tn, onLocaleChange } from '../i18n'
/* opts = { store: Pinia store sink, els: {stage,fx,conf,tag,panel} }.
   The engine pushes structured "snapshots" into the store; Vue renders them.
   Still engine-owned: renderer canvas (#stage), fx pops, confetti canvas, tag3d, floor panel el. */
export function createEngine(opts){
'use strict';
const $=s=>document.querySelector(s);
const store=opts&&opts.store||{};
const els=opts&&opts.els||{};
const put=(k,v)=>{if(store.put)store.put(k,v);};
const putLive=p=>put('live',p);
const flashes={combo:false,score:false};
const TAU=Math.PI*2;
let RNG=Math.random;
const rand=(a,b)=>a+RNG()*(b-a);
const irand=(a,b)=>Math.floor(rand(a,b+1));
const pick=a=>a[Math.floor(RNG()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angDiff=(a,b)=>{let d=a-b;while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;return d;};
const pad=(n,l=2)=>String(n).padStart(l,'0');
const fmtT=m=>{m=((Math.floor(m)%1440)+1440)%1440;return pad(Math.floor(m/60))+':'+pad(m%60);};
const fmtN=n=>Math.round(n).toLocaleString('en-US');
const fmtDur=m=>{m=Math.max(0,Math.round(m));return m>=60?Math.floor(m/60)+'h '+pad(m%60)+'m':m+' min';};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}

const STAR='<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/></svg>';
const I=(p,f)=>'<svg viewBox="0 0 24 24" fill="'+(f?'currentColor':'none')+'" stroke="'+(f?'none':'currentColor')+'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';
const ICON={
  lock:I('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  truck:I('<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'),
  fl:I('<path d="M4 18V9h6l2 4v5"/><path d="M15 4v14h6"/><circle cx="6" cy="18.5" r="1.6"/><circle cx="11" cy="18.5" r="1.6"/>'),
  wrench:I('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>'),
  drop:I('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'),
  bolt:I('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  clock:I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  box:I('<path d="M12 3 4 7.5v9L12 21l8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>'),
  trophy:I('<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9.5 17h5"/>'),
  up:I('<path d="M12 19V5M5 12l7-7 7 7"/>'),
  flame:I('<path d="M12 22c4 0 7-2.7 7-6.6 0-3.1-2-5.4-3.4-7.1-.4 1.8-1.4 3-2.6 3.4.4-3.2-.9-6.6-3.5-8.7.2 3.4-1.6 5.6-3.3 7.6C4.9 12.2 5 13.8 5 15.4 5 19.3 8 22 12 22z"/>'),
  play:I('<path d="M7 4v16l13-8z"/>',true),
  star:STAR,
  hammer:I('<path d="m14 6 4 4M3 21l9-9M12.5 4.5 16 1l7 7-3.5 3.5z"/><path d="m11 13 3-3"/>'),
  dock:I('<path d="M3 21V8l9-5 9 5v13"/><path d="M7 21v-8h10v8M7 17h10"/>'),
  rack:I('<path d="M5 3v18M19 3v18M5 8h14M5 14h14M5 20h14"/>'),
  plug:I('<path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0zM12 17v5"/>'),
  coffee:I('<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3"/>'),
  leaf:I('<path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15zM5 19l7-7"/>'),
  map:I('<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'),
  road:I('<path d="M6 3 3 21M18 3l3 18M12 4v3M12 10v3M12 16v4"/>'),
  home:I('<path d="M3 11 12 4l9 7v9H3z"/><path d="M9 20v-6h6v6"/>'),
  shop:I('<path d="M4 9h16l-1-5H5zM5 9v11h14V9M9 20v-6h6v6"/>'),
  office:I('<path d="M5 21V3h14v18M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>'),
  target:I('<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="1.5"/>'),
  expand:I('<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>'),
  x:I('<path d="M6 6l12 12M18 6 6 18"/>'),
  sound:I('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>'),
  mute:I('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m17 9 5 5M22 9l-5 5"/>'),
};

/* ---------------- data ---------------- */
const SKUS={
  LED:{get name(){return t('data.sku.LED')},code:'LED-6060',color:'#d8a66a',units:48,h:.85,pop:2},
  CHR:{get name(){return t('data.sku.CHR')},code:'CHR-OF2',color:'#b98455',units:16,h:1.05,pop:1},
  BOX:{get name(){return t('data.sku.BOX')},code:'BOX-M40',color:'#e6c088',units:250,h:.72,pop:3},
  GLV:{get name(){return t('data.sku.GLV')},code:'GLV-NT9',color:'#5b80e8',units:600,h:.7,pop:3},
  BRK:{get name(){return t('data.sku.BRK')},code:'BRK-S12',color:'#a3afc0',units:320,h:.55,pop:2},
};
const SKU_KEYS=Object.keys(SKUS);
const CARRIERS=[
  {name:'Nordline',tag:'Northbound & beyond',stripe:'#25a69a',from:'Albany, NY'},
  {name:'Bluepeak',tag:'Freight from the peak',stripe:'#2c4bb3',from:'Scranton, PA'},
  {name:'Cargoviva',tag:'Live cargo, on time',stripe:'#e0664f',from:'Baltimore, MD'},
  {name:'WareTrack',tag:'Freight that feels like a game',stripe:'#2f5be0',cab:'#2f5be0',from:'Edison, NJ'},
  {name:'Halvard',tag:'Heavy haul since 1998',stripe:'#8a5cd6',from:'Hartford, CT'},
];
const SITES=[
  {code:'WH-02',name:'Northgate DC',k:0,type:'dc',addr:'480 Northgate Blvd, Newark NJ',accent:'#3a5fd8',floor:'#f4f7fb',
   bays:4,rows:4,forklifts:3,seed:35,orderRate:[12,17],truckRate:[50,70],eventRate:[60,95],orderSla:55,diff:1,dailyTarget:380,
   goals:{recv:28,ship:22,ontime:85},get blurb(){return t('data.site.northgate')}},
  {code:'WH-01',name:'Riverside Hub',k:-1,type:'depot',addr:'77 River Road, Paterson NJ',accent:'#2f8fd8',floor:'#f3f7fc',
   bays:2,rows:3,forklifts:3,seed:28,orderRate:[15,20],truckRate:[80,105],eventRate:[70,100],orderSla:60,diff:1,dailyTarget:300,
   goals:{recv:18,ship:18,ontime:85},get blurb(){return t('data.site.riverside')}},
  {code:'WH-03',name:'Eastport Cold Chain',k:1,type:'cold',addr:'12 Pier Road, Elizabeth NJ',accent:'#1f8f86',floor:'#f2f7f6',
   bays:5,rows:3,forklifts:3,seed:30,orderRate:[13,18],truckRate:[42,58],eventRate:[50,80],orderSla:50,diff:2,dailyTarget:420,
   goals:{recv:36,ship:22,ontime:85},get blurb(){return t('data.site.eastport')}},
  {code:'WH-04',name:'Southfield Cross-Dock',k:-2,type:'cross',addr:'301 Southfield Ave, Edison NJ',accent:'#e0664f',floor:'#fbf5f3',
   bays:5,rows:3,forklifts:4,seed:26,orderRate:[11,15],truckRate:[34,46],eventRate:[48,76],orderSla:45,diff:3,dailyTarget:440,
   goals:{recv:40,ship:26,ontime:85},get blurb(){return t('data.site.southfield')}},
  {code:'WH-05',name:'Westgate Robotics Hub',k:2,type:'robot',addr:'9 Summit Pkwy, Allentown PA',accent:'#6a4fd0',floor:'#f4f4fb',
   bays:3,rows:4,forklifts:3,seed:44,orderRate:[10,13],truckRate:[75,100],eventRate:[38,62],orderSla:45,diff:3,dailyTarget:320,
   goals:{recv:20,ship:32,ontime:85},get blurb(){return t('data.site.westgate')}},
];
const UPGRADES=[
  {key:'fl',get name(){return t('data.upgrade.fl.name')},get desc(){return t('data.upgrade.fl.desc')},costs:[120,240]},
  {key:'spd',get name(){return t('data.upgrade.spd.name')},get desc(){return t('data.upgrade.spd.desc')},costs:[90,180]},
  {key:'chg',get name(){return t('data.upgrade.chg.name')},get desc(){return t('data.upgrade.chg.desc')},costs:[80]},
];
const MODS={
  rush:{get name(){return t('data.mod.rush.name')},get desc(){return t('data.mod.rush.desc')}},
  heavy:{get name(){return t('data.mod.heavy.name')},get desc(){return t('data.mod.heavy.desc')}},
  brown:{get name(){return t('data.mod.brown.name')},get desc(){return t('data.mod.brown.desc')}},
  short:{get name(){return t('data.mod.short.name')},get desc(){return t('data.mod.short.desc')}},
  tight:{get name(){return t('data.mod.tight.name')},get desc(){return t('data.mod.tight.desc')}},
  calm:{get name(){return t('data.mod.calm.name')},get desc(){return t('data.mod.calm.desc')}},
};
const COSMETICS=[
  {id:'fl-classic',kind:'fl',get name(){return t('data.cos.flClassic')},body:'#f4b63a',cw:'#d8962a',cost:0},
  {id:'fl-cobalt',kind:'fl',get name(){return t('data.cos.flCobalt')},body:'#4f74e6',cw:'#3a58c0',cost:60},
  {id:'fl-mint',kind:'fl',get name(){return t('data.cos.flMint')},body:'#5cc9a7',cw:'#3fa587',cost:60},
  {id:'fl-flamingo',kind:'fl',get name(){return t('data.cos.flFlamingo')},body:'#f08aa8',cw:'#d06b8a',cost:80},
  {id:'fl-graphite',kind:'fl',get name(){return t('data.cos.flGraphite')},body:'#5a6476',cw:'#434b5a',cost:80},
  {id:'van-classic',kind:'van',get name(){return t('data.cos.vanClassic')},body:'#2f5be0',cost:0},
  {id:'van-sunset',kind:'van',get name(){return t('data.cos.vanSunset')},body:'#f08a3c',cost:50},
  {id:'van-forest',kind:'van',get name(){return t('data.cos.vanForest')},body:'#3f9a62',cost:50},
  {id:'van-midnight',kind:'van',get name(){return t('data.cos.vanMidnight')},body:'#2a3555',cost:70},
];
const RANKS=['trainee','dockHand','forkliftPro','shiftLead','supervisor','opsManager','siteDirector','logisticsLegend'];
const ACH=[
  {id:'tutorial',get name(){return t('data.ach.tutorial.name')},get desc(){return t('data.ach.tutorial.desc')}},
  {id:'first',get name(){return t('data.ach.first.name')},get desc(){return t('data.ach.first.desc')}},
  {id:'three',get name(){return t('data.ach.three.name')},get desc(){return t('data.ach.three.desc')}},
  {id:'score1k',get name(){return t('data.ach.score1k.name')},get desc(){return t('data.ach.score1k.desc')}},
  {id:'combo2',get name(){return t('data.ach.combo2.name')},get desc(){return t('data.ach.combo2.desc')}},
  {id:'nolate',get name(){return t('data.ach.nolate.name')},get desc(){return t('data.ach.nolate.desc')}},
  {id:'pallets50',get name(){return t('data.ach.pallets50.name')},get desc(){return t('data.ach.pallets50.desc')}},
  {id:'fast5',get name(){return t('data.ach.fast5.name')},get desc(){return t('data.ach.fast5.desc')}},
  {id:'rush5',get name(){return t('data.ach.rush5.name')},get desc(){return t('data.ach.rush5.desc')}},
  {id:'thrifty',get name(){return t('data.ach.thrifty.name')},get desc(){return t('data.ach.thrifty.desc')}},
  {id:'fixer',get name(){return t('data.ach.fixer.name')},get desc(){return t('data.ach.fixer.desc')}},
  {id:'allsites',get name(){return t('data.ach.allsites.name')},get desc(){return t('data.ach.allsites.desc')}},
  {id:'summit',get name(){return t('data.ach.summit.name')},get desc(){return t('data.ach.summit.desc')}},
  {id:'daily1',get name(){return t('data.ach.daily1.name')},get desc(){return t('data.ach.daily1.desc')}},
  {id:'streak3',get name(){return t('data.ach.streak3.name')},get desc(){return t('data.ach.streak3.desc')}},
  {id:'streak7',get name(){return t('data.ach.streak7.name')},get desc(){return t('data.ach.streak7.desc')}},
  {id:'builder',get name(){return t('data.ach.builder.name')},get desc(){return t('data.ach.builder.desc')}},
  {id:'decor',get name(){return t('data.ach.decor.name')},get desc(){return t('data.ach.decor.desc')}},
  {id:'maxed',get name(){return t('data.ach.maxed.name')},get desc(){return t('data.ach.maxed.desc')}},
  {id:'level5',get name(){return t('data.ach.level5.name')},get desc(){return t('data.ach.level5.desc')}},
  {id:'landlord',get name(){return t('data.ach.landlord.name')},get desc(){return t('data.ach.landlord.desc')}},
  {id:'mayor',get name(){return t('data.ach.mayor.name')},get desc(){return t('data.ach.mayor.desc')}},
  {id:'tycoon',get name(){return t('data.ach.tycoon.name')},get desc(){return t('data.ach.tycoon.desc')}},
  {id:'stylist',get name(){return t('data.ach.stylist.name')},get desc(){return t('data.ach.stylist.desc')}},
  {id:'courier',get name(){return t('data.ach.courier.name')},get desc(){return t('data.ach.courier.desc')}},
  {id:'fleet',get name(){return t('data.ach.fleet.name')},get desc(){return t('data.ach.fleet.desc')}},
  {id:'go10',get name(){return t('data.ach.go10.name')},get desc(){return t('data.ach.go10.desc')}},
  {id:'handson',get name(){return t('data.ach.handson.name')},get desc(){return t('data.ach.handson.desc')}},
];
const SHIFT_LEN=480; // site minutes; 1 real second at 1x = 1 site minute
const MAINX=-4.5;
const AISLE=z=>z+2.5;
const SLOT_X=i=>-18.2+i*1.5;
const LEVEL_Y=[0.02,1.55,3.1];
const DOCK_PICK_X=-1.8;
const FORK_REACH=1.35;
const HOMES=[{x:-3.8,z:-12},{x:-2.4,z:-12},{x:-1.0,z:-12},{x:-3.8,z:12},{x:-2.4,z:12},{x:-1.0,z:12}];
const DECOR=[{x:-5.9,z:-12.3,type:'vending',get name(){return t('data.decor.vending')}},{x:-5.9,z:12.3,type:'cooler',get name(){return t('data.decor.cooler')}},{x:-19.5,z:-8.5,type:'plant',get name(){return t('data.decor.fig')}},{x:-19.5,z:1.5,type:'plant',get name(){return t('data.decor.palm')}}];
let site=SITES[0], L=null, ROWS=[], ROW_LV=[], BAY_Z=[], STAGE_Z=0;

/* ---------------- save (per-viewer, this browser only) ---------------- */
const SAVE_KEY='waretrack.game.v2';
function defaults(){return {v:2,best:{},credits:0,up:{fl:0,spd:0,chg:0},builds:{},xp:0,ach:{},
  stats:{shifts:0,pallets:0,orders:0,rush:0,fixes:0,builds:0,threeStars:0,bestScore:0},
  daily:{last:null,streak:0,bestStreak:0,best:{},cleared:[]},settings:{sound:true,music:true,vol:0.7},tutorial:false,town:{owned:[],b:{},unit7:false,bank:0,names:0},cos:{owned:['fl-classic','van-classic'],fl:'fl-classic',van:'van-classic'},constr:[],simClock:0};}
function loadSave(){
  const d=defaults(); let s=null;
  try{s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch(e){}
  if(!s){try{const o=JSON.parse(localStorage.getItem('waretrack.game.v1')||'null');if(o){s={best:o.best||{},credits:o.credits|0,up:o.up||{}};}}catch(e){}}
  s=s||{};
  const out=Object.assign(d,s);
  out.up=Object.assign(defaults().up,s.up||{}); out.stats=Object.assign(defaults().stats,s.stats||{});
  out.daily=Object.assign(defaults().daily,s.daily||{}); out.settings=Object.assign(defaults().settings,s.settings||{});
  out.best=out.best||{}; out.builds=out.builds||{}; out.ach=out.ach||{}; out.cos=Object.assign(defaults().cos,s.cos||{}); out.town=Object.assign(defaults().town,s.town||{});
  out.constr=Array.isArray(s.constr)?s.constr:[]; out.simClock=typeof s.simClock==='number'?s.simClock:0;
  return out;
}
let save=loadSave(); const LAST_SEEN=save.lastSeen||0;
setTimeout(()=>{game.hands=!!save.settings.hands;},0);
function writeSave(){save.lastSeen=Date.now();try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch(e){}}
function unlocked(i){if(i===0||save.best[SITES[i].code])return true;const prev=save.best[SITES[i-1].code];return !!(prev&&prev.stars>=2);}
function siteBuilds(code){return save.builds[code]||(save.builds[code]={bays:0,row:false,l3:[],fc:[],brk:false,decor:[]});}
function constrDur(cost){return clamp(cost*0.12,5,25);}
function constrProgress(c){return clamp((save.simClock-c.startMin)/c.dur,0,1);}
let constrSeq=0;
function queueConstr(entry){
  const dur=constrDur(entry.cost);
  const c=Object.assign({id:'C'+(++constrSeq)+'-'+Date.now(),startMin:save.simClock,dur},entry);
  save.constr.push(c); writeSave(); return c;
}
const constrScaffolds=new Map();
function removeScaffold(id){
  const sc=constrScaffolds.get(id); if(sc&&sc.riser.parent)sc.riser.parent.remove(sc.riser);
  constrScaffolds.delete(id);
}
function syncWhScaffolds(){
  constrScaffolds.forEach((sc,id)=>{if(sc.kind==='wh')removeScaffold(id);});
  save.constr.filter(c=>c.kind==='wh'&&c.site===site.k).forEach(c=>{
    const size=c.size||[3,3,3];
    const r=box(size[0]*0.55,1,size[2]*0.55,'#f0a623',c.pos[0],0,c.pos[2],world,false);
    r.scale.y=0.02;
    constrScaffolds.set(c.id,{riser:r,full:size[1]||3,kind:'wh'});
  });
}
function completeConstr(c){
  const i=save.constr.indexOf(c); if(i<0)return; save.constr.splice(i,1);
  removeScaffold(c.id);
  let deferred=false;
  if(c.kind==='wh'){
    const b=siteBuilds(SITES.find(s=>s.k===c.site).code), [k,a]=c.key.split(':');
    if(k==='bay')b.bays=(b.bays|0)+1; else if(k==='row')b.row=true; else if(k==='l3')b.l3=(b.l3||[]).concat(+a);
    else if(k==='fc')b.fc=(b.fc||[]).concat(+a); else if(k==='brk')b.brk=true; else if(k==='decor')b.decor=(b.decor||[]).concat(+a);
    save.stats.builds++;
    if(save.stats.builds>=5)unlock('builder');
    if(Object.values(save.builds).reduce((n,x)=>n+((x.decor||[]).length),0)>=3)unlock('decor');
    deferred=c.site===site.k&&game.phase==='shift';
    if(c.site===site.k&&!deferred){
      const vt=view.targetT.clone(), vz=view.zoomT;
      loadSite(game.siteIdx);
      view.targetT.copy(vt); view.target.copy(vt); view.zoomT=vz;
      popup(t('data.built'),c.pos[0]+OX,c.pos[1]+2,c.pos[2],'gold');
    }
  }else{
    const tile=town.tiles.get(c.key);
    if(tile){
      Object.assign(tile,{type:c.meta.type,face:c.meta.face,name:c.meta.name,color:c.meta.color,wild:false});
      save.town.b[c.key]={type:c.meta.type,face:c.meta.face,name:c.meta.name,color:c.meta.color};
      townChanged([c.key],false);
    }
    popup(t('data.built'),c.pos[0],2,c.pos[2],'gold');
  }
  toast('info',t('data.toast.built',{label:c.label}),deferred?t('data.toast.readyAfterShift'):'',ICON.hammer); Snd.play('build');
  writeSave(); dirty=true;
}
function tickConstr(dt){
  if(!save.constr.length)return;
  for(let i=save.constr.length-1;i>=0;i--){
    const c=save.constr[i], p=constrProgress(c), sc=constrScaffolds.get(c.id);
    if(sc&&sc.riser.parent){sc.riser.scale.y=Math.max(0.02,sc.full*p); sc.riser.position.y=sc.riser.scale.y/2;}
    if(p>=1)completeConstr(c);
  }
}
function constrSelfCheck(){
  const okDur=constrDur(25)===5&&constrDur(1000)===25&&Math.abs(constrDur(100)-12)<1e-9;
  const save0=save.simClock;
  const fakeC={startMin:save.simClock,dur:10};
  const p0=constrProgress(fakeC);
  save.simClock+=10; const p1=constrProgress(fakeC);
  save.simClock+=50; const p2=constrProgress(fakeC);
  save.simClock=save0;
  const okProgress=p0===0&&p1===1&&p2===1;
  console.assert(okDur,'constrDur failed');
  console.assert(okProgress,'progress math failed',{p0,p1,p2});
  return okDur&&okProgress;
}
window.__constrSelfCheck=constrSelfCheck;
const xpFor=l=>250*(l-1)*l;
function levelOf(xp){let l=1;while(xp>=xpFor(l+1))l++;return l;}
const rankOf=l=>t('data.rank.'+RANKS[Math.min(l-1,RANKS.length-1)]);
function todayKey(d){d=d||new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function dayOffset(n){const d=new Date();d.setDate(d.getDate()+n);return todayKey(d);}
function streakNow(){const d=save.daily;return d.last&&(d.last===todayKey()||d.last===dayOffset(-1))?d.streak:0;}
function dailySpec(key){
  const r=mulberry32(hashStr('wt-daily-'+key)), keys=Object.keys(MODS);
  const si=Math.floor(r()*SITES.length); const a=keys[Math.floor(r()*keys.length)]; let b=a,guard=0;
  while((b===a||(a==='calm'&&b==='short')||(a==='short'&&b==='calm'))&&guard++<20) b=keys[Math.floor(r()*keys.length)];
  const hard=[a,b].filter(m=>m==='short'||m==='tight'||m==='brown').length;
  return {key,site:si,mods:[a,b],target:Math.round(SITES[si].dailyTarget*(1-0.1*hard)/10)*10,seed:hashStr('wt-run-'+key)};
}

/* ---------------- state ---------------- */
const sim={speed:1};
const game={phase:'free',mode:'normal',mods:new Set(),daily:null,siteIdx:0,menuSel:0,menuTab:'play',score:0,st:null,ledger:null,
  incident:null,queue:[],hands:false,nextEvent:50,lowCd:{},surgeUntil:0,lastReport:null,combo:0,bestCombo:0,building:false,newAch:[],town:false,townTool:'buy'};
function resetSim(){
  Object.assign(sim,{sec:0,startMin:8*60,putaways:0,shipped:0,startStock:0,
    orders:[],orderSeq:5520+irand(0,60),truckSeq:2101+irand(0,80),shipSeq:78440,log:[],nextOrder:3,nextTruck:16,enroute:[],blocked:{}});
}
function resetGame(){
  game.score=0; game.st={recv:0,shipOn:0,shipLate:0,lateOrders:0,backorders:0,trucks:0,fast:0,detention:0,spent:0,fixes:0,rushOn:0};
  game.ledger={put:0,ship:0,rush:0,turn:0,combo:0,late:0,back:0,det:0,spent:0};
  game.incident=null; game.queue=[]; game.nextEvent=rand(35,50); game.lowCd={}; game.surgeUntil=0; game.combo=0; game.bestCombo=0; game.newAch=[];
}
resetSim(); resetGame();
function clockMin(){return sim.startMin+sim.sec;}
function log(text,kind){sim.log.unshift({t:clockMin(),text,kind:kind||''}); if(sim.log.length>80)sim.log.pop(); dirty=true;}
function spend(c){if(game.phase!=='shift'||!c)return;game.score-=c;game.ledger.spent-=c;game.st.spent+=c;dirty=true;}
const sla=()=>site.orderSla-(game.mods.has('tight')?10:0);

/* ---------------- sound (synthesized, no files) ---------------- */
const Snd={ctx:null,master:null,sfx:null,mus:null,next:0,step:0,lastPut:0,noise:null,
  init(){
    if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume();return;}
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return;
    try{this.ctx=new AC();}catch(e){return;}
    const c=this.ctx;
    this.master=c.createGain(); this.master.connect(c.destination);
    this.sfx=c.createGain(); this.sfx.connect(this.master);
    this.mus=c.createGain(); this.mus.connect(this.master);
    const len=c.sampleRate*0.5, buf=c.createBuffer(1,len,c.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=Math.random()*2-1; this.noise=buf;
    this.apply();
  },
  apply(){if(!this.ctx)return;this.master.gain.value=save.settings.vol;this.sfx.gain.value=save.settings.sound?1:0;this.mus.gain.value=save.settings.music?0.32:0;},
  tone(f,dur,type,vol,t,slide,dest){
    const c=this.ctx; t=t||c.currentTime;
    const o=c.createOscillator(),g=c.createGain();
    o.type=type||'sine'; o.frequency.setValueAtTime(f,t); if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+dur);
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol||.15,t+.01); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g); g.connect(dest||this.sfx); o.start(t); o.stop(t+dur+.05);
  },
  play(n,p){
    if(!this.ctx||!save.settings.sound||this.ctx.state!=='running')return;
    const t=this.ctx.currentTime; p=p||1;
    switch(n){
      case 'click': this.tone(1500,.035,'triangle',.05); break;
      case 'put': if(t-this.lastPut<.08)return; this.lastPut=t; this.tone(520,.09,'sine',.09); this.tone(780,.08,'sine',.05,t+.05); break;
      case 'coin': this.tone(988*p,.08,'square',.045); this.tone(1319*p,.16,'square',.045,t+.07); break;
      case 'bad': this.tone(240,.28,'sawtooth',.05,t,110); break;
      case 'alert': [0,.22].forEach(d=>{this.tone(740,.11,'square',.05,t+d);this.tone(554,.13,'square',.05,t+d+.1);}); break;
      case 'star': {const f=[784,988,1175][p|0]||1175; this.tone(f,.7,'sine',.16); this.tone(f*2,.5,'sine',.04);} break;
      case 'level': [523,659,784,1047,1319].forEach((f,i)=>this.tone(f,.3,'triangle',.11,t+i*.08)); break;
      case 'ach': [880,1109,1319,1760].forEach((f,i)=>this.tone(f,.4,'sine',.1,t+i*.06)); break;
      case 'build': this.tone(150,.2,'square',.08,t,60); this.tone(660,.2,'triangle',.08,t+.12); this.tone(990,.25,'triangle',.06,t+.2); break;
      case 'horn': this.tone(220,.32,'sawtooth',.035); this.tone(277,.32,'sawtooth',.03); break;
      case 'lost': this.tone(440,.18,'triangle',.06,t,220); break;
    }
  },
  music(){
    if(!this.ctx||!save.settings.music||this.ctx.state!=='running')return;
    const c=this.ctx;
    if(this.next<c.currentTime) this.next=c.currentTime+.05;
    while(this.next<c.currentTime+.25){
      if(this.step%16===0){const want=musicMode(); if(want!==this.mode&&(this.step%64===0||!this.mode||want==='rush'))this.mode=want;}
      const S=SONGS[this.mode||'chill']; this.beat(this.step,this.next,S); this.next+=60/S.bpm/4; this.step++;
    }
  },
  beat(s,t,S){
    const c=this.ctx, m=n=>440*Math.pow(2,(n-69)/12), bar=Math.floor(s/16)%S.ch.length, i=s%16, ch=S.ch[bar], root=ch[0];
    const voice=(f,dur,type,vol,cut,att,det)=>{const o=c.createOscillator(),g=c.createGain(),fl=c.createBiquadFilter();o.type=type;o.frequency.value=f;if(det)o.detune.value=det;
      fl.type='lowpass';fl.frequency.value=cut||2000;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+(att||.008));g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      o.connect(fl);fl.connect(g);g.connect(this.mus);o.start(t);o.stop(t+dur+.05);};
    const noise=(hp,dur,vol,bp)=>{const nb=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();nb.buffer=this.noise;f.type=bp?'bandpass':'highpass';f.frequency.value=hp;
      g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);nb.connect(f);f.connect(g);g.connect(this.mus);nb.start(t);nb.stop(t+dur+.02);};
    const kick=v=>{const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.14);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+.3);o.connect(g);g.connect(this.mus);o.start(t);o.stop(t+.32);};
    const spb=60/S.bpm;
    if(i===0) ch.forEach((n,k)=>{voice(m(n),spb*4.2,'sawtooth',S.pad,S.padCut,spb*1.2,k%2?7:-7);voice(m(n),spb*4.2,'triangle',S.pad*.8,1400,spb,0);});
    const bn=S.bass[i]; if(bn!=null) voice(m(root-24+bn),spb*.45,'triangle',.11,700,.005);
    if(S.arp&&i%S.arp===0){const seq=S.arpSeq, n=ch[seq[(i/S.arp)%seq.length]%ch.length]+12*(1+Math.floor(seq[(i/S.arp)%seq.length]/ch.length));voice(m(n),spb*.35,'square',S.arpVol,S.arpCut,.004);}
    if(S.kick.includes(i)) kick(S.kickVol);
    if(S.snare.includes(i)){noise(1800,.16,S.snVol,true);voice(190,.08,'triangle',S.snVol*.8,900,.002);}
    if(S.hat&&i%S.hat===0) noise(8000,i%4===2?.07:.035,S.hatVol*(i%4===2?1.4:1));
    if(S.lead&&i%2===0&&Math.random()<S.lead){const pent=[0,3,5,7,10,12,15],n=root+12+pent[Math.floor(Math.random()*pent.length)];voice(m(n),spb*.6,'sine',.05,3000,.01);}
  }
};
const SONGS={
  chill:{bpm:86,ch:[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,65]],pad:.022,padCut:900,bass:[0,null,null,null,null,null,7,null,0,null,null,null,12,null,null,null],
    arp:4,arpSeq:[0,2,1,3],arpVol:.018,arpCut:1600,kick:[0,10],kickVol:.10,snare:[],snVol:.02,hat:4,hatVol:.008,lead:.12},
  shift:{bpm:104,ch:[[57,60,64,67],[53,57,60,64],[60,64,67,71],[55,59,62,67]],pad:.016,padCut:1100,bass:[0,null,0,null,12,null,0,null,0,null,7,null,12,null,7,null],
    arp:2,arpSeq:[0,1,2,3,4,2,1,3],arpVol:.02,arpCut:2200,kick:[0,6,8],kickVol:.16,snare:[4,12],snVol:.04,hat:2,hatVol:.012,lead:.1},
  rush:{bpm:122,ch:[[50,53,57,60],[46,50,53,57],[53,57,60,64],[48,52,55,60]],pad:.014,padCut:1500,bass:[0,0,12,0,0,12,0,7,0,0,12,0,10,0,7,12],
    arp:1,arpSeq:[0,1,2,3,2,1],arpVol:.016,arpCut:2800,kick:[0,4,8,12],kickVol:.18,snare:[4,12],snVol:.05,hat:1,hatVol:.009,lead:.18},
};
function musicMode(){
  if(game.phase!=='shift')return 'chill';
  const late=sim.orders.some(o=>o.late)||reqs.some(r=>r.ttl-r.t<5)||!!game.incident;
  return (SHIFT_LEN-sim.sec<60||late)?'rush':'shift';
}
function unlockAudio(){Snd.init();}
addEventListener('pointerdown',unlockAudio,{passive:true});
addEventListener('keydown',unlockAudio);
document.addEventListener('click',e=>{if(e.target.closest('button'))Snd.play('click');},true);
/* ---------------- toasts & confetti ---------------- */
const RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function toast(kind,title,body,icon){
  notify(kind,title,body);
  put('toast',{kind,title:title,body:body,icon:icon||ICON.trophy});
}
const conf={parts:[],cv:els.conf,ctx:null};
function confetti(n){
  if(RM)return; const cv=conf.cv; cv.width=innerWidth; cv.height=innerHeight; conf.ctx=cv.getContext('2d');
  const cols=['#f2c230','#2f5be0','#25a69a','#e0664f','#8a5cd6','#ffffff'];
  for(let i=0;i<(n||140);i++)conf.parts.push({x:innerWidth/2+(Math.random()-.5)*240,y:innerHeight*0.32,vx:(Math.random()-.5)*640,vy:-Math.random()*620-180,r:Math.random()*TAU,vr:(Math.random()-.5)*12,s:5+Math.random()*6,c:cols[i%cols.length],t:0});
}
function stepConfetti(dt){
  if(!conf.parts.length)return; const g=conf.ctx; g.clearRect(0,0,conf.cv.width,conf.cv.height);
  conf.parts=conf.parts.filter(p=>{p.t+=dt;p.vy+=900*dt;p.vx*=.99;p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=p.vr*dt;
    if(p.t>3.2||p.y>innerHeight+30)return false;
    g.save();g.translate(p.x,p.y);g.rotate(p.r);g.globalAlpha=Math.min(1,3.2-p.t);g.fillStyle=p.c;g.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);g.restore();return true;});
  if(!conf.parts.length)g.clearRect(0,0,conf.cv.width,conf.cv.height);
}

/* ---------------- progression ---------------- */
function unlock(id){
  if(save.ach[id])return false;
  const a=ACH.find(x=>x.id===id); if(!a)return false;
  save.ach[id]=Date.now(); save.credits+=20; writeSave();
  game.newAch.push(id);
  toast('ach',t('data.toast.achTitle',{name:a.name}),t('data.toast.achBody',{desc:a.desc}),ICON.trophy); Snd.play('ach');
  return true;
}
function addXp(n){
  const before=levelOf(save.xp); save.xp+=Math.max(0,Math.round(n)); const after=levelOf(save.xp);
  for(let l=before+1;l<=after;l++){save.credits+=25*l;}
  if(after>before){setTimeout(()=>{toast('lvl',t('data.toast.levelTitle',{n:after,rank:rankOf(after)}),t('data.toast.levelBody',{cr:25*after}),ICON.up);Snd.play('level');confetti(90);},900);}
  if(after>=5)unlock('level5');
  return {before,after};
}

/* ---------------- renderer ---------------- */
const stage=els.stage;
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true});}catch(e){putLive({loadFail:t('data.loadFail')});return null;}
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,innerWidth<=760?1.5:2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color('#e6e9f5');
scene.fog=new THREE.Fog('#e6e9f5',150,270);
scene.add(new THREE.HemisphereLight('#ffffff','#b4c2d6',0.78));
const sun=new THREE.DirectionalLight('#fffaf0',0.62);
sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-42,right:42,top:42,bottom:-42,near:1,far:120});
sun.shadow.bias=-0.0006; sun.shadow.normalBias=0.02;
scene.add(sun); scene.add(sun.target);
scene.add(new THREE.AmbientLight('#dfe7f5',0.18));
const SUN_NOON=new THREE.Color('#fffaf0'),SUN_DAWN=new THREE.Color('#ffb46a'),BG_NOON=new THREE.Color('#e6e9f5'),BG_DAWN=new THREE.Color('#ece0d2'),_sunC=new THREE.Color(),_bgC=new THREE.Color();
function dayPhase(){return game.phase==='shift'?clamp((clockMin()-480)/480,0,1):0.5;}
const world=new THREE.Group(); scene.add(world);

/* ---------------- helpers ---------------- */
const MATS={}, GEOS={};
function mat(c,o){const k=c+(o?JSON.stringify(o):'');return MATS[k]||(MATS[k]=new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.82,metalness:0},o||{})));}
function bgeo(w,h,d){const k=w+'|'+h+'|'+d;return GEOS[k]||(GEOS[k]=new THREE.BoxGeometry(w,h,d));}
function box(w,h,d,c,x,y,z,parent,shadow){
  const m=new THREE.Mesh(bgeo(w,h,d),typeof c==='string'?mat(c):c);
  m.position.set(x||0,y||0,z||0); m.castShadow=shadow!==false; m.receiveShadow=true;
  (parent||world).add(m); return m;
}
function cyl(rt,rb,h,c,x,y,z,parent,seg){
  const k='c'+rt+'|'+rb+'|'+h+'|'+(seg||14);
  const g=GEOS[k]||(GEOS[k]=new THREE.CylinderGeometry(rt,rb,h,seg||14));
  const m=new THREE.Mesh(g,mat(c)); m.position.set(x,y,z); m.castShadow=true; (parent||world).add(m); return m;
}
function ball(r,c,x,y,z,parent){const k='s'+r;const g=GEOS[k]||(GEOS[k]=new THREE.SphereGeometry(r,16,12));const m=new THREE.Mesh(g,mat(c));m.position.set(x,y,z);m.castShadow=true;(parent||world).add(m);return m;}
function stripe(x1,z1,x2,z2,w,c,y){
  const dz=z2-z1,len=Math.hypot(x2-x1,dz);
  const m=box(dz===0?len+w:w,0.012,dz===0?w:len+w,c,(x1+x2)/2,y||0.062,(z1+z2)/2,world,false);
  m.castShadow=false; return m;
}
function canvasTex(w,h,draw){
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c); t.anisotropy=renderer.capabilities.getMaxAnisotropy(); return t;
}
const textCache={};
function floorText(txt,x,z,w,h,opts){
  opts=opts||{};
  const key=txt+'|'+w+'|'+h+'|'+(opts.color||'')+'|'+(opts.size||'');
  const tex=textCache[key]||(textCache[key]=canvasTex(Math.round(128*w/h),128,(g,W,H)=>{
    g.fillStyle=opts.color||'#8797b0';
    g.font=(opts.weight||800)+' '+(opts.size||86)+'px "Bricolage Grotesque", Figtree, sans-serif';
    g.textAlign='center'; g.textBaseline='middle'; g.fillText(txt,W/2,H/2+4);
  }));
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshLambertMaterial({map:tex,transparent:true,depthWrite:false}));
  m.rotation.x=-Math.PI/2; if(opts.rot) m.rotation.z=opts.rot;
  m.position.set(x,0.07,z); world.add(m); return m;
}
function badgeTex(bg,glyph){return canvasTex(128,128,g=>{g.fillStyle=bg;g.beginPath();g.arc(64,64,58,0,TAU);g.fill();g.fillStyle='#fff';g.font='900 92px Figtree, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(glyph,64,70);});}
const warnTex=badgeTex('#d24b42','!'), plusTex=badgeTex('#2f5be0','+'), orderTex=badgeTex('#f0a623','$');
function sprite(tex,s){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true}));sp.scale.set(s||.9,s||.9,1);sp.renderOrder=10;return sp;}

/* ---------------- environment ---------------- */
const walls={};
const shell={mats:[],g:null,op:0};
function shellMat(o){const m=new THREE.MeshStandardMaterial(Object.assign({roughness:.8,transparent:true,opacity:shell.op},o));shell.mats.push(m);return m;}
function buildSite(){
  box(20,0.1,26,site.floor,-10,0.05,0,world,false);
  box(24,0.06,26,'#eef1f8',12,0.03,0,world,false);
  box(24,0.18,0.3,'#dde2f0',12,0.09,-13.15,world,false);
  box(24,0.18,0.3,'#dde2f0',12,0.09,13.15,world,false);
  floorText('GATE',21.5,15.4,2.6,1.0,{color:'#9aa8bc',size:80});
  stripe(17.2,14.4,23.2,14.4,0.16,'#ffffff',0.075);

  walls.back=box(20.6,4.8,0.3,'#e9edf7',-10,2.4,-13.15);
  walls.backTrim=box(20.6,0.25,0.34,site.accent,-10,4.6,-13.15);
  walls.left=box(0.3,4.8,26.6,'#e3e8f4',-20.15,2.4,0);
  walls.leftTrim=box(0.34,0.25,26.6,site.accent,-20.15,4.6,0);
  const edges=[-13.15,...BAY_Z.flatMap(z=>[z-1.75,z+1.75]),13.15];
  for(let i=0;i<edges.length;i+=2){const a=edges[i],b=edges[i+1]; if(b-a>0.05) box(0.35,0.9,b-a,'#cdd7e4',0,0.45,(a+b)/2);}

  // closed warehouse shell: front/dock walls and a blue gable roof; fades out when you zoom in
  shell.mats=[]; shell.g=new THREE.Group(); world.add(shell.g); const S=shell.g;
  const corr=canvasTex(256,64,(c,W,H)=>{c.fillStyle='#f3f5fb';c.fillRect(0,0,W,H);c.fillStyle='#e1e6f2';for(let x=0;x<W;x+=16)c.fillRect(x,0,3,H);});
  corr.wrapS=corr.wrapT=THREE.RepeatWrapping; corr.repeat&&corr.repeat.set(10,1);
  const wallM=shellMat({map:corr,color:'#ffffff'}), trimM=shellMat({color:site.accent});
  box(20.6,4.8,0.3,wallM,-10,2.4,13.15,S); box(20.7,0.3,0.36,trimM,-10,4.75,13.15,S);
  for(let i=0;i<edges.length;i+=2){const a=edges[i],b=edges[i+1]; if(b-a>0.05) box(0.3,3.9,b-a,wallM,0,2.85,(a+b)/2,S);}
  BAY_Z.forEach(z=>box(0.3,0.42,3.6,wallM,0,4.62,z,S));
  box(0.36,0.3,26.7,trimM,0,4.75,0,S);
  buildRoof(S,site,(c,map)=>shellMat(map?{map,color:c}:{color:c}),true); siteExtras(world,site);

  stripe(-6.25,-12.6,-6.25,12.6,0.12,'#f2c230');
  stripe(-2.85,-12.6,-2.85,12.6,0.12,'#f2c230');
  ROWS.forEach((z,r)=>{
    floorText('ABCD'[r],-6.0,AISLE(z),1.1,1.1,{color:site.accent,size:96});
    stripe(-19.2,AISLE(z)-1.35,-7.0,AISLE(z)-1.35,0.06,'#c9d3e2');
  });
  const z1=STAGE_Z-0.85,z2=STAGE_Z+0.85;
  stripe(-19,z1,-7.4,z1,0.12,'#23a26a'); stripe(-19,z2,-7.4,z2,0.12,'#23a26a');
  stripe(-19,z1,-19,z2,0.12,'#23a26a'); stripe(-7.4,z1,-7.4,z2,0.12,'#23a26a');
  floorText('OUTBOUND STAGING',-13.2,STAGE_Z+1.55,8,0.9,{color:'#23a26a',size:70});
  if(L.rows<4){
    for(let i=0;i<6;i++)for(let j=0;j<2;j++){const p=makePallet(pick(['BOX','BRK','LED']));p.position.set(-18.2+i*1.6,0.02,8.6+j*1.6);world.add(p);}
    floorText('BULK FLOOR',-13.6,11.6,5,0.7,{color:'#9aa8bc',size:70});
  }
  chargers.length=0;
  HOMES.forEach((h,i)=>{
    const fast=L.fc.includes(i), back=h.z<0?-1:1;
    box(1.25,0.012,1.3,fast?'#9fe8cf':'#c4f1d8',h.x,0.064,h.z,world,false);
    const g=new THREE.Group(); g.position.set(h.x,0,h.z+back*0.64); world.add(g);
    box(0.64,1.05,0.3,fast?'#e3fbf3':'#f6f7fb',0,0.53,0,g); box(0.44,0.26,0.04,fast?'#2fb39a':'#22d36f',0,0.78,-back*0.16,g,false);
    plane(txtTex('C'+(i+1),'#ffffff','#2f5be0',128,64,46),0.42,0.21,g,0,0.38,-back*0.158,back>0?Math.PI:0);
    const c={kind:'chg',i,g,x:h.x,z:h.z,fast,sessions:2+hashStr(site.code+i)%5,kwh:8+(hashStr('k'+site.code+i)%300)/10};
    g.userData.sel=c; chargers.push(c);
  });
  floorText('CHARGING',-2.4,-10.75,3.2,0.6,{color:'#23a26a',size:72});
  floorText('CHARGING',-2.4,10.75,3.2,0.6,{color:'#23a26a',size:72});

  BAY_Z.forEach((z,i)=>{
    stripe(0.7,z-1.9,12.6,z-1.9,0.14,'#f2c230');
    stripe(0.7,z+1.9,12.6,z+1.9,0.14,'#f2c230');
    stripe(12.6,z-1.9,12.6,z+1.9,0.14,'#f2c230');
    floorText('BAY '+(i+1),14.2,z,1.6,3.0,{color:'#b2bfd1',size:80,rot:Math.PI/2});
  });

  ROWS.forEach((z0,r)=>{
    const x0=-18.95,x1=-6.95, tall=ROW_LV[r]>2, H=tall?4.65:3.1;
    for(let k=0;k<=8;k++){const x=x0+k*1.5; box(0.11,H,0.11,'#4d73e0',x,H/2,z0-0.56); box(0.11,H,0.11,'#4d73e0',x,H/2,z0+0.56);
      box(0.08,0.08,1.12,'#4d73e0',x,0.4,z0); box(0.08,0.08,1.12,'#4d73e0',x,2.6,z0); if(tall)box(0.08,0.08,1.12,'#4d73e0',x,4.1,z0);}
    [z0-0.56,z0+0.56].forEach(zz=>{box(12,0.1,0.08,'#f08a3c',(x0+x1)/2,1.47,zz); box(12,0.1,0.08,'#f08a3c',(x0+x1)/2,3.05,zz); if(tall)box(12,0.1,0.08,'#f08a3c',(x0+x1)/2,4.6,zz);});
  });
  for(let i=0;i<5;i++){const p=makePallet(pick(['BOX','LED','BRK'])); p.position.set(-19.2+i*1.25,0.02,-12.4); world.add(p);}
  [[16.6,-12.4],[16.6,12.4]].forEach(([x,z])=>{cyl(.08,.1,4.2,'#8a98ad',x,2.1,z); box(.6,.12,.3,'#8a98ad',x-.25,4.2,z);});
  if(L.brk) makeBreakRoom();
  L.decor.forEach(i=>makeDecor(DECOR[i]));
}
function makeBreakRoom(){
  const g=new THREE.Group(); g.position.set(5,0,-17.6); world.add(g);
  box(6,2.6,3.2,'#f7f3ea',0,1.3,0,g); box(6.3,0.25,3.5,site.accent,0,2.72,0,g);
  box(0.9,1.7,0.06,'#6b778a',-1.6,0.85,1.62,g);
  box(2.2,0.9,0.06,'#a9d4f5',0.9,1.5,1.62,g);
  const t=canvasTex(256,64,(c,W,H)=>{c.fillStyle='#ffffff';c.fillRect(0,0,W,H);c.fillStyle=site.accent;c.font='800 40px "Bricolage Grotesque", Figtree, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('CREW ROOM',W/2,H/2+2);});
  const s=new THREE.Mesh(new THREE.PlaneGeometry(2.4,0.6),new THREE.MeshStandardMaterial({map:t})); s.position.set(0,2.25,1.64); g.add(s);
  ball(.5,'#5fae6e',2.6,.6,1.9,g); cyl(.3,.24,.45,'#c9824f',2.6,.22,1.9,g);
}
function makeDecor(d){
  const g=new THREE.Group(); g.position.set(d.x,0,d.z); world.add(g);
  if(d.type==='vending'){box(.8,1.9,.7,'#e0564b',0,.95,0,g); box(.5,1.1,.04,'#bfe3ff',0,1.15,d.z<0?.37:-.37,g); box(.5,.18,.05,'#2c3344',0,.35,d.z<0?.37:-.37,g);}
  else if(d.type==='cooler'){box(.5,.9,.5,'#e8edf5',0,.45,0,g); cyl(.2,.2,.55,'#7fb6ff',0,1.18,0,g);}
  else {cyl(.3,.22,.5,'#c9824f',0,.25,0,g); cyl(.05,.05,.9,'#7a5232',0,.9,0,g); ball(.45,'#4f9e5c',0,1.45,0,g); ball(.32,'#5fb36c',.2,1.75,.1,g);}
}

function makeCar(c){
  const g=new THREE.Group();
  box(2.4,0.55,1.15,c,0,0.55,0,g); box(1.3,0.5,1.05,'#bcd6ef',-0.15,1.05,0,g); box(1.34,0.08,1.08,c,-0.15,1.32,0,g);
  [[0.75,0.58],[-0.75,0.58],[0.75,-0.58],[-0.75,-0.58]].forEach(([a,b])=>box(0.5,0.42,0.12,'#262d3a',a,0.26,b,g));
  return g;
}

function cosItem(kind){const id=save.cos[kind];return COSMETICS.find(c=>c.id===id)||COSMETICS.find(c=>c.kind===kind&&!c.cost);}

function makeVan(){
  const c=cosItem('van').body, g=new THREE.Group();
  box(2.6,1.45,1.3,'#f7f9fc',-0.35,1.05,0,g); box(2.62,0.26,1.32,c,-0.35,0.58,0,g);
  box(1.0,1.05,1.26,c,1.35,0.85,0,g); box(0.06,0.5,1.1,'#2a3950',1.87,1.1,0,g);
  [[0.95,0.6],[-1.15,0.6],[0.95,-0.6],[-1.15,-0.6]].forEach(([a,b])=>box(0.52,0.42,0.12,'#262d3a',a,0.26,b,g));
  return g;
}
/* ---------------- town: plot grid, roads, signals, buildings, traffic ---------------- */
const ROWS_R=[-7,0,6,10,15], SPAWN_Z=205, EXIT_Z=-212;
const TS=8, GI0=-37, GI1=33, GJ0=-12, GJ1=17, SLICES=[-2,-1,0,1,2], SLICE_W=96;
let OX=0;
const wx=o=>o.x+(o.loc?OX:0);
const tcx=i=>20+TS*i, tcz=j=>-22+TS*j;
const onMap=(x,z)=>x>=tcx(GI0)-66&&x<=tcx(GI1)+66&&z>=tcz(GJ0)-66&&z<=tcz(GJ1)+66;
const DIRS=[[0,-1],[1,0],[0,1],[-1,0]]; // N E S W  (N = -z)
const opp=d=>(d+2)%4;
const rightOf=d=>[-DIRS[d][1],DIRS[d][0]];
const LANE=1.6, ASPH='#8e9bc8', CURB='#f3f5fb', GUT='#b6c0e0';
const tkey=(i,j)=>i+','+j;
const env=new THREE.Group(); scene.add(env);
const townStatic=new THREE.Group(); env.add(townStatic);
const town={tiles:new Map(),objs:new Map(),lights:new Map(),lightObjs:[],reach:new Set(),roads:[],portals:[],trees:null,lamps:null,econ:{inc:0,up:0,net:0,b:0,plots:0},built:false,lightT:0,unit7:null};
const cars=[], vans=[], liteTrucks=[];
// i18n alias for scopes where a local named t shadows the translator
const _wt=(k,p)=>t(k,p);
const START='-1,0';
const CITY_SHOPS=[
  {name:'Corner Market',i:-7,j:-1,face:2,color:'#e0664f'},
  {name:'Volt Electronics',i:-6,j:-1,face:2,color:'#2c4bb3'},
  {name:'Bloom Florist',i:-5,j:-1,face:2,color:'#d46aa0'},
  {name:'Daily Bread',i:1,j:-1,face:2,color:'#c98a4a'},
  {name:'Tool Den',i:2,j:-1,face:2,color:'#25a69a'},
  {name:'Café Nord',i:-7,j:7,face:0,color:'#8a5cd6'},
  {name:'Office Hub',i:-6,j:7,face:0,color:'#3a5fd8'},
  {name:'Pet Pantry',i:-5,j:7,face:0,color:'#e6a23c'},
];
const SHOP_NAMES=['Northside Deli','Bolt Bikes','Paper Lantern','Fresh Fold','Copper Kettle','Atlas Outdoor','Little Sprout','Corner Optics','Riverside Grocer','Marlow Books','Sparkle Wash','Urban Plant','Tidy Home','Byte Repair','Golden Crust','Juniper Spa','Harbor Fish','Coastline Surf','Linen & Co','Blue Door Cafe','Metro Mart','Echo Records','Pine Pharmacy','Gizmo Hub','Westgate Tools','Orbit Toys','Maple Bakery','Summit Sports','Vine Market','Pixel Print','Honey Pot','Starlight Cinema'];
const SHOP_COLS=['#e0664f','#2c4bb3','#d46aa0','#c98a4a','#25a69a','#8a5cd6','#3a5fd8','#e6a23c'];
const NEIGHBORS={'-2':['Atlas Logistics','Polar Foods','Crane Supply','Ironbridge Steel'],'-1':['Bayline Freight','Norte Imports','Vector Parts','Greenfield Farms'],'1':['Pier 9 Storage','Coastal Seafood','Lumen Electric','Harborview Mills'],'2':['Orbit Robotics','Summit Paper','Keystone Tile','Northwind Air']};
function shopsFor(k){ if(k===0)return CITY_SHOPS; return CITY_SHOPS.map((c,n)=>{const idx=((k+2)*8+n)%SHOP_NAMES.length;return {name:SHOP_NAMES[idx],i:c.i,j:c.j,face:c.face,color:SHOP_COLS[(n+k+5)%SHOP_COLS.length]};}); }
const sliceOfI=i=>Math.round((i-2)/12);
const PSHOPS=[['Maple Grocer','#e0664f'],['Harbor Books','#3a5fd8'],['Spark Hardware','#e6a23c'],['Sunny Pharmacy','#25a69a'],['Green Leaf Deli','#3f9a62'],['Pixel Games','#8a5cd6'],['Brew Bros','#b98455'],['Urban Threads','#d46aa0']];
const BTYPES={
  road:{get name(){return t('world.btype.road.name')},cost:15,get desc(){return t('world.btype.road.desc')}},
  house:{get name(){return t('world.btype.house.name')},cost:60,inc:0.5,get desc(){return t('world.btype.house.desc')}},
  shop:{get name(){return t('world.btype.shop.name')},cost:120,inc:1.5,get desc(){return t('world.btype.shop.desc')}},
  office:{get name(){return t('world.btype.office.name')},cost:180,inc:3,get desc(){return t('world.btype.office.desc')}},
  depot:{get name(){return t('world.btype.depot.name')},cost:260,inc:5,get desc(){return t('world.btype.depot.desc')}},
  park:{get name(){return t('world.btype.park.name')},cost:50,inc:0,get desc(){return t('world.btype.park.desc')}},
  trees:{get name(){return t('world.btype.trees.name')},cost:10,inc:0,get desc(){return t('world.btype.trees.desc')}},
};
const LEASE={cost:450,inc:8};
const getT=(i,j)=>town.tiles.get(tkey(i,j));
const nbT=(t,d)=>getT(t.i+DIRS[d][0],t.j+DIRS[d][1]);
function tileAt(x,z){return getT(Math.round((x-20)/TS),Math.round((z+22)/TS));}
const isRoadT=t=>!!t&&t.type==='road';
const linkT=t=>!!t&&(t.type==='road'||t.type==='private');
function setT(i,j,o){const t=Object.assign({i,j,key:tkey(i,j),type:'grass',owner:null,wild:false},o);town.tiles.set(t.key,t);return t;}
function genTown(){
  town.tiles.clear(); const R=mulberry32(4242);
  for(let i=GI0;i<=GI1;i++)for(let j=GJ0;j<=GJ1;j++) setT(i,j,{wild:R()<.4});
  const road=(i,j)=>setT(i,j,{type:'road',owner:'city'});
  for(let i=GI0;i<=GI1;i++)ROWS_R.forEach(j=>road(i,j));
  const big=(i0,i1,j0,j1,type,extra)=>{for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++)setT(i,j,Object.assign({type,owner:'city'},extra||{}));};
  SLICES.forEach(k=>{
    const o=12*k;
    for(let i=-5;i<=-1;i++)for(let j=1;j<=5;j++) setT(o+i,j,{type:'hq',owner:'player',slice:k});
    for(let j=GJ0;j<=GJ1;j++){road(o-8,j);road(o+4,j); if(j<=0||ROWS_R.includes(j))road(o,j); else setT(o,j,{type:'private',owner:'player',slice:k});}
    shopsFor(k).forEach(sh=>setT(o+sh.i,sh.j,{type:'cshop',owner:'city',shop:sh,face:sh.face}));
    big(o+2,o+3,7,7,k%2?'cpark':'cbig'); big(o-7,o-5,-3,-2,'cbig'); big(o+1,o+3,-3,-2,'cbig'); big(o+1,o+3,8,9,'cbig'); big(o+1,o+3,1,4,'cpark'); big(o-6,o-6,2,4,'cbig'); big(o-2,o-2,-1,-1,'cbig');
    if(k===0) big(-7,-5,8,9,'lease',{owner:null}); else big(o-7,o-5,8,9,'cbig');
  });
  const T=save.town, taken=new Set([...T.owned,...Object.keys(T.b)]);
  SLICES.forEach(k=>{const o=12*k, R2=mulberry32(900+k*31), cand=[];
    for(const j of [-1,7,9,8,-4,11])for(let i=o-6;i<=o+3;i++){const t=getT(i,j); if(!t||t.type!=='grass'||t.owner||taken.has(t.key))continue;
      let face=-1; for(const d of [2,0,1,3]){const n=nbT(t,d); if(n&&n.type==='road'&&n.owner==='city'){face=d;break;}} if(face>=0)cand.push([t,face,R2()]);}
    cand.sort((a,b)=>(Math.abs(a[0].i-o)+Math.abs(a[0].j)*0.6+a[2]*3)-(Math.abs(b[0].i-o)+Math.abs(b[0].j)*0.6+b[2]*3)).slice(0,10).forEach(([t,face],n)=>Object.assign(t,{type:'chouse',owner:'city',face,wild:false,addr:(2+((n*17+k*29+60)%96))+' '+STREETS[(n*5+k*3+12)%STREETS.length]}));
    const far=[]; for(const j of [-8,-6,-12,-11,11,14,16,17])for(let i=o-7;i<=o+3;i++){const t=getT(i,j); if(!t||t.type!=='grass'||t.owner||taken.has(t.key))continue;
      let face=-1; for(const d of [2,0,1,3]){const n=nbT(t,d); if(n&&n.type==='road'&&n.owner==='city'){face=d;break;}} if(face>=0)far.push([t,face,R2()]);}
    far.sort((a,b)=>a[2]-b[2]).slice(0,18).forEach(([t,face],n)=>Object.assign(t,{type:'chouse',owner:'city',face,wild:false,far:true,addr:(100+((n*31+k*17)%180))+' '+STREETS[(n*7+k*5+3)%STREETS.length]}));
    [[o-3,-10],[o-2,-10],[o-3,13],[o-2,13]].forEach(([i,j])=>{const t=getT(i,j); if(t&&t.type==='grass'&&!t.owner&&!taken.has(t.key))Object.assign(t,{type:'cpark',owner:'city',wild:false});});
    let m=0; town.tiles.forEach(t=>{if(t.type==='cshop'&&sliceOfI(t.i)===k)t.addr=(10+((m++)*23+k*11+40)%180)+' '+MSTREETS[(m+k+5)%MSTREETS.length];});
  });
  T.owned.forEach(k=>{const t=town.tiles.get(k);if(t&&t.type==='grass')t.owner='player';});
  Object.entries(T.b).forEach(([k,b])=>{const t=town.tiles.get(k);if(t&&t.owner==='player'&&t.type==='grass'){Object.assign(t,{type:b.type,face:b.face,name:b.name,color:b.color,wild:false});}});
  save.constr.forEach(c=>{if(c.kind==='town'){const t=town.tiles.get(c.key);if(t&&t.owner==='player'&&t.type==='grass'){t.type='constr';t.name=c.meta.name;t.color=c.meta.color;}}});
  if(T.unit7) town.tiles.forEach(t=>{if(t.type==='lease'){t.type='bigdepot';t.owner='player';}});
}
function roadMask(t){const m=[];for(let d=0;d<4;d++){const n=nbT(t,d);m.push(n?linkT(n):true);}return m;}
function carConns(t){const c=[];for(let d=0;d<4;d++){const n=nbT(t,d);if(n?isRoadT(n):true)c.push(d);}return c;}
const texCache={};
function txtTex(text,bg,fg,w,h,size,font){const k=[text,bg,fg,w,h,size].join('|');return texCache[k]||(texCache[k]=canvasTex(w||512,h||96,(g,W,H)=>{if(bg){g.fillStyle=bg;g.fillRect(0,0,W,H);}g.fillStyle=fg||'#fff';g.font=(font||'800 ')+(size||54)+'px "Bricolage Grotesque", Figtree, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,W/2,H/2+3);}));}
function plane(tex,w,h,parent,x,y,z,ry,flat){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:tex,roughness:.7,transparent:!!flat,depthWrite:!flat}));m.position.set(x,y,z);if(flat)m.rotation.x=-Math.PI/2;if(ry!=null){if(flat)m.rotation.z=ry;else m.rotation.y=ry;}parent.add(m);return m;}
function faceRot(d){return Math.atan2(DIRS[d][0],DIRS[d][1]);}

const RB={g:new THREE.Group(),b:new Map()}; env.add(RB.g);
function rbBox(w,h,d,c,x,y,z){const k=w+'|'+h+'|'+d+'|'+c;let b=RB.b.get(k);if(!b){b={w,h,d,c,p:[]};RB.b.set(k,b);}b.p.push(x,y,z);}
function rebuildRoads(){
  while(RB.g.children.length)RB.g.remove(RB.g.children[0]); RB.b=new Map();
  town.tiles.forEach(t=>{if(linkT(t))drawRoad(t);});
  rebuildLights();
  const d=new THREE.Object3D();
  RB.b.forEach(b=>{const n=b.p.length/3;const m=new THREE.InstancedMesh(bgeo(b.w,b.h,b.d),mat(b.c),n);
    for(let i=0;i<n;i++){d.position.set(b.p[i*3],b.p[i*3+1],b.p[i*3+2]);d.rotation.set(0,0,0);d.scale.set(1,1,1);d.updateMatrix();m.setMatrixAt(i,d.matrix);}
    m.receiveShadow=true; m.castShadow=b.h>0.3; m.frustumCulled=false; RB.g.add(m);});
}
function drawRoad(t){
  const m=roadMask(t), n=m.filter(Boolean).length, priv=t.type==='private', cx0=tcx(t.i), cz0=tcz(t.j);
  const box=(w,h,d,c,x,y,z)=>rbBox(w,h,d,c,cx0+x,y,cz0+z);
  box(8,0.1,8,CURB,0,0.05,0);
  box(6.3,0.03,6.3,GUT,0,0.1,0);
  box(6,0.05,6,ASPH,0,0.12,0);
  for(let d=0;d<4;d++) if(m[d]){const hz=d%2===1; box(hz?1.05:6.3,0.03,hz?6.3:1.05,GUT,DIRS[d][0]*3.48,0.1,DIRS[d][1]*3.48); box(hz?1.05:6,0.05,hz?6:1.05,ASPH,DIRS[d][0]*3.48,0.12,DIRS[d][1]*3.48);}
  const Y='#f2c230',W='#ffffff',ln=(x,z,w,d,c)=>box(w,0.02,d,c,x,0.155,z);
  const NS=m[0]&&m[2]&&!m[1]&&!m[3], EW=m[1]&&m[3]&&!m[0]&&!m[2];
  if(NS||EW){
    const L=(a,b,w,d,c)=>NS?ln(a,b,w,d,c):ln(b,a,d,w,c);
    if(priv){for(let z=-3;z<4;z+=2)L(0,z,.16,1,Y);}else{for(let z=-3;z<4;z+=2)L(0,z,.24,1.3,W);}
    L(-2.72,0,.13,8,priv?Y:W); L(2.72,0,.13,8,priv?Y:W);
    if(hashStr(t.key)%5===0) box(.7,.02,.7,'#8a95bc',NS?1.4:0,.155,NS?0:1.4);
    if(priv&&(t.j===3||t.j===9)) plane(txtTex('TRUCKS ONLY',null,'#f2c230',512,96,64),5,1,RB.g,cx0-.9,0.16,cz0,NS?Math.PI/2:0,true);
  }else if(n>=3){
    for(let d=0;d<4;d++){ if(!m[d])continue; const v=d%2===0;
      for(let k=-2.4;k<=2.41;k+=0.96){ if(v) box(.52,0.02,1.15,W,k,0.155,DIRS[d][1]*2.85); else box(1.15,0.02,.52,W,DIRS[d][0]*2.85,0.155,k); }
      const nb=nbT(t,d); if(nb&&linkT(nb)){const r=rightOf(opp(d)); const cx=DIRS[d][0]*3.72+r[0]*1.45, cz=DIRS[d][1]*3.72+r[1]*1.45; box(v?2.7:.32,0.02,v?.32:2.7,W,cx,0.156,cz);}
    }
  }else{
    for(let d=0;d<4;d++){ if(!m[d])continue; const v=d%2===0; if(!priv){ for(let k=0.5;k<4;k+=2){ if(v) ln(0,DIRS[d][1]*(k+0.55),.24,1.3,W); else ln(DIRS[d][0]*(k+0.55),0,1.3,.24,W);} } }
    if(n===1){const tt=new THREE.Mesh(new THREE.CylinderGeometry(3.4,3.4,0.05,24),mat(ASPH));tt.position.set(cx0,0.121,cz0);RB.g.add(tt);}
  }
}
function makeHouse(g,t){
  const R=mulberry32(hashStr('h'+t.key)); const cols=['#f6e7d2','#e3eefc','#f8dede','#e2f2e4','#fff2c9','#ece4f7'], roofs=['#c45b4b','#6b778a','#8a5cd6','#3a5fd8','#b98455'];
  const h=new THREE.Group(); h.rotation.y=faceRot(t.face); g.add(h);
  box(4.6,2.4,4.2,cols[Math.floor(R()*cols.length)],0,1.2,0,h);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(3.55,1.7,4),mat(roofs[Math.floor(R()*roofs.length)])); roof.rotation.y=Math.PI/4; roof.position.set(0,3.25,0); roof.scale.set(1,1,0.92); roof.castShadow=true; h.add(roof);
  box(0.9,1.5,0.08,'#6b4a35',0.9,0.75,2.12,h); box(1.1,0.8,0.08,'#cfe6fb',-1.1,1.4,2.12,h); box(0.8,0.7,0.08,'#cfe6fb',2.32,1.4,0,h); box(0.3,0.9,0.3,'#c9d2df',1.4,2.9,-.8,h);
  box(7,0.05,1.6,'#d8e9d0',0,0.03,3.1,h,false); box(0.9,0.06,1.8,'#e6e0d4',0.9,0.05,3.1,h,false);
  box(0.12,0.9,0.12,'#e0564b',-2.9,0.45,3.4,h); box(0.35,0.25,0.25,'#e0564b',-2.9,0.95,3.4,h);
}
function makeShopTile(g,name,color,face){
  const h=new THREE.Group(); h.rotation.y=faceRot(face); g.add(h);
  box(6.6,3.8,5.6,'#f6f2ea',0,1.9,-0.2,h); box(6.8,0.35,5.8,color,0,3.92,-0.2,h);
  box(5.4,1.7,0.08,'#cfe6fb',0.4,1.35,2.62,h); box(0.9,2.2,0.1,'#4a5568',-2.6,1.1,2.63,h);
  for(let i=0;i<5;i++) box(1.3,0.12,1.2,i%2?'#ffffff':color,-2.6+i*1.3,2.65,3.2,h);
  plane(txtTex(name,color,'#fff',640,110,58),5,0.95,h,0.2,3.3,2.67);
  box(1.2,0.6,1,'#c9d2df',1.6,4.4,-1.4,h);
}
function makeOffice(g,t){
  const R=mulberry32(hashStr('o'+t.key)); const H=7+Math.floor(R()*5);
  const h=new THREE.Group(); h.rotation.y=faceRot(t.face); g.add(h);
  box(5.6,H,5.6,'#dfe7f1',0,H/2,0,h);
  for(let y=1.4;y<H-0.6;y+=1.25) box(5.68,0.55,5.68,'#a9c8ea',0,y,0,h,false);
  box(5.8,0.3,5.8,'#8a98ad',0,H+0.15,0,h); box(1.6,0.9,1.4,'#c9d2df',1,H+0.75,-1,h);
  box(2.4,0.15,1.2,'#3a5fd8',0,2.4,3.2,h); box(1.4,2.1,0.1,'#4a5568',0,1.05,2.85,h);
}
function makeDepot(g,t){
  const h=new THREE.Group(); h.rotation.y=faceRot(t.face); g.add(h);
  box(6.8,4,5.6,'#e8edf4',0,2,-0.6,h); box(7,0.35,5.8,'#2f5be0',0,4.12,-0.6,h);
  box(2.6,2.8,0.1,'#cdd6e3',-1.4,1.4,2.25,h); for(let k=0;k<5;k++) box(2.62,0.04,0.12,'#b9c3d1',-1.4,0.4+k*0.55,2.3,h,false);
  box(0.9,2,0.1,'#4a5568',2.2,1,2.25,h);
  plane(txtTex('WareTrack Depot','#2f5be0','#fff',640,110,54),4.4,0.8,h,0.6,3.45,2.21);
  box(3.4,0.05,1.4,'#c9d2df',-1.4,0.03,3.1,h,false);
}
function makeParkTile(g){box(7.6,0.04,7.6,'#d3efdc',0,0.03,0,g,false); box(7.6,0.03,1,'#f3f4fa',0,0.05,0,g,false); box(1,0.03,7.6,'#f3f4fa',0,0.05,0,g,false);
  const b=new THREE.Group(); b.position.set(2,0,1.3); g.add(b); box(1.6,.08,.5,'#b98455',0,.48,0,b);box(1.6,.4,.08,'#b98455',0,.75,.22,b);
  cyl(.5,.6,.4,'#e3e8ef',-2,.2,-2,g,14);}
function warnBadge(g){const s=sprite(warnTex,1.1);s.position.set(0,6.2,0);g.add(s);}
function renderTile(t){
  const old=town.objs.get(t.key); if(old){env.remove(old);town.objs.delete(t.key);}
  if(['grass','hq','cbig','cpark','lease','bigdepot','road','private'].includes(t.type)&&!(t.type==='grass'&&t.owner==='player'))return;
  const g=new THREE.Group(); g.position.set(tcx(t.i),0,tcz(t.j));
  if(t.type==='cshop') makeShopTile(g,t.shop.name,t.shop.color,t.face);
  else if(t.type==='house'||t.type==='chouse') makeHouse(g,t);
  else if(t.type==='shop') makeShopTile(g,t.name,t.color,t.face);
  else if(t.type==='office') makeOffice(g,t);
  else if(t.type==='depot') makeDepot(g,t);
  else if(t.type==='park') makeParkTile(g);
  else if(t.type==='trees') box(7.6,0.04,7.6,'#d8eedd',0,0.03,0,g,false);
  else if(t.type==='grass') box(7.7,0.03,7.7,'#e0e5f4',0,0.022,0,g,false);
  else if(t.type==='constr'){
    box(7.4,0.04,7.4,'#e4c98a',0,0.022,0,g,false);
    [[-3.3,-3.3],[3.3,-3.3],[-3.3,3.3],[3.3,3.3]].forEach(([x,z])=>box(0.12,1.1,0.12,'#f0a623',x,0.55,z,g));
    const cc=save.constr.find(x=>x.kind==='town'&&x.key===t.key);
    const r=box(2,1,2,'#f0a623',0,0,0,g,false);
    const p0=cc?constrProgress(cc):0;
    r.scale.y=Math.max(0.02,3*p0); r.position.y=r.scale.y/2;
    if(cc)constrScaffolds.set(cc.id,{riser:r,full:3,kind:'town'});
  }
  if(BTYPES[t.type]&&BTYPES[t.type].inc&&t.owner==='player'&&!connected(t)) warnBadge(g);
  if(t.type==='cshop'||t.type==='chouse'||(t.type==='shop'&&t.owner==='player'))g.userData.sel={kind:'dest',t};
  env.add(g); town.objs.set(t.key,g);
}
function makeNeighbor(name,cx,cz,trim,state,noTrucks){
  const g=new THREE.Group(); g.position.set(cx,0,cz); townStatic.add(g);
  const w=14,d=13,bx=-5;
  box(w,6,d,'#eef1f8',bx,3,0,g); box(w+.3,0.3,d+.3,trim,bx,6.1,0,g);
  {const rf=new THREE.Mesh(prism(w+0.4,d+0.4,2.2),mat(trim==='#8a98ad'?'#9aa8bc':'#2f5be0'));rf.position.set(bx,6.2,0);rf.castShadow=true;g.add(rf);}
  for(let i=0;i<3;i++){ box(0.12,3.4,2.6,'#cdd6e3',bx+w/2+0.06,1.7,-4+i*4,g); box(0.3,0.5,3,trim,bx+w/2+0.15,3.7,-4+i*4,g); }
  plane(txtTex(name,'#ffffff',trim,768,110,60),11,1.6,g,bx,4.4,d/2+0.02);
  box(9.6,0.05,15,'#cfd6e0',bx+w/2+4.9,0.03,0,g,false);
  if(state==='lease') plane(txtTex('FOR LEASE · 450 cr','#e0564b','#fff',640,128,60),5,1,g,bx+w/2+0.03,4.7,0,Math.PI/2);
  if(state!=='lease'&&!noTrucks){ [0,1].forEach(i=>{const tr=makeTruck(CARRIERS[(i+(cx>0?2:0))%4]); tr.position.set(bx+w/2+5.4,0,-4+i*8); tr.scale.setScalar(.8); g.add(tr);}); }
  return g;
}
function makeGas(cx,cz){
  const g=new THREE.Group(); g.position.set(cx,0,cz); townStatic.add(g);
  box(15.6,0.04,7.6,'#d3dae4',0,0.03,0,g,false);
  box(9,0.4,4.4,'#ffffff',-2,4.2,0,g); box(9.1,0.22,4.5,'#e0564b',-2,3.95,0,g);
  [[-6,-1.8],[2,-1.8],[-6,1.8],[2,1.8]].forEach(([a,b])=>box(0.3,3.9,0.3,'#e3e8ef',a,1.95,b,g));
  [-4.5,-2,0.5].forEach(a=>{box(0.7,1.3,0.5,'#f4f6fa',a,0.65,0,g);box(0.72,0.28,0.52,'#e0564b',a,1.15,0,g);});
  box(4,2.8,3.6,'#f6f2ea',5.2,1.4,0.8,g); box(4.1,.3,3.7,'#e0564b',5.2,2.95,0.8,g); box(2.6,1.1,.06,'#cfe6fb',5.2,1.5,-1.03,g);
  cyl(.12,.12,5.6,'#8a98ad',7.2,2.8,-3.2,g); plane(txtTex('FUEL · SNACKS','#e0564b'),3,0.9,g,7.2,5.3,-3.12);
}
function buildStatic(){
  while(townStatic.children.length) townStatic.remove(townStatic.children[0]);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(2600,2600),mat('#e8ebf6')); ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; townStatic.add(ground);
  barriers.length=0;
  const barrier=(px,pz,len,dir,kind,ox)=>{const g=new THREE.Group();g.position.set(px,0,pz);townStatic.add(g);
    box(0.35,1.1,0.35,'#eef1f8',0,0.55,0,g); box(0.42,0.22,0.42,'#e0564b',0,1.16,0,g);
    const arm=new THREE.Group(); arm.position.set(0,1.02,0); g.add(arm);
    for(let k=0;k<Math.round(len/0.6);k++) box(0.6,0.12,0.12,k%2?'#ffffff':'#e0564b',dir*(0.35+k*0.6),0,0,arm,false);
    barriers.push({arm,pz,dir,kind,open:0,ox});};
  const ctr=(x,z,col,rib,ry)=>{const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry||0;townStatic.add(g);box(6,2.5,2.4,col,0,1.25,0,g);for(let k=-2.7;k<=2.71;k+=0.45)box(0.07,2.3,2.46,rib,k,1.25,0,g,false);plane(txtTex('OCEANIC LINE',null,'#ffffff',512,96,60),3.4,0.55,g,0,1.55,1.24);};
  const fadeA=canvasTex(8,256,(g,W,H)=>{const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#ffffff');gr.addColorStop(0.55,'#ffffff');gr.addColorStop(1,'#000000');g.fillStyle=gr;g.fillRect(0,0,W,H);});
  const fadeM=new THREE.MeshStandardMaterial({color:'#e8ebf6',roughness:.82,alphaMap:fadeA,transparent:true,depthWrite:false});
  const fade=(x,z,w,d)=>{const v=d>w, L=Math.max(w,d), sg=v?Math.sign(z-(-2)):Math.sign(x-4), far=(v?z:x)+sg*L/2;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(14,64),fadeM); m.rotation.x=-Math.PI/2; m.rotation.z=v?(sg>0?0:Math.PI):(sg>0?-Math.PI/2:Math.PI/2);
    if(v)m.position.set(x,0.13,far-sg*30); else m.position.set(far-sg*30,0.13,z); m.renderOrder=2; townStatic.add(m);};
  const stub=(x,z,w,d)=>{if(Math.max(w,d)>=90)fade(x,z,w,d);box(w,0.07,d,ASPH,x,0.04,z,townStatic,false);box(w+(w<d?2:0),0.06,d+(d<w?2:0),CURB,x,0.03,z,townStatic,false);const v=d>w;for(let u=-Math.max(w,d)/2+1;u<Math.max(w,d)/2;u+=2)box(v?.24:1.3,0.02,v?1.3:.24,'#ffffff',v?x:x+u,0.085,v?z+u:z,townStatic,false);};
  ROWS_R.forEach(j=>{stub(tcx(GI0)-54,tcz(j),100,6);stub(tcx(GI1)+54,tcz(j),100,6);});
  SLICES.forEach(k=>{
    const ox=k*SLICE_W, o=12*k, sname=(SITES.find(x=>x.k===k)||{}).name||'';
    box(50,0.04,31,'#edf0f8',2+ox,0.02,0,townStatic,false);
    [-13.55,13.55].forEach(z=>{[[0.6,9.4],[14.6,16.6]].forEach(([a,b])=>{box(b-a,0.05,0.05,'#9aa8bc',(a+b)/2+ox,0.55,z,townStatic,false);box(b-a,0.05,0.05,'#9aa8bc',(a+b)/2+ox,0.95,z,townStatic,false);for(let x=a;x<=b+0.01;x+=1.9)box(0.07,1.05,0.07,'#8a98ad',x+ox,0.52,z,townStatic);});
      box(0.25,1.6,0.25,'#3a5fd8',9.5+ox,0.8,z,townStatic); box(0.25,1.6,0.25,'#3a5fd8',14.5+ox,0.8,z,townStatic);});
    box(5,0.04,5,'#e1e6ee',12+ox,0.021,-16,townStatic,false);
    stub(tcx(o),tcz(GJ1)+54,6,100);
    [o-8,o,o+4].forEach(i=>stub(tcx(i),tcz(GJ0)-54,6,100));
    [o-8,o+4].forEach(i=>stub(tcx(i),tcz(GJ1)+54,6,100));
    barrier(23.9+ox,20.8,5.4,-1,'tk',ox); barrier(14.6+ox,-14.2,4.8,-1,'van',ox);
    ctr(-16.5+ox,18.4,'#2fb3a5','#27998d',0); ctr(-8.5+ox,18.2,k%2?'#e0664f':'#3a5fd8',k%2?'#c4523d':'#3150bd',0.06);
    // site sign on the lawn
    const sg=new THREE.Group(); sg.position.set(-3.2+ox,0,17.2); townStatic.add(sg);
    box(0.2,1.6,0.2,'#8a98ad',-1.8,0.8,0,sg); box(0.2,1.6,0.2,'#8a98ad',1.8,0.8,0,sg);
    plane(txtTex(sname,'#2f5be0','#ffffff',768,128,64),4,0.7,sg,0,1.5,0.12);
    if(k%2===0) makeGas(40+ox,34); else box(15.6,0.03,7.6,'#d3efdc',40+ox,0.025,34,townStatic,false);
    const nb=k===0?['Union Freight','Kestrel Cold Storage','Meridian Parcel']:NEIGHBORS[String(k)];
    makeNeighbor(nb[0],-28+ox,-42,'#e0664f',null,k!==0);
    makeNeighbor(nb[1],36+ox,-42,'#25a69a',null,k!==0);
    makeNeighbor(nb[2],36+ox,46,'#8a5cd6',null,k!==0);
    if(k!==0) makeNeighbor(nb[3],-28+ox,46,'#3a5fd8',null,true);
    box(23.6,0.03,31.6,'#d3efdc',36+ox,0.025,-2,townStatic,false);
    const pond=new THREE.Mesh(new THREE.CircleGeometry(1,40),new THREE.MeshStandardMaterial({color:'#9cc7ec',roughness:.2,metalness:.05}));
    pond.rotation.x=-Math.PI/2; pond.scale.set(5,3.6,1); pond.position.set(37+ox,0.05,-2); townStatic.add(pond);
    cyl(.6,.8,.5,'#e3e8ef',37+ox,.25,-2,townStatic,16); cyl(.12,.12,1,'#e3e8ef',37+ox,.8,-2,townStatic);
    box(1.4,0.03,30,'#f3f4fa',27.4+ox,0.04,-2,townStatic,false); box(18,0.03,1.4,'#f3f4fa',36+ox,0.04,-12,townStatic,false); box(18,0.03,1.4,'#f3f4fa',36+ox,0.04,8,townStatic,false);
    box(7.6,0.04,23.6,'#dfe4f1',-28+ox,0.03,2,townStatic,false);
    for(let q=0;q<8;q++) box(3,0.012,0.1,'#ffffff',-29.8+ox,0.06,-8.5+q*3,townStatic,false);
    const pc=['#e0664f','#f4f6fa','#5b80e8','#4a5466','#e6c088','#8a5cd6'];
    [-7,-4,2,5,11].forEach((z,i)=>{if((i+k)%2&&k!==0)return;const c=makeCar(pc[(i+k+5)%pc.length]);c.position.set(-29.7+ox,0,z);townStatic.add(c);});
    box(7.6,0.04,7.6,'#e6e2d8',4+ox,0.03,-30,townStatic,false);
  });
  town.pins=[];
  SITES.forEach(st=>{const tex=canvasTex(640,140,(g,W,H)=>{g.fillStyle='rgba(255,255,255,.96)';const r=34;g.beginPath();g.moveTo(r,8);g.arcTo(W-8,8,W-8,H-8,r);g.arcTo(W-8,H-8,8,H-8,r);g.arcTo(8,H-8,8,8,r);g.arcTo(8,8,W-8,8,r);g.fill();
      g.fillStyle=st.accent;g.beginPath();g.moveTo(52,26);g.arcTo(196,26,196,114,16);g.arcTo(196,114,30,114,16);g.arcTo(30,114,30,26,16);g.arcTo(30,26,196,26,16);g.fill();
      g.fillStyle='#fff';g.font='800 46px "JetBrains Mono", monospace';g.textAlign='center';g.textBaseline='middle';g.fillText(st.code,113,72);
      g.fillStyle='#1b2638';g.textAlign='left';g.font='800 50px "Bricolage Grotesque", Figtree, sans-serif';g.fillText(st.name.length>17?st.name.slice(0,16)+'…':st.name,222,74);});
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true})); sp.renderOrder=12; sp.position.set(st.k*SLICE_W-10,16,0); sp.visible=false; env.add(sp); town.pins.push(sp);});
  buildUnit7();
  const bb=new THREE.Group(); bb.position.set(4,0,-31); townStatic.add(bb);
  box(0.25,4,0.25,'#8a98ad',-3,2,0,bb); box(0.25,4,0.25,'#8a98ad',3,2,0,bb); box(7.4,3,0.3,'#2f5be0',0,5.2,0,bb);
  plane(canvasTex(1024,384,(g,W,H)=>{g.fillStyle='#2f5be0';g.fillRect(0,0,W,H);g.fillStyle='#fff';g.font='800 120px "Bricolage Grotesque", Figtree, sans-serif';g.textAlign='center';g.fillText('WareTrack',W/2,170);g.font='600 56px Figtree, sans-serif';g.fillStyle='#dfe7ff';g.fillText('Now hiring forklift pros',W/2,270);}),7,2.8,bb,0,5.2,0.16);
}
function buildUnit7(){
  if(town.unit7) townStatic.remove(town.unit7);
  town.unit7=save.town.unit7?makeNeighbor('WareTrack Depot 2',-28,46,'#2f5be0'):makeNeighbor('Unit 7',-28,46,'#8a98ad','lease');
}
function plantTrees(list){
  const n=list.length; if(!n)return null;
  const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.09,.12,1,6),mat('#9c8a78'),n);
  const crown=new THREE.InstancedMesh(new THREE.SphereGeometry(1,14,12),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.75}),n);
  const d=new THREE.Object3D(), C=['#4cc777','#5bd085','#41b86b','#6fd894','#3fae66','#7ad99b','#57c47f'];
  list.forEach((t,i)=>{
    const s=t.s; d.rotation.set(0,0,0); d.position.set(t.x,s*0.75,t.z); d.scale.set(s*0.7,s*1.5,s*0.7); d.updateMatrix(); trunk.setMatrixAt(i,d.matrix);
    d.position.set(t.x,s*2.15,t.z); d.rotation.set(0,t.r,0); d.scale.set(s*.82,s*.95,s*.82); d.updateMatrix(); crown.setMatrixAt(i,d.matrix);
    crown.setColorAt(i,new THREE.Color(C[t.c]));
  });
  trunk.castShadow=true; crown.castShadow=true; crown.receiveShadow=true; trunk.frustumCulled=crown.frustumCulled=false; env.add(trunk); env.add(crown);
  return [trunk,crown];
}
function plantLamps(list){
  const n=list.length; if(!n)return null;
  const pole=new THREE.InstancedMesh(new THREE.CylinderGeometry(.07,.09,4.4,6),mat('#8a98ad'),n);
  const head=new THREE.InstancedMesh(new THREE.BoxGeometry(.8,.14,.32),new THREE.MeshStandardMaterial({color:'#fff6d8',emissive:'#ffe7a0',emissiveIntensity:.35}),n);
  const d=new THREE.Object3D();
  list.forEach((p,i)=>{d.rotation.set(0,p.r,0);d.scale.set(1,1,1);d.position.set(p.x,2.2,p.z);d.updateMatrix();pole.setMatrixAt(i,d.matrix);
    d.position.set(p.x+Math.cos(p.r)*0.35,4.4,p.z-Math.sin(p.r)*0.35);d.updateMatrix();head.setMatrixAt(i,d.matrix);});
  pole.castShadow=true; pole.frustumCulled=head.frustumCulled=false; env.add(pole); env.add(head);
  return [pole,head];
}
function rebuildFoliage(){
  (town.trees||[]).forEach(m=>env.remove(m)); (town.lamps||[]).forEach(m=>env.remove(m));
  const T=[], Lp=[];
  town.tiles.forEach(t=>{
    const R=mulberry32(hashStr('tr'+t.key)), cx=tcx(t.i), cz=tcz(t.j);
    let n=0;
    if(t.type==='trees')n=5; else if(t.type==='park')n=3; else if(t.type==='cpark')n=2; else if(t.type==='grass'&&t.wild)n=1+Math.floor(R()*2);
    else if(t.type==='hq'&&(t.j===5))n=1;
    for(let k=0;k<n;k++){const x=cx+(R()-.5)*(t.type==='park'?5:6.2), z=cz+(R()-.5)*(t.type==='park'?5:6.2);
      if(t.type==='cpark'&&Math.hypot(x-37-SLICE_W*sliceOfI(t.i),z+2)<7)continue; if(t.type==='park'&&Math.abs(x-cx)<0.8)continue;
      T.push({x,z,s:.8+R()*.5,r:R()*TAU,c:Math.floor(R()*7)});}
    if(t.type==='road'&&!town.lights.has(t.key)){
      const m=roadMask(t), NS=m[0]&&m[2]&&!m[1]&&!m[3], EW=m[1]&&m[3]&&!m[0]&&!m[2];
      if((NS||EW)&&(t.i+t.j)%2===0){const s=(t.i*7+t.j*3)%4<2?1:-1;
        if(NS)Lp.push({x:cx+s*3.55,z:cz,r:s>0?Math.PI:0}); else Lp.push({x:cx,z:cz+s*3.55,r:s>0?Math.PI/2:-Math.PI/2});}
    }
  });
  town.trees=plantTrees(T); town.lamps=plantLamps(Lp);
}
function lampMats(){const mk=(c)=>new THREE.MeshStandardMaterial({color:'#2a2f38',emissive:c,emissiveIntensity:0});return {r:mk('#ff3b30'),a:mk('#ffb020'),g:mk('#22d36f')};}
function rebuildLights(){
  town.lightObjs.forEach(o=>env.remove(o)); town.lightObjs=[]; town.lights.clear();
  town.tiles.forEach(t=>{
    if(!linkT(t))return; const m=roadMask(t); if(m.filter(Boolean).length<3)return;
    const L={key:t.key,mats:{ns:lampMats(),ew:lampMats()},off:(hashStr(t.key)%166)/10,st:null};
    const cx=tcx(t.i),cz=tcz(t.j), g=new THREE.Group(); g.position.set(cx,0,cz);
    for(let d=0;d<4;d++){ if(!m[d])continue; const nb=nbT(t,d); if(!nb)continue;
      const r=rightOf(opp(d)), px=DIRS[d][0]*3.7+r[0]*3.7, pz=DIRS[d][1]*3.7+r[1]*3.7, ax=d%2===0?'ns':'ew', M=L.mats[ax], ns=d%2===0;
      rbBox(.14,3.6,.14,'#4a515c',cx+px,1.8,cz+pz);
      rbBox(ns?.42:.32,1.15,ns?.32:.42,'#2a2f38',cx+px,3.4,cz+pz);
      rbBox(ns?.5:.4,.08,ns?.4:.5,'#2a2f38',cx+px+DIRS[d][0]*.04,4.0,cz+pz+DIRS[d][1]*.04);
      [['r',.36],['a',0],['g',-.36]].forEach(([k,y])=>{const lm=new THREE.Mesh(bgeo(.24,.24,.06),M[k]);lm.position.set(px+DIRS[d][0]*.17,3.4+y,pz+DIRS[d][1]*.17);lm.rotation.y=faceRot(d);g.add(lm);});
    }
    env.add(g); town.lightObjs.push(g); town.lights.set(t.key,L);
  });
}
function lightState(L){const c=(town.lightT+L.off)%16.6;
  if(c<6)return 'gr'; if(c<7.5)return 'ar'; if(c<8.3)return 'rr'; if(c<14.3)return 'rg'; if(c<15.8)return 'ra'; return 'rr';}
function updateLights(dt){
  town.lightT+=dt;
  town.lights.forEach(L=>{const s=lightState(L); if(s===L.code)return; L.code=s; L.st={ns:s[0],ew:s[1]};
    ['ns','ew'].forEach(ax=>{const M=L.mats[ax],v=L.st[ax]; M.r.emissiveIntensity=v==='r'?1.8:0; M.a.emissiveIntensity=v==='a'?1.8:0; M.g.emissiveIntensity=v==='g'?1.8:0;});});
}
function recomputeReach(){
  const s=new Set([START]),q=[START];
  while(q.length){const t=town.tiles.get(q.shift());for(let d=0;d<4;d++){const n=nbT(t,d);if(isRoadT(n)&&!s.has(n.key)){s.add(n.key);q.push(n.key);}}}
  town.reach=s;
  town.roads=[...town.tiles.values()].filter(isRoadT);
  town.portals=[]; town.roads.forEach(t=>{for(let d=0;d<4;d++){if(!nbT(t,d))town.portals.push({t,h:opp(d)});}});
}
function connected(t){
  if(t.type==='bigdepot'||t.type==='lease'){for(const x of town.tiles.values()){if(x.type===t.type){for(let d=0;d<4;d++){const n=nbT(x,d);if(n&&town.reach.has(n.key))return true;}}}return false;}
  for(let d=0;d<4;d++){const n=nbT(t,d);if(n&&town.reach.has(n.key))return true;}return false;
}
function nearCount(t,r,type){let c=0;for(let di=-r;di<=r;di++)for(let dj=-r;dj<=r;dj++){if(!di&&!dj||Math.abs(di)+Math.abs(dj)>r)continue;const n=getT(t.i+di,t.j+dj);if(n&&n.owner==='player'&&n.type===type)c++;}return c;}
function bIncome(t){
  const B=BTYPES[t.type]; if(!B||!B.inc||t.owner!=='player'||!connected(t))return 0;
  let v=B.inc; if(t.type==='shop')v+=Math.min(2,0.25*nearCount(t,2,'house'));
  let m=1; if(nearCount(t,2,'park'))m+=0.2; if(nearCount(t,1,'trees'))m+=0.05; return v*m;
}
function recomputeEcon(){
  let inc=0,up=0,b=0,plots=0;
  town.tiles.forEach(t=>{ if(t.owner!=='player'||t.type==='hq'||t.type==='private')return; plots++; if(BTYPES[t.type]&&t.type!=='road')b++; inc+=bIncome(t); if(t.type==='road')up+=0.05; });
  if(save.town.unit7){plots+=0; b++; const any=[...town.tiles.values()].find(t=>t.type==='bigdepot'); if(any&&connected(any))inc+=LEASE.inc;}
  town.econ={inc,up,net:inc-up,b,plots};
}
function landPrice(t){
  let adj=false; for(let d=0;d<4;d++){if(isRoadT(nbT(t,d)))adj=true;}
  const dist=Math.min(...SLICES.map(k=>Math.abs(t.i-(12*k-3))))+Math.abs(t.j-3);
  return Math.round((30+(adj?25:0)+Math.max(0,30-2*dist))/5)*5;
}
function customers(){
  const out=[];
  town.tiles.forEach(t=>{ if((t.type!=='cshop'&&t.type!=='chouse')||sliceOfI(t.i)!==site.k||(t.far&&dlv('drv')<1))return; const r=tkey(t.i+DIRS[t.face][0],t.j+DIRS[t.face][1]); if(town.reach.has(r)) out.push(t.cust||(t.cust={key:t.key,name:t.type==='cshop'?t.shop.name:t.addr,addr:t.addr,home:t.type==='chouse',road:r,x:tcx(t.i),z:tcz(t.j)})); });
  town.tiles.forEach(t=>{ if(t.type==='shop'&&t.owner==='player'&&Math.abs(sliceOfI(t.i)-site.k)<=1){ const n=nbT(t,t.face); if(n&&town.reach.has(n.key)) out.push({key:t.key,name:t.name,addr:_wt('world.addr.yourShop'),home:false,road:n.key,x:tcx(t.i),z:tcz(t.j)}); }});
  return out;
}
function initTown(){
  if(town.built)return; town.built=true;
  genTown(); recomputeReach(); buildStatic();
  town.tiles.forEach(renderTile); rebuildRoads(); rebuildFoliage(); recomputeEcon();
  const nCars=Math.min(72,Math.floor(town.roads.length/6));
  const cc=['#e0664f','#f4f6fa','#5b80e8','#4a5466','#e6c088','#8a5cd6','#25a69a','#f08aa8','#c9d2df','#3f9a62'];
  for(let k=0;k<nCars;k++){const g=makeCar(cc[k%cc.length]);env.add(g);const c={kind:'car',g,x:0,z:0,yaw:0,v:0,vmax:4.6+Math.random()*1.6,pts:[],blockT:0,ghost:0};cars.push(c);placeCarRandom(c);}
}
function townChanged(keys,roadChanged){
  const all=new Set();
  keys.forEach(k=>{const t=town.tiles.get(k);if(!t)return;all.add(k);for(let d=0;d<4;d++){const n=nbT(t,d);if(n)all.add(n.key);}});
  recomputeReach();
  if(roadChanged) rebuildRoads();
  town.tiles.forEach(t=>{if(t.owner==='player'&&BTYPES[t.type]&&BTYPES[t.type].inc)all.add(t.key);});
  all.forEach(k=>renderTile(town.tiles.get(k)));
  rebuildFoliage(); recomputeEcon(); refreshTint();
  if(roadChanged) cars.forEach(placeCarRandom);
}
function buildEnv(){initTown();}

/* ---- paths along lanes (right-hand traffic) ---- */
function entryPt(t,h){const cx=tcx(t.i),cz=tcz(t.j),s=DIRS[opp(h)],r=rightOf(h);return [cx+s[0]*4+r[0]*LANE,cz+s[1]*4+r[1]*LANE];}
function exitPt(t,o){const cx=tcx(t.i),cz=tcz(t.j),s=DIRS[o],r=rightOf(o);return [cx+s[0]*4+r[0]*LANE,cz+s[1]*4+r[1]*LANE];}
function tilePathFrom(p,t,h,o){
  const cx=tcx(t.i),cz=tcz(t.j),e=exitPt(t,o);
  if(o===h) return [e];
  if(o===opp(h)){const D=DIRS[h],r=rightOf(h);return [[cx+D[0]*2.2+r[0]*LANE,cz+D[1]*2.2+r[1]*LANE],[cx+D[0]*3.1+r[0]*0.6,cz+D[1]*3.1+r[1]*0.6],[cx+D[0]*3.1-r[0]*0.6,cz+D[1]*3.1-r[1]*0.6],[cx+D[0]*2.2-r[0]*LANE,cz+D[1]*2.2-r[1]*LANE],e];}
  const c=h%2===1?[e[0],p[1]]:[p[0],e[1]], out=[];
  for(let k=1;k<=7;k++){const u=k/7,a=(1-u)*(1-u),b=2*(1-u)*u,d=u*u;out.push([a*p[0]+b*c[0]+d*e[0],a*p[1]+b*c[1]+d*e[1]]);}
  return out;
}
function tilePath(t,h,o){const p=entryPt(t,h);return [p,...tilePathFrom(p,t,h,o)];}
function pickExit(t,h){const cs=carConns(t);let opts=cs.filter(d=>d!==opp(h));if(!opts.length)opts=[opp(h)];if(opts.includes(h)&&Math.random()<.5)return h;return opts[Math.floor(Math.random()*opts.length)];}
function placeCarRandom(c){
  if(!town.roads.length)return;
  for(let tries=0;tries<12;tries++){
    const t=town.roads[Math.floor(Math.random()*town.roads.length)], cs=carConns(t); if(!cs.length)continue;
    const e=cs[Math.floor(Math.random()*cs.length)], h=opp(e), o=pickExit(t,h), pts=tilePath(t,h,o);
    if(cars.some(x=>x!==c&&Math.hypot(x.x-pts[0][0],x.z-pts[0][1])<7))continue;
    c.t=t;c.h=o;c.pts=pts.slice(1);c.x=pts[0][0];c.z=pts[0][1];c.yaw=Math.atan2(-(pts[1][1]-pts[0][1]),pts[1][0]-pts[0][0]);c.v=0;c.g.position.set(c.x,0,c.z);c.g.rotation.y=c.yaw;return;
  }
}
function advanceCar(c){
  if(c.exiting){
    const P=town.portals; const p=P[Math.floor(Math.random()*P.length)]; if(!p){placeCarRandom(c);c.exiting=false;return;}
    const e=entryPt(p.t,p.h), D=DIRS[p.h], sx=e[0]-D[0]*88, sz=e[1]-D[1]*88;
    if(cars.some(x=>x!==c&&Math.hypot(x.x-sx,x.z-sz)<7)){c.v=0;return;}
    c.exiting=false; const o=pickExit(p.t,p.h); c.t=p.t; c.h=o; c.x=sx; c.z=sz; c.yaw=Math.atan2(-D[1],D[0]); c.pts=[e,...tilePathFrom(e,p.t,p.h,o)]; return;
  }
  const n=nbT(c.t,c.h);
  if(!n){const D=DIRS[c.h], e=exitPt(c.t,c.h); c.pts=[[e[0]+D[0]*90,e[1]+D[1]*90]]; c.exiting=true; return;}
  if(!isRoadT(n)){placeCarRandom(c);return;}
  const h=c.h,o=pickExit(n,h); c.t=n; c.h=o; c.pts=tilePath(n,h,o);
}
/* ---- rules: signals, following distance, yielding ---- */
function heading(o){return [Math.cos(o.yaw),-Math.sin(o.yaw)];}
const FRONT={car:1.3,van:1.9,tk:5.3};
function bodyPts(v){const [dx,dz]=heading(v),F=FRONT[v.kind]||1.3,B=v.kind==='tk'?5.2:1.3,X=wx(v);return [[X+dx*F,v.z+dz*F],[X,v.z],[X-dx*B,v.z-dz*B]];}
function lightBlocked(o){
  const [dx,dz]=heading(o),F=FRONT[o.kind]||1.3,fx=wx(o)+dx*F,fz=o.z+dz*F;
  const cur=tileAt(fx,fz),nx=tileAt(fx+dx*1.3,fz+dz*1.3);
  if(!nx||nx===cur)return false;
  const L=town.lights.get(nx.key); if(!L||!L.st)return false;
  const v=L.st[Math.abs(dz)>Math.abs(dx)?'ns':'ew'];
  if(v==='g')return false; if(v==='a'&&(o.v||3)>2.5)return false; return true;
}
function leaderBlocked(o){
  const [dx,dz]=heading(o),F=FRONT[o.kind]||1.3,ox=wx(o),fx=ox+dx*F,fz=o.z+dz*F,look=o.kind==='car'?3.2:3.6;
  const lists=[cars,vans,trucks,liteTrucks];
  for(const arr of lists)for(const v of arr){
    if(v===o||Math.abs(wx(v)-ox)>16||Math.abs(v.z-o.z)>16)continue;
    for(const p of bodyPts(v)){const rx=p[0]-fx,rz=p[1]-fz,ah=rx*dx+rz*dz;if(ah<-0.4||ah>look)continue;if(Math.abs(rx*dz-rz*dx)<1.25)return v;}
  }
  return null;
}
let UID=0; const uidOf=o=>o.uid||(o.uid=++UID);
function untangle(o,L){if(Math.hypot(wx(L)-wx(o),L.z-o.z)>=2.4)return null; if(uidOf(o)>uidOf(L)){o.blockT=0;o.gateT=0;return true;} o.ghost=0.5; return false;}
function inCycle(o){let c=o.blocker,n=0;while(c&&n<10){if(c===o)return true;c=c.blocker;n++;}return false;}
function vehBlocked(o,dt){
  if(o.ghost>0){o.ghost-=dt;return lightBlocked(o);}
  const lb=lightBlocked(o); if(lb){o.blockT=0;o.blocker=null;return true;}
  const L=leaderBlocked(o);
  if(L){o.blocker=L;{const u=untangle(o,L);if(u!==null)return u;}o.blockT=(o.blockT||0)+dt;if((inCycle(o)&&o.blockT>1.5)||o.blockT>25){o.ghost=1.6;o.blockT=0;}return true;}
  o.blocker=null;o.blockT=0;return false;
}
function updateCars(dt){
  for(const c of cars){
    const blk=vehBlocked(c,dt), target=blk?0:c.vmax;
    c.v+=clamp(target-c.v,-14*dt,5*dt);
    let move=c.v*dt,guard=0;
    while(move>1e-5&&guard++<20){
      if(!c.pts.length){advanceCar(c);if(!c.pts.length)break;}
      const p=c.pts[0],dx=p[0]-c.x,dz=p[1]-c.z,d=Math.hypot(dx,dz);
      if(d>1e-4)c.yaw=Math.atan2(-dz,dx);
      if(d<=move){c.x=p[0];c.z=p[1];c.pts.shift();move-=d;}else{c.x+=dx/d*move;c.z+=dz/d*move;move=0;}
    }
    c.g.position.set(c.x,0,c.z); c.g.rotation.y=c.yaw; c.g.visible=onMap(c.x,c.z);
    if(c.exiting&&!c.pts.length)c.g.visible=false;
  }
  updateLights(dt);
}
function bfs(from,to){
  const prev=new Map([[from,null]]),q=[from];
  while(q.length){const k=q.shift();if(k===to)break;const t=town.tiles.get(k);for(let d=0;d<4;d++){const n=nbT(t,d);if(isRoadT(n)&&!prev.has(n.key)){prev.set(n.key,k);q.push(n.key);}}}
  if(!prev.has(to))return null; const path=[];let k=to;while(k){path.unshift(town.tiles.get(k));k=prev.get(k);} return path;
}
function dirBetween(a,b){for(let d=0;d<4;d++)if(a.i+DIRS[d][0]===b.i&&a.j+DIRS[d][1]===b.j)return d;return 0;}
function pullover(t,h){const r=rightOf(h);return [tcx(t.i)+r[0]*2.35,tcz(t.j)+r[1]*2.35];}
function routeThrough(path,h,startPos,endOut){
  const pts=[];
  path.forEach((t,k)=>{
    const o=k<path.length-1?dirBetween(t,path[k+1]):endOut;
    if(k===0&&startPos){ if(o==null)return; pts.push(...tilePathFrom(startPos,t,h,o)); h=o; return; }
    if(o==null){pts.push(entryPt(t,h),pullover(t,h));return;}
    pts.push(...tilePath(t,h,o)); h=o;
  });
  return {pts,h};
}
/* ---------------- delivery business: jobs, fleet, upgrades ---------------- */
const DEL_UP=[
  {key:'drv',group:'Staff',get name(){return t('world.up.drv.name')},costs:[90,180,320],desc:l=>t('world.up.drv.desc',{n:FLEET[l]})+(l<3?' · '+t('world.up.next',{v:FLEET[l+1]}):'')},
  {key:'train',group:'Staff',get name(){return t('world.up.train.name')},costs:[70,150],desc:l=>t('world.up.train.desc',{p:12*l})+(l<2?' · '+t('world.up.next',{v:(12*(l+1))+'%'}):'')},
  {key:'disp',group:'Staff',get name(){return t('world.up.disp.name')},costs:[110],desc:()=>t('world.up.disp.desc')},
  {key:'scan',group:'Tools',get name(){return t('world.up.scan.name')},costs:[60],desc:()=>t('world.up.scan.desc')},
  {key:'gps',group:'Tools',get name(){return t('world.up.gps.name')},costs:[100,200],desc:l=>t('world.up.gps.desc',{p:15*l})+(l<2?' · '+t('world.up.next',{v:'+'+(15*(l+1))+'%'}):'')},
  {key:'big',group:'Tools',get name(){return t('world.up.big.name')},costs:[160],desc:()=>t('world.up.big.desc')},
  {key:'ev',group:'Tools',get name(){return t('world.up.ev.name')},costs:[120],desc:()=>t('world.up.ev.desc')},
];
const FLEET=[4,5,6,7];
function delSave(){if(!save.del)save.del={};const d=save.del;d.lv=Object.assign({drv:0,train:0,disp:0,scan:0,gps:0,big:0,ev:0},d.lv||{});if(d.rating==null)d.rating=4;d.earned=d.earned|0;d.done=d.done|0;d.onTime=d.onTime|0;return d;}
const dlv=k=>delSave().lv[k];
const del={jobs:[],recent:[],today:0,seq:0};
const fleetSize=()=>FLEET[dlv('drv')];
const tripCost=()=>dlv('ev')?0:2;
function routeTiles(a,b){const p=bfs(a,b);return p?p.length:null;}
function queueDelivery(o){
  if(!o||!o.shop)return;
  const s=town.tiles.get(tkey(12*site.k-1,0)); const n=s?routeTiles(s.key,o.shop.road):null; if(n==null)return;
  const now=clockMin(), due=now+30+Math.round(3*n)+(dlv('disp')?5:0);
  del.jobs.push({id:o.id,order:o,shop:o.shop,dist:n,created:now,due,rush:!!o.rush});
  dirty=true;
}
const resTxt=r=>t('world.res.'+(r==='on time'?'onTime':r));
function delFee(j){return (2+0.25*Math.min(14,j.dist))*(1+0.15*dlv('gps'))*(0.8+0.1*delSave().rating);}
function deliverJob(v,j){
  const D=delSave(), now=clockMin(), left=j.due-now;
  let fee=delFee(j), res;
  if(left>=10){fee*=1.25;res='early';} else if(left>=0)res='on time'; else {fee*=0.5;res='late';}
  if(res!=='late'){D.streak=(D.streak||0)+1;fee*=streakMult();}else D.streak=0;
  if(dlv('scan'))fee+=1;
  const cr=Math.max(1,Math.round(fee));
  const target=res==='early'?5:res==='on time'?4.3:2.5; D.rating=Math.round((D.rating+(target-D.rating)*0.15)*100)/100;
  mission('deliver',1); mission('delcr',cr); if(res==='early')mission('early',1); if(j.shop.home)mission('home',1); mission('streak',D.streak||0,true);
  if(D.streak&&D.streak%5===0)setTimeout(()=>popup(t('world.del.streakPop',{n:D.streak,m:streakMult().toFixed(2)}),j.shop.x,7,j.shop.z,'gold'),400);
  save.credits+=cr; D.earned+=cr; D.done++; if(res!=='late')D.onTime++; del.today+=cr; v.earned+=cr;
  if(game.phase==='shift'&&game.st){game.st.del=(game.st.del||0)+cr; if(res!=='late'){game.st.delOn=(game.st.delOn||0)+1; if(game.st.delOn>=10)unlock('courier');}}
  j.deliveredAt=now; j.res=res; {const ds=destStats(j.shop.key);ds.recv++;ds.cr+=cr;ds.last=now;if(res==='late')ds.late++;else ds.onTime++;}
  del.recent.unshift({job:j,id:j.id,shop:j.shop.name,cr,res,t:now,wait:Math.round(j.sent-j.created),drive:Math.round(now-j.sent),promise:j.due-j.created}); if(del.recent.length>12)del.recent.pop();
  popup('+'+cr+' cr'+(res==='early'?' · '+t('world.res.early'):res==='late'?' · '+t('world.res.late'):''),j.shop.x,5,j.shop.z,res==='late'?'bad':'gold');
  log(t('world.del.logDelivered',{id:j.id,shop:j.shop.name,res:resTxt(res),cr}),res==='late'?'warn':'ok');
  writeSave(); dirty=true;
}
function depotClear(){const x=12+OX,z=-12.4;return !vans.some(v=>Math.hypot(v.x-x,v.z-z)<3.4);}
function dispatchVans(){
  if(!del.jobs.length||vans.length>=fleetSize()||!depotClear())return;
  if(dlv('disp'))del.jobs.sort((a,b)=>a.due-b.due);
  const pool=game.hands?del.jobs.filter(j=>j.go):del.jobs; if(!pool.length)return;
  const take=pool.slice(0,dlv('big')?2:1); take.forEach(j=>del.jobs.splice(del.jobs.indexOf(j),1)); take.forEach(j=>j.sent=clockMin());
  if(!spawnVan(take)){del.jobs.unshift(...take);}
}
function spawnVan(jobs){
  const s=town.tiles.get(tkey(12*site.k-1,0)); if(!s)return false;
  const mv=p=>({t:'move',x:p[0],z:p[1]}), steps=[];
  let h=0, pos=null, at=s.key;
  const v={kind:'van',id:'VAN-'+(++del.seq),ox:OX,g:null,x:12+OX,z:-12.4,yaw:Math.PI/2,steps:[],spd:8.5*(1+0.12*dlv('train')),rspd:3,turn:3.6,gate:1.2,blockT:0,ghost:0,jobs:jobs.slice(),earned:0,state:t('world.van.leaving'),driver:hpick(DRIVERS,'v'+del.seq)};
  steps.push(mv([12+OX,-17.2]));
  for(const j of jobs){
    const p=bfs(at,j.shop.road); if(!p)return false;
    const r=routeThrough(p,h,pos,null); steps.push({t:'do',fn:()=>{v.state=t('world.van.drivingTo',{shop:j.shop.name});}},...r.pts.map(mv));
    steps.push({t:'do',fn:()=>{v.state=t('world.van.droppingAt',{shop:j.shop.name});}},{t:'wait',s:dlv('scan')?0.8:1.6},{t:'do',fn:()=>{deliverJob(v,j);v.jobs=v.jobs.filter(x=>x!==j);}});
    h=r.h; pos=r.pts.length?r.pts[r.pts.length-1]:pos; at=j.shop.road;
  }
  const back=bfs(at,s.key); if(!back)return false;
  const b=routeThrough(back,h,pos,2);
  steps.push({t:'do',fn:()=>{v.state=t('world.van.returning');}},...b.pts.map(mv),mv([10.4+OX,-12.6]),{t:'do',fn:()=>{v.done=true;}});
  v.g=makeVan(); v.g.userData.sel=v; env.add(v.g); v.steps=steps;
  save.credits=Math.max(0,save.credits-tripCost()); del.today-=tripCost();
  vans.push(v); place(v); dirty=true; return true;
}
function vanAhead(o,dt){
  if(o.ghost>0){o.ghost-=dt;return false;}
  const [dx,dz]=heading(o),fx=o.x+dx*1.9,fz=o.z+dz*1.9;
  for(const arr of [vans,cars,trucks,liteTrucks])for(const v of arr){if(v===o||Math.abs(wx(v)-o.x)>14||Math.abs(v.z-o.z)>14)continue;for(const p of bodyPts(v)){const rx=p[0]-fx,rz=p[1]-fz,ah=rx*dx+rz*dz;if(ah<-0.4||ah>(v.kind==='van'?2.6:3.4))continue;
    if(Math.abs(rx*dz-rz*dx)<1.1){o.blocker=v;{const u=untangle(o,v);if(u!==null)return u;}o.gateT=(o.gateT||0)+dt;if((inCycle(o)&&o.gateT>1.5)||o.gateT>60){o.ghost=1.2;o.gateT=0;return false;}return true;}}}
  o.gateT=0; o.blocker=null; return false;
}
function updateVans(dt){
  if(dt>0)dispatchVans();
  for(let i=vans.length-1;i>=0;i--){const v=vans[i];runSteps(v,dt);place(v);v.g.visible=onMap(v.x,v.z);if(v.done){env.remove(v.g);vans.splice(i,1);if(selected===v)select(null);}}
  if(dt>0){const now=clockMin();del.jobs.forEach(j=>{if(!j.warned&&now>j.due){j.warned=true;log(t('world.del.logOverdue',{id:j.id}),'bad');}});}
}
function clearVans(){vans.forEach(v=>env.remove(v.g));vans.length=0;del.jobs.length=0;del.today=0;del.recent.length=0;}
function buyDel(key){
  const u=DEL_UP.find(x=>x.key===key), l=dlv(key), c=u&&u.costs[l]; if(!u||c==null)return;
  if(save.credits<c){toast('info',t('world.up.noCredits'),t('world.up.costs',{name:u.name,c}),ICON.lock);return;}
  save.credits-=c; delSave().lv[key]++; writeSave(); Snd.play('build');
  toast('info',t('world.up.upgraded',{name:u.name}),u.desc(dlv(key)),key==='drv'||key==='train'||key==='disp'?ICON.up:ICON.wrench);
  if(key==='drv'&&dlv('drv')>=3)unlock('fleet');
  dirty=true;
}
/* ---------------- network: transfer trucks between warehouses ---------------- */
const xfers=[];
function xferRoute(fromK,toK){
  const a=town.tiles.get(tkey(12*fromK,0)), b=town.tiles.get(tkey(12*toK,10)); if(!a||!b||fromK===toK)return null;
  const p=bfs(a.key,b.key); if(!p)return null;
  const ox=fromK*SLICE_W, start=[21.6+ox,-18];
  const r=routeThrough(p,0,start,0);
  return [[21.6+ox,-12.5],start,...r.pts];
}
function laneFree(x,z,r){return ![...trucks.map(t=>[wx(t),t.z]),...liteTrucks.map(t=>[t.x,t.z]),...vans.map(v=>[v.x,v.z])].some(([a,b])=>Math.hypot(a-x,b-z)<r);}
function spawnXfer(fromIdx,toIdx,opt){
  opt=opt||{}; const A=SITES[fromIdx],B=SITES[toIdx]; const pts=xferRoute(A.k,B.k); if(!pts)return null;
  if(!laneFree(pts[0][0],pts[0][1],9))return null;
  const car=CARRIERS.find(c=>c.name==='WareTrack')||CARRIERS[0], g=makeTruck(car,!!opt.sku); env.add(g);
  const now=clockMin();
  const t={kind:'tk',xfer:true,from:fromIdx,to:toIdx,id:'TRF-'+(++liteSeq),ship:'#TRF-'+(30000+liteSeq),car,sku:opt.sku||null,n:opt.n||irand(4,6),g,
    x:pts[0][0],z:pts[0][1],yaw:Math.PI/2,steps:pts.slice(1).map(p=>({t:'move',x:p[0],z:p[1]})),spd:6.5,rspd:2.2,turn:1.0,gate:1.25,blockT:0,ghost:0,state:'transfer',
    times:{start:now},cargo:[],unloaded:0,requested:!!opt.requested};
  t.total=xferLeft(t); g.userData.sel=t; xfers.push(t); liteTrucks.push(t); placeL(t);
  return t;
}
function xferLeft(t){let d=0,x=t.x,z=t.z;for(const s of t.steps){if(s.t!=='move')continue;d+=Math.hypot(s.x-x,s.z-z);x=s.x;z=s.z;}return d;}
function xferEta(t){return clockMin()+Math.round(xferLeft(t)/(t.spd*0.7))+2;}
function arriveXfer(t){
  const i=xfers.indexOf(t); if(i>=0)xfers.splice(i,1);
  const A=SITES[t.from], B=SITES[t.to];
  if(t.to===game.siteIdx){
    const k=liteTrucks.indexOf(t); if(k>=0)liteTrucks.splice(k,1); env.remove(t.g);
    const cargo=[]; for(let q=0;q<t.n;q++)cargo.push(t.sku&&q<t.n-1?t.sku:pick(SKU_KEYS));
    const nt=spawnTruck({id:t.id,ship:t.ship,car:t.car,cargo,late:false,expedite:t.sku},null);
    nt.x=t.x-OX; nt.z=t.z; nt.yaw=t.yaw; nt.xferFrom=A; place(nt);
    log(_wt('world.xfer.logArrived',{id:t.id,from:A.name,n:cargo.length}),'info');
    mission('xfer',1);
    if(t.requested)notify('ok',_wt('world.xfer.arrivedTitle'),_wt('world.xfer.arrivedBody',{id:t.id,from:A.name}));
    if(selected===t)select(nt);
  }else{
    const L=lites.get(t.to); if(!L){const k=liteTrucks.indexOf(t);if(k>=0)liteTrucks.splice(k,1);env.remove(t.g);if(selected===t)select(null);return;}
    Object.assign(t,{xfer:false,lite:L,ox:L.ox,dir:'in',done:0,state:'queued',atGate:false,steps:[],from:A.code+' '+A.name+' '+_wt('world.xfer.tag'),dest:L.s.code+' '+L.s.name,
      times:{gate:clockMin(),arrived:null,done:null,confirmed:t.times.start,picked:t.times.start,loaded:t.times.start}});
    L.trucks.push(t); L.inbound++;
  }
  dirty=true;
}
function updateXfers(dt){for(const t of xfers.slice()){runSteps(t,dt);placeL(t);if(!t.steps.length)arriveXfer(t);}}
function requestTransfer(sku){
  const order=SITES.map((s,i)=>i).filter(i=>i!==game.siteIdx&&lites.has(i)).sort((a,b)=>Math.abs(SITES[a].k-site.k)-Math.abs(SITES[b].k-site.k));
  for(const i of order){const Ls=lites.get(i); if(Ls.trucks.some(t=>t.state==='docking'||(t.state==='departing'&&t.z>-16)))continue; const t=spawnXfer(i,game.siteIdx,{sku,n:5,requested:true}); if(t){log(_wt('world.xfer.logRequested',{id:t.id,sku:SKUS[sku].name,from:SITES[i].name,eta:fmtT(xferEta(t))}),'info');return true;}}
  toast('info',_wt('world.xfer.noTruckTitle'),_wt('world.xfer.noTruckBody'),ICON.truck); return false;
}
function liteXferTick(L,dt){
  L.xferT=(L.xferT==null?rand(40,120):L.xferT)-dt;
  if(L.xferT>0)return; L.xferT=rand(90,160);
  const others=SITES.map((s,i)=>i).filter(i=>i!==L.idx); const to=others[Math.floor(L.R()*others.length)];
  if(xfers.filter(t=>t.to===to).length<2&&!L.trucks.some(t=>t.state==='docking'||(t.state==='departing'&&t.z>-16))) spawnXfer(L.idx,to,{});
}

/* ---------------- customers: every shop and house in the city ---------------- */
const STREETS=['Maple St','Birch Ln','Cedar Ave','Elm Rd','Oak Ct','Willow Way','Aspen Dr','Pine St','Harbor Rd','Linden Pl','Chestnut St','Rowan Ave'];
const MSTREETS=['Market St','Main St','High St','Commerce Ave','Station Rd'];
function destStats(key){if(!del.dest)del.dest=new Map();let d=del.dest.get(key);if(!d){d={recv:0,onTime:0,late:0,last:null,cr:0};del.dest.set(key,d);}return d;}
const cityBadges=new Map();
function renderCityBadges(){
  const live=new Set();
  customers().forEach(t=>{
    const open=openOrdersFor(t.key).length>0||reqs.some(r=>r.o.shop&&r.o.shop.key===t.key);
    if(!open)return; live.add(t.key);
    let b=cityBadges.get(t.key);
    if(!b){b=sprite(orderTex,1.1);b.position.set(t.x,t.home?3.2:4.4,t.z);env.add(b);cityBadges.set(t.key,b);}
    b.visible=true;
  });
  cityBadges.forEach((b,k)=>{if(!live.has(k))b.visible=false;});
}
function openOrdersFor(key){
  const out=[], m=o=>o&&o.shop&&o.shop.key===key;
  sim.orders.filter(m).forEach(o=>out.push({id:o.id,s:t('world.track.pickQueue')}));
  forklifts.forEach(f=>{if(f.task&&f.task.order&&m(f.task.order))out.push({id:f.task.order.id,s:t('world.track.beingPicked',{id:f.id})});});
  staging.forEach(x=>{if(m(x.order))out.push({id:x.order.id,s:t('world.track.stagedDock')});});
  del.jobs.forEach(j=>{if(j.shop.key===key)out.push({id:j.id,s:t('world.track.waitingVan')});});
  vans.forEach(v=>v.jobs.forEach(j=>{if(j.shop.key===key)out.push({id:j.id,s:t('world.track.outForDelivery',{id:v.id})});}));
  return out;
}
function orderTrack(id){
  if(!id)return null;
  let o=sim.orders.find(x=>x.id===id); if(o)return {o,stage:0,where:t('world.track.pickQueue'),cls:''};
  for(const f of forklifts)if(f.task&&f.task.order&&f.task.order.id===id)return {o:f.task.order,stage:f.task.picked?1:0,where:t(f.task.picked?'world.track.onForks':'world.track.pickedBy',{id:f.id}),cls:'info'};
  for(const st of staging)if(st.order&&st.order.id===id)return {o:st.order,stage:2,where:t('world.track.stagedLoading'),cls:'info'};
  let j=del.jobs.find(x=>x.id===id); if(j)return {o:j.order,j,stage:3,where:t('world.track.waitingFreeVan'),cls:clockMin()>j.due?'bad':'warn'};
  for(const v of vans){j=v.jobs.find(x=>x.id===id); if(j)return {o:j.order,j,v,stage:4,where:v.state,cls:clockMin()>j.due?'bad':'info'};}
  const r=del.recent.find(x=>x.id===id); if(r&&r.job)return {o:r.job.order,j:r.job,stage:6,where:t('world.track.delivered',{res:resTxt(r.res)}),cls:r.res==='late'?'bad':'ok'};
  return null;
}
function defaultOutbound(){
  for(const v of vans)if(v.jobs[0])return orderTrack(v.jobs[0].id);
  if(del.jobs[0])return orderTrack(del.jobs[0].id);
  const st=staging.find(x=>x.order); if(st)return orderTrack(st.order.id);
  const f=forklifts.find(f=>f.task&&f.task.order); if(f)return orderTrack(f.task.order.id);
  if(sim.orders[0])return orderTrack(sim.orders[0].id);
  return del.recent[0]?orderTrack(del.recent[0].id):null;
}
const destIcon=home=>home?ICON.home:ICON.shop;

/* ---------------- missions, delivery streaks, welcome-back earnings ---------------- */
const MISSIONS={
  put:{label:n=>t('world.mission.put',{n}),t:[12,22],r:30},
  ship:{label:n=>t('world.mission.ship',{n}),t:[6,11],r:35},
  deliver:{label:n=>t('world.mission.deliver',{n}),t:[5,9],r:35},
  home:{label:n=>t('world.mission.home',{n}),t:[3,5],r:40},
  early:{label:n=>t('world.mission.early',{n}),t:[3,6],r:40},
  delcr:{label:n=>t('world.mission.delcr',{n}),t:[35,70],r:40},
  fast:{label:n=>t('world.mission.fast',{n}),t:[2,4],r:45},
  streak:{label:n=>t('world.mission.streak',{n}),t:[4,8],r:45,max:true},
  combo:{label:n=>t('world.mission.combo',{n}),t:[4,7],r:45,max:true},
  xfer:{label:n=>n>1?t('world.mission.xferN',{n}):t('world.mission.xfer1'),t:[1,2],r:40},
  stars:{label:()=>t('world.mission.stars'),t:[1,1],r:60},
};
function msSave(){if(!save.ms)save.ms={active:[],done:0};const M=save.ms;while(M.active.length<3)M.active.push(newMission(M.active.map(m=>m.type)));return M;}
function newMission(avoid){
  const keys=Object.keys(MISSIONS).filter(k=>!avoid.includes(k)), k=keys[Math.floor(Math.random()*keys.length)], T=MISSIONS[k];
  const lv=levelOf(save.xp), sc=Math.min(1.8,1+0.12*(lv-1));
  const target=T.t[0]===T.t[1]?T.t[0]:Math.round(irand(T.t[0],T.t[1])*(T.max?1:sc));
  return {type:k,target,prog:0,reward:Math.round(T.r*(1+0.1*(lv-1))/5)*5,xp:Math.round(60+25*lv)};
}
function mission(type,n,isMax){
  const M=msSave(); let hit=false;
  M.active.forEach(m=>{if(m.type!==type||m.prog>=m.target)return; m.prog=isMax?Math.max(m.prog,n):m.prog+n; if(m.prog>=m.target){m.prog=m.target;hit=true;toast('ach',t('world.mission.completeTitle'),t('world.mission.completeBody',{r:m.reward}),ICON.star);Snd.play('ach');}});
  if(hit)writeSave(); msDirty=true;
}
let msDirty=true;
function claimMission(i){
  const M=msSave(), m=M.active[i]; if(!m||m.prog<m.target)return;
  save.credits+=m.reward; addXp(m.xp); M.done++;
  Snd.play('coin',1.2); confetti(50);
  let extra='';
  if(M.done%5===0){save.credits+=75;extra=' · '+t('world.mission.chestExtra');setTimeout(()=>{toast('ach',t('world.mission.chestTitle'),t('world.mission.chestBody'),ICON.trophy);confetti(90);},700);}
  if(M.done>=10)unlock('go10');
  toast('ach',t('world.mission.claimTitle',{r:m.reward}),'+'+m.xp+' XP'+extra,ICON.star);
  M.active.splice(i,1,newMission(M.active.map(x=>x.type)));
  writeSave(); msDirty=true; dirty=true;
}
function snpMissions(){
  const hidden=!!(game.building||game.town);
  const compact=actsList.length>0;
  if(hidden!==snpMissions.h){snpMissions.h=hidden;msDirty=true;}
  if(compact!==snpMissions.c){snpMissions.c=compact;msDirty=true;}
  if(!msDirty)return; msDirty=false;
  const M=msSave(), ready=M.active.filter(m=>m.prog>=m.target).length, next=5-M.done%5;
  const out={hidden,compact,ready,next,list:[],compactNote:''};
  if(!hidden)out.list=M.active.map((m,i)=>{if(compact&&m.prog<m.target)return null;const T=MISSIONS[m.type],pct=Math.min(100,m.prog/m.target*100),done=m.prog>=m.target;
    return {i,label:T.label(m.target),done,pct,reward:m.reward,xp:m.xp,progText:fmtN(Math.min(m.prog,m.target))+'/'+fmtN(m.target)};}).filter(Boolean);
  if(!hidden)out.compactNote=compact&&!ready?M.active.map(m=>Math.round(m.prog/m.target*100)+'%').join(' · ')+' · '+t('world.mission.compactNote'):'';
  put('missions',out);
}
function streakMult(){return 1+Math.min(0.25,0.025*(delSave().streak||0));}
function welcomeBack(){
  const last=LAST_SEEN; if(!last)return;
  const hrs=(Date.now()-last)/3600000; if(hrs<1/6)return;
  const h=Math.min(8,hrs), rate=14+5*dlv('drv')+5*dlv('gps')+4*dlv('big')+3*dlv('ev')+Math.max(0,town.econ.net)*3+(save.town.unit7?LEASE.inc:0);
  const cr=Math.round(h*rate); if(cr<1)return;
  save.credits+=cr; writeSave();
  game.welcome={h:hrs,capped:hrs>8,cr,trucks:Math.round(h*24),dels:Math.round(h*(7+2*dlv('drv')))};
}
const fmtAway=h=>h>=1?t('world.away.hm',{h:Math.floor(h),m:pad(Math.round((h%1)*60))}):t('world.away.min',{m:Math.round(h*60)});

/* ---------------- order requests and hands-on control ---------------- */
const reqs=[]; let actsT=0;
const REQ_TTL=16;
function offerOrder(o){
  if(reqs.length>=6){missReq(reqs.shift());}
  reqs.push({o,t:0,ttl:REQ_TTL}); Snd.play('click'); dirty=true;
}
function acceptReq(r,rush){
  const i=reqs.indexOf(r); if(i<0)return; reqs.splice(i,1);
  const o=r.o, st=stockBySku(), coming=trucks.some(t=>t.state!=='departing'&&t.cargo.slice(t.assigned).includes(o.sku))||xfers.some(t=>t.to===game.siteIdx&&t.sku===o.sku);
  if(rush){o.rush=true;o.due=clockMin()+25;}
  if(st[o.sku].free===0&&!coming){
    if(requestTransfer(o.sku)){spend(15);o.due=Math.max(o.due,xferEta(xfers[xfers.length-1])+20);log(t('world.req.logAcceptedXfer',{id:o.id}),'info');}
    else{if(game.phase==='shift'){game.st.backorders++;game.ledger.back-=15;addScore(-15,'back',-12,3.5,AISLE(ROWS[0]),true);}log(t('world.req.logBackordered',{id:o.id,sku:SKUS[o.sku].name}),'bad');return;}
  }
  if(rush)sim.orders.unshift(o); else sim.orders.push(o);
  log(t(rush?'world.req.logAcceptedRush':'world.req.logAccepted',{id:o.id})+' · '+SKUS[o.sku].name+(o.shop?' '+t('world.req.forShop',{shop:o.shop.name}):''),'info');
  Snd.play('put'); dirty=true;
}
function declineReq(r){const i=reqs.indexOf(r); if(i<0)return; reqs.splice(i,1); const D=delSave(); D.rating=Math.max(0,Math.round((D.rating-0.05)*100)/100); log(t('world.req.logDeclined',{id:r.o.id}),'');dirty=true;}
function missReq(r){
  const i=reqs.indexOf(r); if(i>=0)reqs.splice(i,1);
  const D=delSave(); D.rating=Math.max(0,Math.round((D.rating-0.15)*100)/100);
  if(game.phase==='shift'){game.st.missed=(game.st.missed||0)+1;game.ledger.late-=5;addScore(-5,'late',-12,3.5,AISLE(ROWS[0]),true);}
  log(t('world.req.logExpired',{id:r.o.id}),'bad'); Snd.play('lost'); dirty=true;
}
function tickReqs(rdt){
  if(!rdt)return;
  for(const r of reqs.slice()){r.t+=rdt; if(r.t>=r.ttl)missReq(r);}
}
function setHands(on){
  if(tut)return;
  game.hands=!!on; save.settings.hands=game.hands; writeSave();
  if(!on){sim.orders.forEach(o=>o.released=true);del.jobs.forEach(j=>j.go=true);}
  toast('info',on?t('world.hands.onTitle'):t('world.hands.offTitle'),on?t('world.hands.onBody'):t('world.hands.offBody'),on?ICON.target:ICON.bolt);
  dirty=true;
}
function frontQueued(){return trucks.filter(t=>t.state==='queued'&&t.atGate).sort((a,b)=>a.z-b.z)[0]||null;}
function manualDock(t){
  if(!t||t.state!=='queued')return;
  const bay=bays.find(b=>!b.truck); if(!bay){toast('info',_wt('world.hands.noDockTitle'),_wt('world.hands.noDockBody'),ICON.dock);return;}
  if(trucks.some(x=>x.state==='departing'&&x.z>-16)||t!==frontQueued()){toast('info',_wt('world.hands.laneBusyTitle'),_wt('world.hands.laneBusyBody'),ICON.truck);return;}
  assignBay(t,bay); Snd.play('click'); dirty=true;
}
function buildActs(){
  const A=[], now=clockMin();
  reqs.forEach(r=>{const o=r.o,st=stockBySku()[o.sku],left=Math.max(0,r.ttl-r.t);
    A.push({tone:left<5?'bad':'info',icon:destIcon(o.shop&&o.shop.home),title:_wt('world.act.newOrder',{who:o.shop?o.shop.name:_wt('world.act.walkIn')}),sub:_wt('world.act.onePallet',{sku:SKUS[o.sku].name})+' · '+(st.free?_wt('world.act.inStock',{n:st.free}):_wt('world.act.outOfStock'))+' · '+_wt('world.act.decideIn',{s:Math.ceil(left)}),
      pct:left/r.ttl*100,btns:[{l:_wt('world.act.accept'),a:'acc',p:1},{l:_wt('world.act.rush'),a:'rush'},{l:_wt('world.act.decline'),a:'dec'}],ref:r,kind:'req'});});
  if(game.hands){
    const t=frontQueued(); if(t){const w=Math.round(now-t.times.gate),fb=bays.find(b=>!b.truck);
      A.push({tone:w>15?'bad':w>8?'warn':'',icon:ICON.truck,title:_wt('world.act.atGate',{id:t.id}),sub:_wt('world.act.palletsWaiting',{n:t.cargo.length,w})+(w>15?' · '+_wt('world.act.detention'):'')+(fb?'':' · '+_wt('world.act.noFreeDock')),pct:Math.max(0,100-w/15*100),btns:[{l:fb?_wt('world.act.dockAt',{n:fb.i+1}):_wt('world.act.docksFull'),a:'dock',p:1,dis:!fb}],ref:t,kind:'dock'});}
    sim.orders.filter(o=>!o.released).slice(0,3).forEach(o=>{const m=Math.round(o.due-now);
      A.push({tone:m<10?'bad':m<20?'warn':'',icon:ICON.box,title:_wt('world.act.readyToPick',{id:o.id}),sub:SKUS[o.sku].name+(o.shop?' '+_wt('world.req.forShop',{shop:o.shop.name}):'')+' · '+_wt('world.act.dueIn',{m}),pct:Math.max(0,Math.min(100,m/50*100)),btns:[{l:_wt('world.act.release'),a:'rel',p:1}],ref:o,kind:'rel'});});
    del.jobs.filter(j=>!j.go).slice(0,3).forEach(j=>{const m=Math.round(j.due-now),free=vans.length<fleetSize();
      A.push({tone:m<10?'bad':m<20?'warn':'',icon:destIcon(j.shop.home),title:_wt('world.act.waitingVan',{id:j.id}),sub:j.shop.name+' · '+_wt('world.act.blocksPromised',{n:j.dist,m}),pct:Math.max(0,Math.min(100,m/60*100)),btns:[{l:free?_wt('world.act.sendVan'):_wt('world.act.allVansOut'),a:'van',p:1,dis:!free}],ref:j,kind:'van'});});
  }
  return A;
}
let actsList=[];
let actsSeen=new Set();
function snpActs(){
  const hidden=!!(game.building||game.town);
  actsList=buildActs();
  if(hidden){put('acts',{hidden:true,list:[],count:0});return;}
  const show=actsList.slice(0,innerWidth<=760?1:3);
  const seenNow=new Set();
  const list=show.map((a,i)=>{
    const key=a.kind+':'+(a.ref&&a.ref.id!=null?a.ref.id:i); seenNow.add(key);
    return {i,key,tone:a.tone,icon:a.icon,title:a.title,sub:a.sub,pct:a.pct||0,new:!actsSeen.has(key),
      btns:a.btns.map(b=>({l:b.l,a:b.a,primary:!!b.p,dis:!!b.dis}))};
  });
  actsSeen=seenNow;
  put('acts',{hidden:false,list,count:actsList.length,badBadge:actsList.some(a=>a.tone==='bad'),hands:game.hands,
    more:actsList.length-show.length,
    empty:!show.length?(game.hands?t('world.act.emptyHands'):game.phase==='shift'?t('world.act.emptyShift'):t('world.act.emptyIdle')):''});
}
function doAct(i,a){
  const it=actsList[i]; if(!it)return; const r=it.ref;
  if(a==='acc')acceptReq(r,false); else if(a==='rush')acceptReq(r,true); else if(a==='dec')declineReq(r);
  else if(a==='dock')manualDock(r);
  else if(a==='rel'){r.released=true;log(t('world.act.logReleased',{id:r.id}),'');Snd.play('click');}
  else if(a==='van'){r.go=true;Snd.play('click');}
  dirty=true; snpActs();
}

const ratingStars=r=>{let s='';for(let k=1;k<=5;k++)s+='<span class="'+(r>=k-0.25?'on':'')+'">★</span>';return '<span class="rstars">'+s+'</span>';};
// Vans tab: same markup as the original renderDelPanel (PanelBody.vue renders panel html)
function renderDelPanel(){
  const D=delSave(), now=clockMin(), out=vans.length, F=fleetSize();
  let h='<div class="delhead"><div class="mini"><label>'+t('world.dp.netToday')+'</label><b>'+(del.today>=0?'+':'')+del.today+' <span>cr</span></b></div><div class="mini"><label>'+t('world.dp.rating')+'</label><b>'+D.rating.toFixed(1)+' '+ratingStars(D.rating)+'</b></div><div class="mini"><label>'+t('world.dp.vansOut')+'</label><b>'+out+' <span>/ '+F+'</span></b></div></div>'+(D.streak?'<div class="delnote"><b>'+t('world.dp.streak',{n:D.streak})+'</b> · '+t('world.dp.streakTips',{m:streakMult().toFixed(2)})+'</div>':'<div class="delnote">'+t('world.dp.streakHint')+'</div>');
  h+=(dlv('drv')<1?'<div class="delnote"><b>'+t('world.dp.lockedTitle')+'</b> '+t('world.dp.lockedBody')+'</div>':'')+'<p class="delnote">'+t('world.dp.howItWorks',{c:tripCost()})+'</p>';
  h+='<div class="sub"><span>'+t('world.dp.waiting',{n:del.jobs.length})+'</span></div>';
  if(!del.jobs.length)h+='<div class="empty">'+t('world.dp.noneWaiting')+'</div>';
  del.jobs.forEach((j,i)=>{const m=Math.round(j.due-now),c=m<0?'bad':m<10?'warn':'ok';
    h+='<div class="row click'+(m<0?' late':'')+'" data-trko="'+j.id+'"><div class="badge">'+(i+1)+'</div><div class="t"><b class="mono">'+j.id+'</b><small>'+esc(j.shop.name)+' · '+t('world.dp.blocksAbout',{n:j.dist,c:Math.round(delFee(j))})+'</small></div><div class="r"><span class="pill '+c+'">'+(m>=0?t('world.act.dueIn',{m}):t('world.dp.lateBy',{m:-m}))+'</span></div></div>';});
  h+='<div class="sub"><span>'+t('world.dp.onRoad',{n:out})+'</span></div>';
  if(!out)h+='<div class="empty">'+t('world.dp.allAtDepot')+'</div>';
  vans.forEach(v=>{const j=v.jobs[0],m=j?Math.round(j.due-now):null;
    h+='<div class="row click'+(selected===v?' hl':'')+'" data-van="'+v.id+'"><div class="badge tk">V</div><div class="t"><b class="mono">'+v.id+'</b><small>'+esc(v.state)+(v.jobs.length>1?' · '+t('world.dp.drops',{n:v.jobs.length}):'')+'</small></div><div class="r">'+(j?'<span class="pill '+(m<0?'bad':m<10?'warn':'info')+'">'+(m>=0?t('world.dp.minLeft',{m}):t('world.res.late'))+'</span>':'<span class="pill">'+t('world.dp.backSoon')+'</span>')+'</div></div>';});
  if(del.recent.length){h+='<div class="sub"><span>'+t('world.dp.recent')+'</span></div>';
    del.recent.slice(0,6).forEach(r=>{h+='<div class="row click" data-trko="'+r.id+'"><div class="badge '+(r.res==='late'?'down':'')+'">'+(r.res==='early'?'★':r.res==='late'?'!':'✓')+'</div><div class="t"><b class="mono">'+r.id+'</b><small>'+esc(r.shop)+' · '+resTxt(r.res)+' · '+fmtT(r.t)+'</small></div><div class="r"><span class="pill gold">+'+r.cr+' cr</span></div></div>';});}
  ['Staff','Tools'].forEach(g=>{
    h+='<div class="sub"><span>'+t('world.up.group.'+g.toLowerCase())+'</span><span class="pill gold">'+fmtN(save.credits)+' cr</span></div>';
    DEL_UP.filter(u=>u.group===g).forEach(u=>{const l=dlv(u.key),max=u.costs.length,c=u.costs[l];
      h+='<div class="row"><div class="badge fl">'+(g==='Staff'?ICON.up:ICON.wrench)+'</div><div class="t"><b>'+esc(u.name)+(max>1?' <span class="pips">'+u.costs.map((_,k)=>'<i class="'+(k<l?'on':'')+'"></i>').join('')+'</span>':'')+'</b><small>'+esc(u.desc(l))+'</small></div><div class="r">'+
        (l>=max?'<span class="pill ok">'+(max>1?t('world.dp.maxed'):t('world.dp.owned'))+'</span>':'<button class="act'+(save.credits>=c?' solid':'')+'" data-dbuy="'+u.key+'"'+(save.credits>=c?'':' disabled')+'>'+c+' cr</button>')+'</div></div>';});
  });
  h+='<div class="delnote">'+t('world.dp.lifetime',{d:fmtN(D.done),p:(D.done?Math.round(D.onTime/D.done*100):0),e:fmtN(D.earned)})+'</div>';
  return h;
}
/* ---------------- docks ---------------- */
const bays=[]; const opsT=(k,p)=>t(k,p); // alias: functions below shadow t with a local truck

function buildBays(){
  BAY_Z.forEach((z,i)=>{
    const g=new THREE.Group(); g.position.set(0,0,z); world.add(g);
    box(0.32,4.4,0.32,site.accent,0,2.2,-1.75,g); box(0.32,4.4,0.32,site.accent,0,2.2,1.75,g);
    box(0.5,0.55,3.82,site.accent,0,4.15,0,g);
    box(0.25,0.35,0.25,'#2c3344',0.25,0.95,-1.25,g); box(0.25,0.35,0.25,'#2c3344',0.25,0.95,1.25,g);
    const lightMat=new THREE.MeshStandardMaterial({color:'#24b46e',emissive:'#24b46e',emissiveIntensity:.8});
    const light=new THREE.Mesh(bgeo(.12,.22,.22),lightMat); light.position.set(0.2,3.1,-2.05); g.add(light);
    const door=box(0.14,3.6,3.18,'#e9eef6',0,1.9,0,g);
    for(let k=0;k<6;k++) box(0.16,0.03,3.2,'#cdd6e3',0,-1.5+k*0.6,0,door,false);
    const bo={i,z,truck:null,g,lightMat,door,open:0,count:0}; g.userData.sel={kind:'bay',bay:bo}; bays.push(bo);
  });
}

/* ---------------- models ---------------- */
let palSeq=1000;
function makePallet(sku){
  const s=SKUS[sku], g=new THREE.Group();
  box(1.1,0.14,1.1,'#c99a60',0,0.07,0,g);
  box(1.0,s.h,1.0,s.color,0,0.14+s.h/2,0,g);
  box(0.22,0.012,1.01,'#f1dfb8',0,0.146+s.h,0,g,false);
  box(0.012,0.22,0.32,'#ffffff',0.506,0.14+s.h*0.6,0,g,false);
  g.userData.sku=sku; g.userData.meta={id:'PAL-'+(++palSeq),lot:'L25'+pad(palSeq%97)+'-'+(100+palSeq%900),recv:clockMin()-Math.floor(Math.random()*240)}; g.userData.sel={kind:'pal',g}; return g;
}
const labelTexCache={};
function labelTex(car){
  return labelTexCache[car.name]||(labelTexCache[car.name]=canvasTex(1024,300,(g,W,H)=>{
    g.fillStyle='#f8fafd'; g.fillRect(0,0,W,H);
    g.fillStyle=car.stripe;
    g.beginPath(); g.moveTo(W*0.62,H); g.quadraticCurveTo(W*0.82,H*0.35,W,H*0.18); g.lineTo(W,H); g.closePath(); g.fill();
    g.globalAlpha=.35; g.beginPath(); g.moveTo(W*0.5,H); g.quadraticCurveTo(W*0.74,H*0.5,W,H*0.42); g.lineTo(W,H); g.fill(); g.globalAlpha=1;
    g.font='italic 800 132px "Bricolage Grotesque", Figtree, sans-serif'; g.fillText(car.name,60,165);
    g.fillStyle='#7a889e'; g.font='600 44px Figtree, sans-serif'; g.fillText(car.tag,66,226);
  }));
}
function makeTruck(car,expedite){
  const g=new THREE.Group();
  box(8,2.7,2.5,'#f7f9fc',-1.2,2.4,0,g);
  box(8.02,0.34,2.52,car.stripe,-1.2,1.2,0,g);
  const lm=new THREE.MeshStandardMaterial({map:labelTex(car),roughness:.8});
  const pg=new THREE.PlaneGeometry(7.6,2.2);
  const p1=new THREE.Mesh(pg,lm); p1.position.set(-1.2,2.55,1.256); g.add(p1);
  const p2=new THREE.Mesh(pg,lm); p2.position.set(-1.2,2.55,-1.256); p2.rotation.y=Math.PI; g.add(p2);
  box(0.06,2.5,2.3,'#e3e8f0',-5.21,2.4,0,g);
  box(10.2,0.35,1.5,'#3b4658',-0.1,0.78,0,g);
  box(2.2,2.25,2.42,car.cab||'#ffffff',4.15,1.95,0,g);
  box(1.6,0.55,2.34,car.stripe,3.85,3.33,0,g);
  box(2.22,0.3,2.44,car.stripe,4.15,1.25,0,g);
  box(0.08,0.85,2.14,'#2a3950',5.24,2.45,0,g);
  box(0.9,0.7,0.06,'#2a3950',4.4,2.45,1.22,g); box(0.9,0.7,0.06,'#2a3950',4.4,2.45,-1.22,g);
  box(0.06,0.55,1.4,'#cfd7e2',5.27,1.5,0,g);
  box(0.3,0.3,2.46,'#3b4658',5.28,0.85,0,g);
  box(0.05,0.18,0.4,'#ffe7a3',5.31,1.1,0.85,g); box(0.05,0.18,0.4,'#ffe7a3',5.31,1.1,-0.85,g);
  if(expedite){box(0.3,0.14,1.2,'#ff5a3c',4.0,3.68,0,g);}
  [4.4,2.3,-3.3,-4.5].forEach(x=>[-1.06,1.06].forEach(z=>{
    const w=cyl(.5,.5,.38,'#262d3a',x,0.5,z,g,18); w.rotation.x=Math.PI/2;
    const h=cyl(.22,.22,.4,'#c8d0dc',x,0.5,z,g,12); h.rotation.x=Math.PI/2;
  }));
  return g;
}
function makeForklift(temp){
  const g=new THREE.Group();
  const paint=cosItem('fl');
  const bodyM=box(1.45,0.6,1.1,temp?'#4fc1b3':paint.body,-0.1,0.55,0,g);
  const cwM=box(0.5,0.8,1.12,temp?'#2f9b8e':paint.cw,-0.78,0.7,0,g);
  box(0.55,0.25,0.6,'#2f3a4c',-0.18,0.95,0,g);
  box(0.12,0.45,0.6,'#2f3a4c',-0.46,1.25,0,g);
  [-0.6,0.42].forEach(x=>[-0.5,0.5].forEach(z=>box(0.07,1.35,0.07,'#2f3a4c',x,1.55,z,g)));
  box(1.15,0.06,1.08,'#2f3a4c',-0.09,2.22,0,g);
  cyl(.19,.23,.5,temp?'#3a63e0':'#ff7a2f',-0.2,1.33,0,g);
  ball(.15,'#f0c39b',-0.2,1.74,0,g);
  const hat=new THREE.Mesh(new THREE.SphereGeometry(.165,14,8,0,TAU,0,Math.PI/2),mat('#ffd23f')); hat.position.set(-0.2,1.78,0); g.add(hat);
  [[0.45,.3],[-0.62,.26]].forEach(([x,r])=>[-0.52,0.52].forEach(z=>{const w=cyl(r,r,.22,'#262d3a',x,r,z,g,14); w.rotation.x=Math.PI/2;}));
  box(0.1,2.3,0.1,'#6b778a',0.74,1.25,-0.32,g); box(0.1,2.3,0.1,'#6b778a',0.74,1.25,0.32,g);
  box(0.08,0.08,0.74,'#6b778a',0.74,2.38,0,g);
  const beaconMat=new THREE.MeshStandardMaterial({color:'#ffb020',emissive:'#ff9a00',emissiveIntensity:.2});
  const beacon=new THREE.Mesh(bgeo(.16,.12,.16),beaconMat); beacon.position.set(-0.4,2.31,0); g.add(beacon);
  const car=new THREE.Group(); car.position.set(0.8,0.1,0); g.add(car);
  box(0.07,0.6,0.82,'#3d4757',0,0.3,0,car);
  box(1.1,0.05,0.14,'#3d4757',0.55,0.02,-0.26,car); box(1.1,0.05,0.14,'#3d4757',0.55,0.02,0.26,car);
  const warn=sprite(warnTex); warn.position.set(-0.1,3.0,0); warn.visible=false; g.add(warn);
  g.userData.carriage=car; g.userData.beacon=beaconMat; g.userData.warn=warn; g.userData.body=bodyM; g.userData.cw=cwM;
  return g;
}

/* ---------------- slots & staging ---------------- */
const slots=[], staging=[];
function buildSlots(){
  ROWS.forEach((z,r)=>{for(let i=0;i<8;i++)for(let lv=0;lv<ROW_LV[r];lv++)slots.push({r,i,lv,x:SLOT_X(i),z,y:LEVEL_Y[lv],pallet:null,claimed:false,id:'ABCD'[r]+'-'+pad(i+1)+'-'+(lv+1)});});
  for(let i=0;i<8;i++){const st={x:SLOT_X(i),pallet:null,claimed:false,t:0,order:null}; st.pin=makePin(1.25); st.pin.position.set(st.x,0,STAGE_Z); st.pin.visible=false; world.add(st.pin); staging.push(st);}
}
const blocked=r=>(sim.blocked[r]||0)>sim.sec;
function stockBySku(){const o={};SKU_KEYS.forEach(k=>o[k]={pallets:0,units:0,free:0});slots.forEach(s=>{if(s.pallet){const k=s.pallet.userData.sku;o[k].pallets++;o[k].units+=SKUS[k].units;if(!s.claimed)o[k].free++;}});return o;}
function totalUnits(){let n=0;slots.forEach(s=>{if(s.pallet)n+=SKUS[s.pallet.userData.sku].units;});return n;}
function occupied(){return slots.filter(s=>s.pallet).length;}
function seedRacks(){
  const n=site.seed, w={LED:.26,BOX:.24,GLV:.24,BRK:.18};
  const free=slots.filter(s=>s.lv<2).sort(()=>RNG()-.5);
  SKU_KEYS.forEach(k=>{const c=k==='CHR'?2:Math.round(n*w[k]);for(let j=0;j<c&&free.length;j++)placeInSlot(free.pop(),makePallet(k));});
}
function placeInSlot(s,p){s.pallet=p;p.position.set(s.x,s.y,s.z);p.rotation.set(0,0,0);p.scale.setScalar(1);world.add(p);}

/* ---------------- movers ---------------- */
function runSteps(o,dt){
  let budget=dt;
  while(o.steps.length&&budget>0){
    const s=o.steps[0];
    if(s.t==='move'){
      const dx=s.x-o.x,dz=s.z-o.z,d=Math.hypot(dx,dz);
      if(d<0.01){o.x=s.x;o.z=s.z;o.steps.shift();continue;}
      const ty=s.rev?Math.atan2(dz,-dx):Math.atan2(-dz,dx);
      const diff=angDiff(ty,o.yaw);
      o.yaw+=clamp(diff,-o.turn*budget,o.turn*budget);
      if((o.kind==='tk'||o.kind==='van')&&!s.rev&&!(o.kind==='tk'&&!o.xfer&&lx(o)<15.5)&&(o.kind==='van'&&o.z>-18.6&&Math.abs(lx(o)-12)<2.7?vanAhead(o,budget):vehBlocked(o,budget))){budget=0;break;}
      if(Math.abs(diff)<o.gate){
        const f=Math.cos(Math.min(Math.abs(diff),1.4));
        const sp=(s.rev?o.rspd:o.spd)*(s.slow||1)*f;
        const st=Math.min(d,sp*budget); o.x+=dx/d*st; o.z+=dz/d*st;
      }
      budget=0;
    }else if(s.t==='turn'){
      const diff=angDiff(s.yaw,o.yaw);
      if(Math.abs(diff)<0.01){o.yaw=s.yaw;o.steps.shift();continue;}
      o.yaw+=clamp(diff,-o.turn*budget,o.turn*budget); budget=0;
    }else if(s.t==='lift'){
      const d=s.y-o.forkY;
      if(Math.abs(d)<0.005){o.forkY=s.y;o.steps.shift();continue;}
      o.forkY+=clamp(d,-1.6*budget,1.6*budget); budget=0;
    }else if(s.t==='wait'){
      s.s-=budget; if(s.s<=0){budget=-s.s;o.steps.shift();continue;} budget=0;
    }else if(s.t==='do'){o.steps.shift();s.fn();}
  }
}
function planner(o){
  const c={x:o.x,z:o.z},S=[];
  const P={
    go(tx,tz){
      if(Math.abs(c.z-tz)<.05){if(Math.abs(c.x-tx)>.05)S.push({t:'move',x:tx,z:tz});}
      else{ if(Math.abs(c.x-MAINX)>.05)S.push({t:'move',x:MAINX,z:c.z}); S.push({t:'move',x:MAINX,z:tz}); if(Math.abs(tx-MAINX)>.05)S.push({t:'move',x:tx,z:tz}); }
      c.x=tx;c.z=tz;return P;},
    mv(tx,tz,rev,slow){S.push({t:'move',x:tx,z:tz,rev,slow});c.x=tx;c.z=tz;return P;},
    turn(y){S.push({t:'turn',yaw:y});return P;},
    lift(y){S.push({t:'lift',y});return P;},
    wait(s){S.push({t:'wait',s});return P;},
    act(fn){S.push({t:'do',fn});return P;},
    steps:S};
  return P;
}
const FACE_NEG_Z=Math.PI/2, FACE_POS_Z=-Math.PI/2;
const lx=o=>o.loc?o.x:o.x-(o.ox||0);
function place(o){o.g.position.set(o.x,0,o.z);o.g.rotation.y=o.yaw;}

/* ---------------- forklifts ---------------- */
const forklifts=[];
function addForklift(temp){
  const used=new Set(forklifts.map(f=>f.home));
  const hi=HOMES.findIndex(h=>!used.has(h)); const home=HOMES[hi<0?0:hi];
  const g=makeForklift(temp); world.add(g);
  const sp=(1+0.15*save.up.spd)*(L.brk?1.08:1);
  const n=temp?forklifts.filter(f=>f.temp).length+1:forklifts.filter(f=>!f.temp).length+1;
  const f={kind:'fl',id:(temp?'TMP-':'FL-0')+n,temp:!!temp,g,x:home.x,z:home.z,yaw:home.z<0?FACE_POS_Z:FACE_NEG_Z,
    forkY:0.1,steps:[],task:null,last:'out',battery:temp?100:rand(62,94),moved:0,home,fast:L.fc.includes(hi),carry:null,
    spd:4.2*sp,rspd:2.8*sp,turn:4.0,gate:0.14,broken:0,until:0,loc:true};
  g.userData.sel=f; forklifts.push(f); place(f); return f;
}
function freeSlots(){return slots.filter(s=>!s.pallet&&!s.claimed&&!blocked(s.r));}
function nearestFirst(list,x,z){return list.sort((a,b)=>(Math.abs(a.x-x)+Math.abs(a.z-z)+a.lv*1.5)-(Math.abs(b.x-x)+Math.abs(b.z-z)+b.lv*1.5));}

function tryPutaway(f){
  const t=trucks.find(t=>t.state==='unloading'&&!t.busyBy&&t.assigned<t.cargo.length);
  if(!t)return false;
  const fs=freeSlots(); if(!fs.length)return false;
  const low=fs.filter(s=>s.lv===0); const pool=(low.length&&RNG()<.6?low:fs);
  const s=pick(nearestFirst(pool,MAINX,t.bay.z).slice(0,6));
  s.claimed=true; t.busyBy=f; const sku=t.cargo[t.assigned++];
  const bayZ=t.bay.z;
  const task={type:'Put-away',text:opsT('ops.task.putaway',{truck:t.id,slot:s.id}),sku,truck:t,slot:s,picked:false};
  const P=planner(f);
  P.lift(0.1).go(DOCK_PICK_X,bayZ).wait(0.3)
   .act(()=>{const p=makePallet(sku);f.g.userData.carriage.add(p);p.position.set(0.55,0.03,0);f.carry=p;t.unloaded++;t.busyBy=null;task.picked=true;dirty=true;})
   .lift(0.3).mv(MAINX,bayZ,true).go(s.x,AISLE(s.z)).turn(FACE_NEG_Z).lift(s.y+0.28).mv(s.x,s.z+FORK_REACH,false,.65).lift(s.y-0.02)
   .act(()=>{const p=f.carry;world.attach(p);placeInSlot(s,p);s.claimed=false;f.carry=null;sim.putaways++;mission('put',1);f.moved++;
      if(game.phase==='shift'){game.st.recv++;game.ledger.put+=5;} addScore(5,'put',s.x,s.y+1.4,s.z);dirty=true;})
   .mv(s.x,AISLE(s.z),true,.6).lift(0.1);
  f.steps=P.steps; f.task=task; f.last='in';
  return true;
}
function tryOutbound(f){
  if(!sim.orders.length)return false;
  if(blocked(ROWS.length-1))return false;
  const st=staging.find(x=>!x.pallet&&!x.claimed); if(!st)return false;
  let oi=-1,s=null;
  for(let k=0;k<sim.orders.length&&!s;k++){if(game.hands&&!sim.orders[k].released)continue;const sku=sim.orders[k].sku;const c=slots.filter(x=>x.pallet&&!x.claimed&&!blocked(x.r)&&x.pallet.userData.sku===sku);if(c.length){oi=k;s=pick(nearestFirst(c,f.x,f.z).slice(0,4));}}
  if(!s)return false;
  const order=sim.orders.splice(oi,1)[0];
  s.claimed=true; st.claimed=true;
  const task={type:'Pick',text:t('ops.task.pick',{order:order.id,code:SKUS[order.sku].code,slot:s.id}),sku:order.sku,order,slot:s,st,picked:false};
  const lastAisle=AISLE(ROWS[ROWS.length-1]);
  const P=planner(f);
  P.lift(0.1).go(s.x,AISLE(s.z)).turn(FACE_NEG_Z).lift(s.y-0.02).mv(s.x,s.z+FORK_REACH,false,.65).wait(.15)
   .act(()=>{const p=s.pallet;s.pallet=null;s.claimed=false;f.g.userData.carriage.attach(p);p.position.set(0.55,0.03,0);p.rotation.set(0,0,0);f.carry=p;task.picked=true;order.pickedAt=clockMin();dirty=true;checkLow(order.sku);})
   .lift(s.y+0.3).mv(s.x,AISLE(s.z),true,.6).lift(0.3).go(st.x,lastAisle).turn(FACE_POS_Z).mv(st.x,STAGE_Z-FORK_REACH,false,.6).lift(0.02)
   .act(()=>{const p=f.carry;world.attach(p);p.position.set(st.x,0.02,STAGE_Z);p.rotation.set(0,Math.PI/2,0);st.pallet=p;st.claimed=false;st.t=0;st.order=order;order.stagedAt=clockMin();f.carry=null;f.moved++;f.task=null;onStaged(order,st);dirty=true;})
   .mv(st.x,lastAisle,true,.6).lift(0.1);
  f.steps=P.steps; f.task=task; f.last='out';
  return true;
}
function abortTask(f){
  const t=f.task; if(!t||t.picked)return false;
  if(t.type==='Put-away'){t.truck.busyBy=null;t.truck.assigned--;t.slot.claimed=false;}
  else if(t.type==='Pick'){t.slot.claimed=false;t.st.claimed=false;sim.orders.unshift(t.order);}
  f.steps=[];f.task=null;return true;
}
function goHome(f,charge){
  const h=f.home,P=planner(f);
  P.lift(0.1).go(MAINX,h.z).mv(h.x,h.z).turn(h.z<0?FACE_POS_Z:FACE_NEG_Z);
  f.steps=P.steps; f.task={type:charge?'Charging':'Idle',text:charge?t('ops.task.headingCharger'):t('ops.task.returning')}; f.charging=charge;
}
function updateForklift(f,dt){
  const ud=f.g.userData;
  if(f.broken){
    if(sim.sec>=f.broken){f.broken=0;ud.warn.visible=false;ud.beacon.color.set('#ffb020');ud.beacon.emissive.set('#ff9a00');log(t('ops.log.repaired',{id:f.id}),'ok');}
    else{ud.beacon.color.set('#ff3b30');ud.beacon.emissive.set('#ff3b30');ud.beacon.emissiveIntensity=Math.sin(perf*6)>0?1.4:.3;ud.warn.position.y=3.0+Math.sin(perf*3)*.08;place(f);return;}
  }
  const drain=(save.up.chg?0.045:0.07)*(game.mods.has('brown')?1.8:1), rate=(save.up.chg?5:2.5)*(f.fast?2:1);
  if(f.steps.length){ runSteps(f,dt); f.battery=Math.max(0,f.battery-dt*drain); }
  else{
    const atHome=Math.abs(f.x-f.home.x)<.05&&Math.abs(f.z-f.home.z)<.05;
    if(f.temp&&sim.sec>f.until){ f.remove=true; log(t('ops.log.tempOut',{id:f.id}),''); }
    else if(f.charging&&f.battery<92){ const ch=chargers[HOMES.indexOf(f.home)]; if(ch){if(!f.chgOn){f.chgOn=true;ch.sessions++;} ch.kwh+=dt*rate*0.048;} f.battery=Math.min(100,f.battery+dt*rate); f.task={type:'Charging',text:f.fast?t('ops.task.chargingFast'):t('ops.task.charging')}; }
    else{
      f.charging=false; f.chgOn=false;
      if(f.battery<22){ goHome(f,true); log(t('ops.log.batteryLow',{id:f.id}),'warn'); }
      else{
        const occ=occupied()/slots.length;
        const urgent=sim.orders.some(o=>o.due-clockMin()<12);
        const preferOut=sim.orders.length&&(f.last==='in'||occ>.78||urgent);
        let ok=preferOut&&tryOutbound(f);
        if(!ok) ok=tryPutaway(f);
        if(!ok) ok=tryOutbound(f);
        if(!ok){ if(!atHome) goHome(f,false); else { f.task={type:'Idle',text:t('ops.task.waiting')}; f.battery=Math.min(100,f.battery+dt*rate*.5); } }
      }
    }
  }
  place(f); ud.carriage.position.y=f.forkY;
  ud.beacon.emissiveIntensity=f.steps.length?(Math.sin(perf*8)>0?1.2:.15):.15;
}
function hireTemp(minutes){
  const temps=forklifts.filter(f=>f.temp&&!f.remove).length;
  if(temps>=2||forklifts.length>=HOMES.length){log(t('ops.log.noTempRoom'),'warn');toast('info',t('ops.toast.noTemp.title'),t('ops.toast.noTemp.body'),ICON.fl);return false;}
  const f=addForklift(true); f.until=sim.sec+(minutes||60);
  log(t('ops.log.tempOn',{id:f.id,m:minutes||60}),'info'); return true;
}

/* ---------------- trucks ---------------- */
const trucks=[];
function newShipment(late,focus){
  const car=pick(CARRIERS), cargo=[];
  if(focus){for(let i=0;i<4;i++)cargo.push(focus);cargo.push(pick(SKU_KEYS));}
  else{
    const st=stockBySku(), n=irand(3,6)+(game.mods.has('heavy')?2:0);
    const weights=SKU_KEYS.map(k=>({k,w:st[k].pallets<3?4:st[k].pallets>10?0.5:1}));
    const tot=weights.reduce((a,b)=>a+b.w,0);
    for(let i=0;i<n;i++){let r=RNG()*tot;for(const x of weights){r-=x.w;if(r<=0){cargo.push(x.k);break;}}}
  }
  return {id:'TRK-'+(sim.truckSeq++),ship:'#SHP-'+(sim.shipSeq+=irand(1,9)),car,cargo,late,expedite:focus||null};
}
function spawnTruck(sh,bay){
  const g=makeTruck(sh.car,!!sh.expedite); world.add(g);
  const now=clockMin();
  const t={kind:'tk',id:sh.id,ship:sh.ship,car:sh.car,cargo:sh.cargo,expedite:sh.expedite,g,bay:null,state:'queued',assigned:0,unloaded:0,busyBy:null,
    x:21.6,z:SPAWN_Z,loc:true,yaw:Math.PI/2,steps:[],spd:6,rspd:2.2,turn:1.0,gate:1.25,detPaid:0,blockT:0,ghost:0};
  const c=now-irand(260,420); t.times={confirmed:c,picked:c+irand(50,90),loaded:c+irand(110,150),gate:now,arrived:null,done:null};
  g.userData.sel=t; trucks.push(t);
  if(bay){ t.atGate=true; t.bay=bay; bay.truck=t; t.x=6.0;t.z=bay.z;t.yaw=0;t.state='unloading';t.times.arrived=now;t.times.gate=now;bay.open=1; }
  place(t); return t;
}
function assignBay(t,bay){
  t.bay=bay; bay.truck=t; t.state='docking';
  const P=planner(t);
  P.mv(21.6,bay.z+3.2).mv(20.2,bay.z).mv(6.0,bay.z,true,.8).act(()=>{t.state='unloading';bay.count++;t.times.arrived=clockMin();log(opsT('ops.log.docked',{id:t.id,car:t.car.name,bay:bay.i+1}),'info');});
  t.steps=P.steps;
}
function dispatchQueue(){
  let q=trucks.filter(t=>t.state==='queued').sort((a,b)=>a.z-b.z);
  const laneBusy=trucks.some(t=>t.state==='departing'&&t.z>-16);
  if(!laneBusy&&!game.hands)for(const t of q){if(t.z>30)break;const bay=bays.find(b=>!b.truck);if(!bay)break;assignBay(t,bay);break;}
  q=trucks.filter(t=>t.state==='queued').sort((a,b)=>a.z-b.z);
  q.forEach((t,i)=>{let tz=[16,40,68,80][i]||80+12*(i-3);if(tz>t.z+0.1)tz=t.z;const s=t.steps[0];
    if(!(s&&Math.abs(s.z-tz)<.1)&&Math.abs(t.z-tz)>.1) t.steps=[{t:'move',x:21.6,z:tz}];
    if(!t.atGate&&t.z<47){t.atGate=true;t.times.gate=clockMin();}
    const wait=t.atGate?clockMin()-t.times.gate:0;
    if(game.phase==='shift'&&wait>15){const n=Math.min(6,Math.floor((wait-15)/5)+1);while(t.detPaid<n){t.detPaid++;game.st.detention++;game.ledger.det-=2;addScore(-2,'det',t.x,4.5,t.z,true);}}
  });
}
function departTruck(t){
  t.state='departing'; t.times.done=clockMin(); const bay=t.bay;
  const dur=t.times.done-t.times.gate;
  if(game.phase==='shift'){game.st.trucks++; const b=dur<=45?25:dur<=70?10:0; if(b){if(b===25)game.st.fast++;game.ledger.turn+=b;addScore(b,'turn',t.x,4.6,t.z);} }
  if(dur<=45)mission('fast',1);
  log(opsT('ops.log.departed',{id:t.id,dur:fmtDur(dur),bay:bay.i+1}),'ok');
  const P=planner(t);
  P.wait(1.2).mv(15,bay.z).mv(21.6,bay.z-4.5).mv(21.6,bay.z-7).act(()=>{bay.truck=null;dirty=true;}).mv(21.6,EXIT_Z).act(()=>{world.remove(t.g);trucks.splice(trucks.indexOf(t),1);if(selected===t)select(null);dirty=true;});
  t.steps=P.steps;
}
function updateTruck(t,dt){
  runSteps(t,dt); t.g.visible=onMap(t.x+OX,t.z);
  if(t.state==='unloading'&&t.unloaded>=t.cargo.length&&!t.busyBy&&!t.steps.length&&!trucks.some(x=>x.state==='docking'||(x.state==='departing'&&x.z>-16))) departTruck(t);
  place(t);
}
function scheduleTruck(mins,late,focus){
  const sh=newShipment(late,focus); sh.eta=clockMin()+mins; sim.enroute.push(sh); sim.enroute.sort((a,b)=>a.eta-b.eta);
  dirty=true; return sh;
}
function rushInbound(sku){return xfers.some(t=>t.sku===sku&&t.to===game.siteIdx)||sim.enroute.some(s=>s.expedite===sku)||trucks.some(t=>t.expedite===sku&&t.state!=='departing');}
function expedite(sku){
  if(rushInbound(sku)){log(t('ops.log.rushOnWay',{sku:SKUS[sku].name}),'');return false;}
  const sh=scheduleTruck(4,false,sku); log(t('ops.log.expedited',{sku:SKUS[sku].name,id:sh.id}),'info'); return true;
}

/* ---------------- orders, combo ---------------- */
function newOrder(rush){
  const tot=SKU_KEYS.reduce((a,k)=>a+SKUS[k].pop,0); let r=RNG()*tot, sku=SKU_KEYS[0];
  for(const k of SKU_KEYS){r-=SKUS[k].pop;if(r<=0){sku=k;break;}}
  return {id:'ORD-'+(++sim.orderSeq),sku,created:clockMin(),due:clockMin()+(rush?25:sla()+irand(-4,6)),rush:!!rush,late:false,shop:(()=>{const c=customers();return c.length?c[Math.floor(RNG()*c.length)]:null;})()};
}
function releaseOrder(){
  if(sim.orders.length>=8)return;
  const o=newOrder(false), st=stockBySku();
  if(game.phase==='shift'&&!tut){offerOrder(o);return;}
  const coming=trucks.some(t=>t.state!=='departing'&&t.cargo.slice(t.assigned).includes(o.sku));
  if(st[o.sku].free===0&&!coming){
    if(game.phase==='shift'){game.st.backorders++;game.ledger.back-=15;addScore(-15,'back',-12,3.5,AISLE(ROWS[0]),true);}
    log(t('ops.log.backordered',{id:o.id,sku:SKUS[o.sku].name}),'bad'); return;
  }
  sim.orders.push(o); log(t('ops.log.released',{id:o.id,sku:SKUS[o.sku].name}),'');
}
const comboMult=()=>Math.min(2,1+0.25*Math.floor(game.combo/3));
function breakCombo(){if(game.combo>=3&&game.phase==='shift'){popup(t('ops.pop.comboLost'),-10+OX,3,AISLE(ROWS[ROWS.length-1]),'bad');Snd.play('lost');} game.combo=0; dirty=true;}
function onStaged(o,st){
  if(game.phase!=='shift')return;
  if(o.stagedAt<=o.due){
    const before=comboMult(); game.combo++; game.bestCombo=Math.max(game.bestCombo,game.combo); const m=comboMult();
    game.st.shipOn++; mission('ship',1); mission('combo',game.combo,true); const base=o.rush?(game.mods.has('rush')?60:40):15; const pts=Math.round(base*m);
    if(o.rush){game.ledger.rush+=base;game.st.rushOn++;} else game.ledger.ship+=base;
    game.ledger.combo+=pts-base;
    addScore(pts,'ship',st.x,1.6,STAGE_Z,false,m>1?'gold':'');
    Snd.play('coin',1+0.06*Math.floor(game.combo/3));
    if(m>before){flashes.combo=true;popup(t('ops.pop.combo',{m:m.toFixed(2).replace(/0$/,'')}),st.x+OX,3.2,STAGE_Z,'gold');}
    if(m>=2)unlock('combo2');
  }else{
    game.st.shipLate++; game.ledger.ship+=2; addScore(2,'ship',st.x,1.6,STAGE_Z); breakCombo();
  }
}
function lateCheck(){
  const now=clockMin();
  const all=[...sim.orders,...forklifts.filter(f=>f.task&&f.task.order).map(f=>f.task.order)];
  all.forEach(o=>{ if(!o.late&&!o.stagedAt&&now>o.due){ o.late=true; if(game.phase==='shift'){game.st.lateOrders++;game.ledger.late-=10;addScore(-10,'late',-6,3,AISLE(ROWS[ROWS.length-1]),true);breakCombo();} log(t('ops.log.pastDue',{id:o.id}),'bad'); } });
}
function prioritize(id){const i=sim.orders.findIndex(o=>o.id===id);if(i>0){const [o]=sim.orders.splice(i,1);sim.orders.unshift(o);log(t('ops.log.prioritized',{id:o.id}),'info');if(tut)tut.flags.prio=true;dirty=true;}}
function checkLow(sku){
  if(game.phase!=='shift'||tut)return;
  const st=stockBySku();
  if(st[sku].pallets>1||(game.lowCd[sku]||0)>sim.sec||rushInbound(sku))return;
  game.lowCd[sku]=sim.sec+70;
  raise({tone:'warn',icon:ICON.box,title:t('ops.inc.low.title',{sku:SKUS[sku].name}),body:tn('ops.inc.low.body',st[sku].pallets),
    options:[{label:t('ops.inc.low.opt1'),note:t('ops.inc.low.note1'),cost:35,primary:true,fn:()=>expedite(sku)},{label:t('ops.inc.low.opt2'),note:t('ops.inc.free')}],def:1});
}

/* ---------------- scoring & incidents ---------------- */
function addScore(n,kind,x,y,z,bad,cls){
  if(game.phase!=='shift')return;
  if(game.hands&&n>0){const b=Math.round(n*0.25);game.ledger.hands=(game.ledger.hands||0)+b;n+=b;}
  game.score+=n;
  flashes.score=true;
  if(x!=null) popup((n>0?'+':'')+n,x+OX,y,z,bad?'bad':(cls||(kind==='put'?'info':'')));
  if(kind==='put')Snd.play('put'); else if(bad)Snd.play('bad');
  dirty=true;
}
const pops=[];
function popup(text,x,y,z,cls){
  if(!els.fx)return;
  const el=document.createElement('div'); el.className='pop '+(cls||''); el.textContent=text; els.fx.appendChild(el);
  pops.push({el,p:new THREE.Vector3(x,y,z),t:0});
}
function raise(inc){
  if(game.phase!=='shift')return;
  inc.ttl=inc.ttl||22; inc.t=0;
  if(game.incident) game.queue.push(inc); else showIncident(inc);
}
function showIncident(inc){game.incident=inc;notify('warn',inc.title,inc.body);Snd.play('alert');snpIncident();}
function chooseIncident(i){
  const inc=game.incident; if(!inc)return;
  const o=inc.options[i]; if(!o)return;
  if(o.cost){spend(o.cost);if(o.fix){game.st.fixes++;save.stats.fixes++;}}
  if(o.fn)o.fn();
  game.incident=null;
  if(game.queue.length) showIncident(game.queue.shift()); else snpIncident();
}
function snpIncident(){
  const inc=game.incident;
  putLive({incidentT:inc?Math.max(0,100-inc.t/inc.ttl*100):null});
  if(!inc){put('incident',null);return;}
  put('incident',{cls:inc.tone||'',icon:inc.icon,title:inc.title,body:inc.body,
    opts:inc.options.map((o,i)=>({i,label:o.label,note:o.note||'',primary:!!o.primary})),
    more:game.queue.length});
}
const spills=[];
function addSpill(r){
  const z=AISLE(ROWS[r]), g=new THREE.Group(); world.add(g);
  const pm=new THREE.Mesh(new THREE.CircleGeometry(1,28),new THREE.MeshStandardMaterial({color:'#8fb9ea',roughness:.15,metalness:.1,transparent:true,opacity:.75}));
  pm.rotation.x=-Math.PI/2; pm.scale.set(2.6,1.1,1); pm.position.set(-12.5,0.075,z); g.add(pm);
  const pm2=pm.clone(); pm2.scale.set(1.1,.7,1); pm2.position.set(-10.4,0.076,z+.3); g.add(pm2);
  [[-6.6,z-0.9],[-6.6,z+0.9],[-19.4,z]].forEach(([x,zz])=>{
    const c=new THREE.Mesh(new THREE.ConeGeometry(.24,.62,14),mat('#ff7a2f'));c.position.set(x,.31,zz);c.castShadow=true;g.add(c);
    cyl(.15,.17,.1,'#ffffff',x,.36,zz,g,14);
  });
  const w=sprite(warnTex); w.position.set(-12.5,1.4,z); g.add(w);
  spills.push({r,g});
}
function clearSpills(){for(let i=spills.length-1;i>=0;i--){if(!blocked(spills[i].r)){world.remove(spills[i].g);log(t('ops.log.aisleClear',{a:'ABCD'[spills[i].r]}),'ok');spills.splice(i,1);}}}

function rollEvent(force){
  const kinds=[];
  const working=forklifts.filter(f=>!f.broken&&!f.temp&&!f.remove);
  if(working.length>=2&&!game.mods.has('calm')) kinds.push('breakdown','breakdown');
  const openRows=ROWS.map((_,r)=>r).filter(r=>!blocked(r));
  if(openRows.length===ROWS.length) kinds.push('spill');
  kinds.push('rush','rush'); if(game.mods.has('rush'))kinds.push('rush','rush','rush');
  if(sim.enroute.length) kinds.push('delay');
  if(game.surgeUntil<sim.sec) kinds.push('surge');
  const k=force||pick(kinds);
  if(k==='breakdown'){
    const pool=working.length?working:forklifts.filter(f=>!f.broken); if(!pool.length)return;
    const f=pick(pool); abortTask(f); f.broken=sim.sec+90; f.g.userData.warn.visible=true;
    log(t('ops.log.breakdown',{id:f.id}),'bad');
    raise({tone:'bad',icon:ICON.wrench,title:t('ops.inc.breakdown.title',{id:f.id}),body:f.carry?t('ops.inc.breakdown.bodyCarry'):t('ops.inc.breakdown.body'),
      options:[{label:t('ops.inc.breakdown.opt1'),note:t('ops.inc.breakdown.note1'),cost:40,fix:true,primary:true,fn:()=>{f.broken=Math.min(f.broken,sim.sec+20);}},{label:t('ops.inc.breakdown.opt2'),note:t('ops.inc.breakdown.note2')}],def:1});
  }else if(k==='spill'){
    const r=pick(openRows); sim.blocked[r]=sim.sec+60; addSpill(r);
    forklifts.forEach(f=>{if(f.task&&f.task.slot&&f.task.slot.r===r&&!f.task.picked)abortTask(f);});
    log(t('ops.log.spill',{a:'ABCD'[r]}),'bad');
    raise({tone:'warn',icon:ICON.drop,title:t('ops.inc.spill.title',{a:'ABCD'[r]}),body:r===ROWS.length-1?t('ops.inc.spill.bodyStaging',{a:'ABCD'[r]}):t('ops.inc.spill.body',{a:'ABCD'[r]}),
      options:[{label:t('ops.inc.spill.opt1'),note:t('ops.inc.spill.note1'),cost:20,fix:true,primary:true,fn:()=>{sim.blocked[r]=sim.sec+8;}},{label:t('ops.inc.spill.opt2'),note:t('ops.inc.spill.note2')}],def:1});
  }else if(k==='rush'){
    const st=stockBySku(); const avail=SKU_KEYS.filter(s=>st[s].free>0); if(!avail.length)return;
    const o=newOrder(true); o.sku=pick(avail); const pay=game.mods.has('rush')?60:40;
    raise({tone:'info',icon:ICON.clock,title:t('ops.inc.rush.title',{id:o.id}),body:t('ops.inc.rush.body',{sku:SKUS[o.sku].name}),
      options:[{label:t('ops.inc.rush.opt1'),note:t('ops.inc.rush.note1',{pay}),primary:true,fn:()=>{o.due=clockMin()+25;sim.orders.unshift(o);log(t('ops.log.rushAccepted',{id:o.id}),'info');}},{label:t('ops.inc.rush.opt2'),note:t('ops.inc.rush.note2'),cost:10}],def:0});
  }else if(k==='delay'){
    const sh=sim.enroute[0]; if(!sh)return; sh.eta+=25; sh.late=true;
    log(t('ops.log.delay',{id:sh.id,car:sh.car.name}),'warn');
    raise({tone:'warn',icon:ICON.truck,title:t('ops.inc.delay.title',{id:sh.id}),body:t('ops.inc.delay.body',{car:sh.car.name,time:fmtT(sh.eta)}),
      options:[{label:t('ops.inc.delay.opt1'),note:t('ops.inc.delay.note1'),cost:30,fix:true,primary:true,fn:()=>{const b=scheduleTruck(3);log(t('ops.log.backupBooked',{id:b.id}),'info');}},{label:t('ops.inc.delay.opt2'),note:t('ops.inc.free')}],def:1});
  }else if(k==='surge'){
    game.surgeUntil=sim.sec+45;
    log(t('ops.log.surge'),'warn');
    raise({tone:'warn',icon:ICON.bolt,title:t('ops.inc.surge.title'),body:t('ops.inc.surge.body'),
      options:[{label:t('ops.inc.surge.opt1'),note:t('ops.inc.surge.note1'),cost:60,fix:true,primary:true,fn:()=>hireTemp(60)},{label:t('ops.inc.surge.opt2'),note:t('ops.inc.free')}],def:1});
  }
}

/* ---------------- warehouse shells by building type ---------------- */
function buildRoof(S,s,mk,full){
  const accent=s.accent, type=s.type||'dc';
  const C=(r,h,c,x,y,z)=>{const m=new THREE.Mesh(GEOS['rc'+r+h]||(GEOS['rc'+r+h]=new THREE.CylinderGeometry(r,r,h,16)),mk(c));m.position.set(x,y,z);m.castShadow=true;S.add(m);return m;};
  const logoTex=()=>canvasTex(1024,256,(c,W,H)=>{c.fillStyle='#ffffff';c.beginPath();const cx=150,cy=128,r=78;for(let k=0;k<6;k++){const a=Math.PI/3*k-Math.PI/2;c.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));}c.closePath();c.fill();c.fillStyle='#2f5be0';c.beginPath();c.arc(cx,cy,30,0,Math.PI*2);c.fill();c.fillStyle='#ffffff';c.font='800 120px "Bricolage Grotesque", Figtree, sans-serif';c.textBaseline='middle';c.fillText('WareTrack',270,134);});
  if(type==='cold'){
    box(21,0.45,27,mk('#eef4f8'),-10,5.0,0,S); box(21.2,0.3,27.2,mk(accent),-10,4.8,0,S);
    for(let k=0;k<4;k++){const x=-16+k*4; [-7,7].forEach(z=>{box(2.6,1.0,1.8,mk('#d5dde8'),x,5.7,z,S); C(.6,.06,'#6b778a',x,6.24,z);});}
    const lg=new THREE.Mesh(new THREE.PlaneGeometry(9,2.25),mk('#ffffff',logoTex())); lg.rotation.x=-Math.PI/2; lg.position.set(-10,5.25,0); S.add(lg);
  }else if(type==='cross'){
    for(let k=0;k<4;k++){const rf=new THREE.Mesh(prism(21.2,6.8,1.7),mk(k%2?'#3a5fd8':'#2f5be0'));rf.position.set(-10,4.85,-10.2+k*6.8);rf.castShadow=true;S.add(rf);}
    box(21.2,0.25,0.3,mk(accent),-10,4.85,-13.5,S);
  }else if(type==='robot'){
    box(21,0.4,27,mk('#e4e8f1'),-10,5.0,0,S); box(21.2,0.3,27.2,mk(accent),-10,4.8,0,S);
    for(let i=0;i<4;i++)for(let j=0;j<6;j++){const p=box(4.2,0.12,3.2,mk('#28407a'),-17.2+i*4.8,5.55,-10+j*4,S); p.rotation.x=-0.25; box(4.24,0.04,0.06,mk('#8fb0ff'),-17.2+i*4.8,5.62,-10+j*4,S,false);}
    box(1.4,1.6,1.4,mk('#d9dfec'),-2.2,6,11.5,S); C(.08,2.4,'#8a98ad',-2.2,7.9,11.5);
  }else{
    const rf=new THREE.Mesh(prism(21.2,27.2,2.6),mk(type==='depot'?'#3a5fd8':'#2f5be0')); rf.position.set(-10,4.85,0); rf.castShadow=true; S.add(rf);
    const lg=new THREE.Mesh(new THREE.PlaneGeometry(10,2.5),mk('#ffffff',logoTex())); lg.material.transparent=true;
    const ang=Math.atan2(2.6,13.6); lg.rotation.x=-(Math.PI/2-ang); lg.position.set(-10,4.85+1.3+0.06,6.8+0.02); S.add(lg);
    [[-15,-6],[-6,-6]].forEach(([x,z])=>{box(1.8,0.8,1.3,mk('#d9dfec'),x,6.9,z,S);});
  }
}
function siteExtras(G,s){
  if(s.type==='cold'){[-17,-13.4].forEach(x=>{cyl(1.5,1.5,7,'#e9eef5',x,3.5,-16.4,G,20);cyl(1.55,1.55,0.3,s.accent,x,6.4,-16.4,G,20);const d=new THREE.Mesh(new THREE.SphereGeometry(1.5,18,8,0,TAU,0,Math.PI/2),mat('#dfe6ef'));d.position.set(x,7,-16.4);G.add(d);});}
  if(s.type==='robot'){box(3,2.2,2.4,'#f1f3f8',-16,1.1,-16,G); box(3.1,.2,2.5,s.accent,-16,2.25,-16,G);}
  if(s.type==='cross'){for(let i=0;i<3;i++)box(2.2,0.6,1.3,'#c99a60',-18+i*2.6,0.3,-15.8,G);}
}

/* ---------------- the other sites: a lighter live simulation ---------------- */
const lites=new Map();
const DESTS=['Albany, NY','Scranton, PA','Baltimore, MD','Hartford, CT','Philadelphia, PA','Boston, MA','Pittsburgh, PA','Trenton, NJ'];
let liteSeq=5000;
function buildLite(idx){
  if(lites.has(idx)||idx===game.siteIdx)return;
  const s=SITES[idx], ox=s.k*SLICE_W, G=new THREE.Group(); G.position.set(ox,0,0); env.add(G);
  const R=mulberry32(hashStr('lite'+s.code));
  const bz=Array.from({length:s.bays},(_,i)=>(i-(s.bays-1)/2)*5);
  box(20,0.1,26,s.floor,-10,0.05,0,G,false);
  box(24,0.06,26,'#eef1f8',12,0.03,0,G,false);
  // walls and roof
  const wall='#eef1f8';
  box(20.6,4.8,0.3,wall,-10,2.4,-13.15,G); box(20.6,4.8,0.3,wall,-10,2.4,13.15,G); box(0.3,4.8,26.6,'#e3e8f4',-20.15,2.4,0,G);
  box(20.7,0.3,0.36,s.accent,-10,4.75,13.15,G); box(20.7,0.3,0.36,s.accent,-10,4.75,-13.15,G); box(0.36,0.3,26.7,s.accent,0,4.75,0,G);
  const edges=[-13.15,...bz.flatMap(z=>[z-1.75,z+1.75]),13.15];
  for(let i=0;i<edges.length;i+=2){const a=edges[i],b=edges[i+1]; if(b-a>0.05) box(0.3,4.8,b-a,wall,0,2.4,(a+b)/2,G);}
  const shellG=new THREE.Group(); G.add(shellG);
  buildRoof(shellG,s,(c,map)=>map?new THREE.MeshStandardMaterial({map,color:c,roughness:.8,transparent:true}):mat(c),false);
  siteExtras(G,s);
  const sel={kind:'site',idx}; G.userData.sel=sel;
  const L={idx,s,ox,G,sel,bays:[],fls:[],trucks:[],next:3+R()*10,fill:0.45+R()*0.3,done:0,onTime:0,late:0,inbound:0,R};
  bz.forEach((z,i)=>{
    const g=new THREE.Group(); g.position.set(0,0,z); G.add(g);
    box(0.32,4.4,0.32,s.accent,0,2.2,-1.75,g); box(0.32,4.4,0.32,s.accent,0,2.2,1.75,g); box(0.5,0.55,3.82,s.accent,0,4.15,0,g);
    const lightMat=new THREE.MeshStandardMaterial({color:'#24b46e',emissive:'#24b46e',emissiveIntensity:.8});
    const light=new THREE.Mesh(bgeo(.12,.22,.22),lightMat); light.position.set(0.2,3.1,-2.05); g.add(light);
    const door=box(0.14,3.6,3.18,'#e9eef6',0,1.9,0,g);
    [[0.7,-1.9,12.6,-1.9],[0.7,1.9,12.6,1.9]].forEach(([x1,z1,x2])=>box(x2-x1,0.012,0.14,'#f2c230',(x1+x2)/2,0.07,z+z1-z,G,false));
    box(0.14,0.012,3.8,'#f2c230',12.6,0.07,z,G,false);
    const stack=new THREE.Group(); stack.position.set(10.6,0,z+3.05); G.add(stack);
    const pin=makePin(1.2); pin.position.set(10.6,0,z+3.05); pin.visible=false; G.add(pin);
    const b={i,z,truck:null,door,lightMat,open:0,stack,pin,count:0,lite:L};
    g.userData.sel={kind:'lbay',bay:b}; L.bays.push(b);
  });
  // yard forklifts, one per two docks
  const nf=Math.max(1,Math.ceil(s.bays/2));
  for(let k=0;k<nf;k++){
    const g=makeForklift(false); G.add(g);
    const f={kind:'lfl',id:'FL-'+s.code.slice(3)+(k+1),lite:L,g,x:2.4,z:(bz[k*2]||0)+2.3,yaw:0,steps:[],spd:3.2,rspd:2,turn:4,gate:0.6,forkY:0,carry:null,task:'Idle',moved:0,battery:60+R()*35,home:k};
    g.userData.sel=f; L.fls.push(f); placeL(f);
  }
  // a couple of trucks already on site
  L.bays.forEach((b,i)=>{ if(R()<0.6){const t=spawnLiteTruck(L,R()<0.5?'in':'out',b); t.done=Math.floor(R()*t.n*0.6);} });
  setStack(L);
  lites.set(idx,L); return L;
}
function placeL(o){o.g.position.set(o.x,0,o.z);o.g.rotation.y=o.yaw;o.g.visible=onMap(o.x,o.z);}
function removeLite(idx){
  const L=lites.get(idx); if(!L)return;
  L.trucks.forEach(t=>{env.remove(t.g);const k=liteTrucks.indexOf(t);if(k>=0)liteTrucks.splice(k,1);});
  env.remove(L.G); lites.delete(idx);
  if(selected&&(selected.lite===L||(selected.bay&&selected.bay.lite===L)||(selected.kind==='site'&&selected.idx===idx)))select(null);
}
function setStack(L){
  L.bays.forEach(b=>{
    const t=b.truck, want=!t?0:t.dir==='out'?Math.min(3,t.n-t.done):Math.min(3,t.done);
    while(b.stack.children.length>want)b.stack.remove(b.stack.children[b.stack.children.length-1]);
    while(b.stack.children.length<want){const p=makePallet(pick(SKU_KEYS));p.position.set(-0.6+b.stack.children.length*1.25,0.02,0);p.userData.sel=null;b.stack.add(p);}
    b.pin.visible=!!(t&&t.dir==='out'&&want>0);
  });
}
function spawnLiteTruck(L,dir,bay){
  const car=pick(CARRIERS), g=makeTruck(car,false); env.add(g);
  const n=dir==='out'?irand(4,7):irand(3,6), now=clockMin();
  const t={kind:'tk',lite:L,ox:L.ox,id:'TRK-'+(++liteSeq),ship:'#SHP-'+(80000+liteSeq*7%9999),car,dir,n,done:0,g,bay:null,state:'queued',
    dest:dir==='out'?DESTS[(liteSeq*3)%DESTS.length]:L.s.code+' '+L.s.name,from:dir==='in'?car.from:L.s.code+' '+L.s.name,
    x:21.6+L.ox,z:SPAWN_Z,yaw:Math.PI/2,steps:[],spd:6,rspd:2.2,turn:1.0,gate:1.25,blockT:0,ghost:0,cargo:[],unloaded:0,
    times:{gate:now,arrived:null,done:null,confirmed:now-irand(260,420)}};
  t.times.picked=t.times.confirmed+irand(50,90); t.times.loaded=t.times.confirmed+irand(110,150);
  g.userData.sel=t; L.trucks.push(t); liteTrucks.push(t);
  if(bay){t.atGate=true;t.bay=bay;bay.truck=t;t.x=6+L.ox;t.z=bay.z;t.yaw=0;t.state=dir==='in'?'unloading':'loading';t.times.arrived=now;bay.open=1;}
  else L.inbound++;
  placeL(t); return t;
}
function liteDock(L,t,b){
  t.bay=b; b.truck=t; t.state='docking'; L.inbound=Math.max(0,L.inbound-1);
  const ox=L.ox, P=planner(t);
  P.mv(21.6+ox,b.z+3.2).mv(20.2+ox,b.z).mv(6+ox,b.z,true,.8).act(()=>{t.state=t.dir==='in'?'unloading':'loading';t.times.arrived=clockMin();b.count++;setStack(L);});
  t.steps=P.steps;
}
function liteDepart(L,t){
  t.state='departing'; t.times.done=clockMin(); const b=t.bay, ox=L.ox;
  L.done++; if(t.times.done-t.times.gate<=70)L.onTime++; else L.late++;
  L.fill=clamp(L.fill+(t.dir==='in'?0.035:-0.04),0.2,0.95);
  const P=planner(t);
  P.wait(1.2).mv(15+ox,b.z).mv(21.6+ox,b.z-4.5).mv(21.6+ox,b.z-7).act(()=>{b.truck=null;setStack(L);}).mv(21.6+ox,EXIT_Z).act(()=>{t.gone=true;});
  t.steps=P.steps;
}
function liteForklift(L,f,dt){
  if(f.steps.length){runSteps(f,dt);placeL(f);f.g.userData.carriage.position.y=0.1+f.forkY;return;}
  const ox=L.ox, mine=L.bays.filter((b,i)=>Math.floor(i/2)===f.home);
  const b=mine.find(b=>b.truck&&(b.truck.state==='unloading'||b.truck.state==='loading')&&b.truck.done<b.truck.n&&!b.truck.busy);
  const P=planner(f), zl=z=>z+2.3;
  const carry=on=>()=>{const c=f.g.userData.carriage; if(on&&!f.carry){f.carry=makePallet(pick(SKU_KEYS));f.carry.userData.sel=null;f.carry.position.set(0.55,0.05,0);c.add(f.carry);} if(!on&&f.carry){c.remove(f.carry);f.carry=null;}};
  if(b){
    const t=b.truck; t.busy=f; f.task=(t.dir==='in'?'Unloading ':'Loading ')+t.id;
    const door=[1.9+ox,zl(b.z)], yard=[9.2+ox,zl(b.z)];
    const [a,c]=t.dir==='in'?[door,yard]:[yard,door];
    P.mv(a[0],a[1]).turn(t.dir==='in'?Math.PI:0).lift(0.05).wait(0.6).act(carry(true)).lift(0.25)
     .mv(c[0],c[1],false,.8).lift(0.05).wait(0.5).act(carry(false)).act(()=>{t.done++;t.busy=null;f.moved++;setStack(L);});
    f.battery=Math.max(10,f.battery-0.8);
  }else{
    f.task='Idle'; const hz=zl((mine[0]||L.bays[0]).z);
    if(Math.hypot(f.x-(2.4+ox),f.z-hz)>0.2)P.mv(2.4+ox,hz); P.wait(1.5);
    f.battery=Math.min(100,f.battery+0.6);
  }
  f.steps=P.steps;
}
function updateLite(L,dt){
  L.next-=dt;
  if(L.next<=0){
    const q=L.trucks.filter(t=>t.state==='queued').length;
    if(q<3) spawnLiteTruck(L,L.R()<0.5?'in':'out',null);
    const r=L.s.truckRate; L.next=rand(r[0],r[1])*0.55;
  }
  const xferOut=xfers.some(t=>t.from===L.idx&&t.z>-19), laneBusy=xferOut||L.trucks.some(t=>t.state==='departing'&&t.z>-16);
  if(!laneBusy)for(const t of L.trucks.filter(t=>t.state==='queued').sort((a,b)=>a.z-b.z)){if(t.z>30)break;const b=L.bays.find(b=>!b.truck);if(!b)break;liteDock(L,t,b);break;}
  L.trucks.filter(t=>t.state==='queued').sort((a,b)=>a.z-b.z).forEach((t,i)=>{let tz=[16,40,68,80][i]||80+12*(i-3);if(tz>t.z+0.1)tz=t.z;const s=t.steps[0];
    if(!(s&&Math.abs(s.z-tz)<.1)&&Math.abs(t.z-tz)>.1)t.steps=[{t:'move',x:21.6+L.ox,z:tz}];
    if(!t.atGate&&t.z<47){t.atGate=true;t.times.gate=clockMin();}});
  for(let i=L.trucks.length-1;i>=0;i--){
    const t=L.trucks[i]; runSteps(t,dt);
    if((t.state==='unloading'||t.state==='loading')&&t.done>=t.n&&!t.busy&&!t.steps.length&&!L.trucks.some(x=>x.state==='docking'||(x.state==='departing'&&x.z>-16))&&!xferOut) liteDepart(L,t);
    placeL(t);
    if(t.gone){env.remove(t.g);L.trucks.splice(i,1);const k=liteTrucks.indexOf(t);if(k>=0)liteTrucks.splice(k,1);if(selected===t)select(null);}
  }
  L.fls.forEach(f=>liteForklift(L,f,dt));
  L.bays.forEach(b=>{
    const want=b.truck&&(b.truck.state==='unloading'||b.truck.state==='loading'||(b.truck.state==='docking'&&b.truck.x-L.ox<9))?1:0;
    b.open+=clamp(want-b.open,-dt*0.9,dt*0.9); const sc=1-0.88*b.open; b.door.scale.y=sc; b.door.position.y=3.85-3.6*sc/2;
    const c=b.truck?(b.truck.state==='docking'?'#f0a623':'#e0564b'):'#24b46e'; b.lightMat.color.set(c); b.lightMat.emissive.set(c);
  });
}
function liteStats(L){
  const docked=L.bays.filter(b=>b.truck&&b.truck.state!=='docking').length, queued=L.trucks.filter(t=>t.state==='queued').length;
  const out=L.trucks.filter(t=>t.dir==='out'&&t.state!=='departing').length, inn=L.trucks.filter(t=>t.dir==='in'&&t.state!=='departing').length;
  const n=L.onTime+L.late;
  return {fill:L.fill,docked,queued,out,inn,onTime:n?Math.round(L.onTime/n*100):96,done:L.done,working:L.fls.filter(f=>f.task!=='Idle').length,units:Math.round(L.fill*L.s.rows*16*2*40)};
}
function liteTruckStatus(t){
  if(t.state==='queued')return t.atGate?[opsT('ops.lite.atGate'),'warn']:[opsT('ops.lite.drivingIn'),'info'];
  if(t.state==='docking')return[opsT('ops.lite.docking'),'warn'];
  if(t.state==='unloading')return[opsT('ops.lite.unloading',{done:t.done,n:t.n}),'info'];
  if(t.state==='loading')return[opsT('ops.lite.loading',{done:t.done,n:t.n}),'ok'];
  return[t.dir==='out'?opsT('ops.lite.onRoad'):opsT('ops.lite.departing'),''];
}

/* ---------------- site loading ---------------- */
function computeLayout(s){
  const b=siteBuilds(s.code);
  const rows=Math.min(4,s.rows+(b.row?1:0));
  return {bays:Math.min(5,s.bays+(b.bays|0)),rows,l3:(b.l3||[]).filter(r=>r<rows),fc:b.fc||[],brk:!!b.brk,decor:b.decor||[]};
}
function loadSite(idx){
  site=SITES[idx]; game.siteIdx=idx; L=computeLayout(site); OX=site.k*SLICE_W; world.position.set(OX,0,0); game.fly=null;
  while(world.children.length) world.remove(world.children[0]);
  trucks.length=0; forklifts.length=0; slots.length=0; staging.length=0; bays.length=0; spills.length=0; ghosts.length=0;
  pops.forEach(p=>p.el.remove()); pops.length=0; reqs.length=0; buildEnv(); clearVans();
  removeLite(idx); SITES.forEach((_,i)=>{if(i!==idx)buildLite(i);});
  ROWS=[-11,-6,-1,4].slice(0,L.rows);
  ROW_LV=ROWS.map((_,r)=>L.l3.includes(r)?3:2);
  BAY_Z=Array.from({length:L.bays},(_,i)=>(i-(L.bays-1)/2)*5);
  STAGE_Z=AISLE(ROWS[ROWS.length-1])+2.9;
  resetSim();
  buildSite(); buildBays(); buildSlots(); seedRacks();
  const n=clamp(site.forklifts+save.up.fl-(game.mods.has('short')?1:0),2,HOMES.length-1);
  for(let i=0;i<n;i++){const f=addForklift(false); if(i<2){f.x=MAINX;f.z=i?3:-4;f.yaw=i?FACE_POS_Z:FACE_NEG_Z;place(f);}}
  const ta=spawnTruck(newShipment(false),bays[0]); ta.assigned=ta.unloaded=2; ta.times.gate-=14; ta.times.arrived-=10;
  if(bays.length>2){const tb=spawnTruck(newShipment(false),bays[2]); tb.assigned=tb.unloaded=1; tb.times.gate-=6; tb.times.arrived-=4;}
  const tc=spawnTruck(newShipment(false),null); tc.z=40; place(tc);
  scheduleTruck(14);
  for(let i=0;i<3;i++){const o=newOrder(false);const st=stockBySku();if(st[o.sku].free>0)sim.orders.push(o);}
  sim.startStock=totalUnits();
  putLive({siteMeta:{code:site.code,accent:site.accent,name:site.name,addr:site.addr,eyebrow:t('ops.site.eyebrow',{code:site.code})}});
  select(null); defaultView(); resize(); dirty=true;
  if(game.building) showGhosts();
  syncWhScaffolds();
}
function freePlay(idx){game.mode='normal';game.mods=new Set();game.daily=null;RNG=Math.random;game.phase='free';loadSite(idx==null?game.siteIdx:idx);}
function startShift(idx,mode){
  exitBuild(true); exitTown();
  mode=mode||'normal'; game.mode=mode;
  game.daily=mode==='daily'?dailySpec(todayKey()):null;
  game.mods=new Set(game.daily?game.daily.mods:[]);
  RNG=game.daily?mulberry32(game.daily.seed):Math.random;
  if(game.daily) idx=game.daily.site;
  loadSite(idx); resetGame(); game.phase='shift';
  sim.log=[]; log(t('ops.log.shiftStart.'+(mode==='daily'?'daily':mode==='tutorial'?'tutorial':'normal'),{site:site.name,n:forklifts.length}),'info');
  closeModal(); setSpeed(1); snpIncident(); dirty=true;
  if(mode==='tutorial') startTutorial();
}
function endShift(){
  if(game.phase!=='shift')return;
  if(tut) endTutorial(false,true);
  game.phase='report';
  const G=site.goals, st=game.st, n=st.shipOn+st.lateOrders;
  const otr=n?st.shipOn/n*100:0;
  const met=[st.recv>=G.recv, st.shipOn>=G.ship, n>=5&&otr>=G.ontime];
  const stars=met.filter(Boolean).length; if(stars>=2&&!tut)mission('stars',1); if(stars>=2&&game.hands&&!tut)unlock('handson'); reqs.length=0;
  let credits=Math.max(0,Math.round(game.score/6))+stars*10;
  const levelBefore=levelOf(save.xp), xpBefore=save.xp;
  const isDaily=game.mode==='daily';
  let dailyRes=null;
  if(isDaily){
    const d=save.daily,key=game.daily.key, prevBest=d.best[key];
    d.best[key]=prevBest==null?game.score:Math.max(prevBest,game.score);
    const cleared=game.score>=game.daily.target;
    let reward=0,newClear=false;
    if(cleared&&d.last!==key){
      d.streak=d.last===dayOffset(-1)?d.streak+1:1; d.last=key; d.bestStreak=Math.max(d.bestStreak,d.streak);
      d.cleared=(d.cleared||[]).concat(key).slice(-40);
      reward=40+10*Math.min(d.streak,7); credits+=reward; newClear=true;
    }
    dailyRes={cleared,reward,newClear,target:game.daily.target,streak:streakNow(),best:d.best[key]};
  }else{
    const prev=save.best[site.code];
    save.best[site.code]={score:prev?Math.max(game.score,prev.score):game.score,stars:Math.max(stars,prev?prev.stars:0)};
  }
  const nextLockedBefore=!isDaily&&game.siteIdx<SITES.length-1&&!unlocked(game.siteIdx+1);
  save.credits+=credits;
  const S=save.stats; S.shifts++; S.pallets+=st.recv; S.orders+=st.shipOn+st.shipLate; S.rush+=st.rushOn; if(stars===3)S.threeStars++; S.bestScore=Math.max(S.bestScore,game.score);
  const xpGain=Math.max(0,game.score)+stars*40+(isDaily?50:0);
  const lv=addXp(xpGain);
  // achievements
  unlock('first');
  if(stars===3)unlock('three');
  if(game.score>=1000)unlock('score1k');
  if(st.shipOn>=10&&st.lateOrders===0)unlock('nolate');
  if(st.recv>=50)unlock('pallets50');
  if(st.fast>=5)unlock('fast5');
  if(st.rushOn>=5)unlock('rush5');
  if(stars>=2&&st.spent===0)unlock('thrifty');
  if(st.fixes>=5)unlock('fixer');
  if(SITES.every(s=>save.best[s.code]&&save.best[s.code].stars>=2))unlock('allsites');
  if(save.best['WH-05']&&save.best['WH-05'].stars===3)unlock('summit');
  if(dailyRes&&dailyRes.cleared)unlock('daily1');
  if(streakNow()>=3)unlock('streak3'); if(streakNow()>=7)unlock('streak7');
  const newUnlock=nextLockedBefore&&unlocked(game.siteIdx+1)?SITES[game.siteIdx+1]:null;
  writeSave();
  game.lastReport={score:game.score,stars,met,otr,n,credits,xpGain,xpBefore,xpAfter:save.xp,levelBefore,levelAfter:lv.after,newUnlock,daily:dailyRes,mode:game.mode,
    st:Object.assign({},st),ledger:Object.assign({},game.ledger),bestCombo:game.bestCombo,ach:game.newAch.slice()};
  game.incident=null; game.queue=[]; snpIncident();
  log(t('ops.log.shiftOver',{score:game.score}),'ok');
  RNG=Math.random;
  openModal('report');
  setTimeout(()=>{for(let i=0;i<stars;i++)setTimeout(()=>Snd.play('star',i),i*350);},200);
  if(stars>=2||(dailyRes&&dailyRes.newClear))setTimeout(()=>confetti(160),700);
}

/* ---------------- tutorial ---------------- */
let tut=null;
const TUT=[
  {get t(){return t('ops.tut.welcome.title')},get b(){return t('ops.tut.welcome.body')},get btn(){return t('ops.tut.welcome.btn')},pause:true},
  {get t(){return t('ops.tut.camera.title')},get b(){return t('ops.tut.camera.body')},target:'.cam',wait:()=>tut.flags.drag,get waitText(){return t('ops.tut.camera.wait')}},
  {get t(){return t('ops.tut.truck.title')},get b(){return t('ops.tut.truck.body')},wait:()=>selected&&selected.kind==='tk',get waitText(){return t('ops.tut.truck.wait')},hint3d:true},
  {get t(){return t('ops.tut.track.title')},get b(){return t('ops.tut.track.body')},target:'#track',get btn(){return t('ops.tut.track.btn')},pause:true},
  {get t(){return t('ops.tut.goals.title')},get b(){return t('ops.tut.goals.body')},target:'#shift',get btn(){return t('ops.tut.goals.btn')},pause:true},
  {get t(){return t('ops.tut.orders.title')},get b(){return t('ops.tut.orders.body')},target:'#panel',wait:()=>tut.flags.prio,get waitText(){return t('ops.tut.orders.wait')},enter:()=>{setTab('ord');let g=0;while(sim.orders.length<3&&g++<10){const o=newOrder(false);if(stockBySku()[o.sku].free>0)sim.orders.push(o);}dirty=true;}},
  {get t(){return t('ops.tut.combo.title')},get b(){return t('ops.tut.combo.body')},target:'#scoreChip',get btn(){return t('ops.tut.combo.btn')},pause:true},
  {get t(){return t('ops.tut.incident.title')},get b(){return t('ops.tut.incident.body')},target:'#incident',enter:()=>rollEvent('breakdown'),wait:()=>!game.incident,get waitText(){return t('ops.tut.incident.wait')}},
  {get t(){return t('ops.tut.speed.title')},get b(){return t('ops.tut.speed.body')},target:'.speed',wait:()=>sim.speed===3,get waitText(){return t('ops.tut.speed.wait')}},
  {get t(){return t('ops.tut.ready.title')},get b(){return t('ops.tut.ready.body')},get btn(){return t('ops.tut.ready.btn')},pause:true},
];
function startTutorial(){tut={i:-1,flags:{},prevHands:game.hands};game.hands=false;game.nextEvent=1e9;putLive({coaching:true});nextTut();}
function nextTut(){
  if(!tut)return; clearSpotLocal();
  tut.i++; const s=TUT[tut.i];
  if(!s){endTutorial(true);return;}
  if(s.enter)s.enter();
  if(s.pause)setSpeed(0); else if(sim.speed===0)setSpeed(1);
  putLive({spot:s.target||null});
  snpCoach();
}
let spotElRef=null;
function clearSpotLocal(){if(spotElRef){spotElRef.classList.remove('spot');spotElRef=null;}}
function snpCoach(){
  if(!tut){putLive({coachTop:false});put('coach',null);return;}
  const s=TUT[tut.i];
  putLive({coachTop:s.target==='#track'});
  put('coach',{step:tut.i+1,total:TUT.length,title:s.t,body:s.b,btn:s.btn||'',wait:s.waitText||''});
}
function clearSpot(){clearSpotLocal();}
function tutTick(){
  if(!tut)return; const s=TUT[tut.i]; if(!s)return;
  if(s.wait&&s.wait()){if(tut.waitAt==null)tut.waitAt=perf;else if(perf-tut.waitAt>0.35){tut.waitAt=null;nextTut();}}
}
function endTutorial(done,silent){
  if(!tut)return; clearSpotLocal(); game.hands=tut.prevHands; tut=null; putLive({coachTop:false,coaching:false,spot:null}); put('coach',null);
  game.nextEvent=rand(40,60); if(sim.speed===0&&game.phase==='shift')setSpeed(1);
  const first=!save.tutorial; save.tutorial=true;
  if(done){ if(first){save.credits+=50;toast('info',t('ops.toast.trainingDone.title'),t('ops.toast.trainingDone.body'),ICON.star);} unlock('tutorial'); }
  writeSave(); if(!silent) dirty=true;
}
/* ---------------- build mode ---------------- */
// i18n aliases: many locals in this chunk are named t, which would shadow the translator
const _t=(k,p)=>t(k,p), _tn=(k,n,p)=>tn(k,n,p);
const ghosts=[];
let buildSel=null;
function buildOptions(){
  const pending=new Set(save.constr.filter(c=>c.kind==='wh'&&c.site===site.k).map(c=>c.key));
  const out=[];
  if(L.bays<5&&!pending.has('bay')) out.push({key:'bay',group:_t('hud.build.grpDocks'),icon:ICON.dock,label:_t('hud.build.bayLabel'),desc:_t('hud.build.bayDesc'),cost:150,pos:[6.6,1.2,L.bays*2.5],size:[11.8,2.4,3.6]});
  if(L.rows<4&&!pending.has('row')) out.push({key:'row',group:_t('hud.build.grpDocks'),icon:ICON.rack,label:_t('hud.build.rowLabel'),desc:_t('hud.build.rowDesc'),cost:160,pos:[-12.95,1.55,4],size:[12.2,3.1,1.3]});
  ROWS.forEach((z,r)=>{if(!L.l3.includes(r)&&!pending.has('l3:'+r))out.push({key:'l3:'+r,group:_t('hud.build.grpDocks'),icon:ICON.up,label:_t('hud.build.l3Label',{r:'ABCD'[r]}),desc:_t('hud.build.l3Desc',{r:'ABCD'[r]}),cost:70,pos:[-12.95,3.9,z],size:[12.2,1.4,1.3]});});
  HOMES.forEach((h,i)=>{if(!L.fc.includes(i)&&!pending.has('fc:'+i))out.push({key:'fc:'+i,group:_t('hud.build.grpFleet'),icon:ICON.plug,label:_t('hud.build.fcLabel',{n:i+1}),desc:_t('hud.build.fcDesc'),cost:45,pos:[h.x,0.4,h.z],size:[1.25,0.8,1.3]});});
  if(!L.brk&&!pending.has('brk')) out.push({key:'brk',group:_t('hud.build.grpFleet'),icon:ICON.coffee,label:_t('hud.build.brkLabel'),desc:_t('hud.build.brkDesc'),cost:130,pos:[5,1.4,-17.6],size:[6,2.8,3.2]});
  DECOR.forEach((d,i)=>{if(!L.decor.includes(i)&&!pending.has('decor:'+i))out.push({key:'decor:'+i,group:_t('hud.build.grpDecor'),icon:ICON.leaf,label:d.name,desc:_t('hud.build.decorDesc'),cost:25,pos:[d.x,0.9,d.z],size:[0.9,1.8,0.9]});});
  return out;
}
function showGhosts(){
  ghosts.forEach(g=>world.remove(g)); ghosts.length=0;
  if(!game.building)return;
  buildOptions().forEach(o=>{
    const g=new THREE.Group(); g.position.set(o.pos[0],o.pos[1],o.pos[2]);
    const m=new THREE.Mesh(bgeo(o.size[0],o.size[1],o.size[2]),new THREE.MeshBasicMaterial({color:'#2f5be0',transparent:true,opacity:.18,depthWrite:false}));
    g.add(m);
    const e=new THREE.LineSegments(new THREE.EdgesGeometry(bgeo(o.size[0],o.size[1],o.size[2])),new THREE.LineBasicMaterial({color:'#2f5be0',transparent:true,opacity:.8}));
    g.add(e);
    const sp=sprite(plusTex,.8); sp.position.set(0,o.size[1]/2+.6,0); g.add(sp);
    g.userData.build=o.key; g.userData.mat=m.material; world.add(g); ghosts.push(g);
  });
}
function enterBuild(){
  exitTown();
  if(game.phase==='shift'){toast('info',_t('hud.build.finishShift'),_t('hud.build.finishShiftBody'),ICON.hammer);return;}
  if(game.phase==='report'){freePlay();}
  closeModal(); game.building=true; buildSel=null; prevSpeedB=sim.speed; setSpeed(0);
  putLive({building:true,town:false});
  select(null); view.zoomT=Math.min(view.zoomT,innerWidth<=760?1:.9); showGhosts(); dirty=true;
}
let prevSpeedB=1;
function exitBuild(silent){
  if(!game.building)return;
  game.building=false; buildSel=null; ghosts.forEach(g=>world.remove(g)); ghosts.length=0;
  putLive({building:false});
  if(!silent)setSpeed(prevSpeedB||1); dirty=true;
}
function buyBuild(key){
  const o=buildOptions().find(x=>x.key===key); if(!o)return;
  if(save.credits<o.cost){toast('info',_t('hud.build.noCredits'),_t('hud.build.needMore',{n:o.cost-save.credits}),ICON.lock);return;}
  save.credits-=o.cost;
  queueConstr({kind:'wh',site:site.k,key:o.key,pos:o.pos,size:o.size,cost:o.cost,label:o.label});
  syncWhScaffolds();
  Snd.play('build'); toast('info',_t('hud.build.building',{label:o.label}),_t('hud.build.readyIn',{m:Math.ceil(constrDur(o.cost)),c:o.cost}),ICON.hammer);
  buildSel=null; dirty=true;
}

/* ---------------- town planner ---------------- */
const townOv=new THREE.Group(); townOv.visible=false; scene.add(townOv);
let townTint=null, townHoverT=null, townUndo=null, townSaveT=0;
const TOOLS=[['buy','Buy land'],['road','Road'],['house','House'],['shop','Shop'],['office','Office'],['depot','Depot'],['park','Park'],['trees','Trees'],['bulldoze','Bulldoze']];
const TICON={buy:ICON.map,road:ICON.road,house:ICON.home,shop:ICON.shop,office:ICON.office,depot:ICON.dock,park:ICON.leaf,trees:ICON.leaf,bulldoze:ICON.hammer};
function buildTownOverlay(){
  if(townOv.userData.done)return; townOv.userData.done=true;
  const pos=[];
  for(let i=GI0;i<=GI1+1;i++){const x=tcx(i)-4;pos.push(x,.26,tcz(GJ0)-4,x,.26,tcz(GJ1)+4);}
  for(let j=GJ0;j<=GJ1+1;j++){const z=tcz(j)-4;pos.push(tcx(GI0)-4,.26,z,tcx(GI1)+4,.26,z);}
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  townOv.add(new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:'#ffffff',transparent:true,opacity:.6})));
  const hv=new THREE.Group();
  const pl=new THREE.Mesh(new THREE.PlaneGeometry(7.8,7.8),new THREE.MeshBasicMaterial({color:'#2f5be0',transparent:true,opacity:.28,depthWrite:false})); pl.rotation.x=-Math.PI/2; pl.position.y=.3; hv.add(pl);
  const ed=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(7.9,.6,7.9)),new THREE.LineBasicMaterial({color:'#2f5be0'})); ed.position.y=.3; hv.add(ed);
  hv.visible=false; townOv.add(hv); townOv.userData.hover=hv; townOv.userData.hmat=pl.material; townOv.userData.emat=ed.material;
}
function refreshTint(){
  if(townTint){townOv.remove(townTint);townTint=null;}
  const list=[...town.tiles.values()].filter(t=>t.owner==='player'&&!['hq','private','bigdepot'].includes(t.type));
  if(!list.length)return;
  const m=new THREE.InstancedMesh(new THREE.PlaneGeometry(7.6,7.6),new THREE.MeshBasicMaterial({color:'#22b36a',transparent:true,opacity:.22,depthWrite:false}),list.length);
  const d=new THREE.Object3D(); list.forEach((t,i)=>{d.position.set(tcx(t.i),.27,tcz(t.j));d.rotation.set(-Math.PI/2,0,0);d.scale.set(1,1,1);d.updateMatrix();m.setMatrixAt(i,d.matrix);});
  townTint=m; townOv.add(m);
}
function groundAt(x,y){setRay(x,y);const r=ray.ray;if(!r||!r.direction||Math.abs(r.direction.y)<1e-6)return null;const k=-r.origin.y/r.direction.y;return {x:r.origin.x+r.direction.x*k,z:r.origin.z+r.direction.z*k};}
function tileAtScreen(x,y){const p=groundAt(x,y);return p?tileAt(p.x,p.z):null;}
function enterTown(){
  if(game.building)exitBuild(true); closeModal();
  game.town=true; buildTownOverlay(); refreshTint(); townOv.visible=true;
  putLive({town:true,building:false});
  select(null); town.prev={t:view.targetT.clone(),z:view.zoomT}; view.targetT.set(-4+OX,0,2); view.zoomT=innerWidth<=760?.5:.46; townHoverT=null; hideHint(); dirty=true;
}
function exitTown(){
  if(!game.town)return; game.town=false; townOv.visible=false; townHoverT=null;
  putLive({town:false}); if(els.tag)els.tag.hidden=!selected;
  if(town.prev){view.targetT.copy(town.prev.t);view.zoomT=town.prev.z;} dirty=true;
}
function tileInfo(t){
  if(!t)return {title:_t('hud.town.outside'),sub:'',kind:'none'};
  const at=_t('hud.town.plot',{i:t.i,j:t.j});
  if(t.type==='road')return {title:t.owner==='player'?_t('hud.town.yourRoad'):_t('hud.town.cityRoad'),sub:at+(town.lights.has(t.key)?' · '+_t('hud.town.lights'):''),kind:t.owner==='player'?'own':'city'};
  if(t.type==='private')return {title:_t('hud.town.truckRoad'),sub:_t('hud.town.truckRoadSub'),kind:'city'};
  if(t.type==='hq')return {title:_t('hud.town.yourWh'),sub:_t('hud.town.grounds',{name:site.name}),kind:'city'};
  if(t.type==='cshop')return {title:t.shop.name,sub:_t('hud.town.cityShop')+(t.addr?' · '+t.addr:''),kind:'city'};
  if(t.type==='chouse')return {title:t.addr||_t('hud.town.cityHouse'),sub:_t('hud.town.houseSub'),kind:'city'};
  if(t.type==='cbig'||t.type==='cpark')return {title:_t('hud.town.cityProp'),sub:_t('hud.town.notForSale'),kind:'city'};
  if(t.type==='lease')return {title:_t('hud.town.leaseTitle'),sub:_t('hud.town.leaseSub',{c:LEASE.cost,inc:LEASE.inc}),kind:'sale'};
  if(t.type==='bigdepot')return {title:'WareTrack Depot 2',sub:_t('hud.town.yours')+' · '+(connected(t)?_t('hud.town.earningH',{inc:LEASE.inc}):_t('hud.town.noLinkShort')),kind:'own'};
  if(t.type==='grass')return t.owner==='player'?{title:_t('hud.town.emptyPlot'),sub:at+' · '+_t('hud.town.readyBuild'),kind:'own'}:{title:_t('hud.town.forSale',{c:landPrice(t)}),sub:at+(t.wild?' · '+_t('hud.town.hasTrees'):''),kind:'sale'};
  const B=BTYPES[t.type]; if(!B)return {title:_t('hud.town.cityProp'),sub:_t('hud.town.notForSale'),kind:'city'};
  const inc=bIncome(t);
  return {title:(t.name||B.name),sub:(B.inc?(connected(t)?_t('hud.town.earningInc',{inc:inc.toFixed(2)}):_t('hud.town.noLink')):B.desc),kind:'own'};
}
function applyTool(t){
  if(!t)return;
  const tool=game.townTool, T=save.town, prev={type:t.type,owner:t.owner,face:t.face,name:t.name,color:t.color,wild:t.wild};
  const fail=m=>{toast('info',m,'',ICON.lock);Snd.play('bad');};
  let cost=0, roadCh=false;
  if(tool==='buy'){
    if(t.type==='lease'){
      if(save.credits<LEASE.cost)return fail(_t('hud.town.unit7Costs',{c:LEASE.cost}));
      save.credits-=LEASE.cost; T.unit7=true; town.tiles.forEach(x=>{if(x.type==='lease'){x.type='bigdepot';x.owner='player';}});
      buildUnit7(); writeSave(); recomputeEcon(); refreshTint(); Snd.play('build'); confetti(80);
      toast('info',_t('hud.town.boughtUnit7'),_t('hud.town.depotEarns',{inc:LEASE.inc}),ICON.box); unlock('tycoon'); townUndo=null; dirty=true; return;
    }
    if(t.owner)return fail(t.owner==='player'?_t('hud.town.alreadyOwn'):_t('hud.town.plotNotForSale'));
    if(t.type!=='grass')return fail(_t('hud.town.plotNotForSale'));
    cost=landPrice(t); if(save.credits<cost)return fail(_t('hud.town.needCredits',{n:cost-save.credits}));
    t.owner='player'; T.owned.push(t.key); unlock('landlord');
  }else if(tool==='bulldoze'){
    if(t.type==='constr')return fail(_t('hud.town.underConstr'));
    if(t.owner!=='player'||!BTYPES[t.type])return fail(_t('hud.town.nothingToClear'));
    cost=-Math.round(BTYPES[t.type].cost*0.4); roadCh=t.type==='road'; t.type='grass'; delete T.b[t.key];
  }else{
    const B=BTYPES[tool];
    if(t.owner!=='player')return fail(t.owner?_t('hud.town.plotNotForSale'):_t('hud.town.buyFirst'));
    if(['hq','private','bigdepot'].includes(t.type))return fail(_t('hud.town.partOfWh'));
    if(t.type!=='grass')return fail(_t('hud.town.clearFirst'));
    let face=null; for(const d of [2,0,1,3]) if(isRoadT(nbT(t,d))){face=d;break;}
    if(!['road','trees','park'].includes(tool)&&face==null)return fail(_t('hud.town.needsRoad'));
    cost=B.cost; if(save.credits<cost)return fail(_t('hud.town.needCredits',{n:cost-save.credits}));
    t.face=face==null?2:face; t.wild=false; roadCh=tool==='road';
    if(tool==='road'){
      t.type=tool; T.b[t.key]={type:t.type,face:t.face,name:t.name,color:t.color};
    }else{
      let name=t.name,color=t.color;
      if(tool==='shop'){const p=PSHOPS[T.names%PSHOPS.length];name=p[0]+(T.names>=PSHOPS.length?' '+(Math.floor(T.names/PSHOPS.length)+1):'');color=p[1];T.names++;}
      t.type='constr'; t.name=name; t.color=color;
      queueConstr({kind:'town',key:t.key,pos:[tcx(t.i),0,tcz(t.j)],cost,label:name||B.name,meta:{type:tool,face:t.face,name,color}});
    }
  }
  save.credits-=cost; townUndo={key:t.key,prev,cost,roadCh,owned:tool==='buy'};
  writeSave(); townChanged([t.key],roadCh);
  Snd.play(cost>0?'build':'click'); popup((cost>0?'−':'+')+Math.abs(cost)+' cr',tcx(t.i),3,tcz(t.j),cost>0?'bad':'gold');
  if(Object.keys(T.b).filter(k=>T.b[k].type!=='road').length>=10)unlock('mayor');
  dirty=true;
}
function undoTown(){
  const u=townUndo; if(!u){toast('info',_t('hud.town.nothingUndo'),'',ICON.up);return;}
  const t=town.tiles.get(u.key), T=save.town;
  const ci=save.constr.findIndex(c=>c.kind==='town'&&c.key===u.key); if(ci>=0)save.constr.splice(ci,1);
  Object.assign(t,u.prev); if(u.owned)T.owned=T.owned.filter(k=>k!==u.key);
  if(BTYPES[t.type]&&t.owner==='player')T.b[t.key]={type:t.type,face:t.face,name:t.name,color:t.color}; else delete T.b[t.key];
  save.credits+=u.cost; writeSave(); townChanged([t.key],u.roadCh||t.type==='road'); townUndo=null;
  toast('info',_t('hud.town.undone'),u.cost>0?_t('hud.town.creditsBack',{n:u.cost}):'',ICON.up); dirty=true;
}
function townAccrue(dt){
  const net=town.econ.net; if(!net)return;
  save.town.bank=(save.town.bank||0)+net*dt/60;
  if(save.town.bank>=1){const n=Math.floor(save.town.bank);save.town.bank-=n;save.credits+=n;if(game.phase==='shift')game.st.town=(game.st.town||0)+n;dirty=true;}
  else if(save.town.bank<=-1){const n=Math.ceil(-save.town.bank);save.town.bank+=n;save.credits=Math.max(0,save.credits-n);}
  townSaveT+=dt; if(townSaveT>15){townSaveT=0;writeSave();}
}
function resetTown(){
  while(env.children.length)env.remove(env.children[0]); env.add(townStatic);
  cars.length=0; vans.length=0; town.objs.clear(); town.lights.clear(); town.lightObjs=[]; town.trees=town.lamps=null; town.unit7=null; town.built=false; cityBadges.clear();
  initTown(); if(townTint){townOv.remove(townTint);townTint=null;}
}
function updateTownHover(){
  const hv=townOv.userData.hover; if(!hv)return;
  const t=townHoverT; hv.visible=!!(game.town&&t);
  if(!hv.visible){if(game.town&&els.tag)els.tag.hidden=true;return;}
  hv.position.set(tcx(t.i),0,tcz(t.j));
  const I=tileInfo(t), col=I.kind==='own'?'#22b36a':I.kind==='sale'?'#2f5be0':'#8a98ad';
  townOv.userData.hmat.color.set(col); townOv.userData.emat.color.set(col);
  if(!els.tag)return;
  tmpV.set(tcx(t.i),2.5,tcz(t.j)).project(cam); const tg=els.tag; tg.hidden=false;
  tg.style.transform='translate('+((tmpV.x+1)/2*innerWidth)+'px,'+((1-tmpV.y)/2*innerHeight-8)+'px) translate(-50%,-100%)';
  tg.innerHTML=esc(I.title)+(I.kind==='sale'||I.kind==='own'?'<small>'+esc(game.townTool==='buy'?_t('hud.town.buy'):_t('hud.tool.'+TOOLS.find(x=>x[0]===game.townTool)[0]))+'</small>':'');
}
/* ---------------- inspector, selection visuals, pins, route ---------------- */
const DRIVERS=['Ada Larsen','Noah Tanaka','Sam Chen','Alex Haddad','Zoe Reyes','Inez Moreau','Ravi Patel','Mia Okafor','Leo Novak','Sara Kim','Omar Farouk','Lena Vogel'];
const FL_MODELS=['Toyota 8FBE18','Jungheinrich EFG 216','Linde E20','Hyster J2.0XN'];
const SHIPPERS=['Sunvale Grocers','Harbor & Co.','Halcyon Retail','Oakridge Market','Bayline Supply'];
const UNIT_KG={LED:2.4,CHR:14,BOX:0.3,GLV:0.1,BRK:0.6};
const SKU_CAT={LED:'Lighting',CHR:'Furniture',BOX:'Packaging',GLV:'PPE',BRK:'Hardware'};
const hpick=(arr,s)=>arr[hashStr(s)%arr.length];
function plateOf(s){const h=hashStr('p'+s),A='ABCDEFGHJKLMNPRSTUVWXYZ';return A[h%23]+A[(h>>>5)%23]+A[(h>>>10)%23]+'-'+(1000+h%9000);}
const irow=(l,v)=>'<div class="irow"><span>'+l+'</span><b>'+v+'</b></div>';
function moved(o){const m=o._lx!=null&&Math.hypot(o.x-o._lx,o.z-o._lz)>0.02;o._lx=o.x;o._lz=o.z;return m;}
function prism(w,d,r){const a=w/2,b=d/2;const P=[-a,0,b, a,0,b, a,r,0, -a,0,b, a,r,0, -a,r,0,  a,0,-b, -a,0,-b, -a,r,0, a,0,-b, -a,r,0, a,r,0,  a,0,b, a,0,-b, a,r,0,  -a,0,-b, -a,0,b, -a,r,0];
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.computeVertexNormals(); return g;}
function makePin(lift){
  lift=lift||0; const g=new THREE.Group();
  const head=new THREE.Mesh(GEOS.pinHead||(GEOS.pinHead=new THREE.SphereGeometry(.34,18,14)),mat('#2f5be0')); head.position.y=1.0+lift;
  const tip=new THREE.Mesh(GEOS.pinTip||(GEOS.pinTip=new THREE.ConeGeometry(.3,.64,18)),mat('#2f5be0')); tip.rotation.x=Math.PI; tip.position.y=.64+lift;
  const dot=new THREE.Mesh(GEOS.pinDot||(GEOS.pinDot=new THREE.SphereGeometry(.13,10,8)),mat('#ffffff')); dot.position.set(0,1.03+lift,.25);
  [head,tip,dot].forEach(m=>{m.userData.y0=m.position.y;m.castShadow=true;g.add(m);});
  const sh=new THREE.Mesh(GEOS.pinSh||(GEOS.pinSh=new THREE.CircleGeometry(.36,18)),new THREE.MeshBasicMaterial({color:'#2f5be0',transparent:true,opacity:.22,depthWrite:false})); sh.rotation.x=-Math.PI/2; sh.position.y=.09; g.add(sh);
  g.userData.head=[head,tip,dot]; return g;
}
/* selection brackets + route ribbon */
const brk=new THREE.Group(); brk.visible=false; scene.add(brk);
const BRK_DIM={dest:[7.2,4.6,7.2,0],van:[3.4,2.1,1.6,-0.3],tk:[11,4.2,2.9,0],fl:[2.8,2.7,1.5,0.2],lfl:[2.8,2.7,1.5,0.2],lbay:[1.2,4.8,4.2,0],site:[21.6,7.6,27.6,0],bay:[1.2,4.8,4.2,0],chg:[1.5,1.4,1.6,0],pal:[1.4,1.5,1.4,0]};
function bracketGeo(w,h,d){const pts=[],e=Math.min(w,h,d)*0.28+0.18;
  for(const x of [-w/2,w/2])for(const y of [0,h])for(const z of [-d/2,d/2]){const sx=x<0?1:-1,sy=y===0?1:-1,sz=z<0?1:-1;pts.push(x,y,z,x+sx*e,y,z,x,y,z,x,y+sy*e,z,x,y,z,x,y,z+sz*e);}
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3)); return g;}
function setBrackets(s){
  while(brk.children.length)brk.remove(brk.children[0]);
  if(!s){brk.visible=false;return;}
  const D=BRK_DIM[s.kind]||[2,2,2,0];
  const ls=new THREE.LineSegments(bracketGeo(D[0],D[1],D[2]),new THREE.LineBasicMaterial({color:'#2f5be0'})); ls.position.x=D[3]; brk.add(ls);
  const fill=new THREE.Mesh(bgeo(D[0],D[1],D[2]),new THREE.MeshBasicMaterial({color:'#2f5be0',transparent:true,opacity:.07,depthWrite:false})); fill.position.set(D[3],D[1]/2,0); brk.add(fill);
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(D[0]+1.4,D[2]+1.4),new THREE.MeshBasicMaterial({color:'#2f5be0',transparent:true,opacity:.14,depthWrite:false})); glow.rotation.x=-Math.PI/2; glow.position.set(D[3],0.09,0); brk.add(glow);
  brk.visible=true;
}
const route=new THREE.Group(); scene.add(route); let routeT=0;
const routeMat=new THREE.MeshBasicMaterial({color:'#2f5be0',transparent:true,opacity:.85,depthWrite:false});
const dashMat=new THREE.MeshBasicMaterial({color:'#2f5be0',transparent:true,opacity:.45,depthWrite:false});
function rebuildRoute(){
  while(route.children.length)route.remove(route.children[0]);
  const s=selected; if(!s||!(s.kind==='tk'||s.kind==='fl'||s.kind==='lfl'||s.kind==='van'))return;
  const o0=s.loc?OX:0, pts=[[s.x+o0,s.z]]; for(const st of s.steps){if(st.t==='move')pts.push([st.x+o0,st.z]); if(pts.length>9)break;}
  if(pts.length<2)return;
  let solid=0;
  for(let i=0;i<pts.length-1;i++){
    const a=pts[i],b=pts[i+1],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz); if(len<0.05)continue;
    if(solid<10){const m=new THREE.Mesh(bgeo(1,0.02,0.42),routeMat); m.scale.x=len; m.position.set((a[0]+b[0])/2,0.2,(a[1]+b[1])/2); m.rotation.y=Math.atan2(-dz,dx); route.add(m); solid+=len;}
    else for(let u=0.2;u<len;u+=1.1){const m=new THREE.Mesh(bgeo(0.42,0.02,0.42),dashMat); m.position.set(a[0]+dx/len*u,0.2,a[1]+dz/len*u); route.add(m);}
  }
  const e=pts[pts.length-1]; const pin=makePin(0); pin.position.set(e[0],0,e[1]); route.add(pin);
}
function selPos(s){
  if(!s)return null;
  if(s.kind==='tk')return {x:wx(s),y:0,z:s.z,yaw:s.yaw,h:4.6};
  if(s.kind==='van')return {x:s.x,y:0,z:s.z,yaw:s.yaw,h:2.6};
  if(s.kind==='dest')return {x:tcx(s.t.i),y:0,z:tcz(s.t.j),yaw:faceRot(s.t.face)+Math.PI/2,h:5.6};
  if(s.kind==='fl'||s.kind==='lfl')return {x:wx(s),y:0,z:s.z,yaw:s.yaw,h:2.9};
  if(s.kind==='bay')return {x:0.4+OX,y:0,z:s.bay.z,yaw:0,h:5.3};
  if(s.kind==='lbay')return {x:0.4+s.bay.lite.ox,y:0,z:s.bay.z,yaw:0,h:5.3};
  if(s.kind==='site'){const L=lites.get(s.idx);return {x:-10+(L?L.ox:0),y:0,z:0,yaw:0,h:8.5};}
  if(s.kind==='chg')return {x:s.x+OX,y:0,z:s.z,yaw:0,h:1.9};
  if(s.kind==='pal'){const v=s.g.getWorldPosition(new THREE.Vector3());return {x:v.x,y:v.y,z:v.z,yaw:0,h:1.7};}
  return null;
}
function chgUser(c){return forklifts.find(f=>f.home===HOMES[c.i]);}
function chgActive(c){const f=chgUser(c);return !!(f&&!f.steps.length&&f.task&&f.task.type==='Charging');}
// display-only mapping of forklift task.type / lite forklift task strings (logic values stay English)
const FL_TYPE_K={'Put-away':'putAway',Pick:'pick',Charging:'charging',Idle:'idle'};
function flType(ty){const k=FL_TYPE_K[ty];return k?_t('hud.fl.type.'+k):ty;}
function liteTask(task){if(task==='Idle')return _t('hud.fl.type.idle');const m=/^(Unloading|Loading) (.+)$/.exec(task||'');return m?_t('hud.fl.lite.'+m[1].toLowerCase(),{id:m[2]}):task;}
function liteTaskWord(w){return w==='Unloading'||w==='Loading'?_t('hud.fl.liteWord.'+w.toLowerCase()):w;}
function palWhere(g){
  const s=slots.find(x=>x.pallet===g); if(s)return {st:_t('hud.pal.stored'),cls:'ok',loc:site.code+' · '+_t('hud.pal.rack',{id:s.id})};
  const st=staging.find(x=>x.pallet===g); if(st)return {st:_t('hud.pal.staged'),cls:'info',loc:site.code+' · '+_t('hud.pal.outStaging')+(st.order?' · '+st.order.id:'')};
  const f=forklifts.find(x=>x.carry===g); if(f)return {st:_t('hud.pal.moving'),cls:'warn',loc:_t('hud.pal.onForks',{id:f.id})};
  return {st:_t('hud.pal.bulk'),cls:'',loc:site.code+' · '+_t('hud.pal.bulkFloor')};
}
function selLabel(s){
  if(s.kind==='tk')return esc(s.id)+'<small>'+esc(truckStatus(s)[0])+'</small>';
  if(s.kind==='fl')return esc(s.id)+'<small>'+esc(s.broken?_t('hud.fl.broken'):s.task?flType(s.task.type):_t('hud.fl.type.idle'))+'</small>';
  if(s.kind==='bay'||s.kind==='lbay')return _t('hud.bay',{n:s.bay.i+1})+'<small>'+(s.bay.truck?esc(truckStatus(s.bay.truck)[0]):_t('hud.free'))+'</small>';
  if(s.kind==='lfl')return esc(s.id)+'<small>'+esc(liteTask(s.task))+'</small>';
  if(s.kind==='van')return esc(s.id)+'<small>'+esc(s.state)+'</small>';
  if(s.kind==='dest'){const t=s.t;return esc(t.type==='cshop'?t.shop.name:t.type==='chouse'?t.addr:t.name)+'<small>'+(t.type==='chouse'?_t('hud.home'):_t('hud.shop'))+'</small>';}
  if(s.kind==='site')return esc(SITES[s.idx].code)+'<small>'+esc(SITES[s.idx].name)+'</small>';
  if(s.kind==='chg')return 'C'+(s.i+1)+'<small>'+(chgActive(s)?_t('hud.fl.type.charging'):_t('hud.free'))+'</small>';
  if(s.kind==='pal')return esc(s.g.userData.meta.id)+'<small>'+esc(SKUS[s.g.userData.sku].name)+'</small>';
  return '';
}
function insHead(eyebrow,title,sub,icon,follow){
  return '<div class="ih"><span class="iic">'+icon+'</span><div class="it"><div class="eyebrow">'+esc(eyebrow)+'</div><h2>'+esc(title)+'</h2><p>'+esc(sub)+'</p></div><div class="ibtns">'+
    (follow?'<button class="ib'+(game.follow&&game.follow===selected?' on':'')+'" data-ins="follow" title="'+esc(_t('hud.insp.follow'))+'" aria-label="'+esc(_t('hud.insp.follow'))+'">'+ICON.target+'</button>':'')+
    '<button class="ib" data-ins="focus" title="'+esc(_t('hud.insp.center'))+'" aria-label="'+esc(_t('hud.insp.center'))+'">'+ICON.expand+'</button><button class="ib" data-ins="close" title="'+esc(_t('hud.insp.close'))+'" aria-label="'+esc(_t('hud.insp.close'))+'">'+ICON.x+'</button></div></div>';
}
const istat=(label,cls,sub)=>'<div class="istat"><span class="pill '+cls+'">'+esc(label)+'</span><span>'+esc(sub||'')+'</span></div>';
const ibar=(pct,cls,right)=>'<div class="ibar"><div class="meter '+(cls||'')+'"><i style="width:'+Math.max(0,Math.min(100,pct))+'%"></i></div>'+(right?'<span>'+right+'</span>':'')+'</div>';
function viewIdx(){const k=clamp(Math.round((view.target.x-2)/SLICE_W),-2,2);const i=SITES.findIndex(s=>s.k===k);return i<0?game.siteIdx:i;}
function liteCard(Lt,sel){
  if(!Lt)return '';
  const s=Lt.s, st=liteStats(Lt), un=unlocked(Lt.idx), shift=game.phase==='shift';
  let h=sel?insHead(_t('hud.insp.dc')+' · '+s.code,s.name,s.addr,ICON.dock,false):'<div class="ih"><span class="iic">'+ICON.dock+'</span><div class="it"><div class="eyebrow">'+_t('hud.insp.dc')+' · '+s.code+'</div><h2>'+esc(s.name)+'</h2><p>'+esc(s.addr)+'</p></div></div>';
  h+='<div class="chips"><span class="pill ok">'+_t('hud.operational')+'</span><span class="pill">'+_t('hud.nDocked',{n:st.docked})+'</span><span class="pill">'+_t('hud.nAtGate',{n:st.queued})+'</span><span class="pill">'+_t('hud.nOutbound',{n:st.out})+'</span></div>';
  h+='<div class="igrid"><div class="mini"><label>'+_t('hud.insp.storageUsed')+'</label><b>'+Math.round(st.fill*100)+' <span>%</span></b>'+ibar(st.fill*100,st.fill>.85?'bad':st.fill>.7?'warn':'')+'</div><div class="mini"><label>'+_t('hud.insp.truckBays')+'</label><b>'+st.docked+' <span>'+_t('hud.insp.ofBusy',{n:Lt.bays.length})+'</span></b>'+ibar(st.docked/Lt.bays.length*100,'ok')+'</div>'+
    '<div class="mini"><label>'+_t('hud.insp.trucksTurned')+'</label><b>'+st.done+'</b></div><div class="mini"><label>'+_t('hud.insp.onTimeDep')+'</label><b>'+st.onTime+' <span>%</span></b></div></div>';
  h+='<div class="isub"><span>'+_t('hud.insp.yard')+'</span><span>'+_t('hud.insp.flsWorking',{a:st.working,b:Lt.fls.length})+'</span></div>';
  Lt.trucks.filter(t=>t.state!=='departing').slice(0,4).forEach(t=>{const [a,c]=liteTruckStatus(t);h+='<div class="invrow" data-lpick="'+t.id+'"><span class="mono" style="font-weight:700">'+t.id+'</span><span>'+esc(t.car.name)+' · '+(t.dir==='out'?_t('hud.insp.toDest',{d:esc(t.dest)}):_t('hud.insp.inbound'))+'</span><span class="pill '+c+'">'+esc(a)+'</span><span></span></div>';});
  const tin=xfers.filter(t=>t.to===Lt.idx).length, tout=xfers.filter(t=>t.from===Lt.idx).length;
  if(tin||tout)h+='<div class="isub"><span>'+_t('hud.insp.network')+'</span><span>'+_tn('hud.insp.transfersOut',tout)+' · '+_t('hud.insp.comingIn',{n:tin})+'</span></div>';
  h+='<p class="inote">'+esc(s.blurb)+'</p>';
  h+='<button class="act solid wide" data-ins="run" data-idx="'+Lt.idx+'"'+(shift||!un?' disabled':'')+'>'+(!un?_t('hud.insp.lockedEarn',{name:esc(SITES[Lt.idx-1].name)}):shift?_t('hud.insp.finishToRun'):_t('hud.insp.runSite'))+'</button>';
  return h;
}
// same markup as the original renderInspector; InspectorCard.vue renders it with v-html
function snpInspector(){
  if(game.building||game.town){document.body.classList.remove('inspecting');put('insp',{show:false,sel:false,html:''});return;}
  const s=selected;
  document.body.classList.toggle('inspecting',!!s);
  let h='';
  if(!s){
    const vi=viewIdx(); if(vi!==game.siteIdx&&lites.has(vi)){put('insp',{show:true,sel:false,html:liteCard(lites.get(vi),false)});return;}
    const st=stockBySku(), occ=occupied(), docked=bays.filter(b=>b.truck&&b.truck.state==='unloading').length;
    const arriving=trucks.filter(t=>t.state==='docking'||t.state==='queued').length, staged=staging.filter(x=>x.pallet).length, busy=bays.filter(b=>b.truck).length;
    const incident=spills.length||forklifts.some(f=>f.broken);
    h+='<div class="ih"><span class="iic">'+ICON.dock+'</span><div class="it"><div class="eyebrow">'+_t('hud.insp.dc')+' · '+site.code+'</div><h2>'+esc(site.name)+'</h2><p>'+esc(site.addr)+'</p></div></div>';
    h+='<div class="chips">'+(incident?'<span class="pill warn">'+_t('hud.incident')+'</span>':'<span class="pill ok">'+_t('hud.operational')+'</span>')+'<span class="pill">'+_t('hud.nDocked',{n:docked})+'</span><span class="pill">'+_t('hud.nArriving',{n:arriving})+'</span><span class="pill">'+_t('hud.nStaged',{n:staged})+'</span></div>';
    h+='<div class="igrid"><div class="mini"><label>'+_t('hud.insp.stockOnHand')+'</label><b>'+occ+' <span>/ '+slots.length+'</span></b>'+ibar(occ/slots.length*100,'')+'</div><div class="mini"><label>'+_t('hud.insp.truckBays')+'</label><b>'+busy+' <span>'+_t('hud.insp.ofBusy',{n:bays.length})+'</span></b>'+ibar(busy/bays.length*100,'ok')+'</div>'+
      '<div class="mini"><label>'+_t('hud.insp.outToday')+'</label><b>'+sim.shipped+' <span>'+_t('hud.insp.ordersUnit')+'</span></b></div><div class="mini"><label>'+_t('hud.insp.putToday')+'</label><b>'+sim.putaways+' <span>'+_t('hud.insp.palletsUnit')+'</span></b></div></div>';
    h+='<div class="isub"><span>'+_t('hud.insp.inventory')+'</span><span>'+_t('hud.insp.units')+'</span></div>';
    SKU_KEYS.slice().sort((a,b)=>st[b].units-st[a].units).slice(0,4).forEach(k=>{const v=st[k],lv=v.pallets===0?[_t('hud.stock.out'),'bad']:v.pallets<3?[_t('hud.stock.lowStock'),'warn']:[_t('hud.stock.inStockCap'),'ok'];
      h+='<div class="invrow" data-goto="inv"><span class="sw" style="background:'+SKUS[k].color+';width:18px;height:18px"></span><span>'+esc(SKUS[k].name)+'</span><b class="mono">'+fmtN(v.units)+'</b><span class="pill '+lv[1]+'">'+lv[0]+'</span></div>';});
    const working=forklifts.filter(f=>f.steps.length&&!f.charging&&!f.broken), f0=working[0]||forklifts[0];
    h+='<div class="isub"><span>'+_t('hud.insp.flFleet')+'</span><span>'+_t('hud.nWorking',{a:working.length,b:forklifts.length})+'</span></div>';
    if(f0) h+='<div class="invrow" data-goto="fl"><span class="mono" style="font-weight:700">'+f0.id+'</span><span>'+esc(f0.task?f0.task.text:_t('hud.fl.type.idle'))+'</span>'+ibar(f0.battery,f0.battery<25?'bad':'ok','')+'<span class="mono">'+Math.round(f0.battery)+'%</span></div>';
  }else if(s.kind==='site'){ h=liteCard(lites.get(s.idx),true);
  }else if(s.kind==='dest'){
    const t=s.t, home=t.type==='chouse', name=t.type==='cshop'?t.shop.name:home?t.addr:t.name, addr=home?_t('hud.home')+' · '+t.addr:(t.addr||_t('hud.insp.yourShop')), here=sliceOfI(t.i)===site.k;
    const ds=destStats(t.key), open=openOrdersFor(t.key), lastJob=del.recent.find(r=>r.job&&r.job.shop.key===t.key);
    h+=insHead((home?_t('hud.eb.home'):_t('hud.eb.shop'))+' · '+_t('hud.eb.customer'),name,addr,destIcon(home),false);
    h+=istat(open.length?_tn('hud.insp.ordersOnWay',open.length):_t('hud.insp.noOpen'),open.length?'info':'',here?(ds.last?_t('hud.insp.lastDelivery',{t:fmtT(ds.last)}):_t('hud.insp.noDeliveries')):_t('hud.insp.servedBy',{name:(SITES.find(x=>x.k===sliceOfI(t.i))||site).name}));
    h+='<div class="irows">'+irow(_t('hud.insp.delivered'),_tn('hud.insp.nOrders',ds.recv))+irow(_t('hud.insp.onTime'),ds.recv?Math.round(ds.onTime/ds.recv*100)+'%':'—')+irow(_t('hud.insp.paidYou'),ds.cr+' cr')+irow(_t('hud.insp.custType'),home?_t('hud.insp.household'):_t('hud.insp.retailShop'))+'</div>';
    if(open.length){h+='<div class="isub"><span>'+_t('hud.insp.openOrders')+'</span><span>'+_t('hud.insp.tapTrack')+'</span></div>';open.slice(0,5).forEach(x=>{h+='<div class="invrow" data-trko="'+x.id+'"><span class="mono" style="font-weight:700">'+x.id+'</span><span>'+esc(x.s)+'</span><span></span><span></span></div>';});}
    else if(lastJob)h+='<button class="act wide" data-trko="'+lastJob.id+'">'+_t('hud.insp.trackLast',{id:lastJob.id})+'</button>';
  }else if(s.kind==='tk'&&s.xfer){
    const A=SITES[s.from],B=SITES[s.to],left=xferLeft(s),prog=Math.max(2,100-left/Math.max(1,s.total)*100),mv=moved(s);
    h+=insHead('WARETRACK · '+_t('hud.eb.transfer'),s.id,hpick(DRIVERS,s.id)+' · '+plateOf(s.id),ICON.truck,true);
    h+=istat(_t('hud.tk.inTransit'),'info',A.code+' '+A.name+' → '+B.code+' '+B.name)+ibar(prog,'',Math.round(prog)+'%');
    h+='<div class="irows">'+irow(_t('hud.insp.from'),A.code+' · '+esc(A.name))+irow(_t('hud.insp.to'),B.code+' · '+esc(B.name))+irow(_t('hud.insp.cargo'),_t('hud.insp.nPallets',{n:s.n})+(s.sku?' · '+_t('hud.insp.mostly',{name:esc(SKUS[s.sku].name)}):' · '+_t('hud.insp.mixed')))+irow(_t('hud.insp.leftAt'),fmtT(s.times.start))+irow(_t('hud.insp.eta'),fmtT(xferEta(s)))+irow(_t('hud.insp.speed'),(mv?22:0)+' km/h')+'</div>';
  }else if(s.kind==='van'){
    const j=s.jobs[0],m=j?Math.round(j.due-clockMin()):null;
    h+=insHead(_t('hud.eb.van')+' · '+site.code,s.id,s.driver+' · WareTrack Express',ICON.truck,true);
    h+=istat(j?(m<0?_t('hud.van.late'):_t('hud.van.out')):_t('hud.van.returning'),j?(m<0?'bad':'info'):'',s.state)+ibar(j?Math.max(4,100-Math.max(0,m)/Math.max(1,j.due-j.created)*100):100,j&&m<0?'bad':'',j?(m>=0?_t('hud.minLeft',{m}):_t('hud.van.lateShort')):'');
    h+='<div class="irows">'+irow(_t('hud.insp.nextDrop'),j?esc(j.shop.name):_t('hud.insp.depot'))+irow(_t('hud.insp.promisedBy'),j?fmtT(j.due):'—')+irow(_t('hud.insp.dropsLeft'),s.jobs.length)+irow(_t('hud.insp.earnedTrip'),s.earned+' cr')+irow(_t('hud.insp.speed'),(moved(s)?Math.round(s.spd*5):0)+' km/h')+irow(_t('hud.insp.rating'),delSave().rating.toFixed(1)+' / 5')+'</div>';
  }else if(s.kind==='tk'&&s.lite){
    const Ls=s.lite.s,[stt,c]=liteTruckStatus(s), mv=moved(s);
    const prog=s.state==='queued'?(s.atGate?8:3):s.state==='docking'?20:s.state==='departing'?100:s.done/s.n*100;
    const sub=s.state==='queued'?(s.atGate?_t('hud.tk.waitingAtCode',{code:Ls.code}):_t('hud.tk.drivingIn')+' · '+_t('hud.tk.mToGate',{m:Math.max(0,Math.round(s.z-16))})):s.state==='docking'?_t('hud.tk.reversing',{n:s.bay.i+1})+' · '+Ls.code:s.state==='departing'?(s.dir==='out'?_t('hud.tk.headingTo',{d:s.dest}):_t('hud.tk.leaving',{code:Ls.code})):Ls.code+' · '+_t('hud.bay',{n:s.bay.i+1})+' · '+_t('hud.insp.palletsProg',{a:s.done,b:s.n});
    h+=insHead(s.car.name.toUpperCase()+' · '+_t('hud.eb.carrier'),s.id,hpick(DRIVERS,s.id)+' · '+plateOf(s.id),ICON.truck,true);
    h+=istat(stt,c,sub)+ibar(prog,'',(s.state==='loading'||s.state==='unloading')?_t('hud.nLeft',{n:s.n-s.done}):'');
    h+='<div class="irows">'+irow(_t('hud.insp.shipment'),'<span class="link">'+esc(s.ship)+'</span>')+irow(_t('hud.insp.direction'),s.dir==='out'?_t('hud.insp.outboundCap'):_t('hud.insp.inboundCap'))+irow(_t('hud.insp.origin'),esc(s.from))+irow(_t('hud.insp.destination'),esc(s.dest))+irow(_t('hud.insp.speed'),(mv?(s.steps[0]&&s.steps[0].rev?5:22):0)+' km/h')+irow(_t('hud.insp.bay'),s.bay?_t('hud.bay',{n:s.bay.i+1})+' · '+Ls.code:_t('hud.insp.gateQueue'))+irow(_t('hud.insp.cargo'),_t('hud.insp.nPallets',{n:s.n})+' · '+(s.n*0.38).toFixed(1)+' t')+'</div>';
  }else if(s.kind==='lfl'){
    const Ls=s.lite.s,b=Math.round(s.battery),idle=s.task==='Idle';
    h+=insHead(_t('hud.eb.forklift')+' · '+Ls.code,s.id,hpick(DRIVERS,s.id)+' · '+hpick(FL_MODELS,s.id),ICON.fl,true);
    h+=istat(idle?_t('hud.fl.type.idle'):liteTaskWord(s.task.split(' ')[0]),idle?'':'ok',idle?_t('hud.fl.waitTruck'):liteTask(s.task))+ibar(b,b<25?'bad':b<45?'warn':'ok',_t('hud.fl.battery',{b}));
    h+='<div class="irows">'+irow(_t('hud.insp.carrying'),s.carry?_t('hud.insp.onePallet'):_t('hud.insp.empty'))+irow(_t('hud.insp.movesToday'),s.moved)+irow(_t('hud.insp.forkHeight'),(s.forkY*1000|0)+' mm')+irow(_t('hud.insp.site'),esc(Ls.name))+'</div>';
  }else if(s.kind==='lbay'){
    const b=s.bay,t=b.truck,Ls=b.lite.s,[stt,c]=t?liteTruckStatus(t):[_t('hud.free'),'ok'];
    h+=insHead(_t('hud.eb.dockBay')+' · '+Ls.code,_t('hud.bay',{n:b.i+1}),_t('hud.insp.dockDoor'),ICON.dock,false);
    h+=istat(stt,c,t?t.id+' · '+t.car.name:_t('hud.insp.doorClosed'));
    h+='<div class="irows">'+irow(_t('hud.insp.truck'),t?'<span class="link">'+t.id+'</span> · '+esc(t.car.name):'—')+irow(_t('hud.insp.rearDoors'),_t('hud.insp.pctOpen',{p:Math.round(b.open*100)}))+irow(_t('hud.insp.trucksToday'),b.count)+irow(_t('hud.insp.site'),esc(Ls.name))+'</div>';
  }else if(s.kind==='tk'){
    const [stt,c]=truckStatus(s), left=s.cargo.length-s.unloaded, mv=moved(s);
    const prog=s.state==='unloading'?s.unloaded/s.cargo.length*100:s.state==='docking'?20:s.state==='departing'?100:s.atGate?8:3;
    const sub=s.state==='queued'?(s.atGate?_t('hud.tk.waitingAtGate'):_t('hud.tk.drivingIn')+' · '+_t('hud.tk.mToGate',{m:Math.max(0,Math.round(s.z-16))})):s.state==='docking'?_t('hud.tk.reversing',{n:s.bay.i+1})+' · '+site.code:s.state==='unloading'?site.code+' · '+_t('hud.bay',{n:s.bay.i+1})+' · '+_t('hud.insp.palletsProg',{a:s.unloaded,b:s.cargo.length}):_t('hud.tk.leaving',{code:site.code});
    const eta=s.state==='unloading'?_t('hud.tk.doneAbout',{m:Math.max(1,left*2)}):s.state==='departing'?_t('hud.tk.departed'):s.state==='docking'?fmtT(clockMin()+1)+' '+_t('hud.tk.oneMin'):fmtT(clockMin()+Math.max(1,Math.round((s.z-16)/6)+2));
    const spd=mv?(s.steps[0]&&s.steps[0].rev?5:22):0;
    h+=insHead(s.car.name.toUpperCase()+' · '+_t('hud.eb.carrier'),s.id,hpick(DRIVERS,s.id)+' · '+plateOf(s.id),ICON.truck,true);
    h+=istat(stt,c,sub)+ibar(prog,'',s.state==='unloading'?_t('hud.nLeft',{n:left}):'');
    h+='<div class="irows">'+irow(_t('hud.insp.shipment'),'<span class="link">'+esc(s.ship)+'</span>')+irow(_t('hud.insp.shipper'),esc(hpick(SHIPPERS,s.id)))+irow(_t('hud.insp.destination'),site.code+' '+esc(site.name))+irow(_t('hud.insp.eta'),eta)+irow(_t('hud.insp.speed'),spd+' km/h')+irow(_t('hud.insp.bay'),s.bay?'<span class="link">'+_t('hud.bay',{n:s.bay.i+1})+'</span> · '+site.code:_t('hud.insp.gateQueue'))+irow(_t('hud.insp.cargo'),_t('hud.insp.palletsProg',{a:s.unloaded,b:s.cargo.length})+' · '+(s.cargo.length*0.38).toFixed(1)+' t')+'</div>';
  }else if(s.kind==='fl'){
    const mv=moved(s), b=Math.round(s.battery), ty=s.broken?'Broken down':s.task?s.task.type:'Idle';
    const lab=s.broken?_t('hud.fl.broken'):ty==='Put-away'?_t('hud.fl.unloadingTruck'):ty==='Pick'?_t('hud.fl.pickingOrder'):flType(ty);
    const cls=s.broken?'bad':ty==='Charging'?'warn':ty==='Idle'?'':'ok';
    const ci=HOMES.indexOf(s.home);
    h+=insHead(_t('hud.eb.forklift')+' · '+site.code,s.id,(s.temp?_t('hud.fl.tempDriver'):hpick(DRIVERS,s.id))+' · '+hpick(FL_MODELS,s.id),ICON.fl,true);
    h+=istat(lab,cls,s.broken?_t('hud.fl.backIn',{d:fmtDur(s.broken-sim.sec)}):(s.task?s.task.text:_t('hud.fl.waitWork')))+ibar(b,b<25?'bad':b<45?'warn':'ok',_t('hud.fl.battery',{b}));
    h+='<div class="irows">'+irow(_t('hud.insp.carrying'),s.carry?esc(s.carry.userData.meta.id+' · '+SKUS[s.carry.userData.sku].name):_t('hud.insp.empty'))+irow(_t('hud.insp.movesToday'),s.moved)+irow(_t('hud.insp.speed'),(mv?(s.steps[0]&&s.steps[0].slow?4.5:8.2):0)+' km/h')+irow(_t('hud.insp.forkHeight'),(s.forkY*1000|0)+' mm')+irow(_t('hud.insp.charger'),'<span class="link">C'+(ci+1)+'</span>'+(s.fast?' · '+_t('hud.insp.fast'):''))+irow(_t('hud.insp.site'),esc(site.name))+'</div>';
  }else if(s.kind==='bay'){
    const b=s.bay,t=b.truck,[stt,c]=t?(t.state==='docking'?[_t('hud.tk.arriving'),'warn']:t.state==='unloading'?[_t('hud.tk.unloadingPlain'),'info']:[_t('hud.tk.departing'),'']):[_t('hud.free'),'ok'];
    h+=insHead(_t('hud.eb.dockBay')+' · '+site.code,_t('hud.bay',{n:b.i+1}),_t('hud.insp.dockDoor'),ICON.dock,false);
    h+=istat(stt,c,t?(t.state==='docking'?_t('hud.insp.reversingIn',{id:t.id}):t.state==='unloading'?t.id+' · '+_t('hud.insp.palletsOff',{a:t.unloaded,b:t.cargo.length}):_t('hud.insp.pullingOut',{id:t.id})):_t('hud.insp.doorClosed'));
    h+='<div class="irows">'+irow(_t('hud.insp.truck'),t?'<span class="link">'+t.id+'</span> · '+esc(t.car.name):'—')+irow(_t('hud.insp.rearDoors'),_t('hud.insp.pctOpen',{p:Math.round(b.open*100)}))+irow(_t('hud.insp.trucksToday'),b.count||0)+irow(_t('hud.insp.site'),esc(site.name))+'</div>';
  }else if(s.kind==='chg'){
    const f=chgUser(s), on=chgActive(s);
    h+=insHead(_t('hud.eb.charger')+' · '+site.code,'C'+(s.i+1),(s.fast?_t('hud.chg.fast'):_t('hud.chg.normal')),ICON.plug,false);
    h+=istat(on?_t('hud.fl.type.charging'):_t('hud.free'),on?'warn':'ok',f?(on?_t('hud.chg.atPct',{id:f.id,p:Math.round(f.battery)}):_t('hud.chg.isOut',{id:f.id})+' · '+(f.task?f.task.text:_t('hud.fl.type.idle'))):_t('hud.chg.noFl'));
    h+='<div class="irows">'+irow(_t('hud.insp.forklift'),f?'<span class="link">'+f.id+'</span> · '+_t('hud.chg.batteryPct',{p:Math.round(f.battery)}):'—')+irow(_t('hud.chg.sessions'),s.sessions)+irow(_t('hud.chg.energy'),s.kwh.toFixed(1)+' kWh')+irow(_t('hud.chg.rate'),_t('hud.chg.perMin',{r:((save.up.chg?5:2.5)*(s.fast?2:1)).toFixed(1)}))+irow(_t('hud.insp.site'),esc(site.name))+'</div>';
  }else if(s.kind==='pal'){
    const g=s.g,k=g.userData.sku,m=g.userData.meta,w=palWhere(g),u=SKUS[k].units;
    h+=insHead(_t('hud.eb.pallet')+' · '+_t('hud.skuCat.'+k),SKUS[k].name,m.id+' · '+SKUS[k].code,ICON.box,false);
    h+=istat(w.st,w.cls,w.loc);
    h+='<div class="irows">'+irow(_t('hud.insp.quantity'),_t('hud.insp.nUnits',{n:fmtN(u)}))+irow(_t('hud.insp.grossWeight'),fmtN(u*UNIT_KG[k]+25)+' kg')+irow(_t('hud.insp.location'),esc(w.loc))+irow(_t('hud.insp.lot'),m.lot)+irow(_t('hud.insp.received'),fmtT(m.recv))+irow(_t('hud.insp.site'),esc(site.name))+'</div>';
  }
  put('insp',{show:true,sel:!!s,html:h});
}

/* ---------------- top bar menus: sites, notifications ---------------- */
const notices=[]; let unread=0;
function notify(kind,title,body){notices.unshift({kind,title,body,t:clockMin()});if(notices.length>30)notices.pop();unread++;putLive({bellUnread:unread});}
function pushBell(){putLive({bellList:notices.slice(0,14),bellHtml:snpBellDD(),bellUnread:unread,hasNotices:notices.length>0,empty:_t('hud.bell.empty')});}
function flyToSite(i,activate){
  exitTown(); exitBuild(true); select(null); closeModal(); game.follow=null;
  const s=SITES[i]; game.fly={i,activate:!!activate&&game.phase!=='shift'&&unlocked(i),x:s.k*SLICE_W+1.5};
  view.targetT.set(game.fly.x,0,1.5); view.zoomT=Math.min(view.zoomT,0.32);
}
/* ---------------- camera ---------------- */
const cam=new THREE.OrthographicCamera(-1,1,1,-1,-700,1000);
const EL=0.6155;
const view={target:new THREE.Vector3(),targetT:new THREE.Vector3(),az:Math.PI/4,azT:Math.PI/4,zoom:1,zoomT:1,size:34};
function defaultView(){
  const a=innerWidth/innerHeight, mobile=innerWidth<=760;
  view.size=mobile?clamp(30/a*.82,30,70):34;
  view.targetT.set((mobile?-1:1.5)+OX,0,mobile?2:1.5); view.zoomT=mobile?1.15:1;
}
function resize(){
  const w=innerWidth,h=innerHeight; renderer.setSize(w,h);
  const a=w/h, s=view.size;
  cam.left=-s*a/2;cam.right=s*a/2;cam.top=s/2;cam.bottom=-s/2;cam.updateProjectionMatrix();
  updateSheetVar();
}
function updateSheetVar(){if(innerWidth<=760&&els.panel){document.documentElement.style.setProperty('--sheet',els.panel.getBoundingClientRect().height+'px');}}
function placeCam(){
  const R=90,t=view.target;
  cam.position.set(t.x+R*Math.cos(EL)*Math.sin(view.az),t.y+R*Math.sin(EL),t.z+R*Math.cos(EL)*Math.cos(view.az));
  cam.lookAt(t); cam.zoom=view.zoom; cam.updateProjectionMatrix();
  scene.fog.near=90+60/view.zoom; scene.fog.far=90+190/view.zoom;
  sun.position.set(t.x-14,34,t.z+22); sun.target.position.copy(t);
  const warm=Math.pow(Math.abs(dayPhase()-0.5)*2,1.4);
  sun.color.copy(_sunC.copy(SUN_NOON).lerp(SUN_DAWN,warm*0.55)); sun.intensity=0.62-0.16*warm;
  scene.background.copy(_bgC.copy(BG_NOON).lerp(BG_DAWN,warm*0.4)); scene.fog.color.copy(scene.background);
  if(walls.back){walls.back.visible=walls.backTrim.visible=Math.cos(view.az)>-0.2;walls.left.visible=walls.leftTrim.visible=Math.sin(view.az)>-0.2;}
}
const el=renderer.domElement, ptrs=new Map();
let drag=null,pinch=null;
el.addEventListener('pointerdown',e=>{
  el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===1) drag={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:performance.now(),moved:false};
  else if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,z:view.zoomT};drag=null;}
});
el.addEventListener('pointermove',e=>{
  if(ptrs.has(e.pointerId)) ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch&&ptrs.size===2){const [a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);view.zoomT=clamp(pinch.z*d/pinch.d,.08,3.2);return;}
  if(drag){
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y; drag.x=e.clientX;drag.y=e.clientY;
    if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>6){drag.moved=true;game.follow=null;el.classList.add('dragging');hideHint();if(tut)tut.flags.drag=true;}
    if(drag.moved){
      const upp=(cam.top-cam.bottom)/view.zoom/innerHeight;
      const rx=Math.cos(view.az),rz=-Math.sin(view.az), fx=-Math.sin(view.az),fz=-Math.cos(view.az);
      const k=dy*upp/Math.sin(EL);
      view.targetT.x=clamp(view.targetT.x-rx*dx*upp+fx*k,-250,260); view.targetT.z=clamp(view.targetT.z-rz*dx*upp+fz*k,-130,140); game.fly=null;
      view.target.copy(view.targetT);
    }
  }else if(e.pointerType==='mouse'){ if(game.town){townHoverT=tileAtScreen(e.clientX,e.clientY);el.classList.add('hover');} else hoverAt(e.clientX,e.clientY); }
});
function endPtr(e){
  ptrs.delete(e.pointerId);
  if(drag&&!drag.moved&&performance.now()-drag.t<500){
    if(game.town){const t=tileAtScreen(e.clientX,e.clientY);townHoverT=t;applyTool(t);}
    else if(game.building){const k=pickGhost(e.clientX,e.clientY);buildSel=k;putLive({buildSel:k});dirty=true;}
    else select(pickAt(e.clientX,e.clientY));
  }
  if(ptrs.size<2)pinch=null;
  if(!ptrs.size){drag=null;el.classList.remove('dragging');}
}
el.addEventListener('pointerup',endPtr); el.addEventListener('pointercancel',endPtr);
el.addEventListener('wheel',e=>{e.preventDefault();view.zoomT=clamp(view.zoomT*Math.exp(-e.deltaY*0.0015),.08,3.2);hideHint();if(tut)tut.flags.drag=true;},{passive:false});
const ray=new THREE.Raycaster(), ndc=new THREE.Vector2();
function setRay(x,y){ndc.set(x/innerWidth*2-1,-(y/innerHeight)*2+1); ray.setFromCamera(ndc,cam);}
function pickAt(x,y){
  setRay(x,y);
  const LT=[...lites.values()];
  let hit=ray.intersectObjects([...trucks.map(t=>t.g),...forklifts.map(f=>f.g),...liteTrucks.map(t=>t.g),...vans.map(v=>v.g),...LT.flatMap(Lt=>Lt.fls.map(f=>f.g))],true).find(h=>!h.object.isSprite);
  if(!hit){const extra=[...slots.map(s=>s.pallet),...staging.map(s=>s.pallet)].filter(Boolean).concat(bays.map(b=>b.g),chargers.map(c=>c.g),LT.flatMap(Lt=>Lt.bays.map(b=>b.door.parent)));hit=ray.intersectObjects(extra,true).find(h=>!h.object.isSprite);}
  if(!hit){const D=[];town.objs.forEach(g=>{if(g.userData.sel)D.push(g);});hit=ray.intersectObjects(D,true).find(h=>!h.object.isSprite);}
  if(!hit&&LT.length)hit=ray.intersectObjects(LT.map(Lt=>Lt.G),true).find(h=>!h.object.isSprite);
  if(!hit)return null;
  let o=hit.object; while(o&&!o.userData.sel)o=o.parent; return o?o.userData.sel:null;
}
function pickGhost(x,y){
  setRay(x,y); const hit=ray.intersectObjects(ghosts,true)[0]; if(!hit)return null;
  let o=hit.object; while(o&&!o.userData.build)o=o.parent; return o?o.userData.build:null;
}
let hoverT=0;
function hoverAt(x,y){const n=performance.now();if(n-hoverT<60)return;hoverT=n;el.classList.toggle('hover',game.building?!!pickGhost(x,y):!!pickAt(x,y));}

/* ---------------- selection ---------------- */
let selected=null; const chargers=[], barriers=[];
const ring=new THREE.Mesh(new THREE.RingGeometry(1,1.18,48),new THREE.MeshBasicMaterial({color:'#2f5be0',transparent:true,opacity:.55,depthWrite:false}));
ring.rotation.x=-Math.PI/2; ring.visible=false; scene.add(ring);
function select(o){if(o!==selected)game.follow=null;selected=o;if(els.tag)els.tag.hidden=!o;setBrackets(o);rebuildRoute();dirty=true;snpInspector();}
function focusOn(o){const p=selPos(o);if(p)view.targetT.set(p.x,0,p.z);}

/* ---------------- HUD ---------------- */
/* ---------------- HUD ---------------- */
let tab='ord',dirty=true,hl=null,plOpen=false;
function setTab(t){tab=t;dirty=true;
  if(innerWidth<=760&&!plOpen){plOpen=true;putLive({panelOpen:true});setTimeout(updateSheetVar,30);}
  snpPanel();}
function truckStatus(t){
  if(t.xfer)return[_t('hud.tk.inTransit'),'info'];
  if(t.lite)return liteTruckStatus(t);
  if(t.state==='queued'){if(!t.atGate)return[_t('hud.tk.drivingIn'),'info'];const w=clockMin()-t.times.gate;return[_t('hud.tk.atGateFor',{d:fmtDur(w)}),w>15?'bad':'warn'];}
  if(t.state==='docking')return[_t('hud.tk.docking'),'warn'];
  if(t.state==='unloading')return[_t('hud.tk.unloading',{a:t.unloaded,b:t.cargo.length}),'info'];
  return[_t('hud.tk.departing'),''];
}
function dueText(o){if(o.stagedAt)return o.stagedAt<=o.due?_t('hud.due.stagedOn'):_t('hud.due.stagedLate');const m=Math.round(o.due-clockMin());return m>=0?_t('hud.due.dueIn',{m}):_t('hud.due.late',{m:-m});}
function snpTownHtml(){
  const E=town.econ, t=townHoverT;
  let h='<div class="build-head"><b>'+_t('hud.town.planner')+'</b><span class="pill gold">'+_t('hud.nCredits',{n:fmtN(save.credits)})+'</span></div>';
  h+='<div class="fl-grid" style="margin:6px 0 4px"><div class="mini"><label>'+_t('hud.town.incomeH')+'</label><b>+'+E.inc.toFixed(1)+'</b></div><div class="mini"><label>'+_t('hud.town.upkeepH')+'</label><b>−'+E.up.toFixed(1)+'</b></div><div class="mini"><label>'+_t('hud.town.buildings')+'</label><b>'+E.b+'</b></div></div>';
  if(t){const I=tileInfo(t); h+='<div class="tinfo '+I.kind+'"><b>'+esc(I.title)+'</b><small>'+esc(I.sub)+'</small></div>';}
  h+='<div class="sub"><span>'+_t('hud.town.toolsHead')+'</span></div>';
  TOOLS.forEach(([k,l])=>{const B=BTYPES[k];
    const cost=k==='buy'?_t('hud.town.costLand'):k==='bulldoze'?_t('hud.town.cost40'):B.cost+' cr';
    const d=k==='buy'?_t('hud.town.buyDesc',{c:LEASE.cost}):k==='bulldoze'?_t('hud.town.bulldozeDesc'):B.desc+(B.inc?' '+_t('hud.town.base',{inc:B.inc}):'');
    h+='<div class="row click'+(game.townTool===k?' hl':'')+'" data-tool="'+k+'"><div class="badge tk">'+(TICON[k]||ICON.box)+'</div><div class="t"><b>'+_t('hud.tool.'+k)+'</b><small>'+esc(d)+'</small></div><div class="r"><span class="pill'+(game.townTool===k?' info':'')+'">'+cost+'</span></div></div>';});
  h+='<div class="empty">'+_t('hud.town.help')+'</div>';
  return h;
}
function snpBuildHtml(){
  const opts=buildOptions(), queued=save.constr.filter(c=>c.kind==='wh'&&c.site===site.k);
  let h='<div class="build-head"><b>'+_t('hud.build.buildAt',{name:esc(site.name)})+'</b><span class="pill gold">'+_t('hud.nCredits',{n:fmtN(save.credits)})+'</span></div>';
  if(queued.length){
    h+='<div class="sub"><span>'+_t('hud.build.underConstr')+'</span></div>';
    queued.forEach(c=>{
      const left=Math.max(0,Math.ceil(c.dur-(save.simClock-c.startMin)));
      h+='<div class="row"><div class="badge tk">'+ICON.hammer+'</div><div class="t"><b>'+esc(c.label)+'</b><small>'+_t('hud.minLeft',{m:left})+'</small></div><div class="r"><span class="pill info">'+Math.round(constrProgress(c)*100)+'%</span></div></div>';
    });
  }
  if(!opts.length&&!queued.length) h+='<div class="empty">'+_t('hud.build.allBuilt')+'</div>';
  let g='';
  opts.forEach(o=>{
    if(o.group!==g){g=o.group;h+='<div class="sub"><span>'+g+'</span></div>';}
    const can=save.credits>=o.cost;
    h+='<div class="row click'+(buildSel===o.key?' hl':'')+'" data-bkey="'+o.key+'"><div class="badge tk">'+o.icon+'</div><div class="t"><b>'+esc(o.label)+'</b><small>'+esc(o.desc)+'</small></div><div class="r"><button class="act'+(buildSel===o.key?' solid':'')+'" data-buy-build="'+o.key+'"'+(can?'':' disabled')+'>'+o.cost+' cr</button></div></div>';
  });
  const b=siteBuilds(site.code), owned=[];
  if(b.bays)owned.push(_tn('hud.build.ownBays',b.bays)); if(b.row)owned.push(_t('hud.build.ownRow')); if((b.l3||[]).length)owned.push(_tn('hud.build.ownL3',b.l3.length));
  if((b.fc||[]).length)owned.push(_tn('hud.build.ownFc',b.fc.length)); if(b.brk)owned.push(_t('hud.build.ownBrk')); if((b.decor||[]).length)owned.push(_t('hud.build.ownDecor',{n:b.decor.length}));
  if(owned.length) h+='<div class="sub"><span>'+_t('hud.build.already')+'</span></div><div class="empty">'+esc(owned.join(' · '))+'</div>';
  return h;
}
function snpPanel(){
  if(game.town){put('panel',{mode:'town',html:snpTownHtml(),tab:null,cr:fmtN(save.credits)});return;}
  if(game.building){put('panel',{mode:'build',html:snpBuildHtml(),tab:null,cr:fmtN(save.credits)});return;}
  const st=stockBySku(), occ=occupied();
  const docked=bays.filter(b=>b.truck&&b.truck.state==='unloading').length;
  const queued=trucks.filter(t=>t.state==='queued').length;
  const lateN=sim.orders.filter(o=>o.late).length;
  const chips=
    (spills.length||forklifts.some(f=>f.broken)?'<span class="pill warn">'+_t('hud.incident')+'</span>':'<span class="pill ok">'+_t('hud.operational')+'</span>')+
    '<span class="pill">'+_t('hud.nDocked',{n:docked+'/'+bays.length})+'</span>'+
    (queued?'<span class="pill '+(queued>1?'bad':'warn')+'">'+_t('hud.nAtGate',{n:queued})+'</span>':'')+
    '<span class="pill">'+_t('hud.nStaged',{n:staging.filter(s=>s.pallet).length})+'</span>';
  const counts={ord:{n:sim.orders.length,hot:!!lateN},dock:{n:docked+'/'+bays.length},
    fl:{n:forklifts.filter(f=>f.steps.length&&!f.charging&&!f.broken).length+'/'+forklifts.length},
    tk:{n:trucks.filter(t=>t.state!=='departing').length},
    van:{n:del.jobs.length+vans.length,hot:del.jobs.some(j=>clockMin()>j.due)}};
  const cost=c=>game.phase==='shift'?' · −'+c:'';
  let h='';
  if(tab==='ord'){
    const inprog=[...forklifts.filter(f=>f.task&&f.task.order).map(f=>({o:f.task.order,s:_t('hud.ord.picking',{id:f.id})})),...staging.filter(s=>s.order).map(s=>({o:s.order,s:_t('hud.ord.stagedOut')}))];
    h+='<div class="sub"><span>'+_t('hud.ord.queue',{n:sim.orders.length})+'</span></div>';
    if(!sim.orders.length) h+='<div class="empty">'+_t('hud.ord.clear')+'</div>';
    sim.orders.forEach((o,i)=>{const s=SKUS[o.sku];const ok=st[o.sku].free>0;
      h+='<div class="row click'+(o.late?' late':'')+(game.trkOrder===o.id?' hl':'')+'" data-trko="'+o.id+'"><div class="badge '+(o.rush?'rush':'')+'">'+(o.rush?'R':i+1)+'</div><div class="t"><b class="mono">'+o.id+(o.rush?' <span class="pill rush">'+_t('hud.ord.rush')+'</span>':'')+'</b><small>'+esc(s.name)+(o.shop?' '+_t('hud.ord.forShop',{name:esc(o.shop.name)}):'')+' · '+dueText(o)+(ok?'':' · '+_t('hud.ord.noStock'))+'</small></div><div class="r">'+(i>0?'<button class="act" data-act="prio:'+o.id+'">'+_t('hud.ord.toFront')+'</button>':'<span class="pill info">'+_t('hud.ord.next')+'</span>')+'</div></div>';});
    if(inprog.length){h+='<div class="sub"><span>'+_t('hud.ord.inProgress',{n:inprog.length})+'</span></div>';
      inprog.forEach(({o,s})=>{h+='<div class="row click'+(o.late?' late':'')+(game.trkOrder===o.id?' hl':'')+'" data-trko="'+o.id+'"><div class="badge '+(o.rush?'rush':'')+'">'+(o.rush?'R':'›')+'</div><div class="t"><b class="mono">'+o.id+'</b><small>'+esc(s)+' · '+dueText(o)+'</small></div><div class="r"><span class="pill ok">'+esc(SKUS[o.sku].code)+'</span></div></div>';});}
  }else if(tab==='inv'){
    h+='<div class="sub"><span>'+_t('hud.inv.racks',{a:occ,b:slots.length})+'</span></div>';
    SKU_KEYS.forEach(k=>{const s=SKUS[k],v=st[k];const lv=v.pallets===0?[_t('hud.stock.out'),'bad']:v.pallets<3?[_t('hud.stock.low'),'warn']:[_t('hud.stock.inStock'),'ok'];
      h+='<div class="row'+(hl===k?' hl':'')+'"><div class="sw" style="background:'+s.color+'"></div><div class="t"><b>'+esc(s.name)+'</b><small class="mono">'+s.code+' · '+_t('hud.inv.plt',{n:v.pallets})+' · '+_t('hud.insp.nUnits',{n:fmtN(v.units)})+'</small></div><div class="r"><span class="pill '+lv[1]+'">'+lv[0]+'</span>'+
        (v.pallets<4?(rushInbound(k)?'<span class="pill info">'+_t('hud.inv.rushIn')+'</span>':'<button class="act" data-act="xfer:'+k+'" title="'+esc(_t('hud.inv.xferTip'))+'">'+_t('hud.inv.transfer')+cost(15)+'</button> <button class="act" data-act="exp:'+k+'">'+_t('hud.inv.expedite')+cost(35)+'</button>'):'')+'</div></div>';});
  }else if(tab==='dock'){
    bays.forEach(b=>{const t=b.truck;
      if(!t){h+='<div class="row"><div class="badge">B'+(b.i+1)+'</div><div class="t"><b>'+_t('hud.bay',{n:b.i+1})+'</b><small>'+_t('hud.dock.closedReady')+'</small></div><div class="r"><span class="pill ok">'+_t('hud.free')+'</span></div></div>';return;}
      const [s,c]=truckStatus(t);const pct=t.cargo.length?t.unloaded/t.cargo.length*100:0;
      h+='<div class="row click" data-pick="'+t.id+'"><div class="badge tk">B'+(b.i+1)+'</div><div class="t"><b class="mono">'+t.id+'</b><small>'+esc(t.car.name)+' · '+_t('hud.insp.nPallets',{n:t.cargo.length})+(t.expedite?' · '+_t('hud.dock.rush'):'')+'</small></div><div class="r"><span class="pill '+c+'">'+s+'</span><div class="bar-s info"><i style="width:'+pct+'%"></i></div></div></div>';});
    const q=trucks.filter(t=>t.state==='queued');
    if(q.length){h+='<div class="sub"><span>'+_t('hud.dock.waitingGate')+'</span></div>';
      q.forEach(t=>{const [s,c]=truckStatus(t);h+='<div class="row click" data-pick="'+t.id+'"><div class="badge tk">G</div><div class="t"><b class="mono">'+t.id+'</b><small>'+esc(t.car.name)+' · '+_t('hud.dock.detention')+'</small></div><div class="r"><span class="pill '+c+'">'+s+'</span></div></div>';});}
    h+='<div class="sub"><span>'+_t('hud.dock.enRoute')+'</span></div>';
    if(!sim.enroute.length) h+='<div class="empty">'+_t('hud.dock.nothingBooked')+'</div>';
    sim.enroute.forEach(s=>{const m=Math.max(0,Math.round(s.eta-clockMin()));h+='<div class="row"><div class="badge tk">IN</div><div class="t"><b class="mono">'+s.id+'</b><small>'+esc(s.car.name)+' · '+_t('hud.insp.nPallets',{n:s.cargo.length})+(s.expedite?' · '+_t('hud.dock.rush')+' '+esc(SKUS[s.expedite].code):'')+'</small></div><div class="r"><span class="pill '+(s.late?'warn':'')+'">'+(m>0?_t('hud.dock.etaMin',{m}):_t('hud.tk.arriving'))+'</span></div></div>';});
  }else if(tab==='fl'){
    const working=forklifts.filter(f=>f.steps.length&&!f.charging&&!f.broken).length;
    h+='<div class="sub"><span>'+_t('hud.flTab.head',{a:working,b:forklifts.length})+'</span><button class="act" data-act="temp">'+_t('hud.flTab.hire')+cost(60)+'</button></div>';
    forklifts.forEach(f=>{const b=Math.round(f.battery);const c=b<25?'bad':b<45?'warn':'';
      const txt=f.broken?_t('hud.fl.broken')+' · '+_t('hud.fl.backInLower',{d:fmtDur(f.broken-sim.sec)}):(f.task?f.task.text:_t('hud.fl.type.idle'))+(f.temp?' · '+_t('hud.flTab.leavesIn',{d:fmtDur(f.until-sim.sec)}):'');
      h+='<div class="row click'+(selected===f?' hl':'')+'" data-pick="'+f.id+'"><div class="badge '+(f.broken?'down':f.temp?'tmp':'fl')+'">'+(f.temp?'T':f.id.slice(4))+'</div><div class="t"><b class="mono">'+f.id+'</b><small>'+esc(txt)+'</small></div><div class="r"><span class="mono">'+b+'%</span><div class="bar-s '+c+'"><i style="width:'+b+'%"></i></div></div></div>';});
  }else if(tab==='tk'){
    h+='<div class="sub"><span>'+_t('hud.tkTab.head',{n:trucks.filter(t=>t.state!=='departing').length})+'</span></div>';
    trucks.forEach(t=>{const [s,c]=truckStatus(t);h+='<div class="row click'+(selected===t?' hl':'')+'" data-pick="'+t.id+'"><div class="badge tk">'+t.car.name[0]+'</div><div class="t"><b class="mono">'+t.id+'</b><small>'+esc(t.car.name)+(t.bay?' · '+_t('hud.bay',{n:t.bay.i+1}):' · '+_t('hud.tkTab.gate'))+'</small></div><div class="r"><span class="pill '+c+'">'+s+'</span></div></div>';});
  }else if(tab==='van'){
    h+=renderDelPanel();
  }else{
    h+='<div class="sub"><span>'+_t('hud.log.today',{name:esc(site.name)})+'</span></div>';
    sim.log.slice(0,50).forEach(l=>{h+='<div class="log '+l.kind+'"><time>'+fmtT(l.t)+'</time><span>'+esc(l.text)+'</span></div>';});
  }
  put('panel',{mode:'normal',tab,chips,html:h||null,counts,cr:fmtN(save.credits),siteName:site.name,siteAddr:site.addr});
}
function snpKpis(){
  const vi=viewIdx(), vs=SITES[vi], VL=vi!==game.siteIdx?lites.get(vi):null;
  let stock,tk,onTime,occ,siteSub;
  if(VL){const s=liteStats(VL);
    stock={v:fmtN(s.units),d:'',s:_t('hud.kpi.units')+' · '+vs.code};
    tk={v:s.inn+s.out,d:'',s:_t('hud.nAtGate',{n:s.queued})+' · '+_t('hud.nOutbound',{n:s.out})};
    onTime={v:s.onTime+'%',s:_t('hud.kpi.trucksTurned',{n:s.done})};
    occ={v:Math.round(s.fill*100)+'%',pct:s.fill*100,cls:s.fill>.85?'bad':s.fill>.7?'warn':'ok'};
    siteSub=_t('hud.kpi.pctFull',{p:Math.round(s.fill*100)})+' · '+_t('hud.nDocked',{n:s.docked+'/'+VL.bays.length})+' · '+_t('hud.kpi.watching');
  }else{
    const u=totalUnits(),d=u-sim.startStock;
    stock={v:fmtN(u),d:(d>=0?'↑ ':'↓ ')+fmtN(Math.abs(d)),down:d<0,s:_t('hud.kpi.units')+' · '+site.code};
    const onSite=trucks.filter(t=>t.state!=='departing').length, q=trucks.filter(t=>t.state==='queued').length;
    tk={v:onSite,d:sim.enroute.length?'+'+sim.enroute.length:'',s:(q?_t('hud.nAtGate',{n:q})+' · ':'')+_t('hud.kpi.enRoute',{n:sim.enroute.length})};
    const s2=game.st, n=s2.shipOn+s2.lateOrders;
    onTime={v:game.phase!=='free'&&n?Math.round(s2.shipOn/n*100)+'%':'—',s:game.phase!=='free'?_t('hud.kpi.onTimeN',{n:s2.shipOn})+' · '+_t('hud.kpi.lateN',{n:s2.lateOrders}):_t('hud.kpi.startsShift')};
    const oc=occupied()/slots.length;
    occ={v:Math.round(oc*100)+'%',pct:oc*100,cls:oc>.85?'bad':oc>.7?'warn':'ok'};
    siteSub=_t('hud.kpi.pctFull',{p:Math.round(oc*100)})+' · '+_t('hud.nDocked',{n:bays.filter(b=>b.truck&&b.truck.state==='unloading').length+'/'+bays.length});
  }
  const free=game.phase==='free';
  const score={free,text:free?(game.building?_t('hud.kpi.building'):_t('hud.kpi.freePlay')):fmtN(game.score)};
  const clockLeft=game.phase==='shift'?_t('hud.kpi.left',{d:fmtDur(SHIFT_LEN-sim.sec)}):'';
  const clockPct=game.phase==='shift'?Math.min(100,sim.sec/SHIFT_LEN*100):0;
  let combo=null;
  if(game.phase==='shift'&&game.combo>=1){const m2=comboMult();const into=m2>=2?3:game.combo%3;
    combo={x:'×'+m2.toFixed(2).replace(/0$/,'').replace(/\.0$/,''),pips:[0,1,2].map(i=>i<into)};}
  const lv=levelOf(save.xp);
  const lvl={n:lv,pct:Math.min(100,(save.xp-xpFor(lv))/(xpFor(lv+1)-xpFor(lv))*100),title:_t('hud.kpi.level',{n:lv})+' · '+rankOf(lv),rank:rankOf(lv),sub:_t('hud.kpi.level',{n:lv})+' · '+fmtN(save.xp)+' XP'};
  put('kpis',{site:{code:vs.code,accent:vs.accent,name:vs.name},stock,trucks:tk,onTime,occ,siteSub,score,clockLeft,clockPct,combo,lvl});
  updateSheetVar();
}
function snpShift(){
  let h,free=false;
  if(game.phase==='free'){
    free=true;
    const wv=viewIdx();
    if(wv!==game.siteIdx) h='<div class="shift-h"><h3>'+_t('hud.shift.watching')+' · '+esc(SITES[wv].name)+'</h3></div><p class="shift-free">'+_t('hud.shift.watchA',{name:esc(site.name)})+' <b>'+_t('hud.insp.runSite')+'</b> '+_t('hud.shift.watchB')+'</p><div class="goals-mini">'+_t('hud.shift.watchingCode',{code:esc(SITES[wv].code)})+'</div>';
    else h='<div class="shift-h"><h3>'+_t('hud.kpi.freePlay')+' · '+esc(site.name)+'</h3></div><p class="shift-free">'+_t('hud.shift.freeA')+' <button data-menu>'+_t('hud.shift.freeBtn')+'</button> '+_t('hud.shift.freeB')+'</p><div class="goals-mini">'+_t('hud.kpi.freePlay')+' · '+_t('hud.shift.tapStart')+'</div>';
  }else{
    const G=site.goals, st=game.st, n=st.shipOn+st.lateOrders, otr=n?st.shipOn/n*100:0;
    const goals=[
      {l:_t('hud.shift.gPut'),v:st.recv+' / '+G.recv,p:st.recv/G.recv,met:st.recv>=G.recv},
      {l:_t('hud.shift.gShip'),v:st.shipOn+' / '+G.ship,p:st.shipOn/G.ship,met:st.shipOn>=G.ship},
      {l:_t('hud.shift.gRate',{p:G.ontime}),v:n?Math.round(otr)+'%':'—',p:n?otr/100:0,met:n>=5&&otr>=G.ontime,warn:n>=3&&otr<G.ontime},
    ];
    if(game.mode==='daily') goals.unshift({l:_t('hud.shift.gDaily'),v:fmtN(game.score)+' / '+fmtN(game.daily.target),p:Math.max(0,game.score)/game.daily.target,met:game.score>=game.daily.target,gold:true});
    const stars=goals.filter(g=>g.met&&!g.gold).length;
    const fx=[];
    if(game.mode==='daily') game.daily.mods.forEach(m=>fx.push('<span class="pill flame">'+MODS[m].name+'</span>'));
    forklifts.filter(f=>f.broken).forEach(f=>fx.push('<span class="pill bad">'+_t('hud.shift.fxDown',{id:f.id,d:fmtDur(f.broken-sim.sec)})+'</span>'));
    spills.forEach(s=>fx.push('<span class="pill warn">'+_t('hud.shift.fxAisle',{r:'ABCD'[s.r],d:fmtDur(sim.blocked[s.r]-sim.sec)})+'</span>'));
    if(game.surgeUntil>sim.sec) fx.push('<span class="pill warn">'+_t('hud.shift.fxSurge',{d:fmtDur(game.surgeUntil-sim.sec)})+'</span>');
    forklifts.filter(f=>f.temp&&!f.remove).forEach(f=>fx.push('<span class="pill info">'+f.id+' · '+_t('hud.kpi.left',{d:fmtDur(f.until-sim.sec)})+'</span>'));
    const chip=game.mode==='daily'?'<span class="modechip daily">'+_t('hud.shift.daily')+'</span>':game.mode==='tutorial'?'<span class="modechip">'+_t('hud.shift.training')+'</span>':'';
    h='<div class="shift-h">'+chip+'<h3>'+(game.phase==='report'?_t('hud.shift.complete'):_t('hud.shift.goals'))+'</h3><span class="stars">'+[0,1,2].map(i=>'<span class="'+(i<stars?'on':'')+'">'+STAR+'</span>').join('')+'</span></div>'+
      goals.map(g=>'<div class="goal'+(g.met?' met':'')+'"><div class="gl"><span>'+g.l+'</span><b>'+g.v+'</b></div><div class="meter '+(g.gold?'gold':g.met?'ok':g.warn?'bad':'')+'"><i style="width:'+Math.min(100,g.p*100)+'%"></i></div></div>').join('')+
      '<div class="effects">'+fx.join('')+'</div>'+
      '<div class="goals-mini">'+_t('hud.shift.miniGoals',{n:stars})+' · '+_t('hud.shift.miniPut',{a:st.recv,b:G.recv})+' · '+_t('hud.shift.miniStaged',{a:st.shipOn,b:G.ship})+(game.mode==='daily'?' · '+_t('hud.shift.miniTarget',{n:fmtN(game.daily.target)}):'')+'</div>';
  }
  put('shift',{html:h,free});
}
function trackTarget(){
  if(selected&&(selected.kind==='tk'||selected.kind==='fl'))return selected;
  const tx=xfers.find(t=>t.to===game.siteIdx&&t.requested); if(tx)return tx;
  const u=trucks.filter(t=>t.state==='unloading'||t.state==='docking');
  return u.sort((a,b)=>(b.times.arrived||9e9)-(a.times.arrived||9e9))[0]||trucks.find(t=>t.state==='queued')||trucks[0]||null;
}
let _trkFocus=null;
function snpOutTrack(ot){
  const o=ot.o||{}, j=ot.j, d=(j&&j.shop)||o.shop||{name:'—'}, home=!!d.home;
  const lab=[_t('hud.trk.placed'),_t('hud.trk.picked'),_t('hud.trk.staged'),_t('hud.trk.shipped'),_t('hud.van.out'),_t('hud.trk.delivered')];
  const times=[o.created,o.pickedAt,o.stagedAt,j&&j.created,j&&j.sent,j&&j.deliveredAt]; let lis='';
  lab.forEach((l,i)=>{const cls=i<ot.stage?'done':i===ot.stage?'now':'';const tm=times[i]!=null&&i<=ot.stage?fmtT(times[i]):'';lis+='<li class="'+cls+'"><div class="dot"></div><span>'+l+'</span><time>'+tm+'</time></li>';});
  const due=j?j.due:null;
  const html='<div class="track-main"><div class="th"><span class="ic">'+destIcon(home)+'</span>'+_t('hud.trk.title')+'<span class="mono">'+esc(o.id||(j&&j.id)||'')+(ot.v?' · '+ot.v.id:'')+'</span></div><ol class="steps">'+lis+'</ol></div>'+
    '<div class="track-side"><b>'+esc(d.name)+'</b><span>'+(home?_t('hud.trk.homeDel'):_t('hud.trk.shopDel'))+(d.addr&&!home?' · '+esc(d.addr):'')+' · '+_t('hud.trk.fromCode',{code:site.code})+'</span><span class="pill '+ot.cls+'" style="align-self:flex-start">'+esc(ot.where)+'</span><span>'+(j&&j.deliveredAt?_t('hud.trk.deliveredAt',{t:fmtT(j.deliveredAt)}):due?_t('hud.trk.promised',{t:fmtT(due)}):o.due?_t('hud.trk.shipBy',{t:fmtT(o.due)}):'')+'</span><button class="focus" data-focus="1">'+_t('hud.trk.center')+'</button></div>';
  return {mode:'out',html};
}
function snpTrackIn(o){ // returns {html,focus}
  if(o&&o.xfer){const t=o,A=SITES[t.from],B=SITES[t.to],lab=[_t('hud.trk.requested'),_t('hud.trk.loadedAt',{code:A.code}),_t('hud.trk.onRoad'),_t('hud.trk.atCodeGate',{code:B.code}),_t('hud.tk.unloadingPlain'),_t('hud.trk.received')];let lis='';
    lab.forEach((l,i)=>{const cls=i<2?'done':i===2?'now':'';lis+='<li class="'+cls+'"><div class="dot"></div><span>'+l+'</span><time>'+(i<2?fmtT(t.times.start):'')+'</time></li>';});
    return {html:'<div class="track-main"><div class="th"><span class="ic">'+ICON.truck+'</span>'+_t('hud.trk.xferTitle')+'<span class="mono">'+t.id+'</span></div><ol class="steps">'+lis+'</ol></div><div class="track-side"><b>'+t.ship+'</b><span>'+_t('hud.trk.fromTo',{a:esc(A.name),b:esc(B.name)})+'</span><span class="pill info" style="align-self:flex-start">'+_t('hud.tk.inTransit')+'</span><span>'+_t('hud.trk.eta',{t:fmtT(xferEta(t))})+' · '+_t('hud.insp.nPallets',{n:t.n})+'</span><button class="focus" data-focus="1">'+_t('hud.trk.center')+'</button></div>',focus:o};}
  if(o&&o.lite){const t=o,Ls=t.lite.s,[s,c]=liteTruckStatus(t),T=t.times;
    const stg=t.state==='queued'?(t.atGate?2:1):t.state==='docking'?3:t.state==='departing'?5:4;
    const lab=[_t('hud.trk.confirmed'),_t('hud.trk.picked'),_t('hud.trk.atGate'),_t('hud.trk.docked'),t.dir==='out'?_t('hud.tk.loading',{a:t.done,b:t.n}):_t('hud.tk.unloading',{a:t.done,b:t.n}),t.dir==='out'?_t('hud.tk.departed'):_t('hud.trk.received')];
    const times=[T.confirmed,T.picked,T.gate,T.arrived,T.arrived,T.done]; let lis='';
    lab.forEach((l,i)=>{const cls=i<stg?'done':i===stg?'now':'';const tm=times[i]!=null&&i<=stg?fmtT(times[i]):'';lis+='<li class="'+cls+'"><div class="dot"></div><span>'+l+'</span><time>'+tm+'</time></li>';});
    return {html:'<div class="track-main"><div class="th"><span class="ic">'+ICON.truck+'</span>'+_t('hud.trk.title')+'<span class="mono">'+t.id+' · '+esc(t.car.name)+'</span></div><ol class="steps">'+lis+'</ol></div>'+
      '<div class="track-side"><b>'+t.ship+'</b><span>'+_t('hud.trk.fromTo',{a:esc(t.from),b:esc(t.dest)})+'</span><span class="pill '+c+'" style="align-self:flex-start">'+s+'</span><span>'+(t.bay?_t('hud.bay',{n:t.bay.i+1})+' · '+Ls.code:_t('hud.insp.gateQueue'))+'</span><button class="focus" data-focus="1">'+_t('hud.trk.center')+'</button></div>',focus:o};}
  if(!o)return {html:'<div class="track-main"><div class="th"><span class="ic">'+ICON.truck+'</span>'+_t('hud.trk.title')+'</div><p style="color:var(--ink-3);margin:10px 0 0">'+_t('hud.trk.noTrucks')+'</p></div>',focus:null};
  if(o.kind==='fl'){
    const b=Math.round(o.battery);
    const status=o.broken?_t('hud.fl.broken'):(o.task?flType(o.task.type):_t('hud.fl.type.idle'));
    return {html:'<div class="track-main"><div class="th"><span class="ic">'+ICON.fl+'</span>'+_t('hud.trk.forklift',{id:o.id})+'<span class="mono">'+(o.temp?_t('hud.fl.tempDriver')+' · ':'')+(o.fast?_t('hud.trk.fastCharger')+' · ':'')+_t('hud.trk.counterbalance')+' · 2.5 t</span></div>'+
      '<div class="fl-grid"><div class="mini"><label>'+_t('hud.trk.status')+'</label><b>'+esc(status)+'</b></div><div class="mini"><label>'+_t('hud.trk.battery')+'</label><b>'+b+'%</b></div><div class="mini"><label>'+_t('hud.insp.movesToday')+'</label><b>'+o.moved+'</b></div></div>'+
      '<p style="margin:10px 2px 0;color:var(--ink-2);font-size:12px">'+esc(o.broken?_t('hud.trk.hydraulic')+' · '+_t('hud.fl.backInLower',{d:fmtDur(o.broken-sim.sec)}):(o.task?o.task.text:_t('hud.fl.waitWork')))+'</p></div>'+
      '<div class="track-side"><span>'+_t('hud.insp.forkHeight')+'</span><b>'+(o.forkY*1000|0)+' mm</b><span>'+_t('hud.trk.load')+'</span><b>'+(o.carry?esc(SKUS[o.carry.userData.sku].code):_t('hud.insp.empty'))+'</b><button class="focus" data-focus="1">'+_t('hud.trk.center')+'</button></div>',focus:o};
  }
  const t=o, T=t.times;
  const stg=t.state==='departing'?5:(t.state==='unloading'?4:3);
  const lab=[_t('hud.trk.confirmed'),_t('hud.trk.picked'),_t('hud.trk.loaded'),_t('hud.trk.atGate'),_t('hud.tk.unloading',{a:t.unloaded,b:t.cargo.length}),_t('hud.trk.received')];
  const times=[T.confirmed,T.picked,T.loaded,T.gate,T.arrived,T.done];
  let lis='';
  lab.forEach((l,i)=>{const cls=i<stg?'done':i===stg?'now':'';const tm=times[i]!=null&&i<=stg?fmtT(times[i]):'';
    lis+='<li class="'+cls+'"><div class="dot"></div><span>'+l+'</span><time>'+tm+'</time></li>';});
  const [s,c]=truckStatus(t);
  const left=t.cargo.length-t.unloaded;
  return {html:'<div class="track-main"><div class="th"><span class="ic">'+ICON.truck+'</span>'+_t('hud.trk.title')+'<span class="mono">'+t.id+' · '+esc(t.car.name)+'</span></div><ol class="steps">'+lis+'</ol></div>'+
    '<div class="track-side"><b>'+t.ship+'</b><span>'+_t('hud.trk.fromTo',{a:esc(t.car.from),b:site.code})+'</span><span class="pill '+c+'" style="align-self:flex-start">'+s+'</span><span>'+(t.bay?_t('hud.bay',{n:t.bay.i+1}):_t('hud.insp.gateQueue'))+' · '+_tn('hud.trk.palletsLeft',left)+'</span><button class="focus" data-focus="1">'+_t('hud.trk.center')+'</button></div>',focus:o};
}
function snpTrack(){
  let out=null,outEmpty=false;
  _trkFocus=null;
  if(selected&&selected.kind==='van'){
    const ot=orderTrack(selected.jobs[0]&&selected.jobs[0].id)||defaultOutbound();
    if(ot){out=snpOutTrack(ot);if(ot.v)_trkFocus=ot.v;}
  }else if(selected&&selected.kind==='dest'){
    const op=openOrdersFor(selected.t.key);
    const lj=del.recent.find(r=>r.job&&r.job.shop.key===selected.t.key);
    const ot=orderTrack(op[0]?op[0].id:lj&&lj.id);
    if(ot){out=snpOutTrack(ot);if(ot.v)_trkFocus=ot.v;}
  }else if(game.trk==='out'&&!(selected&&(selected.kind==='tk'||selected.kind==='fl'))){
    const ot=orderTrack(game.trkOrder)||defaultOutbound();
    if(ot){out=snpOutTrack(ot);if(ot.v)_trkFocus=ot.v;}
  }
  if(out){put('track',{mode:'out',html:out.html,focus:!!_trkFocus});return;}
  if(outEmpty){put('track',{mode:'out',html:'<div class="track-main"><div class="th"><span class="ic">'+ICON.shop+'</span>'+_t('hud.trk.title')+'</div><p style="color:var(--ink-3);margin:10px 0 0">'+_t('hud.trk.noOutbound')+'</p></div>',focus:false});return;}
  const o=trackTarget();
  const r=snpTrackIn(o);
  _trkFocus=r.focus;
  put('track',{mode:'in',html:r.html,focus:!!r.focus});
}
function snpSiteDD(){
  const vi=viewIdx();
  let h='<button class="ddi" data-net="1"><span class="code all">ALL</span><div><b>'+_t('hud.dd.network')+'</b><small>'+_t('hud.dd.allSites')+'</small></div></button>';
  SITES.forEach((s,i)=>{const act=i===game.siteIdx,cur=i===vi,un=unlocked(i);let fill,docked,nb;
    if(act){fill=occupied()/Math.max(1,slots.length);docked=bays.filter(b=>b.truck&&b.truck.state==='unloading').length;nb=bays.length;}
    else{const Lt=lites.get(i),st=Lt?liteStats(Lt):{fill:0,docked:0};fill=st.fill;docked=st.docked;nb=Lt?Lt.bays.length:s.bays;}
    h+='<button class="ddi'+(cur?' cur':'')+'" data-site="'+i+'"><span class="code" style="background:'+s.accent+'">'+s.code+'</span><div><b>'+esc(s.name)+'</b><small>'+_t('hud.kpi.pctFull',{p:Math.round(fill*100)})+' · '+_t('hud.nDocked',{n:docked+'/'+nb})+(un?'':' · '+_t('hud.dd.locked'))+'</small><div class="meter"><i style="width:'+fill*100+'%"></i></div></div>'+
      (act?'<span class="pill info">'+(game.phase==='shift'?_t('hud.dd.onShift'):_t('hud.town.yours'))+'</span>':un?'':ICON.lock)+'</button>';});
  if(save.town.unit7) h+='<div class="ddnote">'+_t('hud.dd.depotNote',{inc:LEASE.inc})+'</div>';
  return h;
}
function snpBellDD(){
  return '<div class="ddh"><b>'+_t('hud.bell.title')+'</b>'+(notices.length?'<button class="act" data-clear="1">'+_t('hud.bell.clear')+'</button>':'')+'</div>'+
    (notices.length?notices.slice(0,14).map(n=>'<div class="ddn '+n.kind+'"><time>'+fmtT(n.t)+'</time><div><b>'+esc(n.title)+'</b>'+(n.body?'<small>'+esc(n.body)+'</small>':'')+'</div></div>').join(''):'<div class="empty">'+_t('hud.bell.empty')+'</div>');
}
/* ---------------- menu ---------------- */
let modalView=null, prevSpeed=1, confirmReset=false;
function openMenu(tabName){game.menuTab=tabName||game.menuTab||'play';if(game.phase!=='shift')game.menuSel=game.siteIdx;openModal('menu');}
function openModal(v){
  exitBuild(true); exitTown();
  modalView=v; confirmReset=false; putLive({sheetOpen:true});
  if(v==='menu'&&game.phase==='shift'&&sim.speed!==0){prevSpeed=sim.speed;setSpeed(0);}
  snpSheet();
}
function closeModal(){game.welcome=null;modalView=null;putLive({sheetOpen:false});put('sheet',{open:false});}
const starRow=n=>[0,1,2].map(k=>'<span class="'+(k<n?'on':'')+'">'+STAR+'</span>').join('');
function siteCard(s,i){
  const best=save.best[s.code], un=unlocked(i), sel=game.menuSel===i;
  const off=!un||(game.phase==='shift'&&i!==game.siteIdx);
  const b=siteBuilds(s.code), nb=(b.bays|0)+(b.row?1:0)+(b.l3||[]).length+(b.fc||[]).length+(b.brk?1:0)+(b.decor||[]).length;
  return '<button class="sitecard" data-site="'+i+'" aria-pressed="'+sel+'"'+(off?' disabled':'')+'>'+
    '<div class="sc-top"><span class="code" style="background:'+s.accent+'">'+s.code+'</span><span class="stars">'+starRow(best?best.stars:0)+'</span></div>'+
    '<h3>'+esc(s.name)+'</h3><p>'+esc(s.blurb)+'</p>'+
    '<div class="facts"><span class="pill">'+t('menu.site.docks',{n:Math.min(5,s.bays+(b.bays|0))})+'</span><span class="pill">'+t('menu.site.rackRows',{n:Math.min(4,s.rows+(b.row?1:0))})+'</span><span class="pill">'+t('menu.site.forklifts',{n:s.forklifts})+'</span>'+(nb?'<span class="pill gold">'+t('menu.site.builds',{n:nb})+'</span>':'')+'</div>'+
    '<div class="diff">'+t('menu.site.difficulty')+' '+[1,2,3].map(k=>'<i class="'+(k<=s.diff?'on':'')+'"></i>').join('')+(best?'<span style="margin-left:auto">'+t('menu.site.best',{score:fmtN(best.score)})+'</span>':'')+'</div>'+
    (un?'':'<div class="lock">'+ICON.lock+t('menu.site.lock',{site:esc(SITES[i-1].name)})+'</div>')+
  '</button>';
}
function upgradesBox(){
  const canBuy=game.phase!=='shift';
  return '<div class="m-box"><h2>'+t('menu.up.title')+'</h2><p class="note">'+t('menu.up.note')+' '+(canBuy?t('menu.up.noteCanBuy'):t('menu.up.noteInShift'))+'</p>'+
    UPGRADES.map(u=>{const lv=save.up[u.key],max=u.costs.length,c=u.costs[lv];
      return '<div class="up"><div><b>'+u.name+'</b><span class="pips">'+u.costs.map((_,k)=>'<i class="'+(k<lv?'on':'')+'"></i>').join('')+'</span><small>'+u.desc+'</small></div>'+
        (lv>=max?'<span class="pill ok">'+t('menu.up.maxed')+'</span>':'<button class="buy" data-buy="'+u.key+'"'+(!canBuy||save.credits<c?' disabled':'')+'>'+c+' cr</button>')+'</div>';}).join('')+'</div>';
}
function cosBox(kind,title,note){
  return '<div class="m-box"><h2>'+title+'</h2><p class="note">'+note+'</p><div class="cosgrid">'+COSMETICS.filter(c=>c.kind===kind).map(c=>{
    const own=save.cos.owned.includes(c.id), on=save.cos[kind]===c.id;
    return '<div class="cos'+(on?' on':'')+'"><span class="cosw" style="background:'+c.body+'"></span><b>'+esc(c.name)+'</b>'+(on?'<span class="pill ok">'+t('menu.cos.equipped')+'</span>':own?'<button class="act" data-equip="'+c.id+'">'+t('menu.cos.equip')+'</button>':'<button class="buy" data-cos="'+c.id+'"'+(save.credits<c.cost?' disabled':'')+'>'+c.cost+' cr</button>')+'</div>';}).join('')+'</div></div>';
}
function equipCos(id){
  const c=COSMETICS.find(x=>x.id===id); if(!c)return; save.cos[c.kind]=id; writeSave();
  if(c.kind==='fl') forklifts.filter(f=>!f.temp).forEach(f=>{f.g.userData.body.material=mat(c.body);f.g.userData.cw.material=mat(c.cw);});
}
function weekStrip(){
  const days=[];for(let i=-6;i<=0;i++){const k=dayOffset(i);const d=new Date();d.setDate(d.getDate()+i);days.push({k,lab:t('menu.week.d'+d.getDay()),done:(save.daily.cleared||[]).includes(k),today:i===0});}
  return '<div class="week">'+days.map(d=>'<div class="'+(d.done?'done ':'')+(d.today?'today':'')+'">'+d.lab+'<i>'+(d.done?'✓':'·')+'</i></div>').join('')+'</div>';
}
function menuHeader(){
  const lv=levelOf(save.xp), pct=Math.min(100,(save.xp-xpFor(lv))/(xpFor(lv+1)-xpFor(lv))*100), inShift=game.phase==='shift';
  const sk=streakNow();
  return '<div class="m-top"><div><h1>'+(inShift?t('menu.head.paused'):'WareTrack')+'</h1><p class="lede">'+(inShift?t('menu.head.pausedLede'):t('menu.head.lede'))+'</p></div>'+
    '<div class="who"><div class="rankcard"><span class="n">'+lv+'</span><div><b>'+rankOf(lv)+'</b><small>'+fmtN(save.xp-xpFor(lv))+' / '+fmtN(xpFor(lv+1)-xpFor(lv))+' XP</small><div class="meter gold"><i style="width:'+pct+'%"></i></div></div></div>'+
    (sk?'<span class="flame">'+ICON.flame+sk+'</span>':'')+
    '<div class="credits"><label>'+t('menu.head.credits')+'</label><b>'+fmtN(save.credits)+'</b></div></div></div>'+
    (game.welcome&&!inShift?'<div class="callout gold welcome"><b>'+t('menu.welcome.title',{cr:fmtN(game.welcome.cr)})+'</b><span>'+t('menu.welcome.body',{away:fmtAway(game.welcome.h),cap:game.welcome.capped?' '+t('menu.welcome.capped'):'',trucks:game.welcome.trucks,dels:game.welcome.dels})+'</span></div>':'');
}
function snpSheetPlay(t_,inShift){
  const s=SITES[game.menuSel],G=s.goals;
  let h='';
  if(!save.tutorial&&!inShift) h+='<div class="banner"><div><b>'+t('menu.play.tutTitle')+'</b><span>'+t('menu.play.tutBody')+'</span></div><button class="btn primary" data-a="tutorial">'+ICON.play+t('menu.play.tutStart')+'</button></div>';
  h+='<div class="sites">'+SITES.map(siteCard).join('')+'</div>';
  h+='<div class="m-grid"><div class="m-box brief"><h2>'+t('menu.play.goals',{site:esc(s.name)})+'</h2><p class="note">'+t('menu.play.hours')+'</p><ul>'+
    '<li><span>'+t('menu.play.goalPallets')+'</span><b>'+G.recv+'</b></li><li><span>'+t('menu.play.goalOrders')+'</span><b>'+G.ship+'</b></li><li><span>'+t('menu.play.goalOntime')+'</span><b>'+G.ontime+'%</b></li></ul>'+
    '<ul class="rules"><li>'+t('menu.play.rule1')+'</li><li>'+t('menu.play.rule2')+'</li><li>'+t('menu.play.rule3')+'</li><li>'+t('menu.play.rule4')+'</li></ul></div>'+
    '<div class="m-box"><h2>'+t('menu.play.winTitle')+'</h2><ul class="rules" style="margin-top:4px"><li>'+t('menu.play.win1')+'</li><li>'+t('menu.play.win2')+'</li><li>'+t('menu.play.win3')+'</li><li>'+t('menu.play.win4')+'</li></ul></div></div>';
  return h;
}
function snpSheetDaily(t_,inShift){
  const today=todayKey(), D=dailySpec(today), doneToday=save.daily.last===today;
  const S=SITES[D.site], best=save.daily.best[today], sk=streakNow(), reward=40+10*Math.min((save.daily.last===dayOffset(-1)?save.daily.streak:0)+1,7);
  let h='<div class="daily-card"><div class="dh"><div><div class="date">'+today+'</div><h2>'+esc(S.name)+'</h2></div><span class="pill flame" style="margin-left:auto">'+t('menu.daily.same')+'</span></div>'+
    '<div class="mods">'+D.mods.map(m=>'<div class="mod"><b>'+MODS[m].name+'</b><small>'+MODS[m].desc+'</small></div>').join('')+'</div>'+
    '<div class="m-grid" style="margin-top:12px"><div class="m-box brief"><ul><li><span>'+t('menu.daily.target')+'</span><b>'+fmtN(D.target)+'</b></li><li><span>'+t('menu.daily.best')+'</span><b>'+(best!=null?fmtN(best):'—')+'</b></li><li><span>'+t('menu.daily.reward')+'</span><b>'+(doneToday?t('menu.daily.claimed'):'+'+reward+' cr')+'</b></li></ul></div>'+
    '<div class="m-box"><h2><span class="flame" style="font-size:15px">'+ICON.flame+t('menu.daily.streak',{n:sk})+'</span></h2><p class="note">'+t('menu.daily.streakNote',{best:save.daily.bestStreak})+'</p>'+weekStrip()+'</div></div></div>';
  if(!unlocked(D.site)) h+='<p class="note" style="margin-top:10px;color:var(--ink-3)">'+t('menu.daily.preview')+'</p>';
  return h;
}
function snpSheetUp(t_,inShift){
  return '<div class="m-grid" style="margin-top:0">'+'<div class="m-box"><h2>'+t('menu.shop.townTitle')+'</h2><p class="note">'+t('menu.shop.townNote',{inc:town.econ.net.toFixed(1)})+'</p><button class="btn ghost" data-a="town">'+ICON.map+t('menu.shop.townOpen')+'</button></div>'+upgradesBox()+cosBox('fl',t('menu.shop.flTitle'),t('menu.shop.flNote'))+cosBox('van',t('menu.shop.vanTitle'),t('menu.shop.vanNote'))+'<div class="m-box"><h2>'+t('menu.shop.buildTitle')+'</h2><p class="note">'+t('menu.shop.buildNote')+'</p>'+
    '<button class="btn ghost" data-a="build"'+(inShift?' disabled':'')+'>'+ICON.hammer+t('menu.shop.buildOpen',{site:esc(SITES[game.menuSel].name)})+'</button>'+(inShift?'<p class="note" style="margin-top:8px">'+t('menu.shop.betweenShifts')+'</p>':'')+'</div></div>';
}
function snpSheetAch(t_,inShift){
  return '<div class="achs">'+ACH.map(a=>{const got=save.ach[a.id];return '<div class="achv'+(got?' got':'')+'"><span class="ai">'+(got?ICON.trophy:ICON.lock)+'</span><div><b>'+esc(a.name)+'</b><small>'+esc(a.desc)+'</small>'+(got?'<time>'+new Date(got).toLocaleDateString()+'</time>':'')+'</div></div>';}).join('')+'</div>';
}
function careerBox(t_){
  const S=save.stats;
  return '<div class="m-box"><h2>'+t('menu.career.title')+'</h2><div class="statgrid">'+
    [['shifts',S.shifts],['pallets',S.pallets],['orders',S.orders],['rush',S.rush],['threeStars',S.threeStars],['bestScore',S.bestScore],['fixes',S.fixes],['builds',S.builds],['bestStreak',save.daily.bestStreak]].map(([l,v])=>'<div class="mini"><label>'+t('menu.career.'+l)+'</label><b>'+fmtN(v)+'</b></div>').join('')+'</div>'+
    '<h2 style="margin-top:14px">'+t('menu.keys.title')+'</h2><div class="keys"><kbd>Space</kbd><span>'+t('menu.keys.space')+'</span><kbd>1</kbd><span>'+t('menu.keys.one')+'</span><kbd>2</kbd><span>'+t('menu.keys.two')+'</span><kbd>B</kbd><span>'+t('menu.keys.b')+'</span><kbd>M</kbd><span>'+t('menu.keys.m')+'</span><kbd>/</kbd><span>'+t('menu.keys.slash')+'</span><kbd>Esc</kbd><span>'+t('menu.keys.esc')+'</span></div></div>';
}
function menuFoot(t_,inShift){
  let h='';
  if(inShift) h='<button class="btn primary" data-a="resume">'+ICON.play+t('menu.foot.resume')+'</button><button class="btn ghost" data-a="restart">'+t('menu.foot.restart')+'</button><button class="btn link" data-a="end">'+t('menu.foot.end')+'</button>';
  else if(t_==='daily') h='<button class="btn flame" data-a="daily">'+ICON.flame+(save.daily.best[todayKey()]!=null?t('menu.foot.playAgain'):t('menu.foot.startDaily'))+'</button><button class="btn link" data-a="free">'+t('menu.foot.backYard')+'</button>';
  else if(t_==='play') h='<button class="btn primary" data-a="start">'+ICON.play+t('menu.foot.startShift',{site:esc(SITES[game.menuSel].name)})+'</button><button class="btn link" data-a="free">'+t('menu.foot.freePlay')+'</button>';
  else h='<button class="btn ghost" data-a="free">'+t('menu.foot.backYard')+'</button>';
  return h;
}
function snpSheet(){
  if(!modalView)return;
  let h='',header='',nav=null,content=null,career=null,foot='';
  const inShift=game.phase==='shift';
  if(modalView==='menu'){
    const tb=game.menuTab;
    header=menuHeader();
    const achN=Object.keys(save.ach).length, doneToday=save.daily.last===todayKey();
    nav={cur:tb,list:[['play',t('menu.nav.play'),false],['daily',t('menu.nav.daily'),!doneToday],['up',t('menu.nav.shop'),false],['ach',t('menu.nav.ach',{n:achN,total:ACH.length}),false],['me',t('menu.nav.profile'),false]]};
    if(tb==='play')content=snpSheetPlay(tb,inShift);
    else if(tb==='daily')content=snpSheetDaily(tb,inShift);
    else if(tb==='up')content=snpSheetUp(tb,inShift);
    else if(tb==='ach')content=snpSheetAch(tb,inShift);
    else if(tb==='me')career=careerBox(tb);
    foot=menuFoot(tb,inShift);
  }else if(modalView==='report'){
    const R=game.lastReport,G=site.goals,st=R.st,Lg=R.ledger;
    const msg=R.mode==='daily'?(R.daily.cleared?t('menu.report.msgDailyOk'):t('menu.report.msgDailyMiss')):R.stars===3?t('menu.report.msg3'):R.stars===2?t('menu.report.msg2'):R.stars===1?t('menu.report.msg1'):t('menu.report.msg0');
    const lvUp=R.levelAfter>R.levelBefore, lvl=R.levelAfter;
    const span=xpFor(lvl+1)-xpFor(lvl), pctAfter=Math.min(100,(R.xpAfter-xpFor(lvl))/span*100), pctBefore=lvUp?0:Math.min(100,(R.xpBefore-xpFor(lvl))/span*100);
    h+='<div class="m-top"><div><h1>'+(R.mode==='daily'?t('menu.report.titleDaily',{site:esc(site.name)}):t('menu.report.titleShift',{site:esc(site.name)}))+'</h1><p class="lede">'+msg+'</p></div><div class="who"><div class="credits"><label>'+t('menu.report.creditsEarned')+'</label><b>+'+R.credits+'</b></div></div></div>';
    h+='<div class="report-hero"><div class="big-score">'+fmtN(R.score)+'</div><div class="big-stars">'+starRow(R.stars)+'</div>'+
      '<div class="xpline"><div class="lab"><span>'+t('menu.report.level',{n:lvl})+' · '+rankOf(lvl)+'</span><span>+'+fmtN(R.xpGain)+' XP</span></div><div class="meter gold"><i id="xpFill" style="width:'+pctBefore+'%" data-to="'+pctAfter+'"></i></div></div></div>';
    if(lvUp) h+='<div class="callout gold">'+ICON.up+t('menu.report.promoted',{rank:rankOf(lvl)})+'</div>';
    if(R.daily) h+='<div class="callout '+(R.daily.cleared?'flame':'mute')+'">'+ICON.flame+(R.daily.cleared?(R.daily.newClear?t('menu.report.dailyNew',{streak:R.daily.streak,reward:R.daily.reward}):t('menu.report.dailyAgain',{best:fmtN(R.daily.best)})):t('menu.report.dailyMiss',{target:fmtN(R.daily.target),score:fmtN(R.score)}))+'</div>';
    if(R.newUnlock) h+='<div class="callout ok">'+t('menu.report.unlocked',{site:esc(R.newUnlock.name)})+' '+esc(R.newUnlock.blurb)+'</div>';
    if(R.ledger&&R.ledger.hands) h+='<div class="callout gold">'+ICON.target+t('menu.report.hands',{n:R.ledger.hands})+'</div>';
    if(R.st.missed) h+='<div class="callout mute">'+ICON.clock+tn('menu.report.missedReq',R.st.missed)+'</div>';
    if(R.st.del) h+='<div class="callout ok">'+ICON.truck+t('menu.report.deliveries',{cr:R.st.del,on:R.st.delOn||0})+'</div>';
    if(R.st.town) h+='<div class="callout ok">'+ICON.map+t('menu.report.town',{cr:R.st.town})+'</div>';
    if(R.ach.length) h+='<div class="callout gold">'+ICON.trophy+tn('menu.report.newAch',R.ach.length)+': '+R.ach.map(id=>esc(ACH.find(a=>a.id===id).name)).join(', ')+'</div>';
    h+='<div class="m-grid"><div class="m-box brief"><h2>'+t('menu.report.goals')+'</h2><ul>'+
      '<li><span>'+(R.met[0]?'✓ ':'✗ ')+t('menu.play.goalPallets')+'</span><b>'+st.recv+' / '+G.recv+'</b></li>'+
      '<li><span>'+(R.met[1]?'✓ ':'✗ ')+t('menu.play.goalOrders')+'</span><b>'+st.shipOn+' / '+G.ship+'</b></li>'+
      '<li><span>'+(R.met[2]?'✓ ':'✗ ')+t('menu.report.goalOntime',{pct:G.ontime})+'</span><b>'+(R.n?Math.round(R.otr)+'%':'—')+'</b></li>'+
      '<li><span>'+t('menu.report.bestCombo')+'</span><b>'+t('menu.report.inARow',{n:R.bestCombo})+'</b></li></ul></div>'+
      '<div class="m-box"><h2>'+t('menu.report.ledgerTitle')+'</h2><ul class="ledger">'+
      '<li><span>'+t('menu.report.lPut')+'</span><b>+'+Lg.put+'</b></li><li><span>'+t('menu.report.lShip')+'</span><b>+'+Lg.ship+'</b></li><li><span>'+t('menu.report.lRush')+'</span><b>+'+Lg.rush+'</b></li><li><span>'+t('menu.report.lCombo')+'</span><b>+'+Lg.combo+'</b></li><li><span>'+t('menu.report.lTurn',{n:st.fast})+'</span><b>+'+Lg.turn+'</b></li>'+
      '<li><span>'+t('menu.report.lLate',{n:st.lateOrders})+'</span><b class="neg">'+Lg.late+'</b></li><li><span>'+t('menu.report.lBack',{n:st.backorders})+'</span><b class="neg">'+Lg.back+'</b></li><li><span>'+t('menu.report.lDet')+'</span><b class="neg">'+Lg.det+'</b></li><li><span>'+t('menu.report.lSpent')+'</span><b class="neg">'+Lg.spent+'</b></li></ul></div></div>';
    const next=R.mode!=='daily'&&game.siteIdx+1<SITES.length&&unlocked(game.siteIdx+1)?game.siteIdx+1:null;
    h+='<div class="m-foot">'+(R.mode==='daily'?'<button class="btn flame" data-a="daily">'+ICON.flame+t('menu.report.tryDaily')+'</button>':'<button class="btn primary" data-a="replay">'+ICON.play+t('menu.report.replay',{site:esc(site.name)})+'</button>')+
      (next!=null?'<button class="btn ghost" data-a="next">'+t('menu.report.goTo',{site:esc(SITES[next].name)})+'</button>':'')+
      '<button class="btn ghost" data-a="upgrades">'+t('menu.report.shop')+'</button><button class="btn link" data-a="menu">'+t('menu.report.menu')+'</button></div>';
    header=h;
  }
  put('sheet',{open:true,view:modalView,header,nav,content,career,foot,
    me:!!nav&&nav.cur==='me',
    settings:{sound:save.settings.sound,music:save.settings.music,vol:save.settings.vol,inShift,confirm:confirmReset},
    welcome:game.welcome||null});
}
function menuTab(k){game.menuTab=k;confirmReset=false;snpSheet();}
function menuSite(i){if(game.menuSel===i)return;game.menuSel=i;if(game.phase!=='shift')freePlay(i);snpSheet();}
function buyUp(key){
  const u=UPGRADES.find(x=>x.key===key); if(!u)return; const lv=save.up[u.key],c=u.costs[lv];
  if(c==null||save.credits<c)return; save.credits-=c; save.up[u.key]++; writeSave(); Snd.play('build');
  toast('info',t('menu.toast.upgraded',{name:u.name}),t('menu.toast.upgradedBody',{lv:save.up[u.key],c}),ICON.up);
  if(UPGRADES.every(x=>save.up[x.key]>=x.costs.length))unlock('maxed');
  snpSheet();
}
function buyCos(id){
  const c=COSMETICS.find(x=>x.id===id); if(!c||save.credits<c.cost)return;
  save.credits-=c.cost; save.cos.owned.push(c.id); equipCos(id); Snd.play('build');
  toast('info',t('menu.toast.bought',{name:c.name}),t('menu.toast.boughtBody',{c:c.cost}),ICON.star); unlock('stylist');
  snpSheet();
}
function setSetting(k,v){save.settings[k]=v;writeSave();Snd.init();Snd.apply();syncSound();snpSheet();}
function setVol(v){save.settings.vol=+v;Snd.apply();writeSave();}
function menuAction(a){
  if(a==='start')startShift(game.menuSel,'normal');
  else if(a==='tutorial'){game.menuSel=0;startShift(0,'tutorial');}
  else if(a==='daily')startShift(0,'daily');
  else if(a==='free'){if(game.phase!=='free')freePlay();closeModal();setSpeed(1);dirty=true;}
  else if(a==='resume'){closeModal();setSpeed(prevSpeed||1);}
  else if(a==='restart'||a==='replay')startShift(game.siteIdx,game.mode==='tutorial'?'normal':game.mode);
  else if(a==='end'){closeModal();setSpeed(1);endShift();}
  else if(a==='next')startShift(game.siteIdx+1,'normal');
  else if(a==='menu'){freePlay();openMenu('play');}
  else if(a==='upgrades'){freePlay();openMenu('up');}
  else if(a==='town'){enterTown();}
  else if(a==='build'){if(game.menuSel!==game.siteIdx)freePlay(game.menuSel);enterBuild();}
  else if(a==='reset'){confirmReset=true;snpSheet();}
  else if(a==='resetno'){confirmReset=false;snpSheet();}
  else if(a==='resetyes'){save=defaults();writeSave();confirmReset=false;game.menuSel=0;freePlay(0);Snd.apply();syncSound();toast('info',t('menu.toast.reset'),t('menu.toast.resetBody'),ICON.box);resetTown();snpSheet();}
}

/* ---------------- top bar: buttons and dropdowns ---------------- */
let bellOpen=false,siteDDOpen=false;
function openBellDD(){closeSiteDD();bellOpen=true;unread=0;pushBell();putLive({bellDD:true});}
function closeBellDD(){if(!bellOpen)return;bellOpen=false;putLive({bellDD:false});}
function openSiteDD(){closeBellDD();siteDDOpen=true;putLive({siteDD:true,siteDdHtml:snpSiteDD()});}
function closeSiteDD(){if(!siteDDOpen)return;siteDDOpen=false;putLive({siteDD:false});}
function closeDDs(){closeBellDD();closeSiteDD();}
document.addEventListener('pointerdown',e=>{
  if(!e.target||!e.target.closest)return;
  const t=e.target;
  if(t.closest('.dd')||t.closest('.site')||t.closest('.bell'))return;
  closeDDs();
},true);
function clearNotices(){notices.length=0;unread=0;pushBell();putLive({bellUnread:0});}
function ddSite(i){
  closeDDs();
  if(i===game.siteIdx){if(viewIdx()===i&&view.zoom>0.5){defaultView();}else flyToSite(i,false);return;}
  flyToSite(i,true);
  if(game.phase==='shift')toast('info',t('menu.toast.viewing',{site:SITES[i].name}),t('menu.toast.viewingBody',{site:site.name}),ICON.lock);
  else if(!unlocked(i))toast('info',t('menu.toast.locked',{site:SITES[i].name}),t('menu.toast.lockedBody',{site:SITES[i-1].name}),ICON.lock);
}
function ddNet(){closeDDs();exitTown();select(null);game.fly=null;view.targetT.set(4,0,6);view.zoomT=innerWidth<=760?0.08:0.105;}
function syncSound(){const on=save.settings.sound||save.settings.music;putLive({soundOn:on});}

/* ---------------- controls ---------------- */
function setSpeed(s){sim.speed=s;putLive({speed:s,paused:s===0,clockLbl:s===0?t('menu.clock.paused'):(game.phase==='shift'?(game.mode==='daily'?t('menu.clock.daily'):t('menu.clock.shift')):t('menu.clock.live'))});}
function speedClick(s){if(game.building)return;setSpeed(+s);}
function callTruck(){if(game.building)return;const sh=scheduleTruck(2);log(t('menu.log.booked',{id:sh.id,car:sh.car.name}),'info');if(innerWidth>760)setTab('dock');}
function toggleBuild(){game.building?exitBuild():enterBuild();}
function toggleTown(){game.town?exitTown():enterTown();}
function toggleMute(){
  const on=save.settings.sound||save.settings.music;
  save.settings.sound=!on;save.settings.music=!on;writeSave();Snd.init();Snd.apply();syncSound();
}
function zoomIn(){view.zoomT=clamp(view.zoomT*1.25,.55,3.2);}
function zoomOut(){view.zoomT=clamp(view.zoomT/1.25,.08,3.2);}
function rotL(){view.azT-=Math.PI/2;}
function rotR(){view.azT+=Math.PI/2;}
function resetCam(){view.azT=Math.round((view.azT-Math.PI/4)/TAU)*TAU+Math.PI/4;defaultView();resize();}

/* ---------------- search ---------------- */
let qFocusN=0;
function focusSearch(){putLive({focusSearch:++qFocusN});}
function doSearch(v){
  v=(v||'').trim().toUpperCase(); if(!v)return true;
  const o=[...trucks,...forklifts].find(x=>x.id.includes(v)||(x.car&&x.car.name.toUpperCase().includes(v)));
  if(o){select(o);focusOn(o);return true;}
  if(sim.orders.some(x=>x.id.includes(v))){setTab('ord');return true;}
  const k=SKU_KEYS.find(k=>SKUS[k].name.toUpperCase().includes(v)||SKUS[k].code.includes(v));
  if(k){hl=k;setTab('inv');dirty=true;setTimeout(()=>{hl=null;dirty=true;},3500);return true;}
  return false;
}

/* ---------------- keyboard ---------------- */
addEventListener('keydown',e=>{
  if(e.target&&e.target.closest&&e.target.closest('input,textarea'))return;
  if(modalView){if(e.key==='Escape'&&modalView==='menu'){if(game.phase==='shift'){closeModal();setSpeed(prevSpeed||1);}else{closeModal();setSpeed(1);}}return;}
  if(e.key==='/'){e.preventDefault();if(!game.building&&!game.town)focusSearch();}
  else if(e.key==='Escape'){if(bellOpen||siteDDOpen)closeDDs();else if(game.town)exitTown();else if(game.building)exitBuild();else select(null);}
  else if(e.key===' '){e.preventDefault();if(!game.building)setSpeed(sim.speed?0:1);}
  else if((e.key==='b'||e.key==='B')){game.building?exitBuild():enterBuild();}
  else if((e.key==='t'||e.key==='T')){game.town?exitTown():enterTown();}
  else if(game.town&&(e.key==='z'||e.key==='Z')&&(e.ctrlKey||e.metaKey)){undoTown();}
  else if((e.key==='m'||e.key==='M')){openMenu();}
  else if(game.incident&&/^[12]$/.test(e.key)){chooseIncident(+e.key-1);}
});
let hintGone=false;function hideHint(){if(hintGone)return;hintGone=true;putLive({hint:false});}

/* ---------------- loop ---------------- */
let perf=0,last=performance.now(),hudT=0,slowT=0;
const pulses={combo:0,score:0};
const tmpV=new THREE.Vector3();
function tick(now){
  try{tickBody(now);}catch(e){console.error('tick error',e);}
  requestAnimationFrame(tick);
}
function tickBody(now){
  let rdt=Math.min(.05,Math.max(0,(now-last)/1000)); last=now; if(document.hidden)rdt=0; perf+=rdt;
  const dt=rdt*sim.speed;
  if(dt>0){
    sim.sec+=dt;
    save.simClock+=dt;
    tickConstr(dt);
    const surge=game.surgeUntil>sim.sec;
    sim.nextOrder-=dt*(surge?2:1);
    if(sim.nextOrder<=0){ releaseOrder(); sim.nextOrder=rand(site.orderRate[0],site.orderRate[1])*(game.mods.has('calm')?0.77:1); }
    sim.nextTruck-=dt;
    if(sim.nextTruck<=0){ if(sim.enroute.length<3) scheduleTruck(irand(8,20),false); sim.nextTruck=rand(site.truckRate[0],site.truckRate[1]); }
    for(let i=0;i<sim.enroute.length;i++){
      const sh=sim.enroute[i]; if(clockMin()<sh.eta)continue;
      if(trucks.filter(t=>t.state==='queued').length>=4)break;
      sim.enroute.splice(i,1); i--; spawnTruck(sh,null); log(t('menu.log.arrived',{id:sh.id,car:sh.car.name}),''); if(Math.random()<.35)Snd.play('horn');
    }
    dispatchQueue();
    trucks.slice().forEach(t=>updateTruck(t,dt));
    lites.forEach(Lt=>{updateLite(Lt,dt);liteXferTick(Lt,dt);}); updateXfers(dt);
    forklifts.forEach(f=>updateForklift(f,dt));
    for(let i=forklifts.length-1;i>=0;i--){const f=forklifts[i];if(f.remove){world.remove(f.g);forklifts.splice(i,1);if(selected===f)select(null);}}
    staging.forEach(s=>{if(!s.pallet)return;s.t+=dt;
      if(s.t>6){s.pallet.scale.setScalar(Math.max(.001,1-(s.t-6)/0.8));
        if(s.t>6.8){world.remove(s.pallet);s.pallet=null;sim.shipped++;const o=s.order;s.order=null;queueDelivery(o);log(t('menu.log.shipped',{id:o?o.id:t('menu.log.order')})+(o&&o.stagedAt>o.due?' '+t('menu.log.late'):''),o&&o.stagedAt>o.due?'warn':'ok');}}});
    slowT+=dt;
    if(slowT>=1){slowT=0;lateCheck();clearSpills();
      if(game.phase==='shift'){
        game.nextEvent-=1; if(game.nextEvent<=0){rollEvent();game.nextEvent=rand(site.eventRate[0],site.eventRate[1]);}
        SKU_KEYS.forEach(checkLow);
        if(sim.sec>=SHIFT_LEN) endShift();
      }}
    tickReqs(sim.speed?rdt:0);
    if(game.incident&&!tut){
      game.incident.t+=rdt;
      putLive({incidentT:Math.max(0,100-game.incident.t/game.incident.ttl*100)});
      if(game.incident.t>=game.incident.ttl) chooseIncident(game.incident.def||0);
    }
  }
  tutTick();
  bays.forEach(b=>{
    const want=b.truck&&(b.truck.state==='unloading'||(b.truck.state==='docking'&&b.truck.x<9))?1:0;
    b.open+=clamp(want-b.open,-rdt*0.9,rdt*0.9);
    const s=1-0.88*b.open; b.door.scale.y=s; b.door.position.y=3.85-3.6*s/2;
    const c=b.truck?(b.truck.state==='unloading'?'#e0564b':'#f0a623'):'#24b46e';
    b.lightMat.color.set(c);b.lightMat.emissive.set(c);
  });
  ghosts.forEach(g=>{const on=g.userData.build===buildSel;g.userData.mat.opacity=on?.38:.14+.08*Math.sin(perf*3);g.children[2].position.y=g.children[2].userData.y0==null?(g.children[2].userData.y0=g.children[2].position.y):g.children[2].userData.y0+Math.sin(perf*3)*.12;});
  const e=1-Math.pow(0.0015,rdt||0.016);
  if(game.fly){view.target.lerp(view.targetT,1-Math.pow(0.12,rdt||0.016));
    if(Math.abs(view.target.x-game.fly.x)<4){const f=game.fly;game.fly=null;if(f.activate&&f.i!==game.siteIdx)freePlay(f.i);else{view.zoomT=innerWidth<=760?1.15:1;dirty=true;}}}
  else view.target.lerp(view.targetT,e); view.az+=(view.azT-view.az)*e; view.zoom+=(view.zoomT-view.zoom)*e;
  placeCam();
  let ringObj=null;
  if(!selected&&tut&&TUT[tut.i]&&TUT[tut.i].hint3d){ringObj=trucks.find(t=>t.state==='unloading')||trucks[0];}
  ring.visible=!!ringObj;
  if(ringObj){ring.position.set(ringObj.x+OX,0.08,ringObj.z);const pulse=1+0.12*Math.sin(perf*5);ring.scale.set(6.4*pulse,2.2*pulse,1);ring.rotation.z=ringObj.yaw;}
  if(selected&&selected.kind==='pal'&&!selected.g.parent)select(null);
  if(selected){
    const p=selPos(selected);
    brk.position.set(p.x,p.y,p.z); brk.rotation.y=p.yaw;
    if(game.follow===selected) view.targetT.set(p.x,0,p.z);
    routeT+=rdt; if(routeT>0.3){routeT=0;rebuildRoute();}
    tmpV.set(p.x,p.y+p.h,p.z).project(cam);
    const tg=els.tag; if(tg){tg.hidden=false;
      tg.style.transform='translate('+((tmpV.x+1)/2*innerWidth)+'px,'+((1-tmpV.y)/2*innerHeight-8)+'px) translate(-50%,-100%)';
      tg.innerHTML=selLabel(selected);}
  }
  route.children.forEach(c=>{if(c.userData.head)c.userData.head.forEach(m=>m.position.y=m.userData.y0+Math.sin(perf*3)*.12);});
  staging.forEach(st=>{if(!st.pin)return;st.pin.visible=!!st.pallet;if(st.pallet)st.pin.userData.head.forEach(m=>m.position.y=m.userData.y0+Math.sin(perf*3+st.x)*.1);});
  barriers.forEach(b=>{const tn=t=>Math.hypot(wx(t)-21.6-b.ox,t.z-b.pz)<9.5;const near=b.kind==='tk'?(trucks.some(tn)||liteTrucks.some(tn)):vans.some(v=>Math.hypot(v.x-12-b.ox,v.z-b.pz)<5.5);b.open+=clamp((near?1:0)-b.open,-rdt*1.6,rdt*1.6);b.arm.rotation.z=b.dir*b.open*1.35;});
  if(town.pins){const pv=view.zoom<0.4,ps=Math.min(3,0.13/view.zoom)*46;town.pins.forEach(p=>{p.visible=pv&&!game.town;p.scale.set(ps,ps*140/640,1);});}
  if(shell.g){const tgt=(view.zoom<0.8||game.town)?1:0;shell.op+=(tgt-shell.op)*Math.min(1,rdt*4);const o=shell.op;shell.mats.forEach(m=>{m.opacity=o;m.depthWrite=o>0.98;});shell.g.visible=o>0.03;}
  for(let i=pops.length-1;i>=0;i--){const p=pops[i];p.t+=rdt;
    if(p.t>1.5){p.el.remove();pops.splice(i,1);continue;}
    tmpV.copy(p.p).project(cam);
    p.el.style.transform='translate('+((tmpV.x+1)/2*innerWidth)+'px,'+((1-tmpV.y)/2*innerHeight-p.t*34)+'px) translate(-50%,-100%)';
    p.el.style.opacity=String(p.t<1?1:1-(p.t-1)/.5);}
  updateCars(rdt*(sim.speed?Math.min(sim.speed,2):0.5)); updateVans(dt); if(dt>0)townAccrue(dt); updateTownHover();
  stepConfetti(rdt);
  Snd.music();
  renderer.render(scene,cam);
  putLive({clock:fmtT(clockMin())});
  hudT+=rdt;
  if(hudT>0.4||dirty){hudT=0;dirty=false;
    snpKpis();snpShift();snpPanel();snpTrack();snpInspector();snpActs();snpMissions();
    if(town.built)renderCityBadges();
    if(flashes.combo){flashes.combo=false;putLive({pCombo:++pulses.combo});}
    if(flashes.score){flashes.score=false;putLive({pScore:++pulses.score});}
  }
}

/* ---------------- boot ---------------- */
function boot(){
  const unlockedIdx=SITES.map((_,i)=>i).filter(unlocked);
  game.menuSel=unlockedIdx[unlockedIdx.length-1]||0;
  putLive({ready:true});
  loadSite(game.menuSel);
  addEventListener('resize',resize);
  setSpeed(1); snpIncident(); syncSound();
  game.menuTab=save.daily.last!==todayKey()&&save.tutorial&&save.stats.shifts>0?'daily':'play';
  welcomeBack(); pushBell(); snpSiteDD(); setInterval(writeSave,20000); document.addEventListener('visibilitychange',writeSave);
  snpSheetInit();
  // re-render every snapshot when the player switches language
  onLocaleChange(()=>{msDirty=true;dirty=true;setSpeed(sim.speed);snpIncident();snpCoach();pushBell();if(siteDDOpen)putLive({siteDdHtml:snpSiteDD()});if(modalView)snpSheet();});
  setTimeout(hideHint,14000);
  requestAnimationFrame(t=>{last=t;tick(t);});
}
function snpSheetInit(){
  const unlockedIdx=SITES.map((_,i)=>i).filter(unlocked);
  game.menuSel=unlockedIdx[unlockedIdx.length-1]||0;
  openModal('menu');
}
const fontsReady=document.fonts&&document.fonts.load?Promise.all([document.fonts.load('800 40px "Bricolage Grotesque"'),document.fonts.load('italic 800 40px "Bricolage Grotesque"'),document.fonts.load('600 20px Figtree')]).catch(()=>{}):Promise.resolve();
Promise.race([fontsReady,new Promise(r=>setTimeout(r,1800))]).then(boot);

/* ---------------- api ---------------- */
const api={
  // top bar
  brand:()=>openMenu(game.phase==='shift'?game.menuTab:'play'),
  levelChip:()=>openMenu('me'),
  speedClick, setSpeed, callTruck, toggleBuild, toggleTown, toggleMute,
  zoomIn, zoomOut, rotL, rotR, resetCam,
  openBellDD, closeBellDD, openSiteDD, closeSiteDD, closeDDs, clearNotices, ddSite, ddNet,
  doSearch,
  // panel
  setTab, panelHead(){if(innerWidth>760||game.building)return;plOpen=!plOpen;putLive({panelOpen:plOpen});setTimeout(updateSheetVar,30);},
  panelTool:k=>{if(game.town){game.townTool=k;dirty=true;snpPanel();}},
  panelRowClick(e){
    const t=e.target&&e.target.closest?e.target:null; if(!t)return;
    const tl=t.closest('[data-tool]'); if(tl&&game.town){game.townTool=tl.dataset.tool;dirty=true;snpPanel();return;}
    const db=t.closest('[data-dbuy]'); if(db){buyDel(db.dataset.dbuy);return;}
    const tro=t.closest('[data-trko]'); if(tro&&!t.closest('[data-act]')){game.trk='out';game.trkOrder=tro.dataset.trko;dirty=true;snpTrack();snpPanel();return;}
    const dv=t.closest('[data-van]'); if(dv){const v=vans.find(x=>x.id===dv.dataset.van);if(v){select(v);focusOn(v);}return;}
    const bb=t.closest('[data-buy-build]'); if(bb){buyBuild(bb.dataset.buyBuild);return;}
    const br=t.closest('[data-bkey]'); if(br&&game.building){buildSel=br.dataset.bkey;putLive({buildSel});const g=ghosts.find(x=>x.userData.build===buildSel);if(g)view.targetT.set(g.position.x+OX,0,g.position.z);dirty=true;snpPanel();return;}
    const a=t.closest('[data-act]');
    if(a){const [act,arg]=a.dataset.act.split(':');
      if(act==='prio')prioritize(arg);
      else if(act==='exp'){if(expedite(arg))spend(35);}
      else if(act==='xfer'){if(requestTransfer(arg))spend(15);}
      else if(act==='temp'){if(hireTemp(60))spend(60);}
      dirty=true;snpPanel();return;}
    const r=t.closest('[data-pick]');if(!r)return;const o=[...trucks,...forklifts].find(x=>x.id===r.dataset.pick);if(o){select(o);focusOn(o);}
  },
  // missions / acts / inspector / coach
  claimMission:i=>claimMission(+i),
  doAct,
  setHands,
  trackClick(e){
    const t=e.target&&e.target.closest?e.target:null; if(!t)return;
    const b=t.closest('[data-trk]'); if(b){closeDDs();game.trk=b.dataset.trk;game.trkOrder=null;if(selected&&['tk','fl','van','dest'].includes(selected.kind))select(null);dirty=true;snpTrack();return;}
    const f=t.closest('[data-focus]'); if(f){if(_trkFocus)focusOn(_trkFocus);else if(selected)focusOn(selected);}
  },
  inspClick(e){
    const t=e.target&&e.target.closest?e.target:null; if(!t)return;
    const b=t.closest('[data-ins]'); if(b){const a=b.dataset.ins;
      if(a==='close')select(null);else if(a==='follow'){game.follow=game.follow===selected?null:selected;}else if(a==='focus')focusOn(selected);else if(a==='run')flyToSite(+b.dataset.idx,true);
      snpInspector();return;}
    const tro=t.closest('[data-trko]');if(tro){game.trk='out';game.trkOrder=tro.dataset.trko;dirty=true;snpTrack();snpPanel();return;}
    const lp=t.closest('[data-lpick]');if(lp){const t2=liteTrucks.find(x=>x.id===lp.dataset.lpick);if(t2){select(t2);focusOn(t2);}return;}
    const g=t.closest('[data-goto]');if(g)setTab(g.dataset.goto);
  },
  actsClick(e){
    const t=e.target&&e.target.closest?e.target:null; if(!t)return;
    const h=t.closest('[data-hands]');if(h){setHands(h.dataset.hands==='1');return;}
    const b=t.closest('[data-ac]');if(b&&!b.disabled){const [i,a]=b.dataset.ac.split(':');doAct(+i,a);}
  },
  coachNext(){setSpeed(1);nextTut();},
  coachSkip(){endTutorial(false);},
  chooseIncident:i=>chooseIncident(+i),
  // build & town bars
  exitBuild:s=>exitBuild(s), exitTown, undoTown,
  // sheets
  menuTab, menuSite, buyUp, buyCos, equipCos, setSetting, setVol, menuAction,
  sheetXpTo:()=>{const xf=document.querySelector('#xpFill');if(xf&&xf.dataset&&xf.dataset.to)requestAnimationFrame(()=>requestAnimationFrame(()=>{xf.style.width=xf.dataset.to+'%';}));},
};
return api;
}
