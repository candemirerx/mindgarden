'use client';

import { Copy, Edit, Plus, GitBranch } from 'lucide-react';

interface NodeToolbarProps {
    onCopy: () => void;
    onEdit: () => void;
    onAddChild: () => void;
    onAddSibling?: () => void;
}

export default function NodeToolbar({
    onCopy,
    onEdit,
    onAddChild,
    onAddSibling,
}: NodeToolbarProps) {
    return (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-10 animate-slide-up">
            <div className="flex items-center gap-1 bg-white rounded-xl shadow-lg p-1 border border-gray-200">
                {/* Copy Button */}
                <button
                    onClick={onCopy}
                    className="p-2 hover:bg-leaf-50 rounded-lg smooth-transition group"
                    title="İçeriği Kopyala"
                >
                    <Copy size={16} className="text-branch-600 group-hover:text-leaf-600" />
                </button>

                {/* Edit Button */}
                <button
                    onClick={onEdit}
                    className="p-2 hover:bg-leaf-50 rounded-lg smooth-transition group"
                    title="Düzenle"
                >
                    <Edit size={16} className="text-branch-600 group-hover:text-leaf-600" />
                </button>

                {/* Add Child Button */}
                <button
                    onClick={onAddChild}
                    className="p-2 hover:bg-leaf-50 rounded-lg smooth-transition group"
                    title="Alt Dal Ekle"
                >
                    <Plus size={16} className="text-branch-600 group-hover:text-leaf-600" />
                </button>

                {/* Add Sibling Button - sadece root node değilse göster */}
                {onAddSibling && (
                    <button
                        onClick={onAddSibling}
                        className="p-2 hover:bg-leaf-50 rounded-lg smooth-transition group"
                        title="Yan Dal Ekle"
                    >
                        <GitBranch size={16} className="text-branch-600 group-hover:text-leaf-600" />
                    </button>
                )}
            </div>
        </div>
    );
}
