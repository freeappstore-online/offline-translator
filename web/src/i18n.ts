import { useSyncExternalStore } from 'react'
export type Locale = 'en' | 'vi' | 'zh'
const key = 'offline-translator-ui-language'
function initialLocale(): Locale {
  try { const saved = localStorage.getItem(key); if (saved === 'en' || saved === 'vi' || saved === 'zh') return saved } catch { /* use browser preference */ }
  const language = navigator.language.toLowerCase()
  return language.startsWith('vi') ? 'vi' : language.startsWith('zh') ? 'zh' : 'en'
}
let locale: Locale = initialLocale()
const listeners = new Set<() => void>()
export function setLocale(next: Locale) {
  locale = next
  try { localStorage.setItem(key, next) } catch { /* keep session preference */ }
  document.documentElement.lang = next === 'zh' ? 'zh-Hans' : next
  listeners.forEach(listener => listener())
}
export function useLocale() {
  return useSyncExternalStore(callback => { listeners.add(callback); return () => { listeners.delete(callback) } }, () => locale)
}
const messages: Record<string, Partial<Record<Locale, string>>> = {
"My cards": {
    "vi": "Thẻ của tôi",
    "zh": "我的卡片"
  },
  "New card": {
    "vi": "Tạo thẻ",
    "zh": "新建卡片"
  },
  "Card collections": {
    "vi": "Bộ sưu tập thẻ",
    "zh": "卡片集合"
  },
  "Shared cards": {
    "vi": "Thẻ chung",
    "zh": "共用卡片"
  },
  "Saved results": {
    "vi": "Bản dịch đã lưu",
    "zh": "已保存译文"
  },
  "Original language": {
    "vi": "Ngôn ngữ gốc",
    "zh": "原文语言"
  },
  "Original phrase": {
    "vi": "Câu gốc",
    "zh": "原文短语"
  },
  "Translate into": {
    "vi": "Dịch sang",
    "zh": "翻译成"
  },
  "Generate translations": {
    "vi": "Tạo bản dịch",
    "zh": "生成译文"
  },
  "Save personal card": {
    "vi": "Lưu thẻ cá nhân",
    "zh": "保存个人卡片"
  },
  "Search my cards": {
    "vi": "Tìm thẻ của tôi",
    "zh": "搜索我的卡片"
  },
  "AI translated · unreviewed": {
    "vi": "AI dịch · chưa được duyệt",
    "zh": "AI 翻译 · 未审核"
  },
  "User written · unreviewed": {
    "vi": "Người dùng viết · chưa được duyệt",
    "zh": "用户编写 · 未审核"
  },
  "Edited by you": {
    "vi": "Bạn đã chỉnh sửa",
    "zh": "您已编辑"
  },
  "Use this card in Translate": {
    "vi": "Dùng thẻ này khi dịch",
    "zh": "在翻译中使用此卡片"
  },
  "Personal card · unreviewed": {
    "vi": "Thẻ cá nhân · chưa được duyệt",
    "zh": "个人卡片 · 未审核"
  },
  "Exact matching enabled": {
    "vi": "Đã bật khớp chính xác",
    "zh": "已启用精确匹配"
  },
  "Not used for automatic matching": {
    "vi": "Không dùng để tự động khớp",
    "zh": "不用于自动匹配"
  },
  "Personal card saved.": {
    "vi": "Đã lưu thẻ cá nhân.",
    "zh": "个人卡片已保存。"
  },
  "Personal card removed.": {
    "vi": "Đã xóa thẻ cá nhân.",
    "zh": "个人卡片已移除。"
  },
  "Personal card restored.": {
    "vi": "Đã khôi phục thẻ cá nhân.",
    "zh": "个人卡片已恢复。"
  },
  "Undo remove": {
    "vi": "Hoàn tác xóa",
    "zh": "撤销移除"
  },
  "Export personal cards JSON": {
    "vi": "Xuất thẻ cá nhân JSON",
    "zh": "导出个人卡片 JSON"
  },
  "Could not export personal cards.": {
    "vi": "Không xuất được thẻ cá nhân.",
    "zh": "无法导出个人卡片。"
  },
  "Personal cards stay in this browser. AI drafts are unreviewed; saving or editing does not verify their accuracy.": {
    "vi": "Thẻ cá nhân được lưu trong trình duyệt này. Bản nháp AI chưa được duyệt; lưu hay chỉnh sửa không xác nhận độ chính xác.",
    "zh": "个人卡片保留在此浏览器中。AI 草稿未经审核，保存或编辑不代表准确性已验证。"
  },
  "Source changed. Generate or enter translations again.": {
    "vi": "Câu gốc đã thay đổi. Hãy tạo hoặc nhập lại bản dịch.",
    "zh": "原文已更改，请重新生成或输入译文。"
  },
  "Review and edit the drafts before saving.": {
    "vi": "Kiểm tra và chỉnh sửa bản nháp trước khi lưu.",
    "zh": "保存前请检查并编辑草稿。"
  },
  "Drafts are generated on this device. First use may download the selected model; prepare it in Packs for offline use. You can also enter translations yourself.": {
    "vi": "Bản nháp được tạo trên thiết bị này. Lần đầu có thể cần tải mô hình; hãy chuẩn bị trong Gói tải xuống để dùng ngoại tuyến. Bạn cũng có thể tự nhập bản dịch.",
    "zh": "草稿在此设备上生成。首次使用可能下载所选模型，请在下载包中提前准备以便离线使用。您也可以自行输入译文。"
  },
  "Keep each version within 500 characters.": {
    "vi": "Mỗi phiên bản cần tối đa 500 ký tự.",
    "zh": "每个版本请控制在500个字符以内。"
  },
  "Only exact matches use your saved wording. This does not mark the translation as reviewed.": {
    "vi": "Chỉ câu khớp chính xác mới dùng bản dịch đã lưu. Điều này không đánh dấu bản dịch là đã được duyệt.",
    "zh": "只有精确匹配才会使用您保存的措辞，这不会将译文标记为已审核。"
  },
  "Create a personal card for a phrase you often need.": {
    "vi": "Tạo thẻ cá nhân cho câu bạn thường cần.",
    "zh": "为您经常需要的短语创建个人卡片。"
  },
  "Could not save personal cards. Browser storage is full, unavailable or contains invalid data. Export a backup before clearing site data.": {
    "vi": "Không lưu được thẻ cá nhân. Bộ nhớ trình duyệt đã đầy, không khả dụng hoặc dữ liệu không hợp lệ. Hãy xuất bản sao lưu trước khi xóa dữ liệu trang.",
    "zh": "无法保存个人卡片。浏览器存储已满、不可用或数据无效。清除网站数据前请先导出备份。"
  },
  "1 package selected": { vi: "Đã chọn 1 gói", zh: "已选 1 个包" },
"Recommended package": {
    "vi": "Gói đề xuất",
    "zh": "推荐包"
  },
  "Your package": {
    "vi": "Gói của bạn",
    "zh": "自定义包"
  },
  "Package recommendation": {
    "vi": "Đề xuất gói",
    "zh": "推荐依据"
  },
  "Text · Voice · Camera · Cards": {
    "vi": "Văn bản · Giọng nói · Máy ảnh · Thẻ câu",
    "zh": "文字 · 语音 · 相机 · 短语卡"
  },
  "{count} packages selected": {
    "vi": "Đã chọn {count} gói",
    "zh": "已选 {count} 个包"
  },
  "Estimated package storage": {
    "vi": "Dung lượng gói ước tính",
    "zh": "预计包存储空间"
  },
  "Additional space needed": {
    "vi": "Dung lượng cần thêm",
    "zh": "还需空间"
  },
  "Checking…": {
    "vi": "Đang kiểm tra…",
    "zh": "正在检查…"
  },
  "Translation will use {model}.": {
    "vi": "Bản dịch sẽ dùng {model}.",
    "zh": "翻译将使用 {model}。"
  },
  "Use installed package": {
    "vi": "Dùng gói đã tải",
    "zh": "使用已安装的包"
  },
  "Install selected packages": {
    "vi": "Cài các gói đã chọn",
    "zh": "安装所选包"
  },
  "Install recommended package": {
    "vi": "Cài gói đề xuất",
    "zh": "安装推荐包"
  },
  "Back to recommended package": {
    "vi": "Về gói đề xuất",
    "zh": "返回推荐包"
  },
  "Customise packages": {
    "vi": "Tùy chỉnh gói",
    "zh": "自定义包"
  },
  "Installing {current} of {total}": {
    "vi": "Đang cài {current}/{total}",
    "zh": "正在安装 {current}/{total}"
  },
  "Selected packages are ready.": {
    "vi": "Các gói đã chọn đã sẵn sàng.",
    "zh": "所选包已准备就绪。"
  },
  "Unticking excludes a package from this installation. Saved packages are kept.": {
    "vi": "Bỏ chọn để không cài gói trong lần này. Các gói đã lưu vẫn được giữ.",
    "zh": "取消勾选仅将该包排除在本次安装之外，已保存的包会保留。"
  },
  "Estimates include shared runtimes once.": {
    "vi": "Bộ chạy dùng chung chỉ được tính một lần.",
    "zh": "共用运行时仅计算一次。"
  },
  "Storage estimate": {
    "vi": "Ước tính dung lượng",
    "zh": "存储空间估算"
  },
  "Estimated free browser storage is below this selection.": {
    "vi": "Dung lượng trống ước tính không đủ cho lựa chọn này.",
    "zh": "预计浏览器剩余空间小于当前选择所需空间。"
  },
  "Manage saved packages": {
    "vi": "Quản lý gói đã lưu",
    "zh": "管理已保存的包"
  },
  "About {name}": {
    "vi": "Thông tin về {name}",
    "zh": "关于 {name}"
  },
  "Saves the shared card library for offline lookup. Pending cards still require review.": {
    "vi": "Lưu thư viện thẻ câu dùng chung để tra cứu ngoại tuyến. Các thẻ đang chờ vẫn cần được duyệt.",
    "zh": "保存共用短语卡库以供离线查找。待审核卡片仍需审核。"
  },
  "One shared translation model covers both directions and all three app languages. This starter choice is provisional, not a proven accuracy winner.": {
    "vi": "Một mô hình dùng chung hỗ trợ hai chiều và cả ba ngôn ngữ của ứng dụng. Đây là lựa chọn khởi đầu tạm thời, chưa được chứng minh là chính xác nhất.",
    "zh": "一个共用翻译模型支持双向及应用中的三种语言。这是暂定的初始选择，并非已证实的准确率最优模型。"
  },
  "Whisper Tiny turns speech into text locally. Shared across all three languages; live text may be revised. Recognition errors are possible.": {
    "vi": "Whisper Tiny chuyển giọng nói thành văn bản trên thiết bị. Dùng chung cho cả ba ngôn ngữ; chữ trực tiếp có thể được chỉnh lại. Nhận dạng có thể sai.",
    "zh": "Whisper Tiny 在本地将语音转为文字，三种语言共用。实时文字可能会修订，识别可能出错。"
  },
  "Recognizes text in photos on this device. Each language needs its own data; the camera runtime is shared.": {
    "vi": "Nhận dạng chữ trong ảnh trên thiết bị. Mỗi ngôn ngữ cần dữ liệu riêng; bộ chạy máy ảnh được dùng chung.",
    "zh": "在此设备上识别照片中的文字。每种语言需要各自的数据，相机运行时共用。"
  },
  "A smaller, direction-specific translation model. The reverse direction needs a separate package. Optional alternative; quality must be tested for each direction.": {
    "vi": "Mô hình dịch nhỏ hơn cho một chiều. Chiều ngược lại cần gói riêng. Đây là lựa chọn thay thế; chất lượng cần được kiểm thử theo từng chiều.",
    "zh": "体积更小的单向翻译模型，反向需要另一个包。这是可选替代方案，质量需按方向分别测试。"
  },
  "This is a provisional starter bundle for text, voice, camera and cards. M2M100 is selected to share one model across both directions. Model recommendations will be revised after further testing of capabilities, translation accuracy, speed, storage, memory and failures on real devices. This is not a proven accuracy ranking.": {
    "vi": "Đây là gói khởi đầu tạm thời cho văn bản, giọng nói, máy ảnh và thẻ câu. M2M100 được chọn để dùng chung một mô hình cho hai chiều. Đề xuất sẽ được điều chỉnh sau khi kiểm thử thêm về khả năng, độ chính xác, tốc độ, dung lượng, bộ nhớ và lỗi trên thiết bị thật. Đây không phải bảng xếp hạng độ chính xác đã được xác nhận.",
    "zh": "这是文字、语音、相机和短语卡的暂定初始包。选择 M2M100 是为了双向共用一个模型。后续将根据真实设备上的能力、翻译准确率、速度、存储、内存和故障测试调整推荐。这不是已经验证的准确率排名。"
  },
  "Estimates use pinned model file sizes and decompressed camera data, counting shared runtimes once. Additional space excludes complete saved packages. Browser overhead, partial downloads and temporary installation files may need more room. Storage is not runtime memory. Unticking does not delete saved packages.": {
    "vi": "Ước tính dựa trên kích thước tệp mô hình đã cố định và dữ liệu máy ảnh sau giải nén, chỉ tính bộ chạy dùng chung một lần. Dung lượng cần thêm không tính các gói đã lưu đầy đủ. Trình duyệt, tệp tải dở và tệp cài đặt tạm có thể cần thêm chỗ. Dung lượng lưu trữ không phải bộ nhớ khi chạy. Bỏ chọn không xóa gói đã lưu.",
    "zh": "估算基于固定版本的模型文件和解压后的相机数据，共用运行时仅计算一次。额外空间不包括完整保存的包。浏览器开销、部分下载和临时安装文件可能需要更多空间。存储空间不等于运行内存，取消勾选不会删除已保存的包。"
  },
  "Talk": { vi: "Trò chuyện", zh: "对话" },
  "Listening… Tap to stop.": { vi: "Đang nghe… Chạm để dừng.", zh: "正在聆听…点按停止。" },
  "Conversation style": { vi: "Kiểu hội thoại", zh: "对话样式" },
  "Chat conversation": { vi: "Hội thoại dạng tin nhắn", zh: "聊天式对话" },
  "Conversation messages": { vi: "Tin nhắn hội thoại", zh: "对话消息" },
  "Face-to-face conversation": { vi: "Hội thoại đối diện", zh: "面对面对话" },
  "Tap either microphone to start a conversation.": { vi: "Chạm vào một trong hai micro để bắt đầu hội thoại.", zh: "点按任一麦克风开始对话。" },
  "Listening…": { vi: "Đang nghe…", zh: "正在聆听…" },
  "Download": { vi: "Tải xuống", zh: "下载" },
  "Manage": { vi: "Quản lý", zh: "管理" },
  "Not downloaded": { vi: "Chưa tải", zh: "未下载" },
  "Download once. Use offline in this browser.": { vi: "Tải một lần. Dùng ngoại tuyến trong trình duyệt này.", zh: "下载一次，即可在此浏览器中离线使用。" },
  "Text translation": { vi: "Dịch văn bản", zh: "文字翻译" },
  "Shared multilingual model": { vi: "Mô hình dùng chung cho nhiều ngôn ngữ", zh: "共用多语言模型" },
  "Smaller download · one direction": { vi: "Gói nhỏ hơn · một chiều", zh: "下载更小 · 单向" },
  "Shared by all three languages.": { vi: "Dùng chung cho cả ba ngôn ngữ.", zh: "三种语言共用。" },
  "{count} of {total} saved": { vi: "Đã tải {count}/{total}", zh: "已下载 {count}/{total}" },
  "Export test records": { vi: "Xuất dữ liệu thử nghiệm", zh: "导出测试记录" },
  "Listening… Words may change until you stop. Maximum 20 seconds.": { vi: "Đang nghe… Chữ có thể thay đổi cho đến khi bạn dừng. Tối đa 20 giây.", zh: "正在聆听…停止前文字可能会调整，最长20秒。" },
  "Finalizing speech…": { vi: "Đang hoàn thiện lời nói…", zh: "正在确认识别结果…" },
  "Live microphone input is not supported in this browser. You can still type.": { vi: "Trình duyệt này không hỗ trợ nhập giọng nói trực tiếp. Bạn vẫn có thể gõ.", zh: "此浏览器不支持实时语音输入，您仍可输入文字。" },
  "Speech recognized.": { vi: "Đã nhận dạng giọng nói.", zh: "语音识别完成。" },
  "Check the recognized text, then tap Send.": { vi: "Kiểm tra nội dung nhận dạng, rồi nhấn Gửi.", zh: "检查识别的文字，然后点按发送。" },
  "Cards": {
    "vi": "Thẻ câu",
    "zh": "短语卡"
  },
  "Translate": {
    "vi": "Dịch",
    "zh": "翻译"
  },
  "Packs": {
    "vi": "Gói tải xuống",
    "zh": "下载包"
  },
  "Quick Cards": {
    "vi": "Thẻ câu nhanh",
    "zh": "常用短语"
  },
  "Language Packs": {
    "vi": "Gói ngôn ngữ",
    "zh": "语言包"
  },
  "App language": {
    "vi": "Ngôn ngữ giao diện",
    "zh": "界面语言"
  },
  "Language": {
    "vi": "Ngôn ngữ",
    "zh": "语言"
  },
  "Languages": {
    "vi": "Ngôn ngữ",
    "zh": "语言"
  },
  "One way": {
    "vi": "Một chiều",
    "zh": "单向"
  },
  "Chat": {
    "vi": "Trò chuyện",
    "zh": "聊天"
  },
  "Face to face": {
    "vi": "Đối thoại trực tiếp",
    "zh": "面对面"
  },
  "From": {
    "vi": "Từ",
    "zh": "源语言"
  },
  "To": {
    "vi": "Sang",
    "zh": "目标语言"
  },
  "Reverse": {
    "vi": "Đảo chiều",
    "zh": "反向"
  },
  "Send": {
    "vi": "Gửi",
    "zh": "发送"
  },
  "Swap languages": {
    "vi": "Đảo ngôn ngữ",
    "zh": "交换语言"
  },
  "Translation settings": {
    "vi": "Cài đặt dịch",
    "zh": "翻译设置"
  },
  "Translation model": {
    "vi": "Mô hình dịch",
    "zh": "翻译模型"
  },
  "Search phrases": {
    "vi": "Tìm câu",
    "zh": "搜索短语"
  },
  "Search all scenarios": {
    "vi": "Tìm trong mọi tình huống",
    "zh": "搜索所有场景"
  },
  "Saved": {
    "vi": "Đã lưu",
    "zh": "已收藏"
  },
  "All phrases": {
    "vi": "Tất cả câu",
    "zh": "所有短语"
  },
  "Searching all scenarios": {
    "vi": "Đang tìm trong mọi tình huống",
    "zh": "正在搜索所有场景"
  },
  "No matching cards.": {
    "vi": "Không có câu phù hợp.",
    "zh": "没有匹配的短语。"
  },
  "Show fewer": {
    "vi": "Thu gọn",
    "zh": "收起"
  },
  "Close card": {
    "vi": "Đóng thẻ",
    "zh": "关闭卡片"
  },
  "Start the conversation below.": {
    "vi": "Bắt đầu trò chuyện bên dưới.",
    "zh": "在下方开始对话。"
  },
  "Suggested cards · tap to use": {
    "vi": "Câu gợi ý · chạm để dùng",
    "zh": "推荐短语 · 点击使用"
  },
  "Use": {
    "vi": "Dùng",
    "zh": "使用"
  },
  "Enter a word or phrase": {
    "vi": "Nhập một từ hoặc câu",
    "zh": "输入单词或短语"
  },
  "Write in": {
    "vi": "Nhập bằng",
    "zh": "输入语言"
  },
  "translation": {
    "vi": "bản dịch",
    "zh": "译文"
  },
  "Your translation will appear here.": {
    "vi": "Bản dịch sẽ hiện ở đây.",
    "zh": "译文将显示在这里。"
  },
  "First language": {
    "vi": "Ngôn ngữ thứ nhất",
    "zh": "第一语言"
  },
  "Second language": {
    "vi": "Ngôn ngữ thứ hai",
    "zh": "第二语言"
  },
  "Search languages": {
    "vi": "Tìm ngôn ngữ",
    "zh": "搜索语言"
  },
  "No matching languages": {
    "vi": "Không có ngôn ngữ phù hợp",
    "zh": "没有匹配的语言"
  },
  "Download once while online. Saved resources are reused in this browser.": {
    "vi": "Tải một lần khi có mạng. Tài nguyên đã lưu được dùng lại trong trình duyệt này.",
    "zh": "联网下载一次，已保存的资源可在此浏览器中重复使用。"
  },
  "Travel phrases": {
    "vi": "Câu giao tiếp du lịch",
    "zh": "旅行短语"
  },
  "cards for this pair · shared library includes all three languages": {
    "vi": "câu cho cặp này · thư viện chung gồm cả ba ngôn ngữ",
    "zh": "条短语适用于此语言对 · 共享短语库包含三种语言"
  },
  "Saved in this browser": {
    "vi": "Đã lưu trong trình duyệt này",
    "zh": "已保存在此浏览器中"
  },
  "Ready to download": {
    "vi": "Sẵn sàng tải",
    "zh": "可下载"
  },
  "Saving…": {
    "vi": "Đang lưu…",
    "zh": "正在保存…"
  },
  "Save library again": {
    "vi": "Lưu lại thư viện",
    "zh": "重新保存短语库"
  },
  "Download phrases": {
    "vi": "Tải thư viện câu",
    "zh": "下载短语"
  },
  "Translation models": {
    "vi": "Mô hình dịch",
    "zh": "翻译模型"
  },
  "Preparing…": {
    "vi": "Đang chuẩn bị…",
    "zh": "正在准备…"
  },
  "Check saved model": {
    "vi": "Kiểm tra mô hình đã lưu",
    "zh": "检查已保存的模型"
  },
  "Download model": {
    "vi": "Tải mô hình",
    "zh": "下载模型"
  },
  "Storage & downloads": {
    "vi": "Bộ nhớ và tải xuống",
    "zh": "存储与下载"
  },
  "App storage ·": {
    "vi": "Dung lượng ứng dụng ·",
    "zh": "应用存储 ·"
  },
  "Model sizes exclude the shared runtime. Saved models take a short time to prepare after reopening. Browser storage can be cleared or evicted.": {
    "vi": "Dung lượng mô hình chưa gồm bộ chạy chung. Mô hình đã lưu cần chút thời gian chuẩn bị khi mở lại. Dữ liệu trình duyệt có thể bị xóa hoặc tự giải phóng.",
    "zh": "模型大小不含共享运行时。重新打开后，已保存模型仍需短暂准备。浏览器存储可能被清除或回收。"
  },
  "Export translation JSON": {
    "vi": "Xuất nhật ký dịch JSON",
    "zh": "导出翻译 JSON"
  },
  "Try again": {
    "vi": "Thử lại",
    "zh": "重试"
  },
  "Loading phrases…": {
    "vi": "Đang tải câu…",
    "zh": "正在加载短语…"
  },
  "The phrase deck is being set up.": {
    "vi": "Thư viện câu đang được thiết lập.",
    "zh": "正在设置短语库。"
  },
  "Couldn’t load phrases. Check your connection and try again.": {
    "vi": "Không tải được câu. Kiểm tra kết nối rồi thử lại.",
    "zh": "无法加载短语。请检查网络后重试。"
  },
  "Translate in one direction. Swap languages to go the other way.": {
    "vi": "Dịch một chiều. Đảo ngôn ngữ để dịch chiều ngược lại.",
    "zh": "单向翻译。交换语言可反向翻译。"
  },
  "Message-style conversation. English on one side, the other language on the other.": {
    "vi": "Trò chuyện dạng tin nhắn giữa hai ngôn ngữ.",
    "zh": "以消息形式进行双语对话。"
  },
  "Hold the phone between you. Top is flipped for the other language; type on the active side.": {
    "vi": "Đặt điện thoại giữa hai người. Phía trên xoay cho người đối diện; nhập ở phía đang chọn.",
    "zh": "将手机放在两人之间。上半部分朝向对方，请在当前一侧输入。"
  },
  "High risk · pending human review": {
    "vi": "Nội dung nhạy cảm · chờ kiểm duyệt",
    "zh": "高风险 · 待人工审核"
  },
  "High risk · pending human review. Confirm wording with a native speaker before relying on this in an emergency.": {
    "vi": "Nội dung nhạy cảm · chờ kiểm duyệt. Hãy xác nhận với người bản ngữ trước khi dùng trong tình huống khẩn cấp.",
    "zh": "高风险 · 待人工审核。紧急情况下使用前，请先向母语使用者确认措辞。"
  },
  "Browser storage is full or unavailable. Export translation JSON from Packs before closing this page.": {
    "vi": "Bộ nhớ trình duyệt đầy hoặc không khả dụng. Xuất JSON trong mục Gói tải xuống trước khi đóng trang.",
    "zh": "浏览器存储已满或不可用。关闭页面前，请在下载包中导出翻译 JSON。"
  },
  "Browser storage is unavailable.": {
    "vi": "Không thể truy cập bộ nhớ trình duyệt.",
    "zh": "浏览器存储不可用。"
  },
  "Preparing package…": {
    "vi": "Đang chuẩn bị gói…",
    "zh": "正在准备下载包…"
  },
  "Phrase library saved for offline use.": {
    "vi": "Đã lưu thư viện câu để dùng ngoại tuyến.",
    "zh": "短语库已保存，可离线使用。"
  },
  "Preparing saved model…": {
    "vi": "Đang chuẩn bị mô hình đã lưu…",
    "zh": "正在准备已保存的模型…"
  },
  "Downloading model…": {
    "vi": "Đang tải mô hình…",
    "zh": "正在下载模型…"
  },
  "The model ran, but its files were not fully saved. Please retry.": {
    "vi": "Mô hình đã chạy nhưng chưa lưu đủ tệp. Vui lòng thử lại.",
    "zh": "模型已运行，但文件尚未完整保存。请重试。"
  },
  "Model saved and ready.": {
    "vi": "Mô hình đã lưu và sẵn sàng.",
    "zh": "模型已保存并准备就绪。"
  },
  "Preparing translation…": {
    "vi": "Đang chuẩn bị dịch…",
    "zh": "正在准备翻译…"
  },
  "This model does not support the selected language pair.": {
    "vi": "Mô hình này không hỗ trợ cặp ngôn ngữ đã chọn.",
    "zh": "此模型不支持所选语言对。"
  },
  "Translation canceled.": {
    "vi": "Đã hủy dịch.",
    "zh": "翻译已取消。"
  },
  "Couldn’t translate. Connect to the internet if the language pack needs downloading, then try again.": {
    "vi": "Không dịch được. Kết nối mạng nếu cần tải gói ngôn ngữ, rồi thử lại.",
    "zh": "无法翻译。如需下载语言包，请联网后重试。"
  },
  "Everyday phrases": {
    "vi": "Giao tiếp hằng ngày",
    "zh": "日常用语"
  },
  "At a restaurant": {
    "vi": "Ở nhà hàng",
    "zh": "在餐厅"
  },
  "Getting around": {
    "vi": "Đi lại",
    "zh": "出行"
  },
  "At the hotel": {
    "vi": "Ở khách sạn",
    "zh": "在酒店"
  },
  "Shopping": {
    "vi": "Mua sắm",
    "zh": "购物"
  },
  "Lost belongings": {
    "vi": "Đồ thất lạc",
    "zh": "遗失物品"
  },
  "Getting help": {
    "vi": "Tìm trợ giúp",
    "zh": "寻求帮助"
  },
  "Starting a conversation": {
    "vi": "Bắt đầu trò chuyện",
    "zh": "开始对话"
  },
  "Finding your way": {
    "vi": "Tìm đường",
    "zh": "问路"
  },
  "Getting a table": {
    "vi": "Tìm bàn",
    "zh": "找座位"
  },
  "Ordering": {
    "vi": "Gọi món",
    "zh": "点餐"
  },
  "Ingredients": {
    "vi": "Nguyên liệu",
    "zh": "食材"
  },
  "Changing an order": {
    "vi": "Đổi món đã gọi",
    "zh": "更改订单"
  },
  "Paying": {
    "vi": "Thanh toán",
    "zh": "付款"
  },
  "Checking in": {
    "vi": "Nhận phòng",
    "zh": "入住"
  },
  "During your stay": {
    "vi": "Trong thời gian lưu trú",
    "zh": "住宿期间"
  },
  "Checking out": {
    "vi": "Trả phòng",
    "zh": "退房"
  },
  "Choosing an item": {
    "vi": "Chọn hàng",
    "zh": "挑选商品"
  },
  "Reporting a loss": {
    "vi": "Báo mất đồ",
    "zh": "报告遗失"
  },
  "Finding your belongings": {
    "vi": "Tìm đồ thất lạc",
    "zh": "寻找物品"
  },
  "Asking for help": {
    "vi": "Nhờ giúp đỡ",
    "zh": "请求帮助"
  },
  "More phrases": {
    "vi": "Các câu khác",
    "zh": "更多短语"
  },
  "Show this to someone": {
    "vi": "Đưa cho người khác xem",
    "zh": "向对方展示"
  },
  "Show all {count} phrases": {
    "vi": "Xem tất cả {count} câu",
    "zh": "显示全部 {count} 条短语"
  },
  "{count} cards": {
    "vi": "{count} câu",
    "zh": "{count} 条短语"
  },
  "First use downloads {size} plus the runtime. Your text stays on this device.": {
    "vi": "Lần đầu tải {size} cùng bộ chạy. Văn bản của bạn luôn ở trên thiết bị này.",
    "zh": "首次使用需下载 {size} 及运行时。文本保留在此设备上。"
  },
  "about 107 MB per direction": {
    "vi": "khoảng 107 MB mỗi chiều",
    "zh": "每个方向约 107 MB"
  },
  "about 640 MB for all directions": {
    "vi": "khoảng 640 MB cho mọi chiều",
    "zh": "所有方向共约 640 MB"
  },
  "About 107 MB": {
    "vi": "Khoảng 107 MB",
    "zh": "约 107 MB"
  },
  "About 640 MB": {
    "vi": "Khoảng 640 MB",
    "zh": "约 640 MB"
  },
  "this direction": {
    "vi": "chiều này",
    "zh": "此方向"
  },
  "one download covers all three languages": {
    "vi": "một lần tải cho cả ba ngôn ngữ",
    "zh": "一次下载涵盖三种语言"
  }
,"Essentials": {"vi": "Câu thiết yếu", "zh": "常用语"}, "Directions": {"vi": "Chỉ đường", "zh": "方向"}, "Food & allergies": {"vi": "Ăn uống và dị ứng", "zh": "饮食与过敏"}, "Translating…": {"vi": "Đang dịch…", "zh": "正在翻译…"}, "Type in English": {"vi": "Gõ bằng tiếng Anh", "zh": "用英语输入"},"Write in {language}": {"vi": "Nhập bằng {language}", "zh": "输入语言：{language}"}, "{language} translation": {"vi": "Bản dịch {language}", "zh": "{language}译文"}, "Main": {"vi": "Điều hướng chính", "zh": "主导航"}, "Scenarios": {"vi": "Tình huống", "zh": "场景"}, "Suggested phrases": {"vi": "Câu gợi ý", "zh": "推荐短语"}, "Translation direction": {"vi": "Chiều dịch", "zh": "翻译方向"}, "Chat source language": {"vi": "Ngôn ngữ nhập trong trò chuyện", "zh": "聊天源语言"}, "Chat target language": {"vi": "Ngôn ngữ đích trong trò chuyện", "zh": "聊天目标语言"}, "Reverse translation direction": {"vi": "Đảo chiều dịch", "zh": "反转翻译方向"}, "Phrase package": {"vi": "Gói câu", "zh": "短语包"}, "Models for selected language pair": {"vi": "Mô hình cho cặp ngôn ngữ đã chọn", "zh": "所选语言对的模型"}, "to": {"vi": "sang", "zh": "到"}, "both directions": {"vi": "hai chiều", "zh": "双向"},"Tap to swap": {"vi": "Chạm để đảo", "zh": "点击交换"},"Input method":{"vi":"Cách nhập","zh":"输入方式"},"Text":{"vi":"Văn bản","zh":"文字"},"Voice":{"vi":"Giọng nói","zh":"语音"},"Camera":{"vi":"Máy ảnh","zh":"相机"},"Coming soon":{"vi":"Sắp có","zh":"即将推出"},"Type in Vietnamese": {"vi": "Gõ bằng tiếng Việt", "zh": "用越南语输入"}, "Type in Simplified Chinese": {"vi": "Gõ bằng tiếng Trung giản thể", "zh": "用简体中文输入"},"Voice preview · microphone is off": {"vi": "Xem trước giọng nói · micro đang tắt", "zh": "语音界面预览 · 麦克风已关闭"}, "Translation will appear here": {"vi": "Bản dịch sẽ hiện ở đây", "zh": "译文将显示在这里"}, "For you to read": {"vi": "Dành cho bạn đọc", "zh": "供您阅读"}, "Speak in {language}": {"vi": "Nói bằng {language}", "zh": "使用{language}说话"}, "Tap to speak": {"vi": "Chạm để nói", "zh": "点击说话"}, "Voice translation is not connected yet. No audio is being recorded.": {"vi": "Chưa kết nối chức năng dịch giọng nói. Không có âm thanh nào đang được ghi lại.", "zh": "语音翻译尚未接入，目前没有录音。"}, "Place the phone between you. Each person uses the microphone facing them.": {"vi": "Đặt điện thoại giữa hai người. Mỗi người dùng micro hướng về mình.", "zh": "将手机放在两人之间，各自使用朝向自己的麦克风。"},"Voice translation": {"vi": "Dịch giọng nói", "zh": "语音翻译"}, "Preview": {"vi": "Xem trước", "zh": "预览"},"Settings": {"vi": "Cài đặt", "zh": "设置"}, "Translate from": {"vi": "Dịch từ", "zh": "源语言"}, "Translate to": {"vi": "Dịch sang", "zh": "目标语言"}, "Camera translation": {"vi": "Dịch qua máy ảnh", "zh": "相机翻译"}, "Camera translation is not connected yet. Your camera is off.": {"vi": "Chưa kết nối dịch qua máy ảnh. Máy ảnh đang tắt.", "zh": "相机翻译尚未接入，相机已关闭。"}, "Copy": {"vi": "Sao chép", "zh": "复制"}, "Copied": {"vi": "Đã sao chép", "zh": "已复制"}, "Could not copy. Select the translation to copy it.": {"vi": "Không sao chép được. Hãy chọn bản dịch để sao chép.", "zh": "无法复制，请选中译文进行复制。"},"Save": {"vi": "Lưu", "zh": "保存"}, "Share": {"vi": "Chia sẻ", "zh": "分享"}, "Could not save. Browser storage is unavailable.": {"vi": "Không lưu được. Bộ nhớ trình duyệt không khả dụng.", "zh": "无法保存，浏览器存储不可用。"}, "Could not share. Try Copy instead.": {"vi": "Không chia sẻ được. Hãy thử Sao chép.", "zh": "无法分享，请尝试复制。"},"Conversation": {"vi": "Hội thoại", "zh": "对话"}, "Translation layout": {"vi": "Bố cục dịch", "zh": "翻译布局"}, "Face-to-face layout": {"vi": "Bố cục đối diện", "zh": "面对面布局"}, "Voice input is coming soon. Your microphone is off. Type here to translate for now.": {"vi": "Sắp có nhập bằng giọng nói. Micro đang tắt. Hiện tại, hãy nhập văn bản tại đây để dịch.", "zh": "语音输入即将推出，麦克风已关闭。目前请在此输入文字进行翻译。"},"Voice input": {"vi": "Nhập bằng giọng nói", "zh": "语音输入"}, "Stop recording": {"vi": "Dừng ghi âm", "zh": "停止录音"}, "Cancel speech input": {"vi": "Hủy nhập giọng nói", "zh": "取消语音输入"}, "Allow microphone access to start.": {"vi": "Cho phép truy cập micro để bắt đầu.", "zh": "请允许访问麦克风以开始录音。"}, "Recording… Tap to stop. Maximum 20 seconds.": {"vi": "Đang ghi âm… Chạm để dừng. Tối đa 20 giây.", "zh": "正在录音…点击停止，最长20秒。"}, "Preparing speech model…": {"vi": "Đang chuẩn bị mô hình giọng nói…", "zh": "正在准备语音模型…"}, "Downloading speech model…": {"vi": "Đang tải mô hình giọng nói…", "zh": "正在下载语音模型…"}, "Recognizing speech…": {"vi": "Đang nhận dạng giọng nói…", "zh": "正在识别语音…"}, "Check the recognized text, then tap Translate.": {"vi": "Kiểm tra văn bản đã nhận dạng, rồi chạm Dịch.", "zh": "请检查识别文字，然后点击翻译。"}, "Microphone permission was denied. You can still type.": {"vi": "Quyền micro bị từ chối. Bạn vẫn có thể nhập văn bản.", "zh": "麦克风权限被拒绝，您仍可输入文字。"}, "Could not open the microphone. Check your device and try again.": {"vi": "Không mở được micro. Kiểm tra thiết bị rồi thử lại.", "zh": "无法打开麦克风，请检查设备后重试。"}, "Microphone recording is not supported in this browser.": {"vi": "Trình duyệt này không hỗ trợ ghi âm micro.", "zh": "此浏览器不支持麦克风录音。"}, "Speech recognition failed. Please try again.": {"vi": "Nhận dạng giọng nói thất bại. Vui lòng thử lại.", "zh": "语音识别失败，请重试。"}, "Recording failed. Please try again.": {"vi": "Ghi âm thất bại. Vui lòng thử lại.", "zh": "录音失败，请重试。"}, "No speech recognized. Try again in a quiet place.": {"vi": "Không nhận dạng được giọng nói. Hãy thử lại ở nơi yên tĩnh.", "zh": "未识别到语音，请在安静处重试。"}, "Speech input canceled.": {"vi": "Đã hủy nhập giọng nói.", "zh": "已取消语音输入。"}, "Export speech JSON": {"vi": "Xuất nhật ký giọng nói JSON", "zh": "导出语音 JSON"},"Speech recognition timed out. Try a shorter recording.":{"vi":"Nhận dạng quá thời gian. Hãy thử ghi âm ngắn hơn.","zh":"语音识别超时，请尝试更短的录音。"},"Loading camera…": {"vi": "Đang mở máy ảnh…", "zh": "正在加载相机…"}, "Export camera JSON": {"vi": "Xuất nhật ký máy ảnh JSON", "zh": "导出相机 JSON"}, "Recognized speech": {"vi": "Lời nói đã nhận dạng", "zh": "已识别的语音"}, "Choose an image smaller than 20 MB.": {"vi": "Chọn ảnh nhỏ hơn 20 MB.", "zh": "请选择小于20 MB的图片。"}, "Preparing camera recognition…": {"vi": "Đang chuẩn bị nhận dạng ảnh…", "zh": "正在准备图像识别…"}, "Check the recognized text before translating.": {"vi": "Kiểm tra văn bản đã nhận dạng trước khi dịch.", "zh": "翻译前请检查识别文字。"}, "Images stay on this device. Download the camera language once while online.": {"vi": "Ảnh luôn ở trên thiết bị này. Tải ngôn ngữ nhận dạng một lần khi có mạng.", "zh": "图片保留在此设备上，请联网下载所需识别语言。"}, "Choose photo": {"vi": "Chọn ảnh", "zh": "选择照片"}, "Take photo": {"vi": "Chụp ảnh", "zh": "拍照"}, "Selected image": {"vi": "Ảnh đã chọn", "zh": "所选图片"}, "Read text": {"vi": "Nhận dạng văn bản", "zh": "识别文字"}, "Cancel": {"vi": "Hủy", "zh": "取消"}, "Recognized text": {"vi": "Văn bản đã nhận dạng", "zh": "识别文字"}, "Use in Translate": {"vi": "Dùng để dịch", "zh": "用于翻译"}, "Only the first 500 characters will be sent. Edit the text to choose another section.": {"vi": "Chỉ gửi 500 ký tự đầu tiên. Sửa văn bản để chọn phần khác.", "zh": "仅发送前500个字符，请编辑文字以选择其他部分。"}, "Camera language saved and ready.": {"vi": "Ngôn ngữ nhận dạng ảnh đã lưu và sẵn sàng.", "zh": "相机识别语言已保存并准备就绪。"}, "Remove this downloaded resource? Your cards, saved results and logs will be kept.": {"vi": "Xóa tài nguyên đã tải này? Thẻ câu, kết quả đã lưu và nhật ký vẫn được giữ.", "zh": "删除此下载资源？短语卡、已保存的结果和日志将保留。"}, "Removed": {"vi": "Đã xóa", "zh": "已移除"}, "Remove": {"vi": "Xóa", "zh": "移除"}, "Last successful translation on this browser": {"vi": "Lần dịch thành công gần nhất trong trình duyệt này", "zh": "此浏览器最近一次成功翻译"}, "Shared by all three languages. Recognition stays on this device.": {"vi": "Dùng chung cho cả ba ngôn ngữ. Nhận dạng thực hiện trên thiết bị.", "zh": "三种语言共用，识别在此设备上运行。"}, "Camera languages": {"vi": "Ngôn ngữ nhận dạng ảnh", "zh": "相机识别语言"}, "Estimated free browser storage": {"vi": "Bộ nhớ trình duyệt còn trống ước tính", "zh": "预计可用浏览器存储"}, "Download size is not runtime memory. Both translation models remain available; compare quality on your device.": {"vi": "Dung lượng tải không phải bộ nhớ khi chạy. Cả hai mô hình vẫn có sẵn; hãy so sánh chất lượng trên thiết bị.", "zh": "下载大小不等于运行内存。两种翻译模型均可选择，请在设备上比较质量。"}, "Saved models still need session preparation after reopening.": {"vi": "Mô hình đã lưu vẫn cần chuẩn bị khi mở lại.", "zh": "重新打开后，已保存模型仍需初始化。"}, "Active models released. Downloaded files are kept.": {"vi": "Đã giải phóng mô hình đang chạy. Các tệp đã tải vẫn được giữ.", "zh": "已释放运行中的模型，下载文件仍保留。"}, "Release active model memory": {"vi": "Giải phóng bộ nhớ mô hình", "zh": "释放模型运行内存"}, "Read aloud is unavailable in this browser.": {"vi": "Trình duyệt này không hỗ trợ đọc văn bản.", "zh": "此浏览器不支持朗读。"}, "No local voice for this language. Install a device voice to read aloud offline.": {"vi": "Chưa có giọng đọc cục bộ cho ngôn ngữ này. Cài giọng đọc trên thiết bị để đọc ngoại tuyến.", "zh": "此语言没有本地语音，请安装设备语音以离线朗读。"}, "Could not read aloud. Please try again.": {"vi": "Không đọc được. Vui lòng thử lại.", "zh": "无法朗读，请重试。"}, "Saved translations": {"vi": "Bản dịch đã lưu", "zh": "已保存的翻译"}, "Search saved translations": {"vi": "Tìm bản dịch đã lưu", "zh": "搜索已保存的翻译"}, "No saved translations yet. Save a result from Translate.": {"vi": "Chưa có bản dịch đã lưu. Lưu kết quả trong mục Dịch.", "zh": "尚无已保存的翻译，请在翻译页面保存结果。"}, "Undo": {"vi": "Hoàn tác", "zh": "撤销"}, "Offline · saved resources are available. New downloads need internet.": {"vi": "Ngoại tuyến · dùng được tài nguyên đã lưu. Tải mới cần có mạng.", "zh": "离线 · 可使用已保存资源，新的下载需要联网。"}, "A new app version is ready. Reload when you finish your current task.": {"vi": "Có phiên bản mới. Tải lại sau khi hoàn thành thao tác hiện tại.", "zh": "新版本已就绪，请完成当前操作后刷新。"}, "Reload app": {"vi": "Tải lại ứng dụng", "zh": "刷新应用"}, "Downloading camera language…": {"vi": "Đang tải ngôn ngữ nhận dạng ảnh…", "zh": "正在下载相机识别语言…"}, "Recognizing image…": {"vi": "Đang nhận dạng ảnh…", "zh": "正在识别图像…"}, "Camera recognition canceled.": {"vi": "Đã hủy nhận dạng ảnh.", "zh": "已取消图像识别。"}, "Download canceled. Saved files can be reused on retry.": {"vi": "Đã hủy tải. Có thể dùng lại tệp đã lưu khi thử lại.", "zh": "已取消下载，重试时可复用已保存文件。"}, "Protect offline downloads": {"vi": "Bảo vệ tài nguyên ngoại tuyến", "zh": "保护离线下载"}, "Storage protection enabled.": {"vi": "Đã bật bảo vệ bộ nhớ.", "zh": "已启用存储保护。"}, "The browser did not grant storage protection.": {"vi": "Trình duyệt không cấp bảo vệ bộ nhớ.", "zh": "浏览器未授予持久存储权限。"}, "Read aloud": {"vi": "Đọc thành tiếng", "zh": "朗读"}, "Stop audio": {"vi": "Dừng đọc", "zh": "停止朗读"}, "No text found. Try a clearer image.": {"vi": "Không tìm thấy chữ. Hãy thử ảnh rõ hơn.", "zh": "未找到文字，请尝试更清晰的图片。"}, "Could not read this image. Try JPG or PNG.": {"vi": "Không đọc được ảnh. Hãy thử JPG hoặc PNG.", "zh": "无法读取此图片，请尝试JPG或PNG。"}, "Could not prepare the image.": {"vi": "Không chuẩn bị được ảnh.", "zh": "无法处理图片。"}, "Could not download the camera language. Check your connection.": {"vi": "Không tải được ngôn ngữ nhận dạng ảnh. Kiểm tra kết nối.", "zh": "无法下载相机识别语言，请检查网络。"}, "Translation timed out. Try a shorter phrase.": {"vi": "Dịch quá thời gian. Hãy thử câu ngắn hơn.", "zh": "翻译超时，请尝试更短的短语。"}}
export function t(text: string, values: Record<string, string | number> = {}) {
  const message = messages[text]?.[locale] ?? text
  return message.replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match))
}
export function languageName(code: Locale) {
  const native = { en: 'English', vi: 'Tiếng Việt', zh: '简体中文' }[code]
  const localNames = {
    en: { en: 'English', vi: 'Vietnamese', zh: 'Chinese, Simplified' },
    vi: { en: 'Tiếng Anh', vi: 'Tiếng Việt', zh: 'Tiếng Trung giản thể' },
    zh: { en: '英语', vi: '越南语', zh: '简体中文' },
  }[locale]
  return native === localNames[code] ? native : `${native} (${localNames[code]})`
}
