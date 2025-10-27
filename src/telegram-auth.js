export class TelegramAuth {
    constructor() {
        this.botUsername = 'fivechairs_bot'
        this.authUrl = 'https://meta-questionnaire-production.up.railway.app/api/telegram/login'
    }

    async init() {
        // Виджет теперь статический в HTML, только настраиваем callback
        this.setupTelegramCallback()
    }

    setupTelegramCallback() {
        // Create global callback function for static widget
        window.onTelegramAuth = (user) => {
            this.handleTelegramAuth(user)
        }
    }

    handleTelegramAuth(user) {
        console.log('🔐 Получены данные от Telegram:', user)
        
        // Validate the auth data
        if (this.validateTelegramAuth(user)) {
            console.log('✅ Валидация Telegram прошла успешно')
            const event = new CustomEvent('telegramAuthSuccess', {
                detail: user
            })
            document.dispatchEvent(event)
        } else {
            console.error('❌ Ошибка валидации Telegram данных:', user)
            alert('Ошибка авторизации Telegram. Попробуйте еще раз.')
        }
    }

    validateTelegramAuth(authData) {
        // Basic client-side validation
        // Real validation should be done on the server
        const requiredFields = ['id', 'first_name', 'auth_date', 'hash']
        const optionalFields = ['last_name', 'username', 'photo_url']
        
        console.log('🔍 Проверка полей Telegram:', {
            required: requiredFields.map(field => ({ field, present: authData[field] !== undefined, value: authData[field] })),
            optional: optionalFields.map(field => ({ field, present: authData[field] !== undefined, value: authData[field] }))
        })
        
        const isValid = requiredFields.every(field => authData[field] !== undefined)
        console.log(`🔍 Валидация клиента: ${isValid ? '✅' : '❌'}`)
        
        return isValid
    }
}

// Test mode helper removed for production