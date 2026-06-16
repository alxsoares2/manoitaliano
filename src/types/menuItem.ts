export type MenuItemKind = "pizza" | "simple";

export type MenuItemRecord = {
  id: string;
  category_id: string;
  kind: MenuItemKind;
  name: string;
  description: string | null;
  price: number | null;
  price_media: number | null;
  price_grande: number | null;
  options: string[] | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type MenuItemInput = Omit<MenuItemRecord, "id" | "created_at">;
