import {readFileSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
const root=process.argv[2] ?? fileURLToPath(new URL('../..', import.meta.url))
const read=p=>JSON.parse(readFileSync(root+'/'+p,'utf8'))
const save=(p,x)=>writeFileSync(root+'/'+p,JSON.stringify(x,null,2)+'\n')
const deck=read('dataset/phrases.json')
const queue=read('dataset/review/queue.json')
const batch='travel-en-vi-1000-v1'
const key=s=>s.normalize('NFC').toLowerCase().replace(/[’‘]/g,"'").replace(/[.!?。！？]+$/u,'').trim().replace(/\s+/g,' ')
const seen=new Set([...deck.map(x=>key(x.en)),...queue.filter(x=>!x.batch || x.batch!==batch).map(x=>key(x.card.en))])
const rows=[]
function family(topic,category,values,frames){
 for(const [code,en,vi,zh] of values)for(const [frame,eng,vie,zho,flags=[]] of frames){
  const text=eng(en)
  if(seen.has(key(text)))continue
  seen.add(key(text))
  rows.push({
   id:batch+'-'+topic+'-'+code+'-'+frame,category,en:text,vi:vie(vi),zh:zho(zh),
   review:{status:'pending',risk:'medium',flags,source:'pattern',
    notes:'Original AI-assisted travel draft. Batch '+batch+'. Topic '+topic+'. Frame '+frame+'. Awaiting separate critic and native-speaker review; full sentence materialized per language.'}
  })
 }
}
const places=[
 ['airport','airport','sân bay','机场'],['station','train station','ga tàu','火车站'],
 ['bus-station','bus station','bến xe','汽车站'],['bus-stop','bus stop','trạm xe buýt','公交车站'],
 ['metro','metro station','ga tàu điện ngầm','地铁站'],['ferry','ferry terminal','bến phà','渡轮码头'],
 ['hotel','hotel','khách sạn','酒店'],['hostel','hostel','nhà nghỉ tập thể','青年旅舍'],
 ['restaurant','restaurant','nhà hàng','餐厅'],['cafe','café','quán cà phê','咖啡馆'],
 ['market','market','chợ','市场'],['supermarket','supermarket','siêu thị','超市'],
 ['bakery','bakery','tiệm bánh','面包店'],['bank','bank','ngân hàng','银行'],
 ['atm','ATM','máy ATM','自动取款机'],['post-office','post office','bưu điện','邮局'],
 ['museum','museum','bảo tàng','博物馆'],['park','park','công viên','公园'],
 ['beach','beach','bãi biển','海滩'],['library','library','thư viện','图书馆'],
 ['info','tourist information center','trung tâm thông tin du lịch','游客信息中心'],
 ['parking','parking lot','bãi đỗ xe','停车场'],['taxi','taxi stand','điểm đón taxi','出租车候车点'],
 ['entrance','entrance','lối vào','入口'],['exit','exit','lối ra','出口'],
 ['bridge','bridge','cây cầu','桥'],['harbor','harbor','bến cảng','港口'],
 ['square','town square','quảng trường','广场'],['mall','shopping mall','trung tâm thương mại','购物中心'],
 ['restroom','restroom','nhà vệ sinh','洗手间']
]
family('places','directions',places,[
 ['where',x=>'Where is the '+x+'?',x=>x.charAt(0).toUpperCase()+x.slice(1)+' ở đâu?',x=>x+'在哪里？'],
 ['nearest',x=>'Where is the nearest '+x+'?',x=>x.charAt(0).toUpperCase()+x.slice(1)+' gần nhất ở đâu?',x=>'最近的'+x+'在哪里？'],
 ['route',x=>'How do I get to the '+x+'?',x=>'Tôi đến '+x+' bằng cách nào?',x=>'去'+x+'怎么走？'],
 ['walk',x=>'Can I walk to the '+x+'?',x=>'Tôi có thể đi bộ đến '+x+' không?',x=>'我可以步行去'+x+'吗？'],
 ['far',x=>'Is the '+x+' far from here?',x=>x.charAt(0).toUpperCase()+x.slice(1)+' có xa đây không?',x=>x+'离这里远吗？'],
 ['near',x=>'Is there a '+x+' nearby?',x=>'Gần đây có '+x+' không?',x=>'附近有'+x+'吗？'],
 ['map',x=>'Could you show me the '+x+' on the map?',x=>'Bạn có thể chỉ '+x+' trên bản đồ giúp tôi không?',x=>'你能在地图上给我指出'+x+'的位置吗？'],
 ['direction',x=>'Am I going the right way to the '+x+'?',x=>'Tôi có đang đi đúng đường đến '+x+' không?',x=>'我去'+x+'的方向对吗？'],
 ['past',x=>'Have we already passed the '+x+'?',x=>'Chúng ta đã đi qua '+x+' chưa?',x=>'我们已经经过'+x+'了吗？'],
 ['outside',x=>'I am waiting outside the '+x+'.',x=>'Tôi đang đợi bên ngoài '+x+'.',x=>'我正在'+x+'外面等。'],
 ['meet',x=>'Can we meet at the '+x+'?',x=>'Chúng ta có thể gặp nhau ở '+x+' không?',x=>'我们可以在'+x+'见面吗？'],
 ['take',x=>'Please take me to the '+x+'.',x=>'Làm ơn đưa tôi đến '+x+'.',x=>'请带我去'+x+'。']
])
const foods=[
 ['rice','rice','cơm','米饭'],['noodles','noodles','mì','面条'],['soup','soup','súp','汤'],
 ['chicken','chicken','thịt gà','鸡肉'],['beef','beef','thịt bò','牛肉'],['pork','pork','thịt lợn','猪肉'],
 ['fish','fish','cá','鱼'],['shrimp','shrimp','tôm','虾'],['tofu','tofu','đậu phụ','豆腐'],
 ['vegetables','vegetables','rau','蔬菜'],['salad','salad','salad','沙拉'],['bread','bread','bánh mì','面包'],
 ['eggs','eggs','trứng','鸡蛋'],['fruit','fruit','trái cây','水果'],['yogurt','yogurt','sữa chua','酸奶'],
 ['coffee','coffee','cà phê','咖啡'],['tea','tea','trà','茶'],['juice','juice','nước ép','果汁'],
 ['milk','milk','sữa','牛奶'],['water','water','nước','水']
]
family('food','food',foods,[
 ['have',x=>'Do you have '+x+'?',x=>'Ở đây có '+x+' không?',x=>'你们有'+x+'吗？'],
 ['order',x=>'I would like to order some '+x+'.',x=>'Tôi muốn gọi '+x+'.',x=>'我想点一些'+x+'。'],
 ['menu',x=>'Could you show me the '+x+' on the menu?',x=>'Bạn có thể chỉ món '+x+' trên thực đơn giúp tôi không?',x=>'你能在菜单上给我指出'+x+'吗？'],
 ['price',x=>'How much does the '+x+' cost?',x=>x.charAt(0).toUpperCase()+x.slice(1)+' giá bao nhiêu?',x=>x+'多少钱？',['currency']],
 ['ready',x=>'Is the '+x+' ready yet?',x=>x.charAt(0).toUpperCase()+x.slice(1)+' đã có chưa?',x=>x+'准备好了吗？'],
 ['takeaway',x=>'Could you pack the '+x+' to take away?',x=>'Bạn có thể gói '+x+' cho tôi mang đi không?',x=>'可以把'+x+'打包带走吗？'],
 ['more',x=>'Could we have some more '+x+'?',x=>'Cho chúng tôi thêm '+x+' được không?',x=>'可以再给我们一些'+x+'吗？'],
 ['wrong',x=>'I did not order the '+x+'.',x=>'Tôi không gọi '+x+'.',x=>'我没有点'+x+'。',['negation']],
 ['missing',x=>'The '+x+' has not arrived yet.',x=>'Tôi vẫn chưa nhận được '+x+'.',x=>x+'还没有送来。',['negation']],
 ['cancel',x=>'Could I cancel my order of '+x+'?',x=>'Tôi có thể hủy phần '+x+' đã gọi không?',x=>'我可以取消点的'+x+'吗？']
])
const things=[
 ['bag','bag','túi','包'],['suitcase','suitcase','va li','行李箱'],['backpack','backpack','ba lô','背包'],
 ['wallet','wallet','ví','钱包'],['phone','phone','điện thoại','手机'],['charger','charger','bộ sạc','充电器'],
 ['key','key','chìa khóa','钥匙'],['ticket','ticket','vé','票'],['camera','camera','máy ảnh','相机'],
 ['umbrella','umbrella','ô','雨伞'],['jacket','jacket','áo khoác','外套'],['hat','hat','mũ','帽子'],
 ['bottle','water bottle','bình nước','水瓶'],['glasses','glasses','kính','眼镜'],
 ['receipt','receipt','biên lai','收据'],['map','map','bản đồ','地图'],['book','book','sách','书'],
 ['headphones','headphones','tai nghe','耳机'],['tablet','tablet','máy tính bảng','平板电脑'],
 ['laptop','laptop','máy tính xách tay','笔记本电脑']
]
family('belongings','essentials',things,[
 ['lost',x=>'I have lost my '+x+'.',x=>'Tôi bị mất '+x+'.',x=>'我的'+x+'丢了。'],
 ['find',x=>'I cannot find my '+x+'.',x=>'Tôi không tìm thấy '+x+' của mình.',x=>'我找不到我的'+x+'。',['negation']],
 ['seen',x=>'Have you seen my '+x+'?',x=>'Bạn có thấy '+x+' của tôi không?',x=>'你见过我的'+x+'吗？'],
 ['left',x=>'I left my '+x+' here.',x=>'Tôi để quên '+x+' ở đây.',x=>'我把'+x+'忘在这里了。'],
 ['mine',x=>'That is my '+x+'.',x=>'Đó là '+x+' của tôi.',x=>'那是我的'+x+'。'],
 ['not-mine',x=>'That is not my '+x+'.',x=>'Đó không phải là '+x+' của tôi.',x=>'那不是我的'+x+'。',['negation']],
 ['keep',x=>'Could you keep my '+x+' here for a moment?',x=>'Bạn có thể giữ '+x+' của tôi ở đây một lát không?',x=>'你能把我的'+x+'在这里保管一会儿吗？'],
 ['return',x=>'Could you return my '+x+', please?',x=>'Bạn trả lại '+x+' cho tôi được không?',x=>'请把我的'+x+'还给我，好吗？'],
 ['check',x=>'May I check my '+x+'?',x=>'Tôi có thể kiểm tra '+x+' của mình không?',x=>'我可以检查一下我的'+x+'吗？'],
 ['help',x=>'Could you help me find my '+x+'?',x=>'Bạn giúp tôi tìm '+x+' được không?',x=>'你能帮我找我的'+x+'吗？']
])
const services=[
 ['wifi','Wi-Fi','Wi-Fi','无线网络'],['laundry','laundry service','dịch vụ giặt là','洗衣服务'],
 ['breakfast','breakfast','bữa sáng','早餐'],['luggage','luggage storage','dịch vụ giữ hành lý','行李寄存服务'],
 ['shuttle','airport shuttle service','dịch vụ xe đưa đón sân bay','机场接送服务'],
 ['bike','bicycle rental','dịch vụ thuê xe đạp','自行车租赁服务'],
 ['car','car rental','dịch vụ thuê ô tô','汽车租赁服务'],['tour','a guided tour','chuyến tham quan có hướng dẫn viên','导览服务'],
 ['printing','printing service','dịch vụ in','打印服务'],['charging','phone charging','dịch vụ sạc điện thoại','手机充电服务'],
 ['delivery','delivery service','dịch vụ giao hàng','配送服务'],['room','room service','dịch vụ phòng','客房服务'],
 ['cleaning','room cleaning','dịch vụ dọn phòng','客房清洁服务'],['late-checkout','late checkout','dịch vụ trả phòng muộn','延迟退房服务'],
 ['early-checkin','early check-in','dịch vụ nhận phòng sớm','提前入住服务'],
 ['locker','locker rental','dịch vụ thuê tủ khóa','储物柜租赁服务'],
 ['parking','parking','dịch vụ đỗ xe','停车服务'],['guide','an English-speaking guide','hướng dẫn viên nói tiếng Anh','英语导游服务'],
 ['sim','SIM card activation','dịch vụ kích hoạt SIM','SIM卡激活服务'],
 ['wake','a wake-up call','dịch vụ gọi báo thức','叫醒服务']
]
family('services','essentials',services,[
 ['offer',x=>'Do you offer '+x+'?',x=>'Ở đây có '+x+' không?',x=>'你们提供'+x+'吗？'],
 ['use',x=>'I would like to use '+x+'.',x=>'Tôi muốn sử dụng '+x+'.',x=>'我想使用'+x+'。'],
 ['included',x=>'Is '+x+' included in the price?',x=>x.charAt(0).toUpperCase()+x.slice(1)+' có được bao gồm trong giá không?',x=>x+'包含在价格里吗？',['currency']],
 ['cost',x=>'How much do you charge for '+x+'?',x=>'Phí '+x+' là bao nhiêu?',x=>x+'的费用是多少？',['currency']],
 ['arrange',x=>'Could you arrange '+x+' for me?',x=>'Bạn có thể sắp xếp '+x+' cho tôi không?',x=>'你能帮我安排'+x+'吗？'],
 ['today',x=>'Is '+x+' available today?',x=>'Hôm nay có '+x+' không?',x=>'今天有'+x+'吗？',['time_date']],
 ['tomorrow',x=>'Can I book '+x+' for tomorrow?',x=>'Tôi có thể đặt '+x+' cho ngày mai không?',x=>'我可以预订明天的'+x+'吗？',['time_date']],
 ['where',x=>'Where can I ask about '+x+'?',x=>'Tôi có thể hỏi về '+x+' ở đâu?',x=>'我可以在哪里咨询'+x+'？'],
 ['hours',x=>'What are the operating hours for '+x+'?',x=>x.charAt(0).toUpperCase()+x.slice(1)+' hoạt động trong khung giờ nào?',x=>x+'的服务时间是几点？',['time_date']],
 ['pay',x=>'Where do I pay for '+x+'?',x=>'Tôi thanh toán phí '+x+' ở đâu?',x=>'我在哪里支付'+x+'的费用？',['currency']]
])
const transit=[
 ['hanoi','Hanoi','Hà Nội','河内'],['hcmc','Ho Chi Minh City','Thành phố Hồ Chí Minh','胡志明市'],
 ['danang','Da Nang','Đà Nẵng','岘港'],['hue','Hue','Huế','顺化'],['hoian','Hoi An','Hội An','会安'],
 ['dalat','Da Lat','Đà Lạt','大叻'],['nhatrang','Nha Trang','Nha Trang','芽庄'],
 ['cantho','Can Tho','Cần Thơ','芹苴'],['haiphong','Hai Phong','Hải Phòng','海防'],
 ['vungtau','Vung Tau','Vũng Tàu','头顿'],
]
family('intercity','directions',transit,[
 ['ticket',x=>'I would like a bus ticket to '+x+'.',x=>'Tôi muốn mua vé xe khách đi '+x+'.',x=>'我想买一张去'+x+'的长途汽车票。',['proper_name']],
 ['direct',x=>'Is there a direct bus to '+x+'?',x=>'Có xe khách đi thẳng đến '+x+' không?',x=>'有直达'+x+'的长途汽车吗？',['proper_name']],
 ['next',x=>'When is the next bus to '+x+'?',x=>'Chuyến xe khách tiếp theo đi '+x+' khởi hành lúc mấy giờ?',x=>'下一班去'+x+'的长途汽车几点出发？',['proper_name','time_date']],
 ['last',x=>'When is the last bus to '+x+'?',x=>'Chuyến xe khách cuối cùng đi '+x+' khởi hành lúc mấy giờ?',x=>'去'+x+'的末班长途汽车几点出发？',['proper_name','time_date']],
 ['duration',x=>'How long does the bus journey to '+x+' take?',x=>'Đi xe khách đến '+x+' mất bao lâu?',x=>'坐长途汽车去'+x+'需要多长时间？',['proper_name']],
 ['arrival',x=>'What time does this bus arrive in '+x+'?',x=>'Xe khách này đến '+x+' lúc mấy giờ?',x=>'这班长途汽车几点到'+x+'？',['proper_name','time_date']],
 ['going',x=>'Does this bus go to '+x+'?',x=>'Xe khách này có đi '+x+' không?',x=>'这班长途汽车去'+x+'吗？',['proper_name']],
 ['stop',x=>'Please tell me when we arrive in '+x+'.',x=>'Đến '+x+' thì báo tôi biết nhé.',x=>'到了'+x+'请告诉我。',['proper_name']],
 ['fare',x=>'How much is a bus ticket to '+x+'?',x=>'Vé xe khách đi '+x+' giá bao nhiêu?',x=>'去'+x+'的长途汽车票多少钱？',['proper_name','currency']],
 ['depart',x=>'Where does the bus to '+x+' depart from?',x=>'Xe khách đi '+x+' khởi hành ở đâu?',x=>'去'+x+'的长途汽车从哪里出发？',['proper_name']]
])
const count=1000-deck.length
assert(rows.length>=count,'Not enough unique candidates')
const chosen=Array.from({length:count},(_,i)=>rows[Math.floor(i*rows.length/count)])
const existingBatch=queue.filter(x=>x.batch===batch)
const kept=queue.filter(x=>x.batch!==batch)
assert(existingBatch.length===0 || JSON.stringify(existingBatch.map(x=>x.card))===JSON.stringify(chosen),'Existing batch was edited; refusing overwrite')
const at=new Date().toISOString()
const candidates=[...deck,...chosen]
for(const lang of ['en','vi','zh'])assert(candidates.every(x=>typeof x[lang]==='string'&&x[lang].trim()))
assert.equal(new Set(candidates.map(x=>x.id)).size,1000)
assert.equal(new Set(candidates.map(x=>key(x.en))).size,1000)
const staged=chosen.map(card=>({id:'batch-'+card.id,batch,state:'needs_human',card,draft:{model:'assistant-authored-pattern-expansion',at,promptVersion:'2026-11-25.1',seed:card.en,source:'pattern'},critiques:[]}))
save('dataset/review/seeds/'+batch+'.json',{source:'pattern',attribution:'Original AI-assisted sentence patterns and localized full sentences; generated 2026-11-25. Pending critic and human review.',seeds:chosen})
save('dataset/review/'+batch+'.json',candidates)
if(!existingBatch.length)save('dataset/review/queue.json',[...kept,...staged])
const counts={}
for(const card of chosen)counts[card.category]=(counts[card.category]||0)+1
save('dataset/review/'+batch+'-validation.json',{batch,target:1000,existing:deck.length,newDrafts:chosen.length,queueTotal:kept.length+staged.length,counts,checks:{uniqueIds:true,uniqueNormalizedEnglish:true,nonemptyEnViZh:true,allNewRowsPending:chosen.every(x=>x.review.status==='pending')},limitations:['Pattern-generated full sentences share a limited set of constructions.','Independent critic and native review have not run.','Pending candidates are excluded from the production deck.']})
console.log(JSON.stringify({candidates:candidates.length,newDrafts:chosen.length,queue:kept.length+staged.length,counts},null,2))
