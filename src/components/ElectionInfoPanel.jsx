import React from 'react';
import { parties, statusLabels } from '../config/elections.js';
import { areaName, formatMargin, formatNumber, formatPercent, marginParty } from '../utils/geojsonUtils.js';

import ElectionPie, { pieColor } from './ElectionPie.jsx';

export default function ElectionInfoPanel({ selected, race, races = [], selectRace, office, clear, featureCount }) {
  if (!selected) return <aside className="info panel" aria-label="Сведения">
    <h2>{office === 'senate' ? 'Выборы в Сенат' : 'Палата представителей'}</h2>
    <p>Выберите территорию на карте или в списке, чтобы увидеть голоса, доли и источник данных.</p>
    <p className="quiet">{featureCount} территорий на карте.</p>
  </aside>;

  const isStateTotal = Boolean(race?.districtCount);
  const status = race ? statusLabels[race.status] : null;
  const leaderParty = race?.leader?.party;
  const leadingParty = parties[marginParty(race?.demMargin)] ??
    (leaderParty === 'other' ? race.leader.partyRaw || parties.other : parties[leaderParty]);
  return <aside className="info panel" aria-label="Сведения о территории">
    <div className="info-heading"><h2>{areaName(selected)}</h2>
      <button type="button" className="quiet-button" aria-label="Закрыть сведения" onClick={clear}>×</button></div>
    {selected.delegate && <p className="quiet">Делегат без права решающего голоса в Палате представителей.</p>}
    {races.length > 1 && <label className="race-picker">Гонка
      <select value={race?.id} onChange={(event) => selectRace(event.target.value)}>
        {races.map((item) => <option key={item.id} value={item.id}>{item.kind === 'special' ? 'Специальные выборы' : 'Очередные выборы'} {item.contest ?? ''}</option>)}
      </select>
    </label>}
    {!race ? <p>{office === 'senate' ? 'Выборов в Сенат в этом штате в 2026 году не было.' : 'Данные этой территории отсутствуют.'}</p> : <>
      <p className="eyeline">{race.kind === 'special' ? 'Специальные выборы' : 'Очередные выборы'} · {status}</p>
      {race.noBallot && <p className="quiet">Кандидат избран без голосования.</p>}
      {race.basis === 'first-choice' && <p className="quiet">{isStateTotal
        ? 'Сводка по первым предпочтениям в округах.'
        : 'Первые предпочтения. Лидер по этому подсчёту может отличаться от победителя после перераспределения голосов.'}</p>}
      {isStateTotal && <p className="quiet">Подсчёт по {race.availableCount} из {race.districtCount} округов.
        {race.noBallotCount > 0 && ' В одном округе кандидат избран без голосования.'}
        {!race.comparable && ' Сводный показатель недоступен: по части округов голоса или данные по двум партиям несопоставимы.'}</p>}
      <ElectionPie race={race} />
      <dl className="numbers">
        <div><dt>{isStateTotal ? 'Лидер по голосам' : race.declaredWinner ? 'Победитель' : 'Лидер подсчёта'}</dt>
          <dd>{race.tie && !race.declaredWinner ? 'Равенство голосов' : race.leader?.name ?? '—'}</dd></div>
        <div><dt>Преимущество партии</dt><dd>{race.demMargin === 0 ? 'Равные доли' : leadingParty ?? '—'}</dd></div>
        {!isStateTotal && <div><dt>Разрыв между лидерами</dt><dd>{formatMargin(race.leaderMargin)}</dd></div>}
      </dl>
      <table className="results">
        <thead><tr><th scope="col">{isStateTotal ? 'Партия' : 'Кандидат'}</th>
          <th scope="col">Голоса</th><th scope="col">Доля</th></tr></thead>
        <tbody>{race.candidates.map((candidate, i) => <tr key={candidate.name + '-' + i}>
          <th scope="row">{race.complete && candidate.votes > 0 && <i className="pie-key" aria-hidden="true" style={{ background: pieColor(race, i) }} />}{candidate.name}{!isStateTotal && <small>{parties[candidate.party] && candidate.party !== 'other' ? parties[candidate.party] : candidate.partyRaw || 'Партия не указана'}</small>}</th>
          <td>{formatNumber(candidate.votes)}</td><td>{formatPercent(candidate.share)}</td>
        </tr>)}</tbody>
      </table>
      <div className="sources">
        {(race.sources ?? [{ source: race.source, url: race.url }]).filter((item) => item.url)
          .map((item) => <a key={item.url} href={item.url} target="_blank" rel="noreferrer">{item.source} ↗</a>)}
      </div>
    </>}
  </aside>;
}
