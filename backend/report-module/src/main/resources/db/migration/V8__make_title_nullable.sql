-- V2 created reports.title as NOT NULL but the Java Report entity has no title field.
-- Every INSERT omits the column, causing a not-null constraint violation.
-- Make it nullable so inserts succeed without changing the entity model.
ALTER TABLE reports ALTER COLUMN title DROP NOT NULL;
