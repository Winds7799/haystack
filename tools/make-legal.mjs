// Emits docs/ as static pages for GitHub Pages, from the same source the app
// renders. The site and the app can never drift apart, because there is only
// one copy of the words.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DOCUMENTS, LAST_UPDATED, PUBLISHER, legalIncomplete } from '../src/legal/documents.ts';

if (legalIncomplete()) {
  throw new Error(
    'PUBLISHER still holds placeholders. Fill in contact and jurisdiction before publishing.'
  );
}

const escape = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The same palette the game uses, so the pages look like the app.
const CSS = `
:root {
  --ink: #0a0705; --surface: #180f09; --border: #3b2717;
  --gold: #d39b3c; --text: #f0e2cb; --muted: #9c876c;
}
* { box-sizing: border-box; }
body {
  margin: 0; padding: 3rem 1.25rem 5rem; background: var(--ink); color: var(--muted);
  font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
main { max-width: 38rem; margin: 0 auto; }
h1 { color: var(--text); font-family: Georgia, "Times New Roman", serif;
     font-size: 2rem; letter-spacing: .02em; margin: 0 0 .25rem; }
h2 { color: var(--text); font-family: Georgia, "Times New Roman", serif;
     font-size: 1.15rem; margin: 2.25rem 0 .5rem; }
p { margin: 0 0 .85rem; }
a { color: var(--gold); }
.updated { color: var(--gold); font-size: .8rem; letter-spacing: .04em;
           text-transform: uppercase; margin-bottom: 2rem; }
nav { display: flex; gap: .5rem; margin: 1.5rem 0 2.5rem; flex-wrap: wrap; }
nav a { display: inline-block; padding: .55rem 1.1rem; border: 1px solid var(--border);
        border-radius: 999px; background: var(--surface); text-decoration: none; }
nav a[aria-current="page"] { border-color: var(--gold); }
footer { margin-top: 3.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border);
         font-size: .9rem; }
`;

function page({ title, heading, nav, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<meta name="description" content="${escape(title)} for Haystack.">
<style>${CSS}</style>
</head>
<body>
<main>
<h1>${escape(heading)}</h1>
<p class="updated">Last updated ${escape(LAST_UPDATED)}</p>
${nav}
${body}
<footer>
<p>Questions, reports and removal requests: <a href="mailto:${escape(PUBLISHER.contact)}">${escape(PUBLISHER.contact)}</a></p>
<p>Governed by the law of ${escape(PUBLISHER.jurisdiction)}.</p>
</footer>
</main>
</body>
</html>
`;
}

function navFor(current) {
  const links = [['index.html', 'Haystack'], ...DOCUMENTS.map((d) => [`${d.id}.html`, d.title])];
  return `<nav>${links
    .map(
      ([href, label]) =>
        `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>${escape(label)}</a>`
    )
    .join('')}</nav>`;
}

const out = join(process.cwd(), 'docs');
mkdirSync(out, { recursive: true });

for (const doc of DOCUMENTS) {
  const body = doc.sections
    .map(
      (section) =>
        `<h2>${escape(section.heading)}</h2>\n` +
        section.body.map((p) => `<p>${escape(p)}</p>`).join('\n')
    )
    .join('\n');
  writeFileSync(
    join(out, `${doc.id}.html`),
    page({
      title: `Haystack — ${doc.title}`,
      heading: doc.title,
      nav: navFor(`${doc.id}.html`),
      body,
    })
  );
}

writeFileSync(
  join(out, 'index.html'),
  page({
    title: 'Haystack',
    heading: 'Haystack',
    nav: navFor('index.html'),
    body: `<p>A game about finding one needle in a great deal of straw.</p>
<p>Thirty levels. The difficulty is never more straw — it is decoys that look
more and more like the thing you are hunting, until a nail is nearly a needle
and only the eye gives it away.</p>
<h2>Legal</h2>
<p>These pages hold the <a href="privacy.html">privacy policy</a> and the
<a href="terms.html">terms</a>. The same text appears inside the app under
Settings.</p>`,
  })
);

// Pages otherwise runs the files through Jekyll, which ignores some of them.
writeFileSync(join(out, '.nojekyll'), '');

console.log(`docs/ written: index, ${DOCUMENTS.map((d) => d.id).join(', ')}`);
