const ranges = ['0–5', '5–10', '10–20', '20–30', '30+'];
const thresholds = [0, 5, 10, 20, 30];
const partyColors = {
  D: ['#D0E2F2', '#96BCE0', '#6199CE', '#3575B5', '#174A83'],
  R: ['#F5CECA', '#ECA39E', '#DD7775', '#C9484D', '#A91E32'],
};

export const neutral = { missing: '#e9ecf1', tie: '#cbd0da', other: '#a493bb' };
export const marginLegend = ['D', 'R'].flatMap((party) => {
  const classes = ranges.map((label, index) => ({ label, color: partyColors[party][index], party }));
  return party === 'D' ? classes.reverse() : classes;
});
export const winnerLegend = [
  { label: 'Демократы', color: '#3575B5', party: 'D' },
  { label: 'Республиканцы', color: '#C9484D', party: 'R' },
  { label: 'Другая партия', color: neutral.other, party: 'other' },
];
const shareThresholds = [0, 25, 40, 50, 60];
const shareColors = ['#ece8f4', '#d6c9e6', '#b39bd1', '#895fb5', '#5b3980'];
export const shareLegend = ['0–25%', '25–40%', '40–50%', '50–60%', '60%+']
  .map((label, i) => ({ label, color: shareColors[i] }));

export function marginColor(margin) {
  if (!Number.isFinite(margin)) return neutral.missing;
  if (margin === 0) return neutral.tie;
  const cut = thresholds.findLastIndex((limit) => Math.abs(margin) >= limit);
  return partyColors[margin > 0 ? 'D' : 'R'][cut];
}

export function featureColor(race, metric) {
  if (!race) return neutral.missing;
  if (metric === 'margin') return marginColor(race.demMargin);
  if (metric === 'winner') {
    if (race.tie) return neutral.tie;
    return winnerLegend.find((item) => item.party === race.leader?.party)?.color || neutral.missing;
  }
  const share = race.candidates.find(({ name }) => name === race.leader?.name)?.share;
  if (race.tie) return neutral.tie;
  const cut = shareThresholds.findLastIndex((limit) => share != null && share >= limit);
  return cut === -1 ? neutral.missing : shareColors[cut];
}
