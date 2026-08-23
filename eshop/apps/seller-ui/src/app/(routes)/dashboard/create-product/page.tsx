'use client';

import ImagePlaceHolder from 'apps/seller-ui/src/shared/components/image-placeholder';
import { ChevronRight, Wand, X } from 'lucide-react';
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
import Image from 'next/image';
import { enhancements } from 'apps/seller-ui/src/utils/AI.enhancements';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface UploadedImage {
    fileId: string;
    file_url: string;
}

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
    const [isChanged, setIsChanged] = useState(true);
    const [activeEffect, setActiveEffect] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState('');
    const [pictureUploadingLoader, setPictureUploadingLoader] = useState(false);
    const [images, setImages] = useState<(UploadedImage | null)[]>([null]);
    const router = useRouter()
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false)

    const { data, isLoading, isError } = useQuery({
        queryKey: ["categories"],
        queryFn: async () => {
            try {
                const res = await axiosInstance.get("/product/api/get-categories");
                return res.data;

            } catch (error) {
                console.log(error);
            }
        },
        staleTime: 1000 * 60 * 5,
        retry: 2,
    });

    const { data: discountCodes = [], isLoading: discountLoading } = useQuery({
        queryKey: ["shop-discounts"],
        queryFn: async () => {
            const res = await axiosInstance.get("/product/api/get-discount-codes");
            return res?.data?.discount_codes || [];
        },
    });

    const categories = data?.categories || [];
    const subCategoriesData = data?.subCategories || {};

    const selectedCategory = watch("category");
    const regularPrice = watch("regular_price")

    const subcategories = useMemo(() => {
        return selectedCategory ? subCategoriesData[selectedCategory] || [] : [];
    }, [selectedCategory, subCategoriesData]);



    const onSubmit = async (data: any) => {
        try {
            setLoading(true);
            await axiosInstance.post("/product/api/create-product", data);
            router.push("/dashboard/all-products");
        } catch (error: any) {
            toast.error(error?.data?.message);


        } finally {
            setLoading(false);
        }
    };


    const convertFileToBase64 = (file: File) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    const handleImageChange = async (file: File | null, index: number) => {

        if (!file) return;
        setPictureUploadingLoader(true);

        try {
            const fileName = await convertFileToBase64(file);
            const response = await axiosInstance.post("/product/api/upload-product-image", { fileName });

            const updatedImages = [...images];

            const uploadedImage: UploadedImage = {
                fileId: response.data.fileId,
                file_url: response.data.file_url,
            }

            //updatedImages[index] = response.data.file_url;
            updatedImages[index] = uploadedImage;

            if (index == images.length - 1 && updatedImages.length < 8) {
                updatedImages.push(null);
            }

            setImages(updatedImages);
            setValue("images", updatedImages);

        } catch (error) {
            console.log(error);

        } finally {
            setPictureUploadingLoader(false);
        }

    };

    const handleRemoveImage = async (index: number) => {
        try {
            const updatedImages = [...images];

            const imageToDelete = updatedImages[index];

            if (imageToDelete && typeof imageToDelete == "object") {
                await axiosInstance.delete("/product/api/delete-product-image", {
                    data: {
                        fileId: imageToDelete.fileId!,
                    },
                });
            }

            updatedImages.splice(index, 1);
            // Add null placeholder

            if (!updatedImages.includes(null) && updatedImages.length < 8) {
                updatedImages.push(null);
            }

            setImages(updatedImages);
            setValue("images", updatedImages);

        } catch (error) {
            console.log(error);
        }
    };

    const [baseImage, setBaseImage] = useState('');
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

    const applyTransformation = async (transformation: string) => {
        if (!baseImage || processing) return;
        setProcessing(true);
        setActiveEffect(transformation);

        try {
            let transformedUrl: string;

            if (transformation === "e-dropshadow") {
                transformedUrl = `${baseImage}?tr=e-removedotbg:e-dropshadow`;
            } else {
                transformedUrl = `${baseImage}?tr=${transformation}`;
            }

            setSelectedImage(transformedUrl);
        } catch (error) {
            console.log(error);
        } finally {
            setProcessing(false);
        }
    };

    const handleSelectImageForEdit = (imageUrl: string, index: number) => {
        setBaseImage(imageUrl);
        setSelectedImage(imageUrl);
        setSelectedImageIndex(index);
        setActiveEffect(null);
    };

    const applyEnhancedImage = () => {
        if (selectedImageIndex === null || !selectedImage) return;

        const updatedImages = [...images];
        const current = updatedImages[selectedImageIndex];

        updatedImages[selectedImageIndex] = {
            fileId: current?.fileId ?? '',
            file_url: selectedImage,
        };

        setImages(updatedImages);
        setValue("images", updatedImages);
        setOpenImageModal(false);
        setBaseImage('');
        setSelectedImageIndex(null);
        setActiveEffect(null);
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
                            images={images}
                            pictureUploadingLoader={pictureUploadingLoader}
                            index={0}
                            defaultImage={images[0]?.file_url ?? null}
                            onImageChange={handleImageChange}
                            setSelectedImage={handleSelectImageForEdit}
                            onRemove={handleRemoveImage}
                        />
                    )}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        {images.slice(1).map((img, index) => (
                            <ImagePlaceHolder
                                setOpenImageModel={setOpenImageModal}
                                size="765 x 850"
                                pictureUploadingLoader={pictureUploadingLoader}
                                images={images}
                                key={index}
                                small
                                index={index + 1}
                                defaultImage={img?.file_url ?? null}
                                onImageChange={handleImageChange}
                                setSelectedImage={handleSelectImageForEdit}
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
                                    {...register("short_description", {
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
                                    {...register("cash_on_delivery", {
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
                                        rules={{ required: "Category is required" }}
                                        render={({ field }) => (
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
                                    name="subCategory"
                                    control={control}
                                    rules={{ required: "Subcategory is required" }}
                                    render={({ field }) => (
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
                                            // Quill returns HTML (e.g. "<p>...</p><p>...</p>").
                                            // Strip tags first — otherwise words glued across paragraph
                                            // boundaries (</p><p>) merge into one "word" and undercount.
                                            const plainText = (value || "")
                                                .replace(/<[^>]*>/g, " ")
                                                .replace(/&nbsp;/g, " ");
                                            const wordCount = plainText
                                                .trim()
                                                .split(/\s+/)
                                                .filter((word: string) => word).length;
                                            return (
                                                wordCount >= 100 ||
                                                `Description must be atleast 100 words (Current: ${wordCount})`
                                            );
                                        },
                                    }}

                                    render={({ field }) => (
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
                                    {...register("Video_url", {
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
                                        min: { value: 1, message: "price must be atlest 1" },
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
                                    {...register("sale_price", {
                                        required: "Sale Price is required",
                                        valueAsNumber: true,
                                        min: { value: 1, message: "Sale Price must be stleast 1" },
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
                                        min: { value: 1, message: "Stock must be atleast 1 " },
                                        max: {
                                            value: 1000,
                                            message: "Stock cannot exceed 1,000",
                                        },
                                        validate: (value) => {
                                            if (isNaN(value)) return "Only numbers are allowed!";
                                            if (!Number.isInteger(value))
                                                return "Stock must be a whole number!";
                                            return true;
                                        },

                                    })

                                    }
                                />

                            </div>
                            <div className='mt-2'>
                                <SizeSelector control={control} errors={errors} />

                            </div>
                            <div className='mt-3'>
                                <label className='block font-semibold text-gray-300 mb-1'>
                                    Select Discount Codes (Optional)

                                </label>

                                {discountLoading ? (
                                    <p className="text-gray-400">
                                        Loading Discount Codes...
                                    </p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {discountCodes?.map((code: any) => (
                                            <button key={code.id}
                                                type="button"
                                                className={`px-3 py-1 rounded-md text-sm fot-semibold border ${watch("discountCodes")?.includes(code.id) ? "bg-blue-600 text-white border-blue-600" : "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700"}`}
                                                onClick={() => {
                                                    const currentSelection = watch("discountCodes") || [];
                                                    const updatedSelection = currentSelection?.includes(
                                                        code.id
                                                    ) ? currentSelection.filter((id: string) => id !== code.id) : [...currentSelection, code.id];
                                                    setValue("discountCodes", updatedSelection)
                                                }}
                                            >

                                                {code?.public_name} ({code.discountValue}
                                                {code.discountType == "percentage" ? "%" : "Ksh"})

                                            </button>
                                        ))}

                                    </div>
                                )}

                            </div>
                            <div className='mt-2'>

                            </div>

                        </div>

                    </div>
                </div>


            </div>
            {openImageModal && (
                <div className='fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black/60 z-50'>
                    <div className='bg-gray-800 p-6 rounded-lg w-[450px] text-white'>
                        <div className='flex justify-between items-center pb-3 mb-4'>
                            <h2 className='text-lg font-semibold'>Enhance Product Image</h2>
                            <X
                                size={20}
                                className='cursor-pointer'
                                onClick={() => {
                                    setOpenImageModal(false);
                                    setBaseImage('');
                                    setSelectedImageIndex(null);
                                    setActiveEffect(null);
                                }}
                            />
                        </div>

                        <div className='relative w-full h-[250px] rounded-md overflow-hidden border border-gray-600'>
                            <Image
                                src={selectedImage}
                                alt="product-image"
                                fill
                                unoptimized
                                className="object-cover"
                                onLoad={() => setProcessing(false)}
                                onError={() => setProcessing(false)}
                            />
                            {processing && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                                    <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                </div>
                            )}
                        </div>

                        {selectedImage && (
                            <div className='mt-4 space-y-2'>
                                <h3 className='text-white text-sm font-semibold'>
                                    AI Enhancements
                                </h3>
                                <div className="grid grid-cols-2 gap-3 max-h-[250px] overflow-y-auto">
                                    {enhancements?.map(({ label, effect }) => (
                                        <button
                                            key={effect}
                                            className={`p-2 rounded-md flex items-center gap-2 ${activeEffect === effect
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-700 hover:bg-gray-600"
                                                }`}
                                            onClick={() => applyTransformation(effect)}
                                            disabled={processing}
                                        >
                                            <Wand size={18} />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={applyEnhancedImage}
                                    disabled={processing || activeEffect === null}
                                    className="w-full mt-3 px-4 py-2 bg-green-600 disabled:opacity-50 text-white rounded-md"
                                >
                                    Use This Image
                                </button>
                            </div>

                        )}
                    </div>
                </div>
            )}
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