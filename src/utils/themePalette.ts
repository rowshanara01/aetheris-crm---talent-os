export type BrandThemeId = 'indigo' | 'emerald' | 'coral' | 'ocean' | 'amethyst';
export type CanvasTintId = 'pearl' | 'sky' | 'warm';

export interface ThemeOption {
  id: BrandThemeId;
  label: string;
  bnLabel: string;
  swatchClass: string;
}

export const BRAND_THEMES: ThemeOption[] = [
  {
    id: 'indigo',
    label: 'Royal Indigo',
    bnLabel: 'রয়েল ইন্ডিগো',
    swatchClass: 'bg-indigo-700',
  },
  {
    id: 'emerald',
    label: 'Emerald Bengal',
    bnLabel: 'এমেরাল্ড গ্রিন',
    swatchClass: 'bg-emerald-700',
  },
  {
    id: 'coral',
    label: 'Sunset Rose',
    bnLabel: 'সানসেট রোজ',
    swatchClass: 'bg-rose-700',
  },
  {
    id: 'ocean',
    label: 'Ocean Sapphire',
    bnLabel: 'ওশান নীল',
    swatchClass: 'bg-sky-700',
  },
  {
    id: 'amethyst',
    label: 'Amethyst Studio',
    bnLabel: 'অ্যামেথিস্ট পার্পল',
    swatchClass: 'bg-violet-700',
  },
];

export const CANVAS_TINTS: { id: CanvasTintId; label: string; bnLabel: string }[] = [
  { id: 'pearl', label: 'Crisp Pearl', bnLabel: 'স্নো হোয়াইট' },
  { id: 'sky', label: 'Soft Sky', bnLabel: 'হালকা আকাশি' },
  { id: 'warm', label: 'Warm Ivory', bnLabel: 'ওয়ার্ম আইভরি' },
];

const STORAGE_THEME_KEY = 'aetheris_brand_theme';
const STORAGE_CANVAS_KEY = 'aetheris_canvas_tint';

export function getSavedTheme(): BrandThemeId {
  try {
    const val = localStorage.getItem(STORAGE_THEME_KEY) as BrandThemeId | null;
    if (val && BRAND_THEMES.some((t) => t.id === val)) return val;
  } catch {
    // ignore
  }
  return 'indigo';
}

export function getSavedCanvasTint(): CanvasTintId {
  try {
    const val = localStorage.getItem(STORAGE_CANVAS_KEY) as CanvasTintId | null;
    if (val && CANVAS_TINTS.some((c) => c.id === val)) return val;
  } catch {
    // ignore
  }
  return 'pearl';
}

export function applyThemeToDocument(theme: BrandThemeId, canvas: CanvasTintId): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-canvas', canvas);
  try {
    localStorage.setItem(STORAGE_THEME_KEY, theme);
    localStorage.setItem(STORAGE_CANVAS_KEY, canvas);
  } catch {
    // ignore
  }
}
