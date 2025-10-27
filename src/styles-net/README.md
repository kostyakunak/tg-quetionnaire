# Template Source Styles

Эта папка содержит скопированные файлы стилей из `template source/` для создания клеточного фона.

## Файлы:

### 1. `template-index.css`
- **Источник:** `template source/src/index.css`
- **Содержит:**
  - Цветовые переменные в oklch формате
  - Tailwind классы для градиентов
  - Утилитарные классы фонов

### 2. `template-globals.css`
- **Источник:** `template source/src/styles/globals.css`
- **Содержит:**
  - Базовые CSS переменные
  - Глобальные стили фона
  - Кастомные классы (.bg-cream-100, .bg-cream-200)

### 3. `template-PaymentPage.tsx`
- **Источник:** `template source/src/components/PaymentPage.tsx`
- **Содержит:**
  - HTML структуру с Tailwind классами
  - Inline стили для SVG текстуры
  - Логику применения фонов

## Использование:

Эти файлы служат как справочник для создания клеточного фона в нашем проекте. Основные элементы:

1. **Градиент:** `bg-gradient-to-br from-amber-50 via-orange-50 to-red-50`
2. **SVG текстура:** Клеточный паттерн с прозрачностью 30%
3. **Цвета:** oklch формат для лучшего качества

## Цветовые переменные:

```css
--color-red-50: oklch(.971 .013 17.38);
--color-orange-50: oklch(.98 .016 73.684);
--color-amber-50: oklch(.987 .022 95.277);
```
