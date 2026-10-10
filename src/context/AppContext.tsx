import {createOwnerEditor} from './applyOwnerEdit';
import { SharedRecordsGate, useSharedRecords, useSharedIdentity, refreshSharedRecords, authHeaders } from './sharedRecords';
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CompanyProfile,
  Client,
  Project,
  Task,
  Employee,
  LeaveRequest,
  AttendanceRecord,
  Payslip,
  Vendor,
  PurchaseOrder,
  InventoryItem,
  Quotation,
  ClientInvoice,
  ClientPaymentRecord,
  Expense,
  UserRole,
  Trade,
  Milestone,
  VendorMilestone,
  MoodBoard,
  HandoverChecklistItem,
  ProjectDocument,
  AppNotification,
  EmailNotification,
  Manpower
} from '../types';
import {initialCompanyProfile} from '../data/initialData';

interface AppContextType {
  ownerRecords: Record<string, any>;
  editOwnerRecord: (collection:string, before:any, draft:any) => void;
  // Current user and server-assigned designation
  currentRole: UserRole;
  currentUser: Employee;
  clientPortalMode: boolean;
  setClientPortalMode: (val: boolean) => void;
  activeClientId: string;
  setActiveClientId: (id: string) => void;

  // Company Profile / Account
  companyProfile: CompanyProfile;
  updateCompanyProfile: (profile: Partial<CompanyProfile>) => void;

  // Clients & Projects
  clients: Client[];
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Client;
  deleteClient: (clientId: string) => void;
  projects: Project[];
  addProject: (project: Omit<Project, 'id'>) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  updateMilestone: (projectId: string, milestoneId: string, updates: Partial<Milestone>) => void;
  deleteMilestone: (projectId: string, milestoneId: string) => void;
  updateHandoverChecklist: (projectId: string, itemId: string, checked: boolean, remarks?: string) => void;
  addMoodBoard: (projectId: string, moodBoard: Omit<MoodBoard, 'id'>) => void;
  deleteMoodBoard: (projectId: string, mbId: string) => void;
  addVendorMilestone: (projectId: string, vm: Omit<VendorMilestone, 'id'>) => void;
  deleteVendorMilestone: (projectId: string, vmId: string) => void;
  addProjectDocument: (projectId: string, doc: Omit<ProjectDocument, 'id' | 'uploadedAt'>) => ProjectDocument;
  deleteProjectDocument: (projectId: string, docId: string) => void;

  // Tasks & Site Photos
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Task;
  deleteTask: (taskId: string) => void;
  updateTaskStatus: (taskId: string, status: Task['status']) => void;
  addTaskPhoto: (taskId: string, photo: { url: string; caption: string }) => void;
  addTaskComment: (taskId: string, text: string) => void;

  // HRMS & Workforce
  employees: Employee[];
  addEmployee: (emp: Omit<Employee, 'id'>) => Employee;
  deleteEmployee: (employeeId: string) => void;
  leaveRequests: LeaveRequest[];
  submitLeaveRequest: (req: Omit<LeaveRequest, 'id' | 'status'>) => void;
  deleteLeaveRequest: (leaveId: string) => void;
  approveLeaveByPM: (leaveId: string, notes?: string) => void;
  rejectLeaveByPM: (leaveId: string, notes?: string) => void;
  approveLeaveByOwner: (leaveId: string, notes?: string) => void;
  rejectLeaveByOwner: (leaveId: string, notes?: string) => void;
  attendanceRecords: AttendanceRecord[];
  punchAttendance: (employeeId: string, location: string) => void;
  deleteAttendanceRecord: (attendanceId: string) => void;
  payslips: Payslip[];
  generatePayslip: (employeeId: string, monthYear: string, overtimeHours?: number) => Payslip;
  deletePayslip: (payslipId: string) => void;

  // Procurement & Inventory
  vendors: Vendor[];
  addVendor: (vendor: Omit<Vendor, 'id'>) => Vendor;
  deleteVendor: (vendorId: string) => void;
  purchaseOrders: PurchaseOrder[];
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id'>) => PurchaseOrder;
  deletePurchaseOrder: (poId: string) => void;
  updatePOPartialReceipt: (poId: string, itemReceipts: { itemId: string; additionalReceived: number }[]) => void;
  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'lastRestocked'>) => void;
  deleteInventoryItem: (itemId: string) => void;
  updateInventoryStock: (itemId: string, newStock: number) => void;

  // Manpower & On-Site Workforce
  manpower: Manpower[];
  setManpower: React.Dispatch<React.SetStateAction<Manpower[]>>;
  addManpower: (person: Omit<Manpower, 'id' | 'createdAt'>) => Manpower;
  updateManpower: (id: string, updates: Partial<Manpower>) => void;
  deleteManpower: (id: string) => void;
  clearAllManpower: () => void;
  getProjectCostBreakdown: (projectId: string) => {
    labourCost: number;
    materialsCost: number;
    otherExpensesCost: number;
    totalCost: number;
    assignedManpower: Manpower[];
  };

  // Quotations, Invoices, Payments, Expenses
  quotations: Quotation[];
  addQuotation: (quo: Omit<Quotation, 'id'>) => Quotation;
  updateQuotation: (id: string, updates: Partial<Quotation>) => void;
  deleteQuotation: (quotationId: string) => void;
  invoices: ClientInvoice[];
  addInvoice: (inv: Omit<ClientInvoice, 'id'>) => ClientInvoice;
  deleteInvoice: (invoiceId: string) => void;
  clientPayments: ClientPaymentRecord[];
  recordClientPayment: (payment: Omit<ClientPaymentRecord, 'id'>) => void;
  deleteClientPayment: (paymentId: string) => void;
  expenses: Expense[];
  addExpense: (exp: Omit<Expense, 'id'>) => void;
  deleteExpense: (expenseId: string) => void;

  // Automated Notifications & Dispatch System
  notifications: AppNotification[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotification: (id: string) => void;
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp'>) => AppNotification;
  dispatchedEmailToast: EmailNotification | null;
  setDispatchedEmailToast: (email: EmailNotification | null) => void;

  // Data Management & Sample Data Controls

  // Authentication & Login System (erpstudio.vrindaspaces.com)
  authenticatedUser: Employee | null;
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const ReadyAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authenticatedUser:Employee|null = useSharedIdentity();
  const currentRole:UserRole = authenticatedUser?.role || 'Site Engineer';
  const [clientPortalMode, setClientPortalMode] = useState<boolean>(false);
  const [activeClientId, setActiveClientId] = useState<string>('cli-001');

  const [companyProfile, setCompanyProfile] = useSharedRecords<CompanyProfile>('companyProfile', initialCompanyProfile);
  const [clients, setClients] = useSharedRecords<Client[]>('clients', []);
  const [projects, setProjects] = useSharedRecords<Project[]>('projects', []);
  const [employees, setEmployees] = useSharedRecords<Employee[]>('employees', []);
  const [tasks, setTasks] = useSharedRecords<Task[]>('tasks', []);
  const [leaveRequests, setLeaveRequests] = useSharedRecords<LeaveRequest[]>('leaveRequests', []);
  const [attendanceRecords, setAttendanceRecords] = useSharedRecords<AttendanceRecord[]>('attendance', []);
  const [payslips, setPayslips] = useSharedRecords<Payslip[]>('payslips', []);
  const [vendors, setVendors] = useSharedRecords<Vendor[]>('vendors', []);
  const [purchaseOrders, setPurchaseOrders] = useSharedRecords<PurchaseOrder[]>('purchaseOrders', []);
  const [inventory, setInventory] = useSharedRecords<InventoryItem[]>('inventory', []);
  const [quotations, setQuotations] = useSharedRecords<Quotation[]>('quotations', []);
  const [invoices, setInvoices] = useSharedRecords<ClientInvoice[]>('invoices', []);
  const [clientPayments, setClientPayments] = useSharedRecords<ClientPaymentRecord[]>('clientPayments', []);
  const [expenses, setExpenses] = useSharedRecords<Expense[]>('expenses', []);
  const [notifications, setNotifications] = useSharedRecords<AppNotification[]>('notifications', []);
  const [manpower, setManpower] = useSharedRecords<Manpower[]>('manpower', []);
  const [dispatchedEmailToast, setDispatchedEmailToast] = useState<EmailNotification | null>(null);

  const login = async (email:string,password?:string) => {
    try {
      const response=await fetch('/api/login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,password})
      });
      const result=await response.json();
      if(!response.ok) return {success:false,message:result.error || 'Authentication failed.'};
      if(result.token) {
        localStorage.setItem('erp_session', result.token);
      }
      await refreshSharedRecords();
      return {success:true};
    }catch(err){
      return {success:false,message:err instanceof Error ? err.message : 'Cannot sign in. Please retry.'};
    }
  };
  const logout = async () => {
    try {
      await fetch('/api/logout',{method:'POST',headers:{...authHeaders()}});
    } catch {}
    localStorage.removeItem('erp_session');
    setClientPortalMode(false);
    await refreshSharedRecords();
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const addNotification = (notifData: Omit<AppNotification, 'id' | 'timestamp'>): AppNotification => {
    const newNotif: AppNotification = {
      ...notifData,
      id: `notif-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
    };
    setNotifications((prev) => [newNotif, ...prev]);
    if (notifData.emailNotification) {
      // Historical previews do not indicate delivery.
    }
    return newNotif;
  };

  const currentUser:Employee = authenticatedUser || {id:'',name:'',role:'Site Engineer',email:'',phone:'',joiningDate:'',baseSalary:0,bankAccount:'',ifsc:'',pan:'',uan:'',status:'Active',assignedProjectIds:[]};

  const updateCompanyProfile = (updates: Partial<CompanyProfile>) => {
    setCompanyProfile((prev) => ({ ...prev, ...updates }));
  };

  const addClient = (data: Omit<Client, 'id' | 'createdAt'>): Client => {
    const newClient: Client = {
      ...data,
      id: 'cli-'+crypto.randomUUID(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setClients((prev) => [newClient, ...prev]);
    return newClient;
  };

  const addProject = (data: Omit<Project, 'id'>): Project => {
    const newProject: Project = {
      ...data,
      id: 'prj-'+crypto.randomUUID()
    };
    setProjects((prev) => [newProject, ...prev]);

    // Automated Project Leadership Assignment Email Notification
    const pm = employees.find((e) => e.id === data.projectManagerId);
    const se = employees.find((e) => e.id === data.siteEngineerId);
    const designer = employees.find((e) => e.id === data.designerId);

    

    const notif: AppNotification = {
      id: `notif-${Date.now().toString().slice(-4)}`,
      title: `Project Assigned: ${data.title}`,
      message: `Project assigned to ${data.projectManagerName} (PM), ${data.siteEngineerName} (SE), and ${data.designerName} (Designer).`,
      type: 'project_assigned',
      targetAudience: 'Assignee',
      targetRole: 'Project Manager',
      projectId: newProject.id,
      projectName: data.title,
      dueDate: data.targetDate,
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
      read: false,
      priority: 'High',
      emailNotification: undefined
    };

    const team=[pm,se,designer].filter(Boolean);
    if(team.length)setNotifications(prev=>[...team.map(emp=>({...notif,id:'notif-'+crypto.randomUUID(),message:'Project assigned to '+emp!.name,targetUserId:emp!.id,targetRole:emp!.role,emailNotification:undefined})),...prev]);
    return newProject;
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const deleteClient = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  const deleteMilestone = (projectId: string, milestoneId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          milestones: p.milestones.filter((m) => m.id !== milestoneId)
        };
      })
    );
  };

  const deleteMoodBoard = (projectId: string, mbId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          moodBoards: p.moodBoards.filter((m) => m.id !== mbId)
        };
      })
    );
  };

  const deleteVendorMilestone = (projectId: string, vmId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          vendorMilestones: p.vendorMilestones.filter((m) => m.id !== vmId)
        };
      })
    );
  };

  const updateMilestone = (projectId: string, milestoneId: string, updates: Partial<Milestone>) => {
    let newlyCompletedMilestone: Milestone | null = null;
    let currentProj: Project | null = null;

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        currentProj = p;
        const updatedMilestones = p.milestones.map((m) => {
          if (m.id !== milestoneId) return m;
          const updated = { ...m, ...updates };
          const isNewlyCompleted =
            (updates.percentage === 100 || updates.status === 'Completed') && m.status !== 'Completed';
          if (isNewlyCompleted && !updated.completedDate) {
            updated.completedDate = new Date().toISOString().split('T')[0];
            updated.status = 'Completed';
            newlyCompletedMilestone = updated;
          }
          return updated;
        });
        return { ...p, milestones: updatedMilestones };
      })
    );

    if (newlyCompletedMilestone && currentProj) {
      const proj: Project = currentProj;
      const ms: Milestone = newlyCompletedMilestone;
      const client = clients.find((c) => c.id === proj.clientId);
      const pm = employees.find((e) => e.id === proj.projectManagerId);

      

      const notif: AppNotification = {
        id: `notif-${Date.now().toString().slice(-4)}`,
        title: `Milestone Completed: ${ms.name}`,
        message: `Milestone "${ms.name}" marked 100% completed on ${proj.title}. Milestone billing trigger of ₹${ms.paymentAmount.toLocaleString('en-IN')} is unlocked.`,
        type: 'milestone_completed',
        targetAudience: 'All',
        targetRole: 'Project Manager',
        projectId: proj.id,
        projectName: proj.title,
        milestoneId: ms.id,
        milestoneName: ms.name,
        dueDate: ms.dueDate,
        timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
        read: false,
        priority: 'High',
        emailNotification: undefined
      };

      if(currentRole==='Owner'){
        setNotifications((prev) => [notif, ...prev]);
        // Email delivery is handled by the server.
      }
    }
  };

  const updateHandoverChecklist = (projectId: string, itemId: string, checked: boolean, remarks?: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const updatedChecklist = p.handoverChecklist.map((item) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            checked,
            remarks: remarks !== undefined ? remarks : item.remarks,
            verifiedBy: checked ? `${currentUser.name} (${currentUser.role})` : undefined
          };
        });
        return { ...p, handoverChecklist: updatedChecklist };
      })
    );
  };

  const addMoodBoard = (projectId: string, moodBoardData: Omit<MoodBoard, 'id'>) => {
    const newMb: MoodBoard = {
      ...moodBoardData,
      id: `mb-${Date.now().toString().slice(-4)}`
    };
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, moodBoards: [...p.moodBoards, newMb] } : p))
    );
  };

  const addVendorMilestone = (projectId: string, vmData: Omit<VendorMilestone, 'id'>) => {
    const newVm: VendorMilestone = {
      ...vmData,
      id: `vm-${Date.now().toString().slice(-4)}`
    };
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, vendorMilestones: [...p.vendorMilestones, newVm] } : p))
    );
  };

  const addProjectDocument = (
    projectId: string,
    docData: Omit<ProjectDocument, 'id' | 'uploadedAt'>
  ): ProjectDocument => {
    const newDoc: ProjectDocument = {
      ...docData,
      id: `doc-${Date.now().toString().slice(-4)}`,
      uploadedAt: new Date().toISOString().split('T')[0]
    };
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, documents: [newDoc, ...(p.documents || [])] }
          : p
      )
    );
    return newDoc;
  };

  const deleteProjectDocument = (projectId: string, docId: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, documents: (p.documents || []).filter((d) => d.id !== docId) }
          : p
      )
    );
  };

  const addTask = (data: Omit<Task, 'id' | 'createdAt'>): Task => {
    const newTask: Task = {
      ...data,
      id: 'tsk-'+crypto.randomUUID(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setTasks((prev) => [newTask, ...prev]);

    // Automated Assignee Email Notification Dispatch
    const project = projects.find((p) => p.id === data.projectId);
    const assigneeEmp=employees.find(e=>e.id===data.assignedUserId);
    const assigneeEmail=assigneeEmp?.email||'';
    

    const notif: AppNotification = {
      id: `notif-${Date.now().toString().slice(-4)}`,
      title: `Task Assigned: ${data.title}`,
      message: `Task assigned to ${data.assignedUserName} (${data.assignedTrade}) on ${project?.title || 'Project'}.`,
      type: 'task_assigned',
      targetAudience: 'Assignee',
      targetRole: 'Site Engineer',
      targetUserId: assigneeEmp?.id,
      targetUserEmail: assigneeEmail,
      projectId: data.projectId,
      projectName: project?.title,
      taskId: newTask.id,
      taskTitle: data.title,
      dueDate: data.dueDate,
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
      read: false,
      priority: data.priority === 'High' ? 'High' : 'Medium',
      emailNotification: undefined
    };

    setNotifications((prev) => [notif, ...prev]);
    // Email delivery is handled by the server.

    return newTask;
  };

  const updateTaskStatus = (taskId: string, status: Task['status']) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
  };

  const addTaskPhoto = (taskId: string, photo: { url: string; caption: string }) => {
    const newPhoto = {
      id: `tp-${Date.now().toString().slice(-4)}`,
      url: photo.url,
      caption: photo.caption,
      timestamp: new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }),
      uploadedBy: `${currentUser.name} (${currentUser.role})`
    };
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, photos: [newPhoto, ...t.photos] } : t))
    );
  };

  const addTaskComment = (taskId: string, text: string) => {
    const newComment = {
      id: `tc-${Date.now().toString().slice(-4)}`,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      text,
      timestamp: new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    };
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, comments: [...t.comments, newComment] } : t))
    );
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const addEmployee = (empData: Omit<Employee, 'id'>): Employee => {
    const newEmp: Employee = {
      ...empData,
      id: 'emp-'+crypto.randomUUID(),
      password: empData.password || 'vrinda123'
    };
    setEmployees((prev) => [...prev, newEmp]);
    return newEmp;
  };

  const submitLeaveRequest = (req: Omit<LeaveRequest, 'id' | 'status'>) => {
    const newReq: LeaveRequest = {
      ...req,
      pmApproval:undefined,ownerApproval:undefined,
      id: 'lv-'+crypto.randomUUID(),
      status: 'Pending PM Approval'
    };
    setLeaveRequests((prev) => [newReq, ...prev]);
  };

  const approveLeaveByPM = (leaveId: string, notes?: string) => {
    if(currentRole!=='Project Manager'||!leaveRequests.some(l=>l.id===leaveId&&l.status==='Pending PM Approval'&&l.employeeId!==currentUser.id))return;
    setLeaveRequests((prev) =>
      prev.map((l) => {
        if (l.id !== leaveId) return l;
        return {
          ...l,
          status: 'Pending Owner Approval',
          pmApproval: {
            approved: true,
            date: new Date().toISOString().split('T')[0],
            approvedBy: `${currentUser.name} (Project Manager)`,
            notes
          }
        };
      })
    );
  };

  const rejectLeaveByPM = (leaveId: string, notes?: string) => {
    if(currentRole!=='Project Manager'||!leaveRequests.some(l=>l.id===leaveId&&l.status==='Pending PM Approval'&&l.employeeId!==currentUser.id))return;
    setLeaveRequests((prev) =>
      prev.map((l) => {
        if (l.id !== leaveId) return l;
        return {
          ...l,
          status: 'Rejected',
          pmApproval: {
            approved: false,
            date: new Date().toISOString().split('T')[0],
            approvedBy: `${currentUser.name} (Project Manager)`,
            notes
          }
        };
      })
    );
  };

  const approveLeaveByOwner = (leaveId: string, notes?: string) => {
    if(currentRole!=='Owner'||!leaveRequests.some(l=>l.id===leaveId&&l.status==='Pending Owner Approval'&&l.pmApproval?.approved))return;
    setLeaveRequests((prev) =>
      prev.map((l) => {
        if (l.id !== leaveId) return l;
        return {
          ...l,
          status: 'Approved',
          ownerApproval: {
            approved: true,
            date: new Date().toISOString().split('T')[0],
            approvedBy: `${currentUser.name} (Owner)`,
            notes
          }
        };
      })
    );
  };

  const rejectLeaveByOwner = (leaveId: string, notes?: string) => {
    if(currentRole!=='Owner'||!leaveRequests.some(l=>l.id===leaveId&&l.status==='Pending Owner Approval'&&l.pmApproval?.approved))return;
    setLeaveRequests((prev) =>
      prev.map((l) => {
        if (l.id !== leaveId) return l;
        return {
          ...l,
          status: 'Rejected',
          ownerApproval: {
            approved: false,
            date: new Date().toISOString().split('T')[0],
            approvedBy: `${currentUser.name} (Owner)`,
            notes
          }
        };
      })
    );
  };

  const punchAttendance = (employeeId: string, location: string) => {
    const today = new Date().toISOString().split('T')[0];
    const timeNow = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const emp = employees.find((e) => e.id === employeeId);
    const existing = attendanceRecords.find((a) => a.employeeId === employeeId && a.date === today);

    if (existing) {
      setAttendanceRecords((prev) =>
        prev.map((a) => (a.id === existing.id ? { ...a, punchOut: timeNow } : a))
      );
    } else {
      const newRec: AttendanceRecord = {
        id: `att-${Date.now().toString().slice(-4)}`,
        employeeId,
        employeeName: emp?.name || 'Staff',
        date: today,
        punchIn: timeNow,
        punchOut: '--',
        status: 'Present',
        siteLocation: location || 'Whitefield Site 14',
        overtimeHours: 0
      };
      setAttendanceRecords((prev) => [newRec, ...prev]);
    }
  };

  const generatePayslip = (employeeId: string, monthYear: string, overtimeHours: number = 0): Payslip => {
    const emp = employees.find((e) => e.id === employeeId);
    const base = emp ? emp.baseSalary : 50000;
    const basicSalary = Math.round(base * 0.5);
    const hra = Math.round(base * 0.25);
    const specialAllowance = Math.round(base * 0.25);
    const hourlyRate = Math.round(base / 200);
    const overtimePay = overtimeHours * hourlyRate * 1.5;
    const pfDeduction = 1800;
    const esiDeduction = base < 21000 ? Math.round(base * 0.0075) : 0;
    const professionalTax = 200;
    const netPay = basicSalary + hra + specialAllowance + overtimePay - (pfDeduction + esiDeduction + professionalTax);

    const newPayslip: Payslip = {
      id: `ps-${monthYear.replace(' ', '-').toLowerCase()}-${employeeId}`,
      employeeId,
      employeeName: emp ? emp.name : 'Employee',
      role: emp ? emp.role : 'Staff',
      monthYear,
      basicSalary,
      hra,
      specialAllowance,
      overtimePay,
      pfDeduction,
      esiDeduction,
      professionalTax,
      netPay,
      paymentDate: new Date().toISOString().split('T')[0],
      status: 'Paid'
    };

    setPayslips((prev) => [newPayslip, ...prev.filter((p) => p.id !== newPayslip.id)]);
    return newPayslip;
  };

  const deleteEmployee = (employeeId: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
    setLeaveRequests((prev) => prev.filter((l) => l.employeeId !== employeeId));
    setAttendanceRecords((prev) => prev.filter((a) => a.employeeId !== employeeId));
    setPayslips((prev) => prev.filter((p) => p.employeeId !== employeeId));
  };

  const deleteLeaveRequest = (leaveId: string) => {
    setLeaveRequests((prev) => prev.filter((l) => l.id !== leaveId));
  };

  const deletePayslip = (payslipId: string) => {
    setPayslips((prev) => prev.filter((p) => p.id !== payslipId));
  };

  const deleteAttendanceRecord = (attendanceId: string) => {
    setAttendanceRecords((prev) => prev.filter((a) => a.id !== attendanceId));
  };

  const addVendor = (vendorData: Omit<Vendor, 'id'>): Vendor => {
    const newVendor: Vendor = {
      ...vendorData,
      id: `ven-${Date.now().toString().slice(-4)}`
    };
    setVendors((prev) => [...prev, newVendor]);
    return newVendor;
  };

  const addPurchaseOrder = (poData: Omit<PurchaseOrder, 'id'>): PurchaseOrder => {
    const newPO: PurchaseOrder = {
      ...poData,
      id: `po-${Date.now().toString().slice(-4)}`
    };
    setPurchaseOrders((prev) => [newPO, ...prev]);
    return newPO;
  };

  const updatePOPartialReceipt = (
    poId: string,
    itemReceipts: { itemId: string; additionalReceived: number }[]
  ) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => {
        if (po.id !== poId) return po;
        const updatedItems = po.items.map((item) => {
          const match = itemReceipts.find((r) => r.itemId === item.id);
          if (!match) return item;
          const newReceived = Math.min(item.orderedQty, item.receivedQty + Math.max(0, match.additionalReceived));
          return {
            ...item,
            receivedQty: newReceived
          };
        });

        // Determine PO status
        const allReceived = updatedItems.every((i) => i.receivedQty >= i.orderedQty);
        const someReceived = updatedItems.some((i) => i.receivedQty > 0);
        const status: PurchaseOrder['status'] = allReceived
          ? 'Fully Received'
          : someReceived
          ? 'Partially Received'
          : po.status;

        return {
          ...po,
          items: updatedItems,
          status
        };
      })
    );
  };

  const addInventoryItem = (data: Omit<InventoryItem, 'id' | 'lastRestocked'>) => {
    const newItem: InventoryItem = {
      ...data,
      id: `inv-${Date.now().toString().slice(-4)}`,
      lastRestocked: new Date().toISOString().split('T')[0]
    };
    setInventory((prev) => [newItem, ...prev]);
  };

  const updateInventoryStock = (itemId: string, newStock: number) => {
    setInventory((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, currentStock: newStock, lastRestocked: new Date().toISOString().split('T')[0] } : i))
    );
  };

  const deleteVendor = (vendorId: string) => {
    setVendors((prev) => prev.filter((v) => v.id !== vendorId));
  };

  const deletePurchaseOrder = (poId: string) => {
    setPurchaseOrders((prev) => prev.filter((p) => p.id !== poId));
  };

  const deleteInventoryItem = (itemId: string) => {
    setInventory((prev) => prev.filter((i) => i.id !== itemId));
  };

  const getProjectCostBreakdown = (projectId: string) => {
    const assigned = (manpower || []).filter((m) => m.assignedProjectId === projectId);
    const labourCost = assigned.reduce((sum, m) => {
      const amt = m.wageAmount !== undefined ? m.wageAmount : (m.dailyRate || 0);
      return sum + (amt || 0);
    }, 0);
    const materialsCost = (purchaseOrders || [])
      .filter((po) => po.projectId === projectId)
      .reduce((sum, po) => {
        const itemsSum = po.items.reduce((s, i) => s + (i.orderedQty * i.unitPrice), 0);
        return sum + (po.applyGst ? itemsSum * (1 + po.gstRate / 100) : itemsSum);
      }, 0);
    const otherExpensesCost = (expenses || [])
      .filter((e) => e.projectId === projectId && !e.id.startsWith('exp-mp-'))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalCost = labourCost + materialsCost + otherExpensesCost;

    return {
      labourCost,
      materialsCost,
      otherExpensesCost,
      totalCost,
      assignedManpower: assigned
    };
  };

  const syncProjectCostsForManpower = (updatedManpowerList: Manpower[]) => {
    setProjects((prevProjects) => {
      return (prevProjects || []).map((proj) => {
        const assigned = updatedManpowerList.filter((m) => m.assignedProjectId === proj.id);
        const labourCost = assigned.reduce((sum, m) => {
          const amt = m.wageAmount !== undefined ? m.wageAmount : (m.dailyRate || 0);
          return sum + (amt || 0);
        }, 0);
        const materialsCost = (purchaseOrders || [])
          .filter((po) => po.projectId === proj.id)
          .reduce((sum, po) => {
            const itemsSum = po.items.reduce((s, i) => s + (i.orderedQty * i.unitPrice), 0);
            return sum + (po.applyGst ? itemsSum * (1 + po.gstRate / 100) : itemsSum);
          }, 0);
        const otherExpensesCost = (expenses || [])
          .filter((e) => e.projectId === proj.id && !e.id.startsWith('exp-mp-'))
          .reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalProjectCost = labourCost + materialsCost + otherExpensesCost;

        return {
          ...proj,
          labourCost,
          materialsCost,
          otherExpensesCost,
          totalProjectCost
        };
      });
    });
  };

  const syncManpowerWageExpense = (person: Manpower) => {
    const amount = person.wageAmount !== undefined ? person.wageAmount : person.dailyRate;
    const expId = `exp-mp-${person.id}`;
    if (person.assignedProjectId && amount && amount > 0) {
      const proj = projects.find((p) => p.id === person.assignedProjectId);
      const projTitle = proj?.title || person.assignedProjectTitle || 'Project';
      const wageDesc = `Manpower: ${person.name} (${person.skill}) — ${person.wageType || 'Daily Wage'}`;
      const expenseRecord: Expense = {
        id: expId,
        projectId: person.assignedProjectId,
        projectTitle: projTitle,
        category: 'Labour Wages',
        description: wageDesc,
        amount,
        date: new Date().toISOString().split('T')[0],
        paidTo: person.name,
        paymentMethod: 'Direct Wage Transfer'
      };
      setExpenses((prev) => {
        const withoutOld = (prev || []).filter((e) => e.id !== expId);
        return [expenseRecord, ...withoutOld];
      });
    } else {
      setExpenses((prev) => (prev || []).filter((e) => e.id !== expId));
    }
  };

  const addManpower = (personData: Omit<Manpower, 'id' | 'createdAt'>): Manpower => {
    const newPerson: Manpower = {
      ...personData,
      id: `mp-${Date.now().toString().slice(-5)}`,
      createdAt: new Date().toISOString()
    };
    const nextList = [newPerson, ...(manpower || [])];
    setManpower(nextList);
    syncManpowerWageExpense(newPerson);
    syncProjectCostsForManpower(nextList);
    return newPerson;
  };

  const updateManpower = (id: string, updates: Partial<Manpower>) => {
    const nextList = (manpower || []).map((m) => {
      if (m.id === id) {
        const updated = { ...m, ...updates, updatedAt: new Date().toISOString() };
        syncManpowerWageExpense(updated);
        return updated;
      }
      return m;
    });
    setManpower(nextList);
    syncProjectCostsForManpower(nextList);
  };

  const deleteManpower = (id: string) => {
    const nextList = (manpower || []).filter((m) => m.id !== id);
    setManpower(nextList);
    setExpenses((prev) => (prev || []).filter((e) => e.id !== `exp-mp-${id}`));
    syncProjectCostsForManpower(nextList);
  };

  const clearAllManpower = () => {
    setManpower([]);
    setExpenses((prev) => (prev || []).filter((e) => !e.id.startsWith('exp-mp-')));
    syncProjectCostsForManpower([]);
  };

  const addQuotation = (quoData: Omit<Quotation, 'id'>): Quotation => {
    const newQuo: Quotation = {
      ...quoData,
      id: `quo-${Date.now().toString().slice(-4)}`
    };
    setQuotations((prev) => [newQuo, ...prev]);
    return newQuo;
  };

  const updateQuotation = (id: string, updates: Partial<Quotation>) => {
    setQuotations((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const addInvoice = (invData: Omit<ClientInvoice, 'id'>): ClientInvoice => {
    const newInv: ClientInvoice = {
      ...invData,
      id: `inv-${Date.now().toString().slice(-4)}`
    };
    setInvoices((prev) => [newInv, ...prev]);
    return newInv;
  };

  const recordClientPayment = (paymentData: Omit<ClientPaymentRecord, 'id'>) => {
    const newPayment: ClientPaymentRecord = {
      ...paymentData,
      id: `pay-${Date.now().toString().slice(-4)}`
    };
    setClientPayments((prev) => [newPayment, ...prev]);

    // Update project total received amount
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== paymentData.projectId) return p;
        return {
          ...p,
          totalReceivedAmount: p.totalReceivedAmount + paymentData.amount
        };
      })
    );

    // If attached to an invoice, update invoice received and status
    if (paymentData.invoiceId) {
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id !== paymentData.invoiceId) return inv;
          const newReceived = inv.amountReceived + paymentData.amount;
          const baseSub = inv.items.reduce((s, i) => s + i.amount, 0);
          const totalWithGst = inv.applyGst ? baseSub * (1 + inv.gstRate / 100) : baseSub;
          const status = newReceived >= totalWithGst ? 'Paid In Full' : newReceived > 0 ? 'Partially Paid' : 'Unpaid';
          return {
            ...inv,
            amountReceived: newReceived,
            paymentStatus: status
          };
        })
      );
    }
  };

  const addExpense = (expData: Omit<Expense, 'id'>) => {
    const newExp: Expense = {
      ...expData,
      id: `exp-${Date.now().toString().slice(-4)}`
    };
    setExpenses((prev) => [newExp, ...prev]);
  };

  const deleteQuotation = (quotationId: string) => {
    setQuotations((prev) => prev.filter((q) => q.id !== quotationId));
  };

  const deleteInvoice = (invoiceId: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
  };

  const deleteClientPayment = (paymentId: string) => {
    setClientPayments((prev) => prev.filter((p) => p.id !== paymentId));
  };

  const deleteExpense = (expenseId: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
  };

  const ownerRecords = {companyProfile, clients, projects, employees, tasks, leaveRequests, attendance: attendanceRecords, payslips, vendors, purchaseOrders, inventory, quotations, invoices, clientPayments, expenses, notifications, manpower};
  const editOwnerRecord = createOwnerEditor(ownerRecords, {companyProfile: setCompanyProfile, clients: setClients, projects: setProjects, employees: setEmployees, tasks: setTasks, leaveRequests: setLeaveRequests, attendance: setAttendanceRecords, payslips: setPayslips, vendors: setVendors, purchaseOrders: setPurchaseOrders, inventory: setInventory, quotations: setQuotations, invoices: setInvoices, clientPayments: setClientPayments, expenses: setExpenses, notifications: setNotifications, manpower: setManpower}, authenticatedUser, currentRole);

  return (
    <AppContext.Provider
      value={{
        ownerRecords,
        editOwnerRecord,
        currentRole,
        currentUser,
        clientPortalMode,
        setClientPortalMode,
        activeClientId,
        setActiveClientId,
        companyProfile,
        updateCompanyProfile,
        clients,
        addClient,
        deleteClient,
        projects,
        addProject,
        updateProject,
        deleteProject,
        updateMilestone,
        deleteMilestone,
        updateHandoverChecklist,
        addMoodBoard,
        deleteMoodBoard,
        addVendorMilestone,
        deleteVendorMilestone,
        addProjectDocument,
        deleteProjectDocument,
        tasks,
        addTask,
        deleteTask,
        updateTaskStatus,
        addTaskPhoto,
        addTaskComment,
        employees,
        addEmployee,
        deleteEmployee,
        leaveRequests,
        submitLeaveRequest,
        deleteLeaveRequest,
        approveLeaveByPM,
        rejectLeaveByPM,
        approveLeaveByOwner,
        rejectLeaveByOwner,
        attendanceRecords,
        punchAttendance,
        deleteAttendanceRecord,
        payslips,
        generatePayslip,
        deletePayslip,
        vendors,
        addVendor,
        deleteVendor,
        purchaseOrders,
        addPurchaseOrder,
        deletePurchaseOrder,
        updatePOPartialReceipt,
        inventory,
        addInventoryItem,
        deleteInventoryItem,
        updateInventoryStock,
        manpower,
        setManpower,
        addManpower,
        updateManpower,
        deleteManpower,
        clearAllManpower,
        getProjectCostBreakdown,
        quotations,
        addQuotation,
        updateQuotation,
        deleteQuotation,
        invoices,
        addInvoice,
        deleteInvoice,
        clientPayments,
        recordClientPayment,
        deleteClientPayment,
        expenses,
        addExpense,
        deleteExpense,
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotification,
        addNotification,
        dispatchedEmailToast,
        setDispatchedEmailToast,
        authenticatedUser,
        login,
        logout
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};


export const AppProvider: React.FC<{children:React.ReactNode}> = ({children}) => <SharedRecordsGate><ReadyAppProvider>{children}</ReadyAppProvider></SharedRecordsGate>;
