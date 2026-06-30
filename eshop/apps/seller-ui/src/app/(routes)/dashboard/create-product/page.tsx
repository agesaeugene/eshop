'use client';

import ImagePlaceHolder from 'apps/seller-ui/src/shared/components/image-placeholder';
import { ChevronRight } from 'lucide-react';
import Input from '../../../../../../../packages/compoonents/input';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import ColorSelector from '../../../../../../../packages/compoonents/color-selector';

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

                        </div>
                    </div>
                </div>

            </div>

        </form>
    );
};

export default Page;