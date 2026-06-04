-- StudyHub seed data
-- Run after schema.sql: mysql -u root -p studyhub < seed.sql
--
-- All seed accounts use password: password123

USE studyhub;

INSERT INTO users (full_name, email, password_hash, role) VALUES
    ('Admin User', 'admin@studyhub.test', '$2b$10$zhVFn857FHcE3fZPgmZev.bEgQ2zunZnBYosFGOMGjnXpLWGYeEDO', 'admin'),
    ('Dr. Jane Lecturer', 'lecturer@studyhub.test', '$2b$10$zhVFn857FHcE3fZPgmZev.bEgQ2zunZnBYosFGOMGjnXpLWGYeEDO', 'lecturer'),
    ('John Student', 'student@studyhub.test', '$2b$10$zhVFn857FHcE3fZPgmZev.bEgQ2zunZnBYosFGOMGjnXpLWGYeEDO', 'student');

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

INSERT INTO learning_logs (student_id, course_id, topic, study_duration, notes, log_date)
SELECT
    s.user_id,
    c.course_id,
    'Variables and Data Types',
    45,
    'Reviewed let, const, and primitive types.',
    CURDATE()
FROM users s
CROSS JOIN courses c
WHERE s.email = 'student@studyhub.test'
  AND c.course_code = 'CS101';

INSERT INTO progress (student_id, course_id, total_study_time, completion_percentage)
SELECT
    s.user_id,
    c.course_id,
    45,
    4.50
FROM users s
CROSS JOIN courses c
WHERE s.email = 'student@studyhub.test'
  AND c.course_code = 'CS101';
