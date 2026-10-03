export function QuoteSummary({
  quote,
  loading,
}: {
  quote?: {
    subtotal: string;
    discount: string;
    networkFee: string;
    total: string;
  };
  loading: boolean;
}) {
  if (loading || !quote)
    return (
      <div
        className="shimmer mt-6 h-36 rounded-sm"
        aria-label="Carregando resumo"
      />
    );
  return (
    <dl className="mt-6 space-y-3">
      <SummaryRow label="Subtotal" value={`${quote.subtotal} ETH`} />
      <SummaryRow
        label="Desconto do lançamento"
        value={`(-) ${quote.discount} ETH`}
      />
      <SummaryRow
        label="Taxa de rede"
        value={`${quote.networkFee} ETH`}
        note="Taxa estimada"
      />
      <div className="border-t border-line pt-4">
        <SummaryRow label="Total" value={`${quote.total} ETH`} strong />
      </div>
    </dl>
  );
}

export function SummaryRow({
  label,
  value,
  note,
  strong,
}: {
  label: string;
  value: string;
  note?: string;
  strong?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "font-bold" : ""}`}>
      <dt className={strong ? "text-white" : "text-sand"}>
        {label}
        {note && (
          <span className="mt-1 block text-right text-[10px] font-normal text-amber">
            {note}
          </span>
        )}
      </dt>
      <dd className={strong ? "text-amber" : "text-white"}>{value}</dd>
    </div>
  );
}
