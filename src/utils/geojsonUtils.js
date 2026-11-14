const activeRequests = new Map();

export function loadData(filename) {
  if (!activeRequests.has(filename)) {
    const path = new URL(import.meta.env.BASE_URL + 'data/' + filename, document.baseURI);
    activeRequests.set(filename, fetch(path).then((response) => {
      if (!response.ok) throw new Error(filename + ' (' + response.status + ')');
      return response.json();
    }).catch((error) => {
      activeRequests.delete(filename);
      throw error;
    }));
  }
  return activeRequests.get(filename);
}

export function areaName({ ru, district, delegate }) {
  if (delegate) return ru + ' · делегат';
  if (!district) return ru;
  if (district === '00') return ru + ' · единый округ';
  return ru + ' · округ ' + Number(district);
}

const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
export const formatNumber = (value) => value == null ? '—' : number.format(value);
export const formatPercent = (value) => value == null ? '—' : number.format(value) + '%';
export const formatMargin = (value) => value == null ? '—' : (value > 0 ? '+' : '') + number.format(value) + ' п. п.';
