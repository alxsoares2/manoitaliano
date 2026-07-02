import { MenuItemRecord } from "@/types/menuItem";
import { PizzaItem, SimpleItem } from "@/types/menu";

export type MenuCategory = { id: string; title: string; sort_order: number; visible?: boolean };

export function toMenuItem(record: MenuItemRecord): PizzaItem | SimpleItem {
  if (record.kind === "pizza") {
    return {
      id: record.id,
      kind: "pizza",
      name: record.name,
      description: record.description ?? "",
      image_url: record.image_url,
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
    image_url: record.image_url,
    options: record.options ?? undefined,
    unavailableOptions: record.unavailable_options ?? undefined,
    sizesPrices: (record.price_executivo || record.price_individual || record.price_duplo) ? {
      executivo: record.price_executivo ?? undefined,
      individual: record.price_individual ?? undefined,
      duplo: record.price_duplo ?? undefined,
    } : undefined,
  };
}

export function groupActiveItemsByCategory(records: MenuItemRecord[], categories: MenuCategory[]) {
  return categories.filter((c) => c.visible !== false).map((category) => ({
    id: category.id,
    title: category.title,
    items: records
      .filter((record) => record.category_id === category.id && record.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(toMenuItem),
  })).filter((category) => category.items.length > 0);
}
