-- Получение всех ответов участников на 4 октября
SELECT 
    u.name || ' (' || COALESCE(u.username, 'без никнейма') || ')' || ' - ' || u.age || ' лет' as participant,
    q.text as question,
    ua.answer
FROM applications a
JOIN available_dates ad ON a.available_date_id = ad.id
JOIN users u ON a.user_id = u.id
LEFT JOIN user_answers ua ON u.id = ua.user_id
LEFT JOIN questions q ON ua.question_id = q.id
WHERE ad.date = '2025-10-04'
AND a.status = 'pending'
ORDER BY a.id, ua.question_id NULLS LAST;


