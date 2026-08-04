// Danh sach giong doc tieng Viet (Microsoft neural — mien phi).
// Muon them giong vung mien tra phi (FPT.AI / Vbee / Zalo AI) → them vao day + doi engine o API.
export const VI_VOICES = [
  { id: 'vi-VN-HoaiMyNeural', label: '👩 Hoài My — giọng Nữ', desc: 'Trong trẻo, tự nhiên — hợp video quảng cáo, giới thiệu sản phẩm' },
  { id: 'vi-VN-NamMinhNeural', label: '👨 Nam Minh — giọng Nam', desc: 'Trầm ấm, rõ ràng — hợp thuyết minh, hướng dẫn' },
] as const;
export type ViVoiceId = typeof VI_VOICES[number]['id'];

export const TTS_MAX_CHARS = 5000;

export const TTS_RATES = [
  { v: 0.75, label: 'Chậm (0.75x)' },
  { v: 1, label: 'Bình thường (1x)' },
  { v: 1.25, label: 'Nhanh (1.25x)' },
  { v: 1.5, label: 'Rất nhanh (1.5x)' },
] as const;
