'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from 'apps/user-ui/src/utils/axiosInstance';
import { countries } from "../../../../../../packages/utils/countries";
import { MapPin, Trash2, Plus, X } from 'lucide-react';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

type AddressForm = {
    label: "Home" | "Work" | "Other";
    name: string;
    street: string;
    city: string;
    zip: string;
    country: string;
    isDefault: boolean;
};

type ShippingAddress = AddressForm & { id: string; createdAt: string };

const ShippingAddressSection = () => {
    const [showModal, setShowModal] = useState(false);
    const [actionError, setActionError] = useState("");
    const queryClient = useQueryClient();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<AddressForm>({
        defaultValues: {
            label: "Home",
            name: "",
            street: "",
            city: "",
            zip: "",
            country: "Kenya",
            isDefault: false,
        }
    });

    const addAddress = useMutation({
        mutationFn: async (payload: AddressForm) => {
            const res = await axiosInstance.post("/api/add-address", payload);
            return res.data.address;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["shipping-addresses"] });
            reset();
            setShowModal(false);
            setActionError("");
        },
        onError: (error: any) => {
            setActionError(error.response?.data?.message || "Address could not be saved. Check your connection and try again.");
        },
    });

    const { data: addresses = [], isLoading, isError } = useQuery<ShippingAddress[]>({
        queryKey: ["shipping-addresses"],
        queryFn: async () => {
            const res = await axiosInstance.get("/api/shipping-addresses");
            return res.data.addresses;
        }
    });

    const onSubmit = (data: AddressForm) => {
        setActionError("");
        addAddress.mutate({
            ...data,
            name: data.name.trim(),
            street: data.street.trim(),
            city: data.city.trim(),
            zip: data.zip.trim(),
            country: data.country.trim(),
        });
    };

    const deleteAddress = useMutation({
        mutationFn: async (id: string) => {
            await axiosInstance.delete(`/api/delete-address/${id}`);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["shipping-addresses"] });
            setActionError("");
        },
        onError: (error: any) => setActionError(error.response?.data?.message || "Address could not be deleted. Try again."),
    });

    return (
        <div className='space-y-4'>
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">Saved Address</h2>
                <button
                    type="button"
                    onClick={() => {
                        reset();
                        setActionError("");
                        setShowModal(true);
                    }}
                    className="flex items-center gap-1 text-sm text-blue-600 font-medium hover:underline"
                >
                    <Plus className="w-4 h-4" /> Add New Address
                </button>
            </div>

            {!showModal && actionError && (
                <p role="alert" className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                    {actionError}
                </p>
            )}

            <div>
                {isLoading ? (
                    <p className="text-sm text-gray-500">Loading Addresses...</p>
                ) : isError ? (
                    <p role="alert" className="text-sm text-red-600">Could not load saved addresses. Refresh the page to try again.</p>
                ) : addresses.length === 0 ? (
                    <p className="text-sm text-gray-600">No saved addresses found.</p>
                ) : (
                    addresses.map((address) => (
                        <div
                            key={address.id}
                            className="border border-gray-200 rounded-md p-4 relative mb-3"
                        >
                            {address.isDefault && (
                                <span className="absolute top-2 right-2 bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">
                                    Default
                                </span>
                            )}
                            <div className="flex items-start gap-2 text-sm text-gray-700">
                                <MapPin className="w-5 h-5 mt-0.5 text-gray-500" />
                                <div>
                                    <p>{address.label} - {address.name}</p>
                                    <p>
                                        {address.street}, {address.city}, {address.zip}, {address.country}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button
                                    type="button"
                                    className="flex items-center gap-1 cursor-pointer text-xs"
                                    disabled={deleteAddress.isPending}
                                    onClick={() => {
                                        setActionError("");
                                        deleteAddress.mutate(address.id);
                                    }}
                                >
                                    <Trash2 className="w-4 h-4" /> Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
                    <div className="bg-white w-full max-w-md p-6 rounded-md shadow-md relative">
                        <button
                            type="button"
                            className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
                            onClick={() => {
                                setShowModal(false);
                                setActionError("");
                                reset();
                            }}
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Add New Address</h3>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                            {actionError && (
                                <p role="alert" className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                                    {actionError}
                                </p>
                            )}
                            <select {...register("label", { required: "Address type is required" })} className="form-input">
                                <option value="Home">Home</option>
                                <option value="Work">Work</option>
                                <option value="Other">Other</option>
                            </select>

                            <input
                                placeholder="Name"
                                {...register("name", { required: "Name is required", validate: (value) => !!value.trim() || "Name is required" })}
                                className="form-input"
                            />
                            {errors.name && <p className="text-red-500 text-xs">{errors.name.message as string}</p>}

                            <input
                                placeholder="Street"
                                {...register("street", { required: "Street is required", validate: (value) => !!value.trim() || "Street is required" })}
                                className="form-input"
                            />
                            {errors.street && <p className="text-red-500 text-xs">{errors.street.message as string}</p>}

                            <input
                                placeholder="City"
                                {...register("city", { required: "City is required", validate: (value) => !!value.trim() || "City is required" })}
                                className="form-input"
                            />
                            {errors.city && <p className="text-red-500 text-xs">{errors.city.message as string}</p>}

                            <input
                                placeholder="ZIP Code"
                                {...register("zip", { required: "ZIP is required", validate: (value) => !!value.trim() || "ZIP is required" })}
                                className="form-input"
                            />

                            <select {...register("country", { required: "Country is required" })} className="form-input">
                                {countries.map((country) => (
                                    <option key={country.code} value={country.name}>
                                        {country.name}
                                    </option>
                                ))}
                            </select>

                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input type="checkbox" {...register("isDefault")} />
                                Set as my default address
                            </label>

                            <button
                                type="submit"
                                disabled={addAddress.isPending}
                                className="w-full bg-blue-600 text-white text-sm py-2 rounded-md hover:bg-blue-700 transition disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {addAddress.isPending ? "Saving address..." : "Save Address"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShippingAddressSection;