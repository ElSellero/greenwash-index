export const formatCo2Kg = (kg: number): string =>
  kg >= 1000
    ? `${(kg / 1000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} t`
    : `${Math.round(kg).toLocaleString('en-US')} kg`;

export const formatScore = (score: number): string =>
  Math.round(score).toLocaleString('en-US');
