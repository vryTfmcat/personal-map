import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { build } from "esbuild";

// Exercise real store/view code with a vault and AMap service double; no network or private notes.
class TFile { constructor(path) { this.path = path; this.basename = path.split("/").at(-1).replace(/\.md$/, ""); } }
class ItemView { constructor(leaf) { this.app = leaf.app; } }
const obsidian = { TFile, ItemView, App: class {}, Modal: class {}, FuzzySuggestModal: class {}, SuggestModal: class {},
  Notice: class {}, TFolder: class {}, normalizePath: p => p.replace(/\\/g, "/").replace(/\/{2,}/g, "/") };
async function load(entry) {
  const result = await build({entryPoints:[entry],bundle:true,write:false,format:"cjs",platform:"node",
    external:["obsidian","@amap/amap-jsapi-loader"]});
  const module = {exports:{}};
  const window = {setTimeout,clearTimeout};
  vm.runInNewContext(result.outputFiles[0].text, {module,exports:module.exports,window,console,
    require: name => name === "obsidian" ? obsidian : {load:()=>{throw Error("Unexpected network load");}}});
  return { ...module.exports, window };
}
const {PersonalMapStore} = await load("src/store.ts");
const viewModule = await load("src/view.ts");
const configPath = "30_项目/个人地图/配置/地图配置.md";
const centerPath = "50_实体/地点/住宅/我的地图中心.md";
function fixture(prefix="", extra={}) {
  const files = new Map();
  const fm = new Map();
  function note(path, data) { const file=new TFile(path); files.set(path,file); fm.set(path,data); return file; }
  note(prefix+configPath,{personalMapConfig:true,placesFolder:"50_实体/地点/外部地点",
    centerPlace:"[[50_实体/地点/住宅/我的地图中心]]",initialRadiusMeters:1000,...extra});
  note(prefix+centerPath,{personalMapPlace:true,placeId:"test-center",title:"我的地图中心",home:true,
    longitude:116.4,latitude:39.9,address:"测试公共地点"});
  files.set(prefix+"50_实体",{path:prefix+"50_实体"});
  files.set(prefix+"50_实体/地点/外部地点",{path:prefix+"50_实体/地点/外部地点"});
  const app={vault:{getAbstractFileByPath:p=>files.get(p),getMarkdownFiles:()=>[...files.values()].filter(f=>f instanceof TFile),
      cachedRead:async()=>"---\n---\n## 个人经验\n测试经验"},
    metadataCache:{getFileCache:f=>({frontmatter:fm.get(f.path)}),getFirstLinkpathDest:(target,source)=>{
      assert.ok(files.has(source),"resolve center relative to actual configuration file");
      const exact=files.get(target.endsWith(".md")?target:target+".md");
      if(exact instanceof TFile)return exact;
      return [...files.values()].find(f=>f instanceof TFile && f.path.endsWith("/"+(target.endsWith(".md")?target:target+".md"))) ?? null;
    }}};
  return {app,files,fm,note};
}
test("nested starter config resolves real center and wrapped places folder without moving notes", async()=>{
  const f=fixture("01-Projects-项目/"); const s=new PersonalMapStore(f.app);
  const config=await s.loadConfig(); const places=await s.loadPlaces(config);
  assert.equal(config.placesFolder,"01-Projects-项目/50_实体/地点/外部地点");
  assert.equal(config.initialRadiusMeters,1000);
  assert.equal(s.findHome(places).longitude,116.4);
});
test("vault-root config and explicit root places folder remain compatible",async()=>{
  const f=fixture(); const s=new PersonalMapStore(f.app);
  assert.equal((await s.loadConfig()).placesFolder,"50_实体/地点/外部地点");
});
test("explicit center wins over another home flag without rewriting notes",async()=>{
  const f=fixture(); f.fm.get(centerPath).home=false;
  f.note("50_实体/地点/外部地点/old.md",{personalMapPlace:true,home:true,longitude:114,latitude:22});
  const before=JSON.stringify([...f.fm]); const s=new PersonalMapStore(f.app);
  const home=s.findHome(await s.loadPlaces(await s.loadConfig()));
  assert.equal(home.longitude,116.4); assert.equal(home.home,true);
  assert.equal(JSON.stringify([...f.fm]),before);
});
test("multiple relocated configs and missing config report errors instead of a default city",async()=>{
  const f=fixture("nested/"); f.note("other/config.md",{personalMapConfig:true});
  await assert.rejects(()=>new PersonalMapStore(f.app).loadConfig(),/多份地图配置/);
  f.files.clear(); await assert.rejects(()=>new PersonalMapStore(f.app).loadConfig(),/未找到地图配置/);
});
test("broken explicit center link reports an actionable error",async()=>{
  const f=fixture("nested/"); f.files.delete("nested/"+centerPath);
  const s=new PersonalMapStore(f.app);
  const config=await s.loadConfig(); await assert.rejects(()=>s.loadPlaces(config),/中心链接无法解析/);
});

function fakeView(f) {
  const calls={};
  const AMap={plugin:(_,done)=>done(),Map:class {constructor(el,options){calls.map=options;}
    addControl(){} on(){} setZoomAndCenter(...args){calls.center=args;} setLimitBounds(){} destroy(){}},
    Scale:class{},ToolBar:class{},Bounds:class{},
    Geocoder:class{constructor(options){calls.geocoder=options;}},
    AutoComplete:class{constructor(options){calls.autocomplete=options;}},
    PlaceSearch:class{constructor(options){calls.search=options;}
      searchNearBy(...args){calls.nearby=args.slice(0,3);} search(...args){calls.keyword=args[0];}}};
  viewModule.window.AMap=AMap;
  const view=new viewModule.PersonalMapView({app:f.app},{getCredentials:()=>({key:"test",securityCode:"test"})});
  view.searchScope={value:"all"};
  view.mapEl={clientWidth:1000,clientHeight:700,empty(){}};
  for(const method of ["populateFilters","renderPlaceSource","renderOfflineList","renderMarkers","renderLocateHomePrompt","showDetails"])
    view[method]=()=>{};
  view.setStatus=()=>{};
  return {view,calls};
}
test("nested vault reopens at saved center and searches around that center without Shenzhen restriction",async()=>{
  const f=fixture("01-Projects-项目/");
  for(let i=0;i<2;i++) {
    const {view,calls}=fakeView(f); await view.refreshData(); await view.initializeMap();
    assert.equal(JSON.stringify(calls.map.center),"[116.4,39.9]");
    assert.equal(calls.search.city,"全国"); assert.equal(calls.search.citylimit,false);
    assert.equal(calls.autocomplete.city,"全国"); assert.equal(calls.geocoder.city,"全国");
    await view.searchNearby("测试店"); assert.equal(JSON.stringify(calls.nearby),JSON.stringify(["测试店",[116.4,39.9],5000]));
  }
});
test("configured search city updates service options on refresh",async()=>{
  const f=fixture("nested/",{searchCity:"北京"}); const {view,calls}=fakeView(f);
  await view.refreshData(); await view.initializeMap();
  assert.equal(calls.search.city,"北京"); assert.equal(calls.search.citylimit,true);
  f.fm.get("nested/"+configPath).searchCity="上海"; await view.refreshData();
  assert.equal(calls.autocomplete.city,"上海"); assert.equal(calls.geocoder.city,"上海");
});
test("unlocated center does not inject Shenzhen coordinates",async()=>{
  const f=fixture(); f.fm.get(centerPath).longitude=null; f.fm.get(centerPath).latitude=null;
  const {view,calls}=fakeView(f); await view.refreshData(); await view.initializeMap();
  assert.equal("center" in calls.map,false);
});


test("saved-only search never calls AMap, even when its service is available", async()=>{
  const {view,calls}=fakeView(fixture());
  await view.refreshData(); await view.initializeMap();
  view.searchScope.value="saved";
  let updated=0; view.updateCollection=()=>updated++;
  await view.searchNearby("测试店");
  assert.equal(updated,1); assert.equal(calls.nearby,undefined); assert.equal(calls.keyword,undefined);
});
test("late suggestions cannot replace saved-only results or a newer full search", async()=>{
  const {view}=fakeView(fixture());
  let callback; let renders=0;
  view.searchInput={value:"旧店"}; view.renderSearchResults=()=>renders++;
  view.autoComplete={search:(_,cb)=>{callback=cb;}};
  view.scheduleSuggestions();
  await new Promise(resolve=>setTimeout(resolve,320));
  view.searchScope.value="saved"; view.searchSequence++;
  callback("complete",{tips:[]}); assert.equal(renders,0);
});
test("selecting a distant saved place removes home limits and centers at street zoom",()=>{
  const {view}=fakeView(fixture()); const calls=[];
  view.map={clearLimitBounds:()=>calls.push(["bounds",null]),setZoomAndCenter:(z,c)=>calls.push(["focus",z,c]),getZoom:()=>12};
  view.highlightPlace=p=>calls.push(["highlight",p.title]);
  view.focusPlace({title:"远处门店",longitude:121.5,latitude:31.2});
  assert.equal(JSON.stringify(calls),JSON.stringify([["bounds",null],["focus",16,[121.5,31.2]],["highlight","远处门店"]]));
});
test("unlocated places never move the map to invalid coordinates",()=>{
  const {view}=fakeView(fixture()); let moved=false;
  view.map={setZoomAndCenter:()=>{moved=true;}};
  view.focusPlace({title:"待定位",longitude:null,latitude:null}); assert.equal(moved,false);
});
test("collection query combines normalized text, category, tags and voucher state",()=>{
  const {view}=fakeView(fixture());
  view.places=[{placeId:"cake",title:"示例烘焙坊芝士蛋糕",markerIcon:"emoji:🍰",address:"示例街道",tags:["甜食"],excerpt:"口味不错",placeType:"餐饮服务"},
    {placeId:"noodle",title:"示例面馆",markerIcon:"emoji:🍜",address:"示例社区",tags:[],excerpt:"",placeType:"餐饮服务"}];
  view.searchInput={value:"示例烘焙坊芝士"}; view.textFilter={value:"口味不错"};
  view.categoryFilter={value:"蛋糕 / 烘焙"}; view.tagFilter={value:"甜食"}; view.typeFilter={value:"餐饮服务"};
  view.benefitFilter={value:"available"}; view.activeBenefits=new Map([["cake",[{validTo:"2099-12-31"}]]]);
  assert.equal(view.filteredPlaces().length,1);
  view.benefitFilter.value="none"; assert.equal(view.filteredPlaces().length,0);
});
test("expired active coupons are excluded while today's coupons remain available",()=>{
  const f=fixture(); const store=new PersonalMapStore(f.app);
  const fields={couponSchedulerItem:true,entityType:"benefit",benefitStatus:"active",usablePlaceIds:["shop"]};
  f.note("old.md",{...fields,validTo:"2020-01-01"});
  const now=new Date(); const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  f.note("today.md",{...fields,validTo:today});
  f.note("used.md",{...fields,validTo:"2099-01-01",benefitStatus:"used"});
  const benefits=store.loadActiveBenefitsForPlace({placeId:"shop",file:{path:"shop.md"}});
  assert.equal(benefits.length,1); assert.equal(benefits[0].file.path,"today.md");
});
const {suggestCategory}=await load("src/categories.ts");
test("store identity wins over dishes on linked vouchers",()=>{
  assert.equal(suggestCategory("示例老火锅", "牛肉刀削面").emoji,"🍲");
  assert.equal(suggestCategory("示例生活超市", "芝士蛋糕").emoji,"🛒");
  assert.equal(suggestCategory("示例牛排馆", "黑椒炒饭").emoji,"🍽️");
  assert.equal(suggestCategory("示例服务店", "宠物洗护").emoji,"🐾");
});

const {benefitAvailability, searchBenefits, matchesBenefitScope}=await load("src/benefits.ts");
test("coupon availability handles expiry, future dates and terminal states consistently",()=>{
 const today="2026-11-16"; const active={benefitStatus:"active",validFrom:"",validTo:""};
 assert.equal(benefitAvailability({...active,validTo:today},today).available,true);
 assert.equal(benefitAvailability({...active,validTo:"2026-11-15"},today).label,"已过期");
 assert.equal(benefitAvailability({...active,validFrom:"2026-11-17"},today).label,"尚未开始");
 for(const status of ["used","void","unknown","expired"])
   assert.equal(benefitAvailability({...active,benefitStatus:status},today).available,false);
});
test("coupon searches hide historical items by default and rank available items first in all mode",()=>{
 const base={merchantName:"示例商户",validFrom:"",validTo:""};
 const rows=[{...base,title:"历史蛋糕券",benefitStatus:"used"},
 {...base,title:"当前蛋糕券",benefitStatus:"active",validTo:"2099-01-01"},
 {...base,title:"较早到期蛋糕券",benefitStatus:"active",validTo:"2098-01-01"},
 {...base,title:"过期蛋糕券",benefitStatus:"active",validTo:"2000-01-01"}];
 assert.equal(searchBenefits(rows,"示例商户 蛋糕","available").length,2);
 assert.equal(searchBenefits(rows,"示例商户","history").length,2);
 const all=searchBenefits(rows,"示例商户","all");
 assert.equal(all[0].title,"较早到期蛋糕券"); assert.equal(all[1].title,"当前蛋糕券");
 assert.equal(matchesBenefitScope(rows[0],"available"),false);
});
test("batch folder imports respect the selected availability scope",async()=>{
 const f=fixture(); const v=new viewModule.PersonalMapView({app:f.app},{});
 f.note("coupons/current.md",{couponSchedulerItem:true,entityType:"benefit",benefitStatus:"active",title:"现有券"});
 f.note("coupons/old.md",{couponSchedulerItem:true,entityType:"benefit",benefitStatus:"used",title:"历史券"});
 let imported; v.startBenefitImport=async sources=>{imported=sources;};
 const folder=new obsidian.TFolder();folder.path="coupons";
 await v.importBenefitSource(folder,"available");assert.equal(imported.length,1);assert.equal(imported[0].title,"现有券");
 await v.importBenefitSource(folder,"history");assert.equal(imported.length,1);assert.equal(imported[0].title,"历史券");
});
test("daily visit filter works independently from available vouchers",()=>{
 const {view}=fakeView(fixture());view.places=[{placeId:"daily",dailyVisit:true,title:"面店",markerIcon:"emoji:🍜",address:"",tags:[],excerpt:"",placeType:""},
 {placeId:"coupon",dailyVisit:false,title:"券店",markerIcon:"emoji:🍚",address:"",tags:[],excerpt:"",placeType:""}];
 view.benefitFilter={value:"daily"}; view.activeBenefits=new Map([["coupon",[{}]]]);
 assert.equal(view.filteredPlaces()[0].placeId,"daily");assert.equal(view.filteredPlaces().length,1);
});
test("daily flag persists across store reload and changing it touches only its field",async()=>{
 const f=fixture();const file=f.note("50_实体/地点/外部地点/daily.md",{personalMapPlace:true,placeId:"daily",title:"日常店",mapDailyVisit:true,markerIcon:"emoji:🍜",longitude:116.4,latitude:39.9});
 f.app.fileManager={processFrontMatter:async(file,cb)=>cb(f.fm.get(file.path))};
 const store=new PersonalMapStore(f.app);const config=await store.loadConfig();
 const place=(await store.loadPlaces(config)).find(p=>p.placeId==="daily");assert.equal(place.dailyVisit,true);
 const original={...f.fm.get(file.path)};await store.setDailyVisit(place,false);
 assert.equal(JSON.stringify(f.fm.get(file.path)),JSON.stringify({...original,mapDailyVisit:false}));
});
test("future-start linked benefits are not included in map available counts",()=>{
 const f=fixture();const store=new PersonalMapStore(f.app);
 f.note("future.md",{couponSchedulerItem:true,entityType:"benefit",benefitStatus:"active",validFrom:"2099-01-01",validTo:"2099-12-31",usablePlaceIds:["shop"]});
 assert.equal(store.loadActiveBenefitsForPlace({placeId:"shop",file:{path:"shop.md"}}).length,0);
});
