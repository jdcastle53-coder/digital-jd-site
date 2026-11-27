const box = (key, label, x, y, w, h, fill = '#eaf1f9') => ({ key, label, rect: [x, y, w, h], fill });
const row = (key, label, x, y, w, h, even) => box(key, label, x, y, w, h, even ? '#f0f4fa' : '#fff');

function option(prefix, x) {
  return [
    box(prefix + 'Title', 'Option title', x, 240, 515, 47),
    ...['Benefit', 'Risk', 'Resources', 'Timing'].map((field, i) =>
      row(prefix + field, field, x + 194, 299 + i * 47, 323, 42, i % 2 === 0)),
    box(prefix + 'Rationale', 'Rationale', x - 8, 529, 520, 42),
  ];
}

export const PANELS = {
  5: { mode: 'executive_turn', slots: [
    box('understanding', 'Current understanding', 205, 231, 1110, 133),
    box('question', 'Next question', 205, 456, 517, 132),
  ] },
  7: { mode: 'executive_stage', slots: [
    ...['Concern', 'Objective', 'Constraints', 'Decision'].map((label, i) => row(label.toLowerCase(), label, 411, 240 + i * 76, 885, 62, i % 2 === 0)),
  ] },
  9: { mode: 'executive_stage', slots: [
    ...option('recommended', 216), ...option('alternative', 800),
  ] },
  10: { mode: 'executive_stage', needsQuestion: true, slots: [
    box('reply', 'DJD response', 913, 461, 520, 127),
  ] },
  11: { mode: 'executive_stage', slots: [
    box('first', 'First option considered', 269, 280, 958, 143, '#fff'),
    box('second', 'Second option considered', 269, 439, 958, 147, '#fff'),
  ] },
  12: { mode: 'executive_stage', slots: [
    ...['Outcome', 'Delivery', 'Resources', 'Measures'].map((label, i) => row(label.toLowerCase(), label, 534, 241 + i * 82, 295, 69, i % 2 === 0)),
  ] },
  19: { mode: 'executive_stage', requiresEvidence: true, slots: [
    box('assessment', 'Current assessment', 331, 241, 500, 85),
    ...['Result', 'Direction', 'Confidence'].map((label, i) => row(label.toLowerCase(), label, 530, 344 + i * 61, 297, 49, i % 2 === 0)),
    box('rationale', 'Rationale and attention', 912, 233, 516, 299),
  ] },
  20: { mode: 'executive_stage', slots: [
    box('recommendation','Recommended next move',331,236,508,99),
    box('evidence','Supporting evidence',331,338,508,61),
    box('risks','Risks and open conditions',331,403,508,61),
    box('approval','Approvals',331,468,508,77),
    row('status','Case status',1110,322,315,53,true),
    row('review','Next review',1110,385,315,54,false),
  ] },
  25: { mode: 'executive_stage', slots: [
    ...['Opportunity','Value','Measure','Plan'].map((label,i)=>row(label.toLowerCase(),label,530,241+i*69,303,61,i%2===0)),
    box('question','Next question',326,558,513,43),
    box('review','Digital JD review',912,464,523,135),
  ] },
  22: { mode: 'executive_stage', slots: [
    ...['Decision', 'Plan', 'Results', 'Open items', 'Next review'].map((label, i) => row(['decision','plan','results','openItems','nextReview'][i], label, 703, 240 + i * 66, 715, 55, i % 2 === 0)),
  ] },
  23: { mode: 'executive_stage', requiresEvidence: true, slots: [
    ...['Objective', 'Actual result', 'Scope', 'Open items', 'Conclusion'].map((label, i) => row(['objective','actual','scope','openItems','conclusion'][i], label, 533, 240 + i * 65, 886, 55, i % 2 === 0)),
  ] },
  45: { mode: 'executive_stage', needsQuestion: true, slots: [
    box('reply', 'DJD response', 915, 460, 518, 134),
  ] },
  46: { mode: 'executive_stage', slots: [
    ...['position', 'changes', 'effect', 'confirmation'].map((key, i) => row(key, key, 510, 241 + i * 71, 923, 62, i % 2 === 0)),
  ] },
};
