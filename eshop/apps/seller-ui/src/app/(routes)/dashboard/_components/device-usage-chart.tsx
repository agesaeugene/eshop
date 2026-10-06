"use client";

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
    { name: 'Phone', value: 400, color: '#22c55e' }, // Green
    { name: 'Tablet', value: 300, color: '#eab308' }, // Yellow
    { name: 'Computer', value: 300, color: '#3b82f6' }, // Blue
];

const DeviceUsageChart = () => {
    return (
        <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} 
                    />
                </PieChart>
            </ResponsiveContainer>
            
            {/* Custom Legend */}
            <div className="flex justify-center gap-4 mt-4 absolute bottom-0 w-full">
                {data.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-sm text-slate-300">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                        {item.name}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DeviceUsageChart;