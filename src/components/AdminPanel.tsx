import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { supabase, isSupabaseConfigured, SUPABASE_SQL_SETUP } from '../lib/supabase';
import { useSupabaseCollection } from '../hooks/useSupabaseData';

interface AdminPanelProps {
  onLogout: () => void;
  userEmail?: string;
}

export default function AdminPanel({ onLogout, userEmail }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'personnel' | 'gallery'>('personnel');
  const { data: personnelList, loading: pLoading, error: pError, refresh: refreshPersonnel } = useSupabaseCollection<any>('personnel');
  const { data: galleryList, loading: gLoading, error: gError, refresh: refreshGallery } = useSupabaseCollection<any>('gallery');

  const [isAdding, setIsAdding] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [form, setForm] = useState<any>({});
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit size
    const maxSize = file.type.startsWith('video') ? 100 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File terlalu besar! Maksimal ${file.type.startsWith('video') ? '100MB' : '20MB'}.`);
      return;
    }

    if (!isSupabaseConfigured) {
      alert("Supabase belum dikonfigurasi di environment variables. Silahkan input URL foto secara langsung terlebih dahulu atau ikuti petunjuk setup.");
      return;
    }

    setUploadProgress(10);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${activeTab}/${fileName}`;

      setUploadProgress(40);
      
      // Upload file to Supabase storage bucket named 'gemataruna'
      const { data, error } = await supabase.storage
        .from('gemataruna')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error(error.message + " (Pastikan Anda sudah membuat storage bucket publik bernama 'gemataruna' di Supabase)");
      }

      setUploadProgress(80);
      const { data: urlData } = supabase.storage
        .from('gemataruna')
        .getPublicUrl(filePath);

      setForm({ ...form, [activeTab === 'personnel' ? 'avatar_url' : 'image_url']: urlData.publicUrl });
      setUploadProgress(null);
    } catch (err: any) {
      console.error("Upload error detail:", err);
      alert(`Gagal upload: ${err.message || 'Sesuatu yang salah terjadi'}`);
      setUploadProgress(null);
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
      alert("Supabase belum dikonfigurasi. Data tidak dapat disimpan di cloud db.");
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
          avatar_url: cleanImageUrl(avatar)
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

      setIsAdding(false);
      setForm({});
    } catch (err: any) {
      console.error("Save error detail:", err);
      alert(`Gagal menyimpan: ${err.message || JSON.stringify(err)}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus data ini dari database Supabase?")) return;
    try {
      const { error } = await supabase
        .from(activeTab)
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Force instant manual refresh so we don't rely only on Realtime replication
      if (activeTab === 'personnel') {
        await refreshPersonnel();
      } else {
        await refreshGallery();
      }
    } catch (err: any) {
      console.error("Delete error:", err);
      alert(`Gagal menghapus: ${err.message}`);
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
              Buka dashboard projek Supabase Anda, masuk ke menu <strong>SQL Editor</strong>, klik <strong>New Query</strong>, tempelkan kode skrip di bawah ini, lalu jalankan (klik Run). Ini akan membuat tabel <code className="text-yellow-300 font-mono">personnel</code> dan <code className="text-yellow-300 font-mono">gallery</code> lengkap dengan izin akses RLS (Row Level Security).
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
        </div>

        {/* Error status banner */}
        {(activeTab === 'personnel' ? pError : gError) && (
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

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-extrabold text-blue-950">
            Daftar {activeTab === 'personnel' ? 'Personel' : 'Foto Galeri'} ({activeTab === 'personnel' ? personnelList.length : galleryList.length})
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
                        required className="p-3 rounded-xl border border-gray-200 outline-none focus:border-yellow-400 bg-white" 
                        value={form.section || ''} onChange={e => setForm({...form, section: e.target.value})}
                      >
                        <option value="">Pilih Section</option>
                        <option value="Brass">Brass</option>
                        <option value="Percussion">Percussion</option>
                        <option value="Color Guard">Color Guard</option>
                        <option value="Pit Instrument">Pit Instrument</option>
                        <option value="Leadership">Leadership</option>
                      </select>
                      <input 
                        required placeholder="Alat Musik" className="p-3 rounded-xl border border-gray-200 outline-none focus:border-yellow-400" 
                        value={form.instrument || ''} onChange={e => setForm({...form, instrument: e.target.value})}
                      />
                    </div>
                    <input 
                      required placeholder="Angkatan (Contoh: 2024)" className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-yellow-400" 
                      value={form.angkatan || ''} onChange={e => setForm({...form, angkatan: e.target.value})}
                    />
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
                            <span className="text-sm font-medium">
                              {uploadProgress !== null ? `Mengunggah... ${uploadProgress}%` : 'Pilih Foto'}
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
                            <span className="text-sm font-medium">
                              {uploadProgress !== null ? `Mengunggah... ${uploadProgress}%` : 'Upload File'}
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
        {(activeTab === 'personnel' ? pLoading : gLoading) && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-yellow-500 shrink-0" size={40} />
          </div>
        )}

        {/* Data List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'personnel' ? (
            personnelList.map((p: any) => (
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
                  <p className="text-[10px] font-bold text-yellow-600">Angkatan {p.angkatan}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => { setForm(p); setIsAdding(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16}/></button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>
            ))
          ) : (
            galleryList.map((g: any) => (
              <div key={g.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 space-y-3 group hover:shadow-lg transition-all">
                <div className="aspect-video relative rounded-xl overflow-hidden bg-gray-100">
                  <img src={g.imageUrl || g.image_url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                </div>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-blue-950 truncate">{g.title || 'Momen Gema Taruna'}</h4>
                    <p className="text-xs text-gray-500">{g.isLarge || g.is_large ? 'Ukuran Besar (Wide)' : 'Ukuran Standar'}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setForm(g); setIsAdding(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16}/></button>
                    <button onClick={() => handleDelete(g.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Empty state when lists are loaded but empty */}
        {!(activeTab === 'personnel' ? pLoading : gLoading) && 
         (activeTab === 'personnel' ? personnelList : galleryList).length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <Database className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 font-bold mb-2">Belum ada data tersedia di Supabase</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">Klik "Tambah" di atas untuk menambahkan data pertama Anda atau impor setup SQL terlebih dahulu.</p>
          </div>
        )}
      </main>
    </div>
  );
}
