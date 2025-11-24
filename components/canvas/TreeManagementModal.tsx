'use client';

import { useState } from 'react';
import { Settings, X, Pencil, Trash2 } from 'lucide-react';
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
        if (window.confirm(`"${treeName}" ağacını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
            onDeleteTree(treeId);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative w-full h-full md:h-[90vh] md:max-w-4xl bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-50 md:rounded-3xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-stone-200 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <Settings className="text-amber-600" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-stone-800">Ağaç Yönetimi</h2>
                            <p className="text-xs text-stone-500">Ağaçlarınızı düzenleyin veya silin</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                        title="Kapat"
                    >
                        <X size={24} className="text-stone-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto h-[calc(100%-80px)]">
                    {trees.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center mb-4">
                                <Settings className="text-stone-400" size={40} />
                            </div>
                            <h3 className="text-lg font-semibold text-stone-700 mb-2">Henüz ağaç yok</h3>
                            <p className="text-stone-500 text-sm">Bahçenize ilk ağacı ekleyerek başlayın</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {trees.map((tree) => (
                                <div
                                    key={tree.id}
                                    className="group bg-white rounded-2xl border-2 border-stone-200 hover:border-amber-300 transition-all duration-200 overflow-hidden"
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
                                                    className="w-full px-3 py-2 text-lg font-semibold text-stone-800 bg-amber-50 border-2 border-amber-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-400"
                                                    autoFocus
                                                />
                                            ) : (
                                                <h3 className="text-lg font-semibold text-stone-800 truncate">
                                                    {tree.title}
                                                </h3>
                                            )}
                                            <p className="text-sm text-stone-500 mt-1">
                                                {tree.children.length} dal
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            <button
                                                onClick={() => handleStartEdit(tree)}
                                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                title="Yeniden Adlandır"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(tree.id, tree.title)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        </div>
    );
};
