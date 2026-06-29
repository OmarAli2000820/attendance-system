const Database = require('better-sqlite3');
const db = new Database('attendance.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id        INTEGER PRIMARY KEY,
    name      TEXT NOT NULL,
    phone     TEXT,
    qr_token  TEXT UNIQUE NOT NULL
  );

CREATE TABLE IF NOT EXISTS supervisors (
  id         INTEGER PRIMARY KEY,
  username   TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  name       TEXT NOT NULL
);

  CREATE TABLE IF NOT EXISTS sessions (
    id         INTEGER PRIMARY KEY,
    title      TEXT NOT NULL,
    date       DATE NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at   DATETIME
  );

  CREATE TABLE IF NOT EXISTS enrollments (
    student_id INTEGER REFERENCES students(id),
    session_id INTEGER REFERENCES sessions(id),
    PRIMARY KEY (student_id, session_id)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    session_id  INTEGER REFERENCES sessions(id),
  student_id  INTEGER REFERENCES students(id),
  is_present  INTEGER DEFAULT 0,
  scanned_at  DATETIME,
  scanned_by  INTEGER REFERENCES supervisors(id),
  PRIMARY KEY (session_id, student_id)
  );
`);

module.exports = db;