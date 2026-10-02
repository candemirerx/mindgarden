'use client';

import { useState } from 'react';
import { Keyboard } from 'lucide-react';

/**
 * Kısayol seçmek için sanal bilgisayar klavyesi.
 *
 * Değiştirici tuşlar (CTRL, ALT, SHIFT, WIN) basılı kalır ve vurgulanır;
 * ardından normal bir tuşa basılınca kombinasyon kaydedilir ve
 * değiştiriciler bırakılır. Yalnız PC yardımcısının tanıdığı tuşlar vardır.
 */
const DEGISTIRICILER = ['CTRL', 'ALT', 'SHIFT', 'WIN'] as const;
type Degistirici = typeof DEGISTIRICILER[number];

const SATIRLAR: { ad: string; etiket?: string; genis?: boolean }[][] = [
    [{ ad: 'ESC' }, ...Array.from({ length: 6 }, (_, i) => ({ ad: 'F' + (i + 1) }))],
    Array.from({ length: 6 }, (_, i) => ({ ad: 'F' + (i + 7) })),
    [...'1234567890'.split('').map(ad => ({ ad })), { ad: 'BACKSPACE', etiket: '⌫', genis: true }],
    [{ ad: 'TAB', genis: true }, ...'QWERTYUIOP'.split('').map(ad => ({ ad }))],
    [...'ASDFGHJKL'.split('').map(ad => ({ ad })), { ad: 'ENTER', etiket: 'Enter', genis: true }],
    [...'ZXCVBNM'.split('').map(ad => ({ ad })), { ad: 'DELETE', etiket: 'Del', genis: true }],
    [{ ad: 'SPACE', etiket: 'Boşluk', genis: true }, { ad: 'HOME', etiket: 'Home' }, { ad: 'END', etiket: 'End' },
        { ad: 'LEFT', etiket: '←' }, { ad: 'UP', etiket: '↑' }, { ad: 'DOWN', etiket: '↓' }, { ad: 'RIGHT', etiket: '→' }]
];

const TUS = 'flex min-h-[38px] min-w-0 items-center justify-center rounded-md border px-0.5 text-[11px] font-semibold transition-colors touch-manipulation';

export default function SanalKlavye({ onSec, kimlik }: { onSec: (kisayol: string) => void; kimlik: string }) {
    const [acik, setAcik] = useState(false);
    const [basili, setBasili] = useState<Degistirici[]>([]);
    const degistir = (tus: Degistirici) => setBasili(liste => liste.includes(tus) ? liste.filter(t => t !== tus) : [...liste, tus]);
    const bas = (ad: string) => {
        const sirali = DEGISTIRICILER.filter(t => basili.includes(t));
        onSec([...sirali, ad].join('+'));
        setBasili([]);
    };
    if (!acik) {
        return <button type="button" id={kimlik + '-ac'} onClick={() => setAcik(true)} className="btn btn-secondary min-h-[40px] gap-1.5 px-3 text-xs">
            <Keyboard size={14} /> Klavyeden seç
        </button>;
    }
    return <div id={kimlik} className="space-y-1.5 rounded-xl border border-sand-200 bg-sand-50 p-2" role="group" aria-label="Sanal klavye">
        <div className="flex items-center justify-between gap-2 text-[11px] text-sand-600">
            <span aria-live="polite">{basili.length ? DEGISTIRICILER.filter(t => basili.includes(t)).join(' + ') + ' + …' : 'Değiştirici seçin, sonra tuşa basın'}</span>
            <button type="button" onClick={() => { setAcik(false); setBasili([]); }} className="min-h-[32px] rounded-md px-2 font-medium text-sand-700 hover:bg-sand-200">Kapat</button>
        </div>
        {SATIRLAR.map((satir, i) => (
            <div key={i} className="flex gap-1">
                {satir.map(({ ad, etiket, genis }) => (
                    <button key={ad} type="button" aria-label={ad} onClick={() => bas(ad)}
                        className={`${TUS} ${genis ? 'flex-[1.6]' : 'flex-1'} border-sand-300 bg-white text-sand-800 active:bg-sand-200`}>
                        {etiket ?? ad}
                    </button>
                ))}
            </div>
        ))}
        <div className="flex gap-1">
            {DEGISTIRICILER.map(tus => {
                const aktif = basili.includes(tus);
                return <button key={tus} type="button" aria-pressed={aktif} onClick={() => degistir(tus)}
                    className={`${TUS} flex-1 ${aktif ? 'border-[#2563eb] bg-[#2563eb] text-[#ffffff] ring-2 ring-[#60a5fa]/50' : 'border-sand-300 bg-white text-sand-800'}`}>
                    {tus}
                </button>;
            })}
        </div>
    </div>;
}
