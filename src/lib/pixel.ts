export const PIXEL_ID = "757770043974171";

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: unknown;
  }
}

export function fbq(...args: unknown[]) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq(...args);
  }
}

export const pixel = {
  pageView() {
    fbq("track", "PageView");
  },
  viewContent(contentName: string) {
    fbq("track", "ViewContent", { content_name: contentName });
  },
  addToCart(name: string, value: number, currency = "BRL") {
    fbq("track", "AddToCart", {
      content_name: name,
      value,
      currency,
    });
  },
  initiateCheckout(value: number, numItems: number) {
    fbq("track", "InitiateCheckout", {
      value,
      currency: "BRL",
      num_items: numItems,
    });
  },
  purchase(value: number, orderId: string) {
    fbq("track", "Purchase", {
      value,
      currency: "BRL",
      content_ids: [orderId],
    });
  },
};
