-- Получение ответов всех участников на 4 октября
WITH active_applications AS (
    SELECT u.id as user_id, u.name, u.username, u.age, a.id as app_id
    FROM applications a 
    JOIN available_dates ad ON a.available_date_id = ad.id 
    JOIN users u ON a.user_id = u.id 
    WHERE ad.date = '2025-10-04' 
    AND a.status = 'pending' 
    ORDER BY a.id
)
SELECT 
    aa.name,
    aa.username,
    aa.age,
    q.text as question,
    ua.answer
FROM active_applications aa
LEFT JOIN user_answers ua ON aa.user_id = ua.user_id
LEFT JOIN questions q ON ua.question_id = q.id
ORDER BY aa.app_id, ua.question_id;


