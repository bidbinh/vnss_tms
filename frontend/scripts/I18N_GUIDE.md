# i18n (Internationalization) Guide

## Overview

This project uses **next-intl** for internationalization with **English as the master language**.

## Key Principles

1. **English First**: All text should be written in English in `en.json`
2. **Never Hardcode**: Never hardcode text directly in components
3. **Sync Translations**: Run sync script after adding new keys

## File Structure

```
frontend/
├── messages/
│   ├── en.json          # Master translation file (English)
│   └── vi.json          # Vietnamese translations
├── scripts/
│   ├── i18n-sync.ts     # Sync translations between locales
│   ├── i18n-scan.ts     # Scan for hardcoded text
│   └── I18N_GUIDE.md    # This guide
├── i18n.ts              # i18n configuration
└── hooks/
    └── usePageTranslations.ts  # Translation hook
```

## NPM Scripts

```bash
# Sync translations (copies missing keys from en.json to other locales)
npm run i18n:sync

# Scan for hardcoded text in components
npm run i18n:scan
```

## How to Add New Text

### Step 1: Add to English translation file

```json
// messages/en.json
{
  "moduleName": {
    "pageName": {
      "title": "Page Title",
      "description": "Page description",
      "buttons": {
        "save": "Save",
        "cancel": "Cancel"
      }
    }
  }
}
```

### Step 2: Run sync script

```bash
npm run i18n:sync
```

This will:
- Add missing keys to `vi.json` with `[TRANSLATE]` prefix
- Remove orphan keys not in `en.json`

### Step 3: Translate Vietnamese

Edit `vi.json` and replace `[TRANSLATE] English text` with Vietnamese translation.

### Step 4: Use in component

```tsx
"use client";

import { usePageTranslations } from "@/hooks/usePageTranslations";

export default function MyPage() {
  const { t } = usePageTranslations("moduleName.pageName");

  return (
    <div>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
      <button>{t("buttons.save")}</button>
    </div>
  );
}
```

## Translation Key Naming Convention

### Structure
```
{module}.{page/component}.{section}.{element}
```

### Examples
```json
{
  "tms": {
    "dashboardPage": {
      "title": "TMS Dashboard",
      "stats": {
        "tractors": "Tractors",
        "drivers": "Drivers"
      }
    },
    "ordersPage": {
      "title": "Orders",
      "columns": {
        "orderNo": "Order No.",
        "customer": "Customer"
      }
    }
  }
}
```

## Common Keys (Reusable)

Put common/shared translations in `common` namespace:

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success"
  }
}
```

Use in components:
```tsx
import { useTranslations } from "next-intl";

const t = useTranslations("common");
<button>{t("save")}</button>
```

## DO's and DON'Ts

### DO

```tsx
// Good: Use translation function
<h1>{t("title")}</h1>
<button title={t("buttons.save")}>{t("buttons.save")}</button>
<input placeholder={t("placeholders.search")} />
```

### DON'T

```tsx
// Bad: Hardcoded text
<h1>Dashboard</h1>
<button>Save</button>
<input placeholder="Search..." />

// Bad: Fallback to hardcoded text
<h1>{t("title") || "Dashboard"}</h1>

// Bad: Vietnamese in code
<h1>Bảng điều khiển</h1>
```

## Adding New Language

1. Create new translation file: `messages/{locale}.json`
2. Add locale to `i18n.ts`:
   ```ts
   export const locales = ['vi', 'en', 'ja'] as const;
   ```
3. Add to `SUPPORTED_LOCALES` in `scripts/i18n-sync.ts`
4. Run `npm run i18n:sync`
5. Translate all `[TRANSLATE]` entries

## Troubleshooting

### Missing translation shows key instead of text

- Check if key exists in `en.json`
- Run `npm run i18n:sync`
- Verify component uses correct namespace

### Text not updating after change

- Clear browser cache
- Restart dev server
- Check if correct locale file is being modified

## Quality Checklist

Before PR:

- [ ] No hardcoded text in components
- [ ] All new keys added to `en.json`
- [ ] Ran `npm run i18n:sync`
- [ ] Translated `[TRANSLATE]` entries in `vi.json`
- [ ] Ran `npm run i18n:scan` to verify
