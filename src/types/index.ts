export type UserRole =
  | 'Owner'
  | 'Project Manager'
  | 'Site Engineer'
  | 'Designer'
  | 'Front Office'
  | 'Marketing';

export type Trade =
  | 'Carpenter'
  | 'Painter'
  | 'Plumber'
  | 'Electrician'
  | 'False Ceiling Technician'
  | 'Site Engineer';

export type PropertyType = 'Villa' | 'Flat';

export type BhkType = '2bhk' | '2.5bhk' | '3bhk' | '3.5bhk' | '4bhk';

export interface CompanyProfile {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
  panNumber: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  defaultTerms: string[];
  logoText: string;
  logoId?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  propertyType: PropertyType;
  bhkType: BhkType;
  projectName?: string;
  createdAt: string;
  notes?: string;
}

export interface Milestone {
  id: string;
  name: string;
  percentage: number;
  status: 'Pending' | 'In Progress' | 'Completed';
  startDate?: string;
  dueDate: string;
  completedDate?: string;
  paymentDuePct: number;
  paymentAmount: number;
  paymentReceived: number;
  isBilled: boolean;
  notes: string;
  // Gantt chart & Critical Path tracking
  dependencies?: string[]; // IDs of predecessor milestones
  isCriticalPath?: boolean; // Critical path indicator
  durationDays?: number;
  assignedTrade?: string;
  assignedEngineer?: string;
  category?:
    | 'Design & Approvals'
    | 'Civil & Demolition'
    | 'MEP Services'
    | 'False Ceiling'
    | 'Carpentry & Modular'
    | 'Painting & Finishes'
    | 'Handover & QC';
}

export interface MoodBoard {
  id: string;
  room: string;
  title: string;
  imageUrl?: string;
  conceptNotes: string;
  colorPalette: string[];
  materials: string[];
  approvedByClient: boolean;
}

export interface VendorMilestone {
  id: string;
  vendorName: string;
  trade: string;
  scope: string;
  status: 'Scheduled' | 'In Progress' | 'Delivered' | 'Inspected';
  completionPct: number;
  dueDate: string;
  attachments: Array<{
    name: string;
    size: string;
    date: string;
    url?: string;
  }>;
}

export interface HandoverChecklistItem {
  id: string;
  category: string;
  item: string;
  checked: boolean;
  verifiedBy?: string;
  remarks?: string;
}

export type DocumentCategory =
  | 'Blueprints'
  | 'Contracts'
  | 'Site Photographs'
  | 'Approvals & NOC'
  | 'Specifications';

export interface ProjectDocument {
  id: string;
  projectId: string;
  title: string;
  category: DocumentCategory;
  fileName: string;
  fileSize: string;
  fileType: 'PDF' | 'CAD / DWG' | 'JPG / Image' | 'DOCX' | 'ZIP';
  uploadedBy: string;
  uploadedAt: string;
  version: string;
  url?: string;
  previewUrl?: string;
  description?: string;
  tags?: string[];
}

export interface Project {
  id: string;
  clientId: string;
  title: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  propertyType: PropertyType;
  bhkType: BhkType;
  projectManagerId: string;
  projectManagerName: string;
  siteEngineerId: string;
  siteEngineerName: string;
  designerId: string;
  designerName: string;
  status: 'Planning' | 'Execution' | 'Finishing' | 'Handover' | 'Completed';
  startDate: string;
  targetDate: string;
  totalContractValue: number;
  totalReceivedAmount: number;
  totalProjectCost?: number;
  labourCost?: number;
  materialsCost?: number;
  otherExpensesCost?: number;
  budgetAllocation: {
    civil: number;
    modular: number;
    falseCeiling: number;
    electricalPlumbing: number;
    painting: number;
    contingency: number;
    targetMarginPct: number;
  };
  milestones: Milestone[];
  moodBoards: MoodBoard[];
  vendorMilestones: VendorMilestone[];
  handoverChecklist: HandoverChecklistItem[];
  documents: ProjectDocument[];
  notes?: string;
}

export interface TaskPhoto {
  id: string;
  url: string;
  caption: string;
  timestamp: string;
  uploadedBy: string;
}

export interface TaskComment {
  id: string;
  authorName: string;
  authorRole: UserRole | string;
  text: string;
  timestamp: string;
}

export interface Task {
  attachments?: {driveFileId?:string;driveFolderId?:string;id:string;name:string;size:number;type:string;url:string;uploadedAt:string;uploadedBy:string}[];
  id: string;
  projectId: string;
  projectTitle: string;
  title: string;
  description: string;
  assignedTrade: Trade;
  assignedUserId?: string;
  assignedUserName: string;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'To Do' | 'In Progress' | 'Review' | 'Completed';
  photos: TaskPhoto[];
  comments: TaskComment[];
  createdBy: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  role: UserRole;
  trade?: Trade;
  phone: string;
  email: string;
  password?: string;
  joiningDate: string;
  baseSalary: number;
  bankAccount: string;
  ifsc: string;
  pan: string;
  uan: string;
  status: 'Active' | 'On Leave';
  assignedProjectIds: string[];
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: UserRole | string;
  leaveType: 'Casual Leave' | 'Sick Leave' | 'Earned Leave' | 'Emergency';
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: 'Pending PM Approval' | 'Pending Owner Approval' | 'Approved' | 'Rejected';
  pmApproval?: {
    approved: boolean;
    date: string;
    approvedBy: string;
    notes?: string;
  };
  ownerApproval?: {
    approved: boolean;
    date: string;
    approvedBy: string;
    notes?: string;
  };
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  punchIn: string;
  punchOut: string;
  status: 'Present' | 'Half Day' | 'Absent' | 'On Leave';
  siteLocation: string;
  overtimeHours: number;
}

export interface Payslip {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  monthYear: string;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  overtimePay: number;
  pfDeduction: number;
  esiDeduction: number;
  professionalTax: number;
  netPay: number;
  paymentDate: string;
  status: 'Paid' | 'Generated';
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  paymentTerms: string;
}

export interface PurchaseOrderItem {
  id: string;
  description: string;
  hsnCode: string;
  unit: string;
  orderedQty: number;
  receivedQty: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  projectId: string;
  projectTitle: string;
  vendorId: string;
  vendorName: string;
  vendorAddress: string;
  vendorPhone: string;
  vendorGst: string;
  date: string;
  expectedDeliveryDate: string;
  items: PurchaseOrderItem[];
  gstRate: 0 | 5 | 18;
  notes: string;
  status: 'Draft' | 'Sent' | 'Partially Received' | 'Fully Received' | 'Billed';
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  unitCost: number;
  location: string;
  lastRestocked: string;
}

export interface QuotationItem {
  id: string;
  roomOrCategory: string;
  description: string;
  specification: string;
  unit: string;
  quantity: number;
  baseRate: number;
  marginPercentage: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  projectId?: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  propertyType: PropertyType;
  bhkType: BhkType;
  date: string;
  validUntil: string;
  items: QuotationItem[];
  discountPercentage: number;
  gstRate: 0 | 5 | 18;
  termsAndConditions: string[];
  status: 'Draft' | 'Sent to Client' | 'Approved' | 'Revised';
}

export interface InvoiceItem {
  id: string;
  description: string;
  hsnSacCode: string;
  amount: number;
}

export interface ClientInvoice {
  id: string;
  invoiceNumber: string;
  projectId: string;
  projectTitle: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  clientGst?: string;
  date: string;
  dueDate: string;
  milestoneStage: string;
  items: InvoiceItem[];
  applyGst: boolean;
  gstRate: 0 | 5 | 18;
  amountReceived: number;
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid In Full';
}

export interface ClientPaymentRecord {
  id: string;
  projectId: string;
  invoiceId?: string;
  clientName: string;
  amount: number;
  paymentDate: string;
  paymentMode: 'NEFT/RTGS' | 'UPI' | 'Cheque' | 'Cash';
  referenceNo: string;
  milestoneProgressPct: number;
  notes: string;
}

export interface Expense {
  id: string;
  projectId?: string;
  projectTitle?: string;
  category:
    | 'Labour Wages'
    | 'Cartage & Freight'
    | 'Site Utilities'
    | 'Material Sampling'
    | 'Permits & Approvals'
    | 'Tools & Safety'
    | 'Travel & Food'
    | 'Office & Admin';
  description: string;
  amount: number;
  date: string;
  paidTo: string;
  paymentMethod: string;
}

export type NotificationType =
  | 'leave_requested'
  | 'leave_reviewed'
  | 'milestone_completed'
  | 'upcoming_due_date'
  | 'task_assigned'
  | 'project_assigned';

export type TargetAudience = 'Project Manager' | 'Client' | 'Assignee' | 'All';

export interface EmailNotification {
  id: string;
  recipientName: string;
  recipientEmail: string;
  recipientRole?: string;
  subject: string;
  body: string;
  sentAt: string;
  status: 'Sent' | 'Delivered';
  category: 'Project Assignment' | 'Task Assignment' | 'Milestone Alert' | 'Due Date Alert';
  metadata?: Record<string, string>;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  targetAudience: TargetAudience;
  targetUserId?: string;
  targetUserEmail?: string;
  targetRole?: UserRole | 'Client';
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskTitle?: string;
  milestoneId?: string;
  milestoneName?: string;
  dueDate?: string;
  timestamp: string;
  read: boolean;
  priority: 'High' | 'Medium' | 'Low';
  emailNotification?: EmailNotification;
}

export interface InvoicePayment {id:string;date:string;amount:number;method:string;reference:string;}
export interface SupplierInvoice {id:string;vendorId:string;vendorName:string;projectId:string;projectName:string;purchaseOrderId:string;invoiceNumber:string;invoiceDate:string;dueDate:string;taxableAmount:number;taxAmount:number;totalAmount:number;paidAmount:number;payments?:InvoicePayment[];paymentMethod?:string;paymentReference?:string;notes:string;createdAt:string;updatedAt:string;attachment?:{driveFileId:string;driveFolderId:string;name:string;size:number;type:string};}

export interface IdProofAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  uploadedAt: string;
  proofType?: 'Aadhaar Card' | 'PAN Card' | 'Voter ID' | 'Driving License' | 'Passport' | 'Labour Card' | 'Other';
}

export type ManpowerStatus = 'Available' | 'Assigned on Site' | 'On Leave' | 'Inactive';
export type WageType = 'Daily Wage' | 'Monthly Wage' | 'Project Wage';

export interface Manpower {
  id: string;
  name: string;
  skill: string;
  contact: string;
  location: string;
  email?: string;
  address: string;
  idProof: IdProofAttachment[];
  wageType?: WageType;
  wageAmount?: number;
  dailyRate?: number;
  status: ManpowerStatus;
  assignedProjectId?: string;
  assignedProjectTitle?: string;
  emergencyContact?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

