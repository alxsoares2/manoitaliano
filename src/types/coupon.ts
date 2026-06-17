export type CouponRecord = {
  code: string;
  type: "fixed" | "percent";
  value: number;
  max_uses: number | null;
  uses_count: number;
  max_uses_per_customer: number | null;
  valid_until: string | null;
  active: boolean;
  created_at: string;
};
