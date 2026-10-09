'use client';
import './studio.css';

import { useEffect, Suspense, useState, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import { ArrowLeft, Save, Copy, Check, PenLine, Loader2, X, Download, Wrench, MonitorSmartphone, Hash, ListOrdered, Eraser, Type, Settings, AlertTriangle, Maximize2, Minimize2, BookOpen, Sparkles } from 'lucide-react';
import RemoteEditorTools from '@/components/editor/RemoteEditorTools';
import GaleriDugmeleri from '@/components/editor/GaleriDugmeleri';
import KisayolPanosu, { KisayolSecici } from '@/components/editor/KisayolPanosu';
import EkranDuzeni, { EkranSecici } from '@/components/editor/EkranDuzeni';
import ModelSettingsModal from '@/components/editor/ModelSettingsModal';
import type { SettingsSectionId } from '@/components/editor/SettingsHome';
import { remotePrefs, sistemCubuklariniGizle } from '@/lib/remoteTools';
import { useRemotePrefs } from '@/lib/useRemotePrefs';
import { useBaglantiDurumu } from '@/lib/baglantiDurumu';
import type { RemoteMode } from '@/lib/remoteTools';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { initDriveAutoSync } from '@/lib/driveSync';
import { readEnabledMacros } from '@/lib/aiMacro';
import type { AiMacro } from '@/lib/aiMacro';
import { readEnabledTools, aracMetniniUygula, siraliAd, iceriktenBaslik } from '@/lib/tools';
import type { AppTool } from '@/lib/tools';
import { aracSekmesiniKaydet, bolumAcik, sonAracSekmesi } from '@/lib/uiPrefs';
import { dinle } from '@/lib/degisim';
import { splitIntoChunks } from '@/lib/aiChunks';
import { readActiveProvider, readProviderKey, readProviderModel, readCustomUrl, providerHazir } from '@/lib/aiProvider';
import { runCustomProviderDirect, CustomProviderError } from '@/lib/customProvider';
import { runLocalInference, isOfflineFallbackEnabled } from '@/lib/localLlm';
import { Capacitor } from '@capacitor/core';
import { imleciGorunurTut } from '@/lib/imlecGorunur';
import { DENEME_AGACLARI, ayarlaraDonOku, denemeTuru } from '@/lib/denemeAgaci';

/**
 * Yerel taslak: uygulama kapanırken veya arka plana atılırken kayıt yetişmese
 * bile kullanıcının son yazdığı metin cihazda kalır.
 */
const TASLAK_ONEK = 'nb-taslak-';

function taslakYaz(nodeId: string, title: string, content: string): void {
    if (typeof window === 'undefined' || !nodeId) return;
    try {
        localStorage.setItem(
            TASLAK_ONEK + nodeId,
            JSON.stringify({ title, content, zaman: Date.now() })
        );
    } catch {
        // Kota dolu olabilir; taslak yazılamazsa kayıt yolu devrede.
    }
}

function taslakSil(nodeId: string): void {
    if (typeof window === 'undefined' || !nodeId) return;
    try {
        localStorage.removeItem(TASLAK_ONEK + nodeId);
    } catch {
        // yoksay
    }
}

function taslakOku(nodeId: string): { title: string; content: string } | null {
    if (typeof window === 'undefined' || !nodeId) return null;
    try {
        const raw = localStorage.getItem(TASLAK_ONEK + nodeId);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { title?: unknown; content?: unknown };
        if (typeof parsed.title !== 'string' || typeof parsed.content !== 'string') return null;
        return { title: parsed.title, content: parsed.content };
    } catch {
        return null;
    }
}

function EditorPageInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    // Deneme modu (/editor?deneme=baglanti): ayarlardan açılan, hiçbir bahçeye yazılmayan bellek içi not.
    const deneme = denemeTuru(searchParams.get('deneme'));
    const gardenId = deneme ? '' : searchParams.get('id') || '';
    const nodeId = deneme ? 'deneme-' + deneme : searchParams.get('nodeId') || '';

    const { nodes, updateNode, fetchNodes, addNode } = useStore();
    const [content, setContent] = useState('');
    const [remoteMode, setRemoteMode] = useState<RemoteMode>('write');
    const [ekranDuzeni, setEkranDuzeni] = useState<string | null>(null);
    /** Kısayol panosu bir kısayol düğmesiyle açıldıysa o düğmenin profili; null → tüm makrolar. */
    const [kisayolProfili, setKisayolProfili] = useState<string | null>(null);
    const [remoteToolPrefs, setRemoteToolPrefs] = useState(remotePrefs);
    const [settingsOpen, setSettingsOpen] = useState(false);
    /** Ayar penceresi istenen bölümde açılabilsin: kısayol panosu doğrudan makrolara gider. */
    const [settingsBolumu, setSettingsBolumu] = useState<SettingsSectionId | 'home'>('home');
    const [focusMode, setFocusMode] = useState(false);
    const [toolTab, setToolTab] = useState<'tools' | 'computer' | 'ai'>('tools');
    useEffect(() => { setToolTab(sonAracSekmesi()); }, []);
    /** Ayar penceresi kapanınca odak bu düğmeye döner. */
    const ayarDugmesiRef = useRef<HTMLButtonElement>(null);
    const [title, setTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [showCopied, setShowCopied] = useState(false);
    const [isSpellChecking, setIsSpellChecking] = useState(false);
    const [pendingSpellCheck, setPendingSpellCheck] = useState<{
        original: string;
        corrected: string;
        /** Başlık aracı: Onayla derse geçer, Geri Al derse eski başlığa döner. */
        orijinalBaslik?: string;
        yeniBaslik?: string;
    } | null>(null);
    const [macros, setMacros] = useState<AiMacro[]>([]);
    const [araclar, setAraclar] = useState<AppTool[]>([]);
    /** Ayarlardan kapatılan bölümler editörde hiç görünmez. */
    const [yapayZekaAcik, setYapayZekaAcik] = useState(false);
    const [araclarAcik, setAraclarAcik] = useState(false);
    const [bilgisayarAcik, setBilgisayarAcik] = useState(false);
    const [activeMacroId, setActiveMacroId] = useState<string | null>(null);
    const [runningLength, setRunningLength] = useState(0);
    /** Etkin sağlayıcı için anahtar tanımlı mı? Tanımlı değilse istek gönderilmez. */
    const [anahtarVar, setAnahtarVar] = useState(false);
    const [chunkProgress, setChunkProgress] = useState<{ done: number; total: number } | null>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [autoSave, setAutoSave] = useState(true);
    const [, setLastSaved] = useState<Date | null>(null);
    const [loadedNodeKey, setLoadedNodeKey] = useState<string | null>(null);
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        onConfirm?: () => void;
        baslik?: string;
        aciklama?: string;
        onayMetni?: string;
    }>({ isOpen: false });
    /** Yazma başarısız olduğunda kullanıcıya gösterilir; sessiz kayıp olmaz. */
    const [kayitHatasi, setKayitHatasi] = useState<string | null>(null);
    /** AI isteği sürerken belge değiştiyse sonuç doğrudan uygulanmaz. */
    const [aiCakisma, setAiCakisma] = useState<{ corrected: string } | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const footerRef = useRef<HTMLElement>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const loadingNodeKeyRef = useRef<string | null>(null);
    /** İçeriği hangi not için yüklediğimizi tutar; kaydetme sonrası ezmeyi önler. */
    const loadedContentNodeRef = useRef<string | null>(null);
    /** Belge revizyonu: her metin/başlık değişiminde artar. */
    const revizyonRef = useRef(0);
    /** Ekran kapanırken senkron okunabilen güncel değerler. */
    const canliRef = useRef({
        nodeId: '',
        title: '',
        content: '',
        hasChanges: false,
        taslakYazilabilir: false
    });
    const saveRef = useRef<() => Promise<boolean>>(async () => true);

    const sanalDugum = useMemo(() => deneme ? { id: 'deneme-' + deneme, content: DENEME_AGACLARI[deneme].baslik + '\n' + DENEME_AGACLARI[deneme].metin } : null, [deneme]);
    const currentNode = sanalDugum ?? nodes.find(n => n.id === nodeId);
    const resultPending = pendingSpellCheck !== null || aiCakisma !== null;
    const visibleToolTabs = [
        { id: 'tools' as const, label: 'Yerel araçlar', Icon: Wrench, visible: araclarAcik, disabled: resultPending },
        { id: 'computer' as const, label: 'Bilgisayar araçları', Icon: MonitorSmartphone, visible: bilgisayarAcik, disabled: resultPending },
        { id: 'ai' as const, label: 'Yapay zekâ', Icon: Sparkles, visible: yapayZekaAcik || resultPending, disabled: false }
    ].filter(tab => tab.visible);
    /**
     * Bilgisayar araçları sekmesinin simgesi bağlantıyı gösterir: bağlıysa
     * yeşil, değilse kırmızı. Sekmeye basılı tutmak bağlantı ayarlarını açar.
     */
    const uzakTercihler = useRemotePrefs();
    const sekmeBaglanti = useBaglantiDurumu(uzakTercihler, { aralikMs: 30000, etkin: bilgisayarAcik });
    const baglantiRengi = sekmeBaglanti.durum?.tur === 'ok' ? 'text-moss-600' : sekmeBaglanti.durum && sekmeBaglanti.durum.tur !== 'bakiliyor' ? 'text-berry-600' : '';
    const sekmeBasili = useRef<{ zaman: ReturnType<typeof setTimeout> | null; uzun: boolean }>({ zaman: null, uzun: false });
    // Deneme ağacından geri dönüldüğünde ayarlar, deneme ağacına geçilen sayfada yeniden açılır.
    useEffect(() => {
        if (deneme) return;
        const bolum = ayarlaraDonOku();
        if (bolum) { setSettingsBolumu(bolum as SettingsSectionId | 'home'); setSettingsOpen(true); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const baglantiAyarlariniAc = () => { setSettingsBolumu('remote'); setSettingsOpen(true); };
    const activeToolTab = resultPending ? 'ai' : visibleToolTabs.some(tab => tab.id === toolTab) ? toolTab : visibleToolTabs[0]?.id;

    // Uzun notlarda ve ekran döndürüldüğünde tek kaydırma yüzeyi korunur.
    useEffect(() => {
        const field = textareaRef.current;
        if (!field) return;
        const resize = () => {
            // 'auto' anlık olarak alanı küçültür; belge kısalınca tarayıcı
            // kaydırmayı kırpar ve sayfa zıplar. Konum geri yüklenir.
            const kaydirma = window.scrollY;
            field.style.height = 'auto';
            field.style.height = `${field.scrollHeight}px`;
            if (window.scrollY !== kaydirma) window.scrollTo({ top: kaydirma });
            // Uzun metinde imleç klavyenin / alt çubuğun altında kalmasın.
            imleciGorunurTut(field, footerRef.current);
        };
        resize();
        window.addEventListener('resize', resize);
        // Klavye açılıp kapanınca görünür alan değişir (window resize gelmeyebilir).
        window.visualViewport?.addEventListener('resize', resize);
        return () => {
            window.removeEventListener('resize', resize);
            window.visualViewport?.removeEventListener('resize', resize);
        };
    }, [content, remoteMode, focusMode]);

    // Tam ekran: Android sistem çubukları gizlenir, geri tuşu ve Esc tam ekrandan çıkar.
    useEffect(() => {
        if (!focusMode) return;
        let iptal = false;
        let geriTemizle: (() => void) | null = null;
        void sistemCubuklariniGizle(true);
        if (!Capacitor.isNativePlatform() && document.fullscreenEnabled && !document.fullscreenElement) {
            void document.documentElement.requestFullscreen().catch(() => {});
        }
        const tus = (olay: KeyboardEvent) => { if (olay.key === 'Escape') setFocusMode(false); };
        const tarayiciCikti = () => { if (!document.fullscreenElement) setFocusMode(false); };
        window.addEventListener('keydown', tus);
        document.addEventListener('fullscreenchange', tarayiciCikti);
        (async () => {
            try {
                const { App } = await import('@capacitor/app');
                const dinleyici = await App.addListener('backButton', () => setFocusMode(false));
                if (iptal) void dinleyici.remove(); else geriTemizle = () => { void dinleyici.remove(); };
            } catch { /* tarayıcıda geri tuşu yok */ }
        })();
        return () => {
            iptal = true;
            geriTemizle?.();
            window.removeEventListener('keydown', tus);
            document.removeEventListener('fullscreenchange', tarayiciCikti);
            void sistemCubuklariniGizle(false);
            if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        };
    }, [focusMode]);


    // Editör sayfası Sidebar içermez; otomatik Drive yedeklemesini burada da başlat.
    useEffect(() => {
        initDriveAutoSync(useStore);
    }, []);

    useEffect(() => {
        const nodeKey = `${gardenId}:${nodeId}`;
        if (
            !gardenId ||
            !nodeId ||
            currentNode ||
            loadedNodeKey === nodeKey ||
            loadingNodeKeyRef.current === nodeKey
        ) return;

        let active = true;
        loadingNodeKeyRef.current = nodeKey;
        void fetchNodes(gardenId).finally(() => {
            if (loadingNodeKeyRef.current === nodeKey) {
                loadingNodeKeyRef.current = null;
            }
            if (active) setLoadedNodeKey(nodeKey);
        });

        return () => {
            active = false;
        };
    }, [gardenId, nodeId, currentNode, loadedNodeKey, fetchNodes]);

    useEffect(() => {
        if (!currentNode) return;

        // İçerik yalnızca farklı bir nota geçildiğinde yüklenir. Bu kontrol
        // olmadan otomatik kaydetme sonrası mağaza güncellendiğinde bu etki
        // yeniden çalışıyor ve yazılmakta olan metni kaydedilmiş hâliyle
        // eziyordu; kullanıcı boşluk yazdığında boşluğun kaybolmasının sebebi
        // buydu.
        if (loadedContentNodeRef.current === currentNode.id) return;
        loadedContentNodeRef.current = currentNode.id;

        const lines = currentNode.content.split('\n');
        const kayitliBaslik = lines[0] || '';
        const kayitliIcerik = lines.slice(1).join('\n');

        // Cihazda kalan taslak kaydedilenden farklıysa geri yüklenir: uygulama
        // kapanırken ya da kayıt başarısız olduğunda yazı kaybolmaz.
        const taslak = taslakOku(currentNode.id);
        if (taslak && (taslak.title !== kayitliBaslik || taslak.content !== kayitliIcerik)) {
            revizyonRef.current += 1;
            setTitle(taslak.title);
            setContent(taslak.content);
            setHasChanges(true);
            return;
        }
        if (taslak) taslakSil(currentNode.id);

        setTitle(kayitliBaslik);
        // Kırpma yapılmaz: kullanıcının bıraktığı boşluklar ve satır düzeni korunur.
        setContent(kayitliIcerik);
    }, [currentNode]);

    /**
     * Notu kaydeder ve gerçekten kaydedilip kaydedilmediğini döner.
     *
     * Revizyon numarası sayesinde kayıt sürerken yazılan yeni metin "temiz"
     * sayılmaz; başarısız kayıtta ise belge kirli kalır ve taslak yazılır.
     */
    const saveContent = useCallback(async (): Promise<boolean> => {
        if (!hasChanges) return true;
        const rev = revizyonRef.current;
        const baslik = title;
        const icerik = content;
        setIsSaving(true);
        try {
            // Deneme notu hiçbir yere kaydedilmez; kayıt her zaman başarılı sayılır.
            const sonuc = await (deneme ? Promise.resolve(null) : updateNode(nodeId, `${baslik}\n${icerik}`) as Promise<unknown>);
            const hata = (sonuc as { error?: string } | null | undefined)?.error;
            if (hata) {
                setKayitHatasi(String(hata));
                taslakYaz(nodeId, baslik, icerik);
                return false;
            }
            if (revizyonRef.current === rev) {
                setHasChanges(false);
                taslakSil(nodeId);
            }
            setKayitHatasi(null);
            setLastSaved(new Date());
            return true;
        } catch (error) {
            setKayitHatasi(
                error instanceof Error ? error.message : 'Not kaydedilemedi.'
            );
            taslakYaz(nodeId, baslik, icerik);
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [title, content, nodeId, updateNode, hasChanges, deneme]);

    // Otomatik kaydetme
    useEffect(() => {
        if (autoSave && hasChanges) {
            // Önceki timeout'u temizle
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
            // 1.5 saniye sonra kaydet
            autoSaveTimeoutRef.current = setTimeout(() => {
                void saveContent();
            }, 1500);
        }

        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [autoSave, hasChanges, title, content, saveContent]);

    // Canlı değerler: sayfa kapanırken (cleanup) senkron erişim gerekir.
    useEffect(() => {
        canliRef.current = {
            nodeId,
            title,
            content,
            hasChanges,
            // Onay bekleyen AI önizlemesi kullanıcı verisi değildir; taslağa yazılmaz.
            // Deneme notu ayrıca taslak olarak da saklanmaz.
            taslakYazilabilir: pendingSpellCheck === null && aiCakisma === null && !deneme
        };
    }, [nodeId, title, content, hasChanges, pendingSpellCheck, aiCakisma, deneme]);

    useEffect(() => {
        saveRef.current = saveContent;
    }, [saveContent]);

    // Ayarlardan deneme notuna geçilirken yazılmakta olan not önce kaydedilir.
    useEffect(() => {
        const kaydet = () => { void saveRef.current(); };
        window.addEventListener('nb-editor-kaydet', kaydet);
        return () => window.removeEventListener('nb-editor-kaydet', kaydet);
    }, []);

    /**
     * Uygulama arka plana atıldığında, sekme kapatıldığında veya editörden
     * çıkıldığında bekleyen değişiklikler kaybolmaz: taslak senkron yazılır ve
     * kayıt hemen tetiklenir. Android geri tuşu bu sayede veri kaybettirmez.
     */
    useEffect(() => {
        const bekleyeniKurtar = () => {
            const canli = canliRef.current;
            if (!canli.nodeId || !canli.hasChanges || !canli.taslakYazilabilir) return;
            taslakYaz(canli.nodeId, canli.title, canli.content);
            void saveRef.current();
        };
        const gorunurluk = () => {
            if (document.visibilityState === 'hidden') bekleyeniKurtar();
        };

        document.addEventListener('visibilitychange', gorunurluk);
        window.addEventListener('pagehide', bekleyeniKurtar);
        window.addEventListener('beforeunload', bekleyeniKurtar);
        return () => {
            document.removeEventListener('visibilitychange', gorunurluk);
            window.removeEventListener('pagehide', bekleyeniKurtar);
            window.removeEventListener('beforeunload', bekleyeniKurtar);
            bekleyeniKurtar();
        };
    }, []);

    const handleSave = async () => {
        await saveContent();
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
    };

    /** Metin değişimini tek yerden işler: revizyon sayacı ve kirli durumu birlikte güncellenir. */
    const icerikDegistir = useCallback((yeni: string) => {
        revizyonRef.current += 1;
        setContent(yeni);
        setHasChanges(true);
    }, []);

    const baslikDegistir = useCallback((yeni: string) => {
        revizyonRef.current += 1;
        setTitle(yeni);
        setHasChanges(true);
    }, []);

    /** Onaylı çıkış: bekleyen kayıt tamamlanır, başarısız olsa da taslak korunur. */
    const cikisiTamamla = async () => {
        setConfirmConfig({ isOpen: false });
        await saveContent();
        router.back();
    };

    const handleClose = () => {
        if (!hasChanges) {
            router.back();
            return;
        }
        if (!autoSave) {
            // Otomatik kaydetme kapalıyken kullanıcı bilinçli karar verir.
            setConfirmConfig({
                isOpen: true,
                baslik: 'Kaydedilmemiş değişiklikler',
                aciklama: 'Çıkmadan önce son değişiklikleriniz kaydedilir.',
                onayMetni: 'Kaydet ve çık',
                onConfirm: () => { void cikisiTamamla(); }
            });
            return;
        }
        void (async () => {
            const kaydedildi = await saveContent();
            if (kaydedildi) {
                router.back();
                return;
            }
            // Kayıt başarısız: kullanıcıya bildir; son yazdıkları taslakta duruyor.
            setConfirmConfig({
                isOpen: true,
                baslik: 'Not kaydedilemedi',
                aciklama: 'Yazdıklarınız cihazda taslak olarak saklandı; notu yeniden açtığınızda geri gelecek.',
                onayMetni: 'Yine de çık',
                onConfirm: () => { setConfirmConfig({ isOpen: false }); router.back(); }
            });
        })();
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        icerikDegistir(e.target.value);
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        baslikDegistir(e.target.value);
    };

    // Ayarlarda etkin bırakılan AI makroları (imla düzeltme dahil).
    // Kapalı veya boş makrolar araç çubuğunda yer kaplamaz. Ayarlar
    // modalında yapılan değişiklikler burada anında görünür.
    useEffect(() => {
        const tazele = () => {
            setMacros(readEnabledMacros());
            setAraclar(readEnabledTools());
            // "Tüm araçlar" deneme notunda bütün bölümler açık görünür (ayarlar değişmez).
            const hepsi = deneme === 'hepsi';
            setYapayZekaAcik(hepsi || bolumAcik('yapayzeka'));
            setAraclarAcik(hepsi || bolumAcik('araclar'));
            setBilgisayarAcik(hepsi || bolumAcik('bilgisayar'));
            setRemoteToolPrefs(remotePrefs());
            // Anahtar/sağlayıcı durumu da tazelenir; ayarlarda anahtar eklenince
            // makro düğmeleri sayfa yeniden açılmadan etkinleşir.
            setAnahtarVar(providerHazir(readActiveProvider()));
        };
        tazele();

        const birak1 = dinle('makrolar', tazele);
        const birak2 = dinle('araclar', tazele);
        const birak3 = dinle('bolumler', tazele);
        const birak4 = dinle('remote-prefs', tazele);
        const birak5 = dinle('ai-tercih', tazele);

        // Sayfa arkada kalıp geri geldiğinde (uygulama değiştirmek, ekranı
        // açmak) ayarlar değişmiş olabilir; listeleri tazeleriz.
        const gorunurluk = () => {
            if (document.visibilityState === 'visible') tazele();
        };
        document.addEventListener('visibilitychange', gorunurluk);
        window.addEventListener('focus', tazele);

        return () => {
            birak1();
            birak2();
            birak3();
            birak4();
            birak5();
            document.removeEventListener('visibilitychange', gorunurluk);
            window.removeEventListener('focus', tazele);
        };
    }, [deneme, ]);
    useEffect(() => {
        if (remoteMode === 'mouse' && (!bilgisayarAcik || !remoteToolPrefs.enabledTools.mouse || (!focusMode && activeToolTab !== 'computer'))) setRemoteMode('write');
        /* Kısayol panosunda geri düğmesi yok; panoyu açan satır görünmez olursa
           (araç sekmesi değişir) nota dönülür; tam ekranda açık ekran korunur. */
        if (remoteMode === 'shortcuts' && (!bilgisayarAcik || !remoteToolPrefs.enabledTools.shortcuts || (!focusMode && activeToolTab !== 'computer'))) setRemoteMode('write');
        if (remoteMode === 'screen' && (!bilgisayarAcik || !remoteToolPrefs.enabledTools.screen || (!focusMode && activeToolTab !== 'computer'))) setRemoteMode('write');
    }, [remoteMode, bilgisayarAcik, remoteToolPrefs.enabledTools.mouse, remoteToolPrefs.enabledTools.shortcuts, remoteToolPrefs.enabledTools.screen, focusMode, activeToolTab]);

    /**
     * Yerel araçları çalıştırır.
     *
     * "İçerikten Başlık" mevcut notun başlığını içerikten üretip önerir;
     * "Sıralı Ad" yeni bir alt dal açar. Diğerleri notun metnini düzenler.
     * Değişiklik yapan her araç, tıpkı yapay zekâ sonucu gibi önce öneri
     * olarak uygulanır: kullanıcı onaylamadan kaydedilmez.
     */
    const runTool = async (tool: AppTool) => {
        if (tool.kind === 'icerikten-baslik') {
            const aday = iceriktenBaslik(content);
            if (!aday) {
                alert('İçerikte başlık olacak anlamlı bir kelime bulunamadı.');
                return;
            }
            if (aday === title.trim()) {
                alert('Önerilen başlık mevcut başlıkla aynı.');
                return;
            }

            // Başlık önce öneri olarak gösterilir; Onayla derse kaydedilir.
            setPendingSpellCheck({
                original: content,
                corrected: content,
                orijinalBaslik: title,
                yeniBaslik: aday
            });
            setTitle(aday);
            return;
        }

        if (tool.kind === 'sirali-ad') {
            if (!gardenId || !nodeId) {
                alert('Bu araç için önce bir not açık olmalı.');
                return;
            }

            const ad = siraliAd(nodeId, nodes);
            const olusan = await addNode(gardenId, ad, nodeId, { x: 0, y: 0 });
            if (!olusan) {
                alert('Yeni dal eklenemedi.');
                return;
            }
            alert(`"${ad}" adıyla yeni bir dal eklendi.`);
            return;
        }

        const yeni = aracMetniniUygula(tool.kind, content);
        if (yeni === content) {
            alert(`"${tool.title}" metinde bir değişiklik yapmadı.`);
            return;
        }

        // Onay istenmez değişiklik sayılmaz; kullanıcı Onayla derse kaydedilir.
        setPendingSpellCheck({ original: content, corrected: yeni });
        setContent(yeni);
    };

    // Makro çalıştırma
    const runMacro = async (macro: AiMacro) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const selectionStart = textarea.selectionStart;
        const selectionEnd = textarea.selectionEnd;
        const hasSelection = selectionStart !== selectionEnd;

        const textToCheck = hasSelection
            ? content.substring(selectionStart, selectionEnd)
            : content;

        if (!textToCheck.trim()) return;

        // Sağlayıcı anahtarı yoksa istek hiç gönderilmez; kullanıcı önce
        // ayarlardan sağlayıcı ve anahtar eklemelidir.
        if (!providerHazir(readActiveProvider())) {
            alert(
                'Yapay zekâ özelliği için önce bir sağlayıcı ve API anahtarı tanımlamalısınız.\n\n' +
                    'Ayarlar → Yapay zekâ bölümünden ' +
                    'sağlayıcıyı seçip kendi API anahtarınızı girin.'
            );
            return;
        }

        setIsSpellChecking(true);
        setActiveMacroId(macro.id);
        setRunningLength(textToCheck.length);

        // İstek sürerken belge değişirse sonuç körlemesine uygulanmaz.
        const istekRevizyonu = revizyonRef.current;

        // İstemcinin girdiği ayarları al
        // Etkin sağlayıcı ve yalnızca ona ait anahtar/model kullanılır
        const provider = readActiveProvider();
        const clientApiKey = readProviderKey(provider);
        const customUrl = readCustomUrl();
        const customModel = readProviderModel(provider);

        const spellcheckUrl = Capacitor.isNativePlatform()
            ? 'https://mindgarden-neon.vercel.app/api/spellcheck'
            : '/api/spellcheck';

        /** Tek bir metin parçasını sağlayıcıya gönderir. */
        const sendOnce = async (text: string): Promise<string> => {
            // Özel sunucu telefonda doğrudan cihazdan çağrılır: HTTP, yerel ağ ve
            // anahtarsız sunucular da çalışır, istek uygulama sunucusuna uğramaz.
            if (provider === 'custom' && Capacitor.isNativePlatform()) {
                try {
                    return await runCustomProviderDirect({
                        baseUrl: customUrl, apiKey: clientApiKey, model: customModel,
                        instruction: macro.instruction, text
                    });
                } catch (directError) {
                    if (directError instanceof CustomProviderError) {
                        (directError as Error & { retryable?: boolean }).retryable = directError.retryable;
                    }
                    throw directError;
                }
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 90000);

            let response: Response;
            try {
                response = await fetch(spellcheckUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal,
                    body: JSON.stringify({
                        text,
                        clientApiKey,
                        provider,
                        customUrl,
                        customModel,
                        macro: macro.instruction
                    })
                });
            } catch (fetchError: unknown) {
                const isAbort =
                    fetchError instanceof Error && fetchError.name === 'AbortError';
                const error = new Error(
                    isAbort
                        ? 'İstek zaman aşımına uğradı.'
                        : 'İstek tamamlanamadı. İnternet bağlantınızı kontrol edin.'
                );
                // Zaman aşımı ve bağlantı kopması, metni parçalayarak yeniden
                // denemeye uygun; yapılandırma hataları değil.
                (error as Error & { retryable?: boolean }).retryable = true;
                throw error;
            } finally {
                clearTimeout(timeoutId);
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => null);
                const error = new Error(errData?.error || 'API hatası');
                // Sunucu/sağlayıcı kaynaklı geçici hatalarda parçalayarak
                // yeniden denemek anlamlı; 4xx yapılandırma hatasında değil.
                (error as Error & { retryable?: boolean }).retryable =
                    response.status >= 500;
                throw error;
            }

            const data = await response.json();
            return typeof data.correctedText === 'string' ? data.correctedText : text;
        };

        const runLocal = async (text: string): Promise<string> => {
            const prompt = `${macro.instruction}\n\nİNCELENECEK METİN:\n${text}\n\nYANIT (Yalnızca işlenmiş/düzeltilmiş nihai metni ver, başka açıklama ekleme):`;
            const res = await runLocalInference(prompt);
            return typeof res.text === 'string' && res.text.trim() ? res.text.trim() : text;
        };

        try {
            let correctedText: string;

            if (provider === 'local') {
                correctedText = await runLocal(textToCheck);
            } else {
                try {
                    correctedText = await sendOnce(textToCheck);
                } catch (firstError) {
                    const isNetworkErr =
                        (typeof navigator !== 'undefined' && !navigator.onLine) ||
                        (firstError instanceof Error &&
                            /internet|bağlantı|network|load failed|failed to fetch|abort/i.test(firstError.message));

                    if (isNetworkErr && isOfflineFallbackEnabled()) {
                        try {
                            correctedText = await runLocal(textToCheck);
                        } catch (localErr) {
                            throw new Error(
                                `İnternet bağlantısı yok ve yerel yapay zekâ çalıştırılamadı:\n${localErr instanceof Error ? localErr.message : String(localErr)}`
                            );
                        }
                    } else {
                        const yenidenDenenebilir =
                            (firstError as Error & { retryable?: boolean })?.retryable === true;
                        const chunks = yenidenDenenebilir ? splitIntoChunks(textToCheck) : [];

                        if (chunks.length <= 1) throw firstError;

                        let birlesik = '';
                        for (let i = 0; i < chunks.length; i++) {
                            setChunkProgress({ done: i, total: chunks.length });
                            birlesik += (await sendOnce(chunks[i].text)).trim() + chunks[i].after;
                        }
                        setChunkProgress(null);
                        correctedText = birlesik;
                    }
                }
            }

            // Sonuç girdiyle birebir aynıysa onay ekranı açıp kullanıcıya
            // "bir şey oldu" izlenimi vermek yerine durumu açıkça söyleriz.
            if (correctedText.trim() === textToCheck.trim()) {
                alert(
                    'Yapay zekâ bu metinde değişiklik yapmadı.\n\n' +
                        'Metin zaten doğru olabilir ya da seçtiğiniz model görevi uygulamamış olabilir. ' +
                        'Farklı bir makro deneyebilir veya sağlayıcınızdan daha yetenekli bir model seçebilirsiniz.'
                );
                return;
            }

            const yeniIcerik = hasSelection
                ? content.substring(0, selectionStart) +
                  correctedText +
                  content.substring(selectionEnd)
                : correctedText;

            if (istekRevizyonu !== revizyonRef.current) {
                // Kullanıcı beklerken yazdı: önizleme yerine açık karar istenir.
                setAiCakisma({ corrected: yeniIcerik });
                return;
            }

            setPendingSpellCheck({ original: content, corrected: yeniIcerik });
            setContent(yeniIcerik);
            revizyonRef.current += 1;
        } catch (error: any) {
            console.error('AI makro hatası:', error);
            alert(error.message || `"${macro.title}" makrosu çalıştırılamadı.`);
        } finally {
            setIsSpellChecking(false);
            setActiveMacroId(null);
            setRunningLength(0);
            setChunkProgress(null);
        }
    };

    const handleAcceptSpellCheck = () => {
        revizyonRef.current += 1;
        setHasChanges(true);
        setPendingSpellCheck(null);
    };

    /** Kullanıcı, beklerken yazdıklarının üzerine yazılmasını bilerek kabul etti. */
    const aiSonucunuUygula = () => {
        if (!aiCakisma) return;
        const yeni = aiCakisma.corrected;
        setAiCakisma(null);
        const eski = content;
        revizyonRef.current += 1;
        setContent(yeni);
        setPendingSpellCheck({ original: eski, corrected: yeni });
    };

    const handleRejectSpellCheck = () => {
        if (pendingSpellCheck) {
            setContent(pendingSpellCheck.original);
            if (pendingSpellCheck.orijinalBaslik !== undefined) {
                setTitle(pendingSpellCheck.orijinalBaslik);
            }
        }
        setPendingSpellCheck(null);
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
                setShowExportMenu(false);
            }
        };
        if (showExportMenu) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showExportMenu]);

    const handleExportPDF = async () => {
        setShowExportMenu(false);
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const maxWidth = pageWidth - margin * 2;

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(title || 'Başlıksız Not', margin, 25);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(content, maxWidth);
        doc.text(lines, margin, 40);

        doc.save(`${title || 'not'}.pdf`);
    };

    const handleExportWord = async () => {
        setShowExportMenu(false);
        const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        text: title || 'Başlıksız Not',
                        heading: HeadingLevel.HEADING_1,
                    }),
                    ...content.split('\n').map(line =>
                        new Paragraph({
                            children: [new TextRun(line)],
                        })
                    ),
                ],
            }],
        });

        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title || 'not'}.docx`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className={`writing-studio min-h-screen flex flex-col ${focusMode ? 'writing-studio--focused' : ''} ${remoteMode === 'screen' ? 'writing-studio--screen' : ''}`} data-tam-ekran={focusMode ? '' : undefined}>
            {focusMode && (
                <button type="button" onClick={() => setFocusMode(false)} aria-label="Tam ekrandan çık" title="Tam ekrandan çık"
                    className="studio-fullscreen-exit fixed right-3 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-sand-200 bg-white/90 text-sand-700 shadow-lift backdrop-blur hover:bg-sand-100">
                    <Minimize2 size={19} />
                </button>
            )}
            {kayitHatasi && (
                <div
                    role="alert"
                    className="flex items-start gap-2 border-b border-berry-200 bg-berry-50 px-4 py-2 text-sm text-berry-800 sm:px-6"
                >
                    <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                    <span className="min-w-0 flex-1">
                        Not kaydedilemedi: {kayitHatasi} Yazdıklarınız cihazda taslak olarak korunuyor.
                    </span>
                    <button
                        type="button"
                        onClick={() => setKayitHatasi(null)}
                        aria-label="Kayıt uyarısını kapat"
                        className="-mr-1 rounded-lg p-1 text-berry-700 transition-colors hover:bg-berry-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berry-300"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}
            {/* Header */}
            <header className="studio-header bg-white border-b border-sand-200 pt-[env(safe-area-inset-top,0px)]">
                <div className="studio-topbar flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                            onClick={handleClose}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-sand-100"
                            title="Geri Dön"
                            aria-label="Geri dön"
                        >
                            <ArrowLeft size={20} className="text-sand-600" />
                        </button>
                        <div className="studio-tabs" role="tablist" aria-label="Araç bölümü">
                            {visibleToolTabs.map(({ id, label, Icon, disabled }) => (
                                <button key={id} id={`studio-tab-${id}`} type="button" role="tab"
                                    aria-label={id === 'computer' && sekmeBaglanti.durum ? label + (sekmeBaglanti.durum.tur === 'ok' ? ' · bağlı' : ' · bağlı değil') : label}
                                    title={id === 'computer' ? label + ' · basılı tutun: bağlantı ayarları' : label} aria-selected={activeToolTab === id}
                                    aria-controls={`studio-panel-${id}`} disabled={disabled}
                                    tabIndex={activeToolTab === id ? 0 : -1}
                                    onPointerDown={id === 'computer' ? () => {
                                        const b = sekmeBasili.current;
                                        b.uzun = false;
                                        if (b.zaman) clearTimeout(b.zaman);
                                        b.zaman = setTimeout(() => { b.uzun = true; b.zaman = null; try { navigator.vibrate?.(20); } catch { /* yok */ } baglantiAyarlariniAc(); }, 550);
                                    } : undefined}
                                    onPointerUp={id === 'computer' ? () => { const b = sekmeBasili.current; if (b.zaman) { clearTimeout(b.zaman); b.zaman = null; } } : undefined}
                                    onPointerLeave={id === 'computer' ? () => { const b = sekmeBasili.current; if (b.zaman) { clearTimeout(b.zaman); b.zaman = null; } } : undefined}
                                    onPointerCancel={id === 'computer' ? () => { const b = sekmeBasili.current; if (b.zaman) { clearTimeout(b.zaman); b.zaman = null; } } : undefined}
                                    onContextMenu={id === 'computer' ? (e => { e.preventDefault(); if (!sekmeBasili.current.uzun) baglantiAyarlariniAc(); }) : undefined}
                                    onClick={() => {
                                        // Uzun basıştan sonra gelen tıklama sekmeyi değiştirmesin.
                                        if (id === 'computer' && sekmeBasili.current.uzun) { sekmeBasili.current.uzun = false; return; }
                                        setToolTab(id); aracSekmesiniKaydet(id); setFocusMode(false);
                                    }}
                                    onKeyDown={event => {
                                        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                                        event.preventDefault();
                                        const tabs = visibleToolTabs.filter(tab => !tab.disabled);
                                        const index = tabs.findIndex(tab => tab.id === id);
                                        const next = tabs[event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]?.id;
                                        const button = document.getElementById(`studio-tab-${next}`) as HTMLButtonElement | null;
                                        if (button && !button.disabled) { button.click(); button.focus(); }
                                    }}
                                    className={`studio-tab ${activeToolTab === id ? 'studio-tab--active' : ''}`}
                                    style={id === 'computer' ? { WebkitTouchCallout: 'none', userSelect: 'none' } : undefined}>
                                    <Icon size={19} aria-hidden="true" className={id === 'computer' ? baglantiRengi : undefined} />
                                </button>
                            ))}
                        </div>
                        <div className="studio-heading min-w-0 flex-1">
                            <span className="studio-eyebrow">NOT BAHÇESİ / YAZI ATÖLYESİ</span>
                            <h1 className="text-base sm:text-lg font-semibold text-sand-800 truncate">
                                {title || 'Başlıksız Not'}
                            </h1>
                        </div>
                    </div>

                    <div className="studio-actions flex shrink-0 items-center justify-end gap-1 sm:gap-2">
                        <button ref={ayarDugmesiRef} onClick={() => { setSettingsBolumu('home'); setSettingsOpen(true); }} className="flex h-11 w-11 items-center justify-center rounded-xl text-sand-600 transition-colors duration-200 hover:bg-sand-100 hover:text-sand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40" title="Ayarlar" aria-label="Ayarları aç"><Settings size={20} /></button>
                        <button type="button" onClick={() => setFocusMode(value => !value)}
                            aria-label={focusMode ? 'Tam ekrandan çık' : 'Tam ekran'} aria-pressed={focusMode}
                            title={focusMode ? 'Tam ekrandan çık' : 'Tam ekran'}
                            className={`studio-focus flex h-11 w-11 items-center justify-center rounded-xl ${focusMode ? 'bg-moss-100 text-moss-700' : 'text-sand-600 hover:bg-sand-100'}`}>
                            {focusMode ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
                        </button>
                        {/* Kopyala */}
                        <button
                            onClick={handleCopy}
                            data-studio-copy
                            className={`flex h-11 w-11 items-center justify-center rounded-lg transition-all ${showCopied ? 'bg-moss-100 text-moss-600' : 'text-sand-600 hover:bg-sand-100 hover:text-sand-700'}`}
                            title="İçeriği Kopyala"
                            aria-label="İçeriği kopyala"
                        >
                            {showCopied ? <Check size={20} /> : <Copy size={20} />}
                        </button>

                        {/* Export */}
                        <div className="relative" ref={exportMenuRef}>
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="flex h-11 w-11 items-center justify-center rounded-lg text-sand-600 transition-colors hover:bg-sand-100 hover:text-sand-700"
                                title="Dışa Aktar"
                                aria-label="Dışa aktar"
                            >
                                <Download size={20} />
                            </button>

                            {showExportMenu && (
                                <div className="absolute right-0 top-full mt-1 bg-white border border-sand-200 rounded-xl shadow-lift py-1.5 min-w-[150px] z-50">
                                    <button type="button" onClick={() => { setFocusMode(value => !value); setShowExportMenu(false); }} className="studio-menu-focus w-full px-4 py-2.5 text-left text-sm text-sand-700 hover:bg-sand-50">{focusMode ? 'Tam ekrandan çık' : 'Tam ekran'}</button>
                                    <button
                                        onClick={handleExportPDF}
                                        className="w-full px-4 py-2.5 text-left text-sm text-sand-700 hover:bg-sand-50 transition-colors"
                                    >
                                        PDF olarak indir
                                    </button>
                                    <button
                                        onClick={handleExportWord}
                                        className="w-full px-4 py-2.5 text-left text-sm text-sand-700 hover:bg-sand-50 transition-colors"
                                    >
                                        Word olarak indir
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Ayırıcı */}
                        <div className="hidden h-6 w-px bg-sand-200 sm:block" />

                        {/* Otomatik Kaydet Toggle + Kaydet Butonu */}
                        <div className="flex flex-col items-center gap-0.5">
                            {/* Kaydet butonu */}
                            <button
                                onClick={handleSave}
                                disabled={!hasChanges || isSaving || autoSave}
                                aria-label="Notu kaydet"
                                className={`flex h-11 w-11 items-center justify-center rounded-lg transition-all ${
                                    isSaving
                                        ? 'bg-moss-100 text-moss-600'
                                        : hasChanges && !autoSave
                                            ? 'bg-moss-600 hover:bg-moss-700 text-white'
                                            : 'bg-sand-100 text-sand-600 cursor-not-allowed'
                                }`}
                                title={autoSave ? 'Otomatik kaydetme açık' : 'Kaydet'}
                            >
                                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="studio-tools" aria-label="Düzenleme araçları">
                {/* AI Toolbar — ayarlardan kapatılabilir. Onay bekleyen bir
                    sonuç varsa bölüm kapalı olsa da gösterilir, yoksa
                    kullanıcı Onayla/Geri Al düğmelerini göremezdi. */}
                {((yapayZekaAcik && !focusMode && activeToolTab === 'ai') || resultPending) && (
                <div id="studio-panel-ai" role="tabpanel" aria-labelledby="studio-tab-ai" className="studio-tool-row studio-ai flex items-center gap-2 border-t border-sand-200 px-4 py-2 sm:px-6">

                    {aiCakisma ? (
                        <div
                            className="serit-kaydirma flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5"
                            role="alert"
                            tabIndex={0}
                        >
                            <span className="flex-shrink-0 text-xs font-medium text-berry-700">
                                Siz beklerken metin değişti:
                            </span>
                            <button
                                onClick={aiSonucunuUygula}
                                aria-label="Yapay zekâ sonucunu yine de uygula"
                                className="flex min-h-[40px] flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-clay-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400"
                            >
                                <Check size={16} />
                                Yine de uygula
                            </button>
                            <button
                                onClick={() => setAiCakisma(null)}
                                aria-label="Yapay zekâ sonucunu at ve yazmaya devam et"
                                className="flex min-h-[40px] flex-shrink-0 items-center justify-center gap-2 rounded-xl border border-sand-300 bg-white px-3 text-sm font-semibold text-sand-700 transition-colors hover:bg-sand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sand-400"
                            >
                                <X size={16} />
                                Vazgeç
                            </button>
                        </div>
                    ) : pendingSpellCheck ? (
                        <div
                            className="serit-kaydirma flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5"
                            role="group"
                            aria-label="Yapay zekâ sonucu"
                            tabIndex={0}
                        >
                            <span
                                role="status"
                                className="flex-shrink-0 text-xs font-medium text-sand-600"
                            >
                                Sonuç hazır:
                            </span>
                            <button
                                onClick={handleAcceptSpellCheck}
                                aria-label="Yapay zekâ sonucunu onayla ve nota uygula"
                                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-moss-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-moss-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-400 sm:flex-none"
                            >
                                <Check size={18} />
                                Onayla
                            </button>
                            <button
                                onClick={handleRejectSpellCheck}
                                aria-label="Yapay zekâ sonucunu geri al ve notu eski haline döndür"
                                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-berry-300 bg-white px-4 text-sm font-semibold text-berry-700 transition-colors hover:bg-berry-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berry-300 sm:flex-none"
                            >
                                <X size={18} />
                                Geri Al
                            </button>
                        </div>
                    ) : (
                        <div
                            className="serit-kaydirma flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5"
                            role="group"
                            aria-label="Yapay zekâ makroları"
                            tabIndex={0}
                        >
                            {macros.map((macro) => {
                                const isRunning = isSpellChecking && activeMacroId === macro.id;
                                const isDisabled = isSpellChecking || !content.trim() || !anahtarVar;

                                return (
                                    <button
                                        key={macro.id}
                                        type="button"
                                        onClick={() => runMacro(macro)}
                                        disabled={isDisabled}
                                        title={macro.subtitle || macro.title}
                                        className={`flex flex-shrink-0 items-center gap-1.5 min-h-[44px] rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                                            isDisabled
                                                ? 'bg-sand-200 text-sand-700 cursor-not-allowed'
                                                : 'bg-clay-50 text-clay-800 hover:bg-clay-100'
                                        }`}
                                    >
                                        {isRunning ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <PenLine size={16} />
                                        )}
                                        <span className="whitespace-nowrap">
                                            {isRunning
                                                ? (chunkProgress
                                                    ? `Parça ${chunkProgress.done + 1}/${chunkProgress.total}…`
                                                    : runningLength > 4000
                                                        ? 'Uzun metin işleniyor…'
                                                        : 'Çalışıyor…')
                                                : macro.title}
                                        </span>
                                    </button>
                                );
                            })}

                            {macros.length === 0 && (
                                <span className="text-xs text-sand-600">
                                    Makro bulunamadı. Ayarlardan makro ekleyin.
                                </span>
                            )}

                            {!anahtarVar && (
                                <span className="whitespace-nowrap text-xs text-sand-600">
                                    Yapay zekâ için Ayarlar → Yapay zekâ bölümünden
                                    sağlayıcı ve API anahtarı ekleyin.
                                </span>
                            )}
                        </div>
                    )}
                </div>
                )}

                {/* Araçlar satırı: yapay zekâ gerektirmeyen yerel işler.
                    AI'nın hemen altında ince bir satır olarak durur; simgesi
                    gösterir, adı nadiren yazılır. Kapalı veya silinmiş araçlar
                    burada yer kaplamaz; bölüm ayarlardan tümüyle kapatılabilir. */}
                {!focusMode && activeToolTab === 'tools' && araclarAcik && (
                    <div id="studio-panel-tools" role="tabpanel" aria-labelledby="studio-tab-tools" className="studio-tool-row flex items-center gap-2 border-t border-sand-200 px-4 py-2 sm:px-6">

                        <div
                            className="serit-kaydirma flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-0.5"
                            role="group"
                            aria-label="Yerel araçlar"
                            tabIndex={0}
                        >
                            {araclar.map((tool) => {
                                const sonucHazir = pendingSpellCheck !== null;
                                return (
                                    <button
                                        key={tool.id}
                                        type="button"
                                        onClick={() => void runTool(tool)}
                                        disabled={sonucHazir}
                                        title={tool.subtitle || tool.title}
                                        aria-label={tool.title}
                                        className={`flex min-w-[44px] flex-shrink-0 items-center justify-center gap-1.5 min-h-[44px] rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                                            sonucHazir
                                                ? 'bg-sand-200 text-sand-700 cursor-not-allowed'
                                                : 'bg-moss-50 text-moss-800 hover:bg-moss-100'
                                        }`}
                                    >
                                        {tool.kind === 'icerikten-baslik' ? (
                                            <Type size={16} />
                                        ) : tool.kind === 'sirali-ad' ? (
                                            <Hash size={16} />
                                        ) : tool.kind === 'numaralandir' ? (
                                            <ListOrdered size={16} />
                                        ) : (
                                            <Eraser size={16} />
                                        )}
                                        <span className="hidden whitespace-nowrap sm:inline">{tool.title}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
                {bilgisayarAcik && (
                    <div id="studio-panel-computer" role="tabpanel" aria-labelledby="studio-tab-computer" style={{ display: !focusMode && activeToolTab === 'computer' ? undefined : 'none' }} className="studio-tool-row studio-computer flex items-center gap-2 border-t border-sand-200 px-4 py-2 sm:px-6">
                        {remoteMode === 'screen' && <EkranSecici duzenId={ekranDuzeni} onDuzenChange={setEkranDuzeni} onYaziyaDon={() => setRemoteMode('write')} />}
                        {remoteMode === 'shortcuts' && <KisayolSecici profilId={kisayolProfili} onProfilChange={setKisayolProfili} onYaziyaDon={() => setRemoteMode('write')} />}
                        <div className="serit-kaydirma flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-0.5" role="group" aria-label="Bilgisayar araçları" style={remoteMode === 'screen' || remoteMode === 'shortcuts' ? { display: 'none' } : undefined}>
                            <RemoteEditorTools placement="toolbar" content={content} mode={remoteMode} onModeChange={setRemoteMode} onContentChange={icerikDegistir}
                                profilId={kisayolProfili} onProfilChange={setKisayolProfili}
                                aktif={!focusMode && activeToolTab === 'computer'}
                                onBaglantiAyarlari={() => { setSettingsBolumu('remote'); setSettingsOpen(true); }} />
                        </div>
                    </div>
                )}
                </div>
            </header>

            {/* Çalışma alanı: <main> landmark'ı her modda bulunmalı. */}
            <main className="flex min-h-0 flex-1 flex-col">
            {remoteMode === 'mouse' && <RemoteEditorTools placement="surface" content={content} mode={remoteMode} onModeChange={setRemoteMode}
                onContentChange={icerikDegistir} />}

            {/* Kısayollar: makro panosu; notu değiştirmez. */}
            {remoteMode === 'shortcuts' && <KisayolPanosu profilId={kisayolProfili} onAyarlarAc={() => { setSettingsBolumu('kisayollar'); setSettingsOpen(true); }} />}

            {remoteMode === 'screen' && <EkranDuzeni onYaziyaDon={() => setRemoteMode('write')} duzenId={ekranDuzeni} onDuzenChange={setEkranDuzeni} onAyarlarAc={() => { setSettingsBolumu('kisayollar'); setSettingsOpen(true); }} />}

            {/* Editor Area */}
            {(remoteMode === 'write' || remoteMode === 'dictation') && (<div className="studio-workspace flex-1 py-4 sm:py-8">
                <div className="mx-auto w-full max-w-4xl px-3 sm:px-6">
                    <div className="studio-paper bg-white">
                        <div className="studio-paper-label"><BookOpen size={15} /><span>Düşüncelerine yer aç</span><span className="ml-auto">{focusMode ? 'Tam ekran' : 'Not defteri'}</span></div>
                        {/* Başlık */}
                        <div className="studio-title border-b border-sand-200 px-5 sm:px-12 pt-6 sm:pt-10 pb-5">
                            <input
                                type="text"
                                value={title}
                                onChange={handleTitleChange}
                                placeholder="Notuna bir başlık ver…"
                                aria-label="Not başlığı"
                                className="w-full bg-transparent text-2xl sm:text-3xl font-semibold tracking-tight text-sand-900 outline-none placeholder:text-sand-400"
                            />
                        </div>

                        {/* İçerik */}
                        <div className="px-5 sm:px-12 py-5 sm:py-7">
                            <textarea
                                ref={textareaRef}
                                value={content}
                                onChange={handleContentChange}
                                placeholder="Bir düşünce, bir fikir, bir başlangıç…"
                                aria-label="Not içeriği"
                                className="studio-text w-full resize-none overflow-hidden bg-transparent outline-none text-sand-800 text-base placeholder:text-sand-400"
                            />
                        </div>
                    </div>
                </div>
                </div>
            )}
            </main>

            {/* Footer */}
            <footer ref={footerRef} className="studio-footer bg-white border-t border-sand-200 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-2 sm:px-6">
                <div className="flex items-center justify-between gap-x-2 text-xs text-sand-600">
                    {/* Sol alt: mini galeri, kamera, telefon galerisi. Kayıt zamanı yazılmaz;
                        yalnız kayıt başarısızsa ya da otomatik kayıt kapalıyken bekleyen değişiklik varsa uyarı çıkar. */}
                    <GaleriDugmeleri notId={nodeId} editorMetni={content}
                        onBaglantiAyarlari={() => { setSettingsBolumu('remote'); setSettingsOpen(true); }}
                        uyari={kayitHatasi ? 'Kayıt başarısız · taslak korundu' : !autoSave && hasChanges ? '● Kaydedilmedi' : undefined} />
                    <div className="studio-footer-details flex shrink-0 items-center gap-2 sm:gap-6">
                        <label className="studio-autosave flex min-h-[44px] cursor-pointer items-center gap-2" title="Otomatik kaydet">
                            <input type="checkbox" checked={autoSave} onChange={e => setAutoSave(e.target.checked)} aria-label="Otomatik kaydetmeyi aç/kapat" className="h-4 w-4 accent-moss-600" />
                            <span>Otomatik<span className="hidden sm:inline"> kayıt</span></span>
                        </label>
                        <span className="studio-word-count">{content.split(/\s+/).filter(w => w.length > 0).length} kelime</span>
                        <button type="button" onClick={() => setFocusMode(true)} aria-label="Tam ekran" title="Tam ekran"
                            className="studio-footer-fullscreen -my-2 h-11 w-11 items-center justify-center rounded-lg text-sand-600 hover:bg-sand-100">
                            <Maximize2 size={18} />
                        </button>
                        <span className="hidden sm:inline">{content.length} karakter</span>
                    </div>
                </div>
            </footer>

            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.baslik || 'Kaydedilmemiş değişiklikler'}
                description={confirmConfig.aciklama || 'Kaydetmeden çıkarsan yaptığın son değişiklikler kaybolacak.'}
                confirmText={confirmConfig.onayMetni || 'Yine de çık'}
                cancelText="Düzenlemeye devam et"
                isDanger
                onCancel={() => setConfirmConfig({ isOpen: false })}
                onConfirm={() => confirmConfig.onConfirm?.()}
            />
            <ModelSettingsModal
                isOpen={settingsOpen}
                initialSection={settingsBolumu}
                onClose={() => {
                    setSettingsOpen(false);
                    // Odak, pencereyi açan düğmeye döner (WCAG 2.4.3).
                    requestAnimationFrame(() => ayarDugmesiRef.current?.focus());
                }}
            />
        </div>
    );
}

export default function EditorPage() {
  return <Suspense fallback={<div>Yükleniyor...</div>}><EditorPageInner /></Suspense>;
}
