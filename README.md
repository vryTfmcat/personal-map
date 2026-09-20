# 个人地图

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
- 地点详情通过公开 Markdown 关系显示关联的有效券。

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

地图显示、输入建议、附近 POI 搜索、逆地理编码和“在高德打开”会连接高德地图服务。为完成这些功能，插件会向高德发送 API 凭据、用户输入的店名或商户名，以及当前地图中心、搜索范围或手动选点的坐标；不会把 Vault 中的地点正文、个人经验、券内容或其他 Markdown 文件上传到第三方，也不包含遥测或广告。

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

## 按需关联券到地点

打开一篇带有 `couponSchedulerItem: true`、`entityType: benefit` 的权益笔记，执行命令“个人地图：将当前券关联到地图地点”。插件会用 `merchantName` 预填高德搜索，但必须由用户确认实际门店。确认后只更新权益笔记的公开关系字段：

```yaml
usablePlaceIds:
  - "plc_01m..."
usableAt:
  - "[[50_实体/地点/外部地点/某门店-短ID|某门店]]"
```

地点详情会反查这些关系并显示 `benefitStatus: active` 的权益。地点主档不反向保存券列表。

## 独立性

本插件不读取、导入或依赖其他插件的数据、设置与源码。跨插件关联只读取当前笔记或库中公开的 Markdown 属性和 Obsidian 双链。
