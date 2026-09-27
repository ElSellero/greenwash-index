export const formatCo2Kg = (kg: number): string =>
  kg >= 1000
    ? `${(kg / 1000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} t`
    : `${Math.round(kg).toLocaleString('en-US')} kg`;

export const formatScore = (score: number): string =>
  Math.round(score).toLocaleString('en-US');

const EM_DASH = '\u2014';

/** The site's copy uses plain hyphens; stored texts (news titles, older trip titles) may still carry em dashes. */
export const plainHyphens = (text: string): string =>
  text.replaceAll(` ${EM_DASH} `, ' - ').replaceAll(EM_DASH, '-');
