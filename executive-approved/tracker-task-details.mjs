// Records displayed in the sample Task Tracker artwork.
const exampleTasks = {
  "14": {
    "number": "01",
    "name": "Confirm measures",
    "phase": "Prepare",
    "owner": "M. Lee",
    "start": "Mar 01",
    "due": "Mar 07",
    "finish": "Mar 07",
    "reported": "100%",
    "planned": "100%",
    "status": "Complete",
    "updated": "Mar 07",
    "attention": ""
  },
  "85": {
    "number": "02",
    "name": "Assign resources",
    "phase": "Prepare",
    "owner": "A. Reed",
    "start": "Mar 08",
    "due": "Mar 14",
    "finish": "Mar 14",
    "reported": "100%",
    "planned": "100%",
    "status": "Complete",
    "updated": "Mar 14",
    "attention": ""
  },
  "86": {
    "number": "03",
    "name": "Run rollout",
    "phase": "Implement",
    "owner": "J. Patel",
    "start": "Mar 15",
    "due": "Apr 12",
    "finish": "Apr 18",
    "reported": "80%",
    "planned": "100%",
    "status": "Overdue",
    "updated": "Apr 15",
    "attention": "3 days late"
  },
  "87": {
    "number": "04",
    "name": "Validate pilot",
    "phase": "Implement",
    "owner": "D. Kim",
    "start": "Apr 01",
    "due": "Apr 25",
    "finish": "Apr 28",
    "reported": "70%",
    "planned": "80%",
    "status": "At risk",
    "updated": "Apr 14",
    "attention": "Blocked"
  },
  "88": {
    "number": "05",
    "name": "Verify benefits",
    "phase": "Verify",
    "owner": "M. Lee",
    "start": "Apr 20",
    "due": "May 15",
    "finish": "May 15*",
    "reported": "0%*",
    "planned": "0%",
    "status": "Needs update",
    "updated": "Apr 01",
    "attention": "Due Apr 14"
  },
  "89": {
    "number": "06",
    "name": "Confirm results",
    "phase": "Verify",
    "owner": "A. Reed",
    "start": "May 16",
    "due": "May 31",
    "finish": "May 31",
    "reported": "0%",
    "planned": "0%",
    "status": "On track",
    "updated": "Apr 14",
    "attention": ""
  }
};

export function openTrackedTask(target, opener) {
  const task = exampleTasks[target];
  if (!task) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'tracker-task-details';
  dialog.setAttribute('aria-labelledby', 'tracker-task-title');
  const heading = document.createElement('h2');
  heading.id = 'tracker-task-title';
  heading.textContent = task.number + ' ' + task.name;
  const sample = document.createElement('p');
  sample.textContent = 'Example task ? Implementation Project';
  const details = document.createElement('dl');
  for (const [label, value] of [
    ['Phase', task.phase], ['Owner', task.owner], ['Start date', task.start], ['Due date', task.due],
    ['Expected finish', task.finish], ['Reported progress', task.reported], ['Planned progress', task.planned],
    ['Status', task.status], ['Attention', task.attention], ['Last update', task.updated],
  ]) {
    if (!value) continue;
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    details.append(term, description);
  }
  const history = document.createElement('h3');
  history.textContent = 'Update history and evidence';
  const summary = document.createElement('p');
  summary.textContent = 'On ' + task.updated + ', the tracker recorded ' + task.reported +
    ' reported progress and a status of ' + task.status.toLowerCase() + '. This example has no detailed update notes or evidence attached.';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Back to task list';
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { dialog.remove(); opener.focus(); }, { once: true });
  dialog.append(heading, sample, details, history, summary, close);
  document.body.append(dialog);
  dialog.showModal();
}
