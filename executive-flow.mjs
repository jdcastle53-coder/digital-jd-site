export const STAGES = [
  ['Your Executive Journey', [['question','A question before you begin']]],
  ['Executive Input', [['situation','What is happening?'],['objective','What would you like to achieve?']]],
  ['Analysis Depth', [['depth','Choose Snapshot or In-depth']]],
  ['Our Conversation', [['response','Answer DJD or correct the understanding']]],
  ['Our Conversation', [['understanding','Your confirmed understanding']]],
  ['Understanding Check', [['clarity','Clarity from 1 to 10']]],
  ['Foundations of Your Analysis', [['evidence','Facts, sources, and evidence'],['gaps','Assumptions and missing information']]],
  ['Inside Digital JD', []],
  ['Decision Options', [['recommended','Recommended approach'],['alternative','Alternative approach'],['rationale','Benefits, risks, resources, and timing']]],
  ['Discuss with Digital JD', []],
  ['Other Options Considered', [['otherOptions','Other approaches and why they fit or do not fit']]],
  ['Confirm Your Plan', [['plan','Actions, owners, timing, resources, and measures']]],
  ['Execution Plan', []],
  ['Your Action Form', []],
  ['Task Update', []],
  ['Facing a Hurdle', []],
  ['Progress Dashboard', []],
  ['Task Tracker', []],
  ['Progress Assessment', [['assessment','Results versus the target'],['confidence','Evidence strength and remaining uncertainty']]],
  ['Decision & Status', [['nextMove','Next move'],['conditions','Conditions or approvals']]],
  ['Action: Status', []],
  ['Case Briefing', [['briefing','Where we are and what needs attention']]],
  ['Objective - Outcome Review', [['outcome','Actual result and conclusion'],['outcomeEvidence','Evidence supporting the result']]],
  ['Outcome Optimization', []],
  ['Opportunity Workspace', []]
].map(([title, fields], index) => ({ number: index + 1, title, fields }));
export const REVISION_STAGES = [2,5,7,9,12,17,19,24];
export const NEXT_MOVES = ['Continue the current plan','Adjust the plan','Resolve a hurdle','Pause pending information','Review the outcome'];
export const OPPORTUNITY_TYPES = ['Refine processes to improve efficiency','Enhance results beyond original objectives','Address remaining gaps or limitations','Identify additional value','Strengthen long-term performance'];
