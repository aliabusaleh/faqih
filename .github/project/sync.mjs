// Syncs the project board from the files next to this script:
// title.txt, description.txt and README.md set the board info, and
// items.json adds one draft item per entry, with its fields filled in.
//
// Items are matched by title. A new item gets every field from items.json;
// an existing item only gets the fields that are still empty, so cards moved
// by hand on the board stay where they are.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OWNER = process.env.PROJECT_OWNER;
const NUMBER = Number(process.env.PROJECT_NUMBER);
const DIR = dirname(fileURLToPath(import.meta.url));
const read = (file) => readFileSync(join(DIR, file), "utf8").trim();

// Single-select fields and their options, in board order.
const SELECT_FIELDS = {
  Status: [
    ["Backlog", "GRAY", "An idea or request, not yet scoped"],
    ["Ready", "BLUE", "Scoped, with acceptance criteria"],
    ["In progress", "YELLOW", "Assigned and being worked on"],
    ["Code review", "ORANGE", "A pull request is open"],
    ["Scholarly review", "PURPLE", "Waiting for a qualified reviewer"],
    ["Done", "GREEN", "Merged, and reviewed for content"],
  ],
  Phase: [
    ["M0", "GREEN", "Setup and rebrand"],
    ["M1", "GREEN", "Content pipeline"],
    ["M1.5", "GREEN", "Arabic-first UI"],
    ["M2", "YELLOW", "Exercises and audio"],
    ["M3", "PINK", "Kids path"],
    ["M4", "ORANGE", "Beta launch"],
    ["M5", "BLUE", "Full Quran"],
    ["M6", "PURPLE", "Tajweed"],
    ["M7", "RED", "Maher mode"],
    ["Later", "GRAY", "After the first release"],
  ],
  Path: [
    ["Kids", "PINK", "Kids path"],
    ["Full Quran", "GREEN", "Hifz of the whole Quran"],
    ["Tajweed", "PURPLE", "Tajweed rules"],
    ["Maher", "YELLOW", "Challenges in Quran and Islamic knowledge"],
    ["Hadith and Sirah", "BLUE", "Later paths"],
    ["Platform", "GRAY", "Shared app and infrastructure"],
  ],
  Audience: [
    ["Kids", "PINK", "Children"],
    ["Adults", "BLUE", "Adults"],
    ["Arabic speakers", "GREEN", "Native Arabic speakers"],
    ["Non-Arabic speakers", "ORANGE", "Learners who do not speak Arabic"],
    ["All learners", "GRAY", "Everyone"],
  ],
  Priority: [
    ["P0", "RED", "Blocker"],
    ["P1", "ORANGE", "This phase"],
    ["P2", "GRAY", "Nice to have"],
  ],
  Size: [
    ["S", "GREEN", "Up to 2 days"],
    ["M", "YELLOW", "3 to 5 days"],
    ["L", "RED", "1 to 2 weeks"],
  ],
  "Work type": [
    ["Feature", "BLUE", "App feature"],
    ["Content", "GREEN", "Lessons, sources and texts"],
    ["Review", "PURPLE", "Scholarly review"],
    ["Decision", "PINK", "An open decision for the team"],
  ],
};
const DATE_FIELDS = { "Start date": "start", "Target date": "target" };
const ITEM_KEYS = { Status: "status", Phase: "phase", Path: "path", Audience: "audience", Priority: "priority", Size: "size", "Work type": "type" };
// The board's built-in Status options, used if they can't be replaced.
const STATUS_FALLBACK = { Backlog: "Todo", Ready: "Todo", "In progress": "In Progress", "Code review": "In Progress", "Scholarly review": "In Progress", Done: "Done" };

const errors = [];

function gql(query, variables = {}) {
  try {
    const out = execFileSync("gh", ["api", "graphql", "--input", "-"], {
      input: JSON.stringify({ query, variables }),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return JSON.parse(out).data;
  } catch (error) {
    throw new Error(`${error.stdout || ""} ${error.stderr || ""}`.trim() || error.message);
  }
}

function attempt(what, fn) {
  try {
    return fn();
  } catch (error) {
    errors.push(`${what}: ${error.message}`);
    console.log(`::error::${what}: ${error.message.replace(/\n/g, " ")}`);
  }
}

const FIELDS_QUERY = `query($login: String!, $number: Int!) {
  user(login: $login) { projectV2(number: $number) { id
    fields(first: 50) { nodes {
      ... on ProjectV2FieldCommon { id name dataType }
      ... on ProjectV2SingleSelectField { options { id name } }
    } }
  } }
}`;

const loadProject = () => gql(FIELDS_QUERY, { login: OWNER, number: NUMBER }).user.projectV2;

let project = loadProject();
const projectId = project.id;

attempt("Update title, description and README", () =>
  gql(
    `mutation($id: ID!, $title: String!, $desc: String!, $readme: String!) {
      updateProjectV2(input: { projectId: $id, title: $title, shortDescription: $desc, readme: $readme }) { projectV2 { id } }
    }`,
    { id: projectId, title: read("title.txt"), desc: read("description.txt"), readme: read("README.md") },
  ),
);

const toOptions = (options) => options.map(([name, color, description]) => ({ name, color, description }));
const fieldByName = () => Object.fromEntries(project.fields.nodes.filter((f) => f.name).map((f) => [f.name, f]));

let fields = fieldByName();
for (const [name, options] of Object.entries(SELECT_FIELDS)) {
  const field = fields[name];
  if (!field) {
    attempt(`Create field ${name}`, () =>
      gql(
        `mutation($id: ID!, $name: String!, $options: [ProjectV2SingleSelectFieldOptionInput!]) {
          createProjectV2Field(input: { projectId: $id, dataType: SINGLE_SELECT, name: $name, singleSelectOptions: $options }) { clientMutationId }
        }`,
        { id: projectId, name, options: toOptions(options) },
      ),
    );
  } else if (name === "Status" && !options.every(([option]) => field.options.some((o) => o.name === option))) {
    attempt("Replace Status options", () =>
      gql(
        `mutation($id: ID!, $options: [ProjectV2SingleSelectFieldOptionInput!]) {
          updateProjectV2Field(input: { fieldId: $id, singleSelectOptions: $options }) { clientMutationId }
        }`,
        { id: field.id, options: toOptions(options) },
      ),
    );
  }
}
for (const name of Object.keys(DATE_FIELDS)) {
  if (!fields[name]) {
    attempt(`Create field ${name}`, () =>
      gql(
        `mutation($id: ID!, $name: String!) {
          createProjectV2Field(input: { projectId: $id, dataType: DATE, name: $name }) { clientMutationId }
        }`,
        { id: projectId, name },
      ),
    );
  }
}
project = loadProject();
fields = fieldByName();

// Existing items, by title, with the names of the fields that already have a value.
const existing = new Map();
let cursor = null;
do {
  const page = gql(
    `query($id: ID!, $after: String) {
      node(id: $id) { ... on ProjectV2 { items(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes { id
          content { ... on DraftIssue { title } ... on Issue { title } ... on PullRequest { title } }
          fieldValues(first: 30) { nodes {
            ... on ProjectV2ItemFieldSingleSelectValue { field { ... on ProjectV2FieldCommon { name } } }
            ... on ProjectV2ItemFieldDateValue { field { ... on ProjectV2FieldCommon { name } } }
          } }
        }
      } } }
    }`,
    { id: projectId, after: cursor },
  ).node.items;
  for (const item of page.nodes) {
    if (!item.content?.title) continue;
    const filled = new Set(item.fieldValues.nodes.map((v) => v.field?.name).filter(Boolean));
    existing.set(item.content.title, { id: item.id, filled });
  }
  cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
} while (cursor);

const setValue = (itemId, field, value) =>
  gql(
    `mutation($project: ID!, $item: ID!, $field: ID!, $value: ProjectV2FieldValue!) {
      updateProjectV2ItemFieldValue(input: { projectId: $project, itemId: $item, fieldId: $field, value: $value }) { clientMutationId }
    }`,
    { project: projectId, item: itemId, field: field.id, value },
  );

let added = 0;
for (const entry of JSON.parse(read("items.json"))) {
  let item = existing.get(entry.title);
  if (!item) {
    const id = attempt(`Add item "${entry.title}"`, () =>
      gql(
        `mutation($id: ID!, $title: String!, $body: String) {
          addProjectV2DraftIssue(input: { projectId: $id, title: $title, body: $body }) { projectItem { id } }
        }`,
        { id: projectId, title: entry.title, body: entry.body },
      ).addProjectV2DraftIssue.projectItem.id,
    );
    if (!id) continue;
    item = { id, filled: new Set() };
    added++;
  }

  for (const [name, key] of Object.entries(ITEM_KEYS)) {
    const field = fields[name];
    if (!field || item.filled.has(name) || !entry[key]) continue;
    const wanted = name === "Status" && !field.options.some((o) => o.name === entry[key]) ? STATUS_FALLBACK[entry[key]] : entry[key];
    const option = field.options.find((o) => o.name === wanted);
    if (!option) {
      errors.push(`No option "${wanted}" in field ${name}`);
      continue;
    }
    attempt(`Set ${name} on "${entry.title}"`, () => setValue(item.id, field, { singleSelectOptionId: option.id }));
  }
  for (const [name, key] of Object.entries(DATE_FIELDS)) {
    const field = fields[name];
    if (!field || item.filled.has(name) || !entry[key]) continue;
    attempt(`Set ${name} on "${entry.title}"`, () => setValue(item.id, field, { date: entry[key] }));
  }
}

console.log(`::notice::Board synced: ${added} items added, ${errors.length} errors. https://github.com/users/${OWNER}/projects/${NUMBER}`);
if (errors.length) process.exit(1);
