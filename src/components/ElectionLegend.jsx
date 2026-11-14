import React from 'react';
import { marginLegend, neutral, shareLegend, winnerLegend } from '../utils/colorScales.js';

export default function ElectionLegend({ metric, office }) {
  const options = { margin: marginLegend, winner: winnerLegend, share: shareLegend };
  const heading = {
    margin: 'Преимущество, п. п.',
    winner: office === 'house' ? 'Партия победителя или лидера' : 'Партия победителя или лидера гонки',
    share: 'Доля голосов лидера',
  };
  return <section className="legend" aria-label="Легенда">
    <div className="legend-title">
      {metric === 'margin' && <span>Демократы</span>}
      <strong>{heading[metric]}</strong>
      {metric === 'margin' && <span>Республиканцы</span>}
    </div>
    <div className="legend-classes" style={{ '--class-count': options[metric].length }}>
      {options[metric].map((item) => <div key={item.color} className="legend-class">
        <span className="swatch" style={{ background: item.color }} />
        <span>{item.label}</span>
      </div>)}
    </div>
    <div className="legend-notes">
      <span><i style={{ background: neutral.missing }}/> {office === 'senate' ? 'Выборов не было или нет данных' : 'Показатель недоступен'}</span>
      <span><i style={{ background: neutral.tie }}/> {metric === 'margin' ? 'Равные доли D и R' : 'Равенство голосов'}</span>
    </div>
  </section>;
}
