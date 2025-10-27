export class ApiClient {
    constructor() {
        // В автономном режиме API не используется
        this.baseUrl = null
    }

    async getQuestions() {
        // Локальные демо-вопросы для портфолио-версии
        const questions = [
            {
                id: 1,
                text: 'What inspires you right now?',
                instruction: 'One short answer — from the heart',
                question_type: 'text',
                allow_other: false,
                options: []
            },
            {
                id: 2,
                text: 'How do you usually spend your weekends?',
                instruction: 'Choose what resonates most with you',
                question_type: 'single_choice',
                allow_other: true,
                options: [
                    { id: 1, option_text: 'Actively: sports, walks, traveling' },
                    { id: 2, option_text: 'Creatively: museums, theaters, workshops' },
                    { id: 3, option_text: 'Cozy: at home with a book or movie' },
                    { id: 4, option_text: 'Socially: meeting friends, events' }
                ]
            },
            {
                id: 3,
                text: 'What matters most to you in new acquaintances?',
                instruction: 'You can select multiple options',
                question_type: 'multiple_choice',
                allow_other: true,
                options: [
                    { id: 1, option_text: 'Shared values' },
                    { id: 2, option_text: 'Sense of humor' },
                    { id: 3, option_text: 'Similar interests' },
                    { id: 4, option_text: 'Different experiences and perspectives' }
                ]
            }
        ]
        return questions
    }

    async submitForm(data) {
        // Имитация успешной отправки без сервера
        try {
            // Сохраняем в localStorage как портфолио-демо
            const payload = {
                timestamp: Date.now(),
                data
            }
            const existing = JSON.parse(localStorage.getItem('portfolio_submissions') || '[]')
            existing.push(payload)
            localStorage.setItem('portfolio_submissions', JSON.stringify(existing))
        } catch (_) {}

        return { ok: true }
    }

    async getContinueLink() {
        // Возвращаем фиктивную ссылку
        return { bot_link: '#', bot_username: null }
    }
}