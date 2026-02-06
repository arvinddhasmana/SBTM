SELECT 'Users' as E, COUNT(*) as C FROM users WHERE email LIKE '%@sbtm.demo'
UNION ALL SELECT 'Students', COUNT(*) FROM students_reference WHERE id LIKE 'STUDENT-%'
UNION ALL SELECT 'Vehicles', COUNT(*) FROM vehicles_reference WHERE id LIKE 'BUS-%'
UNION ALL SELECT 'Routes', COUNT(*) FROM routes_reference WHERE id LIKE 'ROUTE-%'
UNION ALL SELECT 'Stops', COUNT(*) FROM route_stops_reference WHERE id LIKE 'STOP-%';
