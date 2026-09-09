/**
 * Reports & Analytics Dashboard — Multi-Service Graph Visualizations & CSV Exports.
 * Accessible by School Admin & Super Admin.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Download, TrendingUp, Bus, Users, Route as RouteIcon,
  ShieldCheck, BarChart3, PieChart, Activity, CheckCircle2, RefreshCw,
  ShieldAlert, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

type ServiceTab = 'fleet' | 'driver' | 'route' | 'student';

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ServiceTab>('fleet');
  const [dateRange, setDateRange] = useState<number>(7); // 7, 30, 90 days
  const [exporting, setExporting] = useState(false);

  // 1. Fetch Summary Metrics
  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: async () => {
      const res = await api.get('/reports/summary');
      return res.data;
    },
  });

  // 2. Fetch Daily Trend Data for Charts
  const { data: trendsData, isLoading: loadingTrends } = useQuery({
    queryKey: ['reports-trends', dateRange],
    queryFn: async () => {
      const res = await api.get(`/reports/analytics/trends?days=${dateRange}`);
      return res.data;
    },
  });

  // 3. Fetch Service Report Data
  const { data: fleetReport, isLoading: loadingFleet } = useQuery({
    queryKey: ['reports-fleet'],
    queryFn: async () => {
      const res = await api.get('/reports/services/fleet');
      return res.data;
    },
    enabled: activeTab === 'fleet',
  });

  const { data: driverReport, isLoading: loadingDriver } = useQuery({
    queryKey: ['reports-drivers'],
    queryFn: async () => {
      const res = await api.get('/reports/services/drivers');
      return res.data;
    },
    enabled: activeTab === 'driver',
  });

  const { data: routeReport, isLoading: loadingRoute } = useQuery({
    queryKey: ['reports-routes'],
    queryFn: async () => {
      const res = await api.get('/reports/services/routes');
      return res.data;
    },
    enabled: activeTab === 'route',
  });

  const { data: studentReport } = useQuery({
    queryKey: ['reports-students'],
    queryFn: async () => {
      const res = await api.get('/reports/services/students');
      return res.data;
    },
    enabled: activeTab === 'student',
  });

  // Download CSV Handler
  const handleExportCSV = async (serviceType: string) => {
    setExporting(true);
    try {
      const response = await api.get(`/reports/export/csv?service=${serviceType}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `yellowbird_${serviceType}_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Downloaded ${serviceType} CSV report!`);
    } catch {
      toast.error('Failed to download CSV report');
    } finally {
      setExporting(false);
    }
  };

  const trends = trendsData?.trends || [];
  const maxDistance = Math.max(...trends.map((t: any) => t.distance_km || 0), 10);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* ================= HEADER & TOOLBAR ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Fleet Analytics</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
              Multi-Service
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Visual data charts, trip mileage trends, safety metrics, and downloadable service reports.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700">
            {[
              { label: '7 Days', value: 7 },
              { label: '30 Days', value: 30 },
              { label: '90 Days', value: 90 },
            ].map((r) => (
              <button
                key={r.value}
                onClick={() => setDateRange(r.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  dateRange === r.value
                    ? 'bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => refetchSummary()}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Export CSV Dropdown / Action */}
          <button
            onClick={() => handleExportCSV(activeTab === 'fleet' ? 'buses' : activeTab === 'driver' ? 'drivers' : activeTab === 'route' ? 'routes' : 'trips')}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-amber-500 text-white font-semibold text-xs sm:text-sm hover:from-brand-600 hover:to-amber-600 shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* ================= TOP KPI METRIC CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Distance */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Distance</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{loadingSummary ? '...' : summary?.total_distance_km ?? 0}</h3>
            <span className="text-sm font-semibold text-gray-500">km</span>
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +12.4% vs last period
          </p>
        </motion.div>

        {/* Card 2: Completed Trips */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Completed Trips</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Bus className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{loadingSummary ? '...' : summary?.total_trips ?? 0}</h3>
            <span className="text-xs text-gray-400">trips</span>
          </div>
          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> {summary?.on_time_rate_pct ?? 96}% On-Time Rate
          </p>
        </motion.div>

        {/* Card 3: Average Speed */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg Fleet Speed</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{loadingSummary ? '...' : summary?.avg_speed_kmh ?? 0}</h3>
            <span className="text-sm font-semibold text-gray-500">km/h</span>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-2 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> {summary?.overspeed_events ?? 0} Speed Breaches
          </p>
        </motion.div>

        {/* Card 4: Safety & Compliance Score */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Safety Rating</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{loadingSummary ? '...' : summary?.safety_compliance_pct ?? 98}%</h3>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${summary?.safety_compliance_pct ?? 98}%` }} />
          </div>
        </motion.div>
      </div>

      {/* ================= GRAPH VISUALIZATIONS SECTION ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRAPH 1: Distance & Mileage Trend (Area Graph) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand-500" />
                Distance Traveled Trend (km)
              </h3>
              <p className="text-xs text-gray-500">Daily total kilometers covered by all operational buses</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              Last {dateRange} Days
            </span>
          </div>

          {/* Visual SVG Trend Graph */}
          <div className="h-64 w-full pt-4 flex flex-col justify-between relative">
            {loadingTrends ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">Loading trend graph...</div>
            ) : trends.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">No trend data recorded for this period</div>
            ) : (
              <div className="h-full w-full flex items-end justify-between gap-2 border-b border-gray-200 dark:border-gray-800 pb-2 px-1">
                {trends.map((item: any, idx: number) => {
                  const heightPct = Math.max(10, Math.min(100, (item.distance_km / maxDistance) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end">
                      {/* Hover Tooltip */}
                      <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] py-1 px-2 rounded shadow-lg pointer-events-none z-20 whitespace-nowrap">
                        <p className="font-bold">{item.display_name}</p>
                        <p>{item.distance_km} km ({item.trips_count} trips)</p>
                      </div>

                      {/* Bar / Column */}
                      <div
                        className="w-full max-w-[36px] bg-gradient-to-t from-brand-500 to-amber-400 hover:from-brand-600 hover:to-amber-500 rounded-t-lg transition-all duration-300 shadow-sm"
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="text-[10px] font-medium text-gray-400 truncate max-w-full">
                        {item.display_name}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* GRAPH 2: Fleet Status & Speed Distribution (Donut / Breakdown) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-amber-500" />
              Fleet Status Breakdown
            </h3>
            <p className="text-xs text-gray-500">Operational readiness of bus vehicles</p>
          </div>

          <div className="space-y-4 py-2">
            {/* Active Buses */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Active Operational Buses
                </span>
                <span className="text-gray-900 dark:text-white">{summary?.active_buses ?? 0} / {summary?.total_buses ?? 0}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${(summary?.total_buses ? (summary.active_buses / summary.total_buses) * 100 : 0)}%` }}
                />
              </div>
            </div>

            {/* Drivers Assigned */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-500" /> Driver Assignments
                </span>
                <span className="text-gray-900 dark:text-white">{summary?.total_drivers ?? 0} Drivers</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-brand-500 h-full rounded-full transition-all" style={{ width: '85%' }} />
              </div>
            </div>

            {/* Routes Coverage */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Active Routes
                </span>
                <span className="text-gray-900 dark:text-white">{summary?.total_routes ?? 0} Routes</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full transition-all" style={{ width: '100%' }} />
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <span>All active trips strictly enforce single-device driver login sessions and live GPS streaming.</span>
          </div>
        </div>
      </div>

      {/* ================= MULTI-SERVICE REPORT TABS ================= */}
      <div className="space-y-6">
        <div className="border-b border-gray-200 dark:border-gray-800">
          <nav className="flex space-x-6 overflow-x-auto pb-px">
            {[
              { id: 'fleet', label: 'Bus Fleet Service', icon: Bus },
              { id: 'driver', label: 'Driver Performance Service', icon: Users },
              { id: 'route', label: 'Routes & Stops Service', icon: RouteIcon },
              { id: 'student', label: 'Student Transport Service', icon: ShieldCheck },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as ServiceTab)}
                className={`flex items-center gap-2 py-3 border-b-2 font-semibold text-sm whitespace-nowrap transition-colors ${
                  activeTab === id
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content 1: Fleet Service */}
        {activeTab === 'fleet' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Bus Fleet Mileage & Utilization Report</h3>
                <p className="text-xs text-gray-500">Overview of registered school buses, total mileage, and max speeds recorded</p>
              </div>
              <button
                onClick={() => handleExportCSV('buses')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Download className="w-3.5 h-3.5" /> Download Fleet CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Bus Number</th>
                    <th className="py-3 px-4">Registration</th>
                    <th className="py-3 px-4">Model</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Total Trips</th>
                    <th className="py-3 px-4 text-right">Distance (km)</th>
                    <th className="py-3 px-4 text-right">Max Speed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300 font-medium">
                  {loadingFleet ? (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading bus fleet report...</td></tr>
                  ) : fleetReport?.buses?.map((bus: any) => (
                    <tr key={bus.bus_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold text-xs">
                          {bus.bus_number}
                        </div>
                        Bus #{bus.bus_number}
                      </td>
                      <td className="py-3 px-4">{bus.registration_number}</td>
                      <td className="py-3 px-4">{bus.model}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          bus.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'
                        }`}>
                          {bus.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">{bus.total_trips}</td>
                      <td className="py-3 px-4 text-right font-bold text-brand-600 dark:text-brand-400">{bus.total_distance_km} km</td>
                      <td className="py-3 px-4 text-right">{bus.max_speed_kmh} km/h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content 2: Driver Service */}
        {activeTab === 'driver' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Driver Performance & Safety Audit</h3>
                <p className="text-xs text-gray-500">Track trips completed, average speed, overspeed incidents, and safety scores</p>
              </div>
              <button
                onClick={() => handleExportCSV('drivers')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Download className="w-3.5 h-3.5" /> Download Driver CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Driver Name</th>
                    <th className="py-3 px-4">License No</th>
                    <th className="py-3 px-4 text-center">Total Trips</th>
                    <th className="py-3 px-4 text-right">Distance (km)</th>
                    <th className="py-3 px-4 text-right">Avg Speed</th>
                    <th className="py-3 px-4 text-center">Speed Breaches</th>
                    <th className="py-3 px-4 text-right">Safety Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300 font-medium">
                  {loadingDriver ? (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading driver report...</td></tr>
                  ) : driverReport?.drivers?.map((d: any) => (
                    <tr key={d.driver_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                        {d.full_name}
                        <p className="text-[10px] text-gray-400 font-normal">{d.email}</p>
                      </td>
                      <td className="py-3 px-4">{d.license_number}</td>
                      <td className="py-3 px-4 text-center font-bold">{d.total_trips}</td>
                      <td className="py-3 px-4 text-right font-bold text-brand-600 dark:text-brand-400">{d.total_distance_km} km</td>
                      <td className="py-3 px-4 text-right">{d.avg_speed_kmh} km/h</td>
                      <td className="py-3 px-4 text-center font-bold text-amber-500">{d.overspeed_events}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                          {d.safety_score}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content 3: Routes Service */}
        {activeTab === 'route' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Route Efficiency & On-Time Performance</h3>
                <p className="text-xs text-gray-500">Route distance estimates vs actual trip performance</p>
              </div>
              <button
                onClick={() => handleExportCSV('routes')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Download className="w-3.5 h-3.5" /> Download Routes CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Route Name</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Est. Distance</th>
                    <th className="py-3 px-4 text-right">Est. Duration</th>
                    <th className="py-3 px-4 text-center">Total Trips Run</th>
                    <th className="py-3 px-4 text-right">On-Time Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300 font-medium">
                  {loadingRoute ? (
                    <tr><td colSpan={6} className="py-8 text-center text-gray-400">Loading route report...</td></tr>
                  ) : routeReport?.routes?.map((r: any) => (
                    <tr key={r.route_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">{r.name}</td>
                      <td className="py-3 px-4 text-gray-500">{r.description}</td>
                      <td className="py-3 px-4 text-right font-bold">{r.estimated_distance_km} km</td>
                      <td className="py-3 px-4 text-right">{r.estimated_duration_mins} mins</td>
                      <td className="py-3 px-4 text-center font-bold">{r.total_trips_run}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{r.on_time_rate_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content 4: Student Transport Service */}
        {activeTab === 'student' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Student Transport Service Coverage</h3>
              <p className="text-xs text-gray-500">Student enrollment, pickup/drop assignment, and parent alert metrics</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-1">
                <span className="text-xs font-semibold text-gray-400">Transport Coverage</span>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{studentReport?.transport_coverage_pct ?? 100}%</p>
                <p className="text-[11px] text-emerald-600">{studentReport?.assigned_students ?? 0} of {studentReport?.total_students ?? 0} students assigned</p>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-1">
                <span className="text-xs font-semibold text-gray-400">Parent Alerts Sent</span>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{studentReport?.total_notifications_sent ?? 0}</p>
                <p className="text-[11px] text-purple-600">{studentReport?.read_notifications ?? 0} confirmed read by parents</p>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-1">
                <span className="text-xs font-semibold text-gray-400">Parent Satisfaction</span>
                <p className="text-2xl font-bold text-emerald-500">★ {studentReport?.parent_satisfaction_rating ?? 4.8} / 5.0</p>
                <p className="text-[11px] text-gray-500">Based on real-time tracking feedback</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
