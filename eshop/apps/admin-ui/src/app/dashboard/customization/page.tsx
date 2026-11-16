"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import axiosInstance from "../../utils/axiosinstance";

const tabs = ["Categories", "Logo", "Banner"] as const;
type Tab = (typeof tabs)[number];
type ImageField = "logo" | "banner";
type Notice = { type: "info" | "error"; text: string } | null;

const styles = `
.cz-root {
  --bg: #050505; --field: #202630; --field-border: #343b47; --text: #f4f5f7;
  --muted: #9298a3; --line: #292a2e; --blue: #2459e8; --blue-hover: #326af7; --focus: #6c91ff;
  color-scheme: dark;
  min-height: 100vh; background: var(--bg); color: var(--text);
  font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.45;
}
.cz-root * { box-sizing: border-box; }
.cz-page { padding: 20px 18px 48px; width: 100%; }
.cz-root h1 { font-size: 22px; font-weight: 650; letter-spacing: -.35px; margin: 0 0 8px; }
.cz-breadcrumb { color: #a7abb4; font-size: 14px; margin-bottom: 24px; }
.cz-breadcrumb a { color: #7898e9; text-decoration: none; }
.cz-chevron { color: #d5d7dc; margin: 0 7px; }
.cz-tabs { display: flex; align-items: stretch; gap: 25px; border-bottom: 1px solid var(--line); min-height: 31px; margin-bottom: 32px; }
.cz-tab { position: relative; padding: 0 0 10px; border: 0; background: transparent; color: #92949b; font: inherit; cursor: pointer; }
.cz-tab.active { color: #f2f2f4; font-weight: 600; }
.cz-tab.active::after { content: ""; height: 2px; position: absolute; left: 0; right: 0; bottom: -1px; background: #d5d5d8; border-radius: 2px; }
.cz-tab:focus-visible, .cz-root button:focus-visible, .cz-root input:focus-visible, .cz-root select:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.cz-category-list { width: min(420px, 100%); }
.cz-category { margin: 0 0 17px; }
.cz-category h2 { margin: 0 0 5px; font-size: 16px; line-height: 1.35; font-weight: 650; }
.cz-category ul { margin: 0; padding-left: 17px; color: #a0a2a8; }
.cz-category li { line-height: 1.45; }
.cz-category .cz-empty { color: var(--muted); font-style: italic; list-style: none; margin-left: -17px; }
.cz-add-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 30px; }
.cz-sub-row { margin-top: 32px; }
.cz-root input[type="text"], .cz-root select {
  height: 31px; border: 1px solid var(--field-border); border-radius: 6px; background: var(--field);
  color: #e6e8ed; padding: 0 12px; font: inherit; min-width: 0;
}
.cz-root input::placeholder { color: #858c98; opacity: 1; }
.cz-root input:focus, .cz-root select:focus { border-color: var(--focus); outline: none; }
.cz-input { width: 181px; }
.cz-root select { width: 154px; padding-right: 24px; cursor: pointer; }
.cz-action {
  height: 31px; border: 1px solid #1747cf; border-radius: 6px; background: var(--blue); color: #fff;
  padding: 0 12px; font: inherit; cursor: pointer; white-space: nowrap; box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
}
.cz-action:hover:not(:disabled) { background: var(--blue-hover); }
.cz-action:active:not(:disabled) { transform: translateY(1px); }
.cz-action:disabled, .cz-secondary:disabled { opacity: .55; cursor: not-allowed; }
.cz-notice { margin-top: 12px; min-height: 20px; color: #8eb2ff; font-size: 13px; }
.cz-notice.error { color: #ff8b8b; }
.cz-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.cz-editor { max-width: 700px; }
.cz-editor h2 { font-size: 16px; margin: 0 0 7px; }
.cz-help { color: var(--muted); margin: 0 0 20px; }
.cz-upload-box { border: 1px dashed #454b57; border-radius: 8px; background: #0b0c0f; padding: 22px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.cz-preview { width: 140px; height: 90px; border: 1px solid #333843; border-radius: 6px; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #14171d; color: #838a96; text-align: center; font-size: 12px; }
.cz-preview.logo { width: 90px; height: 90px; border-radius: 50%; }
.cz-preview img { width: 100%; height: 100%; object-fit: contain; }
.cz-preview.banner img { object-fit: cover; }
.cz-upload-controls { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
.cz-file-input { display: none; }
.cz-file-label { display: inline-flex; align-items: center; height: 31px; padding: 0 12px; border: 1px solid #3a414d; border-radius: 6px; background: var(--field); cursor: pointer; color: #e6e8ed; }
.cz-file-label:hover { background: #2a303b; }
.cz-file-label.disabled { opacity: .55; pointer-events: none; }
.cz-file-name { color: var(--muted); font-size: 12px; overflow-wrap: anywhere; }
.cz-hint { color: var(--muted); font-size: 12px; margin: 0; }
.cz-editor-actions { margin-top: 18px; display: flex; gap: 8px; align-items: center; }
.cz-secondary { height: 31px; padding: 0 12px; border: 1px solid #3a414d; border-radius: 6px; color: #e6e8ed; background: #171a20; cursor: pointer; font: inherit; }
.cz-secondary:hover:not(:disabled) { background: #242832; }
@media (max-width: 520px) {
  .cz-page { padding: 18px 14px 36px; }
  .cz-root h1 { font-size: 21px; }
  .cz-tabs { gap: 22px; }
  .cz-add-row { align-items: stretch; }
  .cz-input { flex: 1 1 180px; width: auto; }
  .cz-root select { flex: 1 1 154px; width: auto; }
  .cz-upload-box { padding: 15px; }
}
`;

const Customization = () => {
    const [activeTab, setActiveTab] = useState<Tab>("Categories");

    const [categories, setCategories] = useState<string[]>([]);
    const [subCategories, setSubCategories] = useState<Record<string, string[]>>({});
    const [loadingConfig, setLoadingConfig] = useState(true);

    // Saved (server) images
    const [logo, setLogo] = useState<string | null>(null);
    const [banner, setBanner] = useState<string | null>(null);

    // Locally selected files awaiting "Save"
    const [pending, setPending] = useState<Record<ImageField, { file: File; url: string } | null>>({
        logo: null,
        banner: null,
    });

    const [newCategory, setNewCategory] = useState("");
    const [newSubCategory, setNewSubCategory] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");

    const [uploading, setUploading] = useState<ImageField | null>(null);
    const [notices, setNotices] = useState<Record<Tab, Notice>>({
        Categories: null,
        Logo: null,
        Banner: null,
    });

    const pendingRef = useRef(pending);
    pendingRef.current = pending;

    const setNotice = (tab: Tab, notice: Notice) =>
        setNotices((prev) => ({ ...prev, [tab]: notice }));

    useEffect(() => {
        const fetchCustomization = async () => {
            try {
                const res = await axiosInstance.get("/admin/api/get-all-customizations");
                const data = res.data;
                setCategories(Array.isArray(data.categories) ? data.categories : []);
                setSubCategories(data.subCategories && typeof data.subCategories === "object" ? data.subCategories : {});
                setSelectedCategory(data.categories?.[0] ?? "");
                setLogo(data.logo ?? null);
                setBanner(data.banner ?? null);
            } catch (err) {
                console.error("Failed to fetch customization data", err);
                setNotice("Categories", {
                    type: "error",
                    text: (err as any)?.response?.data?.message || "Could not load saved platform customizations.",
                });
            } finally {
                setLoadingConfig(false);
            }
        };
        fetchCustomization();
    }, []);

    // Revoke any outstanding preview URLs on unmount
    useEffect(() => {
        return () => {
            (Object.values(pendingRef.current) as ({ url: string } | null)[]).forEach((p) => {
                if (p) URL.revokeObjectURL(p.url);
            });
        };
    }, []);

    /* ---------------- Categories ---------------- */

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        const category = newCategory.trim();
        if (!category) return;
        if (categories.some((c) => c.toLowerCase() === category.toLowerCase())) {
            setNotice("Categories", { type: "error", text: "That category already exists." });
            return;
        }
        try {
            const response = await axiosInstance.post("/admin/api/add-category", { category });
            setCategories(response.data.categories);
            setSubCategories(response.data.subCategories);
            setSelectedCategory(category);
            setNewCategory("");
            setNotice("Categories", { type: "info", text: `Category “${category}” added.` });
        } catch (err) {
            setNotice("Categories", {
                type: "error",
                text: (err as any)?.response?.data?.message || "Failed to add category.",
            });
        }
    };

    const handleAddSubCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        const subCategory = newSubCategory.trim();
        if (!selectedCategory) {
            setNotice("Categories", { type: "error", text: "Please select a category first." });
            return;
        }
        if (!subCategory) return;
        const existing = subCategories[selectedCategory] || [];
        if (existing.some((s) => s.toLowerCase() === subCategory.toLowerCase())) {
            setNotice("Categories", {
                type: "error",
                text: "That subcategory already exists in this category.",
            });
            return;
        }
        try {
            const response = await axiosInstance.post("/admin/api/add-subcategories", {
                category: selectedCategory,
                subCategory,
            });
            setSubCategories(response.data.subCategories);
            setNewSubCategory("");
            setNotice("Categories", {
                type: "info",
                text: `Subcategory “${subCategory}” added to ${selectedCategory}.`,
            });
        } catch (err) {
            setNotice("Categories", {
                type: "error",
                text: (err as any)?.response?.data?.message || "Failed to add subcategory.",
            });
        }
    };

    /* ---------------- Logo / Banner ---------------- */

    const label = (field: ImageField): Tab => (field === "logo" ? "Logo" : "Banner");

    const clearPending = (field: ImageField) => {
        setPending((prev) => {
            if (prev[field]) URL.revokeObjectURL(prev[field]!.url);
            return { ...prev, [field]: null };
        });
    };

    const handleSelect = (e: React.ChangeEvent<HTMLInputElement>, field: ImageField) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type) || file.size > 8 * 1024 * 1024) {
            setNotice(label(field), { type: "error", text: "Choose a PNG, JPEG, WebP or GIF image under 8 MB." });
            e.target.value = "";
            return;
        }
        setPending((prev) => {
            if (prev[field]) URL.revokeObjectURL(prev[field]!.url);
            return { ...prev, [field]: { file, url: URL.createObjectURL(file) } };
        });
        setNotice(label(field), { type: "info", text: "Preview updated. Select Save to confirm." });
        e.target.value = "";
    };

    const handleSave = async (field: ImageField, endpoint: string) => {
        const selected = pending[field];
        if (!selected) {
            setNotice(label(field), { type: "error", text: "Choose an image before saving." });
            return;
        }
        try {
            setUploading(field);
            setNotice(label(field), null);
            const fileName = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read the selected image."));
                reader.onerror = () => reject(new Error("Could not read the selected image."));
                reader.readAsDataURL(selected.file);
            });
            const res = await axiosInstance.post(endpoint, { fileName });
            if (field === "logo") setLogo(res.data.logo);
            else setBanner(res.data.banner);
            clearPending(field);
            setNotice(label(field), { type: "info", text: `${label(field)} saved successfully.` });
        } catch (err) {
            setNotice(label(field), {
                type: "error",
                text: (err as any)?.response?.data?.message || `Failed to upload ${field}.`,
            });
        } finally {
            setUploading(null);
        }
    };

    const handleRemove = (field: ImageField) => {
        if (!pending[field]) {
            setNotice(label(field), { type: "info", text: "No unsaved selection to remove." });
            return;
        }
        clearPending(field);
        setNotice(label(field), { type: "info", text: "Selection removed from the preview." });
    };

    const renderImageEditor = (field: ImageField) => {
        const tab = label(field);
        const saved = field === "logo" ? logo : banner;
        const selected = pending[field];
        const shown = selected?.url || saved;
        const notice = notices[tab];
        const busy = uploading !== null;

        return (
            <section
                className="cz-editor"
                id={`${field}Panel`}
                role="tabpanel"
                aria-labelledby={`${field}Tab`}
            >
                <h2>Store {field}</h2>
                <p className="cz-help">
                    Upload or replace the {field} displayed {field === "logo" ? "for" : "across"} your store.
                    Image files only.
                </p>
                <div className="cz-upload-box">
                    <div className={`cz-preview ${field}`}>
                        {shown ? <img src={shown} alt={`${tab} preview`} /> : `${tab} preview`}
                    </div>
                    <div className="cz-upload-controls">
                        <label className={`cz-file-label ${busy ? "disabled" : ""}`} htmlFor={`${field}File`}>
                            Choose {field}
                        </label>
                        <input
                            className="cz-file-input"
                            type="file"
                            id={`${field}File`}
                            accept="image/*"
                            disabled={busy}
                            onChange={(e) => handleSelect(e, field)}
                        />
                        <span className="cz-file-name">
                            {selected ? selected.file.name : "No file selected"}
                        </span>
                        <span className="cz-hint">
                            {field === "logo"
                                ? "Recommended: square image, PNG or WebP."
                                : "Recommended: wide landscape image."}
                        </span>
                    </div>
                </div>
                <div className="cz-editor-actions">
                    <button
                        className="cz-action"
                        type="button"
                        disabled={busy || !selected}
                        onClick={() => handleSave(field, `/admin/api/upload-${field}`)}
                    >
                        {uploading === field ? "Uploading..." : `Save ${tab}`}
                    </button>
                    <button
                        className="cz-secondary"
                        type="button"
                        disabled={busy}
                        onClick={() => handleRemove(field)}
                    >
                        Remove
                    </button>
                </div>
                <div
                    className={`cz-notice ${notice?.type === "error" ? "error" : ""}`}
                    role="status"
                    aria-live="polite"
                >
                    {notice?.text}
                </div>
            </section>
        );
    };

    const categoryNotice = notices.Categories;

    return (
        <div className="cz-root">
            <style>{styles}</style>
            <main className="cz-page">
                <header>
                    <h1>Customization</h1>
                    <nav className="cz-breadcrumb" aria-label="Breadcrumb">
                        <Link href="/dashboard">Dashboard</Link>
                        <span className="cz-chevron">›</span>
                        <span>Customization</span>
                    </nav>
                </header>

                <nav className="cz-tabs" role="tablist" aria-label="Customization sections">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            id={`${tab.toLowerCase()}Tab`}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab}
                            aria-controls={`${tab.toLowerCase()}Panel`}
                            className={`cz-tab ${activeTab === tab ? "active" : ""}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>

                {activeTab === "Categories" && (
                    <section id="categoriesPanel" role="tabpanel" aria-labelledby="categoriesTab">
                        {loadingConfig && <p className="cz-help">Loading saved customizations...</p>}
                        <div className="cz-category-list" aria-live="polite">
                            {!loadingConfig && categories.length === 0 ? (
                                <p className="cz-help">No categories found</p>
                            ) : (
                                categories.map((cat) => (
                                    <article key={cat} className="cz-category">
                                        <h2>{cat}</h2>
                                        <ul>
                                            {(subCategories[cat]?.length ?? 0) > 0 ? (
                                                subCategories[cat].map((sub) => (
                                                    <li key={sub}>
                                                        <span>{sub}</span>
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="cz-empty">No subcategories yet</li>
                                            )}
                                        </ul>
                                    </article>
                                ))
                            )}
                        </div>

                        <form className="cz-add-row" onSubmit={handleAddCategory}>
                            <label className="cz-sr" htmlFor="newCategory">New category</label>
                            <input
                                className="cz-input"
                                id="newCategory"
                                type="text"
                                placeholder="New category"
                                maxLength={60}
                                autoComplete="off"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                required
                            />
                            <button className="cz-action" type="submit">Add Category</button>
                        </form>

                        <form className="cz-add-row cz-sub-row" onSubmit={handleAddSubCategory}>
                            <label className="cz-sr" htmlFor="categorySelect">Select category</label>
                            <select
                                id="categorySelect"
                                aria-label="Select category"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="">Select category</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                            <label className="cz-sr" htmlFor="newSubcategory">New subcategory</label>
                            <input
                                className="cz-input"
                                id="newSubcategory"
                                type="text"
                                placeholder="New subcategory"
                                maxLength={60}
                                autoComplete="off"
                                value={newSubCategory}
                                onChange={(e) => setNewSubCategory(e.target.value)}
                                required
                            />
                            <button className="cz-action" type="submit">Add Subcategory</button>
                        </form>

                        <div
                            className={`cz-notice ${categoryNotice?.type === "error" ? "error" : ""}`}
                            role="status"
                            aria-live="polite"
                        >
                            {categoryNotice?.text}
                        </div>
                    </section>
                )}

                {activeTab === "Logo" && renderImageEditor("logo")}
                {activeTab === "Banner" && renderImageEditor("banner")}
            </main>
        </div>
    );
};

export default Customization;