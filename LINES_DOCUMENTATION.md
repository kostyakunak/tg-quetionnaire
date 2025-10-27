# 📋 Инструкция: Как устроена пунктирная линия в проекте

## 🎯 Общая логика

У нас есть **два типа линий**:
- **Пунктирная линия** (коричневая, имитирует спиральный переплет блокнота)
- **Красная линия** (имитирует красную линию отступа в школьных тетрадях)

## 📍 Где и когда показываются линии

### 1. **Этап `start`** (главная страница)
- ✅ **Пунктирная линия**: показывается
- ❌ **Красная линия**: скрыта

### 2. **Этап `intro`** (ввод имени, возраста)
- ✅ **Пунктирная линия**: показывается  
- ❌ **Красная линия**: скрыта

### 3. **Этап `questionnaire`** (основная анкета)
- ❌ **Пунктирная линия**: скрыта
- ✅ **Красная линия**: показывается

## 🔧 Техническая реализация

### CSS правила для пунктирной линии:

```css
/* Главная страница */
body.stage-start .hero::before {
    left: 80px;
    background: repeating-linear-gradient(...);
}

/* Экран ввода имени */
body.stage-intro .question-slide::before {
    left: 80px;
    background: repeating-linear-gradient(...);
}
```

### CSS правила для красной линии:

```css
/* Только на этапе questionnaire */
.is-questionnaire .question-slide::after {
    left: 90px;
    background: #e74c3c;
}
```

## 🎨 Внешний вид

### Пунктирная линия:
- **Цвет**: `var(--warm-brown)` (коричневый)
- **Ширина**: `3px`
- **Позиция**: `80px` от левого края
- **Паттерн**: 20px линия + 20px прозрачность

### Красная линия:
- **Цвет**: `#e74c3c` (красный)
- **Ширина**: `2px` 
- **Позиция**: `90px` от левого края
- **Прозрачность**: `0.3`

## 🏗️ Структура элементов

### Главная страница (`index.html`):
```html
<section class="hero">
    <!-- пунктирная линия через .hero::before -->
</section>
```

### Экран ввода имени:
```html
<div class="question-slide">
    <!-- пунктирная линия через .question-slide::before -->
</div>
```

### Основная анкета:
```html
<div class="question-slide">
    <!-- красная линия через .question-slide::after -->
</div>
```

## 🔄 Переключение этапов

В JavaScript (`src/main.js`):

```javascript
setStage(stage) {
    // Убираем все классы этапов
    document.body.classList.remove('stage-start', 'stage-intro', 'stage-questionnaire', 'is-questionnaire')
    
    // Добавляем нужный класс
    document.body.classList.add(`stage-${stage}`)
    
    // Для questionnaire добавляем дополнительный класс
    if (stage === 'questionnaire') {
        document.body.classList.add('is-questionnaire')
    }
}
```

## 🚫 Отключение на клеточном фоне

Если используется клеточный фон (`bg-template-cellular`), все линии отключаются:

```css
body.bg-template-cellular .hero::before,
body.bg-template-cellular .question-slide::before {
    display: none !important;
}
```

## 📝 Резюме для разработчика

**Простыми словами:**
1. **Пунктирная** = коричневая, 80px слева, на главной и вводе имени
2. **Красная** = красная, 90px слева, только на анкете  
3. **Переключение** = через классы `stage-*` на `body`
4. **Отключение** = через класс `bg-template-cellular`

**Если нужно изменить:**
- Позицию → меняй `left: 80px` или `left: 90px`
- Цвет → меняй `background` или `var(--warm-brown)`
- Где показывать → меняй селекторы `body.stage-*`

## 🔍 Отладка

### Если линии не видны:

1. **Проверь классы на body:**
   ```javascript
   console.log(document.body.className)
   ```

2. **Проверь элементы в DOM:**
   - Главная страница: есть ли `.hero`?
   - Экран ввода: есть ли `.question-slide`?
   - Анкета: есть ли `.question-slide`?

3. **Проверь CSS правила:**
   - Открыть DevTools → Elements → найти элемент
   - Посмотреть Computed styles для `::before` и `::after`

### Логи в консоли:
При переключении этапов должны появляться логи:
```
🎯 setStage called with: intro
➕ Added class: stage-intro
```

## 📁 Файлы для редактирования

- **CSS**: `src/style.css` (строки ~350-400 для пунктирной, ~800-1100 для красной)
- **JavaScript**: `src/main.js` (функция `setStage()`)
- **HTML**: `index.html` (главная страница), `questionnaire.html` (анкета)

---
*Создано: $(date)*
*Версия: 1.0*
