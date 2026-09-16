/**
 * Students Management Page — Student directory, class/roll number, bus assignment.
 */

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap, Search, Plus, Pencil, Trash2, Bus, X, Users, Upload, FileSpreadsheet,
  ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { Student, PaginatedResponse, Bus as BusType } from '@/types';

interface ParentItem {
  id: string;
  user_id: string;
  user: { full_name: string; email: string; phone: string | null } | null;
}

interface BusStopItem {
  id: string;
  name: string;
}

export function StudentsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery<PaginatedResponse<Student>>({
    queryKey: ['students', page, pageSize, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (search) params.set('search', search);
      const res = await api.get(`/students?${params}`);
      return res.data;
    },
  });

  const { data: busesData } = useQuery<PaginatedResponse<BusType>>({
    queryKey: ['buses-all'],
    queryFn: async () => {
      const res = await api.get('/buses?page_size=100');
      return res.data;
    },
  });

  const { data: parentsData } = useQuery<PaginatedResponse<ParentItem>>({
    queryKey: ['parents-all'],
    queryFn: async () => {
      const res = await api.get('/parents?page_size=200');
      return res.data;
    },
  });

  const { data: stopsData } = useQuery<BusStopItem[]>({
    queryKey: ['stops-all'],
    queryFn: async () => {
      const res = await api.get('/routes/stops/all');
      return res.data;
    },
  });

  const createStudent = useMutation({
    mutationFn: (formData: any) =>
      api.post('/students', { ...formData, school_id: user?.school_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setShowCreateModal(false);
      toast.success('Student enrolled successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to enroll student'),
  });

  const updateStudent = useMutation({
    mutationFn: ({ id, ...formData }: any) => api.patch(`/students/${id}`, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setEditStudent(null);
      toast.success('Student details updated');
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to update student'),
  });

  const deleteStudent = useMutation({
    mutationFn: (id: string) => api.delete(`/students/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student removed successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to remove student'),
  });

  const students = data?.items ?? [];
  const buses = busesData?.items ?? [];
  const parents = parentsData?.items ?? [];
  const stops = stopsData ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Students Roster</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage student registrations, assigned buses, and parent relationships
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium transition-colors"
            title="Refresh students roster"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-brand-500' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Excel
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by student name, class, roll number..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No students found</p>
          <p className="text-xs text-gray-400 mt-1">Add a student or upload an Excel roster to get started.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {students.map((student) => (
              <div
                key={student.id}
                className="p-4 flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-600 font-bold text-sm">
                    {student.full_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">{student.full_name}</span>
                      {student.roll_number && (
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-md font-mono">
                          Roll #{student.roll_number}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>Class: {student.class_name ?? '—'}{student.section ? `-${student.section}` : ''}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Bus className="w-3.5 h-3.5" />
                        {student.assigned_bus_id
                          ? (buses.find((b) => b.id === student.assigned_bus_id)?.bus_number ?? 'Assigned')
                          : 'No Bus'}
                      </span>
                      <span>•</span>
                      <span>
                        Parent:{' '}
                        {student.parent_id ? (
                          <span className="text-brand-600 font-medium">
                            {parents.find(p => p.id === student.parent_id)?.user?.full_name ?? 'Linked'}
                          </span>
                        ) : (
                          <span className="text-amber-500 font-medium">Unlinked</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditStudent(student)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteStudent.mutate(student.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {!isLoading && data && data.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3 border border-gray-100 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing <span className="font-semibold text-gray-900 dark:text-white">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.total)}</span> of <span className="font-semibold text-gray-900 dark:text-white">{data.total}</span> students
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-xs text-gray-700 dark:text-gray-200 focus:outline-none"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(data.total_pages, 7) }, (_, i) => {
              const p = data.total_pages <= 7 ? i + 1 : page <= 4 ? i + 1 : page + i - 3;
              return p <= data.total_pages && p > 0 ? (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                    p === page
                      ? 'bg-brand-500 text-white'
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {p}
                </button>
              ) : null;
            })}
            <button
              onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
              disabled={page >= data.total_pages}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {(showCreateModal || editStudent) && (
        <StudentModal
          student={editStudent}
          buses={buses}
          parents={parents}
          stops={stops}
          onClose={() => { setShowCreateModal(false); setEditStudent(null); }}
          onSubmit={(formData) => {
            if (editStudent) updateStudent.mutate({ id: editStudent.id, ...formData });
            else createStudent.mutate(formData);
          }}
        />
      )}

      {showUploadModal && (
        <StudentUploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            queryClient.invalidateQueries({ queryKey: ['students'] });
            refetch();
          }}
        />
      )}
    </div>
  );
}

function StudentModal({
  student,
  buses,
  parents,
  stops,
  onClose,
  onSubmit,
}: {
  student: Student | null;
  buses: BusType[];
  parents: ParentItem[];
  stops: BusStopItem[];
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [fullName, setFullName] = useState(student?.full_name ?? '');
  const [className, setClassName] = useState(student?.class_name ?? '');
  const [section, setSection] = useState(student?.section ?? '');
  const [rollNumber, setRollNumber] = useState(student?.roll_number ?? '');
  const [assignedBusId, setAssignedBusId] = useState(student?.assigned_bus_id ?? '');
  const [parentId, setParentId] = useState(student?.parent_id ?? '');
  const [pickupStopId, setPickupStopId] = useState(student?.pickup_stop_id ?? '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-100 dark:border-gray-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <h3 className="font-bold text-gray-900 dark:text-white">
            {student ? 'Edit Student Info' : 'Enroll New Student'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Full Name *</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Class</label>
              <input
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Grade 5"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Section</label>
              <input
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="A"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Roll No.</label>
              <input
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="12"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Assigned Bus</label>
            <SearchableSelect
              value={assignedBusId}
              onChange={setAssignedBusId}
              placeholder="No Bus Assigned"
              options={buses.map(b => ({
                label: `${b.bus_number} (${b.capacity} seats)`,
                value: b.id
              }))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Parent</label>
            <SearchableSelect
              value={parentId}
              onChange={setParentId}
              placeholder="No Parent Linked"
              options={parents.map(p => ({
                label: `${p.user?.full_name ?? 'Unknown'} (${p.user?.email})`,
                value: p.id
              }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Assigned Bus Stop</label>
              <SearchableSelect
                value={pickupStopId}
                onChange={setPickupStopId}
                placeholder="None"
                options={stops.map(s => ({
                  label: s.name,
                  value: s.id
                }))}
              />
              <p className="text-[10px] text-gray-400 mt-1">Designated stop for pickup and drop-off</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                onSubmit({
                  full_name: fullName,
                  class_name: className,
                  section,
                  roll_number: rollNumber,
                  assigned_bus_id: assignedBusId || null,
                  parent_id: parentId || null,
                  pickup_stop_id: pickupStopId || null,
                  drop_stop_id: null, // Drop stop explicitly removed per single-stop architecture
                })
              }
              className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium"
            >
              {student ? 'Save Changes' : 'Add Student'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentUploadModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleDownloadTemplate = () => {
    alert("Please create an Excel (.xlsx) file with these EXACT column headers in the first row:\n\nStudent Name, Class, Section, Roll No");
  };

  const handleUpload = async () => {
    if (!file || isUploading) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/students/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000,
      });
      toast.success(res.data.message || 'Upload successful');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to upload students');
      onSuccess();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-100 dark:border-gray-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-brand-500" />
            Bulk Upload Students
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-900 rounded-xl">
            <p className="text-xs text-brand-700 dark:text-brand-300 mb-2">
              <strong>Instructions:</strong> Please upload an Excel (.xlsx) file with the following exact column headers in the first row:
            </p>
            <div className="flex gap-2 flex-wrap mb-3">
              {['Student Name', 'Class', 'Section', 'Roll No'].map(col => (
                <span key={col} className="px-2 py-1 bg-white dark:bg-gray-800 rounded border border-brand-200 dark:border-brand-700 text-xs font-mono">
                  {col}
                </span>
              ))}
            </div>
            <button 
              onClick={handleDownloadTemplate}
              className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3 h-3" /> View Requirements
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Select Excel File (.xlsx)
            </label>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2.5 file:px-4
                file:rounded-xl file:border-0
                file:text-sm file:font-semibold
                file:bg-brand-50 file:text-brand-700
                dark:file:bg-brand-900/30 dark:file:text-brand-400
                hover:file:bg-brand-100 dark:hover:file:bg-brand-900/50
                border border-gray-200 dark:border-gray-700 rounded-xl
                cursor-pointer
              "
            />
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold shadow-sm transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isUploading ? (
              <><span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> Uploading...</>
            ) : (
              'Upload'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-brand-500/40"
      >
        <span className={selectedOption ? 'text-gray-900 dark:text-gray-100 truncate' : 'text-gray-500 truncate'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="text-gray-400 text-[10px] ml-2">▼</span>
      </div>
      
      {isOpen && (
        <div className="absolute z-[60] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <input
              type="text"
              autoFocus
              className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto p-1">
            <div
              className={`px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${value === '' ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/30' : 'text-gray-700 dark:text-gray-200'}`}
              onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}
            >
              {placeholder}
            </div>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400 text-center">No results found</div>
            ) : (
              filteredOptions.map(opt => (
                <div
                  key={opt.value}
                  className={`px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 truncate ${value === opt.value ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 font-medium' : 'text-gray-700 dark:text-gray-200'}`}
                  onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
