-- Получение активных заявок на 4 октября 2025
SELECT 
    u.username,
    u.name,
    u.surname,
    u.age,
    a.id as application_id,
    a.user_id
FROM applications a 
JOIN available_dates ad ON a.available_date_id = ad.id 
JOIN users u ON a.user_id = u.id 
WHERE ad.date = '2025-10-04' 
AND a.status = 'pending' 
ORDER BY a.id;


