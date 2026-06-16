export type PizzaItem = {
  id: string;
  kind: "pizza";
  name: string;
  description: string;
  prices: {
    media: number;
    grande: number;
  };
};

export type SimpleItem = {
  id: string;
  kind: "simple";
  name: string;
  description?: string;
  price: number;
  options?: string[];
};

export type BordaOption = {
  id: string;
  name: string;
  price: number;
};

export type BordaGroup = {
  id: string;
  title: string;
  price: number;
  options: string[];
};

export type MenuCategory = {
  id: string;
  title: string;
  description?: string;
  items: (PizzaItem | SimpleItem)[];
};
