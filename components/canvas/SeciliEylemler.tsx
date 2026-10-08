'use client';

/**
 * Seçili notun eylemleri, sayfa düzeyinde: alttan açılan panel ya da sağ
 * altta yüzen düğme. (Kart üstündeki hap kipi YeniAgac'ın kendi içindedir.)
 *
 * Eylemler: metin editöründe aç, içeriği kopyala, yanına not ekle
 * (kökte: yanına ağaç), altına not ekle, buda.
 */
import { useEffect, useState } from 'react';
import { Check, Copy, CornerDownRight, ListPlus, Pencil, Plus, Scissors, Sprout, X } from 'lucide-react';
import type { MindNode } from '@/lib/types';
import type { TuvalEylem } from '@/lib/tuvalTercihleri';

type Bulunan = { node: MindNode; derinlik: number };

function bul(kokler: MindNode[], id: string): Bulunan | null {
    const ara = (n: MindNode, d: number): Bulunan | null => {
        if (n.id === id) return { node: n, derinlik: d };
        for (const c of n.children) { const b = ara(c, d + 1); if (b) return b; }
        return null;
    };
    for (const k of kokler) { const b = ara(k, 0); if (b) return b; }
    return null;
}

export function SeciliEylemler({ kip, kokler, seciliId, onKapat, onEdit, onYanina, onAltina, onAgacEkle, onBuda }: {
    kip: TuvalEylem;
    kokler: MindNode[];
    seciliId: string | null;
    onKapat: () => void;
    onEdit: (node: MindNode) => void;
    onYanina: (id: string) => void;
    onAltina: (id: string) => void;
    onAgacEkle: (kokId: string) => void;
    onBuda: (id: string, budandi: boolean) => void;
}) {
    const [acik, setAcik] = useState(false);
    const [kopyalandi, setKopyalandi] = useState(false);
    const secili = seciliId ? bul(kokler, seciliId) : null;
    // Seçim değişince yüzen düğme kapalı başlar.
    useEffect(() => { setAcik(false); }, [seciliId]);
    if ((kip !== 'panel' && kip !== 'yuzen') || !secili) return null;
    const { node, derinlik } = secili;
    const budandi = node.isPruned ?? false;
    const tur = derinlik === 0 ? 'ağaç' : derinlik === 1 ? 'dal' : 'yaprak';
    const yanAdi = derinlik === 0 ? 'Yanına ağaç' : derinlik === 1 ? 'Yanına dal' : 'Yanına yaprak';
    const altAdi = derinlik === 0 ? 'Altına dal' : 'Altına yaprak';
    const kopyala = () => {
        const govde = node.content.split('\n').slice(1).join('\n').trim();
        void navigator.clipboard.writeText(govde || node.title);
        setKopyalandi(true); setTimeout(() => setKopyalandi(false), 1500);
    };
    const eylemler = [
        { id: 'editor', ad: 'Metin editöründe aç', Icon: Pencil, ana: true, tam: true, calis: () => onEdit(node) },
        { id: 'yan', ad: yanAdi, Icon: derinlik === 0 ? Sprout : ListPlus, ana: true, calis: () => derinlik === 0 ? onAgacEkle(node.id) : onYanina(node.id) },
        { id: 'alt', ad: altAdi, Icon: CornerDownRight, ana: true, calis: () => onAltina(node.id) },
        { id: 'kopya', ad: kopyalandi ? 'Kopyalandı' : 'İçeriği kopyala', Icon: kopyalandi ? Check : Copy, calis: kopyala },
        { id: 'buda', ad: budandi ? 'Budamayı geri al' : 'Buda', Icon: Scissors, calis: () => onBuda(node.id, budandi) }
    ];
    // Panel/yüzen düğme tuvale dokunuşları yutmasın diye olaylar burada durdurulur.
    const yut = { onMouseDown: (e: React.SyntheticEvent) => e.stopPropagation(), onTouchStart: (e: React.SyntheticEvent) => e.stopPropagation() };

    if (kip === 'panel') {
        return (
            <div id="secili-panel" role="dialog" aria-label={node.title + ' eylemleri'} {...yut}
                className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-sand-200 bg-white px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-2.5 shadow-[0_-18px_40px_-20px_rgba(30,24,19,.45)]">
                <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-sand-300" aria-hidden="true" />
                <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-sand-900">{node.title}<span className="ml-2 text-xs font-medium text-sand-500">· {tur}</span></p>
                    <button type="button" onClick={onKapat} aria-label="Kapat" className="flex h-10 w-10 items-center justify-center rounded-full text-sand-600 hover:bg-sand-100"><X size={18} /></button>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                    {eylemler.map(({ id, ad, Icon, ana, tam, calis }) => (
                        <button key={id} type="button" id={'secili-' + id} onClick={calis}
                            className={`flex min-h-12 items-center gap-2.5 rounded-2xl px-3.5 text-left text-[13.5px] font-semibold transition-colors active:scale-[.98] ${tam ? 'col-span-2' : ''} ${ana ? 'bg-moss-600 text-white hover:bg-moss-700' : 'bg-sand-100 text-sand-800 hover:bg-sand-200'}`}>
                            <Icon size={18} aria-hidden="true" />{ad}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Yüzen düğme
    return (
        <div id="secili-yuzen" {...yut} className="pointer-events-none absolute bottom-[calc(76px+max(48px,env(safe-area-inset-bottom,0px)))] right-[max(12px,env(safe-area-inset-right,0px))] z-50 flex flex-col items-end gap-2.5 md:bottom-[84px]">
            {acik && eylemler.map(({ id, ad, Icon, ana, calis }) => (
                <button key={id} type="button" id={'secili-' + id} onClick={() => { calis(); if (id !== 'kopya') setAcik(false); }}
                    className="pointer-events-auto flex items-center gap-2.5">
                    <span className="rounded-xl bg-white px-3 py-1.5 text-[13px] font-semibold text-sand-800 shadow-[0_6px_16px_-8px_rgba(0,0,0,.45)]">{ad}</span>
                    <span className={`flex h-12 w-12 items-center justify-center rounded-full shadow-[0_8px_18px_-8px_rgba(0,0,0,.45)] ${ana ? 'bg-moss-600 text-white' : 'bg-white text-moss-700'}`}><Icon size={19} aria-hidden="true" /></span>
                </button>
            ))}
            <button type="button" id="secili-yuzen-ana" onClick={() => setAcik(a => !a)} aria-expanded={acik} aria-label={acik ? 'Eylemleri kapat' : node.title + ' için eylemler'}
                className="pointer-events-auto flex items-center gap-2.5">
                <span className="max-w-[170px] truncate rounded-xl bg-sand-900 px-3 py-1.5 text-[13px] font-semibold text-white shadow-[0_6px_16px_-8px_rgba(0,0,0,.5)]">{node.title}</span>
                <span className={`flex h-14 w-14 items-center justify-center rounded-[20px] text-white shadow-[0_12px_26px_-10px_rgba(20,16,12,.7)] transition-transform ${acik ? 'rotate-45 bg-sand-900' : 'bg-moss-700'}`}><Plus size={26} aria-hidden="true" /></span>
            </button>
        </div>
    );
}
