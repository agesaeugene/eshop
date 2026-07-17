import React, { useEffect, useState } from 'react'
import { Controller } from 'react-hook-form'
import { Plus, Trash2, X } from 'lucide-react'

const CustomProperties = ({ control, errors }: any) => {
    const [properties, setProperties] = useState<{ label: string; values: string[] }[]>([]);
    const [newLabel, setNewLabel] = useState("");
    const [newValue, setNewValue] = useState("");
    // Tracks the buyer's selected value per property, keyed by property index
    const [selectedValues, setSelectedValues] = useState<Record<number, string>>({});

    const addProperty = () => {
        if (!newLabel.trim()) return;
        setProperties([...properties, { label: newLabel, values: [] }]);
        setNewLabel("");
    };

    const addValue = (index: number) => {
        if (!newValue.trim()) return;
        const updatedProperties = [...properties];
        updatedProperties[index].values.push(newValue);
        setProperties(updatedProperties);
        setNewValue("");
    };

    const removeProperty = (index: number) => {
        setProperties(properties.filter((_, i) => i !== index));
        setSelectedValues((prev) => {
            const updated = { ...prev };
            delete updated[index];
            return updated;
        });
    };

    const selectValue = (propertyIndex: number, value: string) => {
        setSelectedValues((prev) => ({
            ...prev,
            [propertyIndex]: value,
        }));
    };

    return (
        <div>
            <div className='flex flex-col gap-3'>
                <Controller
                    name="customProperties"
                    control={control}
                    render={({ field }) => {
                        useEffect(() => {
                            field.onChange(properties);
                        }, [properties]);

                        return (
                            <div className='mt-2'>
                                <label className='block font-semibold text-gray-300 mb-1'>
                                    Custom Properties
                                </label>
                                <div className='flex flex-col gap-3'>
                                    {/* Existing Properties */}
                                    {properties.map((property, index) => (
                                        <div
                                            key={index}
                                            className="border border-gray-700 p-3 rounded-lg bg-gray-900"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-white font-medium">
                                                    {property.label}
                                                </span>
                                                <button type="button" onClick={() => removeProperty(index)}>
                                                    <X size={18} className="text-red-500" />
                                                </button>
                                            </div>

                                            {/* Add value to property */}
                                            <div className="flex items-center mt-2 gap-2">
                                                <input
                                                    type="text"
                                                    className="border outline-none border-gray-700 bg-gray-800 p-2 rounded-md text-white w-full"
                                                    placeholder='Enter value ...'
                                                    value={newValue}
                                                    onChange={(e) => setNewValue(e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    className='px-3 py-1 bg-blue-500 text-white rounded-md'
                                                    onClick={() => addValue(index)}
                                                >
                                                    Add
                                                </button>
                                            </div>

                                            {/* Selectable Values (buyer-facing style) */}
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {property.values.map((value, i) => {
                                                    const isSelected = selectedValues[index] === value;
                                                    return (
                                                        <button
                                                            key={i}
                                                            type="button"
                                                            onClick={() => selectValue(index, value)}
                                                            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors
                                                                ${isSelected
                                                                    ? 'bg-blue-500 border-blue-500 text-white'
                                                                    : 'bg-gray-800 border-gray-600 text-gray-200 hover:border-blue-400 hover:text-white'
                                                                }`}
                                                        >
                                                            {value}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add New Property */}
                                    <div className="flex items-center gap-2 mt-1">
                                        <input
                                            placeholder='Enter Property label (e.g., Material, Warranty)'
                                            className="border outline-none border-gray-700 bg-gray-800 p-2 rounded-md text-white w-full"
                                            value={newLabel}
                                            onChange={(e: any) => setNewLabel(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className="px-3 py-2 bg-blue-500 text-white rounded-md flex items-center gap-1"
                                            onClick={addProperty}
                                        >
                                            <Plus size={16} /> Add
                                        </button>
                                    </div>
                                </div>
                                {errors?.customProperties && (
                                    <p className='text-red-500 text-xs mt-1'>
                                        {errors.customProperties.message as string}
                                    </p>
                                )}
                            </div>
                        );
                    }}
                />
            </div>
        </div>
    )
}

export default CustomProperties