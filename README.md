# Personal Map / 个人地图

Current release / 当前版本：`0.3.6`

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

当前自动测试 `10/10` 通过；已在 Obsidian 中验证高德搜索、选点、地点写入、券自动关联、重启恢复与桌面列表布局。
