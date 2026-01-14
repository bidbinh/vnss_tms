"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";

type Locale = "vi" | "en";

const localeNames: Record<Locale, string> = {
  vi: "Tiếng Việt",
  en: "English",
};

const localeCodes: Record<Locale, string> = {
  vi: "VN",
  en: "EN",
};

interface HomepageLanguageSwitcherProps {
  currentLocale: Locale;
  onChange: (locale: Locale) => void;
  variant?: "light" | "dark"; // light for dark background, dark for light background
}

export default function HomepageLanguageSwitcher({
  currentLocale,
  onChange,
  variant = "light",
}: HomepageLanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLocaleChange = (locale: Locale) => {
    document.cookie = `homepage_locale=${locale};path=/;max-age=31536000`;
    onChange(locale);
    setIsOpen(false);
  };

  const isLight = variant === "light";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
          isLight
            ? "bg-white/10 hover:bg-white/20 text-white/90 hover:text-white border border-white/20"
            : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
        }`}
      >
        <Globe className="w-4 h-4" />
        <span className="font-medium">{localeCodes[currentLocale]}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 rounded-lg shadow-xl py-1 z-50 bg-slate-800/95 backdrop-blur-xl border border-slate-700">
          {(["en", "vi"] as Locale[]).map((locale) => (
            <button
              key={locale}
              onClick={() => handleLocaleChange(locale)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                currentLocale === locale
                  ? "bg-white/10 text-white"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="font-medium w-6">{localeCodes[locale]}</span>
              <span className="flex-1 text-left">{localeNames[locale]}</span>
              {currentLocale === locale && (
                <Check className="w-4 h-4 text-red-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
