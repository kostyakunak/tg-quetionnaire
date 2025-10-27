export class QuestionnaireManager {
    constructor(animatedBackground = null) {
        this.questions = []
        this.currentQuestionIndex = 0
        this.answers = []
        this.selectedOptions = []
        this.otherText = ''
        this.hasOther = false
        this.canGoBack = true
        this.scrollContainer = null
        this.questionSections = []

        // Animated background for parallax synchronization
        this.animatedBackground = animatedBackground

        // Simplified animation control - only scroll animation
        this.isAnimating = false
        this.isMobile = window.innerWidth <= 768

        // Listen for resize events
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 768

            // Re-render current question if layout changes
            if (this.questions.length > 0 && this.currentQuestionIndex < this.questions.length) {
                const currentQuestion = this.questions[this.currentQuestionIndex]
                const currentSlide = this.questionSections[this.currentQuestionIndex]
                if (currentSlide && currentQuestion) {
                    currentSlide.innerHTML = this.getQuestionHTML(currentQuestion)
                    window.__applySmartCenter?.();
                    const answerContainer = currentSlide.querySelector('#answerContainer')
                    this.renderAnswerInterface(currentQuestion, answerContainer)
                    this.bindQuestionEvents(currentQuestion)
                }
            }
        })
    }

    // Static method to create scroll animation container for any content
    static createScrollContainer(parentElement) {
        // Clear any existing container
        const existingContainer = parentElement.querySelector('.questionnaire-scroll-container')
        if (existingContainer) {
            existingContainer.remove()
        }
        
        // Create scroll animation container
        const scrollContainer = document.createElement('div')
        scrollContainer.className = 'questionnaire-scroll-container'
        
        // Create current and next slide containers
        const currentSlide = document.createElement('div')
        currentSlide.className = 'question-slide current'
        currentSlide.id = 'currentSlide'
        
        const nextSlide = document.createElement('div')
        nextSlide.className = 'question-slide next'
        nextSlide.id = 'nextSlide'
        
        scrollContainer.appendChild(currentSlide)
        scrollContainer.appendChild(nextSlide)

        parentElement.appendChild(scrollContainer)
        return { scrollContainer, currentSlide, nextSlide }
    }

    // Static method to animate between any two content blocks
    static animateScrollTransition(currentSlide, nextSlide, nextContent, direction = 'next', callback = null, animatedBackground = null) {
        const startTime = performance.now();
        console.log(`📄 QuestionnaireManager: Starting slide transition ${direction} at ${startTime.toFixed(0)}ms`);

        // Prepare next slide with new content (only if content is provided)
        if (nextContent !== null) {
            nextSlide.innerHTML = nextContent
        }

        // Position next slide based on direction
        nextSlide.style.transform = direction === 'next' ? 'translateY(100%)' : 'translateY(-100%)'
        nextSlide.style.opacity = '1'

        // Force reflow
        nextSlide.offsetHeight

        // Start animation
        requestAnimationFrame(() => {
            const animStartTime = performance.now();
            console.log(`📄 QuestionnaireManager: Animation started at ${animStartTime.toFixed(0)}ms (${(animStartTime - startTime).toFixed(1)}ms delay)`);

            // Start parallax transition if animated background is provided
            if (animatedBackground) {
                animatedBackground.startParallaxTransition(direction, 600)
            }

            currentSlide.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s ease'
            nextSlide.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s ease'

            if (direction === 'next') {
                currentSlide.style.transform = 'translateY(-100%)'
                currentSlide.style.opacity = '0'
                nextSlide.style.transform = 'translateY(0)'
            } else {
                currentSlide.style.transform = 'translateY(100%)'
                currentSlide.style.opacity = '0'
                nextSlide.style.transform = 'translateY(0)'
            }
        })

        // Wait for animation to complete
        setTimeout(() => {
            const endTime = performance.now();
            console.log(`📄 QuestionnaireManager: Animation completed at ${endTime.toFixed(0)}ms (${(endTime - startTime).toFixed(1)}ms total)`);

            // End parallax transition if animated background is provided
            if (animatedBackground) {
                animatedBackground.endParallaxTransition()
            }

            // Swap slides content and reset positions
            const tempHTML = currentSlide.innerHTML
            currentSlide.innerHTML = nextSlide.innerHTML
            nextSlide.innerHTML = tempHTML

            // Reset styles
            currentSlide.style.transform = 'translateY(0)'
            currentSlide.style.opacity = '1'
            currentSlide.style.transition = ''

            nextSlide.style.transform = 'translateY(100%)'
            nextSlide.style.opacity = '0'
            nextSlide.style.transition = ''

            // Execute callback if provided
            if (callback) callback()
        }, 600) // Match CSS transition duration
    }

    setQuestions(questions) {
        // Нормализация типов вопросов
        const normType = (t) => {
            const k = String(t || '').toLowerCase().replace(/[\s-]+/g, '_');
            if (['text','single_choice','multiple_choice'].includes(k)) return k;
            if (['single','one','radio'].includes(k)) return 'single_choice';
            if (['multiple','multi','checkbox','multiple_select'].includes(k)) return 'multiple_choice';
            if (['open','free','input','text_input','textarea'].includes(k)) return 'text';
            return 'text';
        };

        this.questions = (questions || []).map(q => ({
            ...q,
            question_type: normType(q.question_type),
            allow_other: !!q.allow_other,
            options: Array.isArray(q.options)
                ? q.options.filter(o => o && o.id != null && String(o.option_text || '').trim() !== '')
                : []
        }));

        // Если choice без опций — в текст
        this.questions = this.questions.map(q => {
            const isChoice = q.question_type === 'single_choice' || q.question_type === 'multiple_choice';
            if (isChoice && (!q.options || q.options.length === 0)) {
                return { ...q, question_type: 'text' };
            }
            return q;
        });

        this.updateQuestionCounter()
    }

    // Set animated background for parallax synchronization
    setAnimatedBackground(animatedBackground) {
        this.animatedBackground = animatedBackground
    }

    // Метод для экранирования HTML из БД
    escapeHTML(s) {
        const div = document.createElement('div');
        div.textContent = String(s ?? '');
        return div.innerHTML;
    }

    start() {
        // Страховка от скрытых контейнеров
        document.querySelector('#questionnaire .questionnaire-header')?.classList.remove('hidden');
        document.querySelector('#questionnaire .questionnaire-scroll-container')?.classList.remove('hidden');

        this.setupScrollContainer()

        // Restore progress if exists
        try {
            const savedAnswers = JSON.parse(localStorage.getItem('answers') || '[]')
            const savedIndex = parseInt(localStorage.getItem('currentIndex') || '0', 10)
            const questionsLen = this.questions.length
            if (Array.isArray(savedAnswers) && savedAnswers.length > 0) {
                if (savedIndex >= questionsLen || savedAnswers.length >= questionsLen) {
                    localStorage.removeItem('answers')
                    localStorage.removeItem('currentIndex')
                    this.currentQuestionIndex = 0
                    this.answers = []
                } else {
                    this.answers = savedAnswers
                    this.currentQuestionIndex = Math.min(Math.max(savedIndex, 0), questionsLen - 1)
                }
            } else {
                this.currentQuestionIndex = 0
                this.answers = []
            }
        } catch (_) {
            this.currentQuestionIndex = 0
            this.answers = []
        }
        this.showCurrentQuestion()
    }

    setupScrollContainer() {
        const questionnaireEl = document.getElementById('questionnaire')
        
        // Clear any existing content
        const existingContainer = questionnaireEl.querySelector('.questionnaire-scroll-container')
        if (existingContainer) {
            existingContainer.remove()
        }
        
        // Create scroll animation container
        const scrollContainer = document.createElement('div')
        scrollContainer.className = 'questionnaire-scroll-container'
        
        // Create current and next question containers
        const currentQuestion = document.createElement('div')
        currentQuestion.className = 'question-slide current'
        currentQuestion.id = 'currentQuestionSlide'
        
        const nextQuestion = document.createElement('div')
        nextQuestion.className = 'question-slide next'
        nextQuestion.id = 'nextQuestionSlide'
        
        scrollContainer.appendChild(currentQuestion)
        scrollContainer.appendChild(nextQuestion)

        questionnaireEl.appendChild(scrollContainer)
        this.scrollContainer = scrollContainer
    }

    showCurrentQuestion() {
        if (this.currentQuestionIndex >= this.questions.length) {
            this.complete()
            return
        }

        const question = this.questions[this.currentQuestionIndex]
        this.updateProgress()
        this.renderScrollQuestion(question)
        
        // Показываем подсказку на первом вопросе
        if (this.currentQuestionIndex === 0) {
            this.showFirstQuestionHint()
        }
    }

    renderScrollQuestion(question) {
        const currentSlide = document.getElementById('currentQuestionSlide')
        if (!currentSlide) return

        // Clear and render current question
        currentSlide.innerHTML = this.getQuestionHTML(question)
        window.__applySmartCenter?.();

        // Reset state
        this.selectedOptions = []
        this.otherText = ''
        this.hasOther = false

        const nextButton = currentSlide.querySelector('#nextButton')
        if (nextButton) nextButton.disabled = true

        const answerContainer = currentSlide.querySelector('#answerContainer')
        this.renderAnswerInterface(question, answerContainer)
        this.bindQuestionEvents(question)
    }

    getQuestionHTML(question) {
        // Check if we're on desktop (screen width >= 1024px)
        const isDesktop = window.innerWidth >= 1024;
        
        if (isDesktop) {
            // Desktop: everything inside card
            return `
                <div class="question-content question-card" data-smart-center>
                    ${question.instruction ? `<div class="question-instruction">${this.escapeHTML(question.instruction)}</div>` : ''}
                    <h2 class="question-text">${this.escapeHTML(question.text)}</h2>
                    <div class="answer-container" id="answerContainer"></div>
                    <div class="question-navigation">
                        ${this.currentQuestionIndex > 0 && this.canGoBack ? '<button id="prevButton" class="prev-button">Назад</button>' : '<div></div>'}
                        <button id="nextButton" class="next-button" disabled>Далее</button>
                    </div>
                </div>
            `
        } else {
            // Mobile: instruction and navigation outside card
            return `
                ${question.instruction ? `<div class="question-instruction question-instruction-mobile">${this.escapeHTML(question.instruction)}</div>` : ''}
                <div class="question-content question-card" data-smart-center>
                    <h2 class="question-text">${this.escapeHTML(question.text)}</h2>
                    <div class="answer-container" id="answerContainer"></div>
                </div>
                <div class="question-navigation question-navigation-mobile">
                    ${this.currentQuestionIndex > 0 && this.canGoBack ? '<button id="prevButton" class="prev-button">Назад</button>' : '<div></div>'}
                    <button id="nextButton" class="next-button" disabled>Далее</button>
                </div>
            `
        }
    }

    renderAnswerInterface(question, container) {
        // Render answer interface based on question type
        switch (question.question_type) {
            case 'text':
                this.renderTextQuestion(container)
                break
            case 'single_choice':
                this.renderSingleChoiceQuestion(container, question)
                break
            case 'multiple_choice':
                this.renderMultipleChoiceQuestion(container, question)
                break
            default:
                this.renderTextQuestion(container)
                break
        }
    }

    renderTextQuestion(container) {
        const question = this.questions[this.currentQuestionIndex]
        const placeholder = question?.instruction || 'Напиши свой ответ...'
        container.innerHTML = `
            <div class="text-answer">
                <textarea
                    id="textAnswer"
                    placeholder="${placeholder}"
                    rows="4"
                ></textarea>
            </div>
        `
    }

    renderSingleChoiceQuestion(container, question) {
        let html = '<div class="choice-options single-choice">'

        question.options.forEach(option => {
            html += `
                <label class="choice-option">
                    <input type="radio" name="singleChoice" value="${option.id}" data-text="${this.escapeHTML(option.option_text)}">
                    <span class="option-text">${this.escapeHTML(option.option_text)}</span>
                </label>
            `
        })

        if (question.allow_other) {
            html += `
                <label class="choice-option other-option">
                    <input type="radio" name="singleChoice" value="other">
                    <span class="option-text">Другое</span>
                </label>
                <div class="other-input hidden">
                    <input type="text" id="otherText" placeholder="Напишите ваш вариант...">
                </div>
            `
        }

        html += '</div>'
        container.innerHTML = html
    }

    renderMultipleChoiceQuestion(container, question) {
        let html = '<div class="choice-options multiple-choice">'
        
        question.options.forEach(option => {
            html += `
                <label class="choice-option">
                    <input type="checkbox" value="${option.id}" data-text="${this.escapeHTML(option.option_text)}">
                    <span class="option-text">${this.escapeHTML(option.option_text)}</span>
                </label>
            `
        })

        if (question.allow_other) {
            html += `
                <label class="choice-option other-option">
                    <input type="checkbox" value="other">
                    <span class="option-text">Другое</span>
                </label>
                <div class="other-input hidden">
                    <input type="text" id="otherText" placeholder="Напишите ваш вариант...">
                </div>
            `
        }

        html += '</div>'
        container.innerHTML = html
    }

    bindQuestionEvents(question) {
        const nextButton = document.getElementById('nextButton')
        const backBtn = document.getElementById('prevButton')
        
        switch (question.question_type) {
            case 'text':
                this.bindTextEvents()
                break
            case 'single_choice':
                this.bindSingleChoiceEvents(question)
                break
            case 'multiple_choice':
                this.bindMultipleChoiceEvents(question)
                break
        }

        nextButton.onclick = () => this.nextQuestion(question)
        if (backBtn) {
            backBtn.onclick = () => this.prevQuestion()
        }
    }

    bindTextEvents() {
        const textArea = document.getElementById('textAnswer')
        if (textArea) {
            textArea.addEventListener('input', () => {
                const isValid = textArea.value.trim().length > 0
                this.dispatchAnswerChanged(isValid)
            })
        }
    }

    bindSingleChoiceEvents(question) {
        const radios = document.querySelectorAll('input[name="singleChoice"]')
        const otherInput = document.getElementById('otherText')
        const otherContainer = document.querySelector('.other-input')

        radios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.value === 'other') {
                    otherContainer?.classList.remove('hidden')
                    otherInput?.focus()
                    this.hasOther = true
                    this.dispatchAnswerChanged(false) // Wait for other text
                } else {
                    otherContainer?.classList.add('hidden')
                    this.hasOther = false
                    this.selectedOptions = [radio.value]
                    this.dispatchAnswerChanged(true)
                }
            })
        })

        if (otherInput) {
            otherInput.addEventListener('input', () => {
                this.otherText = otherInput.value.trim()
                this.dispatchAnswerChanged(this.otherText.length > 0)
            })
        }
    }

    bindMultipleChoiceEvents(question) {
        const checkboxes = document.querySelectorAll('.multiple-choice input[type="checkbox"]')
        const otherInput = document.getElementById('otherText')
        const otherContainer = document.querySelector('.other-input')

        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                if (checkbox.value === 'other') {
                    if (checkbox.checked) {
                        otherContainer?.classList.remove('hidden')
                        otherInput?.focus()
                        this.hasOther = true
                    } else {
                        otherContainer?.classList.add('hidden')
                        this.hasOther = false
                        this.otherText = ''
                    }
                } else {
                    if (checkbox.checked) {
                        this.selectedOptions.push(checkbox.value)
                    } else {
                        this.selectedOptions = this.selectedOptions.filter(id => id !== checkbox.value)
                    }
                }
                
                this.updateMultipleChoiceValidation()
            })
        })

        if (otherInput) {
            otherInput.addEventListener('input', () => {
                this.otherText = otherInput.value.trim()
                this.updateMultipleChoiceValidation()
            })
        }
    }

    updateMultipleChoiceValidation() {
        const hasSelections = this.selectedOptions.length > 0
        const hasValidOther = this.hasOther ? this.otherText.length > 0 : true
        const isValid = hasSelections || (this.hasOther && this.otherText.length > 0)
        
        this.dispatchAnswerChanged(isValid)
    }

    nextQuestion(question) {
        if (this.isAnimating) return
        
        this.animateScrollTransition('next', question)
    }

    prevQuestion() {
        if (this.isAnimating) return
        
        // Allow only one consecutive back
        if (this.currentQuestionIndex === 0 || !this.canGoBack) return
        
        this.animateScrollTransition('prev')
    }
    
    animateScrollTransition(direction, question = null) {
        if (this.isAnimating) return

        console.log(`📄 QuestionnaireManager: Instance animateScrollTransition called with direction: ${direction}`);
        this.isAnimating = true

        const currentSlide = document.getElementById('currentQuestionSlide')
        const nextSlide = document.getElementById('nextQuestionSlide')

        if (!currentSlide || !nextSlide) {
            console.log('📄 QuestionnaireManager: Slides not found, aborting');
            this.isAnimating = false
            return
        }
        
        // Prepare next question data
        let nextQuestionIndex, nextQuestion
        if (direction === 'next' && question) {
            // Process current answer first
            const justAnsweredNumber = this.currentQuestionIndex + 1
            const answer = this.collectAnswer(question)
            this.answers.push({
                question_id: question.id,
                type: question.question_type,
                value: answer
            })

            // persist progress
            try {
                localStorage.setItem('answers', JSON.stringify(this.answers))
                localStorage.setItem('currentIndex', String(this.currentQuestionIndex + 1))
            } catch (_) {}

            // Show interruptions after specific questions
            this.maybeInterruption(justAnsweredNumber)

            // Moving forward re-enables one back step
            this.canGoBack = true
            
            nextQuestionIndex = this.currentQuestionIndex + 1
            nextQuestion = this.questions[nextQuestionIndex]
        } else if (direction === 'prev') {
            this.answers.pop()
            try {
                localStorage.setItem('answers', JSON.stringify(this.answers))
                localStorage.setItem('currentIndex', String(this.currentQuestionIndex - 1))
            } catch (_) {}
            
            this.canGoBack = false
            nextQuestionIndex = this.currentQuestionIndex - 1
            nextQuestion = this.questions[nextQuestionIndex]
        }
        
        // Check if we're at the end
        if (direction === 'next' && nextQuestionIndex >= this.questions.length) {
            this.currentQuestionIndex = nextQuestionIndex
            this.isAnimating = false
            this.complete()
            return
        }
        
        if (!nextQuestion) {
            this.isAnimating = false
            return
        }
        
        // Prepare next slide with new question HTML
        const nextQuestionHTML = this.getQuestionHTML(nextQuestion)
        nextSlide.innerHTML = nextQuestionHTML
        
        // Render answer interface for the new question
        const answerContainer = nextSlide.querySelector('#answerContainer')
        if (answerContainer) {
            this.renderAnswerInterface(nextQuestion, answerContainer)
        }
        
        // Reset state for next question
        this.selectedOptions = []
        this.otherText = ''
        this.hasOther = false
        
        const nextButton = nextSlide.querySelector('#nextButton')
        if (nextButton) nextButton.disabled = true
        
        // Use static method for animation with parallax synchronization
        // Pass null as nextContent since we already rendered it
        QuestionnaireManager.animateScrollTransition(
            currentSlide,
            nextSlide,
            null, // Don't re-render content, use what's already there
            direction,
            () => {
                // Update current question index
                this.currentQuestionIndex = nextQuestionIndex
                this.updateProgress()

                // Bind events for the new current question
                this.bindQuestionEvents(nextQuestion)

                this.isAnimating = false
            },
            this.animatedBackground
        )
    }

    collectAnswer(question) {
        switch (question.question_type) {
            case 'text':
                return document.getElementById('textAnswer').value.trim()
            
            case 'single_choice':
                if (this.hasOther) {
                    // Mirror bot formatting for "other"
                    return this.otherText ? `Другое: ${this.otherText}` : ''
                } else {
                    const selectedRadio = document.querySelector('input[name="singleChoice"]:checked')
                    return selectedRadio ? selectedRadio.dataset.text : ''
                }
            
            case 'multiple_choice':
                const selectedTexts = []
                
                // Add selected option texts
                this.selectedOptions.forEach(optionId => {
                    const checkbox = document.querySelector(`input[value="${optionId}"]`)
                    if (checkbox && checkbox.dataset.text) {
                        selectedTexts.push(checkbox.dataset.text)
                    }
                })
                
                // Format answer
                let answer = selectedTexts.join('; ')
                if (this.hasOther && this.otherText) {
                    answer += answer ? ` | Другое: ${this.otherText}` : `Другое: ${this.otherText}`
                }
                
                return answer
        }
    }

    maybeInterruption(questionNumber) {
        // Прерывания временно отключены
        return
    }

    showInterruption(text) {
        // Временно отключено
        return
        try {
            // Создаем элегантное уведомление в правом верхнем углу
            const notification = document.createElement('div')
            notification.className = 'questionnaire-notification'
            notification.innerHTML = `
                <div class="notification-content">
                    <div class="notification-text">${text}</div>
                    <button class="notification-close" aria-label="Закрыть">✖</button>
                </div>
            `
            
            // Добавляем в контейнер анкеты
            const questionnaire = document.getElementById('questionnaire')
            if (questionnaire) {
                questionnaire.appendChild(notification)
                
                // Анимация появления
                setTimeout(() => notification.classList.add('show'), 100)
                
                // Автоскрытие через 8 секунд
                const autoHide = setTimeout(() => {
                    this.hideNotification(notification)
                }, 8000)
                
                // Закрытие по клику
                notification.querySelector('.notification-close').onclick = () => {
                    clearTimeout(autoHide)
                    this.hideNotification(notification)
                }
            }
        } catch (e) {
            // no-op
        }
    }
    
    hideNotification(notification) {
        notification.classList.add('hide')
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification)
            }
        }, 300)
    }
    
    showFirstQuestionHint() {
        // Временно отключено
        return
        const hintText = "Пиши первое, что приходит в голову ⏱<br/>Максимум 5–10 секунд на подумать.<br/>Не надо выдумывать «правильный» ответ.<br/>Лучше как чувствуешь!"
        
        try {
            // Создаем уведомление с подсказкой для первого вопроса
            const notification = document.createElement('div')
            notification.className = 'questionnaire-notification'
            notification.innerHTML = `
                <div class="notification-content">
                    <div class="notification-text">${hintText}</div>
                    <button class="notification-close" aria-label="Закрыть">✖</button>
                </div>
            `
            
            // Добавляем в контейнер анкеты
            const questionnaire = document.getElementById('questionnaire')
            if (questionnaire) {
                questionnaire.appendChild(notification)
                
                // Анимация появления
                setTimeout(() => notification.classList.add('show'), 500)
                
                // Автоскрытие через 8 секунд (унифицировано с другими уведомлениями)
                const autoHide = setTimeout(() => {
                    this.hideNotification(notification)
                }, 8000)
                
                // Закрытие по клику
                notification.querySelector('.notification-close').onclick = () => {
                    clearTimeout(autoHide)
                    this.hideNotification(notification)
                }
            }
        } catch (e) {
            // no-op
        }
    }

    updateProgress() {
        const progress = ((this.currentQuestionIndex + 1) / this.questions.length) * 100
        const progressFill = document.querySelector('.progress-fill')
        const currentQuestionEl = document.getElementById('currentQuestion')
        
        if (progressFill) progressFill.style.width = `${progress}%`
        if (currentQuestionEl) currentQuestionEl.textContent = this.currentQuestionIndex + 1
    }

    updateQuestionCounter() {
        const totalQuestionsEl = document.getElementById('totalQuestions')
        if (totalQuestionsEl) totalQuestionsEl.textContent = this.questions.length
    }

    complete() {
        // Clear saved progress
        try {
            localStorage.removeItem('answers')
            localStorage.removeItem('currentIndex')
        } catch (_) {}
        
        const event = new CustomEvent('questionnaireComplete', {
            detail: { answers: this.answers }
        })
        document.dispatchEvent(event)
    }

    dispatchAnswerChanged(isValid) {
        const event = new CustomEvent('answerChanged', {
            detail: { isValid }
        })
        document.dispatchEvent(event)
    }
}
(function() {
  const VV = () => (window.visualViewport && window.visualViewport.width) || document.documentElement.clientWidth;

  function applySmartCenter(card) {
    if (!card) return;

    // Сброс к исходному состоянию, чтобы корректно перемерить
    card.style.transform = 'translateX(0px)';
    card.style.width = 'auto';

    // Текущие размеры
    const viewportW = VV();
    const rect = card.getBoundingClientRect();
    const L = Math.max(0, Math.round(rect.left));   // левый внешний отступ от края экрана до карточки
    const currentWidth = Math.round(rect.width);

    // Цель: правый внешний отступ R_target = L / 2
    const R_target = Math.floor(L / 2);

    // Желаемая ширина, чтобы вместиться в доступную ширину:
    // W - L - R_target. Никогда не расширяем — только сужаем.
    const Wmax = Math.max(0, viewportW - L - R_target);
    const targetWidth = Math.min(currentWidth, Wmax);

    // После установки ширины «как есть» правый отступ будет таким:
    const R_after = viewportW - L - targetWidth;

    // Чтобы получить ровно R_target, нужно сдвинуть карточку вправо на:
    // s = R_after - R_target  (сдвиг вправо уменьшает правый отступ)
    const shift = Math.max(0, Math.round(R_after - R_target));

    // Применяем
    card.style.width = targetWidth + 'px';
    card.style.transform = `translateX(${shift}px)`;
  }

  // Инициализация
  function smartCenterAll() {
    document.querySelectorAll('[data-smart-center]').forEach(applySmartCenter);
  }

  // Дёргаем при загрузке, смене вопроса, ресайзе, смене ориентации
  window.addEventListener('load', smartCenterAll);
  window.addEventListener('resize', smartCenterAll);
  window.addEventListener('orientationchange', smartCenterAll);

  // Хук для вашего рендера вопросов (вызовите его там, где у вас setQuestion/renderQuestion)
  // ОТКЛЮЧЕНО: используем только CSS центрирование вместо "умного" JavaScript центрирования
  window.__applySmartCenter = () => {}; // no-op функция

  // Если контейнер/шрифты догружаются, полезно пересчитать после следующего кадра
  requestAnimationFrame(smartCenterAll);

  // === ClipGuard: увеличивает карточку вниз, если прищепка перекрывает текст ===

  function adjustClipOverlap(cardEl) {
    if (!cardEl) return;
    const textEl = cardEl.querySelector('.question-text');
    if (!textEl) return;

    const before = getComputedStyle(cardEl, '::before');

    // если прищепки нет (или не отрисована) — сброс
    if (!before || before.content === 'none') {
      textEl.style.paddingTop = '';
      return;
    }

    const cardRect = cardEl.getBoundingClientRect();
    const textRect = textEl.getBoundingClientRect();

    // размеры прищепки
    const bw = parseFloat(before.width)  || 0;
    const bh = parseFloat(before.height) || 0;

    // позиция прищепки внутри карточки (поддержим left/right)
    let top  = parseFloat(before.top);  top  = Number.isFinite(top)  ? top  : 0;
    let left = parseFloat(before.left);
    if (!Number.isFinite(left)) {
      const right = parseFloat(before.right);
      left = Number.isFinite(right) ? (cardRect.width - right - bw) : 0;
    }

    // прямоугольник прищепки в координатах окна
    const clip = {
      left:   cardRect.left + left,
      right:  cardRect.left + left + bw,
      top:    cardRect.top  + top,
      bottom: cardRect.top  + top + bh
    };

    // пересечение по осям
    const overlapX = Math.max(0, Math.min(clip.right,  textRect.right)  - Math.max(clip.left,  textRect.left));
    const overlapY = Math.max(0, Math.min(clip.bottom, textRect.bottom) - Math.max(clip.top,   textRect.top));

    // считаем «реальным» перекрытием, если по X перекрыто хотя бы треть ширины клипа
    const overlaps = overlapY > 0 && overlapX > Math.max(12, bw * 0.33);

    if (overlaps) {
      // насколько заехала прищепка сверху — столько и подвинем + маленький зазор
      const push = (clip.bottom - textRect.top) + 6; // px
      textEl.style.paddingTop = `${Math.ceil(push)}px`;
    } else {
      textEl.style.paddingTop = '';
    }
  }

  // Инициализация: при загрузке, на ресайз и при смене слайдов
  function initClipGuard(root = document) {
    let lastCheckTime = 0;
    const CHECK_THROTTLE = 100; // проверяем не чаще чем раз в 100мс
    
    const run = () => {
      const now = Date.now();
      if (now - lastCheckTime < CHECK_THROTTLE) return;
      lastCheckTime = now;
      
      root.querySelectorAll('.question-content.question-card')
          .forEach(adjustClipOverlap);
    };

    // начальный прогон
    window.requestAnimationFrame(run);

    // на ресайз/ориентацию
    window.addEventListener('resize', () => window.requestAnimationFrame(run), { passive: true });

    // только при реальных изменениях контента карточек, не при каждом прокруте
    const target = root.querySelector('#questionnaire') || root.body || root;
    const mo = new MutationObserver((mutations) => {
      // проверяем только изменения в карточках или их содержимом
      const hasRelevantChanges = mutations.some(mutation => {
        const target = mutation.target;
        return target.classList?.contains('question-content') || 
               target.classList?.contains('question-card') ||
               target.querySelector?.('.question-text') ||
               target.closest?.('.question-content.question-card');
      });
      
      if (hasRelevantChanges) {
        window.requestAnimationFrame(run);
      }
    });
    
    mo.observe(target, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    // если у тебя уже есть «событие смены слайда» — просто вызови run() после вставки новой карточки
    // example: questionnaire.onSlideChanged(() => run());
  }

  document.addEventListener('DOMContentLoaded', () => initClipGuard(document));
})();