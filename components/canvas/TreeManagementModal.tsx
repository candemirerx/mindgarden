'use client';

/**
 * Ağaç Yönetimi.
 *
 * Canvas'ta düğüm çevresindeki seçenek sayısı azaltıldı; buraya taşınanlar
 * (tip değiştirme, renk, başlığı kopyalama, budama ve silme) bu pencereden
 * yönetilir. Ağacın kendisi de buradan yeniden adlandırılır veya silinir.
 */
import { useState } from 'react';
import {
    Settings, X, Pencil, Trash2, ArrowLeft, ChevronDown, ChevronRight,
    Copy, Check, Scissors, Leaf, Sprout
} from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { MindNode } from '@/lib/types';
import { BRANCH_COLORS, sonrakiRenk } from '@/lib/branchColors';

/** Listede gösterilecek düğüm satırı; ağaç düzleştirilerek çizilir. */
interface DugumSatiri {
    id: string;
    baslik: string;
    derinlik: number;
    nodeType: 'branch' | 'leaf' | 'auto';
    color: string | null;
    isPruned: boolean;
}

function duzlestir(node: MindNode, derinlik = 0): DugumSatiri[] {
    return [
        {
            id: node.id,
            baslik: node.title || 'Başlıksız',
            derinlik,
            nodeType: node.nodeType ?? 'auto',
            color: node.color ?? null,
            isPruned: node.isPruned ?? false
        },
        ...node.children.flatMap((cocuk) => duzlestir(cocuk, derinlik + 1))
    ];
}

interface TreeManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    trees: MindNode[];
    onRenameTree: (treeId: string, newName: string) => void;
    onDeleteTree: (treeId: string) => void;
    /** Düğüm eylemleri; canvas'taki kısayollar kaldırıldığı için burada. */
    onToggleType: (nodeId: string, currentType: 'branch' | 'leaf' | 'auto') => void;
    onTogglePrune: (nodeId: string, isPruned: boolean) => void;
    onDeleteNode: (nodeId: string) => void;
}

export const TreeManagementModal: React.FC<TreeManagementModalProps> = ({
    isOpen,
    onClose,
    trees,
    onRenameTree,
    onDeleteTree,
    onToggleType,
    onTogglePrune,
    onDeleteNode
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string; dugumMu: boolean } | null>(null);
    const [acikAgaclar, setAcikAgaclar] = useState<Set<string>>(new Set());
    const [kopyalanan, setKopyalanan] = useState<string | null>(null);
    /** Renk değişikliği yalnızca ekranda geçerlidir; kaydedilmez. */
    const [geciciRenkler, setGeciciRenkler] = useState<Record<string, string>>({});

    if (!isOpen) return null;

    const agacAcKapa = (id: string) => {
        setAcikAgaclar((onceki) => {
            const yeni = new Set(onceki);
            if (yeni.has(id)) yeni.delete(id);
            else yeni.add(id);
            return yeni;
        });
    };

    const handleStartEdit = (tree: MindNode) => {
        setEditingId(tree.id);
        setEditingName(tree.title);
    };

    const handleSaveEdit = (treeId: string) => {
        if (editingName.trim()) {
            onRenameTree(treeId, editingName.trim());
        }
        setEditingId(null);
        setEditingName('');
    };

    const handleCopyTitle = (dugum: DugumSatiri) => {
        navigator.clipboard.writeText(dugum.baslik);
        setKopyalanan(dugum.id);
        setTimeout(() => setKopyalanan(null), 1500);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm md:p-4">
            <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-gradient-to-br from-sand-50 via-clay-50/30 to-sand-50 shadow-pop md:h-[90vh] md:max-w-4xl md:rounded-3xl">
                {/* Header */}
                <div className="flex flex-shrink-0 items-center gap-3 border-b border-sand-200 bg-white/80 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-md md:px-6 md:py-4">
                    <button
                        onClick={onClose}
                        aria-label="Ağaç yönetiminden geri dön"
                        className="-ml-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sand-600 transition-colors hover:bg-sand-100"
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-clay-100">
                            <Settings className="text-clay-600" size={20} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-lg font-bold text-sand-800 md:text-xl">Ağaç Yönetimi</h2>
                            <p className="truncate text-xs text-sand-500">
                                Ağaçları ve düğümleri düzenleyin: tip, renk, kopyalama, budama, silme
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] md:p-6">
                    {trees.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-20 h-20 rounded-full bg-sand-100 flex items-center justify-center mb-4">
                                <Settings className="text-sand-400" size={40} />
                            </div>
                            <h3 className="text-lg font-semibold text-sand-700 mb-2">Henüz ağaç yok</h3>
                            <p className="text-sand-500 text-sm">Bahçenize ilk ağacı ekleyerek başlayın</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {trees.map((tree) => {
                                const dugumler = duzlestir(tree);
                                const acik = acikAgaclar.has(tree.id);

                                return (
                                    <div
                                        key={tree.id}
                                        className="overflow-hidden rounded-2xl border-2 border-sand-200 bg-white transition-all duration-200 hover:border-clay-300"
                                    >
                                        <div className="flex items-center justify-between p-4">
                                            <div className="min-w-0 flex-1">
                                                {editingId === tree.id ? (
                                                    <input
                                                        type="text"
                                                        value={editingName}
                                                        onChange={(e) => setEditingName(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSaveEdit(tree.id);
                                                            if (e.key === 'Escape') setEditingId(null);
                                                        }}
                                                        onBlur={() => handleSaveEdit(tree.id)}
                                                        className="w-full rounded-lg border-2 border-clay-300 bg-clay-50 px-3 py-2 text-lg font-semibold text-sand-800 outline-none focus:ring-2 focus:ring-clay-400"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <h3 className="truncate text-lg font-semibold text-sand-800">
                                                        {tree.title}
                                                    </h3>
                                                )}
                                                <p className="mt-1 text-sm text-sand-500">
                                                    {dugumler.length} düğüm
                                                </p>
                                            </div>
                                            <div className="ml-4 flex items-center gap-2">
                                                <button
                                                    onClick={() => agacAcKapa(tree.id)}
                                                    aria-expanded={acik}
                                                    className="flex h-10 items-center gap-1.5 rounded-xl border border-sand-200 px-3 text-sm font-medium text-sand-700 transition-colors hover:bg-sand-50"
                                                    title={acik ? 'Düğümleri gizle' : 'Düğümleri göster'}
                                                >
                                                    {acik ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                                                    <span className="hidden sm:inline">Düğümler</span>
                                                </button>
                                                <button
                                                    onClick={() => handleStartEdit(tree)}
                                                    className="flex h-10 w-10 items-center justify-center rounded-xl text-clay-600 transition-colors hover:bg-clay-50"
                                                    title="Ağacı yeniden adlandır"
                                                    aria-label="Ağacı yeniden adlandır"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => setPendingDelete({ id: tree.id, name: tree.title, dugumMu: false })}
                                                    className="flex h-10 w-10 items-center justify-center rounded-xl text-berry-600 transition-colors hover:bg-berry-50"
                                                    title="Ağacı sil"
                                                    aria-label="Ağacı sil"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Düğüm listesi: canvas'tan kaldırılan eylemler */}
                                        {acik && (
                                            <div className="border-t border-sand-200 bg-sand-50/60 p-3">
                                                <div className="space-y-2">
                                                    {dugumler.map((dugum) => {
                                                        const dalMi =
                                                            dugum.nodeType === 'branch' ||
                                                            (dugum.nodeType === 'auto' && dugum.derinlik === 1);
                                                        const renk =
                                                            geciciRenkler[dugum.id] ??
                                                            dugum.color ??
                                                            BRANCH_COLORS[0].value;

                                                        return (
                                                            <div
                                                                key={dugum.id}
                                                                className={`flex items-center gap-2 rounded-xl border border-sand-200 bg-white p-2.5 ${
                                                                    dugum.isPruned ? 'opacity-70' : ''
                                                                }`}
                                                                style={{ marginLeft: `${Math.min(dugum.derinlik, 4) * 14}px` }}
                                                            >
                                                                <span
                                                                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                                                                        dalMi
                                                                            ? 'bg-clay-100 text-clay-700'
                                                                            : 'bg-moss-100 text-moss-700'
                                                                    }`}
                                                                    aria-hidden
                                                                >
                                                                    {dalMi ? <Sprout size={16} /> : <Leaf size={15} />}
                                                                </span>

                                                                <span className="min-w-0 flex-1">
                                                                    <span
                                                                        className={`block truncate text-sm font-medium ${
                                                                            dugum.isPruned
                                                                                ? 'text-sand-400 line-through'
                                                                                : 'text-sand-800'
                                                                        }`}
                                                                    >
                                                                        {dugum.baslik}
                                                                    </span>
                                                                    {dugum.isPruned && (
                                                                        <span className="text-[10px] font-medium text-sand-500">Budandı</span>
                                                                    )}
                                                                </span>

                                                                {/* Tip değiştir */}
                                                                <button
                                                                    onClick={() => onToggleType(dugum.id, dugum.nodeType)}
                                                                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sand-600 transition-colors hover:bg-sand-100 hover:text-sand-900"
                                                                    title={dalMi ? 'Yaprağa dönüştür' : 'Dala dönüştür'}
                                                                    aria-label={dalMi ? 'Yaprağa dönüştür' : 'Dala dönüştür'}
                                                                >
                                                                    {dalMi ? <Leaf size={17} /> : <Sprout size={17} />}
                                                                </button>

                                                                {/* Renk (yalnızca ekranda) */}
                                                                <button
                                                                    onClick={() => {
                                                                        setGeciciRenkler((onceki) => ({
                                                                            ...onceki,
                                                                            [dugum.id]: sonrakiRenk(onceki[dugum.id] ?? dugum.color ?? null)
                                                                        }));
                                                                    }}
                                                                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-sand-100"
                                                                    title="Rengi değiştir"
                                                                    aria-label="Rengi değiştir"
                                                                >
                                                                    <span
                                                                        className="h-5 w-5 rounded-full ring-1 ring-black/15"
                                                                        style={{ backgroundColor: renk }}
                                                                    />
                                                                </button>

                                                                {/* Başlığı kopyala */}
                                                                <button
                                                                    onClick={() => handleCopyTitle(dugum)}
                                                                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sand-600 transition-colors hover:bg-sand-100 hover:text-sand-900"
                                                                    title={kopyalanan === dugum.id ? 'Kopyalandı!' : 'Başlığı kopyala'}
                                                                    aria-label="Başlığı kopyala"
                                                                >
                                                                    {kopyalanan === dugum.id
                                                                        ? <Check size={17} className="text-moss-600" />
                                                                        : <Copy size={17} />}
                                                                </button>

                                                                {/* Buda / geri al */}
                                                                <button
                                                                    onClick={() => onTogglePrune(dugum.id, dugum.isPruned)}
                                                                    aria-pressed={dugum.isPruned}
                                                                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                                                                        dugum.isPruned
                                                                            ? 'bg-sand-200 text-sand-800 hover:bg-sand-300'
                                                                            : 'text-sand-600 hover:bg-sand-100 hover:text-sand-900'
                                                                    }`}
                                                                    title={dugum.isPruned ? 'Budamayı geri al' : 'Buda'}
                                                                    aria-label={dugum.isPruned ? 'Budamayı geri al' : 'Buda'}
                                                                >
                                                                    <Scissors size={17} />
                                                                </button>

                                                                {/* Sil */}
                                                                <button
                                                                    onClick={() => setPendingDelete({ id: dugum.id, name: dugum.baslik, dugumMu: true })}
                                                                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-berry-600 transition-colors hover:bg-berry-50"
                                                                    title="Dalı sil"
                                                                    aria-label="Dalı sil"
                                                                >
                                                                    <X size={17} />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <p className="mt-3 px-1 text-[11px] leading-relaxed text-sand-500">
                                                    Renk değişikliği yalnızca ekranda geçerlidir; pencereyi kapatıp açtığınızda eski renge döner.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={pendingDelete !== null}
                title={pendingDelete?.dugumMu ? 'Dalı Sil' : 'Ağacı Sil'}
                description={
                    pendingDelete
                        ? pendingDelete.dugumMu
                            ? `“${pendingDelete.name}” dalını ve altındaki tüm düşünceleri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
                            : `“${pendingDelete.name}” ağacını ve altındaki tüm düşünceleri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
                        : ''
                }
                confirmText={pendingDelete?.dugumMu ? 'Dalı sil' : 'Ağacı sil'}
                cancelText="Vazgeç"
                isDanger
                onCancel={() => setPendingDelete(null)}
                onConfirm={() => {
                    if (pendingDelete) {
                        if (pendingDelete.dugumMu) onDeleteNode(pendingDelete.id);
                        else onDeleteTree(pendingDelete.id);
                    }
                    setPendingDelete(null);
                }}
            />
        </div>
    );
};
