#!/usr/bin/env node
/**
 * Скрипт пакетного управления и генерации фотографий меню ChickenFit
 * в едином реалистичном ресторанном стиле с узбекской посудой на чистом белом фоне.
 *
 * Использование:
 *   node tools/generate-photos.mjs --list             (показать все доступные промпты блюд)
 *   node tools/generate-photos.mjs --dish <id>        (показать точный промпт конкретного блюда)
 *   node tools/generate-photos.mjs --status           (проверить наличие фото в папке public/menu)
 */

import fs from 'fs';
import path from 'path';

const catalogPath = path.resolve('tools/prompts-catalog.json');
const publicMenuDir = path.resolve('public/menu');

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const args = process.argv.slice(2);

if (args.includes('--list') || args.length === 0) {
  console.log('\n🎨 КАТАЛОГ СТУДИЙНЫХ ПРОМПТОВ ДЛЯ МЕНЮ CHICKENFIT:');
  console.log(`📌 Общий стиль: ${catalog.style}\n`);
  console.log('--------------------------------------------------------------------------------');
  catalog.dishes.forEach((d, i) => {
    const exists = fs.existsSync(path.join(publicMenuDir, d.filename));
    const status = exists ? '✅ [ЕСТЬ ФОТО]' : '⏳ [ОЖИДАЕТ]';
    console.log(`${(i + 1).toString().padStart(2, ' ')}. ${d.id.padEnd(25)} | ${d.name.padEnd(30)} | ${status}`);
  });
  console.log('--------------------------------------------------------------------------------');
  console.log('\n💡 Чтобы посмотреть промпт блюда, выполните: node tools/generate-photos.mjs --dish <id>');
  process.exit(0);
}

if (args.includes('--dish')) {
  const idx = args.indexOf('--dish');
  const dishId = args[idx + 1];
  const dish = catalog.dishes.find(d => d.id === dishId || d.filename === dishId);
  if (!dish) {
    console.error(`❌ Блюдо с id "${dishId}" не найдено в каталоге tools/prompts-catalog.json.`);
    process.exit(1);
  }
  console.log(`\n🍽️  Блюдо: ${dish.name} (${dish.id})`);
  console.log(`📁 Файл: public/menu/${dish.filename}`);
  console.log(`\n🎯 Промпт для генерации:\n`);
  console.log(`"${dish.prompt}"\n`);
  process.exit(0);
}

if (args.includes('--status')) {
  let found = 0;
  let missing = 0;
  catalog.dishes.forEach(d => {
    if (fs.existsSync(path.join(publicMenuDir, d.filename))) {
      found++;
    } else {
      missing++;
      console.log(`Missing: ${d.filename} (${d.name})`);
    }
  });
  console.log(`\n📊 Статус фото меню: ${found} готово, ${missing} отсутствует из ${catalog.dishes.length} позиций.`);
  process.exit(0);
}
