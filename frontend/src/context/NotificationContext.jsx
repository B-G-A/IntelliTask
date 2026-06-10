import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const checkDueDates = useCallback(async () => {
    if (!user) return;

    try {
      const { data: tasks } = await axios.get('/api/tasks');
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const alerts = [];

      for (const task of tasks) {
        if (task.status === 'done' || !task.dueDate) continue;

        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          alerts.push({
            id:      `overdue-${task._id}`,
            type:    'overdue',
            title:   task.title,
            message: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}!`,
            priority: task.priority,
          });
        } else if (diffDays === 0) {
          alerts.push({
            id:      `today-${task._id}`,
            type:    'today',
            title:   task.title,
            message: 'Due today!',
            priority: task.priority,
          });
        } else if (diffDays <= 2) {
          alerts.push({
            id:       `soon-${task._id}`,
            type:     'soon',
            title:    task.title,
            message:  `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`,
            priority: task.priority,
          });
        }
      }

      setNotifications(alerts);
    } catch (err) {
      console.error('Notification check failed:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Initial check after a short delay to let data load
    const timeout = setTimeout(checkDueDates, 1000);

    return () => {
      clearTimeout(timeout);
    };
  }, [user, checkDueDates]);

  return (
    <NotificationContext.Provider value={{ notifications, dismissNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
