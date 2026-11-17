// Common voucher categories, with store identity taking priority over individual dishes.
export const PLACE_CATEGORIES = [
  { label: "火锅 / 汤锅", emoji: "🍲", color: "#dc2626", pattern: /火锅|猪肚鸡|椰子鸡|酱鸭煲|锅圈/ },
  { label: "烤鱼 / 酸菜鱼", emoji: "🐟", color: "#0284c7", pattern: /烤鱼|酸菜鱼|渔语鱼/ },
  { label: "烤肉 / 烧烤", emoji: "🥩", color: "#b45309", pattern: /烤肉|烧肉|烧烤|烧鸡|流浪泡泡|犀先生/ },
  { label: "牛排 / 西餐", emoji: "🍽️", color: "#9333ea", pattern: /牛排|西堤|gaga/i },
  { label: "披萨", emoji: "🍕", color: "#ea580c", pattern: /必胜客|披萨|比萨|达美乐/ },
  { label: "汉堡 / 三明治", emoji: "🍔", color: "#d97706", pattern: /汉堡|塔斯汀|赛百味/ },
  { label: "炸鸡 / 小食", emoji: "🍗", color: "#ea580c", pattern: /炸鸡|肯德基|kfc|鸡腿/i },
  { label: "烧腊 / 卤味", emoji: "🦆", color: "#b45309", pattern: /烤鸭|烧鹅|烧腊|卤味|鸭脖|绝味|紫燕|掂腊/ },
  { label: "米粉 / 面食", emoji: "🍜", color: "#ca8a04", pattern: /米线|羊肉粉|羊杂粉|面馆|小面|手工面|干挑面|拌粉|秦十娘|劉福湶|刘福湶/ },
  { label: "点心 / 小吃", emoji: "🥟", color: "#ca8a04", pattern: /牛肉饼|肉夹馍|水饺|肠粉|点心/ },
  { label: "粥 / 汤", emoji: "🥣", color: "#65a30d", pattern: /粥/ },
  { label: "茶餐厅", emoji: "🫖", color: "#0d9488", pattern: /茶餐厅|冰室|港湾/ },
  { label: "泰国 / 东南亚菜", emoji: "🍛", color: "#16a34a", pattern: /泰国|泰式|泰香米|泰曼里|东南亚/ },
  { label: "中餐 / 家常菜", emoji: "🥘", color: "#c2410c", pattern: /新疆菜|客家|湘菜|川菜|下饭菜|小碗菜|锅包肉|绿茶餐厅|阿娜尔|围龙屋/ },
  { label: "米饭 / 工作餐", emoji: "🍚", color: "#a16207", pattern: /饭|飯|小厨|厨房|白切|真功夫/ },
  { label: "蛋糕 / 烘焙", emoji: "🍰", color: "#db2777", pattern: /蛋糕|巴斯克|提拉米苏|初见的甜|烘焙|面包/ },
  { label: "糖水 / 甜品", emoji: "🍮", color: "#c026d3", pattern: /糖水|甜品|赵记|姜撞奶|豆花/ },
  { label: "奶茶 / 饮品", emoji: "🧋", color: "#a16207", pattern: /奶茶|茶铺|手作|柠茶|果茶/ },
  { label: "咖啡", emoji: "☕", color: "#78350f", pattern: /咖啡|coffee/i },
  { label: "零食 / 冰淇淋", emoji: "🍦", color: "#e11d48", pattern: /零食|冰淇淋|冰激凌|粒上皇|洽小可|好想来/ },
  { label: "超市 / 便利店", emoji: "🛒", color: "#2563eb", pattern: /盒马|超盒算|永辉|超市|便利|7.eleven/i },
  { label: "宠物洗护", emoji: "🐾", color: "#7c3aed", pattern: /宠物|猫洗澡/ },
  { label: "手工 / 体验", emoji: "🎨", color: "#0891b2", pattern: /拼豆|手工|3d打印|立刻次元/i },
  { label: "眼镜", emoji: "👓", color: "#475569", pattern: /眼镜|镜片/ },
  { label: "购物 / 其他", emoji: "🛍️", color: "#64748b", pattern: /小米之家|swatch|购物/i },
];
export function suggestCategory(title: string, benefitTitles = "") {
  return PLACE_CATEGORIES.find(category => category.pattern.test(title))
    ?? PLACE_CATEGORIES.find(category => category.pattern.test(benefitTitles));
}
export function categoryForPlace(place: { markerIcon: string; title: string; home?: boolean }): string {
  if (place.home) return "住宅";
  return PLACE_CATEGORIES.find(category => `emoji:${category.emoji}` === place.markerIcon)?.label
    ?? suggestCategory(place.title)?.label ?? "其他地点";
}
