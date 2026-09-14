import { ChibiCustomization } from '../types';

export const SKIN_COLORS = [
  '#fce2c4', '#f5cda6', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'
];

export const HAIR_COLORS = [
  '#2c3e50', '#8e44ad', '#e74c3c', '#e67e22', '#f1c40f', '#16a085', '#34495e', '#ecf0f1', '#ff7675'
];

export const OUTFIT_COLORS = [
  '#6c5ce7', '#ff7675', '#00b894', '#fdcb6e', '#0984e3', '#e84393', '#fd79a8', '#636e72'
];

export const HAIR_STYLES: Array<{ id: ChibiCustomization['hairStyle']; label: string }> = [
  { id: 'short', label: 'Tóc Ngắn' },
  { id: 'spiky', label: 'Tóc Dựng' },
  { id: 'pigtails', label: 'Tóc 2 Bên' },
  { id: 'curly', label: 'Tóc Xoăn' },
  { id: 'long', label: 'Tóc Dài' },
  { id: 'afro', label: 'Tóc Xù' },
  { id: 'bald', label: 'Tóc Trọc' },
];

export const EYE_TYPES: Array<{ id: ChibiCustomization['eyeType']; label: string }> = [
  { id: 'happy', label: 'Vui Vẻ 😊' },
  { id: 'star', label: 'Ngôi Sao ✨' },
  { id: 'wink', label: 'Nháy Mắt 😉' },
  { id: 'cool', label: 'Ngầu 🕶️' },
  { id: 'cute', label: 'Đáng Yêu 🥺' },
];

export const OUTFIT_STYLES: Array<{ id: ChibiCustomization['outfitStyle']; label: string }> = [
  { id: 'casual', label: 'Áo Phông' },
  { id: 'hoodie', label: 'Áo Hoodie' },
  { id: 'superhero', label: 'Siêu Anh Hùng' },
  { id: 'uniform', label: 'Đồng Phục' },
  { id: 'wizard', label: 'Pháp Sư' },
];

export const HAT_STYLES: Array<{ id: ChibiCustomization['hatStyle']; label: string }> = [
  { id: 'none', label: 'Không Mũ' },
  { id: 'crown', label: 'Vương Miện 👑' },
  { id: 'cap', label: 'Mũ Lưỡi Trai 🧢' },
  { id: 'catEars', label: 'Tai Mèo 🐱' },
  { id: 'wizardHat', label: 'Mũ Phù Thủy 🧙‍♂️' },
  { id: 'halo', label: 'Vòng Thiên Thần 😇' },
];

export const ACCESSORY_STYLES: Array<{ id: ChibiCustomization['accessory']; label: string }> = [
  { id: 'none', label: 'Không Phụ Kiện' },
  { id: 'glasses', label: 'Kính Cận 👓' },
  { id: 'sunglasses', label: 'Kính Râm 🕶️' },
  { id: 'mask', label: 'Khẩu Trang 😷' },
  { id: 'headphone', label: 'Tai Nghe 🎧' },
];

export function getRandomChibi(): ChibiCustomization {
  return {
    skinColor: SKIN_COLORS[Math.floor(Math.random() * SKIN_COLORS.length)],
    hairStyle: HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)].id,
    hairColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)],
    eyeType: EYE_TYPES[Math.floor(Math.random() * EYE_TYPES.length)].id,
    outfitStyle: OUTFIT_STYLES[Math.floor(Math.random() * OUTFIT_STYLES.length)].id,
    outfitColor: OUTFIT_COLORS[Math.floor(Math.random() * OUTFIT_COLORS.length)],
    hatStyle: HAT_STYLES[Math.floor(Math.random() * HAT_STYLES.length)].id,
    accessory: ACCESSORY_STYLES[Math.floor(Math.random() * ACCESSORY_STYLES.length)].id,
  };
}
