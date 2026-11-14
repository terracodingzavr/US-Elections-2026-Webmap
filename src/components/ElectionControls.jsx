import React from 'react';
import { metrics } from '../config/elections.js';

function Options({ label, options, value, onChange }) {
  return <div className="control-group" role="group" aria-label={label}>
    {Object.entries(options).map(([id, name]) => <button key={id} type="button"
      aria-pressed={value === id} onClick={() => onChange(id)}>{name}</button>)}
  </div>;
}

export default function ElectionControls({ office, setOffice, level, setLevel, metric, setMetric }) {
  return <div className="controls">
    <Options label="Палата Конгресса" options={{ house: 'Палата представителей', senate: 'Сенат' }}
      value={office} onChange={setOffice} />
    {office === 'house' && <Options label="География" options={{ states: 'Штаты', districts: 'Округа' }}
      value={level} onChange={setLevel} />}
    <Options label="Показатель" options={metrics} value={metric} onChange={setMetric} />
  </div>;
}
