import React from 'react';

const NotificationBadge = ({ count }: { count: number }) => {
    if (count <= 0) return null;

    return (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {count > 9 ? '9+' : count}
        </span>
    );
};

export default NotificationBadge;