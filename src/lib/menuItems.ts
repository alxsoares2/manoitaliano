import { MenuItemRecord } from "@/types/menuItem";
import { PizzaItem, SimpleItem } from "@/types/menu";
import { MENU_CATEGORIES } from "@/data/menuCategories";

export function toMenuItem(record: MenuItemRecord): PizzaItem | SimpleItem {
  if (record.kind === "pizza") {
    return {
      id: record.id,
      kind: "pizza",
      name: record.name,
      description: record.description ?? "",
      prices: {
        media: record.price_media ?? 0,
        grande: record.price_grande ?? 0,
      },
    };
  }

  return {
    id: record.id,
    kind: "simple",
    name: record.name,
    description: record.description ?? undefined,
    price: record.price ?? 0,
    options: record.options ?? undefined,
  };
}

export function groupActiveItemsByCategory(records: MenuItemRecord[]) {
  return MENU_CATEGORIES.map((category) => ({
    id: category.id,
    title: category.title,
    items: records
      .filter((record) => record.category_id === category.id && record.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(toMenuItem),
  })).filter((category) => category.items.length > 0);
}
