import React from 'react';
import { formatPercent } from '../utils/geojsonUtils.js';

const palette = {
  D: ['#3575B5', '#76A8D4', '#174A83', '#B0CAE5'],
  R: ['#C9484D', '#EB8C87', '#A91E32', '#F5B4AE'],
  other: ['#8868AB', '#528672', '#AC752D', '#828CA0', '#9C79A6', '#C5A34C'],
};

export function pieColor(race, index) {
  const group = race.candidates[index].party ?? 'other';
  const colors = palette[group];
  const preceding = race.candidates.slice(0, index)
    .filter((candidate) => (candidate.party ?? 'other') === group && candidate.votes > 0).length;
  return colors[preceding % colors.length];
}

export default function ElectionPie({ race }) {
  if (!race.complete) return null;
  let cumulative = 0;
  const segments = race.candidates.flatMap((candidate, index) => {
    if (!candidate.votes) return [];
    const from = cumulative * 100 / race.totalVotes;
    cumulative += candidate.votes;
    const to = cumulative * 100 / race.totalVotes;
    return [{
      color: pieColor(race, index),
      from,
      to,
      label: candidate.name + ' ' + formatPercent(candidate.share),
    }];
  });
  const stops = segments.map(({ color, from, to }) => color + ' ' + from + '% ' + to + '%');
  return <figure className="vote-pie">
    <figcaption>Распределение голосов</figcaption>
    <div role="img" aria-label={segments.map(({ label }) => label).join(', ')}
      className="vote-pie-circle" style={{ background: 'conic-gradient(' + stops.join(', ') + ')' }} />
  </figure>;
}
