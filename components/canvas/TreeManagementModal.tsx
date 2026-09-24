'use client';

import { useState } from 'react';
import { Settings, X, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { MindNode } from '@/lib/types';

interface TreeManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    trees: MindNode[];
    onRenameTree: (treeId: string, newName: string) => void;
    onDeleteTree: (treeId: string) => void;
}

export const TreeManagementModal: React.FC<TreeManagementModalProps> = ({
    isOpen,
    onClose,
    trees,
    onRenameTree,
    onDeleteTree
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

    if (!isOpen) return null;

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

    const handleDelete = (treeId: string, treeName: string) => {
        setPendingDelete({ id: treeId, name: treeName });
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
                            <p className="truncate text-xs text-sand-500">Ağaçlarınızı düzenleyin veya silin</p>
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
                            {trees.map((tree) => (
                                <div
                                    key={tree.id}
                                    className="group bg-white rounded-2xl border-2 border-sand-200 hover:border-clay-300 transition-all duration-200 overflow-hidden"
                                >
                                    <div className="p-4 flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
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
                                                    className="w-full px-3 py-2 text-lg font-semibold text-sand-800 bg-clay-50 border-2 border-clay-300 rounded-lg outline-none focus:ring-2 focus:ring-clay-400"
                                                    autoFocus
                                                />
                                            ) : (
                                                <h3 className="text-lg font-semibold text-sand-800 truncate">
                                                    {tree.title}
                                                </h3>
                                            )}
                                            <p className="text-sm text-sand-500 mt-1">
                                                {tree.children.length} dal
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            <button
                                                onClick={() => handleStartEdit(tree)}
                                                className="p-2 text-clay-600 hover:bg-clay-50 rounded-lg transition-colors"
                                                title="Yeniden Adlandır"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(tree.id, tree.title)}
                                                className="p-2 text-berry-600 hover:bg-berry-50 rounded-lg transition-colors"
                                                title="Sil"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={pendingDelete !== null}
                title="Ağacı Sil"
                description={pendingDelete ? `“${pendingDelete.name}” ağacını ve altındaki tüm düşünceleri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.` : ''}
                confirmText="Ağacı sil"
                cancelText="Vazgeç"
                isDanger
                onCancel={() => setPendingDelete(null)}
                onConfirm={() => {
                    if (pendingDelete) onDeleteTree(pendingDelete.id);
                    setPendingDelete(null);
                }}
            />
        </div>
    );
};
