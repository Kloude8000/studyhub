-- StudyHub seed data
-- Run after schema.sql: mysql -u root -p studyhub < seed.sql
--
-- All seed accounts use password: password123

USE studyhub;

INSERT INTO users (full_name, email, student_id, password_hash, role) VALUES
    ('Admin User', 'admin@studyhub.test', NULL, '$2b$10$zhVFn857FHcE3fZPgmZev.bEgQ2zunZnBYosFGOMGjnXpLWGYeEDO', 'admin'),
    ('Dr. Jane Lecturer', 'lecturer@studyhub.test', NULL, '$2b$10$zhVFn857FHcE3fZPgmZev.bEgQ2zunZnBYosFGOMGjnXpLWGYeEDO', 'lecturer'),
    ('John Student', 'student@studyhub.test', 'S12345', '$2b$10$zhVFn857FHcE3fZPgmZev.bEgQ2zunZnBYosFGOMGjnXpLWGYeEDO', 'student');

INSERT INTO courses (course_code, course_title, description, lecturer_id) VALUES
    (
        'CS101',
        'Introduction to Programming',
        'Fundamentals of programming with JavaScript.',
        (SELECT user_id FROM users WHERE email = 'lecturer@studyhub.test')
    ),
    (
        'CS201',
        'Database Systems',
        'Relational databases, SQL, and data modeling.',
        (SELECT user_id FROM users WHERE email = 'lecturer@studyhub.test')
    );

INSERT INTO enrollments (student_id, course_id)
SELECT
    s.user_id,
    c.course_id
FROM users s
CROSS JOIN courses c
WHERE s.email = 'student@studyhub.test'
  AND c.course_code = 'CS101';

INSERT INTO course_topics (course_id, title, sort_order)
SELECT c.course_id, 'Variables and Data Types', 1
FROM courses c
WHERE c.course_code = 'CS101';

INSERT INTO course_topics (course_id, title, sort_order)
SELECT c.course_id, 'Control Flow', 2
FROM courses c
WHERE c.course_code = 'CS101';

INSERT INTO course_topics (course_id, title, sort_order)
SELECT c.course_id, 'The Relational Model', 1
FROM courses c
WHERE c.course_code = 'CS201';

INSERT INTO learning_logs (student_id, course_id, topic_id, study_duration, notes, log_date)
SELECT
    s.user_id,
    c.course_id,
    t.topic_id,
    45,
    'Reviewed let, const, and primitive types.',
    CURDATE()
FROM users s
CROSS JOIN courses c
JOIN course_topics t
  ON t.course_id = c.course_id
 AND t.title = 'Variables and Data Types'
WHERE s.email = 'student@studyhub.test'
  AND c.course_code = 'CS101';

INSERT INTO progress (
    student_id,
    course_id,
    total_study_time,
    completion_percentage,
    completed_at,
    last_activity_at
)
SELECT
    s.user_id,
    c.course_id,
    45,
    50.00,
    NULL,
    CURRENT_TIMESTAMP
FROM users s
CROSS JOIN courses c
WHERE s.email = 'student@studyhub.test'
  AND c.course_code = 'CS101';

INSERT INTO announcements (author_id, scope, course_id, title, body)
SELECT
    u.user_id,
    'platform',
    NULL,
    'Welcome to StudyHub',
    'Use the bell icon to see enrolments, new resources, course completion, and announcements.'
FROM users u
WHERE u.email = 'admin@studyhub.test';

INSERT INTO announcements (author_id, scope, course_id, title, body)
SELECT
    u.user_id,
    'course',
    c.course_id,
    'Start with Variables',
    'Please complete the Variables and Data Types topic before the next class.'
FROM users u
CROSS JOIN courses c
WHERE u.email = 'lecturer@studyhub.test'
  AND c.course_code = 'CS101';

INSERT INTO notifications (user_id, type, title, body, link_url, is_read)
SELECT
    s.user_id,
    'announcement',
    'Platform announcement',
    'Welcome to StudyHub',
    'announcement:platform',
    0
FROM users s
WHERE s.email = 'student@studyhub.test';

INSERT INTO notifications (user_id, type, title, body, link_url, is_read)
SELECT
    l.user_id,
    'enrollment',
    'New enrolment',
    'John Student enrolled in CS101 — Introduction to Programming.',
    CONCAT('course:', c.course_id),
    0
FROM users l
CROSS JOIN courses c
WHERE l.email = 'lecturer@studyhub.test'
  AND c.course_code = 'CS101';
