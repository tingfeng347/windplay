const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs/promises'), path=require('node:path'), vm=require('node:vm');
test('tracked demo matches source and runs without network dependencies',async()=>{
  const {build,root}=await import('../scripts/build.mjs');
  const expected=await build(false), actual=await fs.readFile(path.join(root,'demo/index.html'),'utf8');
  assert.equal(actual,expected,'Regenerate demo from source before committing');
  assert.doesNotMatch(actual.replace(/__THREE(?:_DEVTOOLS)?__/g,''),/__[A-Z0-9_]+__/);
  assert.doesNotMatch(actual,/<(?:script|link)\b[^>]+(?:src|href)="(?!data:)/);
  for(const match of actual.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
});
