/**
 * Script để extract các text hardcode tiếng Việt từ các page
 * và generate translation keys tương ứng
 *
 * Usage: node scripts/extract-i18n.js [path-to-page.tsx]
 * Example: node scripts/extract-i18n.js app/(protected)/tms/drivers/page.tsx
 */

const fs = require('fs');
const path = require('path');

// Vietnamese character pattern
const VIETNAMESE_PATTERN = /["'`]([^"'`]*[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ][^"'`]*)["'`]/g;

// Common words to ignore (not translatable)
const IGNORE_WORDS = [
  'use client',
  'use server',
  'className',
  'type',
  'method',
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'Bearer',
  'Authorization',
  'Content-Type',
  'application/json'
];

function extractVietnameseStrings(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const matches = [];
  let match;

  while ((match = VIETNAMESE_PATTERN.exec(content)) !== null) {
    const text = match[1].trim();
    if (text.length > 1 && !IGNORE_WORDS.some(w => text.includes(w))) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      matches.push({
        text,
        line: lineNumber,
        context: content.substring(Math.max(0, match.index - 50), match.index + text.length + 50).replace(/\n/g, ' ')
      });
    }
  }

  return matches;
}

function generateTranslationKey(text) {
  // Convert Vietnamese text to a valid key
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .trim()
    .split(/\s+/)
    .slice(0, 4) // Max 4 words
    .map((word, i) => i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  return normalized || 'text';
}

function analyzeFile(filePath) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Analyzing: ${filePath}`);
  console.log('='.repeat(60));

  const fullPath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    return;
  }

  const strings = extractVietnameseStrings(fullPath);

  if (strings.length === 0) {
    console.log('No Vietnamese hardcoded strings found.');
    return;
  }

  // Extract module and page name from path
  const pathParts = filePath.split('/');
  const moduleIndex = pathParts.indexOf('(protected)') + 1;
  const module = pathParts[moduleIndex] || 'common';
  const pageName = pathParts[pathParts.length - 2] || 'page';

  console.log(`\nFound ${strings.length} Vietnamese strings:\n`);

  const translations = {};

  strings.forEach((item, index) => {
    const key = generateTranslationKey(item.text);
    console.log(`${index + 1}. Line ${item.line}: "${item.text}"`);
    console.log(`   Key suggestion: ${module}.${pageName}.${key}`);
    console.log(`   Context: ...${item.context}...`);
    console.log('');

    if (!translations[key]) {
      translations[key] = item.text;
    }
  });

  // Generate JSON output
  console.log('\n--- Generated Translation Keys (vi.json) ---\n');
  const jsonOutput = {
    [module]: {
      [pageName]: translations
    }
  };
  console.log(JSON.stringify(jsonOutput, null, 2));

  // Generate replacement suggestions
  console.log('\n--- Replacement Suggestions ---\n');
  strings.forEach((item) => {
    const key = generateTranslationKey(item.text);
    console.log(`"${item.text}" -> t("${key}")`);
  });
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/extract-i18n.js <path-to-file>');
  console.log('Example: node scripts/extract-i18n.js app/(protected)/tms/drivers/page.tsx');
  process.exit(1);
}

analyzeFile(args[0]);
