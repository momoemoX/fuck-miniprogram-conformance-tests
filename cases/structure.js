const { update, query } = require('./support');

async function structure(page, check) {
  const parent = () => page.selectComponent('#family');
  await check('relation.child-membership', ['pear', 'apple'], () => parent().names().sort().reverse());
  await check('relation.parent-identity', true, () => {
    const parents = page.selectComponent('#apple').family();
    return parents.length === 1 && parents[0] === parent();
  });
  await check('relation.linked-callbacks', ['apple', 'pear'], () => parent().linkedNames.slice().sort());
  await check('relation.unlink', [['pear'], ['apple']], async () => {
    await update(page, { appleVisible: false });
    return [parent().names(), parent().removedNames.slice()];
  });
  await check('relation.reinsert', ['apple', 'apple', 'pear'], async () => {
    await update(page, { appleVisible: true });
    return parent().linkedNames.slice().sort();
  });
  await check('generic.default', 'base10/31', () => page.selectComponent('#decimal-field').result());
  await check('generic.override', 'base16/1f', () => page.selectComponent('#hex-field').result());
  await check('generic.update', ['base10/47', 'base16/2f'], async () => {
    await update(page, { amount: 47 });
    return ['#decimal-field', '#hex-field'].map(id => page.selectComponent(id).result());
  });
  await check('generic.owner', true, () => page.selectComponent('#hex-field').ownsFormatter());
  const size = async (id, selector) => (await query(page.selectComponent(id), selector, { size: true })).width;
  await check('style.isolated', 22, () => size('#isolated', '#rule'));
  await check('style.apply-shared', 37, () => size('#sharing', '#rule'));
  await check('style.external-class', [31, 43], async () => {
    const initial = await size('#isolated', '#external');
    await update(page, { extClass: 'wide-external' });
    return [initial, await size('#isolated', '#external')];
  });
}
module.exports = { structure };
