import './style.css'
import { QuestionnaireManager } from './questionnaire.js'
import { TelegramAuth } from './telegram-auth.js'
import { ApiClient } from './api-client.js'
import AnimatedBackground from './animated-background.js'
import { emojiConfetti } from './success-emoji-confetti.js'

class App {
    constructor() {
        this.questionnaireManager = new QuestionnaireManager()
        this.telegramAuth = new TelegramAuth()
        this.apiClient = new ApiClient()
        this.currentSection = 'hero'
        this.currentStage = 'start' // start, intro, questionnaire
        this.answers = this.loadAnswersFromStorage() // Load from localStorage
        this.profile = this.loadProfileFromStorage() // Load from localStorage
        
        // Debug logging
        console.log('🔍 Constructor: answers loaded:', this.answers)
        console.log('🔍 Constructor: answers length:', this.answers.length)
        console.log('🔍 Constructor: profile loaded:', this.profile)
        this.utmParams = this.extractUtmParams()

        // Animated background instance
        this.animatedBackground = null
        
        // Intro flow state
        this.introScrollContainer = null
        this.currentSlide = null
        this.nextSlide = null
        
        // Background mapping for unified switching
        this.BG_BY_STAGE = {
            start: "paper",
            intro: "paper", 
            questionnaire: "paper",
        }
        
        this.init()
    }

    /**
     * Load answers from localStorage
     */
    loadAnswersFromStorage() {
        try {
            const saved = localStorage.getItem('questionnaire_answers')
            return saved ? JSON.parse(saved) : []
        } catch (error) {
            console.error('Error loading answers from storage:', error)
            return []
        }
    }

    /**
     * Save answers to localStorage
     */
    saveAnswersToStorage(answers) {
        try {
            localStorage.setItem('questionnaire_answers', JSON.stringify(answers))
            this.answers = answers
        } catch (error) {
            console.error('Error saving answers to storage:', error)
        }
    }

    /**
     * Load profile from localStorage
     */
    loadProfileFromStorage() {
        try {
            const saved = localStorage.getItem('questionnaire_profile')
            return saved ? JSON.parse(saved) : {}
        } catch (error) {
            console.error('Error loading profile from storage:', error)
            return {}
        }
    }

    /**
     * Save profile to localStorage
     */
    saveProfileToStorage(profile) {
        try {
            localStorage.setItem('questionnaire_profile', JSON.stringify(profile))
            this.profile = profile
        } catch (error) {
            console.error('Error saving profile to storage:', error)
        }
    }

    /**
     * Clear all stored data
     */
    clearStoredData() {
        localStorage.removeItem('questionnaire_answers')
        localStorage.removeItem('questionnaire_profile')
        this.answers = []
        this.profile = {}
    }

    async init() {
        console.log('🌟 App initialization starting');
        console.log('🔍 Checking for start button:', document.getElementById('startButton'));
        
        // Check for Telegram auth success parameter FIRST, before anything else
        const telegramAuthSuccess = this.checkTelegramAuthSuccess()
        
        // If Telegram auth was successful, don't proceed with normal initialization
        if (telegramAuthSuccess) {
            console.log('🚀 Telegram auth successful, skipping normal initialization')
            this.hidePreloader()
            return
        }
        
        // Also check if questionnaire was already completed (even without hash)
        if (this.answers.length > 0) {
            console.log('📋 Questionnaire already completed, showing success screen directly')
            this.hidePreloader()
            this.skipIntroAndGoToQuestionnaire()
            return
        }
        
        this.bindEvents()
        await this.loadQuestions()
        
        this.setStage('intro')
        this.showBotStartSequence()
        console.log('🚀 App initialization: starting bot-like scroll flow');
    }

    /**
     * Check for Telegram auth success parameter in URL hash
     * @returns {boolean} true if Telegram auth was successful
     */
    checkTelegramAuthSuccess() {
        const hash = window.location.hash
        console.log('🔍 Checking URL hash:', hash)
        console.log('🔍 Current URL:', window.location.href)
        console.log('🔍 User agent:', navigator.userAgent)
        console.log('🔍 Referrer:', document.referrer)
        
        // Check for Telegram auth success with or without tgAuthResult
        if (hash.includes('#tg=ok')) {
            console.log('✅ Telegram auth success detected!')
            console.log('📊 App state before processing:', {
                answers: this.answers,
                answersLength: this.answers.length,
                profile: this.profile,
                currentStage: this.currentStage
            })
            
            // Extract tgAuthResult if present
            let telegramData = null
            const tgAuthResultMatch = hash.match(/tgAuthResult=([^&]+)/)
            if (tgAuthResultMatch) {
                try {
                    const encodedData = tgAuthResultMatch[1]
                    console.log('📱 Encoded auth data:', encodedData)
                    
                    // Decode base64 data
                    const decodedData = atob(encodedData)
                    console.log('📱 Decoded auth data:', decodedData)
                    
                    telegramData = JSON.parse(decodedData)
                    console.log('📱 Telegram auth data extracted:', telegramData)
                } catch (error) {
                    console.error('❌ Failed to parse tgAuthResult:', error)
                    console.error('❌ Error details:', error.message)
                }
            }
            
            // Clear the hash to prevent re-triggering
            window.history.replaceState(null, null, window.location.pathname)
            console.log('🧹 Hash cleared, new URL:', window.location.href)
            
            // If we have Telegram data, process it as successful auth
            if (telegramData) {
                console.log('🎉 Processing Telegram auth data and showing success screen')
                this.handleTelegramAuthSuccess(telegramData)
            } else {
                // Fallback to old behavior
                this.skipIntroAndGoToQuestionnaire()
            }
            return true
        }
        
        return false
    }

    /**
     * Handle successful Telegram authentication
     * @param {Object} telegramData - Telegram user data
     */
    async handleTelegramAuthSuccess(telegramData) {
        console.log('🎉 Starting handleTelegramAuthSuccess()')
        console.log('📱 Telegram data:', telegramData)
        console.log('📊 Current answers:', this.answers)
        console.log('👤 Current profile:', this.profile)
        
        try {
            // Create profile from Telegram data if profile is empty
            let profile = this.profile
            console.log('🔍 Checking profile completeness...')
            console.log('  - Profile exists:', !!profile)
            console.log('  - Profile has name:', !!(profile && profile.name))
            console.log('  - Profile has age:', !!(profile && profile.age))
            
            if (!profile || !profile.name || !profile.age) {
                console.log('📝 Creating profile from Telegram data')
                profile = {
                    name: telegramData.first_name || 'Пользователь',
                    surname: telegramData.last_name || '-',
                    age: 25 // Default age, можно попросить пользователя указать позже
                }
                console.log('📝 Created profile:', profile)
            } else {
                console.log('✅ Using existing profile:', profile)
            }
            
            // Submit the form data to backend
            const submitData = {
                telegram_auth: telegramData,
                answers: this.answers,
                profile: profile,
                source: this.utmParams
            }
            
            console.log('📤 Preparing to submit data to backend')
            console.log('📤 Submit data structure:', {
                telegram_auth_keys: Object.keys(submitData.telegram_auth),
                answers_count: submitData.answers.length,
                profile_keys: Object.keys(submitData.profile),
                source_keys: Object.keys(submitData.source)
            })
            
            console.log('🌐 Calling apiClient.submitForm()...')
            const result = await this.apiClient.submitForm(submitData)
            console.log('✅ Data submitted successfully')
            console.log('📥 Backend response:', result)
            
            // Show success screen
            console.log('🎯 Calling showSuccessScreen()...')
            this.showSuccessScreen()
            console.log('✅ handleTelegramAuthSuccess() completed successfully')
            
        } catch (error) {
            console.error('❌ Error in handleTelegramAuthSuccess():', error)
            console.error('❌ Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            })
            
            // Show error message but still show success screen
            console.log('⚠️ Showing error alert to user')
            alert('Данные сохранены, но произошла ошибка при отправке. Мы свяжемся с вами.')
            
            console.log('🎯 Calling showSuccessScreen() despite error...')
            this.showSuccessScreen()
            console.log('✅ handleTelegramAuthSuccess() completed with error handling')
        }
    }

    /**
     * Show success screen after successful authentication
     */
    showSuccessScreen() {
        console.log('🎉 Starting showSuccessScreen()')
        console.log('🔍 Current DOM state before showing success screen')
        console.log('  - document.body:', document.body)
        console.log('  - document.getElementById("success"):', document.getElementById('success'))
        console.log('  - document.getElementById("questionnaire"):', document.getElementById('questionnaire'))
        console.log('  - document.getElementById("telegramLogin"):', document.getElementById('telegramLogin'))
        
        // Hide all other sections
        const sections = ['questionnaire', 'profile', 'telegramLogin']
        console.log('🙈 Hiding sections:', sections)
        
        sections.forEach(sectionId => {
            console.log(`🔍 Processing section: ${sectionId}`)
            const section = document.getElementById(sectionId)
            console.log(`  - Element found:`, section)
            
            if (section) {
                console.log(`  - Current display:`, section.style.display)
                console.log(`  - Current classes:`, section.className)
                
                section.style.display = 'none'
                console.log(`✅ Hidden section: ${sectionId}`)
                console.log(`  - New display:`, section.style.display)
            } else {
                console.log(`❌ Section not found: ${sectionId}`)
            }
        })
        
        // Show success section
        console.log('🎯 Showing success section')
        const successSection = document.getElementById('success')
        console.log('🔍 Success section element:', successSection)
        
        if (successSection) {
            console.log('  - Current display:', successSection.style.display)
            console.log('  - Current classes:', successSection.className)
            console.log('  - Computed style display:', getComputedStyle(successSection).display)
            
            successSection.style.display = 'flex'
            successSection.classList.remove('hidden')
            
            console.log('✅ Success section shown')
            console.log('  - New display:', successSection.style.display)
            console.log('  - New classes:', successSection.className)
            console.log('  - New computed style display:', getComputedStyle(successSection).display)
            
            // Setup bot link
            console.log('🔗 Setting up bot link...')
            this.setupBotLink()
        } else {
            console.error('❌ Success section not found!')
            console.error('❌ Available sections in DOM:')
            const allSections = document.querySelectorAll('section')
            allSections.forEach(section => {
                console.error(`  - Section id: ${section.id}, classes: ${section.className}`)
            })
        }
        
        // Initialize animated background for success screen
        console.log('🎨 Initializing animated background for success screen')
        if (!this.animatedBackground) {
            console.log('  - Creating new AnimatedBackground instance')
            this.animatedBackground = new AnimatedBackground('animated-bg-canvas')
            console.log('✅ Animated background initialized for success screen')
        } else {
            console.log('  - AnimatedBackground already exists, reusing')
        }
        
        // Запускаем правильное конфетти только после полной загрузки страницы с задержкой в полсекунды
        if (document.readyState === 'complete') {
            // Страница уже полностью загружена
            setTimeout(() => {
                const title = document.querySelector('#success h2');
                if (title) {
                    emojiConfetti(title, { mode: 'down' }); // конфетти вниз как настоящие
                }
            }, 500)
        } else {
            // Ждем полной загрузки страницы
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const title = document.querySelector('#success h2');
                    if (title) {
                        emojiConfetti(title, { mode: 'down' }); // конфетти вниз как настоящие
                    }
                }, 500)
            })
        }
        
        console.log('🎉 showSuccessScreen() completed')
    }

    /**
     * Skip intro flow and go directly to questionnaire
     */
    skipIntroAndGoToQuestionnaire() {
        console.log('🚀 Skipping intro, going directly to questionnaire')
        console.log('📊 Current answers state:', {
            answers: this.answers,
            answersLength: this.answers.length,
            hasAnswers: this.answers.length > 0
        })
        
        // Set stage to questionnaire
        this.setStage('questionnaire')
        
        // Check if questionnaire was already completed
        if (this.answers.length > 0) {
            console.log('📋 Questionnaire already completed, showing success screen')
            console.log('📋 Answers found:', this.answers.length, 'answers')
            this.showTelegramSuccessMessage()
        } else {
            console.log('📝 Questionnaire not completed, starting questionnaire')
            console.log('📝 No answers found, starting fresh questionnaire')
            
            // Show questionnaire container
            const questionnaireContainer = document.getElementById('questionnaire')
            if (questionnaireContainer) {
                questionnaireContainer.style.display = 'block'
                console.log('📝 Questionnaire container shown')
            } else {
                console.error('❌ Questionnaire container not found!')
            }
            
            // Initialize animated background for questionnaire
            if (!this.animatedBackground) {
                this.animatedBackground = new AnimatedBackground('animated-bg-canvas')
                console.log('🎨 Animated background initialized')
            }
            
            // Start questionnaire manager
            setTimeout(() => {
                this.questionnaireManager.start()
                console.log('📝 Questionnaire manager started')
            }, 100)
        }
    }

    /**
     * Show Telegram success message
     */
    showTelegramSuccessMessage() {
        console.log('🎉 Showing Telegram success message')
        console.log('📊 Current state:', {
            answers: this.answers,
            answersLength: this.answers ? this.answers.length : 0,
            currentStage: this.currentStage
        })
        
        // Hide intro container if it exists
        const introContainer = document.getElementById('introContainer')
        if (introContainer) {
            introContainer.style.display = 'none'
            console.log('🙈 Intro container hidden')
        } else {
            console.log('ℹ️ Intro container not found (expected)')
        }
        
        // Hide questionnaire container
        const questionnaireContainer = document.getElementById('questionnaire')
        if (questionnaireContainer) {
            questionnaireContainer.style.display = 'none'
            console.log('🙈 Questionnaire container hidden')
        } else {
            console.log('ℹ️ Questionnaire container not found')
        }
        
        // Hide preloader
        const preloader = document.getElementById('preloader')
        if (preloader) {
            preloader.style.display = 'none'
            console.log('🙈 Preloader hidden')
        } else {
            console.log('ℹ️ Preloader not found')
        }
        
        // Show telegram login section (success screen)
        const telegramLoginSection = document.getElementById('telegramLogin')
        if (telegramLoginSection) {
            telegramLoginSection.style.display = 'flex'
            telegramLoginSection.classList.remove('hidden')
            console.log('✅ Telegram login section shown')
            
            // Activate background transition with delay
            setTimeout(() => {
                this.onShowTelegramLogin()
            }, 600) // Увеличено с 100ms до 600ms (0.5s дополнительной задержки)
            
            // Initialize confetti after section is shown
            this.initializeConfetti()
            
            // Check if widget is loading
            const widget = telegramLoginSection.querySelector('iframe')
            if (widget) {
                console.log('🔍 Telegram widget iframe found:', {
                    src: widget.src,
                    width: widget.width,
                    height: widget.height
                })
                
                // Add error handling for iframe
                widget.addEventListener('load', () => {
                    console.log('✅ Telegram widget iframe loaded successfully')
                })
                
                widget.addEventListener('error', (e) => {
                    console.error('❌ Telegram widget iframe failed to load:', e)
                    console.log('🔄 This is expected on localhost due to CORS policies')
                })
            } else {
                console.log('ℹ️ No iframe widget found (expected for direct redirect approach)')
            }
        } else {
            console.error('❌ Telegram login section not found!')
        }
        
        // Initialize animated background for success screen
        if (!this.animatedBackground) {
            this.animatedBackground = new AnimatedBackground('animated-bg-canvas')
            console.log('🎨 Animated background initialized for success screen')
        }
        
        // Setup Telegram login button
        this.setupTelegramLoginButton()
    }

    /**
     * Initialize confetti effect for success screen
     */
    initializeConfetti() {
        console.log('🎆 Initializing confetti...')
        
        const canvas = document.querySelector('#success-confetti')
        if (!canvas) {
            console.log('❌ Confetti canvas not found')
            return
        }
        
        console.log('🎆 Canvas found, firing confetti!')
        this.confettiBurst(canvas)
    }

    /**
     * Confetti burst function
     */
    confettiBurst(canvas, count) {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (!canvas || reduce) {
            console.log('🎆 Confetti blocked:', { canvas: !!canvas, reduce })
            return
        }

        const rect = canvas.getBoundingClientRect()
        console.log('🎆 Canvas rect:', rect)
        
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = Math.max(1, Math.floor(rect.width * dpr))
        canvas.height = Math.max(1, Math.floor(rect.height * dpr))
        console.log('🎆 Canvas size set:', { width: canvas.width, height: canvas.height, dpr })
        
        const ctx = canvas.getContext('2d')
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

        // изумрудная палитра с травяными оттенками
        const colors = [
            // Изумрудные оттенки
            '#10b981', '#34d399', '#059669', '#065f46', '#a7f3d0',
            // Травяные оттенки
            '#22c55e', '#16a34a', '#15803d', '#166534', '#84cc16',
            // Светлые зеленые
            '#4ade80', '#6ee7b7', '#5eead4', '#2dd4bf', '#14b8a6',
            // Насыщенные зеленые
            '#00d084', '#00b871', '#00a86b', '#009966', '#008a5e',
            // Изумрудно-бирюзовые
            '#0d9488', '#0f766e', '#115e59', '#134e4a', '#064e3b'
        ]

        // динамически подгоняем количество частиц под размер области
        const area = rect.width * rect.height
        const base = typeof count === 'number' ? count : 110
        const N = Math.max(60, Math.min(160, Math.round(base * (area / (700 * 500)))))

        // Находим центр заголовка относительно canvas
        const titleElement = canvas.parentElement.querySelector('.success-title')
        let centerX = rect.width / 2
        let centerY = rect.height / 2
        
        if (titleElement) {
            const titleRect = titleElement.getBoundingClientRect()
            const canvasRect = canvas.getBoundingClientRect()
            // Вычисляем позицию заголовка относительно canvas
            centerX = titleRect.left - canvasRect.left + titleRect.width / 2
            centerY = titleRect.top - canvasRect.top + titleRect.height / 2
            console.log('🎆 Title center:', { centerX, centerY, titleRect, canvasRect })
        }

        const parts = Array.from({length: N}, (_, i) => {
            const angle = (i / N) * Math.PI * 2 + (Math.random() * 0.4 - 0.2)
            const dist = 48 + Math.random() * 44
            const vx = Math.cos(angle) * (1.6 + Math.random() * 1.2)
            const vy = Math.sin(angle) * (1.6 + Math.random() * 1.2) - 2.2
            return {
                x: centerX,
                y: centerY,
                vx, vy,
                g: 0.05 + Math.random() * 0.03,
                s: 2 + Math.random() * 3.5,
                r: Math.random() * Math.PI,
                vr: (Math.random() * 0.3 - 0.15),
                c: colors[(i + Math.floor(Math.random() * colors.length)) % colors.length],
                life: 650 + Math.random() * 550
            }
        })

        console.log('🎆 Starting animation with', N, 'particles')
        
        let prev = performance.now()
        function tick(now) {
            const dt = Math.min(32, now - prev)
            prev = now
            ctx.clearRect(0, 0, rect.width, rect.height)

            let alive = 0
            for (const p of parts) {
                if ((p.life -= dt) <= 0) continue
                alive++

                // простая «физика»
                p.vy += p.g * (dt / 16)
                p.x += p.vx * (dt / 16)
                p.y += p.vy * (dt / 16)
                p.r += p.vr * (dt / 16)

                // рисуем узкие прямоугольники-конфетти
                ctx.save()
                ctx.translate(p.x, p.y)
                ctx.rotate(p.r)
                ctx.fillStyle = p.c
                ctx.fillRect(-p.s, -p.s * 0.35, p.s * 2, p.s * 0.7)
                ctx.restore()
            }

            if (alive) requestAnimationFrame(tick)
            else ctx.clearRect(0, 0, rect.width, rect.height)
        }
        requestAnimationFrame(tick)
    }

    /**
     * Setup Telegram login button with direct redirect
     */
    setupTelegramLoginButton() {
        const telegramButton = document.getElementById('telegramLoginButton')
        if (!telegramButton) {
            console.log('ℹ️ Telegram login button not found (standalone mode)')
            return
        }

        console.log('🔘 Telegram login (standalone) button found, enabling demo flow')
        telegramButton.addEventListener('click', async (e) => {
            e.preventDefault()
            console.log('🔘 Demo auth click → simulate success without backend')

            // Синтетические данные Telegram для демо
            const demoTelegramData = {
                id: 0,
                first_name: 'Demo',
                username: 'portfolio_user',
                photo_url: null,
                auth_date: Math.floor(Date.now() / 1000),
                hash: 'demo'
            }

            await this.handleTelegramAuthSuccess(demoTelegramData)
        })
    }

    /**
     * Set the current stage and update body class for background styling
     * @param {string} stage - 'start', 'intro', or 'questionnaire'
     */
    setStage(stage) {
        console.log(`🎯 setStage called with: ${stage}`)
        console.log(`🎯 Current stage before: ${this.currentStage}`)
        console.log(`🎯 Body classes before:`, document.body.className)
        
        this.currentStage = stage
        
        // Remove all stage classes - more explicit approach
        const stageClasses = ['stage-start', 'stage-intro', 'stage-questionnaire', 'is-questionnaire', 'is-intro']
        stageClasses.forEach(cls => {
            if (document.body.classList.contains(cls)) {
                document.body.classList.remove(cls)
                console.log(`🗑️ Removed class: ${cls}`)
            }
        })
        
        // Add current stage class
        document.body.classList.add(`stage-${stage}`)
        console.log(`➕ Added class: stage-${stage}`)
        
        // Add specific classes for different stages
        if (stage === 'intro') {
            // Для этапа intro добавляем клеточный фон
            document.body.classList.add('is-intro')
            console.log(`➕ Added class: is-intro`)
        } else if (stage === 'questionnaire') {
            // Для этапа questionnaire добавляем класс для анкеты
            document.body.classList.add('is-questionnaire')
            console.log(`➕ Added class: is-questionnaire`)
        }
        
        console.log(`🎨 Stage changed to: ${stage}`)
        console.log(`📋 Body classes after:`, document.body.className)
        console.log(`🎯 Current stage after:`, this.currentStage)
        
        // На всякий случай убираем инлайн-фон, если где-то проставили
        document.body.style.background = ""
        document.body.style.backgroundImage = ""
        document.body.style.backgroundColor = ""

        // Clean up smart-center transforms
        document.querySelectorAll('.question-card[data-smart-center]').forEach(el => {
            el.style.removeProperty('transform');
            el.removeAttribute('data-smart-center');
        });
    }

    // showStageIndicator function removed for production

    bindEvents() {
        // Start button - только если он существует (на странице анкеты)
        const startButton = document.getElementById('startButton')
        if (startButton) {
            console.log('🎯 Start button found, adding click listener for scroll flow');
            startButton.addEventListener('click', () => {
                console.log('🚀 Start button clicked: triggering scroll flow');
                // Как в боте: показываем приветствие, затем имя, затем возраст
                this.setStage('intro')
                this.showBotStartSequence()
            })
        } else {
            console.log('❌ Start button not found');
        }

        // Complete profile button
        document.getElementById('completeButton').addEventListener('click', () => {
            this.handleProfileComplete()
        })

        // Questionnaire events
        document.addEventListener('questionnaireComplete', async (event) => {
            this.answers = event.detail.answers
            console.log('🎉 Questionnaire completed! Answers:', this.answers.length)
            
            // Сохраняем ответы в localStorage
            this.saveAnswersToStorage(this.answers)
            
            // Показываем success screen с Telegram кнопкой
            this.showTelegramSuccessMessage()
        })

        document.addEventListener('answerChanged', (event) => {
            const nextButton = document.getElementById('nextButton')
            nextButton.disabled = !event.detail.isValid
        })

        // Telegram auth success
        document.addEventListener('telegramAuthSuccess', (event) => {
            this.handleTelegramAuth(event.detail)
        })
    }

    async loadQuestions() {
        try {
            console.log('🔄 Начинаем загрузку вопросов...')
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('API timeout')), 5000)
            )
            const questions = await Promise.race([
                this.apiClient.getQuestions(),
                timeoutPromise
            ])
            console.log('✅ Вопросы успешно загружены:', questions)
            console.log('📊 Количество вопросов для анкеты:', questions.length)
            
            this.questionnaireManager.setQuestions(questions)
            console.debug('Questions loaded:', questions)
        } catch (error) {
            console.error('❌ Ошибка загрузки вопросов:', error)
            console.log('🔄 Используем демо-вопросы как fallback')
            // Fallback to demo questions if API fails
            const demoQuestions = this.getDemoQuestions()
            console.log('📋 Демо-вопросы:', demoQuestions)
            this.questionnaireManager.setQuestions(demoQuestions)
        }

        // Hide preloader after questions are loaded
        this.hidePreloader()
    }

    hidePreloader() {
        try {
            console.log('🔄 Hiding preloader...')
            const preloader = document.getElementById('preloader')
            if (preloader && preloader.style.display !== 'none') {
                console.log('✅ Preloader found, hiding it')
                preloader.style.opacity = '0'
                setTimeout(() => {
                    preloader.style.display = 'none'
                    document.body.style.overflow = 'auto'
                    console.log('✅ Preloader hidden successfully')
                }, 1000)
            } else {
                console.log('ℹ️ Preloader already hidden or not found')
            }
        } catch (error) {
            console.error('❌ Error hiding preloader:', error)
        }
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('section').forEach(section => {
            section.classList.add('hidden')
        })
        
        // Show target section
        document.getElementById(sectionName).classList.remove('hidden')
        this.currentSection = sectionName
        
        // Scroll to top
        window.scrollTo(0, 0)
    }

    // Управляет видимостью прогресса и контейнера вопросов анкеты
    setQuestionnaireVisible(visible) {
        const header = document.querySelector('#questionnaire .questionnaire-header')
        const container = document.querySelector('#questionnaire .questionnaire-scroll-container')
        if (header) header.classList.toggle('hidden', !visible)
        if (container) container.classList.toggle('hidden', !visible)
    }

    handleProfileComplete() {
        console.log('📝 Complete profile button clicked: triggering overlay flow');
        const name = document.getElementById('profileName').value.trim()
        const age = parseInt(document.getElementById('profileAge').value)

        if (!name || !age || age < 18 || age > 100) {
            alert('Пожалуйста, заполните все поля корректно')
            return
        }

        this.profile = { name, surname: '-', age }
        console.log('🎭 Profile complete: starting overlay flow with AnimatedBackground');
        // Переходим к анкете, но сначала показываем два интро-блока и кнопку «🚀 Поехали!»
        this.setStage('questionnaire')
        this.showSection('questionnaire')
        this.showQuestionnaireIntro()
    }

    async handleTelegramAuth(telegramData) {
        try {
            const submitData = {
                telegram_auth: telegramData,
                answers: this.answers,
                profile: this.profile,
                source: this.utmParams
            }

            await this.apiClient.submitForm(submitData)
            
            // Show success and setup bot link
            this.showSection('success')
            this.setupBotLink()
            
        } catch (error) {
            console.error('Submission failed:', error)
            alert('Произошла ошибка при отправке данных. Попробуйте еще раз.')
        }
    }

    setupBotLink() {
        console.log('🔗 setupBotLink() — standalone mode')
        const botLink = document.getElementById('botLink')
        if (!botLink) return
        // В портфолио-версии не ведём на 5chairs; оставим якорь
        botLink.href = '#'
    }

    extractUtmParams() {
        const urlParams = new URLSearchParams(window.location.search)
        return {
            utm_source: urlParams.get('utm_source'),
            utm_medium: urlParams.get('utm_medium'),
            utm_campaign: urlParams.get('utm_campaign'),
            utm_content: urlParams.get('utm_content'),
            utm_term: urlParams.get('utm_term'),
            gclid: urlParams.get('gclid'),
            fbclid: urlParams.get('fbclid')
        }
    }

    showQuestionnaireIntro() {
        // Сначала показываем greeting экран
        this.showGreetingOverlay()
    }

    showGreetingOverlay() {
        // Рендерим greeting с клеточным фоном (теперь применяется через CSS)
        const section = document.getElementById('questionnaire')
        const overlay = document.createElement('div')
        overlay.className = 'intro-overlay'
        overlay.innerHTML = `
            <!-- Клеточный фон wrapper -->
            <div class="intro-background-wrapper">
                <!-- Контент страницы - поверх фона -->
                <div class="intro-content-wrapper">
                    <div class="intro-card greeting-card">
                        <div class="intro-message">
                            <h2 class="question-text">You're here — which means the introduction starts. 👋</h2>
                        </div>
                        <button id="greetingNextBtn" class="cta-button">Next</button>
                    </div>
                </div>
            </div>
        `
        document.body.appendChild(overlay)
        // До старта анкеты скрываем прогресс/вопросы
        this.setQuestionnaireVisible(false)
        const btn = document.getElementById('greetingNextBtn')
        btn.onclick = () => {
            overlay.remove()
            // Показываем следующий экран с "Что сейчас будет"
            this.showIntroOverlay()
        }
    }

    showIntroOverlay() {
        // Рендерим интро с клеточным фоном (теперь применяется через CSS)
        const section = document.getElementById('questionnaire')
        const overlay = document.createElement('div')
        overlay.className = 'intro-overlay'
        overlay.innerHTML = `
            <!-- Клеточный фон wrapper -->
            <div class="intro-background-wrapper">
                <!-- Контент страницы - поверх фона -->
                <div class="intro-content-wrapper">
                    <div class="intro-card">
                        <div class="intro-block">
                            <p>What's coming next:</p>
                            <p>— ✍️ you'll fill out a short questionnaire<br>(12 questions)</p>
                            <p>— 🧠 we'll match you with five people on your wavelength — using AI, psychology, and a bit of magic</p>
                            <div class="intro-hint" style="margin-top:12px; font-size:14px; line-height:1.4;">
                                <p><strong>This isn't a test or an interrogation.</strong></p>
                                <p>Just a way to understand who you'll have chemistry with 🧬</p>
                            </div>
                        </div>
                        <button id="introStartBtn" class="cta-button">🚀 Let's go!</button>
                    </div>
                </div>
            </div>
        `
        document.body.appendChild(overlay)
        const btn = document.getElementById('introStartBtn')
        btn.onclick = () => {
            overlay.remove()
            // Показываем прогресс и блок вопросов и только затем стартуем менеджер
            this.setQuestionnaireVisible(true)

            // Initialize animated background for questionnaire with proper timing
            console.log('🎨 Overlay flow "Поехали!" clicked: initializing AnimatedBackground');
            console.log('  - #questionnaire element:', document.getElementById('questionnaire'));
            console.log('  - #questionnaire computed style:', getComputedStyle(document.getElementById('questionnaire')));
            console.log('  - Canvas element:', document.getElementById('animated-bg-canvas'));
            console.log('  - Canvas getBoundingClientRect:', document.getElementById('animated-bg-canvas')?.getBoundingClientRect());

            if (!this.animatedBackground) {
                this.animatedBackground = new AnimatedBackground('animated-bg-canvas')
                // Ensure canvas resizes after DOM layout is complete
                requestAnimationFrame(() => {
                    this.animatedBackground.resize()
                })

                // Set animated background for questionnaire parallax synchronization
                this.questionnaireManager.setAnimatedBackground(this.animatedBackground)
            }

            // Небольшая задержка для плавности
            setTimeout(() => {
                this.questionnaireManager.start()
            }, 100)
        }
    }

    showHowToTooltip() {
        const existing = document.querySelector('.tooltip-popover')
        if (existing) existing.remove()
        const pop = document.createElement('div')
        pop.className = 'tooltip-popover'
        pop.innerHTML = `
            <button class="close" aria-label="Закрыть">✖</button>
            <div>
                <p><strong>Анкета — не тест и не допрос.</strong></p>
                <p>Просто способ понять, с какими людьми у тебя возникнет химия 🧬</p>
            </div>
        `
        document.body.appendChild(pop)
        pop.querySelector('.close').onclick = () => pop.remove()
    }

    getDemoQuestions() {
        // Fallback questions based on your bot structure
        return [
            {
                id: 1,
                text: "Что тебя сейчас вдохновляет?",
                instruction: "Один короткий ответ — от сердца",
                question_type: "text",
                allow_other: false,
                options: []
            },
            {
                id: 2,
                text: "Как ты обычно проводишь выходные?",
                instruction: "Выбери то, что ближе всего тебе",
                question_type: "single_choice",
                allow_other: true,
                options: [
                    { id: 1, option_text: "Активно: спорт, прогулки, путешествия" },
                    { id: 2, option_text: "Творчески: музеи, театры, мастер-классы" },
                    { id: 3, option_text: "Уютно: дома с книгой или фильмом" },
                    { id: 4, option_text: "Социально: встречи с друзьями, мероприятия" }
                ]
            }
            // Add more demo questions as needed
        ]
    }

    // ===== BOT-LIKE FLOW =====
    showBotStartSequence() {
        this.showSection('questionnaire')
        // Скрыть прогресс/вопросы до начала
        this.setQuestionnaireVisible(false)
        this.setupIntroFlow()
    }

    setupIntroFlow() {
        const questionnaireSection = document.getElementById('questionnaire')

        // Create scroll container for intro flow
        const { scrollContainer, currentSlide, nextSlide } = QuestionnaireManager.createScrollContainer(questionnaireSection)
        this.introScrollContainer = scrollContainer
        this.currentSlide = currentSlide
        this.nextSlide = nextSlide

        // Start with greeting and name
        this.showGreetingAndNameStep()
    }

    // Assign random colors to intro message design elements
    assignRandomColorsToMessages() {
        const messages = document.querySelectorAll('.intro-message')
        const colors = ['color-pink', 'color-blue', 'color-green', 'color-yellow', 'color-purple']

        messages.forEach(message => {
            // Remove any existing color class
            colors.forEach(color => message.classList.remove(color))
            // Add random color class
            const randomColor = colors[Math.floor(Math.random() * colors.length)]
            message.classList.add(randomColor)
        })
    }

    showGreetingAndNameStep() {
                const content = `
            <div class="question-content intro-content">
                <div class="intro-message">
                    <div class="name-input-section">
                        <h3 class="name-question-title">What's your name?</h3>
                        <div class="text-answer">
                            <input type="text" id="introName" placeholder="Your name" class="intro-input" />
                        </div>
                    </div>
                </div>
                <div class="question-navigation">
                    <div></div>
                    <button id="introNext1" class="next-button" disabled>Next</button>
                </div>
            </div>
        `

        // Устанавливаем контент
        this.currentSlide.innerHTML = content
        
        // Добавляем приветственный текст вне карточки с привязкой к карточке
        const greetingElement = document.createElement('div')
        greetingElement.className = 'greeting-outside-card anchored-to-card'
        greetingElement.innerHTML = `
            <h2 class="greeting-text">You're here — which means the introduction starts. 👋</h2>
        `
        
        // Находим карточку и добавляем к ней приветствие
        const cardElement = this.currentSlide.querySelector('.question-content.intro-content')
        if (cardElement) {
            cardElement.style.position = 'relative' // важно для absolute позиционирования
            cardElement.appendChild(greetingElement)
        }

        // Assign random colors to message elements
        this.assignRandomColorsToMessages()

        const input = document.getElementById('introName')
        const btn = document.getElementById('introNext1')

        input.addEventListener('input', () => {
            btn.disabled = !(input.value.trim().length > 0)
        })

        btn.onclick = () => {
            this.profile.name = input.value.trim()
            this.animateToAgeStep()
        }

        // Focus input after animation
        setTimeout(() => input.focus(), 100)
    }


    animateToAgeStep() {
        const content = `
            <div class="question-content intro-content">
                <div class="intro-message">
                    <h2 class="question-text">And how old are you?</h2>
                    <div class="name-input-section">
                        <div class="text-answer">
                            <input type="number" id="introAge" min="18" max="100" placeholder="How old are you?" class="intro-input" />
                        </div>
                        <div id="ageError" class="error-message hidden"></div>
                    </div>
                </div>
                <div class="question-navigation">
                    <button id="introBack" class="prev-button">Back</button>
                    <button id="introNext3" class="next-button" disabled>Next</button>
                </div>
            </div>
        `
        
        QuestionnaireManager.animateScrollTransition(
            this.currentSlide,
            this.nextSlide,
            content,
            'next',
            () => {
                // Assign random colors to message elements
                this.assignRandomColorsToMessages()

                const ageInput = document.getElementById('introAge')
                const errBox = document.getElementById('ageError')
                const backBtn = document.getElementById('introBack')
                const nextBtn = document.getElementById('introNext3')

                ageInput.addEventListener('input', () => {
                    const value = ageInput.value.trim()
                    nextBtn.disabled = !(value && parseInt(value) >= 18 && parseInt(value) <= 100)
                    errBox.classList.add('hidden')
                })

                backBtn.onclick = () => {
                    this.animateBackToGreetingAndNameStep()
                }

                nextBtn.onclick = () => {
                    try {
                        const raw = ageInput.value.trim()
                        if (!/^\d+$/.test(raw)) {
                            errBox.textContent = "Please enter a valid age."
                            errBox.classList.remove('hidden')
                            return
                        }
                        const age = parseInt(raw, 10)
                        if (age < 18 || age > 100) {
                            errBox.textContent = "Please enter an age between 18 and 100."
                            errBox.classList.remove('hidden')
                            return
                        }
                        this.profile.age = age
                        this.profile.surname = '-'
                        this.animateToQuestionnaireIntro()
                    } catch (e) {
                        errBox.textContent = "Sorry, an error occurred. Please try again."
                        errBox.classList.remove('hidden')
                    }
                }

                // Focus input after animation
                setTimeout(() => ageInput.focus(), 100)
            }
        )
    }

    animateBackToGreetingAndNameStep() {
        const content = `
            <div class="question-content intro-content">
                <div class="intro-message">
                    <h2 class="question-text">You're here — which means the introduction starts. 👋</h2>
                </div>
                <div class="answer-container">
                    <div class="text-answer">
                        <input type="text" id="introName" placeholder="What's your name?" class="intro-input" value="${this.profile.name || ''}" />
                    </div>
                </div>
                <div class="question-navigation">
                    <div></div>
                    <button id="introNext2" class="next-button" disabled>Next</button>
                </div>
            </div>
        `

        QuestionnaireManager.animateScrollTransition(
            this.currentSlide,
            this.nextSlide,
            content,
            'prev',
            () => {
                // Assign random colors to message elements
                this.assignRandomColorsToMessages()

                const input = document.getElementById('introName')
                const btn = document.getElementById('introNext2')

                input.addEventListener('input', () => {
                    btn.disabled = !(input.value.trim().length > 0)
                })

                btn.onclick = () => {
                    this.profile.name = input.value.trim()
                    this.animateToAgeStep()
                }

                // Focus input and select text
                setTimeout(() => {
                    input.focus()
                    input.select()
                }, 100)
            }
        )
    }

    animateToQuestionnaireIntro() {
        const content = `
            <div class="question-content intro-content">
                <div class="intro-message">
                    <h2 class="question-text">What's coming next:</h2>
                    <div class="intro-steps">
                        <p>— ✍️ you'll fill out a short questionnaire<br>(12 questions)</p>
                        <p>— 🧠 we'll match you with five people on your wavelength — using AI, psychology, and a bit of magic</p>
                    </div>
                    <div class="intro-hint">
                        <p><strong>This isn't a test or an interrogation.</strong></p>
                        <p>Just a way to understand who you'll have chemistry with 🧬</p>
                    </div>
                </div>
                <div class="question-navigation">
                    <button id="introBackToAge" class="prev-button">Back</button>
                    <button id="introStartQuestionnaire" class="next-button">🚀 Let's go!</button>
                </div>
            </div>
        `
        
        QuestionnaireManager.animateScrollTransition(
            this.currentSlide,
            this.nextSlide,
            content,
            'next',
            () => {
                // Assign random colors to message elements
                this.assignRandomColorsToMessages()

                document.getElementById('introBackToAge').onclick = () => {
                    this.animateToAgeStep()
                }
                
                document.getElementById('introStartQuestionnaire').onclick = () => {
                    console.log('🚀 Scroll flow "Поехали!" clicked: initializing AnimatedBackground');
                    console.log('  - #questionnaire element:', document.getElementById('questionnaire'));
                    console.log('  - #questionnaire computed style:', getComputedStyle(document.getElementById('questionnaire')));
                    console.log('  - Canvas element:', document.getElementById('animated-bg-canvas'));
                    console.log('  - Canvas getBoundingClientRect:', document.getElementById('animated-bg-canvas')?.getBoundingClientRect());

                    // Set stage to questionnaire BEFORE starting
                    this.setStage('questionnaire')

                    // Initialize animated background for questionnaire with proper timing
                    if (!this.animatedBackground) {
                        this.animatedBackground = new AnimatedBackground('animated-bg-canvas')
                        // Ensure canvas resizes after DOM layout is complete
                        requestAnimationFrame(() => {
                            this.animatedBackground.resize()
                        })
                    }

                    console.log('  - Removing intro container and starting questionnaire');
                    // Remove intro container and start questionnaire
                    this.introScrollContainer.remove()
                    this.setQuestionnaireVisible(true)
                    setTimeout(() => {
                        this.questionnaireManager.start()
                    }, 100)
                }
            }
        )
    }

    /**
     * Show/hide telegram login section with background transition
     */
    onShowTelegramLogin() {
        const s = document.getElementById('telegramLogin')
        if (s) {
            console.log('🎨 Adding is-active class to telegram-login section')
            s.classList.add('is-active')
            console.log('✅ Background transition activated')
        } else {
            console.log('❌ Telegram login section not found')
        }
    }

    onHideTelegramLogin() {
        const s = document.getElementById('telegramLogin')
        if (s) {
            s.classList.remove('is-active')
        }
    }

}

// Initialize app when DOM is loaded - только на странице анкеты
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, checking for questionnaire...')
    console.log('📋 Body classes:', document.body.className)
    console.log('🎨 Data-bg:', document.body.getAttribute('data-bg'))
    
    // Проверяем, что мы на странице анкеты
    if (document.getElementById('questionnaire')) {
        console.log('✅ Questionnaire found, initializing App...')
        new App()
    } else {
        console.log('❌ Questionnaire not found, skipping App initialization')
    }
})
