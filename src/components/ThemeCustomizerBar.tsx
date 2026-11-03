import { useState } from 'react';
import { Check, Palette, SlidersHorizontal, X } from 'lucide-react';
import type { LanguageCode } from '../shared/types';
import {
  BRAND_THEMES,
  CANVAS_TINTS,
  type BrandThemeId,
  type CanvasTintId,
} from '../utils/themePalette';

interface ThemeCustomizerBarProps {
  theme: BrandThemeId;
  canvasTint: CanvasTintId;
  language: LanguageCode;
  onThemeChange: (next: BrandThemeId) => void;
  onCanvasChange: (next: CanvasTintId) => void;
  onLanguageChange: (lang: LanguageCode) => void;
  compact?: boolean;
}

export function ThemeCustomizerBar({
  theme,
  canvasTint,
  language,
  onThemeChange,
  onCanvasChange,
  onLanguageChange,
  compact = false,
}: ThemeCustomizerBarProps) {
  const [openPopover, setOpenPopover] = useState(false);

  if (compact) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenPopover((v) => !v)}
          className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
        >
          <Palette className="w-3.5 h-3.5 text-brand shrink-0" />
          <span>{language === 'bn' ? 'থিম কাস্টমাইজ' : 'Customize UI'}</span>
        </button>

        {openPopover && (
          <>
            <div
              className="fixed inset-0 z-40 bg-slate-900/20 sm:bg-transparent"
              onClick={() => setOpenPopover(false)}
            />
            <div className="fixed inset-x-4 top-20 sm:absolute sm:inset-auto sm:right-0 sm:mt-2 sm:w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-50 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-semibold text-slate-900 inline-flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-brand" />
                  <span>{language === 'bn' ? 'কালার ও ব্যাকগ্রাউন্ড থিম' : 'Brand Color & Canvas'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setOpenPopover(false)}
                  aria-label="Close theme customizer"
                  className="p-1 text-slate-500 hover:text-slate-900 rounded-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-medium text-slate-500">
                  {language === 'bn' ? 'অ্যাকসেন্ট কালার প্যালেট' : 'Brand Accent Palette'}
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {BRAND_THEMES.map((item) => {
                    const active = theme === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onThemeChange(item.id)}
                        className={`w-full px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-between transition-colors ${
                          active
                            ? 'surface-brand-soft font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <span className={`w-3.5 h-3.5 rounded ${item.swatchClass}`} />
                          <span>{language === 'bn' ? item.bnLabel : item.label}</span>
                        </span>
                        {active && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-[11px] font-medium text-slate-500">
                  {language === 'bn' ? 'ক্যানভাস সারফেস' : 'Surface Canvas Tint'}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {CANVAS_TINTS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onCanvasChange(c.id)}
                      className={`px-2 py-1.5 rounded-md text-[11px] font-medium border transition-colors truncate ${
                        canvasTint === c.id
                          ? 'surface-brand-soft font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {language === 'bn' ? c.bnLabel : c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-[11px] font-medium text-slate-500">
                  {language === 'bn' ? 'ইন্টারফেসের ভাষা' : 'Interface Language'}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onLanguageChange('bn')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      language === 'bn'
                        ? 'surface-brand-soft font-semibold'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    বাংলা + EN
                  </button>
                  <button
                    type="button"
                    onClick={() => onLanguageChange('en')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      language === 'en'
                        ? 'surface-brand-soft font-semibold'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="border-b border-slate-200/80 bg-white/85 backdrop-blur-xs">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs">
        {/* Horizontally swipeable single-line palette strip on mobile, wraps cleanly on desktop */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 min-w-0">
          <span className="font-medium text-slate-500 inline-flex items-center gap-1.5 mr-0.5 shrink-0">
            <Palette className="w-3.5 h-3.5 text-brand" />
            <span className="hidden sm:inline">
              {language === 'bn' ? 'লাইভ থিম:' : 'Theme:'}
            </span>
          </span>
          {BRAND_THEMES.map((item) => {
            const active = theme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onThemeChange(item.id)}
                className={`px-2.5 py-1.5 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'surface-brand-soft font-semibold'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-xs shrink-0 ${item.swatchClass}`} />
                <span>{language === 'bn' ? item.bnLabel : item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
            {CANVAS_TINTS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onCanvasChange(c.id)}
                className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                  canvasTint === c.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {language === 'bn' ? c.bnLabel : c.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-0.5 p-0.5 bg-slate-200/70 rounded-md">
            <button
              type="button"
              onClick={() => onLanguageChange('bn')}
              className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded transition-colors whitespace-nowrap ${
                language === 'bn' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              বাংলা
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('en')}
              className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded transition-colors whitespace-nowrap ${
                language === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
