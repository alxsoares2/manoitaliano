import { MenuCategory, BordaGroup } from "@/types/menu";

export const bordaGroups: BordaGroup[] = [
  {
    id: "tradicionais",
    title: "Tradicionais",
    price: 12,
    options: ["Cream Cheese", "Cheddar", "Requeijão", "Mozzarella", "Gorgonzola"],
  },
  {
    id: "tradicionais-doces",
    title: "Tradicionais Doces",
    price: 12,
    options: ["Chocolate", "Chocolate Branco", "Chocolate Amargo"],
  },
  {
    id: "especiais",
    title: "Especiais",
    price: 15,
    options: ["Requeijão e Gorgonzola", "Requeijão e Cheddar", "Dois Amores", "Kit Kat"],
  },
];

export const menu: MenuCategory[] = [
  {
    id: "entradas",
    title: "Entradas",
    items: [
      {
        id: "crostini",
        kind: "simple",
        name: "Crostini",
        description:
          "Massa artesanal fina com parmesão e alecrim, acompanha molho pesto",
        price: 39,
      },
      {
        id: "mini-burrata-gratinada",
        kind: "simple",
        name: "Mini Burrata Gratinada",
        description:
          "Servida com tomates-cereja confitados, molho pesto fresco e rúcula, acompanha massa artesanal crocante",
        price: 69,
      },
    ],
  },
  {
    id: "favoritas-da-casa",
    title: "Favoritas da Casa",
    items: [
      {
        id: "basilico-royale",
        kind: "pizza",
        name: "Basílico Royale",
        description:
          "Molho de tomate artesanal, mozzarella, peito de peru, cream cheese, geleia de amora Queensberry, manjericão",
        prices: { media: 60, grande: 70 },
      },
      {
        id: "salaminho-italiano",
        kind: "pizza",
        name: "Salaminho Italiano",
        description: "Molho de tomate artesanal, mozzarella, salame italiano, gorgonzola",
        prices: { media: 63, grande: 73 },
      },
      {
        id: "pepperoni-sweet-chilli",
        kind: "pizza",
        name: "Pepperoni com Sweet Chilli",
        description: "Molho de tomate artesanal, mozzarella, pepperoni coberto por Sweet Chilli",
        prices: { media: 63, grande: 73 },
      },
    ],
  },
  {
    id: "classicas",
    title: "Clássicas",
    items: [
      {
        id: "calabresa",
        kind: "pizza",
        name: "Calabresa",
        description:
          "Molho de tomate artesanal, mozzarella, calabresa fatiada, cebola e orégano",
        prices: { media: 58, grande: 68 },
      },
      {
        id: "mozzarella",
        kind: "pizza",
        name: "Mozzarella",
        description: "Molho de tomate artesanal, mozzarella e orégano",
        prices: { media: 52, grande: 62 },
      },
      {
        id: "frango-requeijao",
        kind: "pizza",
        name: "Frango com Requeijão",
        description:
          "Molho de tomate artesanal, mozzarella, frango desfiado, requeijão cremoso e orégano",
        prices: { media: 58, grande: 68 },
      },
      {
        id: "portuguesa",
        kind: "pizza",
        name: "Portuguesa",
        description:
          "Molho de tomate artesanal, mozzarella, presunto de peru, ovos cozidos, pimentão verde, cebola e orégano",
        prices: { media: 59, grande: 69 },
      },
      {
        id: "marguerita",
        kind: "pizza",
        name: "Marguerita",
        description: "Molho de tomate artesanal, mozzarella, tomate, manjericão fresco e orégano",
        prices: { media: 55, grande: 65 },
      },
      {
        id: "quatro-queijos",
        kind: "pizza",
        name: "Quatro Queijos",
        description: "Molho branco, mozzarella, parmesão, gorgonzola e requeijão",
        prices: { media: 59, grande: 69 },
      },
      {
        id: "pepperoni",
        kind: "pizza",
        name: "Pepperoni",
        description: "Molho de tomate artesanal, mozzarella, requeijão, coberto com pepperoni e orégano",
        prices: { media: 60, grande: 70 },
      },
      {
        id: "lombo-requeijao",
        kind: "pizza",
        name: "Lombo com Requeijão",
        description:
          "Molho de tomate artesanal, mozzarella, lombo canadense, requeijão e orégano",
        prices: { media: 59, grande: 69 },
      },
      {
        id: "corn-bacon",
        kind: "pizza",
        name: "Corn & Bacon",
        description: "Molho de tomate artesanal, mozzarella argentina, milho, bacon e orégano",
        prices: { media: 59, grande: 69 },
      },
      {
        id: "camarao",
        kind: "pizza",
        name: "Camarão",
        description: "Molho de tomate artesanal, mozzarella argentina, requeijão, camarão e orégano",
        prices: { media: 69, grande: 79 },
      },
      {
        id: "rucula-tomate-seco",
        kind: "pizza",
        name: "Rúcula com Tomate Seco",
        description: "Molho de tomate artesanal, mozzarella, rúcula fresca e tomate seco",
        prices: { media: 59, grande: 69 },
      },
      {
        id: "peito-peru-cream-cheese",
        kind: "pizza",
        name: "Peito de Peru com Cream Cheese",
        description: "Molho de tomate artesanal, mozzarella e cream cheese enrolado no peito de peru",
        prices: { media: 59, grande: 69 },
      },
    ],
  },
  {
    id: "especiais-da-casa",
    title: "Especiais da Casa",
    items: [
      {
        id: "imperiale",
        kind: "pizza",
        name: "Imperiale",
        description:
          "Molho de tomate artesanal, mozzarella, peito de peru, cebola, champignon, provolone e orégano",
        prices: { media: 60, grande: 70 },
      },
      {
        id: "basilico-suprema",
        kind: "pizza",
        name: "Basílico Suprema",
        description: "Molho de tomate artesanal, peito de peru, cream cheese, pepperoni, manjericão e orégano",
        prices: { media: 60, grande: 70 },
      },
      {
        id: "tribeca",
        kind: "pizza",
        name: "Tribeca",
        description: "Molho de tomate artesanal, mozzarella, pepperoni, cheddar, bacon, parmesão e orégano",
        prices: { media: 59, grande: 69 },
      },
      {
        id: "pestoroni",
        kind: "pizza",
        name: "Pestoroni",
        description: "Molho de tomate artesanal, mozzarella, molho pesto da casa, pepperoni e orégano",
        prices: { media: 62, grande: 72 },
      },
      {
        id: "calabresa-especial",
        kind: "pizza",
        name: "Calabresa Especial",
        description: "Molho de tomate artesanal, mozzarella, calabresa, cebola caramelizada, cream cheese e orégano",
        prices: { media: 60, grande: 70 },
      },
      {
        id: "trilogia-di-salse",
        kind: "pizza",
        name: "Trilogia di Salse",
        description: "Mozzarella, molho de tomate artesanal, molho de vodka e molho pesto da casa",
        prices: { media: 60, grande: 70 },
      },
    ],
  },
  {
    id: "doces",
    title: "Doces",
    items: [
      {
        id: "kitkat-marshmallow",
        kind: "pizza",
        name: "Kit Kat e Marshmallow",
        description: "Mozzarella, pasta de chocolate Kit Kat e marshmallow maçaricados",
        prices: { media: 62, grande: 72 },
      },
      {
        id: "caramelito",
        kind: "pizza",
        name: "Caramelito",
        description: "Mozzarella, chocolate ao leite, doce de leite, castanha de caju e leite condensado",
        prices: { media: 62, grande: 72 },
      },
      {
        id: "dois-amores",
        kind: "pizza",
        name: "Dois Amores",
        description: "Mozzarella, chocolate ao leite e chocolate branco",
        prices: { media: 58, grande: 68 },
      },
      {
        id: "banana-nevada",
        kind: "pizza",
        name: "Banana Nevada",
        description: "Mozzarella, creme de leite, banana, creme de avelã e canela",
        prices: { media: 58, grande: 68 },
      },
      {
        id: "chocolate",
        kind: "pizza",
        name: "Chocolate",
        description: "Mozzarella e chocolate ao leite",
        prices: { media: 58, grande: 68 },
      },
      {
        id: "morango-avela",
        kind: "pizza",
        name: "Morango e Avelã",
        description: "Mozzarella, creme de avelã e morangos selecionados fatiados",
        prices: { media: 62, grande: 72 },
      },
    ],
  },
  {
    id: "bebidas",
    title: "Bebidas",
    items: [
      {
        id: "agua-mineral",
        kind: "simple",
        name: "Água Mineral",
        description: "500ml",
        price: 6,
        options: ["Com gás", "Sem gás"],
      },
      {
        id: "refrigerante",
        kind: "simple",
        name: "Refrigerante",
        price: 8,
        options: ["Coca-Cola", "Coca Zero", "Guaraná Kuat", "Fanta Laranja", "Sprite"],
      },
      {
        id: "heineken",
        kind: "simple",
        name: "Heineken",
        description: "Long Neck 330ml",
        price: 12,
        options: ["Tradicional", "0.0"],
      },
    ],
  },
];
