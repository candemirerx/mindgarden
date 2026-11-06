import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { TableKit } from '@tiptap/extension-table';
import type { Editor } from '@tiptap/core';
import { Slice } from '@tiptap/pm/model';
import Image from '@tiptap/extension-image';

/** Embedded, locally prepared images only: imported notes never load tracking URLs. */
export const safeNoteImage = (src: unknown): src is string => typeof src === 'string' && src.length <= 700000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(src);
/** Text-only tools/exporters must never type or print embedded binary data. */
export const noteTextOnly = (text: string) => text.replace(/!\[([^\]]*)\]\(data:image\/[^)]+\)/g, '[$1]');
export const NoteImage = Image.extend({
    parseHTML() { return [{ tag: 'img[src]', getAttrs: el => safeNoteImage((el as HTMLElement).getAttribute('src')) ? {} : false }]; },
    parseMarkdown(token, helpers) { return safeNoteImage(token.href) ? helpers.createNode('image', { src: token.href, alt: token.text, title: token.title }) : []; },
    renderHTML({ HTMLAttributes }) { return ['img', { ...HTMLAttributes, src: safeNoteImage(HTMLAttributes.src) ? HTMLAttributes.src : '', class: 'studio-inline-image' }]; },
}).configure({ inline: true, allowBase64: true });

/** Markdown stays the storage format; no HTML or schema migration in existing notes. */
export const richTextExtensions = () => [
    StarterKit.configure({ link: { openOnClick: false, autolink: false }, underline: false, trailingNode: false }),
    TableKit.configure({ table: { resizable: false } }),
    NoteImage,
    Markdown.configure({ markedOptions: { breaks: true, gfm: true } }),
];

/** Snapshot a rich selection without guessing Markdown offsets or matching repeated words. */
export function richTextSelection(editor: Editor) {
    const { from, to, empty } = editor.state.selection;
    if (empty || !editor.markdown) return null;
    const manager = editor.markdown;
    const state = editor.state;
    return {
        text: manager.serialize(state.doc.cut(from, to).toJSON()),
        replace: (markdown: string) => {
            const doc = state.schema.nodeFromJSON(manager.parse(markdown));
            const transaction = state.tr.replaceRange(from, to, new Slice(doc.content, 0, 0));
            return manager.serialize(transaction.doc.toJSON());
        },
    };
}
