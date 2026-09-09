export type Role = "admin" | "teacher" | "student";
export type QuestionType = "single" | "multiple" | "boolean" | "short";
export type TestStatus = "draft" | "published";
export type AttemptStatus = "in_progress" | "submitted" | "expired";

export interface School {
  id: string;
  name: string;
  city: string;
  region: string;
}

export interface User {
  id: string;
  email: string | null;
  username: string | null;
  full_name: string;
  role: Role;
  is_active: boolean;
  school: School | null;
}

export interface SchoolPublic {
  name: string;
  city: string;
}

export interface SchoolAdmin {
  id: string;
  name: string;
  city: string;
  region: string;
  login_prefix: string;
  signup_code: string;
  teachers_count: number;
  students_count: number;
  created_at: string;
  archived_at: string | null;
}

export type SchoolScope = "active" | "archived" | "all";

export interface AuditEvent {
  id: string;
  actor_label: string;
  action: string;
  action_label: string;
  target_type: string;
  target_label: string;
  summary: string;
  created_at: string;
}

export interface AuditList {
  items: AuditEvent[];
  total: number;
}

export interface WeeklyPoint {
  week_start: string;
  new_schools: number;
  new_teachers: number;
  attempts: number;
}

export interface TopSchool {
  school_id: string;
  name: string;
  city: string;
  attempts: number;
  avg_percent: number | null;
}

export interface DormantSchool {
  school_id: string;
  name: string;
  city: string;
  created_at: string;
  last_activity: string | null;
}

export interface Analytics {
  weekly: WeeklyPoint[];
  top_schools: TopSchool[];
  dormant_schools: DormantSchool[];
  totals: {
    attempts_total: number;
    tests_conducted: number;
    avg_percent: number | null;
  };
}

export interface TeacherAdmin {
  id: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  school_id: string | null;
  school_name: string | null;
  created_at: string;
}

export interface TeacherCredentials {
  id: string;
  full_name: string;
  email: string | null;
  password: string;
}

export interface AdminUser {
  id: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Stats {
  schools: number;
  teachers: number;
  students: number;
  classes: number;
}

export interface StudentCredentials {
  id: string;
  full_name: string;
  username: string;
  password: string;
}

export interface StudentOption {
  id: string;
  full_name: string;
  username: string | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ClassOut {
  id: string;
  display_name: string;
  name: string | null;
  letter: string | null;
  grade: number | null;
  graduation_year: number | null;
  archived: boolean;
  created_at: string;
  members_count: number;
  created_by_name: string;
  is_mine: boolean;
}

export interface ClassMember {
  id: string;
  student_id: string;
  full_name: string;
  username: string | null;
  joined_at: string;
}

export interface StudentClass {
  id: string;
  display_name: string;
  teacher_name: string;
  joined_at: string;
}

export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  position: number;
  type: QuestionType;
  text: string;
  image_url: string | null;
  options: Option[];
  correct: string[];
  points: number;
}

export interface QuestionDraft {
  type: QuestionType;
  text: string;
  image_url: string | null;
  options: Option[];
  correct: string[];
  points: number;
}

export interface TestOut {
  id: string;
  title: string;
  description: string;
  status: TestStatus;
  grade_thresholds: Record<string, number>;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  time_limit_min: number | null;
  subject: string | null;
  grade: number | null;
  topic: string | null;
  template_ref: string | null;
  created_at: string;
  updated_at: string;
  questions_count: number;
}

// ── Каталог-справочник ───────────────────────────────────
export interface CatalogTopic {
  key: string;
  name: string;
  hint?: string;
}
export interface CatalogGrade {
  grade: number;
  topics: CatalogTopic[];
}
export interface CatalogSubject {
  key: string;
  name: string;
  grades: CatalogGrade[];
}
export interface Curriculum {
  subjects: CatalogSubject[];
}

export interface ExamTask {
  key: string;
  no: number;
  title: string;
  checks?: string;
  question_type: QuestionType;
  count: number;
  points: number;
  difficulty?: string;
  manual?: boolean;
}
export interface ExamSubject {
  key: string;
  name: string;
  grade?: number;
  tasks: ExamTask[];
}
export interface Exam {
  key: string;
  name: string;
  grade?: number;
  subjects: ExamSubject[];
}
export interface ExamCatalog {
  exams: Exam[];
}

export interface AiSeed {
  prompt: string;
  count: number;
  question_type: QuestionType | null;
}

export interface TestDetail extends TestOut {
  questions: Question[];
}

export interface AssignmentOut {
  id: string;
  test_id: string;
  class_id: string;
  test_title: string;
  class_name: string;
  opens_at: string | null;
  closes_at: string | null;
  max_attempts: number | null;
  created_at: string;
}

export interface StudentAssignment {
  id: string;
  test_title: string;
  test_description: string;
  class_name: string;
  questions_count: number;
  time_limit_min: number | null;
  opens_at: string | null;
  closes_at: string | null;
  max_attempts: number | null;
  attempts_used: number;
  attempts_left: number | null;
  best_percent: number | null;
  is_open: boolean;
  active_attempt_id: string | null;
}

export interface StudentQuestion {
  id: string;
  position: number;
  type: QuestionType;
  text: string;
  image_url: string | null;
  options: Option[];
  points: number;
}

export interface AttemptState {
  id: string;
  assignment_id: string;
  attempt_no: number;
  status: AttemptStatus;
  started_at: string;
  deadline_at: string | null;
  test_title: string;
  time_limit_min: number | null;
  questions: StudentQuestion[];
  answers: Record<string, string[]>;
}

export interface AttemptResult {
  id: string;
  status: AttemptStatus;
  percent: number;
  submitted_at: string | null;
}

export interface StudentResultRow {
  student_id: string;
  student_name: string;
  student_login: string;
  attempts_used: number;
  best_attempt_id: string | null;
  best_score: number | null;
  max_score: number | null;
  best_percent: number | null;
  grade: string | null;
  last_activity: string | null;
  status: AttemptStatus | null;
}

export interface AssignmentResults {
  assignment_id: string;
  test_title: string;
  class_name: string;
  total_students: number;
  submitted_count: number;
  average_percent: number | null;
  rows: StudentResultRow[];
}

export interface AnswerReview {
  question: Question;
  selected: string[];
  is_correct: boolean;
}

export interface AttemptReview {
  id: string;
  student_name: string;
  student_login: string;
  attempt_no: number;
  status: AttemptStatus;
  score: number;
  max_score: number;
  percent: number;
  grade: string;
  started_at: string;
  submitted_at: string | null;
  answers: AnswerReview[];
}
