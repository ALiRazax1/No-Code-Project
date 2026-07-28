// Barrel re-export — all pages import services from here.
// Keeps the existing import paths working while services are now Supabase-backed.
export { customerService } from './customerService';
export { leadService } from './leadService';
export { taskService } from './taskService';
export { projectService } from './projectService';
export { invoiceService } from './invoiceService';
export { messageService } from './messageService';
export { activityService } from './activityService';
export { dashboardService } from './dashboardService';
export { notificationService } from './notificationService';
