import { useMutation } from '@tanstack/react-query';
import { shopCategories } from 'apps/seller-ui/src/utils/categories';
import axios, { AxiosError } from 'axios';
import React from 'react';
import { useForm } from 'react-hook-form';

const countWords = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

interface ShopFormData {
    name: string;
    bio: string;
    address: string;
    opening_hours: string;
    website?: string;
    category: string;
}

const CreateShop = ({
    sellerId,
    setActiveStep,
}: {
    sellerId: string;
    setActiveStep: (step: number) => void;
}) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ShopFormData>();

    const [serverError, setServerError] = React.useState<string | null>(null);

    const shopCreateMutation = useMutation({
        mutationFn: async (data: ShopFormData & { sellerId: string }) => {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_SERVER_URI}/api/create-shop`,
                data
            );
            return response.data;
        },
        onSuccess: () => {
            setActiveStep(3);
        },
        onError: (error: AxiosError) => {
            const message =
                (error.response?.data as { message?: string })?.message || error.message;
            setServerError(message);
        },
    });

    const onSubmit = (data: ShopFormData) => {
        setServerError(null);
        shopCreateMutation.mutate({ ...data, sellerId });
    };

    return (
        <div>
            <form onSubmit={handleSubmit(onSubmit)}>
                <h3 className='text-2xl font-semibold text-center mb-4'>Setup new shop</h3>

                <label className='block text-gray-700 mb-1'>Name *</label>
                <input
                    type="text"
                    placeholder='Shop Name'
                    className='w-full p-2 border border-gray-300 outline-0 rounded-[4px] mb-1'
                    {...register("name", { required: "Name is required" })}
                />
                {errors.name && (
                    <p className="text-red-500 text-sm">{String(errors.name.message)}</p>
                )}

                <label className='block text-gray-700 mb-1'>Bio (Max 100 words)</label>
                <input
                    type="text"
                    placeholder='Shop bio'
                    className='w-full p-2 border border-gray-300 outline-0 rounded-[4px] mb-1'
                    {...register("bio", {
                        required: "Bio is required",
                        validate: (value) =>
                            countWords(value) <= 100 || "Bio can't exceed 100 words",
                    })}
                />
                {errors.bio && (
                    <p className="text-red-500 text-sm">{String(errors.bio.message)}</p>
                )}

                <label className='block text-gray-700 mb-1'>Address *</label>
                <input
                    type="text"
                    placeholder='Shop location'
                    className='w-full p-2 border border-gray-300 outline-0 rounded-[4px] mb-1'
                    {...register("address", {
                        required: "Shop address is required",
                        validate: (value) =>
                            countWords(value) <= 50 || "Shop address can't exceed 50 words",
                    })}
                />
                {errors.address && (
                    <p className="text-red-500 text-sm">{String(errors.address.message)}</p>
                )}

                <label className='block text-gray-700 mb-1'>Opening Hours *</label>
                <input
                    type="text"
                    placeholder='e.g., Mon-Fri, 9AM - 6PM'
                    className='w-full p-2 border border-gray-300 outline-0 rounded-[4px] mb-1'
                    {...register("opening_hours", { required: "Shop opening hours are required" })}
                />
                {errors.opening_hours && (
                    <p className="text-red-500 text-sm">{String(errors.opening_hours.message)}</p>
                )}

                <label className='block text-gray-700 mb-1'>Website</label>
                <input
                    type="url"
                    placeholder='http://example.com'
                    className='w-full p-2 border border-gray-300 outline-0 rounded-[4px] mb-1'
                    {...register("website", {
                        pattern: {
                            value: /^(https?:\/\/)?([\w\d-]+\.)+\w{2,}(\/.*)?$/,
                            message: "Enter a valid URL",
                        },
                    })}
                />
                {errors.website && (
                    <p className="text-red-500 text-sm">{String(errors.website.message)}</p>
                )}

                <label className='block text-gray-700 mb-1'>Category *</label>
                <select
                    className='w-full p-2 border border-gray-300 outline-0 rounded-[4px] mb-1'
                    {...register("category", { required: "Shop category is required" })}
                >
                    <option value="">Select a category</option>
                    {shopCategories.map((category) => (
                        <option key={category.value} value={category.value}>
                            {category.label}
                        </option>
                    ))}
                </select>
                {errors.category && (
                    <p className="text-red-500 text-sm">{String(errors.category.message)}</p>
                )}

                {serverError && (
                    <p className="text-red-500 text-sm mt-2">{serverError}</p>
                )}

                <button
                    type="submit"
                    disabled={shopCreateMutation.isPending}
                    className="w-full text-lg bg-blue-600 text-white py-2 rounded-lg mt-4 disabled:opacity-60"
                >
                    {shopCreateMutation.isPending ? "Creating..." : "Create"}
                </button>
            </form>
        </div>
    );
};

export default CreateShop;