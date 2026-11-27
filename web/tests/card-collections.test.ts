import test from 'node:test'
import assert from 'node:assert/strict'
import { createCollection, readCollections, setSharedCollections, collectionsKey } from '../src/card-collections'
import { parsePersonalCards } from '../src/personal-cards'
test('playlists reuse references, deduplicate names and preserve other collection cards', () => {
 const storage=new Map<string,string>()
 Object.assign(globalThis,{localStorage:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)},window:{dispatchEvent:()=>{}}})
 const id=createCollection(' Weekend ')
 assert.equal(createCollection('weekend'),id)
 setSharedCollections('phrase1',['restaurant',id]);setSharedCollections('phrase2',[id]);setSharedCollections('phrase1',['hotel'])
 assert.deepEqual(readCollections().find(row=>row.id===id)?.cards,['phrase2'])
 assert.deepEqual(readCollections().find(row=>row.id==='hotel')?.cards,['phrase1'])
 assert.deepEqual(readCollections().find(row=>row.id==='restaurant')?.cards,[])
 storage.set(collectionsKey,'broken');assert.throws(()=>setSharedCollections('phrase3',[id]));assert.equal(storage.get(collectionsKey),'broken')
})
test('personal cards support multiple playlist references and existing cards without membership',()=>{
 const card={id:'p',source:'en',original:'Hi',translations:{vi:{text:'Chào',origin:'user'}},useInTranslate:false,createdAt:'now',updatedAt:'now'}
 assert.equal(parsePersonalCards(JSON.stringify([card])).length,1)
 assert.deepEqual(parsePersonalCards(JSON.stringify([{...card,collectionIds:['restaurant','custom-1']}]))[0].collectionIds,['restaurant','custom-1'])
 assert.throws(()=>parsePersonalCards(JSON.stringify([{...card,collectionIds:[1]}])))
})
