import type { Scholarship, Task, LearningResource } from '../types';

/**
 * New users start with completely empty arrays. Their My Applications,
 * Tasks, and Learning lists should be filled with scholarships and resources
 * THEY choose — never with pre-loaded examples that look like the system
 * picked them on the user's behalf.
 *
 * If you need realistic test data during development, sign in as a real
 * user and add a few via the Discover flow, or temporarily uncomment the
 * sample data in the git history of this file (commit prior to 2026-05-17).
 */

export const initialScholarships: Scholarship[] = [];

export const initialTasks: Task[] = [];

export const initialResources: LearningResource[] = [];
