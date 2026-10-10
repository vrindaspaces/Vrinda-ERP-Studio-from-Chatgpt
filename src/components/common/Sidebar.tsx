import {canAccessTab} from '../../context/roleAccess';
import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  FileSpreadsheet,
  Receipt,
  ShoppingCart,
  Boxes,
  Users,
  UserCircle2,
  HardHat,
  TrendingUp,
  Settings,
  Mail,
  HardDrive,
  AlertCircle
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { 
    currentRole, 
    tasks, 
    leaveRequests, 
    purchaseOrders, 
    inventory, 
    clientPortalMode, 
    setClientPortalMode 
  } = useApp();

  // Calculate pending badge counters
  const pendingTasks = tasks.filter((t) => t.status !== 'Completed').length;
  const pendingLeaves = leaveRequests.filter((l) =>
    currentRole === 'Owner'
      ? l.status === 'Pending Owner Approval'
      : currentRole === 'Project Manager'
      ? l.status === 'Pending PM Approval'
      : false
  ).length;
  const pendingPOs = purchaseOrders.filter((po) => po.status === 'Partially Received' || po.status === 'Sent').length;
  const lowStockCount = inventory.filter((i) => i.currentStock <= i.reorderLevel).length;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Executive Dashboard',
      icon: LayoutDashboard,
      group: 'Core'
    },
    {id:'clients',label:'Clients',icon:UserCircle2,group:'Operations'},
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderKanban,
      group: 'Operations'
    },
    {
      id: 'tasks',
      label: currentRole==='Owner'?'Site Tasks & Trades':'Site Tasks',
      icon: CheckSquare,
      badge: pendingTasks > 0 ? pendingTasks : undefined,
      group: 'Operations'
    },
    {
      id: 'quotations',
      label: 'Quotations & Margins',
      icon: FileSpreadsheet,
      group: 'Financials'
    },
    {
      id: 'invoices',
      label: 'GST Invoices & Billing',
      icon: Receipt,
      group: 'Financials'
    },
    {
      id: 'procurement',
      label: 'Purchase Orders (PO)',
      icon: ShoppingCart,
      badge: pendingPOs > 0 ? pendingPOs : undefined,
      group: 'Supply Chain'
    },
    {
      id: 'inventory',
      label: 'Interior Inventory',
      icon: Boxes,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeVariant: 'warning',
      group: 'Supply Chain'
    },
    {
      id: 'hrms',
      label: 'HRMS & Leaves',
      icon: Users,
      badge: pendingLeaves > 0 ? pendingLeaves : undefined,
      group: 'Workforce'
    },
    {
      id: 'manpower',
      label: 'Manpower',
      icon: HardHat,
      group: 'Workforce'
    },
    {
      id: 'employee-portal',
      label: 'Employee Work Desk',
      icon: UserCircle2,
      group: 'Workforce'
    },
    {
      id: 'pnl',
      label: 'P&L & Expenses',
      icon: TrendingUp,
      group: 'Financials'
    },
    {
      id: 'account',
      label: 'Company & GST Account',
      icon: Settings,
      group: 'System'
    },
    {id:'my-account',label:'My Account',icon:UserCircle2,group:'Personal'},
    {id:'email-notifications',label:'Email Notifications',icon:Mail,group:'System'},
    {id:'storage-usage',label:'Storage & Usage',icon:HardDrive,group:'System'},
  ];

  return (
    <aside className="erp-sidebar no-print w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
      <div className="p-4 border-b border-slate-800/80">
        <h2 className="sidebar-studio-name text-white"><span className="sidebar-brand-full">ERP Studio</span><span className="sidebar-brand-short" aria-hidden="true">ERP</span></h2>
      </div>

      {/* Navigation menu list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.filter(item=>canAccessTab(currentRole,item.id)).map((item) => {
          const Icon = item.icon;
          const isActive = !clientPortalMode && activeTab === item.id;

          return (
            <button
              key={item.id}
              aria-label={item.label}
              title={item.label}
              onClick={() => {
                setClientPortalMode(false);
                setActiveTab(item.id);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white text-[#360b1c] font-semibold'
                  : 'text-[#efd1dc] hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#701d3e]' : 'text-[#efd1dc]'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    item.badgeVariant === 'warning'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer quick notice */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Active Role</span>
          <span className="font-semibold text-[#f8d7e3]">{currentRole}</span>
        </div>
      </div>
    </aside>
  );
};
