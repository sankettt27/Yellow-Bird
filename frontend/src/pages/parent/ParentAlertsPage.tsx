import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, AlertCircle, Info, Navigation, Truck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  trip_id: string | null;
  created_at: string;
}

const typeColors: Record<string, string> = {
  trip_started: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  trip_ended: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  bus_near_stop: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  bus_delayed: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  emergency: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  general: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const typeIcons: Record<string, React.ElementType> = {
  trip_started: Navigation,
  trip_ended: Check,
  bus_near_stop: Truck,
  bus_delayed: AlertCircle,
  emergency: AlertCircle,
  general: Info,
};

function timeAgo(dateStr: string): string {
  // Append 'Z' to treat naive datetime strings from the backend as UTC
  const safeDateStr = (!dateStr.endsWith('Z') && !dateStr.includes('+')) 
    ? dateStr + 'Z' 
    : dateStr;
    
  const diff = Date.now() - new Date(safeDateStr).getTime();
  const mins = Math.floor(diff / 60000);
  
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ParentAlertsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ['parent-notifications', filter],
    queryFn: async () => {
      const params = filter === 'unread' ? '?unread_only=true' : '';
      const res = await api.get(`/notifications${params}`);
      return res.data;
    },
    refetchInterval: 15_000,
  });

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      queryClient.invalidateQueries({ queryKey: ['parent-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
    } catch (err) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      toast.success('All notifications marked as read');
      queryClient.invalidateQueries({ queryKey: ['parent-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 pt-4 px-4 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Alerts & Notifications</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Stay updated on your children's commute</p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex bg-gray-100/50 dark:bg-gray-900/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all",
            filter === 'all' 
              ? "bg-white dark:bg-gray-800 text-brand-600 dark:text-brand-400 shadow-sm" 
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          )}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={cn(
            "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all",
            filter === 'unread'
              ? "bg-white dark:bg-gray-800 text-brand-600 dark:text-brand-400 shadow-sm" 
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          )}
        >
          Unread
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">You're all caught up!</h3>
            <p className="text-sm text-gray-500 max-w-[250px]">
              {filter === 'unread' ? "You have no unread notifications." : "You have no notifications yet."}
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {notifications.map((notif, index) => {
            const Icon = typeIcons[notif.type] || Info;
            const colorClass = typeColors[notif.type] || typeColors.general;

            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                className={cn(
                  "flex gap-4 p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden",
                  notif.is_read
                    ? "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                    : "bg-brand-50/50 dark:bg-brand-900/10 border-brand-100 dark:border-brand-900/30"
                )}
              >
                {!notif.is_read && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-brand-500" />
                )}
                
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", colorClass)}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className={cn(
                      "text-sm font-bold truncate",
                      notif.is_read ? "text-gray-900 dark:text-white" : "text-brand-900 dark:text-brand-100"
                    )}>
                      {notif.title}
                    </h4>
                    <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap mt-0.5">
                      {timeAgo(notif.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {notif.message}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
