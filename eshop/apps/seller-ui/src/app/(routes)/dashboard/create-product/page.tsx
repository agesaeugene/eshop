'use client';

import ImagePlaceHolder from 'apps/seller-ui/src/shared/components/image-placeholder';
import { ChevronRight } from 'lucide-react';
import Input from '../../../../../../../packages/compoonents/input';
import React, { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import ColorSelector from '../../../../../../../packages/compoonents/color-selector';
import CustomSpecifications from 'packages/compoonents/custom-specifications';
import CustomProperties from 'packages/compoonents/custom-properties';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from 'apps/seller-ui/src/utils/axiosInstance';
import RichTextEditor from 'packages/compoonents/rich-text-editor';
import SizeSelector from 'packages/compoonents/size-selector';

const Page = () => {
    const {
        register,
        control,
        watch,
        setValue,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const [openImageModal, setOpenImageModal] = useState(false);
    const [isChanged, setIsChanged] = useState(false);
    const [images, setImages] = useState<(File | null)[]>([null]);
    const [loading, setLoading] = useState(false);

    const {data, isLoading, isError} = useQuery({
        queryKey: ["categories"],
        queryFn: async () => {
            try {
                const res = await axiosInstance.get("/product/api/get-categories");
                return res.data;

            } catch (error) {
                console.log(error);
            }
        },
        staleTime: 1000* 60 * 5,
        retry: 2,
    });

    const categories = data?.categories || [];
    const subCategoriesData = data?.subCategories || {};

    const selectedCategory = watch("category");
    const regularPrice = watch("regular_price")

    const subcategories = useMemo(() => {
        return selectedCategory ? subCategoriesData[selectedCategory] || [] : [];
    }, [selectedCategory,subCategoriesData]);



    console.log(categories, subCategoriesData)

    const onSubmit = (data: any) => {
        console.log(data);
    };

    const handleImageChange = (file: File | null, index: number) => {
        const updatedImages = [...images];

        updatedImages[index] = file;

        if (index === images.length - 1 && images.length < 8) {
            updatedImages.push(null);
        }

        setImages(updatedImages);
        setValue('images', updatedImages);
    };

    const handleRemoveImage = (index: number) => {
        setImages((prevImages) => {
            let updatedImages = [...prevImages];
            if (index === -1) {
                updatedImages[0] = null;
            } else {
                updatedImages.splice(index, 1);
            }
            if (!updatedImages.includes(null) && updatedImages.length < 8) {
                updatedImages.push(null);
            }
            return updatedImages;
        });
        setValue('images', images);
    };

    const handleSaveDraft = () => {

    }

    return (
        <form
            className="w-full mx-auto p-8 shadow-md rounded-lg text-white"
            onSubmit={handleSubmit(onSubmit)}
        >
            {/* Heading and Breadcrumbs */}
            <h2 className="text-2xl py-2 font-semibold font-Poppins text-white">
                Create Product
            </h2>
            <div className="flex items-center">
                <span className="text-[#80Deea] cursor-pointer">Dashboard</span>
                <ChevronRight size={20} className="opacity-[.8]" />
                <span>Create Product</span>
            </div>

            {/* Content Layout */}
            <div className="py-4 w-full flex gap-6">
                {/* Left side image upload section */}
                <div className="md:w-[35%]">
                    {images?.length > 0 && (
                        <ImagePlaceHolder
                            setOpenImageModel={setOpenImageModal}
                            size="765 x 850"
                            small={false}
                            index={0}
                            onImageChange={handleImageChange}
                            onRemove={handleRemoveImage}
                        />
                    )}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        {images.slice(1).map((_, index) => (
                            <ImagePlaceHolder
                                setOpenImageModel={setOpenImageModal}
                                size="765 x 850"
                                key={index}
                                small
                                index={index + 1}
                                onImageChange={handleImageChange}
                                onRemove={handleRemoveImage}
                            />
                        ))}
                    </div>
                </div>

                {/* Right side form Inputs */}
                <div className='mt-6 flex justify-end gap-3 md:w-[65%]'>
                    <div className='w-full flex gap-6'>
                        {/* Product Title Input */}
                        <div className='w-2/4'>
                            <Input
                                label="Product Title *"
                                placeholder="Enter product title"
                                {...register("title", { required: "Title is required" })}
                            />
                            {errors.title && (
                                <p className='text-red-500 text-xs mt-1'>
                                    {errors.title.message as string}
                                </p>
                            )}
                            <div className='mt-2'>
                                <Input
                                    type="textarea"
                                    rows={7}
                                    cols={10}
                                    label="Short Description * (Max 150 words)"
                                    placeholder="Enter product description for quick view"
                                    {...register("description", {
                                        required: "Description is required",
                                        validate: (value) => {
                                            const wordCount = value.trim().split(/\s+/).length;
                                            return (
                                                wordCount <= 150 ||
                                                `Description cannot exceed 150 words (Current: ${wordCount})`
                                            );
                                        },
                                    })}
                                />
                                {errors.description && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {errors.description.message as string}
                                    </p>
                                )}

                            </div>
                            <div className='mt-2'>
                                <Input
                                    label="Tags *"
                                    placeholder='apple, flagship'
                                    {...register("tags", {
                                        required: "separate related tags with a coma, ",
                                    })}
                                />
                                {errors.tags && (
                                    <p className='text-red-500 text-xs mt-1'>
                                        {errors.tags.message as string}
                                    </p>
                                )}


                            </div>
                            <div className='mt-2'>
                                <Input
                                    label="Warranty *"
                                    placeholder='1 Year / No Warranty'
                                    {...register("warranty", {
                                        required: "Warranty is required! ",
                                    })}
                                />
                                {errors.tags && (
                                    <p className='text-red-500 text-xs mt-1'>
                                        {errors.tags.message as string}
                                    </p>
                                )}


                            </div>
                            <div className='mt-2'>
                                <Input
                                    label="Slug *"
                                    placeholder='product_slug'
                                    {...register("slug", {
                                        required: "Slug is required!",
                                        pattern: {
                                            value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                                            message:
                                            "Invalid slug format! use only lowercase letters, numbers and special symbols"
                                        },
                                        minLength: {
                                            value: 3,
                                            message: "slug must be atleast 3 characters long.",
                                        },
                                        maxLength: {
                                            value: 50,
                                            message: "slug cannot be longer than 50 characters.",
                                        },
                                    })}
                                />
                                {errors.slug && (
                                    <p className='text-red-500 text-xs mt-1'>
                                        {errors.slug.message as string}
                                    </p>
                                )}


                            </div>
                            <div className='mt-2'>
                                <Input
                                    label="Brand"
                                    placeholder='Apple'
                                    {...register("brand")}
                                />
                                {errors.tags && (
                                    <p className='text-red-500 text-xs mt-1'>
                                        {errors.tags.message as string}
                                    </p>
                                )}


                            </div>
                            <div className='mt-2'>
                               <ColorSelector control={control} errors={errors} />

                            </div>
                            <div className='mt-2'>
                                <CustomSpecifications control={control} errors={errors} />

                            </div>
                            <div className='mt-2'>
                                <CustomProperties control={control} errors={errors} />

                            </div>
                            <div className='mt-2'>
                                <label className='block font-semibold text-gray-300 mb-1'>
                                    Cash On Delivery *
                                </label>
                                <select 
                                { ...register("cash_on_delivery", {
                                    required: "Cash On Selivery is required",
                                })}
                                defaultValue="yes"
                                className="w-full border outline-none border-gray-700 bg-transparent"
                                >
                                    <option value="yes" className='bg-black'>
                                        Yes
                                    </option>
                                    <option value="no" className='bg-black'>
                                        No
                                    </option>
                                </select>
                                {errors.cash_on_delivery && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {errors.cash_on_delivery.message as string}
                                    </p>
                                )}

                            </div>                       

                        </div>
                        <div className="w-2/4">
                        <label className='block font-semibold text-gray-300 mb-1'>
                            Category *

                        </label>
                        {
                        isLoading ? (
                            <p className="text-gray-400">
                                Loading Categories ...    
                            </p>
                        ) : isError ? (
                            <p className="text-red-500">
                                Failed to load categories
                            </p>
                        ) : (
                            <Controller
                            name="category"
                            control={control}
                            rules={{required: "Category is required"}}
                            render={({field}) => (
                                <select
                                {...field}
                                className='w-full border outline-none border-gray-700 bg-transparent'
                                >
                                    <option value="" className="bg-black">
                                        Select Category
                                    </option>
                                    {
                                        categories?.map((category: string) => (
                                            <option value={category} key={category}
                                            className='bg-black'
                                            >
                                                {category}
                                            </option>
                                        ))}
                                </select>
                            )}
                             />
                        )}
                        {errors.category && (
                            <p className='text-red-500 text-xs mt-1'>
                                {errors.category.message as string}
                            </p>
                        )}
                        <div className='mt-2'>
                            <label className='block font-semibold text-gray-300 mb-1' >
                                Subcategory *
                            </label>
                        <Controller
                            name="category"
                            control={control}
                            rules={{required: "Subcategory is required"}}
                            render={({field}) => (
                                <select
                                {...field}
                                className='w-full border outline-none border-gray-700 bg-transparent'
                                >
                                    <option value="" className="bg-black">
                                        Select subcategory
                                    </option>
                                    {
                                        subcategories?.map((subcategory: string) => (
                                            <option value={subcategory} key={subcategory}
                                            className='bg-black'
                                            >
                                                {subcategory}
                                            </option>
                                        ))}
                                </select>
                            )}
                             />
                             {errors.subcategory && (
                                <p className='ttext-red-500 text-xs mt-1'>

                                </p>
                             )}

                        </div>
                        {/* detailed description */}
                        <div className='mt-2'>
                            <label className='block font-semibols text-gray-300 mb-1'>
                                Detailed Description * (Min 100 words)

                            </label>
                            <Controller
                            name="detailed_description"
                            control={control}
                            rules={{ 
                                required: "Detailed description is required",
                                validate: (value) => {
                                    const wordCount = value
                                    ?.split(/\s+/)
                                    .filter((word: string) => word).length;
                                    return (
                                        wordCount >= 100 ||
                                        "Description must be atleast 100 words"
                                    );
                                },
                            }}

                            render={({field}) => (
                                < RichTextEditor
                                value={field.value}
                                onChange={field.onChange}
                                />
                            )}
                            />
                            {errors.detailed_description && (
                                <p className="text-red-500 text-xs mt-1">
                                    {errors.detailed_description.message as string}

                                </p>
                            )}

                        </div>

                        <div className='mt-2'>
                            <Input
                            label="Video URL"
                            placeholder='https://www.youtube.com'
                            { ...register("Video_url", {
                                pattern: {
                                    value:
                                    /^https:\/\/(www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]+$/,
                                    message:
                                    "Invalid YouTube embeded URL! Use format: https://ww.youtube.com/embeded/"
                                },
                            })}
                            />
                            {errors.video_url && (
                                <p className='text-red-500 text-xs mt-1'>
                                    {errors.video_url.message as string}
                                </p>
                            )}

                        </div>
                        <div className='mt-2'>
                            <Input
                            label="Regular Price"
                            placeholder="Kes 1000"
                            {...register("regular_price", {
                                valueAsNumber: true,
                                min: { value: 1, message: "price must be atlest 1"},
                                validate: (value) => 
                                    !isNaN(value) || "Only numbers are allowed",
                            })}
                            />
                            {errors.regular_price && (
                                <p className='text-red-500 text-xs mt-1'>
                                    {errors.regular_price.message as string}
                                </p>
                            )}

                        </div>
                        <div className='mt-2'>
                            <Input
                            label="Sale Price *"
                            placeholder="Kes 750"
                            { ...register("sale_price", {
                                required: "Sale Price is required",
                                valueAsNumber: true,
                                min: {value: 1, message: "Sale Price must be stleast 1" },
                                validate: (value) => {
                                    if (isNaN(value)) return "Only Numbers are allowed";
                                    if (regularPrice && value >= regularPrice) {
                                        return "Sale Price Must be less that Regular Price";
                                    }
                                    return true;                                   
                                },
                            })}
                            />

                        </div>
                        <div className='mt-2'>
                            <Input 
                            label="Stock *"
                            placeholder="100"
                            {...register("stock", {
                                required: "Stock is required!",
                                valueAsNumber: true,
                                min: {value: 1, message: "Stock must be atleast 1 "},
                                max: {
                                    value: 1000,
                                    message: "Stock cannot exceed 1,000",
                                },
                                validate: (value) => {
                                    if(isNaN(value)) return "Only numbers are allowed!";
                                    if(!Number.isInteger(value))
                                        return "Stock must be a whole number!";
                                    return true;
                                },
                                
                            })

                            }
                            />

                        </div>
                        <div className='mt-2'>
                            <SizeSelector control={control} errors={errors}/>

                        </div>
                        <div className='mt-3'>
                            <label className='block font-semibold text-gray-300 mb-1'>
                                Select Discount Codes (Optional)
                            </label>

                        </div>
                        <div className='mt-2'>

                        </div>

                        </div>
                        
                    </div>
                </div>

            </div>
            <div className='mt-6 flex justify-end gap-3'>
                            {isChanged && (
                                <button 
                                type="button"
                                onClick={handleSaveDraft}
                                className='px-4 py-2 bg-gray-700 text-white rounded-md'
                                >
                                    Save Draft
                                </button>
                            )}
                            <button 
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md"
                            disabled={loading}
                            >
                                {loading ? "Creating..." : "Create"}

                            </button>

                        </div>

        </form>
    );
};

export default Page;