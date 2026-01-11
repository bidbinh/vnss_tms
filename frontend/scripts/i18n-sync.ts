/**
 * i18n Sync Script
 *
 * This script ensures all translation files stay in sync with the master (en.json).
 * - Copies missing keys from en.json to other locales
 * - Removes keys that no longer exist in en.json
 * - Reports missing translations that need attention
 *
 * Usage: npx ts-node scripts/i18n-sync.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const MESSAGES_DIR = path.resolve(process.cwd(), 'messages');
const MASTER_LOCALE = 'en';
const SUPPORTED_LOCALES = ['vi']; // Add more as needed: 'ja', 'ko', 'zh', etc.

interface TranslationObject {
  [key: string]: string | TranslationObject;
}

// Flatten nested object to dot notation keys
function flattenObject(obj: TranslationObject, prefix = ''): Map<string, string> {
  const result = new Map<string, string>();

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      result.set(newKey, value);
    } else if (typeof value === 'object' && value !== null) {
      const nested = flattenObject(value as TranslationObject, newKey);
      nested.forEach((v, k) => result.set(k, v));
    }
  }

  return result;
}

// Unflatten dot notation keys back to nested object
function unflattenObject(flatMap: Map<string, string>): TranslationObject {
  const result: TranslationObject = {};

  for (const [key, value] of flatMap) {
    const parts = key.split('.');
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part] as TranslationObject;
    }

    current[parts[parts.length - 1]] = value;
  }

  return result;
}

// Sort object keys alphabetically (recursive)
function sortObjectKeys(obj: TranslationObject): TranslationObject {
  const sorted: TranslationObject = {};
  const keys = Object.keys(obj).sort();

  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'object' && value !== null) {
      sorted[key] = sortObjectKeys(value as TranslationObject);
    } else {
      sorted[key] = value;
    }
  }

  return sorted;
}

// Load JSON file
function loadJson(filePath: string): TranslationObject {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return {};
  }
}

// Save JSON file with pretty formatting
function saveJson(filePath: string, data: TranslationObject): void {
  const content = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(filePath, content, 'utf-8');
}

// Main sync function
function syncTranslations(): void {
  console.log('🌍 i18n Sync Script');
  console.log('==================\n');

  // Load master translations
  const masterPath = path.join(MESSAGES_DIR, `${MASTER_LOCALE}.json`);
  const masterData = loadJson(masterPath);
  const masterFlat = flattenObject(masterData);

  console.log(`📖 Master locale (${MASTER_LOCALE}): ${masterFlat.size} keys\n`);

  // Process each supported locale
  for (const locale of SUPPORTED_LOCALES) {
    console.log(`\n📝 Processing: ${locale}.json`);
    console.log('-'.repeat(40));

    const localePath = path.join(MESSAGES_DIR, `${locale}.json`);
    const localeData = loadJson(localePath);
    const localeFlat = flattenObject(localeData);

    let addedCount = 0;
    let removedCount = 0;
    const missingTranslations: string[] = [];

    // Find missing keys (in master but not in locale)
    for (const [key, value] of masterFlat) {
      if (!localeFlat.has(key)) {
        // Add missing key with English value as placeholder
        localeFlat.set(key, `[TRANSLATE] ${value}`);
        missingTranslations.push(key);
        addedCount++;
      } else if (localeFlat.get(key)?.startsWith('[TRANSLATE]')) {
        // Still needs translation
        missingTranslations.push(key);
      }
    }

    // Find orphan keys (in locale but not in master)
    const orphanKeys: string[] = [];
    for (const key of localeFlat.keys()) {
      if (!masterFlat.has(key)) {
        orphanKeys.push(key);
        localeFlat.delete(key);
        removedCount++;
      }
    }

    // Rebuild and save
    const newLocaleData = unflattenObject(localeFlat);
    const sortedData = sortObjectKeys(newLocaleData);
    saveJson(localePath, sortedData);

    // Report
    console.log(`  ✅ Total keys: ${localeFlat.size}`);

    if (addedCount > 0) {
      console.log(`  ➕ Added ${addedCount} new keys (marked [TRANSLATE])`);
    }

    if (removedCount > 0) {
      console.log(`  ➖ Removed ${removedCount} orphan keys:`);
      orphanKeys.slice(0, 5).forEach(k => console.log(`     - ${k}`));
      if (orphanKeys.length > 5) {
        console.log(`     ... and ${orphanKeys.length - 5} more`);
      }
    }

    if (missingTranslations.length > 0) {
      console.log(`  ⚠️  ${missingTranslations.length} keys need translation:`);
      missingTranslations.slice(0, 10).forEach(k => console.log(`     - ${k}`));
      if (missingTranslations.length > 10) {
        console.log(`     ... and ${missingTranslations.length - 10} more`);
      }
    } else {
      console.log(`  🎉 All keys translated!`);
    }
  }

  console.log('\n✨ Sync complete!\n');
}

// Run
syncTranslations();
