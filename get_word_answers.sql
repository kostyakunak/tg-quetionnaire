-- Получение словесных ответов для всех участников
WITH option_mappings AS (
    SELECT 
        qo.id as option_id,
        qo.question_id,
        q.text as question_text,
        qo.option_text
    FROM questions q
    LEFT JOIN question_options qo ON q.id = qo.question_id
    WHERE q.active = true
),
participants AS (
    SELECT u.id as user_id, u.name, u.username, u.age
    FROM applications a 
    JOIN available_dates ad ON a.available_date_id = ad.id 
    JOIN users u ON a.user_id = u.id 
    WHERE ad.date = '2025-10-04' AND a.status = 'pending'
)
SELECT 
    p.name || ' (' || COALESCE(p.username, 'без никнейма') || ')' || ' - ' || p.age || ' лет' as participant,
    ua.question_id,
    CASE 
        WHEN ua.answer ~ '^[0-9,]+$' THEN 
            -- Если ответ содержит только цифры и запятые, это multiple choice
            STRING_AGG(om.option_text, '; ')
        ELSE 
            -- Иначе это текстовый ответ
            ua.answer
    END as word_answer,
    ua.answer as original_answer
FROM participants p
JOIN user_answers ua ON p.user_id = ua.user_id
LEFT JOIN option_mappings om ON ua.question_id = om.question_id 
    AND (
        CASE 
            WHEN om.question_id IN (1,2,3,4,5) THEN 
                ua.answer LIKE '%' || om.option_id::text || '%'
            ELSE 
                false
        END
    )
GROUP BY p.name, p.username, p.age, ua.question_id, ua.answer
ORDER BY p.name, ua.question_id;


