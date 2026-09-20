'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store/useStore';
import { X, AlertCircle, Sprout } from 'lucide-react';
import { useKeyboardInset } from '@/lib/useKeyboardInset';

interface CreateGardenModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CreateGardenModal({ isOpen, onClose }: CreateGardenModalProps) {
    const [gardenName, setGardenName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addGarden } = useStore();

    // Klavye açıldığında pencerenin görünür alanda kalmasını sağlar
    const keyboardInset = useKeyboardInset(isOpen);

    const handleClose = () => {
        setError(null);
        setGardenName('');
        onClose();
    };

    // Esc ile kapatma
    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setError(null);
                setGardenName('');
                onClose();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!gardenName.trim()) return;

        setIsLoading(true);
        const result = await addGarden(gardenName.trim());
        setIsLoading(false);

        if (result.success) {
            setGardenName('');
            onClose();
        } else {
            setError(result.error || 'Bahçe oluşturulamadı');
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bark-950/45 backdrop-blur-sm animate-fade-in"
            style={{ paddingBottom: keyboardInset ? keyboardInset + 16 : undefined }}
            onClick={handleClose}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-garden-title"
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md max-h-full overflow-y-auto rounded-3xl border border-sand-200 bg-white p-7 shadow-pop animate-scale-in"
            >
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-moss-100 text-moss-700">
                            <Sprout size={22} />
                        </span>
                        <div>
                            <h2 id="create-garden-title" className="text-xl font-semibold text-sand-900">
                                Yeni Bahçe
                            </h2>
                            <p className="text-sm text-sand-600">Notlarınızı gruplayacağınız bir alan açın</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        aria-label="Kapat"
                        className="rounded-xl p-2 text-sand-500 transition-colors duration-200 hover:bg-sand-100 hover:text-sand-700"
                    >
                        <X size={20} />
                    </button>
                </div>

                {error && (
                    <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-berry-200 bg-berry-50 p-3">
                        <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-berry-500" />
                        <p className="text-sm text-berry-700">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label htmlFor="garden-name" className="label">
                            Bahçe adı
                        </label>
                        <input
                            id="garden-name"
                            type="text"
                            value={gardenName}
                            onChange={(e) => setGardenName(e.target.value)}
                            placeholder="Örn: Yapay Zeka Notları"
                            className="input"
                            autoFocus
                            disabled={isLoading}
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="btn btn-secondary flex-1 px-5 py-2.5"
                            disabled={isLoading}
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary flex-1 px-5 py-2.5"
                            disabled={isLoading || !gardenName.trim()}
                        >
                            {isLoading ? 'Oluşturuluyor…' : 'Oluştur'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
