const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
test('tracked standalone demo matches source and contains no external dependencies or build tokens', () => {
 let expected = fs.readFileSync(path.join(root, 'src/index.html'), 'utf8');
 expected = expected.replace('<link rel="stylesheet" href="styles.css">', () => '<style>\n' + fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8').replace('../assets/display.woff2', 'data:font/woff2;base64,' + fs.readFileSync(path.join(root, 'assets/display.woff2')).toString('base64')) + '</style>');
 for (const name of ['core', 'render', 'app']) {
  const source = fs.readFileSync(path.join(root, 'src', name + '.js'), 'utf8');
  new vm.Script(source, { filename: name });
  expected = expected.replace('<script src="' + name + '.js"></script>', () => '<script>\n' + source + '</script>');
 }
 const demo = fs.readFileSync(path.join(root, 'demo/index.html'), 'utf8');
 assert.equal(demo, expected, 'Run npm run build to refresh the tracked demo.');
 assert.doesNotMatch(demo, /__[A-Z0-9_]+__/);
 assert.doesNotMatch(demo, /<(?:link|script)\b[^>]+(?:src|href)="(?!data:)/);
 assert.doesNotMatch(demo, /\.\.\/assets\/display/);
 assert.match(demo, /aria-live="polite"/);
 assert.match(demo, /prefers-reduced-motion/);
});
