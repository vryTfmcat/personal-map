# Personal Map / 个人地图

Current release / 当前版本：`0.3.7`

Personal Map is an independent Obsidian plugin for storing personal places as Markdown files and viewing them on AMap (Gaode Map). It is designed for users in China. The plugin supports AMap place search, nearby POIs, reverse geocoding, and navigation links while keeping place notes and personal experience in the user's vault.

The plugin loads the official AMap JavaScript API at runtime only after the user configures their own AMap Web JS API key. It does not collect telemetry, show advertisements, or upload vault notes to any third party.

一个完全独立的 Obsidian 地图插件。它使用高德地图 JS API 2.0 搜索和显示地点，以 `50_实体/地点/外部地点/` 中的一地点一篇 Markdown 作为普通地点数据源，并从配置链接读取家庭中心实体。

## 能力

- 电脑和手机共用相同地点 Markdown。
- 以家为中心的小范围固定地图。
- 高德附近 POI 搜索、输入建议、地址解析和手工地图选点。
- Lucide 或 Emoji 自定义标点，以及自定义颜色。
- 地点笔记正文自由记录个人经验；插件只改 frontmatter。
- 类型、标签、正文关键词筛选。
- 从标点跳转高德地图。
- 密钥缺失或离线时仍可打开地点笔记。
- 从当前权益 Markdown 按需搜索、创建或复用地点，并回写稳定 ID 与双链。
- 可选择单篇券 Markdown 或券文件夹，逐张确认高德门店并创建或复用地点。
- 地点详情显示通过公开 Markdown 关系关联的有效券。

## 安装与构建

```bash
npm install
npm test
npm run build
```

将 `main.js`、`manifest.json` 和 `styles.css` 放入：

```text
<Vault>/.obsidian/plugins/personal-map/
```

启用插件后，在 Obsidian 设置中填写自己申请的高德“Web 端（JS API）”Key 与安全密钥。密钥使用设备本地存储，不写入 Markdown。

## 地区与网络使用

本插件主要面向中国地区、使用高德地图服务的用户；它不是离线地图，也不适合作为高德服务覆盖范围以外的地图方案。

地图显示、输入建议、附近 POI 搜索、逆地理编码和“在高德打开”会连接高德地图服务。为完成这些功能，插件会向高德发送 API 凭据、用户输入的店名，以及当前地图中心、搜索范围或手动选点的坐标；不会把 Vault 中的地点正文、个人经验或其他 Markdown 文件上传到第三方，也不包含遥测或广告。

然后创建地图配置笔记，例如：

```yaml
---
personalMapConfig: true
placesFolder: "50_实体/地点/外部地点"
centerPlace: "[[50_实体/地点/住宅/家庭主档|家]]"
initialRadiusMeters: 3000
searchRadiusMeters: 5000
panLimitMeters: 5000
showHomeMarker: true
---
```

## 数据位置

- 地图配置：`30_项目/个人地图/配置/地图配置.md`
- 普通地点：`50_实体/地点/外部地点/*.md`
- 索引入口：`60_索引/地点/个人地图.md`
- 家庭中心：复用现有住宅主档，不建立第二份“家”

仓库不包含任何真实家庭地址、坐标、高德密钥或个人地点数据。上面的中心地点链接只是示例，请替换为自己的主档链接。

`longitude` 与 `latitude` 使用高德 `GCJ-02` 坐标系。`placeType` 保持实体层规范值，地图上的自由类型写入 `mapType`。家庭笔记初始只保存地址，经纬度在首次打开地图并确认位置后写入。

地图工具栏中的“从券添加地点”可以选择一篇券 Markdown，或选择包含多张券的文件夹建立处理队列。插件先用 `usablePlaceIds` 检查是否已经关联；已有唯一关系时直接打开该地点。尚未关联时使用券的 `merchantName` 查找地点：若库中只有一个名称完全一致的地点，会立即自动关联；否则显示高德 POI，点击结果后立即创建地点并自动关联，不再要求第二次保存确认。点击已有标点也会立即关联。关联会向券笔记写入 `usablePlaceIds` 与 `usableAt`，不需要再次执行命令。券 Markdown 本身不会被当作地图点或地点数据源。

也可以打开一篇带 `couponSchedulerItem: true`、`entityType: benefit` 的权益笔记，执行命令“个人地图：将当前券关联到地图地点”。地点主档不反向保存券列表。

## 独立性

本插件不读取、导入或依赖其他插件的设置、私有数据与源码。跨插件关联只通过公开 Markdown 属性或 Obsidian 双链完成。

## 验证

```bash
npm test
npm run build
```

0.3.7 自动测试 `18/18` 通过（含模拟回归）；以下为 0.3.6 历史实测：已在 Obsidian 中验证高德搜索、选点、地点写入、券自动关联、重启恢复与桌面列表布局。


## 0.3.7 配置与地区修复

- 默认路径的地图配置继续可用；若不存在，在 Vault 中识别唯一带 `personalMapConfig: true` 的笔记。多份候选时明确报错，不猜测。
- 支持把初始目录整体放到项目文件夹中；已存在的库根地点目录优先，否则识别同一项目外层下的地点目录。
- 中心链接相对于实际配置文件解析，`centerPlace` 明确指定的地点优先于旧 `home` 标记；显示中心不自动修改笔记。
- 配置可加 `searchCity: "北京"`（换成自己的城市）；留空默认全国，已有中心时 POI 搜索使用该中心坐标和搜索半径。
- 不再将搜索、地址解析或无坐标的初始地图固定到深圳。未定位时由高德默认视图展示，不代表已经确定中心。
- 本轮回归测试使用模拟 Vault 与高德接口，不代表真实高德账号或移动端已验收。

高德接口依据：https://lbs.amap.com/api/javascript-api-v2/guide/services/autocomplete


## 0.4.0 — 收藏检索与门店定位

- 图标选择器提供带中文名称的团购分类：火锅、烤鱼、烧烤、米粉面、工作餐、蛋糕、糖水、饮品、超市、宠物洗护、手工体验、眼镜等；新地点按门店名称优先建议样式，已保存的自定义样式保持不变。
- 点击收藏、搜索中的已保存门店或地图标点会自动居中并拉近地图；详情的“定位中心”可再次定位。选中地点以橙色光圈和店名突出显示，超出家庭浏览范围的门店也可以定位。“回到家”恢复家庭视野。
- 搜索范围分为“仅我的收藏”（默认，不请求高德）和“所有地点”（分别显示收藏与高德附近结果，沿用配置的搜索半径/城市）。切换范围或开始新查询后，旧异步建议不能覆盖当前结果。
- 收藏默认按团购分类分组，可折叠；支持名称/地址/经验、类型、标签、分类、关联可用券、7 天内到期组合筛选，以及按距离、到期、最近更新和名称排序。筛选同步作用于收藏列表和地图标点。
- 券状态以公开 Markdown 关联为准；未关联的券不会仅凭相似店名算入门店可用券，过期券不计入可用券。
- 原有地点不会在插件启动时自动迁移。个人库的图标替换属于有备份的一次性本地操作，不含在公开安装文件中。

验证：25 项自动回归测试、TypeScript 生产构建和真实 Obsidian / 高德搜索、远距离门店居中、分类图标联动验证。手机实机尚未验收。


## 0.4.1 — 券状态与日常直去（2026-11-16）

- “从券添加地点”默认只列当前可用券；可切换历史/不可用与全部，搜索后仍保持可用优先，同类按到期日排序。显示券状态、商户及有效期；批量选文件夹只导入当前范围内的券。
- 可用性统一依据 `benefitStatus: active` 与 `validFrom` / `validTo` 日期（含起止当天）；已使用、作废、过期、尚未开始及未知状态不计入可用券。此状态不解析正文中的每周营业/核销时段。地图与选择器使用同一判断。
- 地图标点绿色“券N”显示关联可用券数量，蓝色“常”表示日常直去（无需团购），两种角标可共存；无角标表示没有关联可用券。详情和列表同时显示状态说明。
- 地点 Markdown 可选布尔属性 `mapDailyVisit: true` 保存日常直去标记，默认 false。详情可开启/取消，左侧券状态筛选提供“日常直去（无需团购）”。标记不影响券关联，修改地点样式也保留标记。
- 打开地图时重新计算券状态，运行中跨日及恢复前台时自动刷新日期状态。
- 本次没有移动券文件，状态视图避免历史券干扰；个人库四家指定门店已添加日常标记，原笔记均有备份。

验证：31/31 自动回归、类型检查与构建通过；真实 Obsidian 验证状态切换、商户搜索可用优先、四家日常店筛选、券数量与两类角标共存。手机实机尚未验收。
