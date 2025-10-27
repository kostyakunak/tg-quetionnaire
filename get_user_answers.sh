#!/bin/bash

# Получение ответов для каждого пользователя
PGPASSWORD=PrzTJRLGOIkonYgOhDwsIGzrQMaQZBEQ psql -h switchback.proxy.rlwy.net -U postgres -p 17906 -d railway -c "
SELECT u.name, q.text, ua.answer 
FROM users u, user_answers ua, questions q 
WHERE u.id = ua.user_id AND ua.question_id = q.id AND u.username = 'kateprapushniak' 
ORDER BY ua.question_id;
"

echo "=== Катерина (kateprapushniak) ==="

PGPASSWORD=PrzTJRLGOIkonYgOhDwsIGzrQMaQZBEQ psql -h switchback.proxy.rlwy.net -U postgres -p 17906 -d railway -c "
SELECT u.name, q.text, ua.answer 
FROM users u, user_answers ua, questions q 
WHERE u.id = ua.user_id AND ua.question_id = q.id AND u.username = 'es3maile' 
ORDER BY ua.question_id;
"

echo "=== Лёша (es3maile) ==="

PGPASSWORD=PrzTJRLGOIkonYgOhDwsIGzrQMaQZBEQ psql -h switchback.proxy.rlwy.net -U postgres -p 17906 -d railway -c "
SELECT u.name, q.text, ua.answer 
FROM users u, user_answers ua, questions q 
WHERE u.id = ua.user_id AND ua.question_id = q.id AND u.username = 'kandkofficial' 
ORDER BY ua.question_id;
"

echo "=== Ксения (kandkofficial) ==="


