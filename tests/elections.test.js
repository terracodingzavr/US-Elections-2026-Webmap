import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeRace, summarizeStates } from '../src/utils/electionCalculations.js';
import { marginColor, marginLegend, neutral } from '../src/utils/colorScales.js';

const cand = (name, party, votes) => ({ name, party, votes });
const race = (totalVotes, ...candidates) => summarizeRace({ totalVotes, candidates });
test('D–R and the candidate margin use their respective votes and all valid votes', () => {
  const entry = race(100, cand('One', 'D', 35), cand('Two', 'D', 15), cand('Three', 'R', 30), cand('Four', 'other', 20));
  assert.equal(entry.demMargin, 20);
  assert.equal(entry.leaderMargin, 5);
  assert.equal(entry.candidates[3].share, 20);
});
test('ties and incomplete records do not acquire a winner or fabricated margin', () => {
  const tie = race(100, cand('A', 'D', 50), cand('B', 'R', 50));
  assert.equal(tie.leader, null);
  assert.equal(tie.demMargin, 0);
  assert.equal(race(18, cand('A', 'D', 18)).demMargin, null);
  assert.equal(race(30, cand('A', 'D', 20), cand('B', 'R', null)).demMargin, null);
  assert.equal(race(30, cand('A', 'D', 20), cand('B', 'R', 5)).demMargin, null);
});
test('ten colors and symmetric exact boundaries match the legend', () => {
  assert.equal(marginLegend.length, 10);
  assert.equal(marginColor(0), neutral.tie);
  assert.equal(marginColor(null), neutral.missing);
  for (const [index, value] of [0.01, 5, 10, 20, 30].entries()) {
    assert.equal(marginColor(value), marginLegend[4 - index].color);
    assert.equal(marginColor(-value), marginLegend[5 + index].color);
  }
});
test('state totals aggregate counts and require all districts to be comparable', () => {
  const shapes = ['4801', '4802'].map((geoid) => ({ properties: { geoid, stateFips: '48' } }));
  const one = race(100, cand('A', 'D', 80), cand('B', 'R', 20));
  const two = race(900, cand('A', 'D', 495), cand('B', 'R', 405));
  const all = new Map([['4801', [one]], ['4802', [two]]]);
  assert.equal(summarizeStates(shapes, all).get('48')[0].demMargin, 15);
  all.delete('4802');
  assert.equal(summarizeStates(shapes, all).get('48')[0].demMargin, null);
});
