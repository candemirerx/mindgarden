'use client';

import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { X, Bold, Italic, List, ListOrdered } from 'lucide-react';

interface TextEditorModalProps {
    isOpen: boolean;
    content: string;
    onSave: (content: string) => void;
    onClose: () => void;
}

export default function TextEditorModal({
    isOpen,
    content,
    onSave,
    onClose,
}: TextEditorModalProps) {
    const editor = useEditor({
        extensions: [StarterKit],
        content: content,
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4',
            },
        },
    });

    const handleSave = () => {
        if (editor) {
            const html = editor.getHTML();
            const text = editor.getText();
            onSave(text); // Şimdilik sadece text olarak kaydet
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in" style={{ pointerEvents: 'all' }}>
            <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-2xl font-bold text-branch-800">Not Düzenle</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full smooth-transition"
                    >
                        <X size={24} className="text-branch-600" />
                    </button>
                </div>

                {/* Toolbar */}
                {editor && (
                    <div className="flex items-center gap-1 p-4 border-b bg-gray-50">
                        <button
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            className={`p-2 rounded-lg smooth-transition ${editor.isActive('bold')
                                    ? 'bg-leaf-500 text-white'
                                    : 'hover:bg-gray-200 text-branch-600'
                                }`}
                        >
                            <Bold size={18} />
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            className={`p-2 rounded-lg smooth-transition ${editor.isActive('italic')
                                    ? 'bg-leaf-500 text-white'
                                    : 'hover:bg-gray-200 text-branch-600'
                                }`}
                        >
                            <Italic size={18} />
                        </button>
                        <div className="w-px h-6 bg-gray-300 mx-2"></div>
                        <button
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            className={`p-2 rounded-lg smooth-transition ${editor.isActive('bulletList')
                                    ? 'bg-leaf-500 text-white'
                                    : 'hover:bg-gray-200 text-branch-600'
                                }`}
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            className={`p-2 rounded-lg smooth-transition ${editor.isActive('orderedList')
                                    ? 'bg-leaf-500 text-white'
                                    : 'hover:bg-gray-200 text-branch-600'
                                }`}
                        >
                            <ListOrdered size={18} />
                        </button>
                    </div>
                )}

                {/* Editor */}
                <div className="flex-1 overflow-y-auto p-6">
                    <EditorContent editor={editor} />
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-6 border-t">
                    <button onClick={onClose} className="btn-secondary flex-1">
                        İptal
                    </button>
                    <button onClick={handleSave} className="btn-primary flex-1">
                        Kaydet
                    </button>
                </div>
            </div>
        </div>
    );
}
