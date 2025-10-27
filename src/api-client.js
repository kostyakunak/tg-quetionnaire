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
                text: 'Что тебя сейчас вдохновляет?',
                instruction: 'Один короткий ответ — от сердца',
                question_type: 'text',
                allow_other: false,
                options: []
            },
            {
                id: 2,
                text: 'Как ты обычно проводишь выходные?',
                instruction: 'Выбери то, что ближе всего тебе',
                question_type: 'single_choice',
                allow_other: true,
                options: [
                    { id: 1, option_text: 'Активно: спорт, прогулки, путешествия' },
                    { id: 2, option_text: 'Творчески: музеи, театры, мастер-классы' },
                    { id: 3, option_text: 'Уютно: дома с книгой или фильмом' },
                    { id: 4, option_text: 'Социально: встречи с друзьями, мероприятия' }
                ]
            },
            {
                id: 3,
                text: 'Что тебе важнее в новых знакомствах?',
                instruction: 'Можно выбрать несколько вариантов',
                question_type: 'multiple_choice',
                allow_other: true,
                options: [
                    { id: 1, option_text: 'Общие ценности' },
                    { id: 2, option_text: 'Чувство юмора' },
                    { id: 3, option_text: 'Схожие интересы' },
                    { id: 4, option_text: 'Разный опыт и взгляды' }
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