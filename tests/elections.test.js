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
  assert.equal(entry.leaderShare, 35);
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
  assert.equal(marginColor(30), marginLegend[1].color);
  assert.equal(marginColor(-30), marginLegend[8].color);
  for (const [index, value] of [0.01, 5, 10, 20, 30.01].entries()) {
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

test('state totals accept a verified ballot omission and uniformly ranked first choices', () => {
  const shapes = ['2301', '2302', '2303'].map((geoid) => ({ properties: { geoid, stateFips: '23' } }));
  const counted = (candidates, absentMajorParties) => summarizeRace({
    totalVotes: 100, candidates, absentMajorParties, basis: 'first-choice',
  });
  const one = counted([cand('A', 'D', 70), cand('B', 'R', 30)]);
  const two = counted([cand('C', 'D', 60), cand('Other', 'other', 40)], ['R']);
  const noBallot = summarizeRace({ noBallot: true, totalVotes: null, candidates: [cand('D', 'D', null)] });
  const all = new Map([['2301', [one]], ['2302', [two]], ['2303', [noBallot]]]);
  const [state] = summarizeStates(shapes, all).get('23');
  assert.equal(state.demMargin, 50);
  assert.equal(state.basis, 'first-choice');
  assert.equal(state.availableCount, 2);
  assert.equal(state.noBallotCount, 1);
  assert.equal(noBallot.leaderShare, null);
  assert.equal(noBallot.leader.name, 'D');
  assert.equal(two.demMargin, null);
  all.set('2302', [counted(two.candidates)]);
  assert.equal(summarizeStates(shapes, all).get('23')[0].demMargin, null);
});
