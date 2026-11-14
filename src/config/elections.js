export const cycles = [{
  year: 2026,
  label: '3 ноября 2026 года',
  states: 'states_2026.geojson',
  districts: 'house_districts_2026.geojson',
  house: 'house_results_2026.json',
  senate: 'senate_results_2026.json',
}];

export const parties = { D: 'Демократы', R: 'Республиканцы', other: 'Другие' };
export const statusLabels = {
  'official-preliminary': 'Предварительные данные избиркома',
  'aggregated': 'Предварительные данные агрегатора',
  'mixed-preliminary': 'Предварительные данные из нескольких источников',
  'certified': 'Сертифицированные результаты',
};

export const metrics = {
  margin: 'Преимущество D–R',
  winner: 'Победитель / лидер',
  share: 'Доля голосов',
};
