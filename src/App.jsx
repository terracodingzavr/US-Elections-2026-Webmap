import React, { useEffect, useMemo, useState } from 'react';
import ElectionControls from './components/ElectionControls.jsx';
import ElectionInfoPanel from './components/ElectionInfoPanel.jsx';
import ElectionLegend from './components/ElectionLegend.jsx';
import ElectionMap from './components/ElectionMap.jsx';
import { cycles } from './config/elections.js';
import { indexRaces, summarizeStates } from './utils/electionCalculations.js';
import { areaName, loadData } from './utils/geojsonUtils.js';

export default function App() {
  const [year, setYear] = useState(cycles.at(-1).year);
  const [office, setOffice] = useState('house');
  const [level, setLevel] = useState('states');
  const [metric, setMetric] = useState('margin');
  const [selected, setSelected] = useState('');
  const [selectedRace, setSelectedRace] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const [retry, setRetry] = useState(0);
  const [loaded, setLoaded] = useState(null);
  const [error, setError] = useState(null);
  const cycle = cycles.find((item) => item.year === year);
  const geography = office === 'house' ? level : 'states';
  const key = year + '-' + office + '-' + geography;
  const [statesFile, districtFile, raceFile] = [cycle.states, cycle.districts, cycle[office]];

  useEffect(() => {
    let current = true;
    const isHouse = office === 'house';
    const shapeFile = geography === 'districts' ? districtFile : statesFile;
    Promise.all([loadData(shapeFile), loadData(raceFile), isHouse ? loadData(districtFile) : null])
      .then(([shape, result, districts]) => {
        if (!current) return;
        const index = indexRaces(result);
        const races = isHouse && geography === 'states' ? summarizeStates(districts.features, index) : index;
        setLoaded({ key, features: shape.features, races, date: result.snapshotDate });
        setError(null);
      })
      .catch((failure) => { if (current) setError({ key, message: failure.message }); });
    return () => { current = false; };
  }, [key, office, geography, statesFile, districtFile, raceFile, retry]);

  const selection = useMemo(() => {
    if (loaded?.key !== key) return [];
    return loaded.features.map(({ properties }) => properties)
      .sort((a, b) => a.ru.localeCompare(b.ru, 'ru') || (a.district ?? '').localeCompare(b.district ?? ''));
  }, [key, loaded]);

  const changeLayer = (setter) => (value) => {
    setSelected('');
    setSelectedRace('');
    setter(value);
  };
  function select(geoid) {
    setSelected(geoid);
    setSelectedRace('');
  }
  function raceFor(geoid) {
    const choices = loaded?.races.get(geoid) ?? [];
    return (geoid === selected ? choices.find((candidate) => candidate.id === selectedRace) : null)
      ?? choices.find((candidate) => candidate.kind === 'general') ?? choices[0] ?? null;
  }

  const loading = loaded?.key !== key;
  const failed = error?.key === key;
  const territory = selection.find((item) => item.geoid === selected);
  return <main className="shell">
    <header className="site-heading">
      <div><p className="eyeline">Промежуточные выборы · {cycle.label}</p>
        <h1>Выборы в Конгресс США</h1></div>
      <div className="year">{cycles.length > 1
        ? <select aria-label="Год выборов" value={year} onChange={(event) => changeLayer(setYear)(Number(event.target.value))}>
          {cycles.map((item) => <option key={item.year}>{item.year}</option>)}</select> : year}</div>
    </header>
    <ElectionControls {...{ office, level, metric, setMetric }}
      setOffice={changeLayer(setOffice)} setLevel={changeLayer(setLevel)} />
    <div className="dashboard">
      <section className="panel map-panel" aria-label="Карта выборов">
        <div className="map-toolbar">
          <label>Территория
            <select value={selected} disabled={loading} onChange={(event) => select(event.target.value)}>
              <option value="">Выберите территорию</option>
              {selection.map((item) => <option key={item.geoid} value={item.geoid}>{areaName(item)}</option>)}
            </select>
          </label>
          <button type="button" className="quiet-button" disabled={loading} onClick={() => setResetKey((n) => n + 1)}>Вся карта</button>
        </div>
        {loading ? <div className="map-placeholder" role={failed ? 'alert' : 'status'}>
          {failed ? <><p>Ошибка загрузки данных. {error.message}</p><button type="button" onClick={() => {
            setError(null); setRetry((n) => n + 1);
          }}>Повторить</button></> : 'Загружаются результаты и границы…'}
        </div> : <ElectionMap key={year + '-' + geography} features={loaded.features}
          view={key + '-' + selectedRace} {...{ metric, raceFor, selected, select, resetKey }} />}
        <ElectionLegend {...{ metric, office }} />
      </section>
      <ElectionInfoPanel selected={territory} race={raceFor(selected)} races={loaded?.races.get(selected)}
        selectRace={setSelectedRace} clear={() => select('')} featureCount={selection.length} office={office} />
    </div>
    <footer className="footer">
      <span>Границы · U.S. Census Bureau</span>
      <span>По состоянию на {loaded?.date ? loaded.date.split('-').reverse().join('.') : '—'} · статус указан для каждой гонки</span>
      <a href="https://github.com/terracodingzavr/MoscowElectionwebmap">По мотивам карты «Выборы Москвы»</a>
    </footer>
  </main>;
}
