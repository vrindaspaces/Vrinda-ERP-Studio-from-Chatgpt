
import {OwnerEditButton} from '../common/OwnerRecordEditor';
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Project, Client, PropertyType, BhkType, Milestone, MoodBoard, VendorMilestone, ProjectDocument, DocumentCategory } from '../../types';
import { formatINR, formatDate } from '../../utils/formatters';
import { GanttChartView } from './GanttChartView';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  User,
  Phone,
  MapPin,
  Palette,
  FileCheck,
  Truck,
  Paperclip,
  CheckSquare,
  Sparkles,
  PieChart,
  ArrowRight,
  X,
  FileText,
  FileCode,
  Image as ImageIcon,
  UploadCloud,
  Download,
  Eye,
  Trash2,
  Grid,
  List,
  Layers,
  Stamp,
  Maximize2,
  GitBranch,
  Flame,
  HardHat,
  DollarSign,
  Wallet,
  ArrowUpRight
} from 'lucide-react';

export const ProjectsView: React.FC = () => {
  const {
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
    clients,
    addClient,
    deleteClient,
    employees,
    currentUser,
    currentRole,
    manpower,
    purchaseOrders,
    expenses,
    getProjectCostBreakdown
  } = useApp();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'overview' | 'gantt' | 'milestones' | 'moodboards' | 'vendors' | 'checklist' | 'documents' | 'clients'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showNewMoodBoardModal, setShowNewMoodBoardModal] = useState(false);
  const [showNewVendorMilestoneModal, setShowNewVendorMilestoneModal] = useState(false);

  // Deletion modals state (Owner Authority)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [milestoneToDelete, setMilestoneToDelete] = useState<{ projectId: string; milestone: Milestone } | null>(null);
  const [moodBoardToDelete, setMoodBoardToDelete] = useState<{ projectId: string; moodBoard: MoodBoard } | null>(null);
  const [vendorMilestoneToDelete, setVendorMilestoneToDelete] = useState<{ projectId: string; vm: VendorMilestone } | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [docToDelete, setDocToDelete] = useState<{ projectId: string; doc: ProjectDocument } | null>(null);

  // Document Management System State
  const [docCategoryFilter, setDocCategoryFilter] = useState<string>('All');
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docViewMode, setDocViewMode] = useState<'grid' | 'table'>('grid');
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);

  // Document Upload Form State
  const [uploadDocTitle, setUploadDocTitle] = useState('');
  const [uploadDocCategory, setUploadDocCategory] = useState<DocumentCategory>('Blueprints');
  const [uploadDocVersion, setUploadDocVersion] = useState('v1.0 Approved');
  const [uploadDocFileName, setUploadDocFileName] = useState('');
  const [uploadDocFileSize, setUploadDocFileSize] = useState('3.5 MB');
  const [uploadDocFileType, setUploadDocFileType] = useState<ProjectDocument['fileType']>('PDF');
  const [uploadDocDescription, setUploadDocDescription] = useState('');
  const [uploadDocTags, setUploadDocTags] = useState('Working Drawing, CAD, Approved');
  const [uploadDocUrl, setUploadDocUrl] = useState('');



  const [projectClientId,setProjectClientId]=useState('');
  // Form state for new client & project
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newPropertyType, setNewPropertyType] = useState<PropertyType>('Flat');
  const [newBhkType, setNewBhkType] = useState<BhkType>('3bhk');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newContractValue, setNewContractValue] = useState<number>(0);
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newPMId, setNewPMId] = useState('');
  const [newSEId, setNewSEId] = useState('');
  const [newDesignerId, setNewDesignerId] = useState('');

  // New Mood Board Form State
  const [newMbRoom, setNewMbRoom] = useState('');
  const [newMbTitle, setNewMbTitle] = useState('');
  const [newMbNotes, setNewMbNotes] = useState('');
  const [newMbPalette, setNewMbPalette] = useState('#2A2D34, #EAE0D5, #C6AC8F, #5E503F');
  const [newMbMaterials, setNewMbMaterials] = useState('Smoked Oak Veneer, 18mm BWP Marine Ply, Quartz Slabs');

  // New Vendor Milestone Form State
  const [newVmName, setNewVmName] = useState('');
  const [newVmTrade, setNewVmTrade] = useState('');
  const [newVmScope, setNewVmScope] = useState('');
  const [newVmDueDate, setNewVmDueDate] = useState('');
  const [newVmAttachmentName, setNewVmAttachmentName] = useState('');

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const getProjectCostInfo = (proj: Project) => {
    if (getProjectCostBreakdown) {
      return getProjectCostBreakdown(proj.id);
    }
    const assigned = (manpower || []).filter((m) => m.assignedProjectId === proj.id);
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
    const totalCost = labourCost + materialsCost + otherExpensesCost;
    return {
      labourCost,
      materialsCost,
      otherExpensesCost,
      totalCost,
      assignedManpower: assigned
    };
  };

  const selectedCost = selectedProject
    ? getProjectCostInfo(selectedProject)
    : {
        labourCost: 0,
        materialsCost: 0,
        otherExpensesCost: 0,
        totalCost: 0,
        assignedManpower: []
      };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientAddress.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const client=clients.find(c=>c.id===projectClientId);if(!client)return;

    const pm = employees.find((emp) => emp.id === newPMId);
    const se = employees.find((emp) => emp.id === newSEId);
    const designer = employees.find((emp) => emp.id === newDesignerId);

    const newProject = addProject({
      clientId: client.id,
      title: newProjectTitle || `${client.name} Residence - ${newBhkType.toUpperCase()}`,
      clientName: client.name,
      clientPhone: client.phone,
      clientAddress: client.address,
      propertyType: newPropertyType,
      bhkType: newBhkType,
      projectManagerId: pm?.id || '',
      projectManagerName: pm?.name || 'Unassigned',
      siteEngineerId: se?.id || '',
      siteEngineerName: se?.name || 'Unassigned',
      designerId: designer?.id || '',
      designerName: designer?.name || 'Unassigned',
      status: 'Planning',
      startDate: new Date().toISOString().split('T')[0],
      targetDate: newTargetDate,
      totalContractValue: Number(newContractValue),
      totalReceivedAmount: 0,
      budgetAllocation: {
        civil: Math.round(newContractValue * 0.14),
        modular: Math.round(newContractValue * 0.42),
        falseCeiling: Math.round(newContractValue * 0.1),
        electricalPlumbing: Math.round(newContractValue * 0.08),
        painting: Math.round(newContractValue * 0.08),
        contingency: Math.round(newContractValue * 0.04),
        targetMarginPct: 22
      },
      milestones: [],
      moodBoards: [],
      vendorMilestones: [],
      handoverChecklist: [],
      documents: []
    });

    setSelectedProjectId(newProject.id);
    setShowNewProjectModal(false);
    // Reset inputs
    setNewClientName('');
    setNewClientPhone('');
    setNewClientEmail('');
    setNewClientAddress('');setNewPMId('');setNewSEId('');setNewDesignerId('');setProjectClientId('');setNewProjectTitle('');
  };

  const handleUploadDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !uploadDocTitle) return;

    const tags = uploadDocTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    addProjectDocument(selectedProject.id, {
      projectId: selectedProject.id,
      title: uploadDocTitle,
      category: uploadDocCategory,
      fileName:
        uploadDocFileName ||
        `${uploadDocTitle.replace(/\s+/g, '_')}.${
          uploadDocFileType === 'PDF'
            ? 'pdf'
            : uploadDocFileType === 'CAD / DWG'
            ? 'dwg'
            : uploadDocFileType === 'JPG / Image'
            ? 'jpg'
            : 'pdf'
        }`,
      fileSize: uploadDocFileSize || '2.8 MB',
      fileType: uploadDocFileType,
      version: uploadDocVersion || 'v1.0 Approved',
      uploadedBy: `${currentUser.name} (${currentUser.role})`,
      url: uploadDocUrl,
      previewUrl:
        uploadDocUrl ||
        (uploadDocCategory === 'Site Photographs'
          ? 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1000&auto=format&fit=crop&q=80'
          : uploadDocCategory === 'Blueprints'
          ? 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=1000&auto=format&fit=crop&q=80'),
      description: uploadDocDescription,
      tags
    });

    setShowUploadDocModal(false);
    setUploadDocTitle('');
    setUploadDocDescription('');
    setUploadDocFileName('');
    setUploadDocUrl('');
  };

  const handleAddMoodBoard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newMbRoom || !newMbTitle) return;
    const colors = newMbPalette.split(',').map((c) => c.trim()).filter(Boolean);
    const materials = newMbMaterials.split(',').map((m) => m.trim()).filter(Boolean);

    addMoodBoard(selectedProject.id, {
      room: newMbRoom,
      title: newMbTitle,
      conceptNotes: newMbNotes,
      colorPalette: colors.length > 0 ? colors : ['#2B2A27', '#C4A482', '#E8DFD8'],
      materials: materials.length > 0 ? materials : ['BWP Marine Ply', 'Laminate'],
      approvedByClient: false
    });

    setShowNewMoodBoardModal(false);
    setNewMbRoom('');
    setNewMbTitle('');
    setNewMbNotes('');
  };

  const handleAddVendorMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newVmName || !newVmScope) return;

    addVendorMilestone(selectedProject.id, {
      vendorName: newVmName,
      trade: newVmTrade || 'Modular Carpentry',
      scope: newVmScope,
      status: 'Scheduled',
      completionPct: 0,
      dueDate: newVmDueDate || '2026-11-01',
      attachments: newVmAttachmentName
        ? [
            {
              name: newVmAttachmentName,
              size: '1.2 MB',
              date: new Date().toISOString().split('T')[0]
            }
          ]
        : []
    });

    setShowNewVendorMilestoneModal(false);
    setNewVmName('');
    setNewVmTrade('');
    setNewVmScope('');
    setNewVmAttachmentName('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Projects
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Villa and Flat turnkeys, milestone progression, architectural mood boards, vendor scopes, and handover audits
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
        {currentRole==='Owner' && <button
          onClick={() => setShowNewProjectModal(true)}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Project</span>
        </button>}</div>
      </div>


      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by client name, villa/flat address, or project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {['All', 'Planning', 'Execution', 'Finishing', 'Handover'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Project Selector List (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Projects ({filteredProjects.length})
          </p>

          <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1">
            {filteredProjects.map((p) => {
              const isSelected = p.id === selectedProjectId;
              const progressPct =
                p.milestones.length > 0
                  ? Math.round(
                      p.milestones.reduce((acc, m) => acc + m.percentage, 0) / p.milestones.length
                    )
                  : 0;

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white border-amber-600/80 shadow-sm ring-1 ring-amber-600/30'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 line-clamp-1">{p.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          p.status === 'Execution'
                            ? 'bg-blue-50 text-blue-700'
                            : p.status === 'Finishing'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {p.status}
                      </span>
                      {currentRole === 'Owner' && (
                        <><OwnerEditButton collection="projects" record={p} /><button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectToDelete(p);
                          }}
                          className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Project (Owner Authority)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button></>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mt-1">{p.clientName}</p>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-2">
                    <span className="font-medium text-slate-700">{p.propertyType}</span>
                    <span>·</span>
                    <span className="font-mono">{p.bhkType.toUpperCase()}</span>
                    <span>·</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      {formatINR(p.totalContractValue)}
                    </span>
                  </div>

                  {(() => {
                    const cardCost = getProjectCostInfo(p);
                    return (
                      <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] gap-1">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <span className="text-slate-400">Project Cost:</span>
                          <span className="font-mono font-bold text-slate-900">{formatINR(cardCost.totalCost)}</span>
                        </div>
                        {cardCost.labourCost > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200" title="Includes automatically added manpower wages">
                            <HardHat className="w-2.5 h-2.5 text-amber-600" /> Wages: {formatINR(cardCost.labourCost)}
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  {/* Micro progress bar */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Progress: {progressPct}%</span>
                    <span className="font-mono">Due {formatDate(p.targetDate)}</span>
                  </div>
                </div>
              );
            })}

            {filteredProjects.length === 0 && (
              <div className="text-center p-8 bg-white border border-slate-200 rounded-xl text-xs text-slate-500">
                No residential projects match your search criteria.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Project Details & Deep Tabs (8 Cols) */}
        {selectedProject ? (
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl flex flex-col">
            {/* Project Banner Header */}
            <div className="p-6 border-b border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{selectedProject.title}</h2>
                    <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                      {selectedProject.propertyType} · {selectedProject.bhkType.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{selectedProject.clientAddress}</span>
                  </p>
                </div>

                <div className="flex flex-col sm:items-end gap-2">
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-slate-500">Contract Value</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                      {formatINR(selectedProject.totalContractValue)}
                    </p>
                    <p className="text-xs text-emerald-600 font-semibold font-mono">
                      Received: {formatINR(selectedProject.totalReceivedAmount)} (
                      {Math.round(
                        (selectedProject.totalReceivedAmount / selectedProject.totalContractValue) * 100
                      )}
                      %)
                    </p>
                  </div>
                  {currentRole === 'Owner' && (
                    <><OwnerEditButton collection="projects" record={selectedProject} /><button
                      onClick={() => setProjectToDelete(selectedProject)}
                      className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
                      title="Permanently delete project (Owner Authority)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Project</span>
                    </button></>
                  )}
                </div>
              </div>

              {/* Stakeholders pill strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    <strong className="text-slate-800">PM:</strong> {selectedProject.projectManagerName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    <strong className="text-slate-800">Site Eng:</strong> {selectedProject.siteEngineerName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Palette className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    <strong className="text-slate-800">Designer:</strong> {selectedProject.designerName}
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-Tab Navigation */}
            <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 overflow-x-auto text-xs">
              {[
                { id: 'overview', label: 'Budget & Overview', icon: PieChart },
                { id: 'gantt', label: 'Gantt & Critical Path', icon: GitBranch },
                { id: 'milestones', label: 'Milestones & Timeline', icon: Calendar },
                { id: 'moodboards', label: 'Mood Boards', icon: Palette },
                { id: 'vendors', label: 'Vendor Milestones', icon: Truck },
                { id: 'checklist', label: 'Handover Checklist', icon: CheckSquare },
                { id: 'documents', label: 'Document Vault', icon: FileText },
                { id: 'clients', label: 'Client Directory', icon: User }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Body Content */}
            <div className={`p-6 flex-1 overflow-y-auto ${activeTab === 'gantt' ? 'max-h-[950px]' : 'max-h-[600px]'}`}>
              {/* TAB: Gantt & Critical Path Timeline */}
              {activeTab === 'gantt' && selectedProject && (
                <GanttChartView project={selectedProject} />
              )}

              {/* TAB 1: Budget & Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">
                      Project Budget Allocation & Target Margin
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Internal cost allocations by trade with planned {selectedProject.budgetAllocation.targetMarginPct}% gross margin
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-[11px] text-slate-500">Modular Woodwork</span>
                        <p className="text-sm font-bold font-mono text-slate-900 mt-1">
                          {formatINR(selectedProject.budgetAllocation.modular)}
                        </p>
                        <span className="text-[10px] text-slate-400">Plywood, laminates, hardware</span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-[11px] text-slate-500">Civil & Demolition</span>
                        <p className="text-sm font-bold font-mono text-slate-900 mt-1">
                          {formatINR(selectedProject.budgetAllocation.civil)}
                        </p>
                        <span className="text-[10px] text-slate-400">Masonry, tile cutting, granite</span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-[11px] text-slate-500">False Ceiling</span>
                        <p className="text-sm font-bold font-mono text-slate-900 mt-1">
                          {formatINR(selectedProject.budgetAllocation.falseCeiling)}
                        </p>
                        <span className="text-[10px] text-slate-400">Gypsum, channels, coves</span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-[11px] text-slate-500">Electrical & Plumbing</span>
                        <p className="text-sm font-bold font-mono text-slate-900 mt-1">
                          {formatINR(selectedProject.budgetAllocation.electricalPlumbing)}
                        </p>
                        <span className="text-[10px] text-slate-400">Conduits, CPVC, profiles</span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-[11px] text-slate-500">Painting & Finishing</span>
                        <p className="text-sm font-bold font-mono text-slate-900 mt-1">
                          {formatINR(selectedProject.budgetAllocation.painting)}
                        </p>
                        <span className="text-[10px] text-slate-400">Emulsion, PU polish, putty</span>
                      </div>
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <span className="text-[11px] text-emerald-700 font-medium">Target Company Margin</span>
                        <p className="text-sm font-bold font-mono text-emerald-800 mt-1">
                          {selectedProject.budgetAllocation.targetMarginPct}% (
                          {formatINR(
                            selectedProject.totalContractValue *
                              (selectedProject.budgetAllocation.targetMarginPct / 100)
                          )}
                          )
                        </p>
                        <span className="text-[10px] text-emerald-600">Company net contribution</span>
                      </div>
                    </div>
                  </div>

                  {/* Client Contact & Notes */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Client Brief & Contact Dossier
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                      <div>
                        <span className="text-slate-400">Full Name:</span> {selectedProject.clientName}
                      </div>
                      <div>
                        <span className="text-slate-400">Phone:</span> {selectedProject.clientPhone}
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-slate-400">Site Location:</span> {selectedProject.clientAddress}
                      </div>
                      {selectedProject.notes && (
                        <div className="sm:col-span-2 text-slate-700 italic">
                          "{selectedProject.notes}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Milestones & Activity Progress */}
              {activeTab === 'milestones' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Site Milestones & Activity Progress</h3>
                      <p className="text-xs text-slate-500">
                        Tracks physical % progress and automated client milestone payment triggers
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedProject.milestones.map((m, idx) => (
                      <div
                        key={m.id}
                        className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors bg-white"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-slate-400">0{idx + 1}.</span>
                              <span className="text-xs font-bold text-slate-900">{m.name}</span>
                              <span
                                className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                                  m.status === 'Completed'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : m.status === 'In Progress'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {m.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">{m.notes}</p>
                          </div>

                          <div className="flex items-center gap-3 sm:text-right">
                            <div>
                              <p className="text-[11px] text-slate-500">Payment Milestone</p>
                              <p className="text-xs font-bold font-mono tabular-nums text-slate-900">
                                {m.paymentDuePct}% ({formatINR(m.paymentAmount)})
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  const nextPct = m.percentage === 100 ? 0 : 100;
                                  const nextStatus = nextPct === 100 ? 'Completed' : 'In Progress';
                                  updateMilestone(selectedProject.id, m.id, {
                                    percentage: nextPct,
                                    status: nextStatus
                                  });
                                }}
                                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                                  m.status === 'Completed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-900 text-white hover:bg-slate-800'
                                }`}
                              >
                                {m.status === 'Completed' ? 'Completed ✓' : 'Mark Complete'}
                              </button>
                              {currentRole === 'Owner' && (
                                <button
                                  onClick={() => setMilestoneToDelete({ projectId: selectedProject.id, milestone: m })}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  title="Delete Milestone (Owner Authority)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar & Slider */}
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={m.percentage}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateMilestone(selectedProject.id, m.id, {
                                percentage: val,
                                status: val === 100 ? 'Completed' : val > 0 ? 'In Progress' : 'Pending'
                              });
                            }}
                            className="flex-1 accent-slate-900 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                          />
                          <span className="text-xs font-mono font-bold text-slate-800 w-12 text-right">
                            {m.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: Mood Boards */}
              {activeTab === 'moodboards' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Architectural & Interior Mood Boards</h3>
                      <p className="text-xs text-slate-500">
                        Design themes, curated palettes, and materials approved with homeowner
                      </p>
                    </div>
                    {['Owner','Designer'].includes(currentRole) && <button
                      onClick={() => setShowNewMoodBoardModal(true)}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Mood Board</span>
                    </button>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedProject.moodBoards.map((mb) => (
                      <div
                        key={mb.id}
                        className="border border-slate-200 rounded-xl overflow-hidden bg-white hover:border-slate-300 transition-colors"
                      >
                        {/* Styled visual gradient header representing architectural board */}
                        <div className="h-32 bg-gradient-to-br from-slate-900 via-neutral-800 to-amber-950 p-4 flex flex-col justify-between text-white relative">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300">
                              {mb.room}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {mb.approvedByClient && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-400/30">
                                  Approved by Client
                                </span>
                              )}
                              {currentRole === 'Owner' && (
                                <button
                                  onClick={() => setMoodBoardToDelete({ projectId: selectedProject.id, moodBoard: mb })}
                                  className="p-1 bg-black/40 text-white/80 hover:text-white hover:bg-rose-600 rounded transition-colors"
                                  title="Delete Mood Board (Owner Authority)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <h4 className="text-sm font-bold tracking-tight">{mb.title}</h4>
                        </div>

                        <div className="p-4 space-y-3">
                          <p className="text-xs text-slate-600 leading-relaxed">{mb.conceptNotes}</p>

                          {/* Color Palette swatches */}
                          <div>
                            <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                              Color Harmony Palette
                            </span>
                            <div className="flex items-center gap-2">
                              {mb.colorPalette.map((color, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-1">
                                  <div
                                    className="w-7 h-7 rounded-md border border-slate-300 shadow-xs"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="text-[9px] font-mono text-slate-500 uppercase">
                                    {color}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Materials tags */}
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                              Specified Materials
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {mb.materials.map((mat, idx) => (
                                <span
                                  key={idx}
                                  className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded"
                                >
                                  {mat}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {selectedProject.moodBoards.length === 0 && (
                      <div className="col-span-2 text-center p-8 border border-dashed border-slate-300 rounded-xl text-xs text-slate-500">
                        No mood boards created yet. Click "Add Mood Board" to add room palettes & materials.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Vendor Milestones & Attachments */}
              {activeTab === 'vendors' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Vendor Milestones & File Attachments
                      </h3>
                      <p className="text-xs text-slate-500">
                        External supplier milestones with challans, test certificates, and delivery documents
                      </p>
                    </div>
                    {['Owner','Project Manager','Site Engineer'].includes(currentRole) && <button
                      onClick={() => setShowNewVendorMilestoneModal(true)}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Vendor Milestone</span>
                    </button>}
                  </div>

                  <div className="space-y-3">
                    {selectedProject.vendorMilestones.map((vm) => (
                      <div
                        key={vm.id}
                        className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors bg-white space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{vm.vendorName}</span>
                              <span className="text-[11px] text-slate-400">·</span>
                              <span className="text-xs text-slate-600 font-medium">{vm.trade}</span>
                              <span
                                className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                                  vm.status === 'Delivered' || vm.status === 'Inspected'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-blue-50 text-blue-700'
                                }`}
                              >
                                {vm.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">{vm.scope}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <span className="text-xs font-mono text-slate-500">
                                Due: {formatDate(vm.dueDate)}
                              </span>
                              <p className="text-xs font-bold text-slate-800 mt-0.5">
                                {vm.completionPct}% Complete
                              </p>
                            </div>
                            {currentRole === 'Owner' && (
                              <button
                                onClick={() => setVendorMilestoneToDelete({ projectId: selectedProject.id, vm })}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Delete Vendor Milestone (Owner Authority)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* File attachments list */}
                        {vm.attachments.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                            {vm.attachments.map((file, fIdx) => (
                              <div
                                key={fIdx}
                                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700"
                              >
                                <Paperclip className="w-3 h-3 text-slate-400" />
                                <span className="font-medium">{file.name}</span>
                                <span className="text-[10px] text-slate-400">({file.size})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {selectedProject.vendorMilestones.length === 0 && (
                      <div className="text-center p-8 border border-dashed border-slate-300 rounded-xl text-xs text-slate-500">
                        No vendor milestones recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: Complete Interior Handover Checklist */}
              {activeTab === 'checklist' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Complete Interior Handover Audit Checklist
                      </h3>
                      <p className="text-xs text-slate-500">
                        Comprehensive quality verification protocol prior to final key handover to homeowner
                      </p>
                    </div>

                    <div className="text-xs font-mono font-bold text-slate-800">
                      {selectedProject.handoverChecklist.filter((c) => c.checked).length} of{' '}
                      {selectedProject.handoverChecklist.length} Verified
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden">
                    {selectedProject.handoverChecklist.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3.5 flex items-start gap-3 transition-colors ${
                          item.checked ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) =>
                            updateHandoverChecklist(selectedProject.id, item.id, e.target.checked)
                          }
                          className="mt-0.5 accent-slate-900 w-4 h-4 rounded cursor-pointer"
                        />
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.category}
                            </span>
                            <span
                              className={`text-xs font-medium ${
                                item.checked ? 'text-slate-500 line-through' : 'text-slate-900'
                              }`}
                            >
                              {item.item}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            {item.verifiedBy && (
                              <span className="text-emerald-700 font-medium">
                                Verified by {item.verifiedBy}
                              </span>
                            )}
                            {item.remarks && (
                              <span className="text-slate-500 italic">Notes: {item.remarks}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: Document Management System (Blueprints, Contracts, Site Photographs) */}
              {activeTab === 'documents' && (
                <div className="space-y-5">
                  {/* Top Bar with Search, View Mode Toggle and Upload CTA */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <span>Document Vault & Architectural Repository</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Blueprints, turnkey contracts, site progress photographs, and RWA NOC clearances
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setDocViewMode('grid')}
                          className={`p-1.5 rounded-md transition-colors ${
                            docViewMode === 'grid'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                          title="Grid View"
                        >
                          <Grid className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDocViewMode('table')}
                          className={`p-1.5 rounded-md transition-colors ${
                            docViewMode === 'table'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                          title="Table View"
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {['Owner','Project Manager','Site Engineer','Designer'].includes(currentRole) && <button
                        onClick={() => setShowUploadDocModal(true)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload Document</span>
                      </button>}
                    </div>
                  </div>

                  {/* Category Pills & Search */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                      {['All', 'Blueprints', 'Contracts', 'Site Photographs', 'Approvals & NOC', 'Specifications'].map(
                        (cat) => {
                          const count =
                            cat === 'All'
                              ? (selectedProject.documents || []).length
                              : (selectedProject.documents || []).filter((d) => d.category === cat).length;

                          return (
                            <button
                              key={cat}
                              onClick={() => setDocCategoryFilter(cat)}
                              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                                docCategoryFilter === cat
                                  ? 'bg-slate-900 text-white font-semibold'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              <span>{cat}</span>
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                  docCategoryFilter === cat
                                    ? 'bg-slate-800 text-slate-200'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {count}
                              </span>
                            </button>
                          );
                        }
                      )}
                    </div>

                    <div className="relative max-w-xs w-full">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search title, tag, format..."
                        value={docSearchQuery}
                        onChange={(e) => setDocSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 bg-slate-50/50"
                      />
                    </div>
                  </div>

                  {/* Documents Display */}
                  {(() => {
                    const filteredDocs = (selectedProject.documents || []).filter((d) => {
                      const matchesCat = docCategoryFilter === 'All' || d.category === docCategoryFilter;
                      const matchesQuery =
                        d.title.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                        d.fileName.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                        (d.description || '').toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                        (d.tags || []).some((t) => t.toLowerCase().includes(docSearchQuery.toLowerCase())) ||
                        d.uploadedBy.toLowerCase().includes(docSearchQuery.toLowerCase());
                      return matchesCat && matchesQuery;
                    });

                    if (filteredDocs.length === 0) {
                      return (
                        <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/40 text-xs text-slate-500 space-y-2">
                          <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                          <p className="font-semibold text-slate-700">No documents found</p>
                          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                            Upload blueprints, legal contracts, or site inspection photographs for this project.
                          </p>
                          {['Owner','Project Manager','Site Engineer','Designer'].includes(currentRole) && <button
                            onClick={() => setShowUploadDocModal(true)}
                            className="mt-2 px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-semibold hover:bg-slate-800"
                          >
                            + Upload First Document
                          </button>}
                        </div>
                      );
                    }

                    if (docViewMode === 'grid') {
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredDocs.map((doc) => {
                            const isPhoto = doc.category === 'Site Photographs';
                            const isBlueprint = doc.category === 'Blueprints';
                            const isContract = doc.category === 'Contracts';

                            return (
                              <div
                                key={doc.id}
                                className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
                              >
                                <div>
                                  {/* Visual Card Banner */}
                                  <div
                                    onClick={() => setPreviewDoc(doc)}
                                    className="h-36 bg-slate-900 relative cursor-pointer group overflow-hidden"
                                  >
                                    {doc.previewUrl ? (
                                      <img
                                        src={doc.previewUrl}
                                        alt={doc.title}
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                    ) : (
                                      <div
                                        className={`w-full h-full flex flex-col items-center justify-center p-4 text-center ${
                                          isBlueprint
                                            ? 'bg-blue-950 text-blue-200'
                                            : isContract
                                            ? 'bg-neutral-900 text-amber-200'
                                            : 'bg-slate-900 text-slate-300'
                                        }`}
                                      >
                                        {isBlueprint ? (
                                          <FileCode className="w-8 h-8 opacity-70 mb-1" />
                                        ) : isContract ? (
                                          <Stamp className="w-8 h-8 opacity-70 mb-1" />
                                        ) : (
                                          <FileText className="w-8 h-8 opacity-70 mb-1" />
                                        )}
                                        <span className="text-[10px] font-mono tracking-widest uppercase opacity-80">
                                          {doc.category}
                                        </span>
                                      </div>
                                    )}

                                    {/* Gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30" />

                                    {/* Top badges */}
                                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                                      <span
                                        className={`text-[9px] font-semibold px-2 py-0.5 rounded shadow-xs ${
                                          isBlueprint
                                            ? 'bg-blue-600 text-white'
                                            : isContract
                                            ? 'bg-amber-600 text-white'
                                            : isPhoto
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-800 text-slate-200'
                                        }`}
                                      >
                                        {doc.category}
                                      </span>
                                      <span className="text-[9px] font-mono bg-black/60 backdrop-blur-xs text-white px-1.5 py-0.5 rounded">
                                        {doc.fileType} · {doc.fileSize}
                                      </span>
                                    </div>

                                    {/* Bottom hover click affordance */}
                                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-xs text-slate-900 text-[10px] font-semibold px-2 py-1 rounded flex items-center gap-1 shadow-sm">
                                      <Eye className="w-3 h-3" />
                                      <span>Click to Inspect</span>
                                    </div>
                                  </div>

                                  {/* Content info */}
                                  <div className="p-3.5 space-y-2">
                                    <div className="flex items-start justify-between gap-1">
                                      <h4
                                        onClick={() => setPreviewDoc(doc)}
                                        className="text-xs font-bold text-slate-900 hover:text-amber-700 cursor-pointer line-clamp-2 leading-snug"
                                      >
                                        {doc.title}
                                      </h4>
                                    </div>

                                    {doc.description && (
                                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                                        {doc.description}
                                      </p>
                                    )}

                                    {/* Tags */}
                                    {doc.tags && doc.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 pt-1">
                                        {doc.tags.map((t, tidx) => (
                                          <span
                                            key={tidx}
                                            className="text-[9px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                                          >
                                            #{t}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Footer metadata & actions */}
                                <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                                  <div>
                                    <span className="font-mono text-slate-700 font-bold block">
                                      {doc.version}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {formatDate(doc.uploadedAt)}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => setPreviewDoc(doc)}
                                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded transition-colors"
                                      title="Preview Document"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = doc.previewUrl || '#';
                                        link.download = doc.fileName;
                                        link.target = '_blank';
                                        link.click();
                                      }}
                                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded transition-colors"
                                      title="Download File"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setDocToDelete({ projectId: selectedProject.id, doc })}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                      title="Delete Document"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    // Table View
                    return (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                              <th className="py-3 px-4">Document Title & File</th>
                              <th className="py-3 px-3">Category</th>
                              <th className="py-3 px-3">Format / Size</th>
                              <th className="py-3 px-3">Revision</th>
                              <th className="py-3 px-3">Uploaded By</th>
                              <th className="py-3 px-4 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredDocs.map((doc) => (
                              <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-4">
                                  <div
                                    onClick={() => setPreviewDoc(doc)}
                                    className="font-bold text-slate-900 hover:text-amber-700 cursor-pointer"
                                  >
                                    {doc.title}
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                    {doc.fileName}
                                  </span>
                                </td>

                                <td className="py-3 px-3">
                                  <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                      doc.category === 'Blueprints'
                                        ? 'bg-blue-50 text-blue-700'
                                        : doc.category === 'Contracts'
                                        ? 'bg-amber-50 text-amber-700'
                                        : doc.category === 'Site Photographs'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {doc.category}
                                  </span>
                                </td>

                                <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                                  {doc.fileType} · {doc.fileSize}
                                </td>

                                <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                                  {doc.version}
                                </td>

                                <td className="py-3 px-3 text-slate-600">
                                  <div>{doc.uploadedBy}</div>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    {formatDate(doc.uploadedAt)}
                                  </span>
                                </td>

                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => setPreviewDoc(doc)}
                                      className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100"
                                      title="Preview"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = doc.previewUrl || '#';
                                        link.download = doc.fileName;
                                        link.target = '_blank';
                                        link.click();
                                      }}
                                      className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100"
                                      title="Download"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setDocToDelete({ projectId: selectedProject.id, doc })}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 8: Client Directory & Accounts */}
              {activeTab === 'clients' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-500" />
                        <span>Registered Homeowners & Client Accounts</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Client profiles, contact details, site addresses, and linked turnkey projects
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clients.map((c) => {
                      const clientProjects = projects.filter(
                        (p) => p.clientId === c.id || p.clientName.toLowerCase() === c.name.toLowerCase()
                      );
                      const totalContract = clientProjects.reduce((sum, p) => sum + p.totalContractValue, 0);

                      return (
                        <div
                          key={c.id}
                          className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all shadow-xs space-y-3 flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-sm font-bold text-slate-900">{c.name}</h4>
                                <span className="text-[10px] font-mono text-slate-400">ID: {c.id}</span>
                              </div>
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">
                                {clientProjects.length} {clientProjects.length === 1 ? 'Project' : 'Projects'}
                              </span>
                            </div>

                            <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                              <p className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span>{c.phone}</span>
                              </p>
                              {c.email && (
                                <p className="text-slate-500 text-[11px] truncate">
                                  Email: {c.email}
                                </p>
                              )}
                              <p className="text-slate-500 text-[11px] flex items-start gap-1.5 pt-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                <span>{c.address}</span>
                              </p>
                              <p className="font-mono text-slate-900 font-bold pt-1">
                                Total Value: {formatINR(totalContract)}
                              </p>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-mono text-[10px]">Since {formatDate(c.createdAt)}</span>
                            {currentRole === 'Owner' && (
                              <><OwnerEditButton collection="clients" record={c} /><button
                                onClick={() => setClientToDelete(c)}
                                className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                                title="Delete Client Record (Owner Authority)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Client</span>
                              </button></>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Modal: Upload Project Document */}
      {showUploadDocModal && selectedProject && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Upload Project Document</h3>
                <p className="text-xs text-slate-500">
                  Categorize blueprints, turnkey contracts, site photographs, or society NOCs
                </p>
              </div>
              <button
                onClick={() => setShowUploadDocModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDocument} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Document Category *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['Blueprints', 'Contracts', 'Site Photographs', 'Approvals & NOC', 'Specifications'] as DocumentCategory[]).map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setUploadDocCategory(cat);
                          if (cat === 'Blueprints') setUploadDocFileType('CAD / DWG');
                          else if (cat === 'Site Photographs') setUploadDocFileType('JPG / Image');
                          else setUploadDocFileType('PDF');
                        }}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          uploadDocCategory === cat
                            ? 'border-slate-900 bg-slate-900 text-white font-semibold'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-xs">{cat}</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    uploadDocCategory === 'Blueprints'
                      ? 'e.g. Master Bedroom 2D Wardrobe Elevation & False Ceiling Cut-List'
                      : uploadDocCategory === 'Contracts'
                      ? 'e.g. Signed Turnkey Interior Execution Agreement'
                      : 'e.g. Laser Alignment Verification of Living Room Teak Wall'
                  }
                  value={uploadDocTitle}
                  onChange={(e) => setUploadDocTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              {/* Interactive File Upload Area */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Select or Drop Document File</label>
                <div className="border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors rounded-xl p-4 text-center bg-slate-50/50">
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-600 font-medium">
                    Drag and drop file here, or{' '}
                    <label className="text-amber-700 font-semibold cursor-pointer hover:underline">
                      browse local device
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadDocFileName(file.name);
                            const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
                            setUploadDocFileSize(`${sizeInMb} MB`);
                            if (file.name.endsWith('.dwg') || file.name.endsWith('.dxf')) {
                              setUploadDocFileType('CAD / DWG');
                            } else if (file.type.includes('image')) {
                              setUploadDocFileType('JPG / Image');
                              const reader = new FileReader();
                              reader.onload = () => {
                                setUploadDocUrl(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            } else {
                              setUploadDocFileType('PDF');
                            }
                          }
                        }}
                      />
                    </label>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Supports AutoCAD (.dwg, .dxf), Blueprints (.pdf), High-res Photos (.jpg, .png), Contracts (.pdf, .docx)
                  </p>

                  {uploadDocFileName && (
                    <div className="mt-2.5 inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-md text-xs font-mono font-medium">
                      <span>✓ Selected: {uploadDocFileName}</span>
                      <span>({uploadDocFileSize})</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Revision / Version</label>
                  <input
                    type="text"
                    value={uploadDocVersion}
                    onChange={(e) => setUploadDocVersion(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none font-mono"
                    placeholder="v1.0 Approved"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">File Format</label>
                  <select
                    value={uploadDocFileType}
                    onChange={(e) => setUploadDocFileType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none bg-white font-mono"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="CAD / DWG">CAD / DWG Blueprint</option>
                    <option value="JPG / Image">JPG / High-Res Image</option>
                    <option value="DOCX">DOCX Agreement</option>
                    <option value="ZIP">ZIP Bundle</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">File Size</label>
                  <input
                    type="text"
                    value={uploadDocFileSize}
                    onChange={(e) => setUploadDocFileSize(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none font-mono"
                    placeholder="e.g. 4.2 MB"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Revision Notes / Specifications
                </label>
                <textarea
                  rows={2}
                  placeholder="Detail changes made, coordination checks with MEP, or client approval stamps..."
                  value={uploadDocDescription}
                  onChange={(e) => setUploadDocDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. AutoCAD, Electrical, Signed, Kitchen"
                  value={uploadDocTags}
                  onChange={(e) => setUploadDocTags(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowUploadDocModal(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                >
                  Upload & Archive Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Interactive Document Inspection & Preview */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-4 flex flex-col max-h-[94vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    previewDoc.category === 'Blueprints'
                      ? 'bg-blue-600 text-white'
                      : previewDoc.category === 'Contracts'
                      ? 'bg-amber-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {previewDoc.category}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-none">{previewDoc.title}</h3>
                  <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">
                    {previewDoc.fileName} · {previewDoc.version} · {previewDoc.fileSize}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = previewDoc.previewUrl || '#';
                    link.download = previewDoc.fileName;
                    link.target = '_blank';
                    link.click();
                  }}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Viewer Workspace */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-100">
              {/* Specialized Blueprint Viewer */}
              {previewDoc.category === 'Blueprints' && (
                <div className="bg-[#0B1A30] text-blue-200 rounded-xl p-6 border border-blue-900 shadow-inner relative overflow-hidden font-mono text-xs">
                  {/* Blueprint Grid Watermark */}
                  <div
                    className="absolute inset-0 opacity-15 pointer-events-none"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
                      backgroundSize: '24px 24px'
                    }}
                  />

                  {/* Title Block on Blueprint */}
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-800/80 pb-3 mb-4">
                    <div>
                      <span className="text-[10px] tracking-widest text-blue-400 uppercase font-bold">
                        VRINDA SPACES ARCHITECTURAL STUDIO · DWG SHEET
                      </span>
                      <h4 className="text-base font-bold text-white tracking-wide mt-0.5">
                        {previewDoc.title}
                      </h4>
                    </div>
                    <div className="text-right text-[11px] text-blue-300 mt-2 sm:mt-0">
                      <span className="bg-blue-900/60 px-2 py-0.5 rounded border border-blue-700/60">
                        {previewDoc.version}
                      </span>
                    </div>
                  </div>

                  {/* Visual Blueprint Rendering */}
                  <div className="relative z-10 my-4 bg-slate-950/80 rounded-lg border border-blue-800/60 p-4 max-h-[380px] overflow-hidden flex items-center justify-center">
                    {previewDoc.previewUrl ? (
                      <img
                        src={previewDoc.previewUrl}
                        alt="Architectural Blueprint"
                        className="max-h-[340px] w-auto object-contain rounded"
                      />
                    ) : (
                      <div className="py-16 text-center text-blue-300">
                        <FileCode className="w-12 h-12 mx-auto mb-2 text-blue-400" />
                        <p className="font-sans font-semibold">CAD Working Drawing Active</p>
                        <p className="text-[11px] text-blue-400 font-mono">Scale 1:50 · Metric Coordinates</p>
                      </div>
                    )}
                  </div>

                  {/* Bottom Technical Seal */}
                  <div className="relative z-10 pt-3 border-t border-blue-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-blue-300">
                    <div>
                      <strong className="text-white">Drawn By:</strong> {previewDoc.uploadedBy} ·{' '}
                      <strong className="text-white">Checked By:</strong> Principal Architect
                    </div>
                    <div className="text-emerald-400 font-semibold mt-1 sm:mt-0">
                      APPROVED FOR SITE CONSTRUCTION ✓
                    </div>
                  </div>
                </div>
              )}

              {/* Specialized Contract Viewer */}
              {previewDoc.category === 'Contracts' && (
                <div className="bg-white rounded-xl p-8 border border-slate-300 shadow-sm text-xs text-slate-800 max-w-2xl mx-auto space-y-4">
                  {/* Government Stamp Paper Header Header simulation */}
                  <div className="p-3 bg-amber-50/70 border border-amber-300/80 rounded text-center text-[10px] font-mono text-amber-900 tracking-wider font-bold">
                    GOVERNMENT OF KARNATAKA · NON-JUDICIAL E-STAMP CERTIFICATE IN-KA1098472910385
                  </div>

                  <div className="text-center pb-3 border-b border-slate-200">
                    <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">
                      {previewDoc.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Execution Date: {formatDate(previewDoc.uploadedAt)} · Document Ref: {previewDoc.fileName}
                    </p>
                  </div>

                  <div className="space-y-3 leading-relaxed text-slate-700">
                    <p>
                      <strong>BETWEEN:</strong> <strong>Vrinda Spaces LLP</strong>, an interior architectural
                      firm having principal registered office at Kadubeesanahalli ORR, Bengaluru (hereinafter
                      referred to as the "Contractor");
                    </p>
                    <p>
                      <strong>AND:</strong> The Homeowner client as specified in Project Schedule A
                      (hereinafter referred to as the "Employer").
                    </p>
                    <p>
                      <strong>SCOPE OF WORKS:</strong> Turnkey execution of interior woodwork using IS:710
                      Greenply Club Prime calibrated marine plywood, Blum/Hettich soft-close hardware, false
                      ceiling gypsum framing, Asian Paints Royale emulsion finishes, and electrical/plumbing
                      integrations.
                    </p>
                    <p>
                      <strong>WARRANTY & DEFECT LIABILITY:</strong> Contractor provides comprehensive 10-year
                      replacement structural warranty against termite and delamination on all specified BWP
                      plywood, and 12-month defect liability period on site workmanship.
                    </p>
                  </div>

                  {/* Signature Seal */}
                  <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-[11px]">
                    <div>
                      <p className="font-semibold text-slate-900 mb-8">For Employer / Client:</p>
                      <div className="border-t border-slate-300 pt-1 text-slate-500">
                        Authorized Signature & Date
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900 mb-8">For Vrinda Spaces LLP:</p>
                      <div className="border-t border-slate-300 pt-1 text-slate-500">
                        Designated Partner / Signatory
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Specialized Site Photograph Viewer */}
              {previewDoc.category === 'Site Photographs' && (
                <div className="bg-slate-950 text-white rounded-xl overflow-hidden border border-slate-800">
                  <div className="max-h-[460px] overflow-hidden flex items-center justify-center bg-black">
                    <img
                      src={previewDoc.previewUrl}
                      alt={previewDoc.title}
                      referrerPolicy="no-referrer"
                      className="max-h-[460px] w-auto object-contain"
                    />
                  </div>
                  <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-bold text-white block">{previewDoc.title}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">{previewDoc.description}</p>
                    </div>
                    <div className="text-left sm:text-right font-mono text-[11px] text-slate-400">
                      <span>Verified by {previewDoc.uploadedBy}</span>
                      <span className="block text-emerald-400 font-semibold">QA Level Checked ✓</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Other Document types (Approvals, Specifications) */}
              {previewDoc.category !== 'Blueprints' &&
                previewDoc.category !== 'Contracts' &&
                previewDoc.category !== 'Site Photographs' && (
                  <div className="bg-white rounded-xl p-8 border border-slate-200 text-xs text-slate-700 space-y-3">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                      <FileCheck className="w-5 h-5 text-emerald-600" />
                      <span>{previewDoc.title}</span>
                    </div>
                    <p className="leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200/80">
                      {previewDoc.description || 'Official compliance document archived in project dossier.'}
                    </p>
                    <div className="text-[11px] text-slate-500 font-mono">
                      File: {previewDoc.fileName} · Size: {previewDoc.fileSize} · Uploaded by {previewDoc.uploadedBy} on {formatDate(previewDoc.uploadedAt)}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New Client & Project */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden my-8">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Project</h3>
                <p className="text-xs text-slate-500">
                  Select an existing client, enter project details, and choose the project team
                </p>
              </div>
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form role="dialog" aria-modal="true" aria-label="Add Project" onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><label className="text-xs font-semibold block mb-1">Client *</label><select aria-label="Project client" required value={projectClientId} onChange={e=>{setProjectClientId(e.target.value);const client=clients.find(c=>c.id===e.target.value);if(client){setNewPropertyType(client.propertyType);setNewBhkType(client.bhkType)}}} className="w-full border p-2 rounded-lg text-xs"><option value="">Select an existing client</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}</select>{!clients.length&&<p className="text-xs text-slate-500 mt-2">Open Clients in the navigation and use Add Client first.</p>}</div>
                {/* Project Title */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Project Working Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Prestige Silver Oak Villa 18"
                    value={newProjectTitle}
                    onChange={(e) => setNewProjectTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                  />
                </div>

                {/* Property Type Dropdown (Villa or Flat) */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Property Type *
                  </label>
                  <select
                    value={newPropertyType}
                    onChange={(e) => setNewPropertyType(e.target.value as PropertyType)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white"
                  >
                    <option value="Villa">Villa</option>
                    <option value="Flat">Flat / Apartment</option>
                  </select>
                </div>

                {/* BHK Dropdown (2bhk, 2.5bhk, 3bhk, 3.5bhk, 4bhk) */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Configuration (BHK) *
                  </label>
                  <select
                    value={newBhkType}
                    onChange={(e) => setNewBhkType(e.target.value as BhkType)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white"
                  >
                    <option value="2bhk">2 BHK</option>
                    <option value="2.5bhk">2.5 BHK</option>
                    <option value="3bhk">3 BHK</option>
                    <option value="3.5bhk">3.5 BHK</option>
                    <option value="4bhk">4 BHK</option>
                  </select>
                </div>

                {/* Contract Value in INR */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Estimated Contract Value (INR ₹) *
                  </label>
                  <input
                    type="number"
                    min="100000"
                    step="50000"
                    aria-label="Project contract value" required value={newContractValue}
                    onChange={(e) => setNewContractValue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>

                {/* Target Completion Date */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Target Handover Date *
                  </label>
                  <input
                    type="date"
                    required
                    aria-label="Project target date" value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                  />
                </div>

                {/* Team assignments */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Assign Project Manager
                  </label>
                  <select
                    aria-label="Assign Project Manager"
                    value={newPMId}
                    onChange={(e) => setNewPMId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white"
                  >
                    <option value="">Unassigned — select Project Manager</option>
                    {employees
                      .filter((e) => e.role === 'Project Manager' && e.status === 'Active')
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Assign Site Engineer
                  </label>
                  <select
                    aria-label="Assign Site Engineer"
                    value={newSEId}
                    onChange={(e) => setNewSEId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white"
                  >
                    <option value="">Unassigned — select Site Engineer</option>
                    {employees
                      .filter((e) => e.role === 'Site Engineer' && e.status === 'Active')
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div><label className="text-xs font-semibold text-slate-700 block mb-1">Assign Designer</label><select aria-label="Assign Designer" value={newDesignerId} onChange={e=>setNewDesignerId(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg"><option value="">Unassigned — select Designer</option>{employees.filter(e=>e.role==='Designer'&&e.status==='Active').map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select><p className="mt-2 text-xs text-slate-500">Only your real team members are listed. Add members with the appropriate designation in Team Directory. Roles can remain unassigned until you choose them.</p></div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                >
                  Create Client & Launch Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Mood Board */}
      {showNewMoodBoardModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Add Room Mood Board</h3>
              <button
                onClick={() => setShowNewMoodBoardModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMoodBoard} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Room / Space Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Bedroom or Island Kitchen"
                  value={newMbRoom}
                  onChange={(e) => setNewMbRoom(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Design Theme Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Japandi Serenity with Concealed Lighting"
                  value={newMbTitle}
                  onChange={(e) => setNewMbTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Concept Notes & Details
                </label>
                <textarea
                  rows={2}
                  placeholder="Specify warm tones, lighting fixture specifications, textured accents..."
                  value={newMbNotes}
                  onChange={(e) => setNewMbNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Color Hex Swatches (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="#2B2A27, #C4A482, #E8DFD8, #8B5A2B"
                  value={newMbPalette}
                  onChange={(e) => setNewMbPalette(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Specified Materials (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="Teak veneer, PU polish, Tinted glass, Kalinga Quartz"
                  value={newMbMaterials}
                  onChange={(e) => setNewMbMaterials(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewMoodBoardModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                >
                  Save Mood Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Vendor Milestone */}
      {showNewVendorMilestoneModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Add Vendor Milestone</h3>
              <button
                onClick={() => setShowNewVendorMilestoneModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddVendorMilestone} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sri Balaji Plywoods & Hardware"
                  value={newVmName}
                  onChange={(e) => setNewVmName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Trade / Domain
                </label>
                <input
                  type="text"
                  placeholder="e.g. Modular Plywood & Hardware"
                  value={newVmTrade}
                  onChange={(e) => setNewVmTrade(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Scope of Delivery *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Supply of 60 Greenply 710 sheets + 30 Mica rolls"
                  value={newVmScope}
                  onChange={(e) => setNewVmScope(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Target Due Date
                </label>
                <input
                  type="date"
                  value={newVmDueDate}
                  onChange={(e) => setNewVmDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Attachment Name (Challan, PDF, Certificate)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Balaji_Delivery_Challan_Batch2.pdf"
                  value={newVmAttachmentName}
                  onChange={(e) => setNewVmAttachmentName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewVendorMilestoneModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                >
                  Record Vendor Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Owner Delete Project Confirmation Modal */}
      {projectToDelete && (
        <DeleteConfirmModal
          isOpen={!!projectToDelete}
          title="Delete Project"
          itemName={projectToDelete.title}
          itemType="Project"
          warningText="This will permanently delete this residential turnkey project, all scheduled milestones, architectural mood boards, budget allocations, vendor scopes, and uploaded site blueprints."
          onConfirm={() => {
            const deletedId = projectToDelete.id;
            deleteProject(deletedId);
            const remaining = projects.filter((p) => p.id !== deletedId);
            setSelectedProjectId(remaining[0]?.id || '');
            setProjectToDelete(null);
          }}
          onClose={() => setProjectToDelete(null)}
        />
      )}

      {/* Owner Delete Milestone Confirmation Modal */}
      {milestoneToDelete && (
        <DeleteConfirmModal
          isOpen={!!milestoneToDelete}
          title="Delete Site Milestone"
          itemName={milestoneToDelete.milestone.name}
          itemType="Milestone"
          warningText="This removes the milestone from project schedule and deletes any associated billing stage payment trigger."
          onConfirm={() => {
            deleteMilestone(milestoneToDelete.projectId, milestoneToDelete.milestone.id);
            setMilestoneToDelete(null);
          }}
          onClose={() => setMilestoneToDelete(null)}
        />
      )}

      {/* Owner Delete Mood Board Confirmation Modal */}
      {moodBoardToDelete && (
        <DeleteConfirmModal
          isOpen={!!moodBoardToDelete}
          title="Delete Mood Board"
          itemName={`${moodBoardToDelete.moodBoard.room} - ${moodBoardToDelete.moodBoard.title}`}
          itemType="Mood Board"
          warningText="This will permanently delete this concept board and its curated material swatches."
          onConfirm={() => {
            deleteMoodBoard(moodBoardToDelete.projectId, moodBoardToDelete.moodBoard.id);
            setMoodBoardToDelete(null);
          }}
          onClose={() => setMoodBoardToDelete(null)}
        />
      )}

      {/* Owner Delete Vendor Milestone Confirmation Modal */}
      {vendorMilestoneToDelete && (
        <DeleteConfirmModal
          isOpen={!!vendorMilestoneToDelete}
          title="Delete Vendor Milestone"
          itemName={`${vendorMilestoneToDelete.vm.vendorName} (${vendorMilestoneToDelete.vm.scope})`}
          itemType="Vendor Milestone"
          warningText="This will permanently delete this vendor milestone and all attached delivery challans."
          onConfirm={() => {
            deleteVendorMilestone(vendorMilestoneToDelete.projectId, vendorMilestoneToDelete.vm.id);
            setVendorMilestoneToDelete(null);
          }}
          onClose={() => setVendorMilestoneToDelete(null)}
        />
      )}

      {/* Owner Delete Client Confirmation Modal */}
      {clientToDelete && (
        <DeleteConfirmModal
          isOpen={!!clientToDelete}
          title="Delete Client Record"
          itemName={`${clientToDelete.name} (${clientToDelete.phone})`}
          itemType="Client"
          warningText="This permanently removes this client record from the customer directory."
          onConfirm={() => {
            deleteClient(clientToDelete.id);
            setClientToDelete(null);
          }}
          onClose={() => setClientToDelete(null)}
        />
      )}

      {/* Owner Delete Project Document Confirmation Modal */}
      {docToDelete && (
        <DeleteConfirmModal
          isOpen={!!docToDelete}
          title="Delete Document"
          itemName={`${docToDelete.doc.title} (${docToDelete.doc.fileName})`}
          itemType="Document"
          warningText="This permanently removes this document, CAD drawing, or site photograph from the vault."
          onConfirm={() => {
            deleteProjectDocument(docToDelete.projectId, docToDelete.doc.id);
            setDocToDelete(null);
          }}
          onClose={() => setDocToDelete(null)}
        />
      )}
    </div>
  );
};


