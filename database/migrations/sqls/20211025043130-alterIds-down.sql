/* Replace with your SQL commands */
ALTER TABLE survey ALTER COLUMN id DROP DEFAULT;
ALTER TABLE survey_question ALTER COLUMN id DROP DEFAULT;
ALTER TABLE region ALTER COLUMN id DROP DEFAULT;
ALTER TABLE author ALTER COLUMN id DROP DEFAULT;
ALTER TABLE message ALTER COLUMN id DROP DEFAULT;
ALTER TABLE message_request ALTER COLUMN id DROP DEFAULT ;
ALTER TABLE message_delivery ALTER COLUMN id DROP DEFAULT;