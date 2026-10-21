import React, { useState, useEffect, memo } from 'react';
import {
  ArrowLeft,
  Upload,
  Sparkles,
  Leaf,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  Search,
  Link2,
  X,
  Ruler,
  UtensilsCrossed,
  Scale,
  Coffee,
  Boxes,
  Palette,
  Hash,
  Tag,
  Package
} from 'lucide-react';
import { Product, ProductVariant, ProductExtra } from '../../types';
import { triggerHaptic } from '../../utils/haptics';
import { uploadOptimizedImages } from '../../services/storageService';
import { findFoodImagesOnline, DetectedFoodImage } from '../../utils/foodImageFinder';
import { getCachedExtras, subscribeToExtras } from '../../services/extrasService';

interface ProductFormScreenProps {
  product: Product | null;
  categories: string[];
  onBack: () => void;
  onSave: (payload: {
    id?: string;
    productPayload: Partial<Product>;
    isFeatured: boolean;
  }) => Promise<void>;
}

export const ProductFormScreen: React.FC<ProductFormScreenProps> = memo(({
  product,
  categories,
  onBack,
  onSave
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState<number | ''>('');
  const [category, setCategory] = useState(categories[0] || 'Bakery');
  const [customCategory, setCustomCategory] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [available, setAvailable] = useState(true);
  const [isVegetarian, setIsVegetarian] = useState(true);
  const [isNonFood, setIsNonFood] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [imageFit, setImageFit] = useState<'cover' | 'contain'>('cover');
  const [imageFits, setImageFits] = useState<Record<string, 'cover' | 'contain'>>({});
  const [hasPrepTime, setHasPrepTime] = useState(false);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number | ''>(15);

  const [variantMode, setVariantMode] = useState<'single' | 'size'>('single');
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; stage?: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [globalExtras, setGlobalExtras] = useState<ProductExtra[]>(() => getCachedExtras());
  const [selectedExtras, setSelectedExtras] = useState<ProductExtra[]>(() => product?.availableExtras || []);
  const [customExtraName, setCustomExtraName] = useState('');
  const [customExtraPrice, setCustomExtraPrice] = useState<number | ''>(25);

  useEffect(() => {
    const unsub = subscribeToExtras((items) => {
      setGlobalExtras(items);
    });
    return () => unsub();
  }, []);

  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [detectedImages, setDetectedImages] = useState<DetectedFoodImage[]>([]);
  const [selectedDetectedUrls, setSelectedDetectedUrls] = useState<string[]>([]);
  const [isDetectPanelOpen, setIsDetectPanelOpen] = useState(false);
  const [customSearchQuery, setCustomSearchQuery] = useState('');
  const [searchSuccessFeedback, setSearchSuccessFeedback] = useState<string | null>(null);
  const [replaceExistingOnSave, setReplaceExistingOnSave] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setDescription(product.description || '');
      setBasePrice(product.price || '');
      if (categories.includes(product.category)) {
        setCategory(product.category);
        setCustomCategory('');
      } else {
        setCategory('Custom');
        setCustomCategory(product.category || '');
      }

      const rawProdsImages = (product.images && product.images.length > 0)
        ? product.images.filter((img) => img && !img.includes('photo-1546069901-ba9599a7e63c'))
        : product.imageUrl && !product.imageUrl.includes('photo-1546069901-ba9599a7e63c')
        ? [product.imageUrl]
        : [];
      setImages(rawProdsImages);
      setImageUrlInput('');
      setAvailable(product.available !== false);
      setIsVegetarian(product.isVegetarian !== false);
      setIsNonFood(Boolean(product.isNonFood));
      setIsFeatured(Boolean(product.isFeatured || product.isPinnedToFront));
      setImageFit(product.imageFit === 'contain' ? 'contain' : 'cover');
      const initialFits: Record<string, 'cover' | 'contain'> = {};
      rawProdsImages.forEach((img, i) => {
        const val = product.imageFits?.[String(i)] || (product.imageFits as any)?.[img] || product.imageFit || 'cover';
        initialFits[String(i)] = val === 'contain' ? 'contain' : 'cover';
      });
      setImageFits(initialFits);

      if (typeof product.prepTimeMinutes === 'number' && product.prepTimeMinutes > 0) {
        setHasPrepTime(true);
        setPrepTimeMinutes(product.prepTimeMinutes);
      } else {
        setHasPrepTime(false);
        setPrepTimeMinutes(15);
      }

      if (product.variants && product.variants.length > 0) {
        setVariantMode('size');
        setHasVariants(true);
        setVariants(
          product.variants.map((v) => ({
            ...v,
            available: v.available !== false,
          }))
        );
      } else if (product.colorVariants && product.colorVariants.length > 0) {
        setVariantMode('size');
        setHasVariants(true);
        setVariants(
          product.colorVariants.map((c) => ({
            name: c.name,
            price: c.price,
            imageUrl: c.imageUrl,
            imageFit: c.imageFit || 'cover',
            available: true,
          }))
        );
      } else {
        setVariantMode('single');
        setHasVariants(false);
        setVariants([]);
      }
      setSelectedExtras(product.availableExtras || []);
    } else {
      setName('');
      setDescription('');
      setBasePrice('');
      setCategory(categories[0] || 'Bakery');
      setCustomCategory('');
      setImages([]);
      setImageUrlInput('');
      setAvailable(true);
      setIsVegetarian(true);
      setIsNonFood(false);
      setIsFeatured(false);
      setImageFit('cover');
      setImageFits({});
      setHasPrepTime(false);
      setPrepTimeMinutes(15);
      setVariantMode('single');
      setHasVariants(false);
      setVariants([]);
      setSelectedExtras([]);
    }

    setIsCompressing(false);
    setUploadProgress(null);
    setFormError(null);
    setIsSearchingImages(false);
    setDetectedImages([]);
    setSelectedDetectedUrls([]);
    setIsDetectPanelOpen(false);
    setCustomSearchQuery('');
    setSearchSuccessFeedback(null);
  }, [product, categories]);

  const handleMultipleImageFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files) as File[];

    try {
      setIsCompressing(true);
      setFormError(null);
      setUploadProgress({ current: 0, total: files.length, stage: 'Preparing photos...' });

      const results = await uploadOptimizedImages(files, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.78,
        folder: 'products',
        onProgress: (current, total) => {
          setUploadProgress({
            current,
            total,
            stage: `Uploading photo ${current} of ${total}...`,
          });
        },
      });

      const newUrls = results.map((r) => r.url).filter(Boolean);
      setImages((prev) => {
        const startIdx = prev.length;
        const combined = [...prev, ...newUrls];
        setImageFits((prevFits) => {
          const updated = { ...prevFits };
          newUrls.forEach((_, i) => {
            updated[String(startIdx + i)] = 'cover';
          });
          return updated;
        });
        return combined;
      });
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setFormError('Failed to upload image. Please check file format.');
    } finally {
      setIsCompressing(false);
      setUploadProgress(null);
    }
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    const trimmed = imageUrlInput.trim();
    if (images.includes(trimmed)) {
      setFormError('This image is already added');
      return;
    }
    const nextIdx = images.length;
    setImages((prev) => [...prev, trimmed]);
    setImageFits((prev) => ({ ...prev, [String(nextIdx)]: 'cover' }));
    setImageUrlInput('');
    setFormError(null);
  };

  const handleUpdateImageFit = (index: number, fit: 'cover' | 'contain') => {
    setImageFits((prev) => ({
      ...prev,
      [String(index)]: fit,
    }));
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      setImageFits((prevFits) => {
        const updated: Record<string, 'cover' | 'contain'> = {};
        filtered.forEach((_, newIdx) => {
          const oldIdx = newIdx >= index ? newIdx + 1 : newIdx;
          updated[String(newIdx)] = prevFits[String(oldIdx)] || 'cover';
        });
        return updated;
      });
      return filtered;
    });
  };

  const handleSetPrimaryImage = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const [selected] = copy.splice(index, 1);
      const updatedImages = [selected, ...copy];

      setImageFits((prevFits) => {
        const updated: Record<string, 'cover' | 'contain'> = {};
        updated['0'] = prevFits[String(index)] || 'cover';
        let newIdx = 1;
        prev.forEach((_, oldIdx) => {
          if (oldIdx !== index) {
            updated[String(newIdx)] = prevFits[String(oldIdx)] || 'cover';
            newIdx++;
          }
        });
        return updated;
      });

      return updatedImages;
    });
  };

  const handleAutoFindImages = async (customQueryOverride?: string) => {
    const searchTerm = (typeof customQueryOverride === 'string' ? customQueryOverride : customSearchQuery).trim() || name.trim();
    if (!searchTerm) {
      setFormError('Please enter a Product Name first to search relevant photos.');
      return;
    }

    try {
      setIsSearchingImages(true);
      setFormError(null);
      setSearchSuccessFeedback(null);

      const currentCat = category === 'Custom' ? customCategory : category;
      const results = await findFoodImagesOnline(searchTerm, currentCat);

      setDetectedImages(results);
      setSelectedDetectedUrls(results.map((r) => r.url));
      setIsDetectPanelOpen(true);
      setSearchSuccessFeedback(`Found ${results.length} studio photos for "${searchTerm}"!`);
    } catch (err) {
      console.error('Failed to auto-detect images:', err);
      setFormError('Could not fetch photos automatically. Try uploading manually or pasting a URL.');
    } finally {
      setIsSearchingImages(false);
    }
  };

  const handleToggleSelectDetectedImage = (url: string) => {
    setSelectedDetectedUrls((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  };

  const handleApplyDetectedImages = () => {
    if (selectedDetectedUrls.length === 0) {
      setFormError('Please select at least one photo to apply.');
      return;
    }
    if (replaceExistingOnSave) {
      setImages(selectedDetectedUrls);
      const newFits: Record<string, 'cover' | 'contain'> = {};
      selectedDetectedUrls.forEach((_, i) => {
        newFits[String(i)] = 'cover';
      });
      setImageFits(newFits);
    } else {
      const startIdx = images.length;
      const combined = [...images];
      const newlyAddedCount: number[] = [];
      selectedDetectedUrls.forEach((u) => {
        if (!combined.includes(u)) {
          combined.push(u);
          newlyAddedCount.push(startIdx + newlyAddedCount.length);
        }
      });
      setImages(combined);
      setImageFits((prev) => {
        const updated = { ...prev };
        newlyAddedCount.forEach((idx) => {
          updated[String(idx)] = 'cover';
        });
        return updated;
      });
    }
    setIsDetectPanelOpen(false);
    setSearchSuccessFeedback(`Applied ${selectedDetectedUrls.length} photos!`);
    setTimeout(() => setSearchSuccessFeedback(null), 3000);
  };

  const [variantPresetType, setVariantPresetType] = useState<
    'sizes' | 'plates' | 'weights' | 'portions' | 'drinks' | 'pieces' | 'colors' | 'flavours' | 'numbers' | 'custom'
  >(product?.variantPresetType || 'sizes');
  const [variantCustomLabel, setVariantCustomLabel] = useState<string>(product?.variantCustomLabel || '');
  const [showVariantsSeparately, setShowVariantsSeparately] = useState<boolean>(
    Boolean(product?.showVariantsSeparately)
  );

  const [variantUploadingIdx, setVariantUploadingIdx] = useState<number | null>(null);
  const [linkInputVariantIdx, setLinkInputVariantIdx] = useState<number | null>(null);
  const [linkInputValue, setLinkInputValue] = useState('');

  const handleVariantFileUpload = async (variantIdx: number, file: File) => {
    try {
      setVariantUploadingIdx(variantIdx);
      setFormError(null);
      const results = await uploadOptimizedImages([file], {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.78,
        folder: 'variants',
      });
      if (results[0]?.url) {
        handleUpdateVariant(variantIdx, 'imageUrl', results[0].url);
        if (!variants[variantIdx]?.imageFit) {
          handleUpdateVariant(variantIdx, 'imageFit', 'contain');
        }
      }
    } catch (err: any) {
      console.error('Variant photo upload failed:', err);
      setFormError('Failed to upload option photo. Please try again.');
    } finally {
      setVariantUploadingIdx(null);
    }
  };

  const handleAddVariant = () => {
    const defaultPrice = typeof basePrice === 'number' && basePrice > 0 ? basePrice : 99;
    setVariants((prev) => [
      ...prev,
      {
        name: `Option ${prev.length + 1}`,
        price: defaultPrice,
        imageUrl: '',
        imageFit: 'contain',
        available: true,
      },
    ]);
  };

  const handleSelectPresetSizes = (
    presetName: 'sizes' | 'plates' | 'weights' | 'portions' | 'drinks' | 'pieces' | 'colors' | 'flavours' | 'numbers'
  ) => {
    const defaultP = typeof basePrice === 'number' && basePrice > 0 ? basePrice : 120;
    setVariantPresetType(presetName);

    let presets: { name: string; mult: number }[] = [];
    let defaultLabel = 'Select Size / Option:';

    switch (presetName) {
      case 'sizes':
        defaultLabel = 'Select Size / Portion:';
        presets = [
          { name: 'Small', mult: 0.8 },
          { name: 'Medium', mult: 1.0 },
          { name: 'Large', mult: 1.35 },
        ];
        break;
      case 'plates':
        defaultLabel = 'Select Portion / Plate:';
        presets = [
          { name: 'Half Plate', mult: 0.65 },
          { name: 'Full Plate', mult: 1.0 },
        ];
        break;
      case 'weights':
        defaultLabel = 'Select Weight / Pack:';
        presets = [
          { name: '250g', mult: 0.3 },
          { name: '500g', mult: 0.55 },
          { name: '1 Kg', mult: 1.0 },
        ];
        break;
      case 'portions':
        defaultLabel = 'Select Size / Option:';
        presets = [
          { name: 'Regular', mult: 1.0 },
          { name: 'Jumbo / Special', mult: 1.4 },
        ];
        break;
      case 'drinks':
        defaultLabel = 'Select Volume / Drink:';
        presets = [
          { name: '250ml', mult: 0.5 },
          { name: '500ml', mult: 0.85 },
          { name: '750ml', mult: 1.2 },
        ];
        break;
      case 'pieces':
        defaultLabel = 'Select Quantity / Pcs:';
        presets = [
          { name: '2 Pcs', mult: 0.5 },
          { name: '4 Pcs', mult: 0.85 },
          { name: '6 Pcs', mult: 1.2 },
          { name: '10 Pcs', mult: 1.8 },
        ];
        break;
      case 'colors':
        defaultLabel = 'Select Color / Shade:';
        presets = [
          { name: 'Red', mult: 1.0 },
          { name: 'Blue', mult: 1.0 },
          { name: 'Golden', mult: 1.0 },
          { name: 'Silver', mult: 1.0 },
          { name: 'Black', mult: 1.0 },
          { name: 'Pink', mult: 1.0 },
        ];
        break;
      case 'flavours':
        defaultLabel = 'Select Flavour / Taste:';
        presets = [
          { name: 'Classic / Original', mult: 1.0 },
          { name: 'Watermelon', mult: 1.0 },
          { name: 'Berry', mult: 1.0 },
          { name: 'Tropical', mult: 1.0 },
          { name: 'Sugarfree', mult: 1.0 },
        ];
        break;
      case 'numbers':
        defaultLabel = 'Select Number / Digit:';
        presets = [
          { name: 'Number 0', mult: 1.0 },
          { name: 'Number 1', mult: 1.0 },
          { name: 'Number 2', mult: 1.0 },
          { name: 'Number 3', mult: 1.0 },
          { name: 'Number 4', mult: 1.0 },
          { name: 'Number 5', mult: 1.0 },
          { name: 'Number 6', mult: 1.0 },
          { name: 'Number 7', mult: 1.0 },
          { name: 'Number 8', mult: 1.0 },
          { name: 'Number 9', mult: 1.0 },
        ];
        break;
    }

    setVariantCustomLabel(defaultLabel);

    setVariants(
      presets.map((p) => ({
        name: p.name,
        price: Math.round(defaultP * p.mult),
        imageUrl: '',
        imageFit: 'contain',
        available: true,
      }))
    );
  };

  const handleUpdateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleExtra = (extra: ProductExtra) => {
    setSelectedExtras((prev) => {
      const exists = prev.some((e) => e.id === extra.id);
      if (exists) {
        return prev.filter((e) => e.id !== extra.id);
      } else {
        return [...prev, extra];
      }
    });
  };

  const handleSelectAllExtras = () => {
    setSelectedExtras([...globalExtras]);
  };

  const handleClearAllExtras = () => {
    setSelectedExtras([]);
  };

  const handleAddCustomProductExtra = () => {
    const cleanName = customExtraName.trim();
    const numPrice = Number(customExtraPrice);
    if (!cleanName || isNaN(numPrice) || numPrice < 0) return;

    const newExtra: ProductExtra = {
      id: `extra-custom-${Date.now()}`,
      name: cleanName,
      price: numPrice,
      available: true,
      category: 'Custom Extra'
    };
    setSelectedExtras((prev) => [...prev, newExtra]);
    setCustomExtraName('');
    setCustomExtraPrice(25);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Product name is required');
      return;
    }

    const finalCategory = category === 'Custom' ? customCategory.trim() : category;
    if (!finalCategory) {
      setFormError('Category is required');
      return;
    }

    let calculatedPrice = typeof basePrice === 'number' ? basePrice : 0;

    if (variantMode === 'size' && variants.length > 0) {
      calculatedPrice = Math.min(...variants.map((v) => v.price));
    }

    if (calculatedPrice <= 0 && (!variants || variants.length === 0)) {
      setFormError('Please enter a valid price for the product or sizes');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const primaryCoverFit = imageFits['0'] || imageFit || 'cover';

    const cleanImageFits: Record<string, 'cover' | 'contain'> = {};
    images.forEach((_, idx) => {
      cleanImageFits[String(idx)] = imageFits[String(idx)] || imageFit || 'cover';
    });

    const productPayload: Partial<Product> = {
      name: name.trim(),
      description: description.trim(),
      price: calculatedPrice,
      category: finalCategory,
      imageUrl: images[0] || '',
      images: images,
      available,
      isVegetarian: isNonFood ? false : isVegetarian,
      isNonFood,
      isFeatured,
      isPinnedToFront: isFeatured,
      imageFit: primaryCoverFit,
      imageFits: cleanImageFits,
      prepTimeMinutes: hasPrepTime && typeof prepTimeMinutes === 'number' ? prepTimeMinutes : undefined,
      variants:
        variantMode === 'size' && variants.length > 0
          ? variants.map((v) => ({
              ...v,
              name: v.name.trim() || 'Option',
              price: typeof v.price === 'number' ? v.price : Number(v.price) || 0,
              imageUrl: v.imageUrl?.trim() || undefined,
              imageFit: v.imageFit || 'contain',
              available: v.available !== false,
            }))
          : [],
      variantPresetType: variantMode === 'size' ? variantPresetType : undefined,
      variantCustomLabel: variantMode === 'size' && variantCustomLabel.trim() ? variantCustomLabel.trim() : undefined,
      showVariantsSeparately: variantMode === 'size' ? showVariantsSeparately : false,
      colorVariants: product?.colorVariants || [],
      groupId: product?.groupId,
      groupName: product?.groupName,
      groupVariantLabel: product?.groupVariantLabel,
      availableExtras: selectedExtras,
    };

    try {
      triggerHaptic('success');
      onSave({
        id: product?.id,
        productPayload,
        isFeatured,
      });
      onBack();
    } catch (err: any) {
      console.error('Error saving product:', err);
      setFormError(err?.message || 'Failed to save product. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-12 animate-fadeIn">
      {/* Top Sticky Header Bar */}
      <div className="bg-gradient-to-r from-indigo-50/90 via-white to-amber-50/60 sticky top-0 z-30 rounded-xl border border-indigo-200/80 p-3.5 sm:p-4 shadow-sm shadow-indigo-500/5">
        <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-indigo-50 border border-indigo-200 text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-900 transition-colors cursor-pointer shrink-0 shadow-xs"
              id="product-form-back-btn"
              title="Back to Catalog"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-indigo-600" />
              <span>BACK</span>
            </button>

            <h2 className="font-extrabold text-sm sm:text-base uppercase tracking-[0.18em] text-indigo-950 truncate">
              {product ? 'EDIT PRODUCT' : 'ADD PRODUCT'}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onBack}
              className="hidden sm:inline-flex px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors cursor-pointer"
            >
              CANCEL
            </button>

            <button
              type="button"
              onClick={handleSubmit as any}
              disabled={isSubmitting || isCompressing}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white border border-indigo-700 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm shadow-indigo-500/15"
              id="save-product-top-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>SAVING...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{product ? 'UPDATE ITEM' : 'SAVE ITEM'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Form Body */}
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-5">
        {formError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-semibold">{formError}</span>
          </div>
        )}

        {/* SECTION 01: PRODUCT DETAILS (INDIGO THEME) */}
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-indigo-200/80 shadow-sm shadow-indigo-500/5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-indigo-950 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              01. PRODUCT DETAILS
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/70">
              REQUIRED
            </span>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-900/70 mb-1.5">
              PRODUCT TITLE / ITEM NAME *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Farmhouse Special Pizza, Choco Lava Cake"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-indigo-50/20 border border-indigo-200/80 focus:border-indigo-500 focus:bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-900/70 mb-1.5">
                CATEGORY *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-indigo-50/20 border border-indigo-200/80 focus:border-indigo-500 focus:bg-white text-xs font-bold text-slate-900 focus:outline-none transition-colors cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="Custom">+ Custom Category</option>
              </select>
              {category === 'Custom' && (
                <input
                  type="text"
                  required
                  placeholder="Enter custom category name"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="mt-2 w-full px-3.5 py-2 rounded-lg bg-white border border-indigo-200 focus:border-indigo-500 text-xs font-semibold focus:outline-none"
                />
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-900/70 mb-1.5">
                BASE PRICE (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500 font-mono font-bold text-xs select-none">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  required={variantMode === 'single'}
                  placeholder="199"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-lg bg-indigo-50/20 border border-indigo-200/80 focus:border-indigo-500 focus:bg-white text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Quick Status Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
            <label className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
              isNonFood ? 'bg-violet-600 text-white border-violet-700' : 'bg-violet-50/40 hover:border-violet-300 border-violet-200/80 text-violet-950'
            }`}>
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                <span>NON-FOOD</span>
              </span>
              <input
                type="checkbox"
                checked={isNonFood}
                onChange={(e) => setIsNonFood(e.target.checked)}
                className="w-4 h-4 accent-violet-600 cursor-pointer"
              />
            </label>

            <label className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
              isNonFood
                ? 'bg-slate-100 border-slate-200 opacity-40 cursor-not-allowed'
                : 'bg-emerald-50/50 hover:border-emerald-300 border-emerald-200/80 cursor-pointer text-emerald-950'
            }`}>
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                <span>PURE VEG</span>
              </span>
              <input
                type="checkbox"
                disabled={isNonFood}
                checked={!isNonFood && isVegetarian}
                onChange={(e) => setIsVegetarian(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 cursor-pointer disabled:cursor-not-allowed"
              />
            </label>

            <label className="p-3 rounded-lg bg-sky-50/50 hover:border-sky-300 border border-sky-200/80 flex items-center justify-between cursor-pointer transition-colors">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-950">IN STOCK</span>
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
                className="w-4 h-4 accent-sky-600 cursor-pointer"
              />
            </label>

            <label className="p-3 rounded-lg bg-amber-50/60 hover:border-amber-300 border border-amber-200/80 flex items-center justify-between cursor-pointer transition-colors">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>FEATURED</span>
              </span>
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 accent-amber-600 cursor-pointer"
              />
            </label>
          </div>

          {/* Preparation Time */}
          <div className="p-3 rounded-lg bg-indigo-50/40 border border-indigo-200/70 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasPrepTime}
                onChange={(e) => setHasPrepTime(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 cursor-pointer"
              />
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>KITCHEN PREP TIME</span>
              </span>
            </label>

            {hasPrepTime && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={prepTimeMinutes}
                  onChange={(e) => setPrepTimeMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-20 px-2.5 py-1 rounded-md bg-white border border-indigo-200 text-xs font-mono font-bold text-indigo-950 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-700">MINUTES</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-900/70 mb-1.5">
              DESCRIPTION / INGREDIENTS (OPTIONAL)
            </label>
            <textarea
              rows={2}
              placeholder="Ingredients or product description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-indigo-50/20 border border-indigo-200/80 focus:border-indigo-500 focus:bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* SECTION 02: PORTIONS & SIZES (AMBER THEME) */}
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-amber-200/80 shadow-sm shadow-amber-500/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-100">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-950 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              02. PORTIONS &amp; SIZES
            </span>

            <div className="inline-flex rounded-lg border border-amber-200 bg-amber-50/50 p-0.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setVariantMode('single');
                  setHasVariants(false);
                }}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-[0.1em] transition-colors cursor-pointer ${
                  variantMode === 'single'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-900/70 hover:text-amber-950'
                }`}
              >
                SINGLE PRICE
              </button>
              <button
                type="button"
                onClick={() => {
                  setVariantMode('size');
                  setHasVariants(true);
                  if (variants.length === 0) handleAddVariant();
                }}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-[0.1em] transition-colors cursor-pointer ${
                  variantMode === 'size'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-900/70 hover:text-amber-950'
                }`}
              >
                NUMBERS / SIZES
              </button>
            </div>
          </div>

          {variantMode === 'single' ? (
            <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200/80 text-xs font-mono text-amber-900">
              FLAT PRICE: <strong className="text-amber-950">₹{basePrice || 0}</strong>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-800 block">
                  PRESETS:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleSelectPresetSizes('sizes')}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200 text-amber-950 text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Ruler className="w-3 h-3 text-amber-600" />
                    <span>S / M / L</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPresetSizes('plates')}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200 text-amber-950 text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <UtensilsCrossed className="w-3 h-3 text-amber-600" />
                    <span>HALF / FULL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPresetSizes('weights')}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200 text-amber-950 text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Scale className="w-3 h-3 text-amber-600" />
                    <span>250G / 500G / 1KG</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPresetSizes('drinks')}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200 text-amber-950 text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Coffee className="w-3 h-3 text-amber-600" />
                    <span>250ML / 500ML</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPresetSizes('pieces')}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200 text-amber-950 text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Boxes className="w-3 h-3 text-amber-600" />
                    <span>PIECES (2, 4, 6)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPresetSizes('colors')}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200 text-amber-950 text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Palette className="w-3 h-3 text-amber-600" />
                    <span>COLORS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPresetSizes('flavours')}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200 text-amber-950 text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>FLAVOURS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPresetSizes('numbers')}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200 text-amber-950 text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Hash className="w-3 h-3 text-amber-600" />
                    <span>NUMBERS (0..9)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-amber-50/40 border border-amber-200/70 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-900 flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-amber-600" />
                    <span>OPTION SECTION TITLE:</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Select Size:, Select Flavour:"
                    value={variantCustomLabel}
                    onChange={(e) => setVariantCustomLabel(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md bg-white border border-amber-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="p-3 rounded-lg bg-amber-50/40 border border-amber-200/70 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-950 pr-2">
                    SHOW OPTIONS AS SEPARATE CARDS
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showVariantsSeparately}
                    onClick={() => setShowVariantsSeparately((prev) => !prev)}
                    className={`px-3 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                      showVariantsSeparately
                        ? 'bg-amber-600 text-white border-amber-700'
                        : 'bg-white text-slate-600 border-slate-300'
                    }`}
                  >
                    {showVariantsSeparately ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {variants.map((variant, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border space-y-2 transition-colors ${
                      variant.available === false
                        ? 'bg-rose-50/40 border-rose-200'
                        : 'bg-amber-50/20 border-amber-200/70'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <div className={`w-6 h-6 rounded-md border flex items-center justify-center font-mono font-bold text-[11px] shrink-0 ${
                        variant.available === false ? 'bg-rose-100 border-rose-200 text-rose-700' : 'bg-amber-100/70 border-amber-200 text-amber-900'
                      }`}>
                        {idx + 1}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {variant.imageUrl ? (
                          <div className="flex items-center gap-1.5">
                            <div className="relative w-12 h-9 rounded-md overflow-hidden bg-white border border-amber-300 group shrink-0">
                              <img
                                src={variant.imageUrl}
                                alt={variant.name || `Option ${idx + 1}`}
                                className={`w-full h-full ${
                                  variant.imageFit === 'contain' ? 'object-contain p-0.5 bg-white' : 'object-cover'
                                }`}
                                referrerPolicy="no-referrer"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateVariant(idx, 'imageUrl', '')}
                                className="absolute top-0 right-0 w-4 h-4 bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center cursor-pointer transition-colors"
                                title="Remove photo"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateVariant(
                                  idx,
                                  'imageFit',
                                  variant.imageFit === 'contain' ? 'cover' : 'contain'
                                )
                              }
                              className="px-2 py-1 rounded-md bg-white border border-amber-200 hover:border-amber-500 text-amber-900 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              {variant.imageFit === 'contain' ? 'FIT' : 'FILL'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <label
                              className="w-7 h-7 rounded-md bg-white hover:border-amber-500 border border-amber-200 text-amber-700 hover:text-amber-950 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                              title="Upload photo from device"
                            >
                              {variantUploadingIdx === idx ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                              ) : (
                                <Upload className="w-3.5 h-3.5" />
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleVariantFileUpload(idx, e.target.files[0]);
                                  }
                                }}
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => {
                                if (linkInputVariantIdx === idx) {
                                  setLinkInputVariantIdx(null);
                                  setLinkInputValue('');
                                } else {
                                  setLinkInputVariantIdx(idx);
                                  setLinkInputValue('');
                                }
                              }}
                              className={`w-7 h-7 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                                linkInputVariantIdx === idx
                                  ? 'bg-amber-600 text-white border-amber-700'
                                  : 'bg-white hover:border-amber-500 border-amber-200 text-amber-700 hover:text-amber-950'
                              }`}
                              title="Enter photo web link"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-[90px]">
                        <input
                          type="text"
                          placeholder={`Option ${idx + 1} (e.g. Small)`}
                          value={variant.name}
                          onChange={(e) => handleUpdateVariant(idx, 'name', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-md bg-white border border-amber-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="w-24 relative shrink-0">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-500 font-mono font-bold text-xs select-none">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="1"
                          placeholder="Price"
                          value={variant.price}
                          onChange={(e) =>
                            handleUpdateVariant(
                              idx,
                              'price',
                              e.target.value === '' ? '' : Number(e.target.value)
                            )
                          }
                          className="w-full pl-6 pr-2 py-1.5 rounded-md bg-white border border-amber-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateVariant(
                            idx,
                            'available',
                            variant.available === false ? true : false
                          )
                        }
                        className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shrink-0 border cursor-pointer select-none ${
                          variant.available !== false
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            variant.available !== false ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}
                        />
                        <span>{variant.available !== false ? 'IN STOCK' : 'OUT'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(idx)}
                        className="w-7 h-7 rounded-md border border-slate-200 bg-white hover:border-rose-400 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        title="Remove Option"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {linkInputVariantIdx === idx && (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-white border border-amber-300 animate-fadeIn">
                        <Link2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <input
                          type="url"
                          placeholder="Paste image URL (https://...)"
                          value={linkInputValue}
                          onChange={(e) => setLinkInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (linkInputValue.trim()) {
                                handleUpdateVariant(idx, 'imageUrl', linkInputValue.trim());
                                if (!variant.imageFit) handleUpdateVariant(idx, 'imageFit', 'contain');
                                setLinkInputVariantIdx(null);
                                setLinkInputValue('');
                              }
                            }
                          }}
                          className="flex-1 px-2.5 py-1 rounded-md text-xs bg-amber-50/30 border border-amber-200 focus:outline-none focus:border-amber-500"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (linkInputValue.trim()) {
                              handleUpdateVariant(idx, 'imageUrl', linkInputValue.trim());
                              if (!variant.imageFit) handleUpdateVariant(idx, 'imageFit', 'contain');
                              setLinkInputVariantIdx(null);
                              setLinkInputValue('');
                            }
                          }}
                          className="px-2.5 py-1 rounded-md bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                        >
                          SET
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLinkInputVariantIdx(null);
                            setLinkInputValue('');
                          }}
                          className="p-1 text-slate-400 hover:text-slate-900 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddVariant}
                className="w-full py-2.5 rounded-lg bg-amber-50/60 hover:bg-amber-100/70 border border-amber-300 text-amber-950 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-amber-700" />
                <span>ADD OPTION</span>
              </button>
            </div>
          )}
        </div>

        {/* SECTION 03: ADD-ONS & EXTRAS (VIOLET THEME) */}
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-violet-200/80 shadow-sm shadow-violet-500/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-violet-100">
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-violet-950 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                03. ADD-ONS &amp; EXTRAS
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200/80">
                {selectedExtras.length} SELECTED
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllExtras}
                className="px-2.5 py-1 rounded-md bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-800 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                SELECT ALL
              </button>
              <button
                type="button"
                onClick={handleClearAllExtras}
                className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                CLEAR
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {globalExtras.length === 0 ? (
              <div className="text-xs text-violet-400 font-mono">
                NO EXTRAS IN LIBRARY
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {globalExtras.map((extra) => {
                  const isSelected = selectedExtras.some((e) => e.id === extra.id);
                  return (
                    <button
                      key={extra.id}
                      type="button"
                      onClick={() => handleToggleExtra(extra)}
                      className={`p-2.5 rounded-lg border text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-violet-500 bg-violet-50/60 shadow-xs'
                          : 'border-violet-100 bg-white hover:border-violet-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-violet-600 border-violet-600 text-white'
                              : 'border-violet-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-xs text-slate-900 block truncate">
                            {extra.name}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-violet-600/80 block truncate">
                            {extra.category || 'Topping'}
                          </span>
                        </div>
                      </div>

                      <span className="shrink-0 font-mono font-bold text-xs text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                        +₹{extra.price}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Inline Add Custom Extra */}
          <div className="pt-3 bg-violet-50/40 p-3 rounded-lg border border-violet-200/70 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-900 block">
              ADD CUSTOM EXTRA FOR THIS ITEM:
            </span>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                placeholder="e.g. Extra Peri Peri Fries, Choco Dip"
                value={customExtraName}
                onChange={(e) => setCustomExtraName(e.target.value)}
                className="w-full sm:flex-1 px-3 py-2 rounded-lg bg-white border border-violet-200 text-xs font-semibold focus:outline-none focus:border-violet-500"
              />
              <div className="flex items-center gap-1 w-full sm:w-32">
                <span className="text-xs font-mono font-bold text-violet-500 pl-1">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Price"
                  value={customExtraPrice}
                  onChange={(e) => setCustomExtraPrice(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-2.5 py-2 rounded-lg bg-white border border-violet-200 text-xs font-mono font-semibold focus:outline-none focus:border-violet-500"
                />
              </div>
              <button
                type="button"
                onClick={handleAddCustomProductExtra}
                disabled={!customExtraName.trim()}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-[11px] font-bold uppercase tracking-[0.12em] transition-colors shrink-0 cursor-pointer"
              >
                + ADD
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 04: PHOTOS & GALLERY (EMERALD / SKY THEME) */}
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-emerald-200/80 shadow-sm shadow-emerald-500/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-100">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-emerald-950 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              04. PHOTOS &amp; GALLERY
            </span>

            <button
              type="button"
              onClick={() => handleAutoFindImages()}
              disabled={isSearchingImages}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-[0.12em] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
            >
              {isSearchingImages ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>SEARCHING...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>FIND PHOTOS ONLINE</span>
                </>
              )}
            </button>
          </div>

          {searchSuccessFeedback && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{searchSuccessFeedback}</span>
            </div>
          )}

          {isDetectPanelOpen && detectedImages.length > 0 && (
            <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                  FOUND {detectedImages.length} PHOTOS:
                </span>
                <button
                  type="button"
                  onClick={() => setIsDetectPanelOpen(false)}
                  className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 hover:text-emerald-950"
                >
                  CLOSE
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {detectedImages.map((item, idx) => {
                  const isSelected = selectedDetectedUrls.includes(item.url);
                  return (
                    <div
                      key={idx}
                      onClick={() => handleToggleSelectDetectedImage(item.url)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-600 opacity-100'
                          : 'border-emerald-200 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={item.url}
                        alt={`Found food photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-emerald-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceExistingOnSave}
                    onChange={(e) => setReplaceExistingOnSave(e.target.checked)}
                    className="accent-emerald-600"
                  />
                  <span>Replace current photos</span>
                </label>

                <button
                  type="button"
                  onClick={handleApplyDetectedImages}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-wider hover:bg-emerald-700 cursor-pointer"
                >
                  APPLY ({selectedDetectedUrls.length})
                </button>
              </div>
            </div>
          )}

          {/* Upload or paste URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="p-4 rounded-xl bg-emerald-50/40 hover:bg-emerald-50/80 hover:border-emerald-500 border border-dashed border-emerald-300 flex flex-col items-center justify-center cursor-pointer transition-colors text-center group">
              <Upload className="w-5 h-5 text-emerald-600 group-hover:scale-105 transition-transform mb-1.5" />
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-950">
                UPLOAD FROM DEVICE
              </span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleMultipleImageFiles}
                className="hidden"
              />
            </label>

            <div className="p-4 rounded-xl bg-sky-50/40 border border-sky-200/80 flex flex-col justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-900 block">
                PASTE IMAGE URL
              </span>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-white border border-sky-200 text-xs font-medium focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-4 py-2 rounded-lg bg-sky-600 text-white text-[11px] font-bold uppercase tracking-[0.12em] hover:bg-sky-700 cursor-pointer"
                >
                  ADD
                </button>
              </div>
            </div>
          </div>

          {isCompressing && uploadProgress && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
              <span className="text-xs font-mono font-bold text-emerald-950">{uploadProgress.stage}</span>
            </div>
          )}

          {images.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-800 block">
                GALLERY ({images.length})
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-3xl">
                {images.map((img, idx) => {
                  const currentFit = imageFits[String(idx)] || imageFit || 'cover';

                  return (
                    <div
                      key={idx}
                      className="flex flex-col rounded-xl bg-emerald-50/20 border border-emerald-200/80 p-1.5 space-y-1.5"
                    >
                      <div className="group relative aspect-[4/3] rounded-lg overflow-hidden bg-white flex items-center justify-center border border-emerald-100">
                        <img
                          src={img}
                          alt={`Photo ${idx + 1}`}
                          className={`w-full h-full ${currentFit === 'contain' ? 'object-contain p-1.5 bg-white' : 'object-cover'}`}
                        />
                        {idx === 0 && (
                          <span className="absolute top-1.5 left-1.5 rounded bg-emerald-600 text-white font-mono font-bold text-[9px] tracking-wider px-1.5 py-0.5 select-none uppercase shadow-xs">
                            COVER
                          </span>
                        )}
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                          {idx !== 0 && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryImage(idx)}
                              className="px-2 py-1 rounded bg-white text-emerald-950 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                            >
                              COVER
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="p-1.5 rounded bg-rose-600 text-white cursor-pointer hover:bg-rose-700"
                            title="Delete photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1 rounded-md bg-emerald-100/60 p-0.5 text-[10px] font-bold uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => handleUpdateImageFit(idx, 'cover')}
                          className={`py-1 rounded transition-colors text-center cursor-pointer select-none ${
                            currentFit === 'cover'
                              ? 'bg-emerald-600 text-white'
                              : 'text-emerald-800 hover:text-emerald-950'
                          }`}
                        >
                          FILL
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateImageFit(idx, 'contain')}
                          className={`py-1 rounded transition-colors text-center cursor-pointer select-none ${
                            currentFit === 'contain'
                              ? 'bg-emerald-600 text-white'
                              : 'text-emerald-800 hover:text-emerald-950'
                          }`}
                        >
                          FIT
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-indigo-50/80 via-white to-emerald-50/60 border border-indigo-200/80 shadow-sm shadow-indigo-500/5">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold text-[11px] uppercase tracking-[0.12em] hover:bg-slate-50 transition-colors cursor-pointer"
          >
            CANCEL
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isCompressing}
            className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-[11px] uppercase tracking-[0.12em] transition-colors flex items-center gap-2 cursor-pointer shadow-sm shadow-indigo-500/15"
            id="save-product-bottom-btn"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>SAVING...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{product ? 'UPDATE PRODUCT' : 'SAVE & PUBLISH'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
});
