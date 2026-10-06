"use client";

import React from 'react';

const orders = [
    { id: 'ORD-001', customer: 'John Doe', amount: '$250', status: 'Paid' },
    { id: 'ORD-002', customer: 'Jane Smith', amount: '$180', status: 'Pending' },
    { id: 'ORD-003', customer: 'Alice Johnson', amount: '$340', status: 'Paid' },
    { id: 'ORD-004', customer: 'Bob Lee', amount: '$90', status: 'Failed' },
    { id: 'ORD-005', customer: 'Bob Lee', amount: '$90', status: 'Failed' },
];

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Paid': return 'text-green-500';
        case 'Pending': return 'text-yellow-500';
        case 'Failed': return 'text-red-500';
        default: return 'text-slate-400';
    }
};

const RecentOrders = () => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-400">
                <thead className="text-xs text-slate-500 uppercase bg-transparent border-b border-slate-800">
                    <tr>
                        <th scope="col" className="px-4 py-3">Order ID</th>
                        <th scope="col" className="px-4 py-3">Customer</th>
                        <th scope="col" className="px-4 py-3">Amount</th>
                        <th scope="col" className="px-4 py-3">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map((order, index) => (
                        <tr key={index} className="border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-300">{order.id}</td>
                            <td className="px-4 py-3">{order.customer}</td>
                            <td className="px-4 py-3">{order.amount}</td>
                            <td className={`px-4 py-3 font-medium ${getStatusColor(order.status)}`}>
                                {order.status}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default RecentOrders;