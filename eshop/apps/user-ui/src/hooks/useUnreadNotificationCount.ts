import useUserNotifications from 'apps/user-ui/src/hooks/useUserNotifications';

// Shares the same cached query as the profile page, so the header badge
// and the Notifications tab always show the same number.
const useUnreadNotificationCount = (enabled = true) => {
    const { data: notifications = [] } = useUserNotifications(enabled);
    return notifications.filter((n) => !n.isRead).length;
};

export default useUnreadNotificationCount;