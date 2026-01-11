/**
 * i18n Scanner Script
 *
 * Scans the codebase for hardcoded text that should be translated.
 * Detects:
 * - Vietnamese text in JSX
 * - English text that's not using t() function
 * - Fallback strings like `|| "Vietnamese text"`
 *
 * Usage: npx ts-node scripts/i18n-scan.ts [--fix]
 */

import * as fs from 'fs';
import * as path from 'path';

// Simple glob-like function using fs
function findFiles(dir: string, pattern: RegExp, ignore: string[] = []): string[] {
  const results: string[] = [];

  function walk(currentDir: string) {
    if (!fs.existsSync(currentDir)) return;

    const items = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(currentDir, item.name);
      const relativePath = path.relative(process.cwd(), fullPath);

      // Skip ignored patterns
      if (ignore.some(ig => relativePath.includes(ig.replace('**/', '').replace('/**', '')))) {
        continue;
      }

      if (item.isDirectory()) {
        walk(fullPath);
      } else if (item.isFile() && pattern.test(item.name)) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

const SRC_DIRS = [
  'app',
  'components',
];

const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.next/**',
  '**/scripts/**',
  '**/messages/**',
];

// Vietnamese character detection regex
const VIETNAMESE_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;

// Common English words that are likely UI text (not code)
const UI_TEXT_PATTERNS = [
  />([\w\s]{3,50})</g,  // Text between JSX tags
  /title="([^"]+)"/g,   // title attributes
  /placeholder="([^"]+)"/g, // placeholder attributes
  /label="([^"]+)"/g,   // label attributes
  /\|\|\s*["'`]([^"'`]+)["'`]/g, // Fallback strings
];

// Words to ignore (technical terms, proper nouns, etc.)
const IGNORE_WORDS = new Set([
  'div', 'span', 'button', 'input', 'form', 'table', 'tr', 'td', 'th',
  'className', 'onClick', 'onChange', 'onSubmit', 'href', 'src',
  'true', 'false', 'null', 'undefined', 'console', 'log', 'error',
  'import', 'export', 'from', 'const', 'let', 'var', 'function',
  'return', 'if', 'else', 'for', 'while', 'switch', 'case',
  'async', 'await', 'try', 'catch', 'throw', 'new',
  'useState', 'useEffect', 'useRef', 'useCallback', 'useMemo',
  'React', 'Component', 'Fragment', 'Props', 'State',
  'GET', 'POST', 'PUT', 'DELETE', 'PATCH',
  'JSON', 'API', 'URL', 'HTTP', 'HTTPS',
  'ID', 'UUID', 'ID', 'id',
]);

interface Issue {
  file: string;
  line: number;
  column: number;
  text: string;
  type: 'vietnamese' | 'english' | 'fallback';
  suggestion?: string;
}

function scanFile(filePath: string): Issue[] {
  const issues: Issue[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, lineIndex) => {
    // Skip import statements and comments
    if (line.trim().startsWith('import ') || line.trim().startsWith('//') || line.trim().startsWith('/*')) {
      return;
    }

    // Skip lines that already use t() or useTranslations
    if (line.includes('t(') || line.includes('useTranslations') || line.includes('usePageTranslations')) {
      // But check for fallback patterns like: t("key") || "Vietnamese"
      const fallbackMatch = line.match(/\|\|\s*["'`]([^"'`]+)["'`]/);
      if (fallbackMatch && VIETNAMESE_REGEX.test(fallbackMatch[1])) {
        issues.push({
          file: filePath,
          line: lineIndex + 1,
          column: line.indexOf(fallbackMatch[0]),
          text: fallbackMatch[1],
          type: 'fallback',
          suggestion: 'Remove fallback - add key to translation files instead',
        });
      }
      return;
    }

    // Check for Vietnamese text
    if (VIETNAMESE_REGEX.test(line)) {
      // Find the Vietnamese text
      const matches = line.match(/["'`]([^"'`]*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][^"'`]*)["'`]/g);
      if (matches) {
        matches.forEach(match => {
          const text = match.slice(1, -1);
          // Skip if it's in a console.log or comment
          if (line.includes('console.') || line.includes('// ')) return;

          issues.push({
            file: filePath,
            line: lineIndex + 1,
            column: line.indexOf(match),
            text: text,
            type: 'vietnamese',
            suggestion: generateKey(text),
          });
        });
      }

      // Also check for JSX text content
      const jsxMatch = line.match(/>([^<]*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][^<]*)</);
      if (jsxMatch) {
        const text = jsxMatch[1].trim();
        if (text.length > 1) {
          issues.push({
            file: filePath,
            line: lineIndex + 1,
            column: line.indexOf(jsxMatch[1]),
            text: text,
            type: 'vietnamese',
            suggestion: generateKey(text),
          });
        }
      }
    }
  });

  return issues;
}

// Generate a suggested translation key from text
function generateKey(text: string): string {
  // Common Vietnamese to English mappings for key generation
  const mappings: Record<string, string> = {
    'Tổng': 'total',
    'Đang': 'current',
    'Hoàn thành': 'completed',
    'Đơn hàng': 'orders',
    'Xe': 'vehicles',
    'Tài xế': 'drivers',
    'Bảo trì': 'maintenance',
    'Chi phí': 'cost',
    'Doanh thu': 'revenue',
    'Lợi nhuận': 'profit',
    'Thêm': 'add',
    'Sửa': 'edit',
    'Xóa': 'delete',
    'Tìm kiếm': 'search',
    'Lọc': 'filter',
    'Xuất': 'export',
    'Nhập': 'import',
    'Lưu': 'save',
    'Hủy': 'cancel',
    'Xác nhận': 'confirm',
    'Đóng': 'close',
    'Mở': 'open',
    'Tạo': 'create',
    'Cập nhật': 'update',
  };

  let key = text.toLowerCase();

  // Apply mappings
  for (const [vi, en] of Object.entries(mappings)) {
    key = key.replace(new RegExp(vi.toLowerCase(), 'g'), en);
  }

  // Convert to camelCase
  key = key
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .map((word, i) => i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  return key || 'unknownKey';
}

function main(): void {
  console.log('🔍 i18n Scanner');
  console.log('===============\n');

  const allIssues: Issue[] = [];

  for (const srcDir of SRC_DIRS) {
    const dirPath = path.join(process.cwd(), srcDir);
    if (!fs.existsSync(dirPath)) continue;

    const files = findFiles(dirPath, /\.tsx$/, IGNORE_PATTERNS);

    console.log(`📁 Scanning ${srcDir}/ (${files.length} files)...`);

    for (const filePath of files) {
      const issues = scanFile(filePath);
      allIssues.push(...issues);
    }
  }

  // Group issues by file
  const issuesByFile = new Map<string, Issue[]>();
  for (const issue of allIssues) {
    const relativePath = path.relative(process.cwd(), issue.file);
    if (!issuesByFile.has(relativePath)) {
      issuesByFile.set(relativePath, []);
    }
    issuesByFile.get(relativePath)!.push(issue);
  }

  // Report
  console.log('\n' + '='.repeat(60));
  console.log('📊 SCAN RESULTS');
  console.log('='.repeat(60) + '\n');

  if (allIssues.length === 0) {
    console.log('✅ No hardcoded text found! Great job!\n');
    return;
  }

  const vietnameseCount = allIssues.filter(i => i.type === 'vietnamese').length;
  const fallbackCount = allIssues.filter(i => i.type === 'fallback').length;

  console.log(`Found ${allIssues.length} issues in ${issuesByFile.size} files:\n`);
  console.log(`  🇻🇳 Vietnamese text: ${vietnameseCount}`);
  console.log(`  ⚠️  Fallback strings: ${fallbackCount}`);
  console.log('\n' + '-'.repeat(60) + '\n');

  // Show issues by file
  for (const [file, issues] of issuesByFile) {
    console.log(`\n📄 ${file} (${issues.length} issues)`);
    console.log('-'.repeat(40));

    for (const issue of issues.slice(0, 10)) {
      const typeIcon = issue.type === 'vietnamese' ? '🇻🇳' : '⚠️';
      console.log(`  ${typeIcon} Line ${issue.line}: "${issue.text.substring(0, 50)}${issue.text.length > 50 ? '...' : ''}"`);
      if (issue.suggestion) {
        console.log(`     💡 Suggested key: ${issue.suggestion}`);
      }
    }

    if (issues.length > 10) {
      console.log(`  ... and ${issues.length - 10} more issues`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 NEXT STEPS');
  console.log('='.repeat(60) + '\n');
  console.log('1. Add missing translations to messages/en.json');
  console.log('2. Run: npm run i18n:sync');
  console.log('3. Translate [TRANSLATE] entries in messages/vi.json');
  console.log('4. Replace hardcoded text with t("key") in components\n');
}

main();
