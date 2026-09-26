/** Public project contact, configured per environment so the repo carries no contact details (see .env.example). */
export const CONTACT = {
  email: process.env.NEXT_PUBLIC_IMPRINT_EMAIL,
  repoUrl: process.env.NEXT_PUBLIC_IMPRINT_GITHUB_URL,
  issuesUrl: process.env.NEXT_PUBLIC_IMPRINT_ISSUES_URL,
};
