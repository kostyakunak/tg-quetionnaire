-- Получение ответов всех активных участников
SELECT 
    CASE 
        WHEN u.username IS NOT NULL AND u.username != '' THEN u.name || ' (' || u.username || ') - ' || u.age || ' лет'
        ELSE u.name || ' - ' || u.age || ' лет'
    END as participant,
    'Вопрос ' || ua.question_id || ': ' || q.text as question,
    'Ответ: ' || ua.answer as answer
FROM applications a
JOIN available_dates ad ON a.available_date_id = ad.id
JOIN users u ON a.user_id = u.id
JOIN user_answers ua ON u.id = ua.user_id
JOIN questions q ON ua.question_id = q.id
WHERE ad.date = '2025-10-04'
AND a.status = 'pending'
ORDER BY a.id, ua.question_id;


