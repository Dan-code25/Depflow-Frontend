export interface Subject {
  id: string;
  name: string;
}

export const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const PRIORITIES = ["Low", "Medium", "High"] as const;
