'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
    X, Sparkles, Database, Check, RefreshCw, Key, HardDriveDownload, UploadCloud, Loader2,
    Wand2, RotateCcw, ChevronRight, ArrowLeft, Plus, Trash2, Wrench, Hash, ListOrdered,
    Eraser, Type, MonitorSmartphone, Info, ShieldCheck, Server, Cpu, Cloud, ExternalLink, Mail, Keyboard, TreePine, LayoutGrid, BookOpen, Palette,
    WifiOff, Download, Play, CheckCircle2, FolderOpen, FolderKanban, LayoutDashboard
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import AccountSettings from './AccountSettings';
import AiSettings from './AiSettings';
import UsageGuide from './UsageGuide';
import SettingsHome, { SETTINGS_SECTIONS } from './SettingsHome';
import type { SettingsSectionId } from './SettingsHome';
import { isLocalBackend } from '@/lib/supabaseClient';
import { useStore } from '@/lib/store/useStore';
import { getDriveToken, restoreBackup, mergeSync, isAutoSyncEnabled, setAutoSyncEnabled, lastSyncTime } from '@/lib/driveSync';
import { readAiMacros, saveAiMacros, createMacro, DEFAULT_MACROS, SPELLCHECK_MACRO_ID } from '@/lib/aiMacro';
import type { AiMacro } from '@/lib/aiMacro';
import { readTools, saveTools, DEFAULT_TOOLS } from '@/lib/tools';
import type { AppTool } from '@/lib/tools';
import { bolumAcik, bolumAcikliginiAyarla } from '@/lib/uiPrefs';
import type { Bolum } from '@/lib/uiPrefs';
import DataSection from './DataSection';
import RemoteSettings from './RemoteSettings';
import RemoteMacroTools from './RemoteMacroTools';
import RemoteProfileTools from './RemoteProfileTools';
import RemoteScreenTools from './RemoteScreenTools';
import RemoteToolCards from './RemoteToolCards';
import TemaSecici from '@/components/ui/TemaSecici';
import { REMOTE_TOOL_IDS, makroHazir } from '@/lib/remoteTools';
import { useRemotePrefs } from '@/lib/useRemotePrefs';
import { APP_VERSION } from '@/lib/config';
import {
    SettingsField,
    SettingsNote,
    SettingsPageHeader,
    SettingsPill,
    SettingsRow,
    SettingsSection,
    SettingsSwitch,
    settingsFieldClass
} from '@/components/ui/settings';

interface ModelSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Pencere açılırken gösterilecek bölüm; kısayol panosu 'tools' ile açılır. */
    initialSection?: SettingsSectionId | 'home';
}

export default function ModelSettingsModal({ isOpen, onClose, initialSection = 'home' }: ModelSettingsModalProps) {
    const [activeTab, setActiveTab] = useState<SettingsSectionId | 'home'>(initialSection);
    const contentRef = useRef<HTMLDivElement>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    const backRef = useRef<() => void>(() => {});
    backRef.current = () => activeTab === 'home' ? closeRef.current() : setActiveTab('home');

    const [macroList, setMacroList] = useState<AiMacro[]>([]);
    const [macroDraft, setMacroDraft] = useState<AiMacro | null>(null);
    const [toolList, setToolList] = useState<AppTool[]>([]);
    const remoteToolPrefs = useRemotePrefs();
    /** Editör bölümlerinin görünürlüğü; ayarlardan kapatılabilir. */
    const [yapayZekaAcik, setYapayZekaAcik] = useState(false);
    const [araclarAcik, setAraclarAcik] = useState(false);
    const [bilgisayarAcik, setBilgisayarAcik] = useState(false);
    const [toolsTab, setToolsTab] = useState<'local' | 'computer'>('local');
    const toolsTabRefs = useRef<(HTMLButtonElement | null)[]>([]);

    // Google Drive (kolay senkron) durumu
    const [driveBusy, setDriveBusy] = useState<'idle' | 'upload' | 'restore' | 'merge'>('idle');
    const [driveMessage, setDriveMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [autoSync, setAutoSync] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const { fetchGardens } = useStore();
    /** Pencere kökü: açılışta odak buraya taşınır. */
    const dialogRef = useRef<HTMLDivElement>(null);

    const handleDriveUpload = async () => {
        setDriveBusy('upload');
        setDriveMessage(null);
        try {
            const token = await getDriveToken(true);
            const res = await mergeSync(token);
            const syncedAt = lastSyncTime();
            setLastSync(syncedAt);
            setDriveMessage({
                type: 'ok',
                text: res.merged
                    ? 'Drive ile güvenli biçimde birleştirildi (' + res.gardens + ' bahçe, ' + res.nodes + ' not güncellendi).'
                    : 'Drive\'da yedek yoktu; bu cihazın verisi ilk kez yedeklendi.'
            });
        } catch (e) {
            setDriveMessage({ type: 'err', text: e instanceof Error ? e.message : 'Yedekleme başarısız' });
        } finally {
            setDriveBusy('idle');
        }
    };

    const handleDriveRestore = async () => {
        setDriveBusy('restore');
        setDriveMessage(null);
        try {
            const token = await getDriveToken(false);
            const res = await restoreBackup(token, (msg) => setDriveMessage({ type: 'ok', text: msg }));
            await fetchGardens();
            setDriveMessage({ type: 'ok', text: "Drive'dan geri yüklendi: " + res.gardens + ' bahçe, ' + res.nodes + ' not.' });
        } catch (e) {
            setDriveMessage({ type: 'err', text: e instanceof Error ? e.message : 'Geri yükleme başarısız' });
        } finally {
            setDriveBusy('idle');
        }
    };

    const handleDriveMerge = async () => {
        setDriveBusy('merge');
        setDriveMessage(null);
        try {
            const token = await getDriveToken(false);
            const res = await mergeSync(token);
            if (!res.merged) {
                setDriveMessage({ type: 'ok', text: 'Drive\'da yedek yok; bu cihazın verisi ilk kez yedeklendi.' });
            } else {
                setDriveMessage({ type: 'ok', text: 'Birleştirildi: ' + res.gardens + ' bahçe ve ' + res.nodes + ' not karşı taraftan geldi.' });
            }
        } catch (e) {
            setDriveMessage({ type: 'err', text: e instanceof Error ? e.message : 'Senkron başarısız' });
        } finally {
            setDriveBusy('idle');
        }
    };

    useEffect(() => {
        if (isOpen) {
            setMacroList(readAiMacros());
            setMacroDraft(null);
            setToolList(readTools());
            setYapayZekaAcik(bolumAcik('yapayzeka'));
            setAraclarAcik(bolumAcik('araclar'));
            setBilgisayarAcik(bolumAcik('bilgisayar'));
            setAutoSync(isAutoSyncEnabled());
            setLastSync(lastSyncTime());
            setActiveTab(initialSection);
            setToolsTab(initialSection === 'tools' ? 'computer' : 'local');

        }
    }, [isOpen, initialSection]);


    /**
     * Pencere açıkken klavye ve kaydırma davranışı.
     *
     * - Escape ile kapanır (masaüstünde beklenen davranış).
     * - Arka plan kaydırması kilitlenir; telefonda arkadaki sayfa kaymaz.
     * - Odak pencereye taşınır; klavye ve ekran okuyucu kullanıcıları
     *   doğrudan ayarların içinde başlar.
     */
    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                backRef.current();
                return;
            }
            // Sekme tuşu pencerenin içinde döner; arkadaki sayfaya kaçmaz.
            if (event.key !== 'Tab') return;
            const root = dialogRef.current;
            if (!root) return;
            const odaklanabilir = Array.from(root.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )).filter((el) => el.offsetParent !== null);
            if (odaklanabilir.length === 0) return;
            const ilk = odaklanabilir[0];
            const son = odaklanabilir[odaklanabilir.length - 1];
            const aktif = document.activeElement as HTMLElement | null;
            if (!aktif || aktif === root || !root.contains(aktif)) {
                event.preventDefault();
                ilk.focus();
            } else if (event.shiftKey && aktif === ilk) {
                event.preventDefault();
                son.focus();
            } else if (!event.shiftKey && aktif === son) {
                event.preventDefault();
                ilk.focus();
            }
        };
        const previousFocus = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKeyDown);
        dialogRef.current?.focus();
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
            previousFocus?.focus({ preventScroll: true });
        };
    }, [isOpen]);

    // Her bölüm kendi başından açılır; klavye odağı sabit başlıkta kalır.
    useEffect(() => {
        if (!isOpen) return;
        contentRef.current?.scrollTo({ top: 0 });
        headingRef.current?.focus({ preventScroll: true });
    }, [isOpen, activeTab]);

    // Android sistem geri tuşu: bölüm → tüm ayarlar → uygulama.
    useEffect(() => {
        if (!isOpen || !Capacitor.isNativePlatform()) return;
        let disposed = false;
        let remove: (() => Promise<void>) | undefined;
        void import('@capacitor/app').then(async ({ App }) => {
            const listener = await App.addListener('backButton', () => backRef.current());
            if (disposed) await listener.remove();
            else remove = () => listener.remove();
        });
        return () => { disposed = true; void remove?.(); };
    }, [isOpen]);


    const persistMacros = (next: AiMacro[]) => {
        setMacroList(next);
        saveAiMacros(next);
    };

    const handleSaveMacro = () => {
        if (!macroDraft) return;
        const cleaned: AiMacro = {
            ...macroDraft,
            title: macroDraft.title.trim() || 'Adsız Makro',
            subtitle: macroDraft.subtitle.trim(),
            instruction: macroDraft.instruction.trim()
        };
        persistMacros(macroList.map((item) => (item.id === cleaned.id ? cleaned : item)));
        setMacroDraft(null);
    };

    const handleDeleteMacro = () => {
        if (!macroDraft) return;
        persistMacros(macroList.filter((item) => item.id !== macroDraft.id));
        setMacroDraft(null);
    };

    const handleAddMacro = () => {
        const created = createMacro();
        persistMacros([...macroList, created]);
        setMacroDraft(created);
    };

    const handleResetMacros = () => {
        persistMacros(DEFAULT_MACROS);
        setMacroDraft(null);
    };

    /** Makroyu kapatır/açar; kapalı makro metin editöründe görünmez. */
    const handleToggleMacro = (id: string) => {
        persistMacros(
            macroList.map((item) =>
                item.id === id ? { ...item, enabled: item.enabled === false } : item
            )
        );
    };

    const enabledMacroCount = macroList.filter((item) => item.enabled !== false).length;

    /* ---------------- Yerel araçlar ---------------- */

    const persistTools = (next: AppTool[]) => {
        setToolList(next);
        saveTools(next);
    };

    const handleToggleTool = (id: string) => {
        persistTools(
            toolList.map((item) =>
                item.id === id ? { ...item, enabled: item.enabled === false } : item
            )
        );
    };

    const handleDeleteTool = (id: string) => {
        persistTools(toolList.filter((item) => item.id !== id));
    };

    /** Silinen araçları varsayılan listeden geri getirir; mevcut ayarlar korunur. */
    const handleResetTools = () => {
        const kalanlar = new Set(toolList.map((item) => item.id));
        const eksikler = DEFAULT_TOOLS.filter((item) => !kalanlar.has(item.id));
        persistTools([...toolList, ...eksikler]);
    };

    const enabledToolCount = toolList.filter((item) => item.enabled !== false).length
        + REMOTE_TOOL_IDS.filter(id => remoteToolPrefs.enabledTools[id]).length
        + (remoteToolPrefs.enabledTools.shortcuts ? remoteToolPrefs.macros.filter(makroHazir).length : 0);
    const totalToolCount = toolList.length + REMOTE_TOOL_IDS.length + remoteToolPrefs.macros.length;

    /** Editördeki bir bölümü tümüyle gösterir/gizler. */
    const handleBolumDegistir = (bolum: Bolum, acik: boolean) => {
        bolumAcikliginiAyarla(bolum, acik);
        if (bolum === 'yapayzeka') setYapayZekaAcik(acik);
        else if (bolum === 'bilgisayar') setBilgisayarAcik(acik);
        else setAraclarAcik(acik);
    };

    if (!isOpen) return null;

    const activeSection = SETTINGS_SECTIONS.find(section => section.id === activeTab);


    return (
        <div className="fixed inset-0 z-[100] bg-sand-100">
            <div
                ref={dialogRef}
                data-settings-screen
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby="ayarlar-basligi"
                className="settings-screen flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden text-sand-800 outline-none"
            >
                {/* <div>: modal içinde ikinci bir banner landmark'ı oluşmasın (axe: landmark-no-duplicate-banner). */}
                <div className="shrink-0 border-b border-sand-200 bg-white pt-[env(safe-area-inset-top,0px)]">
                    <div className="mx-auto flex min-h-[76px] w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-8">
                        <button
                            type="button"
                            onClick={() => backRef.current()}
                            aria-label={activeTab === 'home' ? 'Ayarlardan geri dön' : 'Tüm ayarlara dön'}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sand-200 bg-sand-50 text-sand-700 transition-colors hover:bg-sand-200 focus-visible:ring-2 focus-visible:ring-moss-500"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="min-w-0 flex-1">
                            <p className="mb-0.5 text-xs font-semibold uppercase tracking-[0.14em] text-moss-700">
                                {activeTab === 'home' ? 'Not Bahçesi' : 'Tercihler ve Ayarlar'}
                            </p>
                            <h2 ref={headingRef} tabIndex={-1} id="ayarlar-basligi" className="font-sans text-[17px] font-semibold leading-tight tracking-tight text-sand-900 outline-none sm:text-xl">
                                {activeSection?.title || 'Tercihler ve Ayarlar'}
                            </h2>
                        </div>
                        {activeTab === 'home' ? (
                            <TreePine size={24} className="hidden shrink-0 text-moss-700 sm:block" aria-hidden />
                        ) : (
                            <button type="button" onClick={onClose} aria-label="Ayarları kapat" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sand-600 hover:bg-sand-200 focus-visible:ring-2 focus-visible:ring-moss-500">
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1">
                    {activeTab !== 'home' && (
                        <nav aria-label="Ayar bölümleri" className="hidden w-64 shrink-0 space-y-1 overflow-y-auto border-r border-sand-200 p-4 lg:block">
                            <button type="button" onClick={() => setActiveTab('home')} className="mb-4 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-moss-800 hover:bg-moss-100">
                                <LayoutGrid size={18} /> Tüm ayarlar
                            </button>
                            {SETTINGS_SECTIONS.map(({ id, title, icon: Icon }) => (
                                <button key={id} type="button" aria-current={activeTab === id ? 'page' : undefined} onClick={() => setActiveTab(id)} className={'flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors ' + (activeTab === id ? 'bg-white font-semibold text-moss-800 shadow-soft ring-1 ring-sand-200' : 'text-sand-600 hover:bg-white/70')}>
                                    <Icon size={18} className="shrink-0" /><span>{title}</span>
                                </button>
                            ))}
                        </nav>
                    )}

                    {/* İçerik */}
                    <div
                        ref={contentRef}
                        role="region"
                        aria-labelledby="ayarlar-basligi"
                        className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-5 sm:px-8 sm:pt-8"
                    >
                        <div className={'mx-auto w-full pb-4 ' + (activeTab === 'home' ? 'max-w-4xl' : 'max-w-2xl')}>
                            {activeTab === 'home' && <SettingsHome onSelect={setActiveTab} />}
                            {activeTab === 'account' && <AccountSettings onDone={onClose} />}
                            {activeTab === 'usage' && (
                                <>
                                    <SettingsPageHeader
                                        icon={BookOpen}
                                        tone="clay"
                                        title="Kullanım kılavuzu"
                                        description="Not Bahçesi'ni adım adım keşfedin: bahçe oluşturma, editör, yapay zekâ ve yedekleme."
                                    />
                                    <UsageGuide onNavigate={setActiveTab} />
                                </>
                            )}
                            {activeTab === 'models' && <AiSettings />}

                            {activeTab === 'macros' && (
                                <>
                                    <SettingsPageHeader
                                        icon={Wand2}
                                        tone="clay"
                                        title="AI makroları"
                                        description="Metin editöründe imla düzeltmenin yanında görünen kutular. Kapalı makrolar editörde yer kaplamaz."
                                        badge={<SettingsPill tone="clay">{enabledMacroCount} / {macroList.length} etkin</SettingsPill>}
                                    />

                                    {macroDraft ? (
                                        <SettingsSection
                                            icon={Wand2}
                                            tone="clay"
                                            title={macroDraft.title || 'Adsız Makro'}
                                            description={macroDraft.subtitle || 'Alt başlık eklenmedi'}
                                            action={
                                                <button
                                                    type="button"
                                                    onClick={() => setMacroDraft(null)}
                                                    className="btn btn-secondary px-3 py-2 text-xs"
                                                >
                                                    <ArrowLeft size={15} /> Listeye dön
                                                </button>
                                            }
                                        >
                                            <div className="space-y-4">
                                                <SettingsField label="Makro adı" htmlFor="macro-title" hint="Editörde kutunun üzerinde görünen ad.">
                                                    <input
                                                        id="macro-title"
                                                        type="text"
                                                        value={macroDraft.title}
                                                        onChange={e => setMacroDraft({ ...macroDraft, title: e.target.value })}
                                                        placeholder="Örn. Toplantı notuna çevir"
                                                        className={settingsFieldClass}
                                                    />
                                                </SettingsField>

                                                <SettingsField label="Alt başlık" htmlFor="macro-subtitle" hint="Kutunun ne yaptığını kısaca anlatır.">
                                                    <input
                                                        id="macro-subtitle"
                                                        type="text"
                                                        value={macroDraft.subtitle}
                                                        onChange={e => setMacroDraft({ ...macroDraft, subtitle: e.target.value })}
                                                        placeholder="Örn. Konuşma dökümünü maddeler hâline getirir"
                                                        className={settingsFieldClass}
                                                    />
                                                </SettingsField>

                                                <SettingsField
                                                    label="Yapay zekâya gönderilecek görev"
                                                    htmlFor="macro-instruction"
                                                    hint="Butona basıldığında notun metni bu görevle birlikte seçtiğiniz sağlayıcıya gönderilir."
                                                >
                                                    <textarea
                                                        id="macro-instruction"
                                                        value={macroDraft.instruction}
                                                        onChange={e => setMacroDraft({ ...macroDraft, instruction: e.target.value })}
                                                        rows={7}
                                                        placeholder="Örn. Aşağıdaki notu toplantı tutanağı biçimine çevir ve kararları madde madde yaz."
                                                        className={settingsFieldClass + ' resize-y leading-relaxed'}
                                                    />
                                                </SettingsField>

                                                <div className="flex flex-col gap-2 border-t border-sand-100 pt-4 sm:flex-row-reverse sm:items-center sm:justify-between">
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveMacro}
                                                        disabled={!macroDraft.instruction.trim()}
                                                        className="btn btn-primary px-4 py-2.5 text-xs sm:text-sm"
                                                    >
                                                        <Check size={15} /> Makroyu kaydet
                                                    </button>
                                                    <div className="flex items-center gap-2">
                                                        {macroDraft.id !== SPELLCHECK_MACRO_ID && (
                                                            <button
                                                                type="button"
                                                                onClick={handleDeleteMacro}
                                                                className="btn btn-ghost px-3 py-2.5 text-xs text-berry-600 hover:bg-berry-50"
                                                            >
                                                                <Trash2 size={14} /> Makroyu sil
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => setMacroDraft(null)}
                                                            className="btn btn-ghost px-3 py-2.5 text-xs"
                                                        >
                                                            Vazgeç
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </SettingsSection>
                                    ) : (
                                        <SettingsSection
                                            icon={Wand2}
                                            tone="clay"
                                            title="Makro kutuları"
                                            description="Varsayılan olarak kapalıdır; açtığınızda yapay zekâ satırı ve makro kutuları editörde görünür."
                                            action={
                                                <SettingsSwitch
                                                    checked={yapayZekaAcik}
                                                    onChange={(v) => handleBolumDegistir('yapayzeka', v)}
                                                    label="Yapay zekâ bölümünü editörde göster"
                                                />
                                            }
                                        >
                                            <div className="space-y-2.5">
                                                {macroList.map((macro) => {
                                                    const isOn = macro.enabled !== false;
                                                    return (
                                                        <SettingsRow
                                                            key={macro.id}
                                                            icon={Wand2}
                                                            tone="clay"
                                                            dimmed={!isOn}
                                                            title={macro.title}
                                                            description={macro.subtitle || 'Alt başlık yok'}
                                                        >
                                                            <SettingsSwitch
                                                                checked={isOn}
                                                                onChange={() => handleToggleMacro(macro.id)}
                                                                label={macro.title + ' makrosunu ' + (isOn ? 'kapat' : 'aç')}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setMacroDraft(macro)}
                                                                aria-label={macro.title + ' makrosunu düzenle'}
                                                                className="flex h-11 w-11 items-center justify-center rounded-xl text-sand-600 transition-colors duration-200 hover:bg-sand-100 hover:text-sand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40"
                                                            >
                                                                <ChevronRight size={17} />
                                                            </button>
                                                        </SettingsRow>
                                                    );
                                                })}

                                                <button
                                                    type="button"
                                                    onClick={handleAddMacro}
                                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-sand-300 px-4 py-3 text-sm font-medium text-sand-600 transition-colors duration-200 hover:border-moss-500/50 hover:text-moss-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40"
                                                >
                                                    <Plus size={16} /> Yeni makro ekle
                                                </button>
                                            </div>

                                            <div className="mt-4 flex flex-col gap-2 border-t border-sand-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                                <p className="text-xs leading-relaxed text-sand-600">
                                                    Bir kutuya bastığınızda notun metni, o makronun göreviyle birlikte kendi API
                                                    anahtarınızla seçtiğiniz sağlayıcıya gönderilir ve dönen cevap nota yazılır.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={handleResetMacros}
                                                    className="btn btn-ghost flex-shrink-0 self-start px-3 py-2 text-xs sm:self-auto"
                                                >
                                                    <RotateCcw size={13} /> Varsayılanlara dön
                                                </button>
                                            </div>
                                        </SettingsSection>
                                    )}
                                </>
                            )}

                            {activeTab === 'remote' && <RemoteSettings />}

                            {activeTab === 'tools' && (
                                <>
                                    <SettingsPageHeader
                                        icon={Wrench}
                                        title="Düzenleme araçları"
                                        description="Editörde görmek istediğiniz araçları seçin."
                                    />
                                    <div role="tablist" aria-label="Düzenleme aracı ayarları" className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-sand-200 bg-sand-200/50 p-1">
                                        {(['local', 'computer'] as const).map((id, index) => <button key={id} type="button" role="tab" id={`tools-settings-tab-${id}`} aria-controls={`tools-settings-panel-${id}`} aria-selected={toolsTab === id} tabIndex={toolsTab === id ? 0 : -1} ref={element => { toolsTabRefs.current[index] = element; }} onClick={() => setToolsTab(id)} onKeyDown={event => {
                                            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                                            event.preventDefault();
                                            const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
                                            setToolsTab(next === 0 ? 'local' : 'computer'); toolsTabRefs.current[next]?.focus();
                                        }} className={'flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 ' + (toolsTab === id ? 'bg-white text-moss-800 shadow-sm' : 'text-sand-700 hover:bg-white/50')}>
                                            {id === 'local' ? <Wrench size={17} /> : <MonitorSmartphone size={17} />}{id === 'local' ? 'Yerel araçlar' : 'Bilgisayar araçları'}
                                        </button>)}
                                    </div>
                                    {toolsTab === 'local' ? <div role="tabpanel" id="tools-settings-panel-local" aria-labelledby="tools-settings-tab-local" className="space-y-4">
                                        <SettingsSection
                                            icon={Wrench}
                                            title="Yerel araçlar"
                                            description="Not metnini cihazda düzenleyen araçlar; bağlantı gerektirmez. Kapalıyken editörde araç satırı hiç görünmez."
                                            action={
                                                <SettingsSwitch
                                                    checked={araclarAcik}
                                                    onChange={(v) => handleBolumDegistir('araclar', v)}
                                                    label="Araçlar bölümünü editörde göster"
                                                />
                                            }
                                        >
                                            {toolList.length === 0 ? (
                                                <div className="rounded-xl border border-dashed border-sand-300 bg-sand-50/60 p-6 text-center">
                                                    <p className="text-sm font-medium text-sand-700">Yerel metin araçları silindi</p>
                                                    <p className="mt-1 text-xs text-sand-600">
                                                        Aşağıdaki düğmeyle varsayılan araçları geri getirebilirsiniz.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2.5">
                                                    {toolList.map((tool) => {
                                                        const isOn = tool.enabled !== false;
                                                        const aracIkonu =
                                                            tool.kind === 'icerikten-baslik' ? Type
                                                            : tool.kind === 'sirali-ad' ? Hash
                                                            : tool.kind === 'numaralandir' ? ListOrdered
                                                            : Eraser;

                                                        return (
                                                            <SettingsRow
                                                                key={tool.id}
                                                                icon={aracIkonu}
                                                                dimmed={!isOn}
                                                                title={tool.title}
                                                                description={tool.subtitle || 'Açıklama yok'}
                                                            >
                                                                <SettingsSwitch
                                                                    checked={isOn}
                                                                    onChange={() => handleToggleTool(tool.id)}
                                                                    label={tool.title + ' aracını ' + (isOn ? 'kapat' : 'aç')}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    aria-label={tool.title + ' aracını sil'}
                                                                    onClick={() => handleDeleteTool(tool.id)}
                                                                    className="flex h-11 w-11 items-center justify-center rounded-xl text-sand-600 transition-colors duration-200 hover:bg-berry-50 hover:text-berry-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berry-500/40"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </SettingsRow>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {toolList.length < DEFAULT_TOOLS.length && (
                                                <button
                                                    type="button"
                                                    onClick={handleResetTools}
                                                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-sand-300 px-4 py-3 text-sm font-medium text-sand-600 transition-colors duration-200 hover:border-moss-500/50 hover:text-moss-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40"
                                                >
                                                    <RotateCcw size={15} /> Silinen araçları geri getir
                                                </button>
                                            )}
                                        </SettingsSection>
                                    </div> : <div role="tabpanel" id="tools-settings-panel-computer" aria-labelledby="tools-settings-tab-computer" className="space-y-4">
                                        <SettingsSection
                                            icon={MonitorSmartphone}
                                            title="Bilgisayar araçları"
                                            description="Kart veya yardımcı program bağlantısı gerektiren araçlar. Bağlantı ayarları için Bilgisayar bağlantısı bölümüne bakın."
                                            action={<SettingsSwitch checked={bilgisayarAcik} onChange={value => handleBolumDegistir('bilgisayar', value)} label="Bilgisayar araçlarını editörde göster" />}
                                        >
                                            <RemoteToolCards />
                                        </SettingsSection>

                                        <SettingsSection
                                            icon={Keyboard}
                                            title="Kişisel kısayollar"
                                            description="Klavye kısayolu, hazır metin ve fare konumu. Makrolar editördeki Kısayollar düğmesiyle açılan panoda numpad düzeninde listelenir; türü buradan seçin."
                                        >
                                            <RemoteMacroTools />
                                        </SettingsSection>

                                        <SettingsSection
                                            icon={FolderKanban}
                                            title="Profiller ve kısayol düğmeleri"
                                            description="Makroları profillere ayırın; her kısayol düğmesi editörde bağlı profilin makrolarını açar."
                                        >
                                            <RemoteProfileTools />
                                        </SettingsSection>

                                        <SettingsSection
                                            icon={LayoutDashboard}
                                            title="Ekran düzenleri"
                                            description="Editördeki Ekran aracı için bölmeleri ve oranlarını tasarlayın: fare, yön tuşları, metin yazma ve kısayollar."
                                        >
                                            <RemoteScreenTools />
                                        </SettingsSection>
                                    </div>}
                                </>
                            )}

                            {activeTab === 'sync' && (
                                <>
                                    <SettingsPageHeader
                                        icon={Cloud}
                                        title="Yedekleme ve senkronizasyon"
                                        description="Google Drive yedeklerinizi yönetin, cihazlar arasındaki değişiklikleri güvenle birleştirin."
                                        badge={
                                            isLocalBackend
                                                ? <SettingsPill tone="clay">Yerel Mod Etkin</SettingsPill>
                                                : <SettingsPill tone="moss">Bulut Aktif</SettingsPill>
                                        }
                                    />

                                    <div className="space-y-4">
                                        <SettingsSection
                                            icon={UploadCloud}
                                            title="Google Drive yedeği"
                                            description="Notlar Google Drive'ınızdaki gizli uygulama klasörüne yazılır; yalnızca bu uygulama görebilir."
                                        >
                                            <div className="flex flex-col gap-2.5 sm:flex-row">
                                                <button
                                                    type="button"
                                                    onClick={handleDriveUpload}
                                                    disabled={driveBusy !== 'idle'}
                                                    className="btn btn-primary flex-1 px-4 py-3 text-sm"
                                                >
                                                    {driveBusy === 'upload' ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                                                    Drive'a Yedekle
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleDriveRestore}
                                                    disabled={driveBusy !== 'idle'}
                                                    className="btn btn-secondary flex-1 px-4 py-3 text-sm"
                                                >
                                                    {driveBusy === 'restore' ? <Loader2 size={16} className="animate-spin" /> : <HardDriveDownload size={16} />}
                                                    Drive'dan Geri Yükle
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleDriveMerge}
                                                    disabled={driveBusy !== 'idle'}
                                                    className="btn flex-1 border border-moss-500/40 bg-moss-500/10 px-4 py-3 text-sm text-moss-700 hover:bg-moss-500/20"
                                                >
                                                    {driveBusy === 'merge' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                                    Şimdi Senkronla
                                                </button>
                                            </div>
                                            {driveMessage && (
                                                <div className="mt-3">
                                                    <SettingsNote tone={driveMessage.type === 'ok' ? 'ok' : 'error'}>
                                                        {driveMessage.text}
                                                    </SettingsNote>
                                                </div>
                                            )}
                                        </SettingsSection>

                                        <SettingsSection
                                            icon={RefreshCw}
                                            title="Otomatik senkron"
                                            description="Google ile giriş yaptığınızda kendiliğinden açılır."
                                            action={
                                                <SettingsSwitch
                                                    checked={autoSync}
                                                    onChange={(v) => { setAutoSync(v); setAutoSyncEnabled(v); }}
                                                    label="Otomatik senkronu aç"
                                                />
                                            }
                                        >
                                            <p className="text-xs leading-relaxed text-sand-600">
                                                Açıkken her not değişikliği kısa süre sonra Drive'a yazılır; uygulama
                                                açılışında diğer cihazlardaki değişiklikler birleştirilir. Buradan dilediğiniz
                                                zaman kapatabilirsiniz.
                                            </p>
                                            <p className="mt-3 text-xs text-sand-600">
                                                {lastSync
                                                    ? 'Son yedek: ' + new Date(lastSync).toLocaleString('tr-TR')
                                                    : 'Bu cihazda henüz bir yedek kaydı yok.'}
                                            </p>
                                        </SettingsSection>
                                    </div>
                                </>
                            )}

                            {activeTab === 'data' && (
                                <>
                                    <SettingsPageHeader
                                        icon={HardDriveDownload}
                                        tone="clay"
                                        title="Veri yönetimi"
                                        description="Notlarınızı JSON, HTML veya PDF olarak dışa aktarın; JSON yedeğini geri yükleyin."
                                    />
                                    <DataSection />
                                </>
                            )}

                            {activeTab === 'gorunum' && (
                                <>
                                    <SettingsPageHeader
                                        icon={Palette}
                                        title="Görünüm"
                                        description="Açık, koyu veya sistem temasını seçin."
                                    />

                                    <SettingsSection
                                        icon={Palette}
                                        title="Tema"
                                        description="Seçiminiz bu cihazda saklanır, diğer cihazlarınızı etkilemez."
                                    >
                                        <TemaSecici />
                                    </SettingsSection>
                                </>
                            )}

                            {activeTab === 'about' && (
                                <>
                                    <SettingsPageHeader
                                        icon={Info}
                                        title="Uygulama hakkında"
                                        description="Sürüm bilgileri, gizlilik ve iletişim."
                                    />

                                    <div className="space-y-4">
                                        <SettingsSection
                                            icon={ShieldCheck}
                                            title="Gizlilik"
                                            description="Verilerinizin nerede saklandığını ve kimlerle paylaşıldığını okuyun."
                                        >
                                            <p className="text-xs leading-relaxed text-sand-600">
                                                Notlarınızı satmıyoruz ve reklam amacıyla kullanmıyoruz. Uygulama içinde
                                                izleme veya reklam çerezi bulunmaz; yalnızca sizin başlattığınız Drive
                                                yedeklemesi, bilgisayar araçları ve yapay zekâ işlemleri için gerekli veriler
                                                iletilir.
                                            </p>
                                            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                            <a href="/gizlilik" className="btn btn-secondary min-h-11 px-4 py-2.5 text-sm">
                                                <ShieldCheck size={16} /> Gizlilik politikasını aç <ExternalLink size={14} />
                                            </a>
                                            <a href="/veri-silme" className="btn btn-secondary min-h-11 px-4 py-2.5 text-sm">
                                                <Trash2 size={16} /> Veri silme talebi <ExternalLink size={14} />
                                            </a>
                                            </div>
                                        </SettingsSection>

                                        <SettingsSection icon={Info} title="Uygulama">
                                            <dl className="divide-y divide-sand-100 text-sm">
                                                <div className="flex items-center justify-between gap-4 py-2.5">
                                                    <dt className="text-sand-600">Uygulama</dt>
                                                    <dd className="font-medium text-sand-900">Not Bahçesi</dd>
                                                </div>
                                                <div className="flex items-center justify-between gap-4 py-2.5">
                                                    <dt className="text-sand-600">Sürüm</dt>
                                                    <dd className="font-mono text-sand-900">{APP_VERSION}</dd>
                                                </div>
                                                <div className="flex items-center justify-between gap-4 py-2.5">
                                                    <dt className="text-sand-600">Paket adı</dt>
                                                    <dd className="font-mono text-xs text-sand-900">com.notbahcesi.app</dd>
                                                </div>
                                                <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                                                    <dt className="text-sand-600">İletişim</dt>
                                                    <dd className="min-w-0">
                                                        <a href="mailto:candemirerx@gmail.com" className="inline-flex min-h-11 items-center gap-1.5 break-all text-xs font-medium text-moss-700 hover:underline sm:text-sm">
                                                            <Mail size={14} /> candemirerx@gmail.com
                                                        </a>
                                                    </dd>
                                                </div>
                                            </dl>
                                        </SettingsSection>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
