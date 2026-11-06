'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { Bold, Italic, Strikethrough, Heading2, List, ListOrdered, Undo2, Redo2 } from 'lucide-react';
import { richTextExtensions, richTextSelection, safeNoteImage } from '@/lib/richText';
import ImagePreview from './ImagePreview';
import { NodeSelection } from '@tiptap/pm/state';

export type RichTextHandle = { selection: () => ReturnType<typeof richTextSelection>; plainText: () => string; html: () => string; imageInsertion: () => (src: string) => boolean };

const RichTextEditor = forwardRef<RichTextHandle, { value: string; onChange: (value: string) => void; readOnly?: boolean; toolbar?: boolean }>(function RichTextEditor({ value, onChange, readOnly = false, toolbar = false }, ref) {
    const [preview, setPreview] = useState('');
    const change = useRef(onChange);
    change.current = onChange;
    // Preserve the exact source until a genuine user edit; mounting never rewrites a note.
    const last = useRef(value);
    const editor = useEditor({
        extensions: richTextExtensions(), content: value, contentType: 'markdown',
        immediatelyRender: false, editable: !readOnly,
        editorProps: {
            attributes: { class: 'studio-rich-text studio-text', role: 'textbox', 'aria-label': 'Biçimli not içeriği', 'aria-multiline': 'true', spellcheck: 'true' },
            handleClickOn: (_view, _pos, node, _nodePos, _event, direct) => { if (direct && node.type.name === 'image' && safeNoteImage(node.attrs.src)) { setPreview(node.attrs.src); return true; } return false; },
            handleKeyDown: (view, event) => { const s = view.state.selection; if (event.key === 'Enter' && s instanceof NodeSelection && s.node.type.name === 'image' && safeNoteImage(s.node.attrs.src)) { setPreview(s.node.attrs.src); return true; } return false; },
        },
        onUpdate: ({ editor }) => { const markdown = editor.getMarkdown(); last.current = markdown; change.current(markdown); },
    });
    useEffect(() => {
        if (editor && value !== last.current) {
            last.current = value;
            editor.chain().setMeta('addToHistory', false).setContent(value, { contentType: 'markdown', emitUpdate: false }).run();
        }
    }, [editor, value]);
    // Tiptap emits an update by default here, even when the document did not
    // change. During hydration that could overwrite a restored note with '' .
    useEffect(() => { editor?.setEditable(!readOnly, false); }, [editor, readOnly]);
    useImperativeHandle(ref, () => ({ selection: () => editor ? richTextSelection(editor) : null, plainText: () => editor?.getText() ?? value, html: () => editor?.getHTML() ?? '', imageInsertion: () => {
        if (!editor) return () => false;
        const { from, to } = editor.state.selection, doc = editor.state.doc;
        return src => !editor.isDestroyed && safeNoteImage(src) && doc.eq(editor.state.doc) && editor.chain().focus().insertContentAt({ from, to }, { type: 'image', attrs: { src, alt: 'Not görseli' } }).run();
    } }), [editor, value]);
    const state = useEditorState({ editor, selector: ({ editor }) => editor ? {
        bold: editor.isActive('bold'), italic: editor.isActive('italic'), strike: editor.isActive('strike'), heading: editor.isActive('heading', { level: 2 }), bullet: editor.isActive('bulletList'), ordered: editor.isActive('orderedList'), undo: editor.can().undo(), redo: editor.can().redo(),
    } : null });
    const buttons = [
        { label: 'Kalın', Icon: Bold, active: state?.bold, run: () => editor?.chain().focus().toggleBold().run() },
        { label: 'İtalik', Icon: Italic, active: state?.italic, run: () => editor?.chain().focus().toggleItalic().run() },
        { label: 'Üstü çizili', Icon: Strikethrough, active: state?.strike, run: () => editor?.chain().focus().toggleStrike().run() },
        { label: 'Başlık', Icon: Heading2, active: state?.heading, run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
        { label: 'Madde işaretleri', Icon: List, active: state?.bullet, run: () => editor?.chain().focus().toggleBulletList().run() },
        { label: 'Numaralı liste', Icon: ListOrdered, active: state?.ordered, run: () => editor?.chain().focus().toggleOrderedList().run() },
        { label: 'Geri al', Icon: Undo2, disabled: !state?.undo, run: () => editor?.chain().focus().undo().run() },
        { label: 'Yinele', Icon: Redo2, disabled: !state?.redo, run: () => editor?.chain().focus().redo().run() },
    ];
    return <div className="min-w-0">
        {toolbar && <div id="studio-format-toolbar" className="studio-format-toolbar" role="group" aria-label="Metin biçimlendirme">
            {buttons.map(({ label, Icon, active, disabled, run }) => <button key={label} type="button" title={label} aria-label={label} aria-pressed={active} disabled={!editor || readOnly || disabled} onMouseDown={e => e.preventDefault()} onClick={run}><Icon size={17} /></button>)}
        </div>}
        <EditorContent editor={editor} />
        {preview && <ImagePreview src={preview} onClose={() => setPreview('')} />}
    </div>;
});
export default RichTextEditor;
