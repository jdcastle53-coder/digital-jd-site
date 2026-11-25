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
  5: { mode: 'executive_turn', prompt: 'Revise your understanding using the latest answer and earlier corrections. Explain what changed, distinguish known facts from assumptions, and ask the next question only if it can change the interpretation. If the facts are clear, invite confirmation.', slots: [
    box('understanding', 'Current understanding', 205, 231, 1110, 133),
    box('question', 'Next question', 205, 456, 517, 132),
  ] },
  7: { mode: 'executive_stage', prompt: 'Connect the evidence to the four existing labels. Identify what the client actually reported and what remains unknown. Apply a relevant JD principle only when supported. Do not invent research or a source.', slots: [
    ...['Concern', 'Objective', 'Constraints', 'Decision'].map((label, i) => row(label.toLowerCase(), label, 411, 240 + i * 76, 885, 62, i % 2 === 0)),
  ] },
  9: { mode: 'executive_stage', prompt: 'Compare a recommended approach with one genuinely distinct alternative for this case. State realistic benefits, risks, resources and timing as proposals or estimates. Tie the rationale to the case facts and confirmed objective.', slots: [
    ...option('recommended', 216), ...option('alternative', 800),
  ] },
  10: { mode: 'executive_stage', needsQuestion: true, prompt: 'Answer the latest client question directly. Explain the tradeoff or assumption that matters and whether the answer changes the proposed approach.', slots: [
    box('reply', 'DJD response', 913, 461, 520, 127),
  ] },
  11: { mode: 'executive_stage', prompt: 'Describe two concrete alternatives that are less suitable in this case. For each, state why and what would make it viable.', slots: [
    box('first', 'First option considered', 269, 280, 958, 143, '#fff'),
    box('second', 'Second option considered', 269, 439, 958, 147, '#fff'),
  ] },
  12: { mode: 'executive_stage', prompt: 'Propose a practical plan based on the case and the options discussion. If the client selected an approach, build the plan around that approach, including when it is the alternative. Identify unconfirmed owners, dates, budget and approvals explicitly. Describe a measurable target without inventing a baseline.', slots: [
    ...['Outcome', 'Delivery', 'Resources', 'Measures'].map((label, i) => row(label.toLowerCase(), label, 534, 241 + i * 82, 295, 69, i % 2 === 0)),
  ] },
  19: { mode: 'executive_stage', requiresEvidence: true, prompt: 'Compare recorded actual results with the target. State the evidence, confidence, and next useful check. Do not infer progress, completion, causation, or percentages from a proposed plan.', slots: [
    box('assessment', 'Current assessment', 331, 241, 500, 85),
    ...['Result', 'Direction', 'Confidence'].map((label, i) => row(label.toLowerCase(), label, 530, 344 + i * 61, 297, 49, i % 2 === 0)),
    box('rationale', 'Rationale and attention', 912, 233, 516, 299),
  ] },
  22: { mode: 'executive_stage', prompt: 'Brief only what the case records. Distinguish a proposed plan from an approved decision. If there is no actual evidence, say results are unverified. State open responsibilities and next review only where known.', slots: [
    ...['Decision', 'Plan', 'Results', 'Open items', 'Next review'].map((label, i) => row(['decision','plan','results','openItems','nextReview'][i], label, 703, 240 + i * 66, 715, 55, i % 2 === 0)),
  ] },
  23: { mode: 'executive_stage', requiresEvidence: true, prompt: 'Review outcome against the original objective. Separate verified outcome from incomplete activity, and clearly mark unknowns. Never say the objective was reached unless recorded evidence supports it.', slots: [
    ...['Objective', 'Actual result', 'Scope', 'Open items', 'Conclusion'].map((label, i) => row(['objective','actual','scope','openItems','conclusion'][i], label, 533, 240 + i * 65, 886, 55, i % 2 === 0)),
  ] },
  45: { mode: 'executive_stage', needsQuestion: true, slots: [
    box('reply', 'DJD response', 915, 460, 518, 134),
  ] },
  46: { mode: 'executive_stage', slots: [
    ...['position', 'changes', 'effect', 'confirmation'].map((key, i) => row(key, key, 510, 241 + i * 71, 923, 62, i % 2 === 0)),
  ] },
};
