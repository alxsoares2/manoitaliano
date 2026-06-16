import { TopItemWithRevenue } from "@/lib/analytics";
import { formatPrice } from "@/lib/format";

export default function TopItemsTable({ items }: { items: TopItemWithRevenue[] }) {
  return (
    <div className="rounded-xl border border-border bg-background-elevated p-5 shadow-sm">
      <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">
        Itens mais pedidos no período
      </p>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          Nenhum item vendido neste período.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-widest text-muted">
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Quantidade vendida</th>
                <th className="px-4 py-3">Faturamento gerado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.name} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-semibold text-foreground">{item.name}</td>
                  <td className="px-4 py-3 text-muted">{item.qty}</td>
                  <td className="px-4 py-3 font-semibold text-gold">
                    {formatPrice(item.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
