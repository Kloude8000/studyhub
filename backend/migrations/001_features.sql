-- StudyHub feature migration for existing databases
-- Run: mysql -u root -p studyhub < migrations/001_features.sql

USE studyhub;

ALTER TABLE courses
    ADD COLUMN completion_target_minutes INT NOT NULL DEFAULT 1000
    AFTER lecturer_id;

CREATE TABLE IF NOT EXISTS announcements (
    announcement_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE
);
