import type {UserRole} from '../types';
export const roleTabs:Record<UserRole,string[]>={
 Owner:['dashboard','clients','projects','tasks','manpower','quotations','invoices','procurement','inventory','hrms','employee-portal','pnl','account','email-notifications','storage-usage'],
 'Project Manager':['clients','projects','tasks','manpower','procurement','inventory','hrms','employee-portal'],
 'Site Engineer':['clients','projects','tasks','manpower','procurement','inventory','employee-portal'],
 Designer:['clients','projects','tasks','employee-portal'],
 'Front Office':['clients','projects','quotations','invoices','employee-portal'],
 Marketing:['clients','projects','quotations','employee-portal'],
};
export const canAccessTab=(role:UserRole,tab:string)=>tab==='my-account'||(roleTabs[role]?.includes(tab)??false);
