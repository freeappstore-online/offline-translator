import test from 'node:test'
import assert from 'node:assert/strict'
import { cardTemplates, templateFields, renderTemplate } from '../src/card-templates'
import { parsePersonalCards } from '../src/personal-cards'
test('templates declare reusable fields and render each original language without altering literals', () => {
  for (const template of cardTemplates) for (const source of ['en', 'vi', 'zh'] as const) {
    for (const id of template.fields) assert.ok(templateFields[id])
    const values = Object.fromEntries(template.fields.map(id => [id, 'A$&{x} 123']))
    const result = renderTemplate(template, source, values)
    for (const id of template.fields) assert.ok(result.includes(values[id]))
    assert.ok(!template.fields.some(id => result.includes('{'+id+'}')))
  }
  assert.throws(() => renderTemplate(cardTemplates[0], 'en', {}))
  assert.throws(() => renderTemplate(cardTemplates[0], 'en', {destination:'x'.repeat(121)}))
})
test('personal template provenance round-trips, old free-form cards remain valid and invalid references are rejected', () => {
  const card = {id:'sample',source:'en',original:'My reservation number is AB123.',translations:{vi:{text:'Mã đặt chỗ của tôi là AB123.',origin:'user'}},useInTranslate:false,createdAt:'now',updatedAt:'now'}
  assert.equal(parsePersonalCards(JSON.stringify([card])).length,1)
  const template = {id:'reservation_number',revision:1,source:'en',values:{booking:'AB123'}}
  assert.deepEqual(parsePersonalCards(JSON.stringify([{...card,template}]))[0].template,template)
  assert.throws(() => parsePersonalCards(JSON.stringify([{...card,template:{...template,source:'vi'}}])))
  assert.throws(() => parsePersonalCards(JSON.stringify([{...card,template:{...template,revision:0}}])))
})
