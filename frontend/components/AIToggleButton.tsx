"use client";

import { Sparkles } from "lucide-react";

interface AIToggleButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export default function AIToggleButton({ onClick, isOpen }: AIToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
        isOpen
          ? "bg-blue-100 text-blue-700"
          : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
      }`}
      title="AI Assistant"
    >
      <Sparkles className={`w-4 h-4 ${isOpen ? "text-blue-600" : ""}`} />
      <span className="text-sm font-medium hidden sm:inline">AI</span>
    </button>
  );
}
