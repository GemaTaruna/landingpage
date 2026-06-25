import { 
  Trophy, 
  Award, 
  Star, 
  Calendar, 
  Music, 
  Menu, 
  X, 
  ChevronDown, 
  MapPin, 
  Phone, 
  Mail, 
  Instagram, 
  Youtube, 
  MessageCircle, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { useSupabaseCollection } from './hooks/useSupabaseData';
import AdminPanel from './components/AdminPanel';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const SCHOOL_NAME = "Gema Taruna";
const SCHOOL_SUBTITLE = "SMKN 2 Sragen";
const SCHOOL_ADDRESS = "Jl. Dr. Soetomo No 04 Sragen, Jawa Tengah 57212";
const SCHOOL_PHONE = "+62 813-1028-7799";
const SCHOOL_EMAIL = "gematarunatwosra@smkn2sragen.sch.id";
const WA_LINK = "https://wa.me/6281310287799";
const ADMIN_EMAILS = ["nupha7@gmail.com", "gematarunatwosra@smkn2sragen.sch.id"]; // Anda bisa menambahkan email admin lainnya di sini! Contoh: ["nupha7@gmail.com", "admin2@gmail.com"]

const isEmailAdmin = (email?: string): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.trim().toLowerCase());
};

const achievements = [
  { icon: Calendar, title: "Pawai Pembangunan Sragen", subtitle: "Tampil legendaris secara rutin sebagai Korps Musik Kehormatan pembuka Pawai Pembangunan & Hari Jadi Kabupaten Sragen." },
  { icon: Trophy, title: "Kirab Kebangsaan", subtitle: "Kirab/Parade Kebangsaan HUT RI di desa-desa" },
  { icon: Star, title: "Upacara Protokoler Resmi", subtitle: "Sering dipercaya sebagai Korps Musik (Korsik) utama pada Upacara Hari Besar Nasional pada lingkungan Kabupaten Sragen atau Provinsi Jawa Tengah." }
];

const services = [
  {
    title: "Parade / Kirab",
    description: "Formasi dinamis untuk pawai kemerdekaan, kirab budaya, dan acara kenegaraan dengan musik patriotik yang memukau.",
    image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&q=80&w=800"
  },
  {
    title: "Display / Konser Lapangan",
    description: "Pertunjukan spektakuler dengan koreografi kompleks, drill formasi artistik, dan visual performance yang menawan di lapangan terbuka.",
    image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&q=80&w=800"
  },
  {
    title: "Korsik / Upacara Formal",
    description: "Layanan korps musik untuk upacara resmi, pelantikan, dan acara kedinasan. Membawakan lagu kebangsaan dan mars dengan standar protokol tinggi yang khidmat.",
    image: "https://images.unsplash.com/photo-1544427920-c49ccfb85579?auto=format&fit=crop&q=80&w=800"
  },
  {
    title: "Penyambutan Tamu",
    description: "Upacara penyambutan eksklusif dengan formasi guard of honor dan alunan musik seremonial yang megah dan penuh kehormatan.",
    image: "https://images.unsplash.com/photo-1511735111819-9a3f7709049c?auto=format&fit=crop&q=80&w=800"
  }
];

// Fallback constant data if Firestore is empty
const defaultPersonnel = [
  { name: "Andi Prasetyo", section: "Brass", instrument: "Trumpet", angkatan: "2023", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Andi" },
  { name: "Budi Santoso", section: "Brass", instrument: "Mellophone", angkatan: "2023", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Budi" },
  { name: "Citra Dewi", section: "Brass", instrument: "Trombone", angkatan: "2023", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Citra" },
];

const defaultGallery = [
  { title: "Kirab HUT RI ke-79", imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=1200", isLarge: true },
  { title: "Display Competition 2024", imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=800", isLarge: false },
];

const romanToVal = (roman: string): number => {
  const r = roman.toUpperCase().trim();
  const map: { [key: string]: number } = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < r.length; i++) {
    const current = map[r[i]] || 0;
    const next = map[r[i + 1]] || 0;
    if (current < next) {
      total += next - current;
      i++;
    } else {
      total += current;
    }
  }
  return total;
};

const getAngkatanWeight = (angkatanStr: string): number => {
  if (!angkatanStr) return 0;
  const clean = String(angkatanStr).replace(/angkatan/gi, '').trim();
  if (/^\d+$/.test(clean)) {
    return parseInt(clean, 10);
  }
  const romanWeight = romanToVal(clean);
  if (romanWeight > 0) return romanWeight;
  return 0;
};

const getCleanAngkatanName = (val: string): string => {
  if (!val) return '';
  const str = String(val).trim();
  if (str.toLowerCase().startsWith('angkatan')) {
    return str;
  }
  return `Angkatan ${str}`;
};

interface ProfileAvatarProps {
  src?: string;
  alt: string;
  className?: string;
  name?: string;
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ src, alt, className = "", name = "" }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      setHasError(true);
    } else {
      setHasError(false);
      setIsLoaded(false);
    }
  }, [src]);

  const getInitials = (n: string) => {
    if (!n) return 'GT';
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <div className={`relative overflow-hidden bg-slate-100 flex items-center justify-center ${className}`}>
      {/* Loading Skeleton Pulse */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-full"></div>
      )}

      {/* Actual Image */}
      {src && !hasError && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 rounded-full ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          referrerPolicy="no-referrer"
        />
      )}

      {/* Fallback Initials / Icon */}
      {hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-950 to-zinc-900 flex flex-col items-center justify-center text-white select-none rounded-full">
          <span className="text-sm font-black tracking-wider text-yellow-400">{getInitials(name)}</span>
          <User size={12} className="text-white/40 mt-0.5" />
        </div>
      )}
    </div>
  );
};

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

const pricingPackages = [
  {
    name: "Paket Half Team",
    description: "Kombinasi dinamis dengan setengah kekuatan kompeten utama. Sangat ideal untuk upacara protokoler, parade skala sedang, khidmat penyambutan VIP, atau event dengan ruang terbatas.",
    price: "Rp 1.500.000",
    features: [
      "Kekuatan Tim: ± 41 Personel Pilihan",
      "Formasi Komplit (Brass, Battery, Pit, & Full Color Guard)",
      "Display Lapangan & Drill Koreografi Kompleks (Up to 20 Menit)",
      "Bebas Request Lagu (Aransemen Musik Custom Khusus)",
      "Atraksi Penari Color Guard dengan Bendera & Properti Megah",
      "Konsumsi & Transportasi disediakan oleh pihak panitia"
    ],
    popular: false
  },
  {
    name: "Paket Full Team",
    description: "Pertunjukan kolosal spektakuler berkekuatan penuh untuk menghadirkan koreografi megah serta harmoni audio raksasa yang mengguncang panggung.",
    price: "Rp 3.000.000",
    features: [
      "Kekuatan Penuh: 82 Personel Aktif Berkualitas",
      "Formasi Komplit (Brass, Battery, Pit, & Full Color Guard)",
      "Display Lapangan & Drill Koreografi Kompleks (Up to 20 Menit)",
      "Bebas Request Lagu (Aransemen Musik Custom Khusus)",
      "Atraksi Penari Color Guard dengan Bendera & Properti Megah",
      "Konsumsi & Transportasi disediakan oleh pihak panitia"
    ],
    popular: true
  }
];

const testimonials = [
  {
    name: "Bapak Suryanto",
    position: "Kepala Dinas Kebudayaan Sragen",
    text: "Penampilan Gema Taruna selalu memukau dan profesional. Formasi yang rapi dan musik yang membanggakan.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Andi"
  },
  {
    name: "Ibu Dr. Retno Wulandari",
    position: "Ketua Panitia Kirab Budaya 2024",
    text: "Kerjasama yang sangat baik, tepat waktu, dan hasilnya luar biasa. Sangat merekomendasikan untuk acara formal maupun seremonial.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Retno"
  },
  {
    name: "Bapak Wahyu Utomo, S.Pd.",
    position: "Wakil Kepala Sekolah Bidang Kesiswaan",
    text: "Sangat bangga dengan kedisiplinan dan dedikasi taruna-taruni Gema Taruna. Setiap performa memancarkan karakter tangguh dan kerja tim yang luar biasa.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Wahyu"
  },
  {
    name: "Kak Seto Pamungkas",
    position: "Penyelenggara Event Organizer Solo Raya",
    text: "Suatu kehormatan mengundang Gema Taruna. Koordinasi lapangan sangat mudah, atraksi Color Guard sangat megah, dan audio brass-nya benar-benar menghidupkan seluruh area acara.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Seto"
  }
];

const faqData = [
  {
    question: "Apakah bisa request lagu tertentu?",
    answer: "Tentu bisa! Kami dapat menyesuaikan repertoar musik sesuai tema acara Anda. Harap konfirmasi minimal 2-4 minggu sebelum acara untuk persiapan yang optimal agar kami bisa mengaransemen lagu tersebut jika diperlukan."
  },
  {
    question: "Berapa lama durasi penampilan?",
    answer: "Durasi penampilan (Display) sekitar 20-30 menit dengan formasi lengkap yang intens."
  },
  {
    question: "Bagaimana dengan transportasi dan akomodasi?",
    answer: "Untuk wilayah Sragen kota sudah termasuk dalam paket. Untuk luar kota atau luar kabupaten, biaya transportasi dan konsumsi personel akan disesuaikan berdasarkan jarak. Kami biasanya menggunakan truk/bus sekolah atau sewa armada khusus."
  },
  {
    question: "Berapa jumlah personel yang tampil?",
    answer: "Jumlah personel bervariasi antara 40 hingga 80 orang. Formasi lengkap (Big Band) melibatkan seluruh instrumen brass, perkusi, pit instrument, dan color guard untuk hasil maksimal."
  },
  {
    question: "Apakah melayani acara di luar hari sekolah?",
    answer: "Ya, kami melayani penampilan di hari libur, akhir pekan, maupun hari kerja. Untuk hari kerja, kami akan mengoordinasikan perizinan sekolah bagi para personel taruna/taruni."
  },
  {
    question: "Berapa lama waktu persiapan sebelum tampil?",
    answer: "Kami membutuhkan waktu sekitar 30-60 menit untuk persiapan alat (unloading), pemanasan, dan tuning instrumen di lokasi acara sebelum waktu penampilan dimulai."
  },
  {
    question: "Apakah melayani acara di luar Kabupaten Sragen?",
    answer: "Ya, Gema Taruna melayani undangan di seluruh wilayah Solo Raya dan sekitarnya (Karesidenan Surakarta). Untuk luar daerah tersebut, silahkan konsultasikan lebih lanjut dengan admin."
  },
  {
    question: "Apa saja fasilitas yang dibutuhkan tim di lokasi?",
    answer: "Kami membutuhkan area transit/ruang tunggu untuk personel, air minum yang cukup, dan area parkir yang memadai untuk armada angkut alat."
  },
  {
    question: "Bagaimana prosedur pemesanannya?",
    answer: "Silahkan hubungi kami melalui WhatsApp, tentukan tanggal dan lokasi, diskusikan kebutuhan paket, dan lakukan konfirmasi (DP) untuk mengunci jadwal penampilan kami."
  }
];

const getInitialSettings = () => {
  const local = localStorage.getItem('gemataruna_settings');
  const defaults = {
    hero: {
      title: "Satu Tekad, Satu Semangat,",
      accent: "Marching Hebat!",
      subtitle: "Mengukir kebanggaan melalui harmoni nada, visual memukau, dan dedikasi tanpa batas untuk mengharumkan nama sekolah.",
      image: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=2000"
    },
    services: [
      {
        title: "Parade / Kirab",
        description: "Formasi dinamis untuk pawai kemerdekaan, kirab budaya, dan acara kenegaraan dengan musik patriotik yang memukau.",
        image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&q=80&w=800"
      },
      {
        title: "Display / Konser Lapangan",
        description: "Pertunjukan spektakuler dengan koreografi kompleks, drill formasi artistik, dan visual performance yang menawan di lapangan terbuka.",
        image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&q=80&w=800"
      },
      {
        title: "Korsik / Upacara Formal",
        description: "Layanan korps musik untuk upacara resmi, pelantikan, dan acara kedinasan. Membawakan lagu kebangsaan dan mars dengan standar protokol tinggi yang khidmat.",
        image: "https://images.unsplash.com/photo-1544427920-c49ccfb85579?auto=format&fit=crop&q=80&w=800"
      },
      {
        title: "Penyambutan Tamu",
        description: "Upacara penyambutan eksklusif dengan formasi guard of honor dan alunan musik seremonial yang megah dan penuh kehormatan.",
        image: "https://images.unsplash.com/photo-1511735111819-9a3f7709049c?auto=format&fit=crop&q=80&w=800"
      }
    ],
    testimonials: [
      {
        name: "Bapak Suryanto",
        position: "Kepala Dinas Kebudayaan Sragen",
        text: "Penampilan Gema Taruna selalu memukau dan profesional. Formasi yang rapi dan musik yang membanggakan.",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Andi"
      },
      {
        name: "Ibu Dr. Retno Wulandari",
        position: "Ketua Panitia Kirab Budaya 2024",
        text: "Kerjasama yang sangat baik, tepat waktu, dan hasilnya luar biasa. Sangat merekomendasikan untuk acara formal maupun seremonial.",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Retno"
      },
      {
        name: "Bapak Wahyu Utomo, S.Pd.",
        position: "Wakil Kepala Sekolah Bidang Kesiswaan",
        text: "Sangat bangga dengan kedisiplinan dan dedikasi taruna-taruni Gema Taruna. Setiap performa memancarkan karakter tangguh dan kerja tim yang luar biasa.",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Wahyu"
      },
      {
        name: "Kak Seto Pamungkas",
        position: "Penyelenggara Event Organizer Solo Raya",
        text: "Suatu kehormatan mengundang Gema Taruna. Koordinasi lapangan sangat mudah, atraksi Color Guard sangat megah, dan audio brass-nya benar-benar menghidupkan seluruh area acara.",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Seto"
      }
    ],
    faqs: [
      {
        question: "Apakah bisa request lagu tertentu?",
        answer: "Tentu saja! Kami sangat terbuka untuk permintaan lagu khusus agar sesuai dengan tema acara Anda. Kami menyarankan untuk memberitahukan lagu pilihan Anda minimal 3-4 minggu sebelum acara berlangsung agar tim aransemen musik dan seluruh personel kami dapat berlatih dengan maksimal."
      },
      {
        question: "Berapa lama durasi penampilan?",
        answer: "Durasi penampilan (Display) sekitar 20-30 menit dengan formasi lengkap yang intens."
      },
      {
        question: "Bagaimana dengan transportasi dan akomodasi?",
        answer: "Akomodasi, konsumsi, dan transportasi seluruh personel Gema Taruna serta instrumen musiknya dari kampus SMKN 2 Sragen menuju lokasi acara dan kembali disediakan oleh pihak pengundang (klien)."
      },
      {
        question: "Berapa minimal waktu pemesanan?",
        answer: "Kami menyarankan pemesanan dilakukan minimal 1 bulan sebelum acara (terutama pada musim padat event seperti Agustus-Oktober) untuk memastikan ketersediaan jadwal serta persiapan formasi dan perizinan sekolah berjalan lancar."
      },
      {
        question: "Berapa jumlah personel yang tampil?",
        answer: "Jumlah personel bervariasi antara 40 hingga 80 orang. Formasi lengkap (Big Band) melibatkan seluruh instrumen brass, perkusi, pit instrument, dan color guard untuk hasil maksimal."
      },
      {
        question: "Apakah melayani acara di luar hari sekolah?",
        answer: "Ya, kami melayani penampilan di hari libur, akhir pekan, maupun hari kerja. Untuk hari kerja, kami akan mengoordinasikan perizinan sekolah bagi para personel taruna/taruni."
      },
      {
        question: "Berapa lama waktu persiapan sebelum tampil?",
        answer: "Kami membutuhkan waktu sekitar 30-60 menit untuk persiapan alat (unloading), pemanasan, dan tuning instrumen di lokasi acara sebelum waktu penampilan dimulai."
      },
      {
        question: "Apakah melayani acara di luar Kabupaten Sragen?",
        answer: "Ya, Gema Taruna melayani undangan di seluruh wilayah Solo Raya dan sekitarnya (Karesidenan Surakarta). Untuk luar daerah tersebut, silahkan konsultasikan lebih lanjut dengan admin."
      },
      {
        question: "Apa saja fasilitas yang dibutuhkan tim di lokasi?",
        answer: "Kami membutuhkan area transit/ruang tunggu untuk personel, air minum yang cukup, dan area parkir yang memadai untuk armada angkut alat."
      },
      {
        question: "Bagaimana prosedur pemesanannya?",
        answer: "Silahkan hubungi kami melalui WhatsApp, tentukan tanggal dan lokasi, diskusikan kebutuhan paket, dan lakukan konfirmasi (DP) untuk mengunci jadwal penampilan kami."
      }
    ]
  };

  if (local) {
    try {
      const parsed = JSON.parse(local);
      return {
        hero: parsed.hero || defaults.hero,
        services: parsed.services || defaults.services,
        testimonials: parsed.testimonials || defaults.testimonials,
        faqs: parsed.faqs || defaults.faqs
      };
    } catch (e) {
      return defaults;
    }
  }
  return defaults;
};

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [filterAngkatan, setFilterAngkatan] = useState('Semua Angkatan');
  const [filterSection, setFilterSection] = useState('Semua Section');
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasSetDefaultAngkatan, setHasSetDefaultAngkatan] = useState(false);
  const [activeDotIndex, setActiveDotIndex] = useState(0);
  
  // Dynamic Web Settings State
  const [webSettings, setWebSettings] = useState<any>(() => getInitialSettings());

  // Load web settings from Supabase table "settings"
  useEffect(() => {
    const fetchSupabaseSettings = async () => {
      if (!isSupabaseConfigured) return;
      try {
        const { data, error } = await supabase.from('settings').select('*');
        if (error) {
          console.warn("Could not load settings from Supabase (maybe table does not exist):", error.message);
          return;
        }
        if (data && data.length > 0) {
          const loaded: any = {};
          data.forEach((row: any) => {
            loaded[row.key] = row.value;
          });
          
          setWebSettings((prev: any) => {
            const merged = {
              hero: loaded.hero || prev.hero,
              services: loaded.services || prev.services,
              testimonials: loaded.testimonials || prev.testimonials,
              faqs: loaded.faqs || prev.faqs
            };
            localStorage.setItem('gemataruna_settings', JSON.stringify(merged));
            return merged;
          });
        }
      } catch (e) {
        console.error("Error loading web settings:", e);
      }
    };
    fetchSupabaseSettings();
  }, []);

  // Auth & Admin State
  const [user, setUser] = useState<any>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Custom Login Modal State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Supabase Realtime Collections Data
  const { data: dbPersonnel, loading: pLoading } = useSupabaseCollection<any>('personnel');
  const { data: dbGallery, loading: gLoading } = useSupabaseCollection<any>('gallery');

  const personnelList = dbPersonnel.length > 0 ? dbPersonnel : defaultPersonnel;
  const galleryList = dbGallery.length > 0 ? dbGallery : defaultGallery;

  // Automatically select the newest cohort (latest Angkatan) when data arrives
  useEffect(() => {
    if (personnelList && personnelList.length > 0 && !hasSetDefaultAngkatan) {
      const uniqueClean = [...new Set(personnelList.map((p: any) => getCleanAngkatanName(p.angkatan)))];
      if (uniqueClean.length > 0) {
        // Sort from highest to lowest weight
        const sorted = uniqueClean.sort((a: any, b: any) => getAngkatanWeight(b) - getAngkatanWeight(a));
        const latest = sorted[0];
        if (latest) {
          setFilterAngkatan(latest);
          setHasSetDefaultAngkatan(true);
        }
      }
    }
  }, [personnelList, hasSetDefaultAngkatan]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterAngkatan, filterSection]);

  // Set initial scroll position to the middle section (Set B or element index N) for infinite carousel looping
  useEffect(() => {
    const el = document.getElementById('gallery-container');
    if (el && galleryList.length > 0) {
      const alignTimer = setTimeout(() => {
        const children = Array.from(el.children) as HTMLElement[];
        const N = galleryList.length;
        if (children[N]) {
          el.scrollLeft = children[N].offsetLeft - el.offsetLeft;
        }
      }, 150);
      return () => clearTimeout(alignTimer);
    }
  }, [galleryList]);

  const handleMobileLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setIsMenuOpen(false);
    
    // Smooth scroll slightly delayed to let menu container collapse
    setTimeout(() => {
      const target = document.getElementById(href.replace('#', ''));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 200);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthLoading(false);
      return;
    }

    // Set initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user?.email && isEmailAdmin(session.user.email)) {
        setIsAdminMode(true);
      }
      setIsAuthLoading(false);
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.email && isEmailAdmin(session.user.email)) {
        setIsAdminMode(true);
      } else {
        setIsAdminMode(false);
      }
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleOpenLogin = () => {
    setLoginEmail('');
    setLoginPassword('');
    setLoginError('');
    setShowLoginModal(true);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword,
        });

        if (error) throw error;

        if (!data.user?.email || !isEmailAdmin(data.user.email)) {
          await supabase.auth.signOut();
          throw new Error("Maaf, akun Anda bukan admin aplikasi ini.");
        }

        setUser(data.user);
        setIsAdminMode(true);
        setShowLoginModal(false);
      } else {
        // Safe mock bypass for demo mode when Supabase is not configured yet
        if (isEmailAdmin(loginEmail)) {
          setUser({ email: loginEmail, id: 'demo-admin-id' });
          setIsAdminMode(true);
          setShowLoginModal(false);
        } else {
          throw new Error(`Gunakan email admin salah satu dari: ${ADMIN_EMAILS.join(', ')}`);
        }
      }
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || 'Gagal masuk. Periksa kembali email dan kata sandi Anda.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setIsAdminMode(false);
  };

  const navLinks = [
    { name: "Beranda", href: "#beranda" },
    { name: "Profil", href: "#profil" },
    { name: "Galeri", href: "#galeri" },
    { name: "Paket Fee", href: "#paket" },
  ];

  const filteredPersonnel = personnelList.filter((p: any) => {
    const cleanP = getCleanAngkatanName(p.angkatan);
    const matchAngkatan = filterAngkatan === 'Semua Angkatan' || cleanP === filterAngkatan;
    const matchSection = filterSection === 'Semua Section' || p.section === filterSection;
    return matchAngkatan && matchSection;
  }).sort((a: any, b: any) => {
    const sectionOrderMap: { [key: string]: number } = {
      'Leadership': 1,
      'Brass': 2,
      'Percussion': 3,
      'Pit Instrument': 4,
      'Color Guard': 5
    };
    const orderA = sectionOrderMap[a.section] || 99;
    const orderB = sectionOrderMap[b.section] || 99;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    const instA = (a.instrument || '').toLowerCase();
    const instB = (b.instrument || '').toLowerCase();
    if (instA !== instB) {
      return instA.localeCompare(instB);
    }
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const ITEMS_PER_PAGE = 12;
  const totalPages = Math.ceil(filteredPersonnel.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPersonnel = filteredPersonnel.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (isAdminMode && user?.email && isEmailAdmin(user.email)) {
    return (
      <AdminPanel 
        onLogout={handleLogout} 
        userEmail={user?.email} 
        initialSettings={webSettings}
        onSettingsSaved={(newSettings: any) => {
          setWebSettings(newSettings);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Navigation */}
      <nav id="navbar" className="fixed top-0 left-0 right-0 z-50 bg-blue-950/95 backdrop-blur-md border-b border-yellow-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden">
                <img 
                  src="https://i.imgur.com/mGU108B.png" 
                  alt="Gema Taruna Logo" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="hidden sm:block">
                <div className="text-yellow-400 font-bold text-sm md:text-base leading-tight">{SCHOOL_NAME}</div>
                <div className="text-yellow-100 text-xs">{SCHOOL_SUBTITLE}</div>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-gray-200 hover:text-yellow-400 transition-colors duration-300 font-medium text-sm lg:text-base"
                >
                  {link.name}
                </a>
              ))}
              <div className="flex items-center gap-4">
                <a
                  href={WA_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-blue-950 px-6 py-2.5 rounded-lg font-bold hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center gap-2"
                >
                  Undang Kami
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-yellow-400 p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-blue-950 border-t border-yellow-500/10 overflow-hidden"
            >
              <div className="px-4 pt-2 pb-6 space-y-1">
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={(e) => handleMobileLinkClick(e, link.href)}
                    className="block px-3 py-4 text-base font-medium text-gray-200 hover:text-yellow-400 hover:bg-blue-900/50 rounded-lg transition-all"
                  >
                    {link.name}
                  </a>
                ))}
                <div className="pt-4 flex flex-col gap-3">
                  <a
                    href={WA_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-blue-950 px-6 py-4 rounded-lg font-bold text-center flex items-center justify-center gap-2 shadow-xl"
                  >
                    Undang Kami
                    <ArrowRight className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section id="beranda" className="relative min-h-screen flex items-center justify-center pt-16 md:pt-20">
        <div className="absolute inset-0 z-0">
          <img
            alt="Marching Band"
            className="w-full h-full object-cover"
            src={webSettings.hero.image}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-blue-950/90 via-blue-950/75 to-blue-950/90"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white mb-6 leading-tight tracking-tight">
              {webSettings.hero.title}
              {webSettings.hero.accent && (
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500 mt-2">
                  {webSettings.hero.accent}
                </span>
              )}
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-200 mb-10 max-w-3xl mx-auto leading-relaxed opacity-90">
              {webSettings.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-gradient-to-r from-yellow-400 to-yellow-500 text-blue-950 px-10 py-5 rounded-xl font-extrabold text-lg hover:shadow-[0_0_30px_rgba(250,204,21,0.3)] hover:scale-105 transition-all duration-300"
              >
                Jadwalkan Penampilan
              </a>
              <a
                href="#galeri"
                className="w-full sm:w-auto border-2 border-white/30 text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white hover:text-blue-950 hover:border-white transition-all duration-300 backdrop-blur-sm"
              >
                Lihat Galeri
              </a>
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
          <ChevronDown className="text-white w-8 h-8" />
        </div>
      </section>

      {/* Achievement Section */}
      <section className="py-16 md:py-24 relative z-20 -mt-12 md:-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10">
            {achievements.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 text-center border border-gray-100 flex flex-col items-center"
              >
                <div className="w-20 h-20 bg-yellow-400/10 rounded-full flex items-center justify-center mb-6 text-yellow-600">
                  <item.icon size={36} />
                </div>
                <h3 className="text-2xl font-bold text-blue-950 mb-3">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed font-medium">{item.subtitle}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Services Section */}
      <section id="format" className="py-20 md:py-32 bg-blue-950 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-3xl sm:text-5xl font-bold mb-6">Format Penampilan</h2>
            <div className="w-24 h-1 bg-yellow-500 mx-auto rounded-full mb-8"></div>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto font-medium">
              Kami menyediakan berbagai format pertunjukan yang dapat disesuaikan dengan skala dan konsep acara Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {webSettings.services.map((service: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="group relative overflow-hidden rounded-3xl shadow-2xl h-[500px]"
              >
                <img
                  src={service.image || service.imageUrl}
                  alt={service.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-950 via-blue-950/40 to-transparent p-8 flex flex-col justify-end">
                  <h3 className="text-3xl font-extrabold mb-4 text-yellow-400">{service.title}</h3>
                  <p className="text-gray-100 text-lg leading-relaxed opacity-90">{service.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Personnel Section */}
      <section id="profil" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-end gap-12 mb-16">
            <div className="max-w-2xl">
              <h2 className="text-3xl sm:text-5xl font-extrabold text-blue-950 mb-6 tracking-tight">Profil Personel</h2>
              <p className="text-xl text-gray-600 font-medium">
                Dilatih dengan kedisiplinan tinggi, personel kami adalah putra-putri terbaik SMKN 2 Sragen.
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-bold text-blue-950 uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-yellow-500" />
                Angkatan
              </label>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const uniqueClean = [...new Set(personnelList.map((p: any) => getCleanAngkatanName(p.angkatan)))];
                  // Sort newest to oldest
                  uniqueClean.sort((a: any, b: any) => getAngkatanWeight(b) - getAngkatanWeight(a));
                  return ['Semua Angkatan', ...uniqueClean];
                })().map((btn) => (
                  <button
                    key={btn}
                    onClick={() => setFilterAngkatan(btn)}
                    className={`px-5 py-3 rounded-xl font-bold transition-all duration-300 text-sm border-2 ${
                      filterAngkatan === btn
                        ? 'bg-yellow-400 border-yellow-400 text-blue-950 shadow-lg'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-yellow-400'
                    }`}
                  >
                    {btn}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between text-sm font-bold text-blue-950 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-yellow-500" />
                  Section Alat
                </div>
                <div className="group relative">
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full cursor-help">Info Section</span>
                  <div className="absolute right-0 bottom-full mb-2 w-64 bg-white p-4 rounded-xl shadow-2xl border border-gray-100 hidden group-hover:block z-50 animate-in fade-in slide-in-from-bottom-1 duration-200">
                    <h5 className="font-bold text-xs mb-2 text-blue-950">Panduan Section Gema Taruna:</h5>
                    <ul className="text-[10px] space-y-1.5 text-gray-600 leading-tight">
                      <li><strong>Brass:</strong> Terompet, Bariton</li>
                      <li><strong>Percussion:</strong> Bass Drum, Snare Drum, Tenor, Simbal</li>
                      <li><strong>Pit Instrument:</strong> Belira (dan instrumen statis lainnya)</li>
                      <li><strong>Color Guard:</strong> Bendera & Visual Performance</li>
                      <li><strong>Leadership:</strong> Field Commander, Stickmaster Taruna/i</li>
                    </ul>
                  </div>
                </div>
              </label>
              <div className="flex flex-wrap gap-2">
                {['Semua Section', 'Brass', 'Percussion', 'Color Guard', 'Pit Instrument', 'Leadership'].map((btn) => (
                  <button
                    key={btn}
                    onClick={() => setFilterSection(btn)}
                    className={`px-5 py-3 rounded-xl font-bold transition-all duration-300 text-sm border-2 ${
                      filterSection === btn
                        ? 'bg-yellow-400 border-yellow-400 text-blue-950 shadow-lg'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-yellow-400'
                    }`}
                  >
                    {btn}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Personnel Grid */}
          <div className="relative min-h-[300px]">
            {pLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                <Loader2 className="animate-spin text-yellow-500" size={40} />
              </div>
            )}
            <motion.div 
              layout
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6"
            >
              {paginatedPersonnel.map((person: any, index: number) => (
                <motion.div
                  layout
                  key={person.id || person.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedPerson(person)}
                  className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-xl transition-all duration-500 hover:-translate-y-1 cursor-pointer group"
                >
                  <div className="relative mb-4 flex justify-center">
                    <ProfileAvatar
                      src={person.avatarUrl || person.avatar_url}
                      alt={person.name}
                      name={person.name}
                      className="w-24 h-24 rounded-full border-4 border-yellow-400/30 p-1 transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-blue-950/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <Star className="text-white fill-yellow-400" size={24} />
                    </div>
                  </div>
                  <h4 className="font-bold text-blue-950 text-sm mb-1">{person.name}</h4>
                  <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-tighter">{person.section}</p>
                  <p className="text-xs text-yellow-600 font-bold mb-3">{person.instrument}</p>
                  <span className="text-[10px] font-bold bg-blue-950 text-white px-3 py-1 rounded-full">{getCleanAngkatanName(person.angkatan)}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pt-8 border-t border-gray-100">
                <div className="text-sm font-medium text-gray-500">
                  Menampilkan <span className="font-extrabold text-blue-950">{startIndex + 1}</span> - <span className="font-extrabold text-blue-950">{Math.min(startIndex + ITEMS_PER_PAGE, filteredPersonnel.length)}</span> dari <span className="font-extrabold text-blue-950">{filteredPersonnel.length}</span> personel
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (currentPage > 1) {
                        setCurrentPage(currentPage - 1);
                        document.getElementById('profil')?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    disabled={currentPage === 1}
                    className={`p-2.5 rounded-xl border-2 transition-all duration-300 ${
                      currentPage === 1
                        ? 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50'
                        : 'border-gray-200 text-blue-950 hover:border-yellow-400 hover:bg-yellow-50 bg-white'
                    }`}
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => {
                            setCurrentPage(pageNum);
                            document.getElementById('profil')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className={`w-11 h-11 rounded-xl font-bold transition-all duration-300 text-sm border-2 ${
                            currentPage === pageNum
                              ? 'bg-yellow-400 border-yellow-400 text-blue-950 shadow-md'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-yellow-400 hover:bg-yellow-50/30'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => {
                      if (currentPage < totalPages) {
                        setCurrentPage(currentPage + 1);
                        document.getElementById('profil')?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    disabled={currentPage === totalPages}
                    className={`p-2.5 rounded-xl border-2 transition-all duration-300 ${
                      currentPage === totalPages
                        ? 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50'
                        : 'border-gray-200 text-blue-950 hover:border-yellow-400 hover:bg-yellow-50 bg-white'
                    }`}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="galeri" className="py-20 md:py-32 bg-blue-950 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6">Galeri Dokumentasi</h2>
            <div className="w-24 h-1 bg-yellow-500 mx-auto rounded-full"></div>
            <p className="mt-6 text-gray-400">Geser untuk melihat lebih banyak momen kami</p>
          </div>

          <div className="relative group/gallery">
            {gLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-blue-950/50">
                <Loader2 className="animate-spin text-yellow-400" size={40} />
              </div>
            )}
            
            {/* Navigation Arrows */}
            <div className="absolute top-1/2 -translate-y-1/2 -left-4 md:-left-8 z-20 opacity-100 md:opacity-0 group-hover/gallery:opacity-100 transition-opacity">
              <button 
                onClick={() => {
                  const el = document.getElementById('gallery-container');
                  if (el && galleryList.length > 0) {
                    const N = galleryList.length;
                    const children = Array.from(el.children) as HTMLElement[];
                    const targetIndex = activeDotIndex + N - 1;
                    if (children[targetIndex]) {
                      el.scrollTo({
                        left: children[targetIndex].offsetLeft - el.offsetLeft,
                        behavior: 'smooth'
                      });
                    }
                  }
                }}
                className="w-12 h-12 md:w-16 md:h-16 bg-yellow-400 text-blue-950 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
                aria-label="Previous slide"
              >
                <ChevronLeft size={32} />
              </button>
            </div>
            
            <div className="absolute top-1/2 -translate-y-1/2 -right-4 md:-right-8 z-20 opacity-100 md:opacity-0 group-hover/gallery:opacity-100 transition-opacity">
              <button 
                onClick={() => {
                  const el = document.getElementById('gallery-container');
                  if (el && galleryList.length > 0) {
                    const N = galleryList.length;
                    const children = Array.from(el.children) as HTMLElement[];
                    const targetIndex = activeDotIndex + N + 1;
                    if (children[targetIndex]) {
                      el.scrollTo({
                        left: children[targetIndex].offsetLeft - el.offsetLeft,
                        behavior: 'smooth'
                      });
                    }
                  }
                }}
                className="w-12 h-12 md:w-16 md:h-16 bg-yellow-400 text-blue-950 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
                aria-label="Next slide"
              >
                <ChevronRight size={32} />
              </button>
            </div>

            <div 
              id="gallery-container"
              onScroll={(e) => {
                const el = e.currentTarget;
                const scrollLeft = el.scrollLeft;
                const children = Array.from(el.children) as HTMLElement[];
                const N = galleryList.length;
                if (children.length === 0 || N === 0) return;

                // Track the closest child to determine current active dot index
                let closestIndex = 0;
                let minDistance = Infinity;
                children.forEach((child, i) => {
                  const distance = Math.abs(child.offsetLeft - el.offsetLeft - scrollLeft);
                  if (distance < minDistance) {
                    minDistance = distance;
                    closestIndex = i;
                  }
                });

                const originalIndex = closestIndex % N;
                setActiveDotIndex(originalIndex);

                // Seamless Loop Jump checking:
                // Set A: [0, N-1], Set B: [N, 2N-1], Set C: [2N, 3N-1]
                if (closestIndex < N) {
                  el.style.scrollBehavior = 'auto'; // Disable smooth scrolling for instant jump
                  const targetIndex = closestIndex + N;
                  if (children[targetIndex]) {
                    el.scrollLeft = children[targetIndex].offsetLeft - el.offsetLeft;
                  }
                  setTimeout(() => {
                    el.style.scrollBehavior = 'smooth';
                  }, 50);
                } else if (closestIndex >= 2 * N) {
                  el.style.scrollBehavior = 'auto';
                  const targetIndex = closestIndex - N;
                  if (children[targetIndex]) {
                    el.scrollLeft = children[targetIndex].offsetLeft - el.offsetLeft;
                  }
                  setTimeout(() => {
                    el.style.scrollBehavior = 'smooth';
                  }, 50);
                }
              }}
              className="flex gap-6 overflow-x-auto pb-12 snap-x snap-mandatory no-scrollbar scroll-smooth"
            >
              {[...galleryList, ...galleryList, ...galleryList].map((image: any, i: number) => {
                const parsed = parseMediaUrl(image.imageUrl || image.image_url);
                return (
                  <motion.div
                    key={`${image.id || i}-${i}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    onClick={() => setSelectedMedia(image)}
                    className="flex-shrink-0 w-[85vw] md:w-[600px] aspect-video relative rounded-3xl overflow-hidden snap-center group cursor-pointer shadow-xl bg-blue-900/40 border border-white/10"
                  >
                    {parsed.type === 'instagram' ? (
                      <div className="w-full h-full bg-gradient-to-tr from-purple-600 via-pink-600 to-yellow-500 flex flex-col items-center justify-center relative p-6">
                        <div className="absolute top-4 right-4 bg-black/40 text-white p-2 rounded-xl backdrop-blur-md">
                          <Instagram size={20} className="animate-pulse" />
                        </div>
                        <Instagram size={56} className="text-white drop-shadow-lg mb-3" />
                        <span className="text-white font-extrabold text-sm tracking-wide bg-black/20 px-4 py-2 rounded-full backdrop-blur-xs">Putar Video Instagram (Reel)</span>
                      </div>
                    ) : parsed.type === 'tiktok' ? (
                      <div className="w-full h-full bg-black flex flex-col items-center justify-center relative p-6 border-b-4 border-b-cyan-400">
                        <div className="absolute top-4 right-4 bg-black/40 text-white px-2 py-1 rounded-xl backdrop-blur-md flex items-center gap-1.5 text-[10px] uppercase font-mono tracking-widest text-[#00f2fe]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00f2fe] animate-pulse"></span>
                          <span>TikTok</span>
                        </div>
                        <div className="w-16 h-16 bg-gradient-to-tr from-cyan-400 via-black to-pink-500 rounded-2xl flex items-center justify-center shadow-lg mb-3">
                          <svg className="w-8 h-8 fill-white" viewBox="0 0 24 24">
                            <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.5-.7-.52-1.28-1.19-1.74-1.95-.01 2.25-.01 4.51-.01 6.77-.04 2.1-.51 4.25-1.68 6.03-1.61 2.49-4.59 3.99-7.58 3.66-3.41-.37-6.27-3.08-6.72-6.51-.55-4.14 2.12-8.19 6.21-8.91.82-.14 1.67-.16 2.5-.04V7.54c-1.13-.19-2.33-.03-3.39.46-1.97.91-3.3 2.99-3.26 5.17-.02 2.3 1.48 4.45 3.65 5.2 2.17.75 4.73.08 6.16-1.71 1.01-1.26 1.41-2.92 1.34-4.52V.02h.16z"/>
                          </svg>
                        </div>
                        <span className="text-white font-extrabold text-sm tracking-wide bg-white/10 px-4 py-2 rounded-full backdrop-blur-xs text-center">
                          {parsed.videoStaticId ? 'Putar Video TikTok' : 'Buka & Tonton di TikTok'}
                        </span>
                      </div>
                    ) : parsed.type === 'youtube' ? (
                      <div className="w-full h-full relative">
                        <img
                          src={parsed.thumbnail}
                          alt={image.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
                            <Youtube size={32} className="fill-current text-white" />
                          </div>
                        </div>
                      </div>
                    ) : parsed.type === 'video' ? (
                      <div className="w-full h-full relative bg-black flex items-center justify-center">
                        <video
                          src={parsed.url}
                          className="w-full h-full object-cover opacity-80"
                          muted
                          playsInline
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center text-blue-950 shadow-lg transition-transform duration-300 group-hover:scale-110">
                            <span className="text-2xl pl-1 text-blue-950">▶</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={parsed.url}
                        alt={image.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-8">
                      <div>
                        <h4 className="text-white text-xl font-bold mb-2">{image.title}</h4>
                        <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-blue-950">
                          <ArrowRight size={20} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            {/* Scroll Indicator */}
            <div className="flex justify-center gap-2 mt-4">
              {galleryList.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const el = document.getElementById('gallery-container');
                    if (el && galleryList.length > 0) {
                      const N = galleryList.length;
                      const children = Array.from(el.children) as HTMLElement[];
                      // Scroll to target item in Set B (index i + N)
                      const targetIndex = i + N;
                      if (children[targetIndex]) {
                        el.scrollTo({
                          left: children[targetIndex].offsetLeft - el.offsetLeft,
                          behavior: 'smooth'
                        });
                      }
                    }
                  }}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    activeDotIndex === i ? 'w-8 bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'w-2.5 bg-yellow-400/20 hover:bg-yellow-400/40'
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Media Modal */}
        <AnimatePresence>
          {selectedMedia && (() => {
            const parsed = parseMediaUrl(selectedMedia.imageUrl || selectedMedia.image_url);
            const isVertical = parsed.type === 'instagram' || parsed.type === 'tiktok';
            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xs transition-all"
              >
                <button 
                  onClick={() => setSelectedMedia(null)}
                  className="absolute top-4 right-4 md:top-6 md:right-6 text-white hover:text-yellow-400 transition-colors z-[110] bg-black/50 hover:bg-black/80 md:bg-transparent p-2.5 rounded-full"
                  aria-label="Close modal"
                >
                  <X size={28} className="md:w-10 md:h-10" />
                </button>
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className={
                    isVertical 
                      ? "relative w-full max-w-[90vw] md:max-w-[420px] h-[75vh] md:h-[80vh] max-h-[720px] rounded-3xl overflow-hidden shadow-2xl bg-black border border-white/10 flex flex-col justify-between"
                      : "relative max-w-5xl w-full aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black border border-white/10"
                  }
                >
                  {parsed.type === 'youtube' ? (
                    <iframe
                      src={parsed.embedUrl}
                      title={selectedMedia.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    ></iframe>
                  ) : parsed.type === 'instagram' ? (
                    <div className="w-full h-full flex items-center justify-center bg-black py-2">
                      <iframe
                        src={parsed.embedUrl}
                        title={selectedMedia.title}
                        className="w-full h-full border-0 rounded-2xl"
                        allowTransparency
                        scrolling="yes"
                      ></iframe>
                    </div>
                  ) : parsed.type === 'tiktok' ? (
                    parsed.embedUrl ? (
                      <div className="w-full h-full flex items-center justify-center bg-black py-2">
                        <iframe
                          src={parsed.embedUrl}
                          title={selectedMedia.title}
                          className="w-full h-full border-0 rounded-2xl shadow-xl"
                          allowFullScreen
                        ></iframe>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-4 text-center">
                        <div className="w-full max-w-xs bg-zinc-900 border border-zinc-800 p-6 md:p-8 rounded-3xl shadow-2xl mx-auto">
                          <div className="w-16 h-16 bg-gradient-to-tr from-[#00f2fe] via-black to-[#fe0979] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
                            <svg className="w-8 h-8 fill-white" viewBox="0 0 24 24">
                              <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.5-.7-.52-1.28-1.19-1.74-1.95-.01 2.25-.01 4.51-.01 6.77-.04 2.1-.51 4.25-1.68 6.03-1.61 2.49-4.59 3.99-7.58 3.66-3.41-.37-6.27-3.08-6.72-6.51-.55-4.14 2.12-8.19 6.21-8.91.82-.14 1.67-.16 2.5-.04V7.54c-1.13-.19-2.33-.03-3.39.46-1.97.91-3.3 2.99-3.26 5.17-.02 2.3 1.48 4.45 3.65 5.2 2.17.75 4.73.08 6.16-1.71 1.01-1.26 1.41-2.92 1.34-4.52V.02h.16z"/>
                            </svg>
                          </div>
                          <h3 className="text-white text-base md:text-lg font-black mb-2">{selectedMedia.title || 'Video TikTok'}</h3>
                          <p className="text-zinc-400 text-xs mb-5 leading-normal">
                            Tautan ini menggunakan format pendek ponsel (shortlink). Silakan klik untuk membuka & memutar secara utuh di aplikasi TikTok.
                          </p>
                          <a
                            href={parsed.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-[#fe0979] hover:bg-[#ff1e87] text-white text-xs font-black px-6 py-2.5 rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-pink-500/30"
                          >
                            Buka di TikTok ↗
                          </a>
                        </div>
                      </div>
                    )
                  ) : parsed.type === 'video' ? (
                    <video
                      src={parsed.url}
                      className="w-full h-full object-contain"
                      controls
                      autoPlay
                      playsInline
                    ></video>
                  ) : (
                    <img 
                      src={parsed.url} 
                      alt={selectedMedia.title} 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none z-10">
                    <h3 className="text-white text-sm md:text-lg font-black tracking-medium truncate">{selectedMedia.title}</h3>
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
        {/* Person Modal */}
        <AnimatePresence>
          {selectedPerson && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-md"
              onClick={() => setSelectedPerson(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl relative"
                onClick={e => e.stopPropagation()}
              >
                <button 
                  onClick={() => setSelectedPerson(null)}
                  className="absolute top-6 right-6 text-gray-400 hover:text-blue-950 transition-colors z-10"
                >
                  <X size={24} />
                </button>
                
                <div className="h-32 bg-gradient-to-r from-blue-950 to-blue-900 relative">
                  <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
                    <div className="relative">
                      <ProfileAvatar 
                        src={selectedPerson.avatarUrl || selectedPerson.avatar_url} 
                        alt={selectedPerson.name} 
                        name={selectedPerson.name}
                        className="w-32 h-32 rounded-3xl border-4 border-white shadow-xl bg-white"
                      />
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg border-4 border-white">
                        <Award size={20} className="text-blue-950" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-20 pb-10 px-8 text-center">
                  <h3 className="text-2xl font-black text-blue-950 mb-1">{selectedPerson.name}</h3>
                  <p className="text-yellow-600 font-bold uppercase tracking-widest text-xs mb-6">Angkatan {selectedPerson.angkatan}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Section</p>
                      <p className="text-blue-950 font-black">{selectedPerson.section}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Instrument</p>
                      <p className="text-blue-950 font-black">{selectedPerson.instrument}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-gray-400 text-sm font-medium">
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                    Personel Gema Taruna
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Pricing Section */}
      <section id="paket" className="py-20 md:py-32 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-blue-950 mb-6">Paket Fee Penampilan</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto font-medium">Bantu kami menunjang operasional tim dengan memilih paket yang sesuai kebutuhan Anda.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl mx-auto">
            {pricingPackages.map((pkg, index) => (
              <div
                key={index}
                className={`relative rounded-3xl shadow-2xl p-8 md:p-12 transition-all duration-500 hover:-translate-y-2 border-2 ${
                  pkg.popular 
                    ? 'bg-blue-950 text-white border-yellow-400 ring-8 ring-yellow-400/5' 
                    : 'bg-white text-gray-800 border-gray-100'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-400 text-blue-950 px-8 py-2 rounded-full font-black text-sm uppercase tracking-widest shadow-xl">
                    Terpopuler
                  </div>
                )}
                <h3 className={`text-3xl md:text-4xl font-black mb-4 ${pkg.popular ? 'text-yellow-400' : 'text-blue-950'}`}>
                  {pkg.name}
                </h3>
                <p className={`mb-8 text-lg font-medium opacity-80 ${pkg.popular ? 'text-gray-200' : 'text-gray-600'}`}>{pkg.description}</p>
                <div className="mb-10 flex items-baseline gap-2">
                  <span className={`text-5xl font-black ${pkg.popular ? 'text-white' : 'text-blue-950'}`}>{pkg.price}</span>
                </div>
                <ul className="space-y-5 mb-12">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <CheckCircle2 className={`w-6 h-6 flex-shrink-0 mt-0.5 ${pkg.popular ? 'text-yellow-400' : 'text-yellow-500'}`} />
                      <span className="text-lg font-medium opacity-90">{feature}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={`${WA_LINK}?text=Halo, saya tertarik dengan ${pkg.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block text-center py-5 rounded-2xl font-black text-xl transition-all duration-300 ${
                    pkg.popular
                      ? 'bg-yellow-400 text-blue-950 hover:bg-yellow-300'
                      : 'bg-blue-950 text-white hover:bg-blue-900'
                  }`}
                >
                  Pesan Sekarang
                </a>
              </div>
            ))}
          </div>

          {/* Logistics & Conditions Highlights */}
          <div className="mt-16 bg-yellow-50/70 border border-yellow-200 rounded-3xl p-8 md:p-10 max-w-5xl mx-auto shadow-sm">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-12 h-12 bg-yellow-400/20 rounded-2xl flex items-center justify-center shrink-0 text-yellow-700">
                <AlertCircle size={28} />
              </div>
              <div className="space-y-3">
                <h4 className="text-xl font-bold text-blue-950">Syarat & Ketentuan Logistik Penampilan</h4>
                <p className="text-gray-700 font-medium leading-relaxed">
                  Gema Taruna berkomitmen menyuguhkan penampilan yang profesional dan megah demi kesuksesan agenda Anda. Untuk menunjang mobilitas dan stamina optimal taruna-taruni kami di lapangan, harap diperhatikan persetujuan logistik berikut:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="flex gap-3 items-start bg-white p-4 rounded-xl shadow-xs border border-gray-100">
                    <span className="text-lg">🚚</span>
                    <div>
                      <p className="font-bold text-blue-950 text-sm">Akomodasi & Transportasi Tim</p>
                      <p className="text-gray-500 text-xs text-left">Pihak panitia penyelenggara memfasilitasi/menyediakan armada pengangkutan aman bagi seluruh personel beserta instrumen marching band yang besar menuju lokasi acara.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start bg-white p-4 rounded-xl shadow-xs border border-gray-100">
                    <span className="text-lg">🍱</span>
                    <div>
                      <p className="font-bold text-blue-950 text-sm">Konsumsi Personel & Kru</p>
                      <p className="text-gray-500 text-xs text-left">Penyediaan makanan berat bergizi serta air mineral yang memadai bagi seluruh taruna-taruni yang tampil beserta jajaran pelatih dan tim pendamping.</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 italic pt-2 text-left">
                  *Untuk konsultasi durasi parade, jumlah kru tambahan, detail rute kirab atau perjalanan luar Sragen, silakan diskusikan lebih lanjut secara responsif melalui WhatsApp Admin kami.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-blue-950 mb-6">Apa Kata Klien Kami?</h2>
            <div className="w-24 h-1 bg-yellow-500 mx-auto rounded-full mb-6"></div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto font-medium">
              Feedback tulus dari mitra, sekolah, dan dinas resmi yang telah menyelenggarakan kolaborasi sukses bersama tim Gema Taruna.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {webSettings.testimonials.map((testi: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white p-8 md:p-10 rounded-[2rem] shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 flex flex-col justify-between"
              >
                <div>
                  <div className="text-yellow-400 text-5xl font-serif mb-2">“</div>
                  <p className="text-gray-700 italic text-base md:text-lg leading-relaxed mb-6">
                    {testi.text}
                  </p>
                </div>
                <div className="flex items-center gap-4 pt-4 border-t border-gray-100 mt-auto">
                  <img
                    src={testi.avatar || testi.avatarUrl}
                    alt={testi.name}
                    className="w-14 h-14 rounded-full border-2 border-yellow-400 shrink-0 object-cover bg-gray-50"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="font-extrabold text-blue-950 text-lg leading-snug">{testi.name}</h4>
                    <p className="text-yellow-600 font-bold text-sm">{testi.position}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 md:py-28 bg-blue-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-950/50"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400 rounded-full blur-[150px] opacity-10"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-6 animate-pulse">Pertanyaan Umum (FAQ)</h2>
            <div className="w-24 h-1 bg-yellow-500 mx-auto rounded-full mb-6"></div>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto font-medium">
              Informasi lengkap dan jawaban praktis atas berbagai pertanyaan umum yang sering ditanyakan mengenai Gema Taruna.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mt-10">
            {/* Column 1 (Even Indexes) */}
            <div className="space-y-4">
              {webSettings.faqs.map((faq: any, i: number) => {
                if (i % 2 !== 0) return null;
                return (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:border-yellow-400/40">
                    <button
                      onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                      className="w-full flex justify-between items-center text-left group"
                    >
                      <span className="font-bold text-base md:text-lg text-gray-100 group-hover:text-yellow-400 transition-colors">
                        {faq.question}
                      </span>
                      <ChevronDown className={`transition-transform duration-300 flex-shrink-0 ml-2 ${activeFaq === i ? 'rotate-180 text-yellow-400' : 'text-gray-400'}`} />
                    </button>
                    <AnimatePresence>
                      {activeFaq === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <p className="pt-4 text-gray-300 text-sm md:text-base leading-relaxed">
                            {faq.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Column 2 (Odd Indexes) */}
            <div className="space-y-4">
              {webSettings.faqs.map((faq: any, i: number) => {
                if (i % 2 === 0) return null;
                return (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:border-yellow-400/40">
                    <button
                      onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                      className="w-full flex justify-between items-center text-left group"
                    >
                      <span className="font-bold text-base md:text-lg text-gray-100 group-hover:text-yellow-400 transition-colors">
                        {faq.question}
                      </span>
                      <ChevronDown className={`transition-transform duration-300 flex-shrink-0 ml-2 ${activeFaq === i ? 'rotate-180 text-yellow-400' : 'text-gray-400'}`} />
                    </button>
                    <AnimatePresence>
                      {activeFaq === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <p className="pt-4 text-gray-300 text-sm md:text-base leading-relaxed">
                            {faq.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-950 text-white pt-20 pb-10 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[50%] h-full bg-yellow-400/5 -skew-x-12 translate-x-1/2"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 mb-20">
            <div className="space-y-8">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden bg-white/5 p-2">
                  <img 
                    src="https://i.imgur.com/mGU108B.png" 
                    alt="Logo Footer" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h3 className="text-yellow-400 font-extrabold text-2xl tracking-tighter leading-none">{SCHOOL_NAME}</h3>
                  <p className="text-gray-400 text-sm mt-1 uppercase tracking-widest">{SCHOOL_SUBTITLE}</p>
                </div>
              </div>
              <p className="text-gray-300 text-lg leading-relaxed">
                Menjadi unit marching band sekolah yang bermartabat, berprestasi, dan profesional dalam setiap penampilan.
              </p>
              <div className="flex gap-4">
                {[
                  { icon: Instagram, href: "https://www.instagram.com/marchingbandtwosra_/" },
                  { icon: Youtube, href: "https://www.youtube.com/@SMKNegeri2SragenOfficial/" },
                  { 
                    isCustom: true, 
                    href: "https://www.tiktok.com/@gematarunatwosra",
                    icon: () => (
                      <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                      </svg>
                    )
                  }
                ].map((social, i) => (
                  <a
                    key={i}
                    href={social.href}
                    target="_blank"
                    className="w-14 h-14 bg-white/10 hover:bg-yellow-400 rounded-2xl flex items-center justify-center transition-all duration-300 hover:-translate-y-1 hover:text-blue-950 text-white group"
                  >
                    {typeof social.icon === 'function' ? <social.icon /> : <social.icon className="w-6 h-6" />}
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <h4 className="text-2xl font-bold border-l-4 border-yellow-400 pl-4">Kontak Kami</h4>
              <ul className="space-y-6">
                {[
                  { icon: MapPin, text: SCHOOL_ADDRESS },
                  { icon: Phone, text: SCHOOL_PHONE },
                  { icon: Mail, text: SCHOOL_EMAIL }
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <item.icon className="w-6 h-6 text-yellow-400 flex-shrink-0" />
                    <span className="text-gray-300 text-lg font-medium">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-8">
              <h4 className="text-2xl font-bold border-l-4 border-yellow-400 pl-4">Lokasi</h4>
              <div className="rounded-3xl overflow-hidden shadow-2xl h-[280px] border-4 border-white/10 grayscale hover:grayscale-0 transition-all duration-500">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3956.355325190178!2d111.00848479999999!3d-7.4258723999999985!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e7a035b73d20c21%3A0xf504ba3c6900675c!2sSMK%20Negeri%202%20Sragen!5e0!3m2!1sid!2sid!4v1779165949939!5m2!1sid!2sid"
                  width="100%"
                  height="100%"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Lokasi SMKN 2 Sragen"
                  style={{ border: 0 }}
                ></iframe>
              </div>
            </div>
          </div>

          <div className="mb-20">
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col md:flex-row items-center justify-between gap-8 bg-gradient-to-r from-green-500 to-green-600 p-8 md:p-10 rounded-[2.5rem] shadow-2xl transition-all duration-500 hover:scale-[1.02]"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white">
                  <MessageCircle className="w-8 h-8" />
                </div>
                <div className="text-center md:text-left">
                  <h4 className="text-2xl md:text-3xl font-black text-white">Butuh informasi lebih lanjut?</h4>
                  <p className="text-green-50 opacity-90 text-lg font-medium mt-1">Chat langsung dengan admin kami via WhatsApp</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white text-green-600 px-10 py-5 rounded-2xl font-black text-xl shadow-xl group-hover:bg-green-50 transition-colors">
                Kirim Pesan
                <ArrowRight className="w-6 h-6" />
              </div>
            </a>
          </div>

          <div className="text-center pt-10 border-t border-white/10 flex flex-col items-center">
            <p className="text-gray-400 font-medium">
              &copy; {new Date().getFullYear()} {SCHOOL_NAME} SMK Negeri 2 Sragen. All rights reserved.
            </p>
            <button 
              onClick={user?.email && isEmailAdmin(user.email) ? () => setIsAdminMode(true) : handleOpenLogin}
              className="mt-6 flex items-center gap-2 text-gray-700 hover:text-yellow-500/50 text-[10px] font-bold transition-all opacity-20 hover:opacity-100"
            >
              <ShieldCheck size={10} /> Admin Access
            </button>
          </div>
        </div>

        {/* Admin Login Modal */}
        <AnimatePresence>
          {showLoginModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-md"
              onClick={() => setShowLoginModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl relative p-8"
                onClick={e => e.stopPropagation()}
              >
                <button 
                  onClick={() => setShowLoginModal(false)}
                  className="absolute top-6 right-6 text-gray-400 hover:text-blue-950 transition-colors z-10"
                >
                  <X size={24} />
                </button>

                <h3 className="text-2xl font-black text-blue-950 mb-2">Masuk Administrator</h3>
                <p className="text-gray-500 text-xs mb-6">
                  Silakan masuk dengan email dan password administrator Anda.
                </p>

                {/* Status Badge */}
                {!isSupabaseConfigured && (
                  <div className="mb-6 p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-xs flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <strong>Mode Demo Offline Terdeteksi:</strong> Supabase belum dikonfigurasi. Anda dapat masuk dengan email di bawah dan sandi acak apapun untuk mencoba CMS.
                    </div>
                  </div>
                )}

                {loginError && (
                  <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-100">
                    {loginError}
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder="Contoh: admin@gemataruna.com"
                      className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-yellow-400 text-blue-950 text-sm font-medium"
                      disabled={loginLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder={isSupabaseConfigured ? "Kata sandi Anda" : "Masukkan sandi acak (Modus Demo)"}
                      className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-yellow-400 text-blue-950 text-sm font-medium"
                      disabled={loginLoading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-4 mt-2 bg-blue-950 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-900 active:scale-95 transition-all shadow-md disabled:opacity-50"
                  >
                    {loginLoading ? (
                      <Loader2 className="animate-spin shrink-0" size={20} />
                    ) : (
                      "Masuk sebagai Admin"
                    )}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </footer>
    </div>
  );
}
