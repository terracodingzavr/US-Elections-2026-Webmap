const isVoteCount = (value) => Number.isSafeInteger(value) && value >= 0;
const countFor = (candidates, party) => candidates.filter((c) => c.party === party)
  .reduce((total, c) => total + c.votes, 0);
const isCandidate = (candidate) => !/^(?:other write[- ]?ins?|write[- ]?in(?:s| votes| totals?)?|scattering)$/i.test(candidate.name);

export function summarizeRace(race) {
  if (!race) return null;
  const { candidates, totalVotes } = race;
  const complete = isVoteCount(totalVotes) && totalVotes > 0 && candidates.every((c) => isVoteCount(c.votes)) &&
    candidates.reduce((sum, c) => sum + c.votes, 0) === totalVotes;
  const ranked = candidates.filter((c) => isVoteCount(c.votes) && c.votes > 0 && isCandidate(c))
    .sort((a, b) => b.votes - a.votes);
  const [first, second] = ranked;
  const tie = Boolean(second && first.votes === second.votes);
  const declared = race.winnerName && race.status === 'certified'
    ? candidates.find((c) => c.name === race.winnerName)
    : null;
  const unmatchedWriteIn = first && candidates.some((c) => !isCandidate(c) && c.votes >= first.votes);
  const unopposed = race.noBallot && candidates.length === 1 ? candidates[0] : null;
  const leader = declared || unopposed || (!tie && !unmatchedWriteIn ? first : null) || null;
  const runnerUp = ranked.find((candidate) => candidate !== leader) || null;
  const demVotes = complete && candidates.some((c) => c.party === 'D') ? countFor(candidates, 'D') : null;
  const repVotes = complete && candidates.some((c) => c.party === 'R') ? countFor(candidates, 'R') : null;
  return {
    ...race, complete, tie, leader, declaredWinner: declared ?? unopposed, demVotes, repVotes,
    leaderShare: leader && isVoteCount(leader.votes) && totalVotes > 0
      ? leader.votes * 100 / totalVotes : null,
    demMargin: demVotes === null || repVotes === null ? null : (demVotes - repVotes) * 100 / totalVotes,
    leaderMargin: complete && leader && runnerUp && candidates.filter(isCandidate).length >= 2
      ? (leader.votes - runnerUp.votes) * 100 / totalVotes : null,
    candidates: candidates.map((c) => ({ ...c, share: isVoteCount(c.votes) && totalVotes > 0
      ? c.votes * 100 / totalVotes : null })),
  };
}

export function summarizeStates(features, races) {
  const byState = new Map();
  for (const { properties: p } of features) {
    const current = byState.get(p.stateFips) || [];
    current.push(races.get(p.geoid)?.[0] ?? null);
    byState.set(p.stateFips, current);
  }
  const output = new Map();
  for (const [state, entries] of byState) {
    if (entries.length === 1) {
      if (entries[0]) output.set(state, entries);
      continue;
    }
    const known = entries.filter(Boolean);
    const counted = known.filter((race) => !race.noBallot);
    const bases = new Set(counted.map((race) => race.basis ?? null));
    const comparable = known.length === entries.length && bases.size === 1 && counted.every((race) =>
      race.complete && [['D', race.demVotes], ['R', race.repVotes]]
        .every(([party, votes]) => votes !== null || race.absentMajorParties?.includes(party)));
    const basis = comparable ? counted[0].basis : undefined;
    const votes = { D: 0, R: 0, other: 0 };
    let totalVotes = null;
    if (comparable) {
      totalVotes = counted.reduce((sum, r) => sum + r.totalVotes, 0);
      for (const race of counted) {
        votes.D += race.demVotes ?? 0;
        votes.R += race.repVotes ?? 0;
      }
      votes.other = totalVotes - votes.D - votes.R;
    }
    const statuses = new Set(known.map((r) => r.status));
    const result = summarizeRace({
      id: 'state-' + state, office: 'house', geoid: state, stateFips: state, kind: 'general',
      status: statuses.size === 1 ? known[0].status : 'mixed-preliminary', totalVotes,
      districtCount: entries.length, availableCount: counted.length, comparable, basis,
      noBallotCount: known.length - counted.length,
      sources: [...new Map(known.map((r) => [r.source, { source: r.source, url: r.url }])).values()],
      candidates: [
        { name: 'Демократы', party: 'D', votes: comparable ? votes.D : null },
        { name: 'Республиканцы', party: 'R', votes: comparable ? votes.R : null },
        { name: 'Прочие голоса', party: 'other', votes: comparable ? votes.other : null },
      ],
    });
    if (result.leader?.party === 'other') {
      result.leader = null;
      result.leaderShare = null;
    }
    result.leaderMargin = null;
    output.set(state, [result]);
  }
  return output;
}

export function indexRaces(source) {
  const index = new Map();
  for (const race of source.races) {
    if (!index.has(race.geoid)) index.set(race.geoid, []);
    index.get(race.geoid).push(summarizeRace(race));
  }
  return index;
}
