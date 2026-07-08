import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  LogOut, 
  Save,
  Loader2,
  Upload,
  Database,
  Terminal,
  Check,
  AlertCircle,
  Instagram,
  Youtube,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isSupabaseConfigured, SUPABASE_SQL_SETUP } from '../lib/supabase';
import { useSupabaseCollection } from '../hooks/useSupabaseData';

const getYoutubeId = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const getTikTokId = (url: string): string | null => {
  if (!url) return null;
  
  // Standard format: https://www.tiktok.com/@username/video/123456789
  const stdRegExp = /\/video\/(\d+)/;
  const match = url.match(stdRegExp);
  if (match) return match[1];
  
  // Embed format direct
  const embedRegExp = /\/embed\/v2\/(\d+)/;
  const embedMatch = url.match(embedRegExp);
  if (embedMatch) return embedMatch[1];

  const embedRegExp2 = /\/embed\/(\d+)/;
  const embedMatch2 = url.match(embedRegExp2);
  if (embedMatch2) return embedMatch2[1];

  return null;
};

const parseMediaUrl = (url: string): any => {
  if (!url) return { type: 'image', url: '', thumbnail: '' };
  
  const trimmed = String(url).trim();
  const ytId = getYoutubeId(trimmed);
  if (ytId) {
    return {
      type: 'youtube',
      url: trimmed,
      thumbnail: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`
    };
  }

  if (trimmed.includes('instagram.com/')) {
    const baseUrl = trimmed.split('?')[0];
    const cleanUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    return {
      type: 'instagram',
      url: trimmed,
      thumbnail: '',
      // simple /embed/ URL without /embed/captioned/ for cleaner aesthetic and space optimization
      embedUrl: `${cleanUrl}embed/`
    };
  }

  if (trimmed.includes('tiktok.com/')) {
    const tkId = getTikTokId(trimmed);
    return {
      type: 'tiktok',
      url: trimmed,
      videoStaticId: tkId,
      embedUrl: tkId ? `https://www.tiktok.com/embed/${tkId}` : null
    };
  }

  if (
    trimmed.match(/\.(mp4|webm|ogg|mov|m4v)(?:\?|$)/i) || 
    (trimmed.includes('/storage/v1/object/public/') && (trimmed.toLowerCase().includes('.mp4') || trimmed.toLowerCase().includes('.mov') || trimmed.toLowerCase().includes('.webm')))
  ) {
    return {
      type: 'video',
      url: trimmed,
      thumbnail: trimmed,
    };
  }

  return {
    type: 'image',
    url: trimmed,
    thumbnail: trimmed
  };
};

interface AdminPanelProps {
  onLogout: () => void;
  userEmail?: string;
  initialSettings: any;
  onSettingsSaved: (newSettings: any) => void;
}

const sectionInstruments: Record<string, string[]> = {
  "Brass": ["Trumpet", "Baritone", "Mellophone", "Trombone", "Tuba"],
  "Percussion": ["Bass Drum", "Snare Drum", "Tenor Drum", "Simbal"],
  "Pit Instrument": ["Marching Bells"],
  "Color Guard": ["Color Guard"],
  "Leadership": ["Field Commander", "Stickmaster Taruna", "Stickmaster Taruni"]
};

const compressImage = (file: File, maxWidth: number = 1000, maxHeight: number = 1000, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file); // Return original if not an image
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions keeping aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            // Create a new file from blob
            const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const compressedFile = new File([blob], `${nameWithoutExt}-compressed.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => {
        resolve(file); // Fallback to original on error
      };
    };
    reader.onerror = () => {
      resolve(file); // Fallback to original on error
    };
  });
};

export default function AdminPanel({ onLogout, userEmail, initialSettings, onSettingsSaved }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'personnel' | 'gallery' | 'settings'>('personnel');
  const { data: personnelList, loading: pLoading, error: pError, refresh: refreshPersonnel } = useSupabaseCollection<any>('personnel');
  const { data: galleryList, loading: gLoading, error: gError, refresh: refreshGallery } = useSupabaseCollection<any>('gallery');

  const [isAdding, setIsAdding] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [form, setForm] = useState<any>({});
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Dynamic Web Content Settings State
  const [settings, setSettings] = useState<any>(() => ({
    ...initialSettings,
    packages: initialSettings.packages || []
  }));
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);

  // Custom Toast Notification States
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Custom Delete Confirmation States
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Filters for Personnel
  const [pSearch, setPSearch] = useState('');
  const [pSection, setPSection] = useState('');
  const [pAngkatan, setPAngkatan] = useState('');

  // Filters for Gallery
  const [gSearch, setGSearch] = useState('');
  const [gSize, setGSize] = useState(''); // '' | 'large' | 'standard'

  // Dynamic unique Angkatan values
  const uniqueAngkatan = React.useMemo(() => {
    if (!personnelList) return [];
    const set = new Set<string>();
    personnelList.forEach((p: any) => {
      if (p.angkatan !== undefined && p.angkatan !== null) {
        set.add(String(p.angkatan));
      }
    });
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numB - numA; // Newest first
      }
      return b.localeCompare(a);
    });
  }, [personnelList]);

  // Filtered lists
  const filteredPersonnel = React.useMemo(() => {
    return (personnelList || []).filter((p: any) => {
      const matchesSearch = !pSearch || 
        p.name?.toLowerCase().includes(pSearch.toLowerCase()) || 
        p.instrument?.toLowerCase().includes(pSearch.toLowerCase()) ||
        p.section?.toLowerCase().includes(pSearch.toLowerCase());
      const matchesSection = !pSection || p.section === pSection;
      const matchesAngkatan = !pAngkatan || String(p.angkatan) === pAngkatan;
      return matchesSearch && matchesSection && matchesAngkatan;
    });
  }, [personnelList, pSearch, pSection, pAngkatan]);

  const filteredGallery = React.useMemo(() => {
    return (galleryList || []).filter((g: any) => {
      const matchesSearch = !gSearch || g.title?.toLowerCase().includes(gSearch.toLowerCase());
      const matchesSize = !gSize || 
        (gSize === 'large' ? (g.isLarge || g.is_large) : !(g.isLarge || g.is_large));
      return matchesSearch && matchesSize;
    });
  }, [galleryList, gSearch, gSize]);

  const handleSettingsImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      showToast("File terlalu besar! Maksimal 20MB.", "warning");
      return;
    }

    if (!isSupabaseConfigured) {
      showToast("Supabase belum dikonfigurasi di environment variables. Silahkan masukkan URL foto secara langsung.", "error");
      return;
    }

    setUploadingTarget(target);
    try {
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        try {
          fileToUpload = await compressImage(file, 1200, 1200, 0.8);
        } catch (compErr) {
          console.error("Compression failed, using original file:", compErr);
        }
      }

      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `settings/${target}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('gemataruna')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error(error.message + " (Pastikan Anda sudah membuat storage bucket publik bernama 'gemataruna' di Supabase)");
      }

      const { data: urlData } = supabase.storage
        .from('gemataruna')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update local settings state based on target
      if (target === 'hero') {
        setSettings((prev: any) => ({
          ...prev,
          hero: { ...prev.hero, image: publicUrl }
        }));
      } else if (target.startsWith('service-')) {
        const index = parseInt(target.split('-')[1], 10);
        setSettings((prev: any) => {
          const newServices = [...prev.services];
          newServices[index] = { ...newServices[index], image: publicUrl };
          return { ...prev, services: newServices };
        });
      } else if (target.startsWith('testimonial-')) {
        const index = parseInt(target.split('-')[1], 10);
        setSettings((prev: any) => {
          const newTestimonials = [...prev.testimonials];
          newTestimonials[index] = { ...newTestimonials[index], avatar: publicUrl };
          return { ...prev, testimonials: newTestimonials };
        });
      }

      showToast("🎉 Gambar berhasil diunggah!", "success");
    } catch (err: any) {
      console.error("Upload error detail:", err);
      showToast(`Gagal upload: ${err.message || 'Sesuatu yang salah terjadi'}`, "error");
    } finally {
      setUploadingTarget(null);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      if (isSupabaseConfigured) {
        const keys = ['hero', 'services', 'testimonials', 'faqs', 'packages'];
        for (const key of keys) {
          const { error } = await supabase
            .from('settings')
            .upsert({ key, value: settings[key] }, { onConflict: 'key' });
          if (error) throw error;
        }
      }
      
      localStorage.setItem('gemataruna_settings', JSON.stringify(settings));
      onSettingsSaved(settings);
      showToast("✅ Seluruh konten website berhasil diperbarui dan dipublikasikan secara live!", "success");
    } catch (err: any) {
      console.error("Error saving settings:", err);
      localStorage.setItem('gemataruna_settings', JSON.stringify(settings));
      onSettingsSaved(settings);
      
      showToast(`⚠️ Gagal sinkronisasi ke database cloud: ${err.message || err}. Perubahan tetap tersimpan lokal di browser Anda.`, "warning");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit size
    const maxSize = file.type.startsWith('video') ? 100 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast(`File terlalu besar! Maksimal ${file.type.startsWith('video') ? '100MB' : '20MB'}.`, "warning");
      return;
    }

    if (!isSupabaseConfigured) {
      showToast("Supabase belum dikonfigurasi di environment variables. Silahkan masukkan URL foto secara langsung.", "error");
      return;
    }

    setUploadProgress(10);
    setUploadStatus('Menyiapkan file...');
    try {
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        setUploadStatus('Mengompres foto...');
        setUploadProgress(25);
        try {
          fileToUpload = await compressImage(file, 1000, 1000, 0.8);
          console.log(`Compressed from ${(file.size / 1024).toFixed(1)} KB to ${(fileToUpload.size / 1024).toFixed(1)} KB`);
        } catch (compErr) {
          console.error("Compression failed, using original file:", compErr);
        }
      }

      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${activeTab}/${fileName}`;

      setUploadStatus('Mengunggah...');
      setUploadProgress(50);
      
      // Upload file to Supabase storage bucket named 'gemataruna'
      const { data, error } = await supabase.storage
        .from('gemataruna')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error(error.message + " (Pastikan Anda sudah membuat storage bucket publik bernama 'gemataruna' di Supabase)");
      }

      setUploadStatus('Menyelesaikan...');
      setUploadProgress(90);
      const { data: urlData } = supabase.storage
        .from('gemataruna')
        .getPublicUrl(filePath);

      setForm({ ...form, [activeTab === 'personnel' ? 'avatar_url' : 'image_url']: urlData.publicUrl });
      setUploadProgress(null);
      setUploadStatus('');
      showToast("🎉 Gambar berhasil diunggah!", "success");
    } catch (err: any) {
      console.error("Upload error detail:", err);
      showToast(`Gagal upload: ${err.message || 'Sesuatu yang salah terjadi'}`, "error");
      setUploadProgress(null);
      setUploadStatus('');
    }
  };

  const cleanImageUrl = (url: string) => {
    if (!url) return url;
    let cleaned = url.trim();
    // Fix Imgur links
    if (cleaned.includes('imgur.com/') && !cleaned.includes('i.imgur.com')) {
      const id = cleaned.split('/').pop();
      if (id && !id.includes('.')) {
        return `https://i.imgur.com/${id}.png`;
      }
    }
    return cleaned;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadProgress !== null) return;

    if (!isSupabaseConfigured) {
      showToast("Supabase belum dikonfigurasi. Data tidak dapat disimpan di cloud db.", "error");
      return;
    }

    try {
      const collectionName = activeTab;
      const cleanedData = { ...form };
      delete cleanedData.id;

      let payload: any = {};
      
      if (collectionName === 'personnel') {
        const avatar = cleanedData.avatar_url || cleanedData.avatarUrl || '';
        payload = {
          name: cleanedData.name,
          section: cleanedData.section,
          instrument: cleanedData.instrument,
          angkatan: cleanedData.angkatan.toString(),
          avatar_url: cleanImageUrl(avatar),
          instagram: cleanedData.instagram || null,
          tiktok: cleanedData.tiktok || null
        };
      } else {
        const img = cleanedData.image_url || cleanedData.imageUrl || '';
        payload = {
          title: cleanedData.title || '',
          image_url: cleanImageUrl(img),
          is_large: cleanedData.is_large !== undefined ? cleanedData.is_large : (cleanedData.isLarge || false)
        };
      }

      if (form.id) {
        // Update Row
        const { error } = await supabase
          .from(collectionName)
          .update(payload)
          .eq('id', form.id);

        if (error) throw error;
      } else {
        // Insert Row
        const { error } = await supabase
          .from(collectionName)
          .insert([payload]);

        if (error) throw error;
      }
      
      // Force instant manual refresh so we don't rely only on Realtime replication
      if (collectionName === 'personnel') {
        await refreshPersonnel();
      } else {
        await refreshGallery();
      }

      showToast("🎉 Data berhasil disimpan!", "success");
      setIsAdding(false);
      setForm({});
    } catch (err: any) {
      console.error("Save error detail:", err);
      showToast(`Gagal menyimpan: ${err.message || 'Terjadi kesalahan'}`, "error");
    }
  };

  const executeDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from(activeTab)
        .delete()
        .eq('id', id);

      if (error) throw error;

      showToast("Data berhasil dihapus!", "success");

      // Force instant manual refresh so we don't rely only on Realtime replication
      if (activeTab === 'personnel') {
        await refreshPersonnel();
      } else {
        await refreshGallery();
      }
    } catch (err: any) {
      console.error("Delete error:", err);
      showToast(`Gagal menghapus: ${err.message || 'Terjadi kesalahan'}`, "error");
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b pb-6 border-gray-200">
        <div>
          <h1 className="text-3xl font-black text-blue-950 flex items-center gap-2">
            <Database className="text-yellow-500" />
            CMS Gema Taruna <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded-md uppercase">Supabase Edition</span>
          </h1>
          <p className="text-gray-600 font-medium">Administrator: {userEmail || 'admin@gemataruna.com'}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSqlGuide(!showSqlGuide)}
            className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-xl font-bold hover:bg-yellow-200 transition-all text-sm active:scale-95"
          >
            <Terminal size={18} /> Setup Database SQL
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 bg-red-100 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-200 transition-all text-sm active:scale-95"
          >
            <LogOut size={18} /> Keluar
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Supabase Missing Banner */}
        {!isSupabaseConfigured && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 mb-8 text-amber-900 shadow-sm flex flex-col md:flex-row gap-4 items-start">
            <AlertCircle className="text-amber-500 shrink-0 mt-1" size={24} />
            <div className="flex-1">
              <h3 className="font-extrabold text-lg mb-1">Menjalankan dalam Mode Demo Offline</h3>
              <p className="text-sm opacity-90 leading-relaxed max-w-4xl">
                Kunci env <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold">VITE_SUPABASE_URL</code> dan <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold">VITE_SUPABASE_ANON_KEY</code> belum diisi di Setelan / Environment Variables. 
                Situs web saat ini menampilkan data dummy bawaan. Anda dapat menyetel credential di bar menu settings agar dapat terhubung dengan database cloud Supabase nyata dan mengunduh data secara live!
              </p>
            </div>
          </div>
        )}

        {/* Database setup instructions Drawer */}
        {showSqlGuide && (
          <div className="bg-blue-950 text-slate-100 rounded-[2rem] p-6 md:p-8 mb-8 border border-yellow-400/20 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-extrabold text-yellow-400 flex items-center gap-2">
                <Terminal size={20} /> Panduan Migrasi / Setup Supabase
              </h3>
              <button 
                onClick={handleCopySql}
                className="bg-white/10 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-white/20 transition-all flex items-center gap-2"
              >
                {copiedSql ? (
                  <>
                    <Check size={14} className="text-green-400" /> Disalin!
                  </>
                ) : (
                  "Salin Script SQL"
                )}
              </button>
            </div>
            
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              Buka dashboard projek Supabase Anda, masuk ke menu <strong>SQL Editor</strong>, klik <strong>New Query</strong>, tempelkan kode skrip di bawah ini, lalu jalankan (klik Run). Ini akan membuat tabel <code className="text-yellow-300 font-mono">personnel</code>, <code className="text-yellow-300 font-mono">gallery</code>, dan <code className="text-yellow-300 font-mono">settings</code> lengkap dengan izin akses RLS (Row Level Security).
            </p>

            <pre className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto max-h-72">
              {SUPABASE_SQL_SETUP}
            </pre>
            
            <div className="mt-4 bg-yellow-400/10 border-l-4 border-yellow-400 p-4 text-sm text-yellow-300 rounded-r-xl">
              💡 <strong>Tips Storage:</strong> Di dashboard Supabase Anda, navigasikan ke menu <strong>Storage</strong>, buat bucket publik baru bernama <strong className="underline">gemataruna</strong> agar Anda dapat mengunggah foto profil personil dan foto galeri secara instan dari CMS ini!
            </div>
          </div>
        )}

        <div className="flex gap-4 mb-6 border-b border-gray-200 pb-px font-bold">
          <button 
            onClick={() => setActiveTab('personnel')}
            className={`px-4 py-2 border-b-2 transition-all ${activeTab === 'personnel' ? 'border-yellow-500 text-blue-950 font-extrabold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Manajemen Personel
          </button>
          <button 
            onClick={() => setActiveTab('gallery')}
            className={`px-4 py-2 border-b-2 transition-all ${activeTab === 'gallery' ? 'border-yellow-500 text-blue-950 font-extrabold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Manajemen Galeri
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 border-b-2 transition-all ${activeTab === 'settings' ? 'border-yellow-500 text-blue-950 font-extrabold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Konten Website (Beranda, Layanan, FAQ, dll)
          </button>
        </div>

        {/* Error status banner */}
        {activeTab !== 'settings' && (activeTab === 'personnel' ? pError : gError) && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-red-800 flex items-start gap-3 shadow-sm">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-extrabold text-sm">Gagal mengambil data dari Supabase</h4>
              <p className="text-xs opacity-90 mt-1">{(activeTab === 'personnel' ? pError : gError)?.message}</p>
              <p className="text-xs font-bold text-blue-950 mt-2 bg-yellow-100/60 px-2 py-1 rounded inline-block">
                💡 Tips: Pastikan Anda sudah menjalankan sql setup lengkap dengan izin baca (RLS select policy) untuk tabel "{(activeTab === 'personnel' ? 'personnel' : 'gallery')}". Klik tombol kuning "Setup Database SQL" di sudut kanan atas untuk menyalin kodenya.
              </p>
            </div>
          </div>
        )}

        {activeTab !== 'settings' && (
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-extrabold text-blue-950">
              Daftar {activeTab === 'personnel' ? 'Personel' : 'Foto Galeri'} ({activeTab === 'personnel' 
                ? `${filteredPersonnel.length} / ${personnelList?.length || 0}` 
                : `${filteredGallery.length} / ${galleryList?.length || 0}`})
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={activeTab === 'personnel' ? () => refreshPersonnel() : () => refreshGallery()}
                className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold transition-all text-sm active:scale-95 border border-gray-200"
                title="Segarkan data dari database"
              >
                🔄 Refresh
              </button>
              <button 
                onClick={() => { setIsAdding(true); setForm({}); }}
                className="flex items-center gap-2 bg-blue-950 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-900 transition-all active:scale-95"
              >
                <Plus size={20} /> Tambah {activeTab === 'personnel' ? 'Personel' : 'Foto'}
              </button>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        {activeTab !== 'settings' && (
          <div className="bg-white p-4 md:p-5 rounded-3xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            {activeTab === 'personnel' ? (
              <>
                <div className="relative w-full md:w-96">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    value={pSearch}
                    onChange={(e) => setPSearch(e.target.value)}
                    placeholder="Cari nama personel atau instrumen..."
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-blue-950 placeholder-gray-400 outline-none focus:bg-white focus:border-yellow-400 transition-all"
                  />
                  {pSearch && (
                    <button
                      onClick={() => setPSearch('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 font-bold text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap md:flex-nowrap gap-3 w-full md:w-auto items-center">
                  <div className="relative w-full sm:w-auto">
                    <select
                      value={pSection}
                      onChange={(e) => setPSection(e.target.value)}
                      className="w-full sm:w-44 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-blue-950 outline-none focus:bg-white focus:border-yellow-400 transition-all appearance-none cursor-pointer pr-8"
                    >
                      <option value="">Semua Seksi</option>
                      {Object.keys(sectionInstruments).map((sec) => (
                        <option key={sec} value={sec}>{sec}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400 text-[10px]">▼</div>
                  </div>

                  <div className="relative w-full sm:w-auto">
                    <select
                      value={pAngkatan}
                      onChange={(e) => setPAngkatan(e.target.value)}
                      className="w-full sm:w-40 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-blue-950 outline-none focus:bg-white focus:border-yellow-400 transition-all appearance-none cursor-pointer pr-8"
                    >
                      <option value="">Semua Angkatan</option>
                      {uniqueAngkatan.map((ang) => (
                        <option key={ang} value={ang}>Angkatan {ang}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400 text-[10px]">▼</div>
                  </div>

                  {(pSearch || pSection || pAngkatan) && (
                    <button
                      onClick={() => {
                        setPSearch('');
                        setPSection('');
                        setPAngkatan('');
                      }}
                      className="text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 px-3 py-2.5 rounded-xl transition-all w-full sm:w-auto text-center"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="relative w-full md:w-96">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    value={gSearch}
                    onChange={(e) => setGSearch(e.target.value)}
                    placeholder="Cari judul galeri..."
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-blue-950 placeholder-gray-400 outline-none focus:bg-white focus:border-yellow-400 transition-all"
                  />
                  {gSearch && (
                    <button
                      onClick={() => setGSearch('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 font-bold text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap md:flex-nowrap gap-3 w-full md:w-auto items-center">
                  <div className="relative w-full sm:w-auto">
                    <select
                      value={gSize}
                      onChange={(e) => setGSize(e.target.value)}
                      className="w-full sm:w-44 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-blue-950 outline-none focus:bg-white focus:border-yellow-400 transition-all appearance-none cursor-pointer pr-8"
                    >
                      <option value="">Semua Ukuran</option>
                      <option value="standard">Ukuran Standar</option>
                      <option value="large">Ukuran Besar (Wide)</option>
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400 text-[10px]">▼</div>
                  </div>

                  {(gSearch || gSize) && (
                    <button
                      onClick={() => {
                        setGSearch('');
                        setGSize('');
                      }}
                      className="text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 px-3 py-2.5 rounded-xl transition-all w-full sm:w-auto text-center"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Modal Form */}
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAdding(false)}></div>
            <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-300">
              <h3 className="text-2xl font-black text-blue-950 mb-6">
                {form.id ? 'Edit' : 'Tambah'} {activeTab === 'personnel' ? 'Personel' : 'Galeri'}
              </h3>
              <form onSubmit={handleSave} className="space-y-4">
                {activeTab === 'personnel' ? (
                  <>
                    <input 
                      required placeholder="Nama Lengkap" className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-yellow-400" 
                      value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <select 
                        required 
                        className="p-3 rounded-xl border border-gray-200 outline-none focus:border-yellow-400 bg-white font-medium text-blue-950 text-sm" 
                        value={form.section || ''} 
                        onChange={e => {
                          const newSec = e.target.value;
                          const defaultInst = newSec && sectionInstruments[newSec] ? sectionInstruments[newSec][0] : '';
                          setForm({...form, section: newSec, instrument: defaultInst});
                        }}
                      >
                        <option value="">Pilih Section</option>
                        <option value="Brass">Brass</option>
                        <option value="Percussion">Percussion</option>
                        <option value="Color Guard">Color Guard</option>
                        <option value="Pit Instrument">Pit Instrument</option>
                        <option value="Leadership">Leadership</option>
                      </select>

                      <select 
                        required 
                        className="p-3 rounded-xl border border-gray-200 outline-none focus:border-yellow-400 bg-white font-medium text-blue-950 text-sm" 
                        value={
                          !form.section 
                            ? '' 
                            : (form.instrument && (sectionInstruments[form.section] || []).includes(form.instrument))
                              ? form.instrument
                              : 'Lainnya'
                        } 
                        onChange={e => {
                          const val = e.target.value;
                          if (val === 'Lainnya') {
                            setForm({...form, instrument: ''});
                          } else {
                            setForm({...form, instrument: val});
                          }
                        }}
                        disabled={!form.section}
                      >
                        <option value="">{form.section ? 'Pilih Alat Musik' : 'Pilih Section Dulu'}</option>
                        {form.section && (sectionInstruments[form.section] || []).map((inst) => (
                          <option key={inst} value={inst}>{inst}</option>
                        ))}
                        {form.section && <option value="Lainnya">Tulis Kustom / Lainnya...</option>}
                      </select>
                    </div>

                    {form.section && (!form.instrument || !(sectionInstruments[form.section] || []).includes(form.instrument)) && (
                      <input 
                        required 
                        placeholder="Ketik nama alat musik kustom..." 
                        className="w-full p-3 rounded-xl border border-yellow-400 outline-none focus:border-yellow-500 text-sm font-medium text-blue-950 bg-yellow-50/20 animate-in fade-in slide-in-from-top-1 duration-200" 
                        value={form.instrument || ''} 
                        onChange={e => setForm({...form, instrument: e.target.value})}
                      />
                    )}
                    <input 
                      required placeholder="Angkatan (Contoh: 2024)" className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-yellow-400" 
                      value={form.angkatan || ''} onChange={e => setForm({...form, angkatan: e.target.value})}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Instagram (Opsional)</label>
                        <input 
                          placeholder="Contoh: @username" className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-yellow-400 text-xs font-semibold" 
                          value={form.instagram || ''} onChange={e => setForm({...form, instagram: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">TikTok (Opsional)</label>
                        <input 
                          placeholder="Contoh: @username" className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-yellow-400 text-xs font-semibold" 
                          value={form.tiktok || ''} onChange={e => setForm({...form, tiktok: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-700">Foto Profil</label>
                      <div className="flex gap-4 items-center">
                        {form.avatar_url && (
                          <img 
                            src={form.avatar_url} 
                            className="w-12 h-12 rounded-full object-cover border" 
                            alt="" 
                            referrerPolicy="no-referrer" 
                          />
                        )}
                        <label className={`flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-xl border border-dashed border-gray-300 hover:bg-gray-50 cursor-pointer transition-all ${uploadProgress !== null ? 'opacity-50 pointer-events-none' : ''}`}>
                          <div className="flex items-center gap-2">
                            {uploadProgress !== null ? <Loader2 size={18} className="animate-spin text-blue-600" /> : <Upload size={18} />}
                            <span className="text-sm font-medium text-center">
                              {uploadProgress !== null ? `${uploadStatus || 'Mengunggah...'} ${uploadProgress}%` : 'Pilih Foto'}
                            </span>
                          </div>
                          {uploadProgress !== null && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                              <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                            </div>
                          )}
                          <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploadProgress !== null} />
                        </label>
                      </div>
                      <input 
                        required placeholder="Atau tempel Link URL Foto" className="w-full p-2 text-xs rounded-lg border border-gray-200 focus:border-yellow-400 outline-none" 
                        value={form.avatar_url || ''} onChange={e => setForm({...form, avatar_url: e.target.value})}
                      />
                      <p className="text-[10px] text-gray-400 italic">*Gunakan link langsung (Direct Link) jika menempel URL.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <input 
                      required placeholder="Judul Foto" className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-yellow-400" 
                      value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})}
                    />
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-700">File Galeri</label>
                      <div className="flex gap-4 items-center">
                        {form.image_url && (
                          <img 
                            src={form.image_url} 
                            className="w-12 h-12 rounded-lg object-cover border" 
                            alt="" 
                            referrerPolicy="no-referrer" 
                          />
                        )}
                        <label className={`flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-xl border border-dashed border-gray-300 hover:bg-gray-50 cursor-pointer transition-all ${uploadProgress !== null ? 'opacity-50 pointer-events-none' : ''}`}>
                          <div className="flex items-center gap-2">
                            {uploadProgress !== null ? <Loader2 size={18} className="animate-spin text-blue-600" /> : <Upload size={18} />}
                            <span className="text-sm font-medium text-center">
                              {uploadProgress !== null ? `${uploadStatus || 'Mengunggah...'} ${uploadProgress}%` : 'Upload File'}
                            </span>
                          </div>
                          {uploadProgress !== null && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                              <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                            </div>
                          )}
                          <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload} disabled={uploadProgress !== null} />
                        </label>
                      </div>
                      <input 
                        required placeholder="Atau tempel Link URL File" className="w-full p-2 text-xs rounded-lg border border-gray-200 focus:border-yellow-400 outline-none" 
                        value={form.image_url || ''} onChange={e => setForm({...form, image_url: e.target.value})}
                      />
                      <p className="text-[10px] text-gray-400 italic">*Gunakan link langsung (Direct Link) untuk hasil terbaik.</p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" className="w-5 h-5 rounded"
                        checked={form.is_large || false} onChange={e => setForm({...form, is_large: e.target.checked})}
                      />
                      <span className="font-medium text-gray-700">Tampilkan Ukuran Besar (Wide)</span>
                    </label>
                  </>
                )}
                
                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" onClick={() => setIsAdding(false)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-blue-950 text-white font-bold hover:bg-blue-900 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Save size={18} /> Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Loading status */}
        {activeTab !== 'settings' && (activeTab === 'personnel' ? pLoading : gLoading) && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-yellow-500 shrink-0" size={40} />
          </div>
        )}

        {/* Data List */}
        {activeTab !== 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTab === 'personnel' ? (
              filteredPersonnel.map((p: any) => (
                <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4 group hover:shadow-lg transition-all">
                  <img 
                    src={p.avatarUrl || p.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'} 
                    className="w-16 h-16 rounded-full object-cover border-2 border-yellow-400/20" 
                    alt="" 
                    referrerPolicy="no-referrer" 
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-blue-950 truncate">{p.name}</h4>
                    <p className="text-xs text-gray-500">{p.section} - {p.instrument}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">Angkatan {p.angkatan}</span>
                      {p.instagram && <span className="text-[9px] bg-pink-50 text-pink-600 font-extrabold px-1 rounded" title={`Instagram: ${p.instagram}`}>IG</span>}
                      {p.tiktok && <span className="text-[9px] bg-zinc-100 text-zinc-900 font-extrabold px-1 rounded" title={`TikTok: ${p.tiktok}`}>TT</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => { setForm(p); setIsAdding(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16}/></button>
                    <button onClick={() => setDeleteConfirm({ id: p.id, name: p.name })} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))
            ) : (
              filteredGallery.map((g: any) => {
                const parsed = parseMediaUrl(g.imageUrl || g.image_url);
                return (
                  <div key={g.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200.5 space-y-3 group hover:shadow-lg transition-all flex flex-col justify-between">
                    <div>
                      <div className="aspect-video relative rounded-xl overflow-hidden bg-gray-100 mb-3 border">
                        {parsed.type === 'instagram' ? (
                          <div className="w-full h-full bg-gradient-to-tr from-purple-600 via-pink-600 to-yellow-500 flex flex-col items-center justify-center p-4">
                            <Instagram size={32} className="text-white drop-shadow-md mb-1 animate-pulse" />
                            <span className="text-white font-extrabold text-[10px] tracking-wider uppercase text-center bg-black/20 px-2 py-1 rounded-md">Instagram Link</span>
                          </div>
                        ) : parsed.type === 'tiktok' ? (
                          <div className="w-full h-full bg-black flex flex-col items-center justify-center p-4 border-b-2 border-b-cyan-400">
                            <div className="bg-gradient-to-tr from-cyan-400 via-black to-pink-500 rounded-lg p-1.5 mb-1">
                              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                                <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.5-.7-.52-1.28-1.19-1.74-1.95-.01 2.25-.01 4.51-.01 6.77-.04 2.1-.51 4.25-1.68 6.03-1.61 2.49-4.59 3.99-7.58 3.66-3.41-.37-6.27-3.08-6.72-6.51-.55-4.14 2.12-8.19 6.21-8.91.82-.14 1.67-.16 2.5-.04V7.54c-1.13-.19-2.33-.03-3.39.46-1.97.91-3.3 2.99-3.26 5.17-.02 2.3 1.48 4.45 3.65 5.2 2.17.75 4.73.08 6.16-1.71 1.01-1.26 1.41-2.92 1.34-4.52V.02h.16z"/>
                              </svg>
                            </div>
                            <span className="text-white font-extrabold text-[9px] tracking-wider uppercase text-center bg-white/10 px-2 py-0.5 rounded-full">
                              {parsed.videoStaticId ? 'TikTok Video' : 'TikTok Link (Short)'}
                            </span>
                          </div>
                        ) : parsed.type === 'youtube' ? (
                          <div className="w-full h-full relative">
                            <img src={parsed.thumbnail} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <div className="bg-red-600 rounded-lg px-2 py-1 flex items-center justify-center text-white text-[10px] font-bold shadow-md">
                                <Youtube size={12} className="fill-current mr-1 text-white inline shrink-0" /> YouTube
                              </div>
                            </div>
                          </div>
                        ) : parsed.type === 'video' ? (
                          <div className="w-full h-full relative bg-black flex items-center justify-center">
                            <video src={parsed.url} className="w-full h-full object-cover opacity-85" muted playsInline />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <span className="bg-yellow-500 text-blue-950 font-bold px-2 py-1 rounded text-[10px] uppercase">Video File</span>
                            </div>
                          </div>
                        ) : (
                          <img src={parsed.url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        )}
                      </div>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-extrabold text-blue-950 truncate text-sm">{g.title || 'Momen Gema Taruna'}</h4>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{g.isLarge || g.is_large ? 'Ukuran Besar (Wide)' : 'Ukuran Standar'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-gray-100 justify-end">
                      <button onClick={() => { setForm(g); setIsAdding(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"><Edit2 size={14}/> Edit</button>
                      <button onClick={() => setDeleteConfirm({ id: g.id, name: g.title || 'Momen Gema Taruna' })} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"><Trash2 size={14}/> Hapus</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Empty state when lists are loaded but empty */}
        {activeTab !== 'settings' && !(activeTab === 'personnel' ? pLoading : gLoading) && 
         (activeTab === 'personnel' ? personnelList : galleryList)?.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <Database className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 font-bold mb-2">Belum ada data tersedia di Supabase</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">Klik "Tambah" di atas untuk menambahkan data pertama Anda atau impor setup SQL terlebih dahulu.</p>
          </div>
        )}

        {/* Empty state when filters are applied and no items match */}
        {activeTab !== 'settings' && !(activeTab === 'personnel' ? pLoading : gLoading) && 
         (activeTab === 'personnel' ? personnelList : galleryList)?.length > 0 && 
         (activeTab === 'personnel' ? filteredPersonnel : filteredGallery).length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-150 shadow-sm space-y-4">
            <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Search size={20} />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-blue-950">Pencarian Tidak Ditemukan</h4>
              <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed mt-1">
                Tidak ada data {activeTab === 'personnel' ? 'personel' : 'galeri'} yang cocok dengan filter atau kata kunci pencarian Anda.
              </p>
            </div>
            <button
              onClick={() => {
                if (activeTab === 'personnel') {
                  setPSearch('');
                  setPSection('');
                  setPAngkatan('');
                } else {
                  setGSearch('');
                  setGSize('');
                }
              }}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all active:scale-95"
            >
              Reset Filter & Pencarian
            </button>
          </div>
        )}

        {/* Website Content Management Tab Dashboard */}
        {activeTab === 'settings' && (
          <div className="space-y-10 pb-20">
            {/* Header / Save Button Top Bar */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-blue-950">Manajemen Konten Halaman Utama</h3>
                <p className="text-xs text-gray-500">Sesuaikan teks hero, foto beranda, layanan, FAQ, dan testimoni klien langsung dari panel ini.</p>
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-6 py-3 rounded-xl font-extrabold shadow-lg transition-all active:scale-95 text-sm shrink-0"
              >
                {isSavingSettings ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={18} /> Simpan Semua Perubahan
                  </>
                )}
              </button>
            </div>

            {/* SECTION 1: HERO BANNER */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-200 shadow-sm space-y-6">
              <h4 className="text-lg font-black text-blue-950 border-b pb-3 flex items-center gap-2">
                <span className="text-yellow-500 text-xl">1.</span> Hero Banner & Background Beranda
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">Judul Utama Hero (Bagian Atas)</label>
                    <input
                      required
                      type="text"
                      className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-yellow-400 text-sm font-medium text-blue-950"
                      value={settings.hero.title}
                      onChange={e => setSettings({
                        ...settings,
                        hero: { ...settings.hero, title: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">Slogan / Accent Gold (Bagian Bawah)</label>
                    <input
                      required
                      type="text"
                      className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-yellow-400 text-sm font-medium text-blue-950"
                      value={settings.hero.accent}
                      onChange={e => setSettings({
                        ...settings,
                        hero: { ...settings.hero, accent: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">Deskripsi / Sub-judul Hero</label>
                    <textarea
                      required
                      rows={3}
                      className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-yellow-400 text-sm font-medium text-blue-950"
                      value={settings.hero.subtitle}
                      onChange={e => setSettings({
                        ...settings,
                        hero: { ...settings.hero, subtitle: e.target.value }
                      })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">Foto Latar Belakang (URL)</label>
                    <input
                      type="text"
                      className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-yellow-400 text-xs font-mono text-blue-950"
                      value={settings.hero.image}
                      onChange={e => setSettings({
                        ...settings,
                        hero: { ...settings.hero, image: e.target.value }
                      })}
                    />
                  </div>
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center bg-gray-50">
                    {uploadingTarget === 'hero' ? (
                      <div className="flex flex-col items-center py-4">
                        <Loader2 className="animate-spin text-yellow-500 mb-2" size={24} />
                        <span className="text-xs font-bold text-gray-500">Mengunggah gambar...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="text-gray-400 mb-2" size={24} />
                        <p className="text-xs text-gray-500 font-bold mb-1">Unggah foto background beranda baru</p>
                        <p className="text-[10px] text-gray-400 mb-3">Direkomendasikan foto pemandangan lebar resolusi tinggi</p>
                        <label className="bg-blue-950 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer hover:bg-blue-900 transition-all">
                          Pilih Foto
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleSettingsImageUpload(e, 'hero')}
                          />
                        </label>
                      </>
                    )}
                  </div>
                  {settings.hero.image && (
                    <div className="aspect-video w-full rounded-xl overflow-hidden border bg-black relative">
                      <img src={settings.hero.image} className="w-full h-full object-cover animate-in fade-in duration-300" alt="Hero Preview" />
                      <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Preview Latar Belakang</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: FORMAT PENAMPILAN */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-200 shadow-sm space-y-6">
              <h4 className="text-lg font-black text-blue-950 border-b pb-3 flex items-center gap-2">
                <span className="text-yellow-500 text-xl">2.</span> Format Penampilan (Layanan)
              </h4>
              <p className="text-xs text-gray-400">Terdapat 4 format penampilan utama yang dipajang di halaman utama. Anda dapat mengubah foto, judul, dan deskripsinya.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {settings.services.map((service: any, index: number) => (
                  <div key={index} className="bg-gray-50 p-5 rounded-2xl border border-gray-150 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="bg-yellow-100 text-yellow-800 font-extrabold text-xs px-2.5 py-1 rounded-full uppercase tracking-wider">Format ke-{index + 1}</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">Nama Format Penampilan</label>
                        <input
                          required
                          type="text"
                          className="w-full p-2.5 rounded-lg border border-gray-200 bg-white outline-none focus:border-yellow-400 text-sm font-bold text-blue-950"
                          value={service.title}
                          onChange={e => {
                            const newServices = [...settings.services];
                            newServices[index] = { ...newServices[index], title: e.target.value };
                            setSettings({ ...settings, services: newServices });
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">Deskripsi Layanan</label>
                        <textarea
                          required
                          rows={2}
                          className="w-full p-2.5 rounded-lg border border-gray-200 bg-white outline-none focus:border-yellow-400 text-xs font-medium text-blue-950"
                          value={service.description}
                          onChange={e => {
                            const newServices = [...settings.services];
                            newServices[index] = { ...newServices[index], description: e.target.value };
                            setSettings({ ...settings, services: newServices });
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                        <div>
                          <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">URL Gambar</label>
                          <input
                            type="text"
                            className="w-full p-2.5 rounded-lg border border-gray-200 bg-white outline-none focus:border-yellow-400 text-[10px] font-mono text-blue-950"
                            value={service.image || service.imageUrl || ''}
                            onChange={e => {
                              const newServices = [...settings.services];
                              newServices[index] = { ...newServices[index], image: e.target.value };
                              setSettings({ ...settings, services: newServices });
                            }}
                          />
                        </div>
                        <div>
                          {uploadingTarget === `service-${index}` ? (
                            <div className="flex justify-center items-center py-2.5 bg-gray-100 rounded-lg border border-dashed">
                              <Loader2 className="animate-spin text-yellow-500 mr-2" size={16} />
                              <span className="text-[10px] font-bold text-gray-500">Uploading...</span>
                            </div>
                          ) : (
                            <label className="w-full bg-blue-950 text-white font-bold text-xs px-3 py-2.5 rounded-lg cursor-pointer hover:bg-blue-900 transition-all text-center block">
                              Ganti Foto (Upload)
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => handleSettingsImageUpload(e, `service-${index}`)}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                      {(service.image || service.imageUrl) && (
                        <div className="aspect-video w-full rounded-xl overflow-hidden border bg-black mt-2">
                          <img src={service.image || service.imageUrl} className="w-full h-full object-cover animate-in fade-in duration-300" alt="Service preview" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 3: TESTIMONI KLIEN */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b pb-3">
                <h4 className="text-lg font-black text-blue-950 flex items-center gap-2">
                  <span className="text-yellow-500 text-xl">3.</span> Testimonial / Apa Kata Klien
                </h4>
                <button
                  onClick={() => {
                    const newTestis = [...settings.testimonials, {
                      name: "Nama Klien Baru",
                      position: "Jabatan / Instansi",
                      text: "Tulis ulasan/testimoni klien di sini mengenai performa dan koordinasi tim Gema Taruna.",
                      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=new-testi"
                    }];
                    setSettings({ ...settings, testimonials: newTestis });
                  }}
                  className="bg-yellow-400 hover:bg-yellow-500 text-blue-950 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1 active:scale-95 transition-all"
                >
                  <Plus size={14} /> Tambah Testimonial
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {settings.testimonials.map((testi: any, index: number) => (
                  <div key={index} className="bg-gray-50 p-5 rounded-2xl border border-gray-150 space-y-3 relative">
                    <button
                      onClick={() => {
                        const newTestis = [...settings.testimonials];
                        newTestis.splice(index, 1);
                        setSettings({ ...settings, testimonials: newTestis });
                      }}
                      className="absolute top-3 right-3 text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                      title="Hapus testimonial"
                    >
                      <Trash2 size={16} />
                    </button>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 space-y-2">
                        <div>
                          <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-0.5">Nama Klien</label>
                          <input
                            required
                            type="text"
                            className="w-full p-2 rounded-lg border border-gray-200 bg-white outline-none focus:border-yellow-400 text-xs font-bold text-blue-950"
                            value={testi.name}
                            onChange={e => {
                              const newTestis = [...settings.testimonials];
                              newTestis[index] = { ...newTestis[index], name: e.target.value };
                              setSettings({ ...settings, testimonials: newTestis });
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-0.5">Jabatan / Instansi</label>
                          <input
                            required
                            type="text"
                            className="w-full p-2 rounded-lg border border-gray-200 bg-white outline-none focus:border-yellow-400 text-xs font-medium text-gray-600"
                            value={testi.position}
                            onChange={e => {
                              const newTestis = [...settings.testimonials];
                              newTestis[index] = { ...newTestis[index], position: e.target.value };
                              setSettings({ ...settings, testimonials: newTestis });
                            }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <img src={testi.avatar || testi.avatarUrl} className="w-12 h-12 rounded-full border-2 border-yellow-400 object-cover bg-white" alt="" />
                        {uploadingTarget === `testimonial-${index}` ? (
                          <Loader2 className="animate-spin text-yellow-500" size={16} />
                        ) : (
                          <label className="bg-blue-950 text-white font-bold text-[9px] px-2 py-1 rounded cursor-pointer hover:bg-blue-900 transition-all text-center">
                            Upload Foto
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => handleSettingsImageUpload(e, `testimonial-${index}`)}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-0.5">Isi Testimonial / Ulasan</label>
                      <textarea
                        required
                        rows={3}
                        className="w-full p-2.5 rounded-lg border border-gray-200 bg-white outline-none focus:border-yellow-400 text-xs font-medium italic text-gray-700 leading-relaxed"
                        value={testi.text}
                        onChange={e => {
                          const newTestis = [...settings.testimonials];
                          newTestis[index] = { ...newTestis[index], text: e.target.value };
                          setSettings({ ...settings, testimonials: newTestis });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 4: FAQ PERTANYAAN UMUM */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b pb-3">
                <h4 className="text-lg font-black text-blue-950 flex items-center gap-2">
                  <span className="text-yellow-500 text-xl">4.</span> Pertanyaan Umum (FAQ)
                </h4>
                <button
                  onClick={() => {
                    const newFaqs = [{ question: "Pertanyaan Baru?", answer: "Tuliskan jawaban lengkap untuk pertanyaan tersebut di sini." }, ...settings.faqs];
                    setSettings({ ...settings, faqs: newFaqs });
                  }}
                  className="bg-yellow-400 hover:bg-yellow-500 text-blue-950 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1 active:scale-95 transition-all"
                >
                  <Plus size={14} /> Tambah Pertanyaan FAQ
                </button>
              </div>

              <div className="space-y-4">
                {settings.faqs.map((faq: any, index: number) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-xl border border-gray-150 relative space-y-2 animate-in fade-in duration-200">
                    <button
                      onClick={() => {
                        const newFaqs = [...settings.faqs];
                        newFaqs.splice(index, 1);
                        setSettings({ ...settings, faqs: newFaqs });
                      }}
                      className="absolute top-3 right-3 text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                      title="Hapus FAQ"
                    >
                      <Trash2 size={16} />
                    </button>

                    <div className="pr-10">
                      <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">Pertanyaan</label>
                      <input
                        required
                        type="text"
                        className="w-full p-2 rounded-lg border border-gray-200 bg-white outline-none focus:border-yellow-400 text-xs font-bold text-blue-950"
                        value={faq.question}
                        onChange={e => {
                          const newFaqs = [...settings.faqs];
                          newFaqs[index] = { ...newFaqs[index], question: e.target.value };
                          setSettings({ ...settings, faqs: newFaqs });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">Jawaban</label>
                      <textarea
                        required
                        rows={2}
                        className="w-full p-2.5 rounded-lg border border-gray-200 bg-white outline-none focus:border-yellow-400 text-xs font-medium text-gray-700 leading-relaxed"
                        value={faq.answer}
                        onChange={e => {
                          const newFaqs = [...settings.faqs];
                          newFaqs[index] = { ...newFaqs[index], answer: e.target.value };
                          setSettings({ ...settings, faqs: newFaqs });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 5: PAKET FEE PENAMPILAN */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b pb-3">
                <h4 className="text-lg font-black text-blue-950 flex items-center gap-2">
                  <span className="text-yellow-500 text-xl">5.</span> Paket Fee Penampilan
                </h4>
                <button
                  onClick={() => {
                    const newPkgs = [...(settings.packages || []), {
                      name: "Paket Baru",
                      description: "Deskripsi paket penampilan baru Anda.",
                      price: "Rp 2.000.000",
                      features: [
                        "Kekuatan Tim: ± 50 Personel",
                        "Formasi Komplit",
                        "Konsumsi & Transportasi disediakan oleh panitia"
                      ],
                      popular: false
                    }];
                    setSettings({ ...settings, packages: newPkgs });
                  }}
                  className="bg-yellow-400 hover:bg-yellow-500 text-blue-950 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1 active:scale-95 transition-all"
                >
                  <Plus size={14} /> Tambah Paket Baru
                </button>
              </div>

              <div className="space-y-8">
                {(settings.packages || []).map((pkg: any, index: number) => (
                  <div key={index} className="bg-gray-50 p-6 rounded-2xl border border-gray-150 relative space-y-4 animate-in fade-in duration-200">
                    <button
                      onClick={() => {
                        const newPkgs = [...settings.packages];
                        newPkgs.splice(index, 1);
                        setSettings({ ...settings, packages: newPkgs });
                      }}
                      className="absolute top-3 right-3 text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                      title="Hapus Paket"
                    >
                      <Trash2 size={16} />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">Nama Paket</label>
                        <input
                          required
                          type="text"
                          className="w-full p-2.5 rounded-lg border border-gray-200 bg-white outline-none focus:border-yellow-400 text-xs font-bold text-blue-950"
                          value={pkg.name}
                          onChange={e => {
                            const newPkgs = [...settings.packages];
                            newPkgs[index] = { ...newPkgs[index], name: e.target.value };
                            setSettings({ ...settings, packages: newPkgs });
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">Harga (Teks)</label>
                        <input
                          required
                          type="text"
                          className="w-full p-2.5 rounded-lg border border-gray-200 bg-white outline-none focus:border-yellow-400 text-xs font-bold text-emerald-600"
                          value={pkg.price}
                          onChange={e => {
                            const newPkgs = [...settings.packages];
                            newPkgs[index] = { ...newPkgs[index], price: e.target.value };
                            setSettings({ ...settings, packages: newPkgs });
                          }}
                        />
                      </div>
                      <div className="flex items-center pt-5">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-yellow-500 rounded focus:ring-yellow-400 border-gray-300"
                            checked={pkg.popular || false}
                            onChange={e => {
                              const newPkgs = [...settings.packages];
                              newPkgs[index] = { ...newPkgs[index], popular: e.target.checked };
                              setSettings({ ...settings, packages: newPkgs });
                            }}
                          />
                          <span className="text-xs font-bold text-blue-950">Tandai sebagai Paket Terpopuler</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">Deskripsi Ringkas Paket</label>
                      <textarea
                        required
                        rows={2}
                        className="w-full p-2.5 rounded-lg border border-gray-200 bg-white outline-none focus:border-yellow-400 text-xs font-medium text-gray-700 leading-relaxed"
                        value={pkg.description}
                        onChange={e => {
                          const newPkgs = [...settings.packages];
                          newPkgs[index] = { ...newPkgs[index], description: e.target.value };
                          setSettings({ ...settings, packages: newPkgs });
                        }}
                      />
                    </div>

                    {/* Features / Benefits Array */}
                    <div className="space-y-2 border-t pt-3">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Fasilitas / Keunggulan Paket ({pkg.features?.length || 0})</label>
                        <button
                          type="button"
                          onClick={() => {
                            const newPkgs = [...settings.packages];
                            const features = [...(newPkgs[index].features || [])];
                            features.push("Fasilitas baru...");
                            newPkgs[index] = { ...newPkgs[index], features };
                            setSettings({ ...settings, packages: newPkgs });
                          }}
                          className="text-yellow-600 hover:text-yellow-700 font-bold text-[10px] flex items-center gap-0.5"
                        >
                          <Plus size={12} /> Tambah Fasilitas
                        </button>
                      </div>

                      <div className="space-y-2">
                        {(pkg.features || []).map((feature: string, fIdx: number) => (
                          <div key={fIdx} className="flex gap-2 items-center">
                            <span className="text-gray-400 font-bold text-xs select-none">✓</span>
                            <input
                              required
                              type="text"
                              className="flex-1 p-2 rounded-lg border border-gray-200 bg-white outline-none focus:border-yellow-400 text-xs font-medium text-gray-700"
                              value={feature}
                              onChange={e => {
                                const newPkgs = [...settings.packages];
                                const features = [...newPkgs[index].features];
                                features[fIdx] = e.target.value;
                                newPkgs[index] = { ...newPkgs[index], features };
                                setSettings({ ...settings, packages: newPkgs });
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newPkgs = [...settings.packages];
                                const features = [...newPkgs[index].features];
                                features.splice(fIdx, 1);
                                newPkgs[index] = { ...newPkgs[index], features };
                                setSettings({ ...settings, packages: newPkgs });
                              }}
                              className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                              title="Hapus fasilitas"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Giant bottom Save Button */}
            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-emerald-400 disabled:to-teal-400 text-white font-extrabold px-12 py-5 rounded-2xl shadow-xl hover:shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all text-base flex items-center justify-center gap-2"
              >
                {isSavingSettings ? (
                  <>
                    <Loader2 className="animate-spin" size={22} /> Memproses Penyimpanan Konten...
                  </>
                ) : (
                  <>
                    <Save size={22} /> Simpan Seluruh Konten & Publikasikan Live!
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        {/* Toast Container */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 p-4 flex items-start gap-3.5"
            >
              {toast.type === 'success' ? (
                <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl shrink-0">
                  <Check size={18} />
                </div>
              ) : toast.type === 'error' ? (
                <div className="bg-red-50 text-red-600 p-2 rounded-xl shrink-0">
                  <AlertCircle size={18} />
                </div>
              ) : toast.type === 'warning' ? (
                <div className="bg-amber-50 text-amber-600 p-2 rounded-xl shrink-0">
                  <AlertCircle size={18} />
                </div>
              ) : (
                <div className="bg-blue-50 text-blue-600 p-2 rounded-xl shrink-0">
                  <Loader2 className="animate-spin text-blue-600" size={18} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-blue-950 uppercase tracking-wider">
                  {toast.type === 'success' ? 'Sukses' : toast.type === 'error' ? 'Gagal' : toast.type === 'warning' ? 'Perhatian' : 'Info'}
                </p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed whitespace-pre-line">{toast.message}</p>
              </div>
              <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600 text-sm font-bold font-sans self-start select-none">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirm && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeleteConfirm(null)}
                className="absolute inset-0 bg-blue-950/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 max-w-sm w-full relative z-10 space-y-4"
              >
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 size={24} />
                </div>
                <div className="text-center">
                  <h3 className="text-base font-extrabold text-blue-950">Hapus Permanen?</h3>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    Yakin ingin menghapus <span className="font-extrabold text-gray-800">"{deleteConfirm.name}"</span> dari database? Tindakan ini tidak bisa dibatalkan.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      const id = deleteConfirm.id;
                      setDeleteConfirm(null);
                      executeDelete(id);
                    }}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition-colors shadow-lg shadow-red-600/10"
                  >
                    Hapus
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
