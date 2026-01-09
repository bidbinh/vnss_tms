"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { locales, localeNames, localeFlags, type Locale } from "@/i18n";

interface LanguageSwitcherProps {
  currentLocale: Locale;
  onChange: (locale: Locale) => void;
  variant?: "dropdown" | "buttons";
  showFlag?: boolean;
  showLabel?: boolean;
}

export default function LanguageSwitcher({
  currentLocale,
  onChange,
  variant = "dropdown",
  showFlag = true,
  showLabel = true,
}: LanguageSwitcherProps) {
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

  const handleLocaleChange = async (locale: Locale) => {
    // Set cookie for server-side rendering
    document.cookie = `locale=${locale};path=/;max-age=31536000`;
    onChange(locale);
    setIsOpen(false);
    // Reload to apply changes
    window.location.reload();
  };

  if (variant === "buttons") {
    return (
      <div className="flex flex-wrap gap-2">
        {locales.map((locale) => (
          <button
            key={locale}
            onClick={() => handleLocaleChange(locale)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              currentLocale === locale
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {showFlag && <span className="text-base">{localeFlags[locale]}</span>}
            {showLabel && <span>{localeNames[locale]}</span>}
            {currentLocale === locale && <Check className="w-4 h-4" />}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
      >
        <Globe className="w-4 h-4" />
        {showFlag && <span className="text-base">{localeFlags[currentLocale]}</span>}
        {showLabel && <span className="hidden sm:inline">{localeNames[currentLocale]}</span>}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {locales.map((locale) => (
            <button
              key={locale}
              onClick={() => handleLocaleChange(locale)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                currentLocale === locale ? "bg-blue-50 text-blue-700" : "text-gray-700"
              }`}
            >
              <span className="text-lg">{localeFlags[locale]}</span>
              <span className="flex-1 text-left">{localeNames[locale]}</span>
              {currentLocale === locale && <Check className="w-4 h-4 text-blue-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
