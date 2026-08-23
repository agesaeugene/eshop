import { Pencil, WandSparkles, X } from 'lucide-react';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';

const ImagePlaceHolder = ({
    size,
    small,
    onImageChange,
    pictureUploadingLoader,
    onRemove,
    defaultImage = null,
    index = null,
    setSelectedImage,
    setOpenImageModel,
    images,
}: {
    size: string;
    small?: boolean;
    pictureUploadingLoader: boolean;
    onImageChange: (file: File | null, index: number) => void;
    onRemove?: (index: number) => void;
    defaultImage?: string | null;
    setSelectedImage: (e: string, index: number) => void;
    images: any;
    setOpenImageModel: (openImageModel: boolean) => void;
    index?: any;
}) => {
    const [imagePreview, setImagePreview] = useState<string | null>(defaultImage);

    // Keep local preview in sync with the parent's actual image state.
    // Without this, deleting an image (parent sets it back to null) or
    // swapping a local blob URL for the real uploaded URL won't show up here.
    useEffect(() => {
        setImagePreview(defaultImage);
    }, [defaultImage]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImagePreview(URL.createObjectURL(file));
            onImageChange(file, index!);
        }
    };

    const handleRemove = () => {
        setImagePreview(null); // instant UI feedback, don't wait on parent state / API round-trip
        onRemove?.(index!);
    };

    return (
        <div
            className={`relative ${small ? 'h-[180px]' : 'h-[450px]'} w-full cursor-pointer bg-[#1e1e1e] border border-gray-600 rounded-lg flex flex-col justify-center items-center`}
        >
            <input
                type="file"
                accept="image/*"
                className="hidden"
                id={`image-upload-${index}`}
                onChange={handleFileChange}
            />

            {imagePreview ? (
                <>
                    {/* Image renders first as the background layer */}
                    <Image
                        src={imagePreview}
                        alt="uploaded"
                        fill
                        className="w-full h-full object-cover rounded-lg"
                    />

                    {/* Controls sit above the image via z-index, same size (p-2 + 16px icon) */}
                    <button
                        type="button"
                        disabled={pictureUploadingLoader}
                        onClick={handleRemove}
                        className="absolute top-3 right-3 z-20 p-2 !rounded bg-red-600 shadow-lg"
                        title="Remove image"
                    >
                        <X size={16} />
                    </button>
                    <button
                        disabled={pictureUploadingLoader}
                        type="button"
                        className="absolute top-3 right-[70px] z-20 p-2 !rounded bg-blue-500 shadow-lg cursor-pointer"
                        onClick={() => {
                            setOpenImageModel(true);
                            setSelectedImage(images[index].file_url, index);
                        }}
                        title="Edit with AI"
                    >
                        <WandSparkles size={16} />
                    </button>
                </>
            ) : (
                <>
                    <label
                        htmlFor={`image-upload-${index}`}
                        className="absolute top-3 right-3 p-2 !rounded bg-slate-700 shadow-lg cursor-pointer"
                    >
                        <Pencil size={16} />
                    </label>
                    <p
                        className={`text-gray-400 ${small ? 'text-xl' : 'text-4xl'} font-semibold`}
                    >
                        {size}
                    </p>
                    <p
                        className={`text-gray-500 ${small ? 'text-sm' : 'text-lg'} pt-2 text-center`}
                    >
                        Please choose an image <br />
                        according to the expected ratio
                    </p>
                </>
            )}
        </div>
    );
};

export default ImagePlaceHolder;