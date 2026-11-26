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
,"Essentials": {"vi": "Câu thiết yếu", "zh": "常用语"}, "Directions": {"vi": "Chỉ đường", "zh": "方向"}, "Food & allergies": {"vi": "Ăn uống và dị ứng", "zh": "饮食与过敏"}, "Translating…": {"vi": "Đang dịch…", "zh": "正在翻译…"}, "Type in English": {"vi": "Gõ bằng tiếng Anh", "zh": "用英语输入"},"Write in {language}": {"vi": "Nhập bằng {language}", "zh": "输入语言：{language}"}, "{language} translation": {"vi": "Bản dịch {language}", "zh": "{language}译文"}, "Main": {"vi": "Điều hướng chính", "zh": "主导航"}, "Scenarios": {"vi": "Tình huống", "zh": "场景"}, "Suggested phrases": {"vi": "Câu gợi ý", "zh": "推荐短语"}, "Translation direction": {"vi": "Chiều dịch", "zh": "翻译方向"}, "Chat source language": {"vi": "Ngôn ngữ nhập trong trò chuyện", "zh": "聊天源语言"}, "Chat target language": {"vi": "Ngôn ngữ đích trong trò chuyện", "zh": "聊天目标语言"}, "Reverse translation direction": {"vi": "Đảo chiều dịch", "zh": "反转翻译方向"}, "Phrase package": {"vi": "Gói câu", "zh": "短语包"}, "Models for selected language pair": {"vi": "Mô hình cho cặp ngôn ngữ đã chọn", "zh": "所选语言对的模型"}, "to": {"vi": "sang", "zh": "到"}, "both directions": {"vi": "hai chiều", "zh": "双向"},"Tap to swap": {"vi": "Chạm để đảo", "zh": "点击交换"},"Input method":{"vi":"Cách nhập","zh":"输入方式"},"Text":{"vi":"Văn bản","zh":"文字"},"Voice":{"vi":"Giọng nói","zh":"语音"},"Camera":{"vi":"Máy ảnh","zh":"相机"},"Coming soon":{"vi":"Sắp có","zh":"即将推出"},"Type in Vietnamese": {"vi": "Gõ bằng tiếng Việt", "zh": "用越南语输入"}, "Type in Simplified Chinese": {"vi": "Gõ bằng tiếng Trung giản thể", "zh": "用简体中文输入"},"Voice preview · microphone is off": {"vi": "Xem trước giọng nói · micro đang tắt", "zh": "语音界面预览 · 麦克风已关闭"}, "Translation will appear here": {"vi": "Bản dịch sẽ hiện ở đây", "zh": "译文将显示在这里"}, "For you to read": {"vi": "Dành cho bạn đọc", "zh": "供您阅读"}, "Speak in {language}": {"vi": "Nói bằng {language}", "zh": "使用{language}说话"}, "Tap to speak": {"vi": "Chạm để nói", "zh": "点击说话"}, "Voice translation is not connected yet. No audio is being recorded.": {"vi": "Chưa kết nối chức năng dịch giọng nói. Không có âm thanh nào đang được ghi lại.", "zh": "语音翻译尚未接入，目前没有录音。"}, "Place the phone between you. Each person uses the microphone facing them.": {"vi": "Đặt điện thoại giữa hai người. Mỗi người dùng micro hướng về mình.", "zh": "将手机放在两人之间，各自使用朝向自己的麦克风。"},"Voice translation": {"vi": "Dịch giọng nói", "zh": "语音翻译"}, "Preview": {"vi": "Xem trước", "zh": "预览"},"Settings": {"vi": "Cài đặt", "zh": "设置"}, "Translate from": {"vi": "Dịch từ", "zh": "源语言"}, "Translate to": {"vi": "Dịch sang", "zh": "目标语言"}, "Camera translation": {"vi": "Dịch qua máy ảnh", "zh": "相机翻译"}, "Camera translation is not connected yet. Your camera is off.": {"vi": "Chưa kết nối dịch qua máy ảnh. Máy ảnh đang tắt.", "zh": "相机翻译尚未接入，相机已关闭。"}, "Copy": {"vi": "Sao chép", "zh": "复制"}, "Copied": {"vi": "Đã sao chép", "zh": "已复制"}, "Could not copy. Select the translation to copy it.": {"vi": "Không sao chép được. Hãy chọn bản dịch để sao chép.", "zh": "无法复制，请选中译文进行复制。"},"Save": {"vi": "Lưu", "zh": "保存"}, "Share": {"vi": "Chia sẻ", "zh": "分享"}, "Could not save. Browser storage is unavailable.": {"vi": "Không lưu được. Bộ nhớ trình duyệt không khả dụng.", "zh": "无法保存，浏览器存储不可用。"}, "Could not share. Try Copy instead.": {"vi": "Không chia sẻ được. Hãy thử Sao chép.", "zh": "无法分享，请尝试复制。"},"Conversation": {"vi": "Hội thoại", "zh": "对话"}, "Translation layout": {"vi": "Bố cục dịch", "zh": "翻译布局"}, "Face-to-face layout": {"vi": "Bố cục đối diện", "zh": "面对面布局"}, "Voice input is coming soon. Your microphone is off. Type here to translate for now.": {"vi": "Sắp có nhập bằng giọng nói. Micro đang tắt. Hiện tại, hãy nhập văn bản tại đây để dịch.", "zh": "语音输入即将推出，麦克风已关闭。目前请在此输入文字进行翻译。"},"Voice input": {"vi": "Nhập bằng giọng nói", "zh": "语音输入"}, "Stop recording": {"vi": "Dừng ghi âm", "zh": "停止录音"}, "Cancel speech input": {"vi": "Hủy nhập giọng nói", "zh": "取消语音输入"}, "Allow microphone access to start.": {"vi": "Cho phép truy cập micro để bắt đầu.", "zh": "请允许访问麦克风以开始录音。"}, "Recording… Tap to stop. Maximum 20 seconds.": {"vi": "Đang ghi âm… Chạm để dừng. Tối đa 20 giây.", "zh": "正在录音…点击停止，最长20秒。"}, "Preparing speech model…": {"vi": "Đang chuẩn bị mô hình giọng nói…", "zh": "正在准备语音模型…"}, "Downloading speech model…": {"vi": "Đang tải mô hình giọng nói…", "zh": "正在下载语音模型…"}, "Recognizing speech…": {"vi": "Đang nhận dạng giọng nói…", "zh": "正在识别语音…"}, "Check the recognized text, then tap Translate.": {"vi": "Kiểm tra văn bản đã nhận dạng, rồi chạm Dịch.", "zh": "请检查识别文字，然后点击翻译。"}, "Microphone permission was denied. You can still type.": {"vi": "Quyền micro bị từ chối. Bạn vẫn có thể nhập văn bản.", "zh": "麦克风权限被拒绝，您仍可输入文字。"}, "Could not open the microphone. Check your device and try again.": {"vi": "Không mở được micro. Kiểm tra thiết bị rồi thử lại.", "zh": "无法打开麦克风，请检查设备后重试。"}, "Microphone recording is not supported in this browser.": {"vi": "Trình duyệt này không hỗ trợ ghi âm micro.", "zh": "此浏览器不支持麦克风录音。"}, "Speech recognition failed. Please try again.": {"vi": "Nhận dạng giọng nói thất bại. Vui lòng thử lại.", "zh": "语音识别失败，请重试。"}, "Recording failed. Please try again.": {"vi": "Ghi âm thất bại. Vui lòng thử lại.", "zh": "录音失败，请重试。"}, "No speech recognized. Try again in a quiet place.": {"vi": "Không nhận dạng được giọng nói. Hãy thử lại ở nơi yên tĩnh.", "zh": "未识别到语音，请在安静处重试。"}, "Speech input canceled.": {"vi": "Đã hủy nhập giọng nói.", "zh": "已取消语音输入。"}, "Export speech JSON": {"vi": "Xuất nhật ký giọng nói JSON", "zh": "导出语音 JSON"},"Speech recognition timed out. Try a shorter recording.":{"vi":"Nhận dạng quá thời gian. Hãy thử ghi âm ngắn hơn.","zh":"语音识别超时，请尝试更短的录音。"}}
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
