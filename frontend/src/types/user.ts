/** Shape returned by GET /api/v1/auth/me (PRD section 6). */
export type SessionUser = {
  id: number;
  name: string;
  email: string;
  seller: { id: number; store_name: string } | null;
};
