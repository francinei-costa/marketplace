import { useState } from "react";
import { Button } from "../ui/button";

const MIN_PRICE = 0.02;
const MAX_PRICE = 12.3;
const SLIDER_MAX_PRICE = 16.3;

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function normalizeRange(lower: string, upper: string) {
  const minValue = Math.min(
    MAX_PRICE,
    Math.max(MIN_PRICE, Number(lower) || MIN_PRICE),
  );
  return {
    min: minValue,
    max: Math.max(
      minValue,
      Math.min(MAX_PRICE, Number(upper) || MAX_PRICE),
    ),
  };
}

export function PriceRangeFilter({
  min,
  max,
  onApply,
}: {
  min: string;
  max: string;
  onApply: (min: string, max: string) => void;
}) {
  const [range, setRange] = useState(() => normalizeRange(min, max));

  const lowerPosition =
    ((range.min - MIN_PRICE) / (SLIDER_MAX_PRICE - MIN_PRICE)) * 100;
  const upperPosition =
    ((range.max - MIN_PRICE) / (SLIDER_MAX_PRICE - MIN_PRICE)) * 100;

  return (
    <div>
      <div
        className="relative mx-2 my-5 h-1 rounded-full bg-line"
        style={{
          background: `linear-gradient(to right, var(--color-line) 0%, var(--color-line) ${lowerPosition}%, var(--color-copper) ${lowerPosition}%, var(--color-copper) ${upperPosition}%, var(--color-line) ${upperPosition}%, var(--color-line) 100%)`,
        }}
      >
        <input
          aria-label="Preço mínimo em ETH"
          className="price-range-thumb absolute inset-x-0 -top-2 h-5 w-full cursor-pointer appearance-none bg-transparent"
          type="range"
          min={MIN_PRICE}
          max={SLIDER_MAX_PRICE}
          step="0.01"
          value={range.min}
          onChange={(event) => {
            const value = Math.min(
              Number(event.target.value),
              range.max,
              MAX_PRICE,
            );
            setRange((current) => ({ ...current, min: value }));
          }}
        />
        <input
          aria-label="Preço máximo em ETH"
          className="price-range-thumb absolute inset-x-0 -top-2 h-5 w-full cursor-pointer appearance-none bg-transparent"
          type="range"
          min={MIN_PRICE}
          max={SLIDER_MAX_PRICE}
          step="0.01"
          value={range.max}
          onChange={(event) => {
            const value = Math.min(
              Math.max(Number(event.target.value), range.min),
              MAX_PRICE,
            );
            setRange((current) => ({ ...current, max: value }));
          }}
        />
      </div>
      <p className="mb-3 text-center text-sm text-white">
        Preço: {formatPrice(range.min)} - {formatPrice(range.max)} ETH
      </p>
      <Button
        type="button"
        className="h-9 min-h-9 px-3 py-1.5 cursor-pointer"
        onClick={() => onApply(range.min.toFixed(2), range.max.toFixed(2))}
      >
        Aplicar
      </Button>
    </div>
  );
}
