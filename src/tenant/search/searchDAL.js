const db = require('../../common/db/index');

/* This function takes a searchQuery parameter, which represents the text to be searched.
The function uses full-text search capabilities provided by PostgreSQL's tsvector, to_tsvector,
tsquery, and ts_rank functions. searchQuery is a string that uses '|' as a separator
instead of spaces. | is a boolean operator OR that checks if either of the words mentioned
in the search query exist in our to_tsvector document.

The function returns an array of search results, where each
result object contains the following properties:
type: The type of the resource (contact, note, email, meeting, or task).
resource_id: The unique identifier of the resource.
result_title: The title or name of the resource.
result_desc: A description or additional details about the resource.
orderpriority: A priority value for ordering the results.
rank: The rank of the search result based on relevance (higher rank is more relevant).
similarity: The similarity score between the search query and the resource's content
(higher similarity indicates a closer match). */

const search = async (searchQuery) => {
  const text = `
  (
    SELECT
        'contact' AS type,
        contact.contact_id::text AS resource_id,
        contact.first_name || ' ' || contact.last_name AS result_title,
        contact.personal_email || ' ' || COALESCE(contact.work_email, '') AS result_desc,
        1 AS orderpriority,
        rank,
        similarity
    FROM
        contact,
        to_tsvector(contact.first_name || ' ' || contact.last_name) AS document,
        to_tsquery($1) AS query,
        NULLIF(ts_rank(document, query), 0) AS rank,
        SIMILARITY($1, contact.first_name || contact.last_name || contact.personal_email || contact.work_email) similarity
    WHERE
        document @@ query
        OR similarity > 0
    ORDER BY
      rank DESC NULLS LAST,
        similarity DESC NULLS LAST
    LIMIT 3
)
UNION ALL
(
    SELECT
        'note' AS type,
        note.note_id::text AS resource_id,
        contact.first_name || ' ' || contact.last_name AS result_title,
        note.note_description AS result_desc,
        2 AS orderpriority,
        rank,
        similarity
    FROM
        note JOIN contact ON note.contact_id = contact.contact_id,
        to_tsvector(note.note_description) AS document,
        to_tsquery($1) AS query,
        NULLIF(ts_rank(document, query), 0) AS rank,
        SIMILARITY($1, note.note_description) similarity
    WHERE
        document @@ query
        OR similarity > 0
)
UNION ALL
(
    SELECT
        'email' AS type,
        email.email_id::text AS resource_id,
        email.email_creator_user_id || ' ' || email.email_create_timestamp AS result_title,
        email.email_description AS result_desc,
        2 AS orderpriority,
        rank,
        similarity
    FROM
        email,
        to_tsvector(email.email_description) AS document,
        to_tsquery($1) AS query,
        NULLIF(ts_rank(document, query), 0) AS rank,
        SIMILARITY($1, email.email_description) similarity
    WHERE
        document @@ query
        OR similarity > 0
)
UNION ALL
(
  SELECT
        'meeting' AS type,
        meeting.meeting_id::text AS resource_id,
        contact.first_name || ' ' || contact.last_name AS result_title,
        meeting.meeting_description AS result_desc,
        2 AS orderpriority,
        rank,
        similarity
    FROM
        meeting JOIN contact ON meeting.contact_id = contact.contact_id,
        to_tsvector(meeting.meeting_description) AS document,
        to_tsquery($1) AS query,
        NULLIF(ts_rank(document, query), 0) AS rank,
        SIMILARITY($1, meeting.meeting_description) similarity
    WHERE
        document @@ query
        OR similarity > 0
)
UNION ALL
(
  SELECT
        'task' AS type,
        task_id::text AS resource_id,
        task_name AS result_title,
        task_description AS result_desc,
        2 AS orderpriority,
        rank,
        similarity
    FROM
        task,
        to_tsvector(task.task_name || ' ' || task.task_description) AS document,
        to_tsquery($1) AS query,
        NULLIF(ts_rank(document, query), 0) AS rank,
        SIMILARITY($1, task.task_name || task.task_description) similarity
    WHERE
        document @@ query
        OR similarity > 0
)

ORDER BY
    orderpriority,
    rank DESC NULLS LAST,
    similarity DESC NULLS LAST
LIMIT 10;
  `;
  const { rows } = await db.query(text, [searchQuery]);
  return rows[0];
};

module.exports = {
  search,
};
