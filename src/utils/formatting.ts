export const formatNumberWithCommas = (value: string | number): string => {
  if (!value && value !== 0) return '';
  const number = value.toString().replace(/,/g, '');
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const parseNumberWithCommas = (value: string): string => {
  if (!value) return '';
  return value.toString().replace(/,/g, '');
};

export const formatAxisLabel = (value: number): string => {
  if (!value && value !== 0) return '$0';
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};