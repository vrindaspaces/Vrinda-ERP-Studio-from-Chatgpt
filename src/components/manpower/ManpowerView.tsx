import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Manpower, IdProofAttachment, ManpowerStatus, WageType } from '../../types';
import {
  HardHat,
  Search,
  Filter,
  Plus,
  Phone,
  Mail,
  MapPin,
  FileText,
  Image as ImageIcon,
  File,
  Download,
  Eye,
  Trash2,
  Edit2,
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  Building2,
  DollarSign,
  User,
  ShieldCheck,
  Grid,
  List,
  ExternalLink
} from 'lucide-react';

const COMMON_SKILLS = [
  'Carpentry',
  'False Ceiling',
  'Italian Marble Polishing',
  'Painting',
  'Electrical',
  'Plumbing',
  'Tile & Stone Laying',
  'Fabrication & Metalwork',
  'Masonry',
  'Polishing & Varnishing',
  'Glass & Aluminum Work',
  'HVAC & Ducting',
  'General Site Labour'
];

const PROOF_TYPES: NonNullable<IdProofAttachment['proofType']>[] = [
  'Aadhaar Card',
  'PAN Card',
  'Voter ID',
  'Driving License',
  'Passport',
  'Labour Card',
  'Other'
];

export const ManpowerView: React.FC = () => {
  const { manpower, addManpower, updateManpower, deleteManpower, projects, currentRole } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [wageTypeFilter, setWageTypeFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Manpower | null>(null);
  const [viewingPerson, setViewingPerson] = useState<Manpower | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<IdProofAttachment | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formSkill, setFormSkill] = useState('');
  const [formCustomSkill, setFormCustomSkill] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formWageType, setFormWageType] = useState<WageType>('Daily Wage');
  const [formWageAmount, setFormWageAmount] = useState<string>('');
  const [formStatus, setFormStatus] = useState<ManpowerStatus>('Available');
  const [formProjectId, setFormProjectId] = useState('');
  const [formEmergencyContact, setFormEmergencyContact] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formAttachments, setFormAttachments] = useState<IdProofAttachment[]>([]);
  const [selectedProofType, setSelectedProofType] = useState<NonNullable<IdProofAttachment['proofType']>>('Aadhaar Card');
  const [formError, setFormError] = useState('');
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick stats
  const totalCount = manpower?.length || 0;
  const onSiteCount = manpower?.filter((m) => m.status === 'Assigned on Site').length || 0;
  const availableCount = manpower?.filter((m) => m.status === 'Available').length || 0;
  const withIdProofCount = manpower?.filter((m) => m.idProof && m.idProof.length > 0).length || 0;

  // Unique locations for filter
  const uniqueLocations = Array.from(
    new Set(manpower?.map((m) => m.location).filter(Boolean))
  );

  // Filtered manpower list
  const filteredManpower = (manpower || []).filter((person) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      person.name.toLowerCase().includes(q) ||
      person.skill.toLowerCase().includes(q) ||
      person.contact.toLowerCase().includes(q) ||
      (person.location && person.location.toLowerCase().includes(q)) ||
      (person.email && person.email.toLowerCase().includes(q)) ||
      (person.address && person.address.toLowerCase().includes(q));

    const matchesSkill = skillFilter === 'All' || person.skill === skillFilter;
    const matchesStatus = statusFilter === 'All' || person.status === statusFilter;
    const matchesLocation = locationFilter === 'All' || person.location === locationFilter;
    const matchesWageType = wageTypeFilter === 'All' || (person.wageType || 'Daily Wage') === wageTypeFilter;

    return matchesSearch && matchesSkill && matchesStatus && matchesLocation && matchesWageType;
  });

  const formatWage = (person: Manpower) => {
    const amount = person.wageAmount !== undefined ? person.wageAmount : person.dailyRate;
    if (amount === undefined || amount === null) return '—';
    const formatted = `₹${amount.toLocaleString('en-IN')}`;
    const type = person.wageType || 'Daily Wage';
    if (type === 'Daily Wage') return `${formatted} / day`;
    if (type === 'Monthly Wage') return `${formatted} / month`;
    if (type === 'Project Wage') return `${formatted} / project`;
    return formatted;
  };

  const resetForm = () => {
    setFormName('');
    setFormSkill('');
    setFormCustomSkill('');
    setFormContact('');
    setFormLocation('');
    setFormEmail('');
    setFormAddress('');
    setFormWageType('Daily Wage');
    setFormWageAmount('');
    setFormStatus('Available');
    setFormProjectId('');
    setFormEmergencyContact('');
    setFormNotes('');
    setFormAttachments([]);
    setSelectedProofType('Aadhaar Card');
    setFormError('');
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (person: Manpower) => {
    resetForm();
    setEditingPerson(person);
    setFormName(person.name);
    if (COMMON_SKILLS.includes(person.skill)) {
      setFormSkill(person.skill);
      setFormCustomSkill('');
    } else {
      setFormSkill('Other');
      setFormCustomSkill(person.skill);
    }
    setFormContact(person.contact);
    setFormLocation(person.location || '');
    setFormEmail(person.email || '');
    setFormAddress(person.address || '');
    setFormWageType(person.wageType || 'Daily Wage');
    setFormWageAmount(
      person.wageAmount !== undefined
        ? person.wageAmount.toString()
        : person.dailyRate !== undefined
        ? person.dailyRate.toString()
        : ''
    );
    setFormStatus(person.status);
    setFormProjectId(person.assignedProjectId || '');
    setFormEmergencyContact(person.emergencyContact || '');
    setFormNotes(person.notes || '');
    setFormAttachments(person.idProof || []);
    setIsAddModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingFiles(true);
    setFormError('');

    try {
      const newAttachments: IdProofAttachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Max 10MB per file
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds the 10 MB limit.`);
        }

        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
          reader.readAsDataURL(file);
        });

        newAttachments.push({
          id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl,
          uploadedAt: new Date().toISOString(),
          proofType: selectedProofType
        });
      }

      setFormAttachments((prev) => [...prev, ...newAttachments]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error attaching files.');
    } finally {
      setIsUploadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (docId: string) => {
    setFormAttachments((prev) => prev.filter((d) => d.id !== docId));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Please enter full name.');
      return;
    }

    if (!formSkill) {
      setFormError('Please select a skill / trade.');
      return;
    }

    if (formSkill === 'Other' && !formCustomSkill.trim()) {
      setFormError('Please enter the custom trade skill.');
      return;
    }

    if (!formContact.trim()) {
      setFormError('Please enter contact phone number.');
      return;
    }

    if (!formLocation.trim()) {
      setFormError('Please enter work location / area.');
      return;
    }

    if (!formAddress.trim()) {
      setFormError('Please enter address.');
      return;
    }

    const effectiveSkill = formSkill === 'Other' ? formCustomSkill.trim() : formSkill;

    const assignedProj = projects.find((p) => p.id === formProjectId);

    const parsedAmount = formWageAmount.trim() ? parseFloat(formWageAmount) : undefined;

    const payload: Omit<Manpower, 'id' | 'createdAt'> = {
      name: formName.trim(),
      skill: effectiveSkill,
      contact: formContact.trim(),
      location: formLocation.trim(),
      email: formEmail.trim() || undefined,
      address: formAddress.trim(),
      idProof: formAttachments,
      wageType: formWageType,
      wageAmount: parsedAmount,
      dailyRate: formWageType === 'Daily Wage' ? parsedAmount : undefined,
      status: formStatus,
      assignedProjectId: formProjectId || undefined,
      assignedProjectTitle: assignedProj?.title || undefined,
      emergencyContact: formEmergencyContact.trim() || undefined,
      notes: formNotes.trim() || undefined
    };

    if (editingPerson) {
      updateManpower(editingPerson.id, payload);
      if (viewingPerson?.id === editingPerson.id) {
        setViewingPerson({ ...editingPerson, ...payload });
      }
    } else {
      addManpower(payload);
    }

    setIsAddModalOpen(false);
    setEditingPerson(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteManpower(id);
    setDeleteConfirmId(null);
    if (viewingPerson?.id === id) {
      setViewingPerson(null);
    }
  };

  const getFormatBadge = (doc: IdProofAttachment) => {
    const ext = doc.name.split('.').pop()?.toUpperCase() || 'FILE';
    const isPdf = doc.type.includes('pdf') || ext === 'PDF';
    const isImage = doc.type.startsWith('image/') || ['PNG', 'JPG', 'JPEG', 'WEBP'].includes(ext);

    if (isPdf) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
          <FileText size={11} /> PDF
        </span>
      );
    }
    if (isImage) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
          <ImageIcon size={11} /> {ext}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
        <File size={11} /> {ext}
      </span>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const downloadDoc = (doc: IdProofAttachment) => {
    if (!doc.dataUrl) return;
    const a = document.createElement('a');
    a.href = doc.dataUrl;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const getStatusBadge = (status: ManpowerStatus) => {
    switch (status) {
      case 'Available':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
            Available
          </span>
        );
      case 'Assigned on Site':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            Assigned on Site
          </span>
        );
      case 'On Leave':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
            On Leave
          </span>
        );
      case 'Inactive':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            Inactive
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <HardHat size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manpower Roster</h1>
              <p className="text-xs text-slate-500">
                Manage specialized trade artisans, site technicians, contact details, and multi-format ID proofs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="bg-slate-100 p-1 rounded-lg flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid View"
            >
              <Grid size={15} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'table' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <List size={15} />
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#360b1c] hover:bg-[#55182e] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Manpower</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Manpower</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <HardHat size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Active on Sites</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{onSiteCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Available to Deploy</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{availableCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Verified ID Proofs</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{withIdProofCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by name, skill, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#360b1c]/20 focus:border-[#360b1c]"
            />
          </div>

          {/* Skill Filter */}
          <div>
            <select
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#360b1c]/20 focus:border-[#360b1c]"
            >
              <option value="All">All Trade Skills</option>
              {COMMON_SKILLS.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>
          </div>

          {/* Wage Type Filter */}
          <div>
            <select
              value={wageTypeFilter}
              onChange={(e) => setWageTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#360b1c]/20 focus:border-[#360b1c]"
            >
              <option value="All">All Wage Types</option>
              <option value="Daily Wage">Daily Wage</option>
              <option value="Monthly Wage">Monthly Wage</option>
              <option value="Project Wage">Project Wage</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#360b1c]/20 focus:border-[#360b1c]"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Assigned on Site">Assigned on Site</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#360b1c]/20 focus:border-[#360b1c]"
            >
              <option value="All">All Locations</option>
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(searchQuery || skillFilter !== 'All' || statusFilter !== 'All' || locationFilter !== 'All' || wageTypeFilter !== 'All') && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>
              Showing {filteredManpower.length} of {totalCount} manpower records
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setSkillFilter('All');
                setStatusFilter('All');
                setLocationFilter('All');
                setWageTypeFilter('All');
              }}
              className="text-[#360b1c] font-semibold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {filteredManpower.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <HardHat size={32} />
          </div>
          <h3 className="text-base font-bold text-slate-800">No manpower entries found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery || skillFilter !== 'All' || statusFilter !== 'All'
              ? 'Try modifying your search keywords or filter criteria.'
              : 'Add your first trade technician or site craftsman with contact info and ID proof files.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#360b1c] text-white text-xs font-semibold rounded-lg hover:bg-[#55182e] transition-colors cursor-pointer"
          >
            <Plus size={14} /> Add First Manpower
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredManpower.map((person) => {
            const docCount = person.idProof?.length || 0;
            return (
              <div
                key={person.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-sm shrink-0 border border-amber-200">
                        {person.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight hover:text-[#360b1c] transition-colors">
                          {person.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800">
                            {person.skill}
                          </span>
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(person.status)}
                  </div>

                  {/* Core Details */}
                  <div className="space-y-2 text-xs text-slate-600 pt-1">
                    {/* Contact Phone */}
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-slate-400 shrink-0" />
                      <a
                        href={`tel:${person.contact}`}
                        className="font-medium text-slate-900 hover:text-amber-700 hover:underline"
                      >
                        {person.contact}
                      </a>
                    </div>

                    {/* Email if provided */}
                    {person.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-slate-400 shrink-0" />
                        <a
                          href={`mailto:${person.email}`}
                          className="text-slate-700 hover:underline truncate"
                        >
                          {person.email}
                        </a>
                      </div>
                    )}

                    {/* Location & Address */}
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">
                        <strong className="text-slate-800">{person.location}</strong>
                        {person.address ? ` — ${person.address}` : ''}
                      </span>
                    </div>

                    {/* Assigned Project */}
                    {person.assignedProjectTitle && (
                      <div className="flex items-center gap-2 text-blue-700 font-medium">
                        <Building2 size={14} className="shrink-0" />
                        <span className="truncate">{person.assignedProjectTitle}</span>
                      </div>
                    )}

                    {/* Wage & Compensation */}
                    {(person.wageAmount !== undefined || person.dailyRate !== undefined) && (
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {person.wageType || 'Daily Wage'}
                        </span>
                        <span className="font-semibold">{formatWage(person)}</span>
                      </div>
                    )}
                  </div>

                  {/* ID Proof Attachments Preview Strip */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                        <ShieldCheck size={13} className="text-emerald-600" />
                        ID Proof Documents:
                      </span>
                      <span className="text-[11px] font-bold text-slate-700">
                        {docCount > 0 ? `${docCount} attached` : 'None'}
                      </span>
                    </div>

                    {docCount > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {person.idProof.map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] text-slate-700 transition-colors cursor-pointer max-w-full truncate"
                            title={`Preview ${doc.name}`}
                          >
                            {getFormatBadge(doc)}
                            <span className="truncate max-w-[130px] font-medium">{doc.name}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No verification document attached.</p>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setViewingPerson(person)}
                    className="font-semibold text-[#360b1c] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Eye size={13} /> View Full Profile
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(person)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                      title="Edit Manpower"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(person.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      title="Delete Manpower"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Detailed Table View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Name & Skill</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Location & Address</th>
                  <th className="py-3 px-4">ID Proof Files</th>
                  <th className="py-3 px-4">Wage & Rate</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredManpower.map((person) => (
                  <tr key={person.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-sm">{person.name}</div>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                        {person.skill}
                      </span>
                    </td>
                    <td className="py-3 px-4 space-y-1">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <Phone size={12} className="text-slate-400" />
                        <a href={`tel:${person.contact}`} className="hover:underline">
                          {person.contact}
                        </a>
                      </div>
                      {person.email && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <Mail size={12} className="text-slate-400" />
                          <a href={`mailto:${person.email}`} className="hover:underline">
                            {person.email}
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-slate-800 flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span>{person.location}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{person.address || '—'}</p>
                    </td>
                    <td className="py-3 px-4">
                      {person.idProof && person.idProof.length > 0 ? (
                        <div className="flex flex-wrap gap-1 items-center max-w-xs">
                          {person.idProof.map((doc) => (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[10px] font-medium text-slate-700"
                              title={`Preview ${doc.name}`}
                            >
                              {getFormatBadge(doc)}
                              <span className="truncate max-w-[90px]">{doc.name}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No ID attached</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{formatWage(person)}</div>
                      {person.wageType && (
                        <span className="text-[10px] text-slate-500 font-medium block">
                          {person.wageType}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(person.status)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingPerson(person)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                          title="View"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(person)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(person.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD / EDIT MANPOWER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#360b1c] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                  <HardHat size={20} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {editingPerson ? 'Edit Manpower Record' : 'Register New Manpower'}
                  </h2>
                  <p className="text-xs text-white/70">
                    Add trade technician profile, contact details, and multiple ID proof documents.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingPerson(null);
                }}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Section 1: Basic Information */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  1. Basic Profile & Skill
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter full name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#360b1c]/20 focus:border-[#360b1c]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Skill / Trade <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formSkill}
                      onChange={(e) => setFormSkill(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#360b1c]/20 focus:border-[#360b1c]"
                    >
                      <option value="">Select Trade / Skill</option>
                      {COMMON_SKILLS.map((skill) => (
                        <option key={skill} value={skill}>
                          {skill}
                        </option>
                      ))}
                      <option value="Other">Other / Custom Trade</option>
                    </select>
                  </div>

                  {formSkill === 'Other' && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Specify Trade Skill <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter custom trade skill"
                        value={formCustomSkill}
                        onChange={(e) => setFormCustomSkill(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#360b1c]/20 focus:border-[#360b1c]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Contact Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Enter contact phone number"
                      value={formContact}
                      onChange={(e) => setFormContact(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#360b1c]/20 focus:border-[#360b1c]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="Enter email address (optional)"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#360b1c]/20 focus:border-[#360b1c]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Location & Address */}
              <div className="pt-2 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  2. Location & Address Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Current Location / Area <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter work city or area"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#360b1c]/20 focus:border-[#360b1c]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Emergency Contact Number
                    </label>
                    <input
                      type="tel"
                      placeholder="Enter emergency contact number (optional)"
                      value={formEmergencyContact}
                      onChange={(e) => setFormEmergencyContact(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#360b1c]/20 focus:border-[#360b1c]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Permanent / Work Address <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Enter complete residential or local address"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#360b1c]/20 focus:border-[#360b1c]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Status & Deployment */}
              <div className="pt-2 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  3. Deployment & Rate
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as ManpowerStatus)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#360b1c]/20 focus:border-[#360b1c]"
                    >
                      <option value="Available">Available</option>
                      <option value="Assigned on Site">Assigned on Site</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Wage Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formWageType}
                      onChange={(e) => setFormWageType(e.target.value as WageType)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#360b1c]/20 focus:border-[#360b1c]"
                    >
                      <option value="Daily Wage">Daily Wage</option>
                      <option value="Monthly Wage">Monthly Wage</option>
                      <option value="Project Wage">Project Wage</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {formWageType} (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-mono text-xs">₹</span>
                      <input
                        type="number"
                        placeholder={
                          formWageType === 'Daily Wage'
                            ? 'Rate per day in ₹'
                            : formWageType === 'Monthly Wage'
                            ? 'Salary per month in ₹'
                            : 'Contract amount in ₹'
                        }
                        value={formWageAmount}
                        onChange={(e) => setFormWageAmount(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#360b1c]/20 focus:border-[#360b1c]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Project</label>
                    <select
                      value={formProjectId}
                      onChange={(e) => setFormProjectId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#360b1c]/20 focus:border-[#360b1c]"
                    >
                      <option value="">No Active Site Assignment</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 4: ID Proof File Upload (Supports multiple formats) */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      4. ID Proof Document Attachments
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Upload multiple formats: <strong>PDF, JPG, PNG, WEBP, DOCX</strong> (Max 10 MB each).
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {formAttachments.length} Attached
                  </span>
                </div>

                {/* Upload Options Strip */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[180px]">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Select Document Type to Attach:
                      </label>
                      <select
                        value={selectedProofType}
                        onChange={(e) => setSelectedProofType(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                      >
                        {PROOF_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-4">
                      <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-xs">
                        <Upload size={14} />
                        <span>Choose Files & Attach</span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,application/pdf,image/*"
                          onChange={handleFileUpload}
                          disabled={isUploadingFiles}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {isUploadingFiles && (
                    <p className="text-xs text-amber-700 animate-pulse font-medium">
                      Uploading and encoding ID proof documents...
                    </p>
                  )}
                </div>

                {/* Attached Files List */}
                {formAttachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-700">Attached Documents:</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {formAttachments.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg text-xs shadow-2xs hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {getFormatBadge(doc)}
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate">{doc.name}</p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span className="font-medium text-amber-700">{doc.proofType || 'ID Proof'}</span>
                                <span>•</span>
                                <span>{formatFileSize(doc.size)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
                              title="Preview"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadDoc(doc)}
                              className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
                              title="Download"
                            >
                              <Download size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(doc.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50"
                              title="Remove"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 5: Notes */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Additional Notes / Skills Details</label>
                <textarea
                  rows={2}
                  placeholder="Enter any additional notes or skill details (optional)"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#360b1c]/20 focus:border-[#360b1c]"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingPerson(null);
                  }}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingFiles}
                  className="px-5 py-2 bg-[#360b1c] hover:bg-[#55182e] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {editingPerson ? 'Save Changes' : 'Register Manpower'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW FULL DETAILS MODAL */}
      {viewingPerson && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full my-8 overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-400/20 text-amber-400 font-bold flex items-center justify-center text-base border border-amber-400/30">
                  {viewingPerson.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{viewingPerson.name}</h2>
                    {getStatusBadge(viewingPerson.status)}
                  </div>
                  <p className="text-xs text-amber-300 font-medium mt-0.5">{viewingPerson.skill}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingPerson(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 text-sm">
              {/* Contact & Location Strip */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact Number</span>
                  <a
                    href={`tel:${viewingPerson.contact}`}
                    className="font-semibold text-slate-900 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <Phone size={12} className="text-emerald-600" />
                    {viewingPerson.contact}
                  </a>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Work Location</span>
                  <span className="font-semibold text-slate-900 flex items-center gap-1 mt-0.5">
                    <MapPin size={12} className="text-rose-600" />
                    {viewingPerson.location}
                  </span>
                </div>

                {viewingPerson.email && (
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Email</span>
                    <a
                      href={`mailto:${viewingPerson.email}`}
                      className="font-medium text-slate-800 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <Mail size={12} className="text-blue-600" />
                      {viewingPerson.email}
                    </a>
                  </div>
                )}
              </div>

              {/* Address */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Address</h4>
                <p className="text-xs text-slate-800 p-3 bg-white border border-slate-200 rounded-lg">
                  {viewingPerson.address || 'No detailed address provided.'}
                </p>
              </div>

              {/* Project & Wage */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    {viewingPerson.wageType || 'Wage & Compensation'}
                  </span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {formatWage(viewingPerson)}
                  </p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Site Assignment</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5 truncate">
                    {viewingPerson.assignedProjectTitle || 'Unassigned'}
                  </p>
                </div>
              </div>

              {/* ID Proofs Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    Attached ID Proof Documents ({viewingPerson.idProof?.length || 0})
                  </h4>
                </div>

                {viewingPerson.idProof && viewingPerson.idProof.length > 0 ? (
                  <div className="space-y-2">
                    {viewingPerson.idProof.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {getFormatBadge(doc)}
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-900 truncate">{doc.name}</p>
                            <p className="text-[10px] text-slate-500">
                              {doc.proofType || 'ID Proof'} • {formatFileSize(doc.size)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs"
                          >
                            <Eye size={12} /> Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadDoc(doc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs"
                          >
                            <Download size={12} /> Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg">
                    No ID proof documents currently uploaded for this person.
                  </p>
                )}
              </div>

              {/* Notes */}
              {viewingPerson.notes && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Notes</h4>
                  <p className="text-xs text-slate-700 bg-amber-50/50 border border-amber-100 p-3 rounded-lg">
                    {viewingPerson.notes}
                  </p>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenEdit(viewingPerson);
                    setViewingPerson(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-xs"
                >
                  <Edit2 size={13} /> Edit Profile
                </button>

                <button
                  type="button"
                  onClick={() => setViewingPerson(null)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW LIGHTBOX MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-700 animate-in fade-in zoom-in-95 duration-200">
            {/* Lightbox Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                {getFormatBadge(previewDoc)}
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-white truncate">{previewDoc.name}</h3>
                  <p className="text-[10px] text-slate-400">
                    {previewDoc.proofType || 'ID Proof'} • {formatFileSize(previewDoc.size)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadDoc(previewDoc)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
                >
                  <Download size={13} /> Download
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Lightbox Body */}
            <div className="p-4 bg-slate-100 flex items-center justify-center min-h-[350px] max-h-[70vh] overflow-auto">
              {previewDoc.type.startsWith('image/') ||
              ['PNG', 'JPG', 'JPEG', 'WEBP'].includes(previewDoc.name.split('.').pop()?.toUpperCase() || '') ? (
                <img
                  src={previewDoc.dataUrl}
                  alt={previewDoc.name}
                  className="max-h-[65vh] max-w-full rounded-lg object-contain shadow-md"
                />
              ) : previewDoc.type.includes('pdf') || previewDoc.name.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.dataUrl}
                  title={previewDoc.name}
                  className="w-full h-[65vh] rounded-lg border border-slate-300"
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center mx-auto text-slate-600">
                    <File size={32} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{previewDoc.name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      This file format is available for direct download.
                    </p>
                  </div>
                  <button
                    onClick={() => downloadDoc(previewDoc)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                  >
                    <Download size={14} /> Download File Now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <Trash2 size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Delete Manpower Record</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete this manpower entry and its attached ID proofs? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
