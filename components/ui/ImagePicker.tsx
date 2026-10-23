import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Search, Check, Image as ImageIcon } from 'lucide-react';
import { 
  getImageLibrary, 
  uploadImageToLibrary, 
  deleteImageFromLibrary, 
  ImageLibraryItem 
} from '../../services/supabaseService';
import { useToast } from './Toast';
import { Spinner } from './Spinner';

interface ImagePickerProps {
  onSelect: (url: string) => void;
  selectedUrl?: string;
}

export const ImagePicker: React.FC<ImagePickerProps> = ({ onSelect, selectedUrl }) => {
  const [images, setImages] = useState<ImageLibraryItem[]>([]);
  const [filteredImages, setFilteredImages] = useState<ImageLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadImages();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredImages(images);
    } else {
      const lowerSearch = search.toLowerCase();
      setFilteredImages(
        images.filter(img => 
          (img.name || '').toLowerCase().includes(lowerSearch)
        )
      );
    }
  }, [search, images]);

  const loadImages = async () => {
    try {
      setLoading(true);
      const data = await getImageLibrary();
      setImages(data);
    } catch (err: any) {
      addToast('Failed to load image library: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Please select a valid image file', 'error');
      return;
    }

    try {
      setUploading(true);
      const newImg = await uploadImageToLibrary(file);
      setImages(prev => [newImg, ...prev]);
      onSelect(newImg.url);
      addToast('Image uploaded successfully', 'success');
    } catch (err: any) {
      addToast('Upload failed: ' + err.message, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, item: ImageLibraryItem) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this image? It will be removed permanently.')) {
      return;
    }
    
    try {
      await deleteImageFromLibrary(item.id, item.storage_path);
      setImages(prev => prev.filter(img => img.id !== item.id));
      if (selectedUrl === item.url) {
        onSelect('');
      }
      addToast('Image deleted', 'success');
    } catch (err: any) {
      addToast('Delete failed: ' + err.message, 'error');
    }
  };

  return (
    <div className="bg-[#14161B] border border-[#2d3342] rounded-2xl p-4 flex flex-col gap-4">
      {/* Top Bar: Upload & Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#00D4AA] text-[#0A0C10] font-bold rounded-xl hover:bg-[#00bfa0] transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
        >
          {uploading ? <Spinner size="sm" /> : <Upload size={16} />}
          {uploading ? 'Uploading...' : 'Upload New Image'}
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleUpload} 
        />
        
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search images..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#0A0C10] border border-[#2d3342] rounded-xl text-white text-sm focus:border-[#00D4AA] outline-none transition-colors"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="mt-2 min-h-[200px]">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Spinner />
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 bg-[#0A0C10] rounded-xl border border-dashed border-[#2d3342]">
            <ImageIcon size={32} className="mb-2 opacity-50" />
            <p className="text-sm">No images found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredImages.map((img) => (
              <div
                key={img.id}
                onClick={() => onSelect(img.url)}
                className={`relative group aspect-video rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                  selectedUrl === img.url ? 'border-[#00D4AA] shadow-[0_0_15px_rgba(0,212,170,0.3)]' : 'border-transparent'
                }`}
              >
                <img 
                  src={img.url} 
                  alt={img.name || 'Library image'} 
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay & actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, img)}
                      className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg backdrop-blur-sm transition-colors"
                      title="Delete Image"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {img.name && (
                    <div className="text-[10px] text-white truncate bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm w-fit">
                      {img.name}
                    </div>
                  )}
                </div>
                
                {/* Selected Indicator */}
                {selectedUrl === img.url && (
                  <div className="absolute top-2 left-2 bg-[#00D4AA] text-[#0A0C10] p-1 rounded-full shadow-sm z-10">
                    <Check size={12} strokeWidth={4} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
