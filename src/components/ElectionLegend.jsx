import React from 'react';
import { marginLegend, winnerLegend } from '../utils/colorScales.js';

export default function ElectionLegend({ metric, office }) {
  const options = { margin: marginLegend, winner: winnerLegend };
  const heading = {
    margin: 'Преимущество, %',
    winner: office === 'house' ? 'Партия победителя или лидера' : 'Партия победителя или лидера гонки',
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
  </section>;
}
