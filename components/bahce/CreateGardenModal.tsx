'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store/useStore';
import { X } from 'lucide-react';

interface CreateGardenModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CreateGardenModal({ isOpen, onClose }: CreateGardenModalProps) {
    const [gardenName, setGardenName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { addGarden } = useStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!gardenName.trim()) return;

        setIsLoading(true);
        await addGarden(gardenName.trim());
        setIsLoading(false);

        setGardenName('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-branch-800">Yeni Bahçe Oluştur</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full smooth-transition"
                    >
                        <X size={24} className="text-branch-600" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-branch-700 mb-2">
                            Bahçe Adı
                        </label>
                        <input
                            type="text"
                            value={gardenName}
                            onChange={(e) => setGardenName(e.target.value)}
                            placeholder="Örn: Yapay Zeka Notları"
                            className="input-field"
                            autoFocus
                            disabled={isLoading}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary flex-1"
                            disabled={isLoading}
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="btn-primary flex-1"
                            disabled={isLoading || !gardenName.trim()}
                        >
                            {isLoading ? 'Oluşturuluyor...' : 'Oluştur'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
