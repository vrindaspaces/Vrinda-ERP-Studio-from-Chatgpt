import {canAccessTab} from './context/roleAccess';
import {StorageUsageView} from './components/account/StorageUsageView';
import {UserAccountView} from './components/account/UserAccountView';
import {EmailSettings} from './components/account/EmailSettings';
import {OwnerEditToolbar} from './components/common/OwnerRecordEditor';
import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import {ClientsView} from './components/projects/ClientsView';
import { ProjectsView } from './components/projects/ProjectsView';
import { TasksView } from './components/tasks/TasksView';
import { ManpowerView } from './components/manpower/ManpowerView';
import { QuotationsView } from './components/quotations/QuotationsView';
import { InvoicesView } from './components/invoices/InvoicesView';
import { ProcurementView } from './components/procurement/ProcurementView';
import { InventoryView } from './components/inventory/InventoryView';
import { HrmsView } from './components/hrms/HrmsView';
import { EmployeePortal } from './components/employee/EmployeePortal';
import { ProfitLossView } from './components/finance/ProfitLossView';
import { MyAccountView } from './components/account/MyAccountView';
import { ClientPortalView } from './components/client/ClientPortalView';
import { LoginView } from './components/auth/LoginView';
import { EmailPreviewModal } from './components/common/EmailPreviewModal';
import { Mail, X, CheckCircle2 } from 'lucide-react';
import { EmailNotification } from './types';

const MainLayout: React.FC = () => {
  const {currentRole} = useApp();
  const [requestedTab, requestTab] = useState<string>('dashboard');
  const activeTab=canAccessTab(currentRole,requestedTab)?requestedTab:'employee-portal';
  const setActiveTab=(tab:string)=>{if(canAccessTab(currentRole,tab))requestTab(tab);};
  const { clientPortalMode, dispatchedEmailToast, setDispatchedEmailToast } = useApp();
  const [modalEmail, setModalEmail] = useState<EmailNotification | null>(null);

  if (clientPortalMode && currentRole==='Owner') {
    return <ClientPortalView />;
  }

  return (
    <div className="erp-shell min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header conforming to Top Bar Contract */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Dynamic Main Workspace Viewport */}
        <main className="flex-1 overflow-y-auto">
          {!['my-account','email-notifications','storage-usage'].includes(activeTab)&&<OwnerEditToolbar section={activeTab} />}
          {activeTab==='storage-usage'&&<StorageUsageView/>}
          {activeTab==='my-account'&&<UserAccountView/>}
          {activeTab==='email-notifications'&&<div className="p-6 max-w-5xl mx-auto space-y-5"><h1 className="text-xl font-bold text-slate-900">Email Notifications</h1><EmailSettings/></div>}
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
          {activeTab === 'clients' && <ClientsView />}
          {activeTab === 'projects' && <ProjectsView />}
          {activeTab === 'tasks' && <TasksView />}
          {activeTab === 'manpower' && <ManpowerView />}
          {activeTab === 'quotations' && <QuotationsView />}
          {activeTab === 'invoices' && <InvoicesView />}
          {activeTab === 'procurement' && <ProcurementView />}
          {activeTab === 'inventory' && <InventoryView />}
          {activeTab === 'hrms' && <HrmsView />}
          {activeTab === 'employee-portal' && <EmployeePortal />}
          {activeTab === 'pnl' && <ProfitLossView />}
          {activeTab === 'account' && <MyAccountView />}
        </main>
      </div>

      {/* Floating Automated Email Dispatch Toast */}
      {dispatchedEmailToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700 max-w-md w-full animate-bounce-short">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Mail className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Legacy Email Preview</span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                    Legacy email preview
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-semibold line-clamp-1">
                  {dispatchedEmailToast.subject}
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  Recipient: {dispatchedEmailToast.recipientName} ({dispatchedEmailToast.recipientEmail})
                </p>
              </div>
            </div>

            <button
              onClick={() => setDispatchedEmailToast(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-[10px] text-slate-400 font-mono">
              Created at {dispatchedEmailToast.sentAt}
            </span>
            <button
              onClick={() => {
                setModalEmail(dispatchedEmailToast);
                setDispatchedEmailToast(null);
              }}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
            >
              Inspect Legacy Preview →
            </button>
          </div>
        </div>
      )}

      {/* Dispatched Email Full Preview Modal */}
      <EmailPreviewModal
        email={modalEmail}
        onClose={() => setModalEmail(null)}
        onNavigateAction={() => {
          if (modalEmail?.category === 'Task Assignment') {
            setActiveTab('tasks');
          } else if (modalEmail?.category === 'Milestone Alert') {
            setActiveTab('invoices');
          } else {
            setActiveTab('projects');
          }
        }}
      />
    </div>
  );
};

const AppRoot: React.FC = () => {
  const { authenticatedUser, clientPortalMode, currentRole } = useApp();

  if (clientPortalMode) {
    return <ClientPortalView />;
  }

  if (!authenticatedUser) {
    return <LoginView />;
  }

  return <MainLayout />;
};

export default function App() {
  return (
    <AppProvider>
      <AppRoot />
    </AppProvider>
  );
}
