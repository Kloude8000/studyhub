-- StudyHub progress-system migration for an existing database
-- In MySQL Workbench: select your StudyHub schema (e.g. studyhub or studyhub_db), then run this script.
-- Back up first. Safe to skip CREATE TABLE statements if those tables already exist.
-- After this script, existing free-text logs are converted into course topics.

CREATE TABLE IF NOT EXISTS course_topics (
    topic_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resource_access (
    access_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    resource_id INT NOT NULL,
    view_count INT NOT NULL DEFAULT 0,
    first_viewed_at TIMESTAMP NULL,
    last_viewed_at TIMESTAMP NULL,
    downloaded_at TIMESTAMP NULL,
    UNIQUE KEY unique_resource_access (student_id, resource_id),
    FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (resource_id) REFERENCES resources(resource_id) ON DELETE CASCADE
);

-- Add new progress columns if they are missing
SET @sql := (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE progress ADD COLUMN completed_at TIMESTAMP NULL AFTER completion_percentage',
        'SELECT 1'
    )
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'progress'
      AND COLUMN_NAME = 'completed_at'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE progress ADD COLUMN last_activity_at TIMESTAMP NULL AFTER completed_at',
        'SELECT 1'
    )
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'progress'
      AND COLUMN_NAME = 'last_activity_at'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Convert learning_logs.topic (varchar) to topic_id
SET @has_topic_text := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'learning_logs'
      AND COLUMN_NAME = 'topic'
);

SET @has_topic_id := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'learning_logs'
      AND COLUMN_NAME = 'topic_id'
);

SET @sql := IF(
    @has_topic_id = 0,
    'ALTER TABLE learning_logs ADD COLUMN topic_id INT NULL AFTER course_id',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create topics from distinct existing log titles (and leave room for lecturer-added topics)
INSERT INTO course_topics (course_id, title, sort_order)
SELECT l.course_id, l.topic, MIN(l.log_id)
FROM learning_logs l
WHERE l.topic IS NOT NULL
  AND l.topic <> ''
  AND NOT EXISTS (
      SELECT 1 FROM course_topics t
      WHERE t.course_id = l.course_id AND t.title = l.topic
  )
GROUP BY l.course_id, l.topic;

UPDATE learning_logs l
JOIN course_topics t
  ON t.course_id = l.course_id
 AND t.title = l.topic
SET l.topic_id = t.topic_id
WHERE l.topic_id IS NULL
  AND l.topic IS NOT NULL;

-- Drop leftover free-text topic column and enforce FK + uniqueness
SET @sql := IF(
    @has_topic_text > 0,
    'ALTER TABLE learning_logs DROP COLUMN topic',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- topic_id should now be required
ALTER TABLE learning_logs
    MODIFY topic_id INT NOT NULL;

SET @fk_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'learning_logs'
      AND CONSTRAINT_NAME = 'fk_logs_topic'
);
SET @sql := IF(
    @fk_exists = 0,
    'ALTER TABLE learning_logs ADD CONSTRAINT fk_logs_topic FOREIGN KEY (topic_id) REFERENCES course_topics(topic_id) ON DELETE CASCADE',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @uq_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'learning_logs'
      AND INDEX_NAME = 'unique_student_topic'
);
SET @sql := IF(
    @uq_exists = 0,
    'ALTER TABLE learning_logs ADD UNIQUE KEY unique_student_topic (student_id, topic_id)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Recalculate stored progress from topic logs
UPDATE progress p
SET
    p.total_study_time = (
        SELECT COALESCE(SUM(l.study_duration), 0)
        FROM learning_logs l
        WHERE l.student_id = p.student_id AND l.course_id = p.course_id
    ),
    p.completion_percentage = (
        SELECT CASE
            WHEN (SELECT COUNT(*) FROM course_topics t WHERE t.course_id = p.course_id) = 0 THEN 0
            ELSE LEAST(
                100,
                ROUND(
                    (
                        (SELECT COUNT(*) FROM learning_logs l WHERE l.student_id = p.student_id AND l.course_id = p.course_id)
                        / (SELECT COUNT(*) FROM course_topics t WHERE t.course_id = p.course_id)
                    ) * 100,
                    2
                )
            )
        END
    ),
    p.completed_at = (
        SELECT CASE
            WHEN (SELECT COUNT(*) FROM course_topics t WHERE t.course_id = p.course_id) > 0
             AND (SELECT COUNT(*) FROM learning_logs l WHERE l.student_id = p.student_id AND l.course_id = p.course_id)
                 >= (SELECT COUNT(*) FROM course_topics t WHERE t.course_id = p.course_id)
            THEN COALESCE(p.completed_at, CURRENT_TIMESTAMP)
            ELSE NULL
        END
    ),
    p.last_activity_at = COALESCE(
        p.last_activity_at,
        (
            SELECT MAX(l.created_at)
            FROM learning_logs l
            WHERE l.student_id = p.student_id AND l.course_id = p.course_id
        )
    );
