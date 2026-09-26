'use client';

/**
 * Veri Yönetimi: notları dışa aktarma (JSON, HTML, PDF) ve içe aktarma.
 *
 * Daha önce kenar çubuğunda ayrı bir pencere olarak duruyordu; artık
 * "Tercihler ve Ayarlar" penceresinin bir sekmesi. Böylece kenar çubuğunda
 * tek bir Ayarlar girişi kalıyor.
 */
import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Loader2, Download, Upload, ChevronDown, TreePine, Database,
    FileJson, FileText, FileType
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useStore } from '@/lib/store/useStore';
import { Capacitor } from '@capacitor/core';

export default function DataSection() {
    const { gardens, fetchGardens } = useStore();

    // İçe aktarma state'leri
    const [showImportOptions, setShowImportOptions] = useState(false);
    const [importData, setImportData] = useState<{ gardens: any[]; nodes: any[] } | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Dışa aktarma state'leri
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [exportData, setExportData] = useState<{ gardens: any[]; nodes: any[] } | null>(null);
    const [exportStep, setExportStep] = useState<'select' | 'format'>('select');
    const [selectedGardenIds, setSelectedGardenIds] = useState<Set<string>>(new Set());
    const [isExporting, setIsExporting] = useState(false);

    /** Oturumdaki kullanıcının kimliği; yoksa null. */
    const kullaniciIdAl = async (): Promise<string | null> => {
        const { data, error } = await supabase.auth.getSession();
        if (error) return null;
        return data.session?.user?.id ?? null;
    };

   
    const handleExportClick = async () => {
        // Zaten açıksa kapat
        if (showExportOptions) {
            setShowExportOptions(false);
            setExportData(null);
            return;
        }

        const kullaniciId = await kullaniciIdAl();
        if (!kullaniciId) return;
        setIsExporting(true);

        try {
            const { data: gardensData, error: gardensError } = await supabase
                .from('gardens')
                .select('*')
                .eq('user_id', kullaniciId)
                .is('deleted_at', null);

            if (gardensError) throw gardensError;

            let nodesData: any[] = [];
            const gardenIds = gardensData?.map(g => g.id) || [];

            if (gardenIds.length > 0) {
                const { data: fetchedNodes, error: nodesError } = await supabase
                    .from('nodes')
                    .select('*')
                    .in('garden_id', gardenIds)
                    .is('deleted_at', null);

                if (nodesError) throw nodesError;
                nodesData = fetchedNodes || [];
            }

            setExportData({ gardens: gardensData || [], nodes: nodesData });
            setSelectedGardenIds(new Set(gardenIds)); // Varsayılan: tümü seçili
            setExportStep('select');
            setShowExportOptions(true);
            setShowImportOptions(false); // Diğerini kapat
        } catch (error) {
            console.error('Export error:', error);
            alert('Veriler alınırken hata oluştu.');
        } finally {
            setIsExporting(false);
        }
    };

    // Bahçe seçimini toggle et
    const toggleGardenSelection = (gardenId: string) => {
        const newSet = new Set(selectedGardenIds);
        if (newSet.has(gardenId)) {
            newSet.delete(gardenId);
        } else {
            newSet.add(gardenId);
        }
        setSelectedGardenIds(newSet);
    };

    // Tümünü seç
    const selectAllGardens = () => {
        if (exportData) {
            setSelectedGardenIds(new Set(exportData.gardens.map(g => g.id)));
        }
    };

    // Seçili verileri filtrele
    const getFilteredExportData = () => {
        if (!exportData) return null;
        const filteredGardens = exportData.gardens.filter(g => selectedGardenIds.has(g.id));
        const filteredNodes = exportData.nodes.filter(n => selectedGardenIds.has(n.garden_id));
        return { gardens: filteredGardens, nodes: filteredNodes };
    };
    const handleExportJSON = () => {
        const filtered = getFilteredExportData();
        if (!filtered) return;
        const data = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            gardens: filtered.gardens,
            nodes: filtered.nodes
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        void saveFile(blob, `not-bahcesi-backup-${tarihDamgasi()}.json`);
        setShowExportOptions(false);
        setExportData(null);
    };
    const handleExportHTML = () => {
        const filtered = getFilteredExportData();
        if (!filtered) return;

        const escapeHtml = (text: string) => {
            return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        };

        const escapeJs = (text: string) => {
            return text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
        };

        const buildTreeHTML = (nodes: any[], parentId: string | null = null, depth: number = 0): string => {
            const children = nodes.filter(n => n.parent_id === parentId);
            if (children.length === 0) return '';

            return children.map(node => {
                const title = node.content.split('\n')[0] || 'Başlıksız';
                const content = node.content.split('\n').slice(1).join('\n').trim();
                const childrenHTML = buildTreeHTML(nodes, node.id, depth + 1);
                const nodeId = node.id.replace(/-/g, '');

                return `
                <div class="node" style="margin-left: ${depth * 24}px; margin-bottom: 16px;">
                    <div class="node-header">
                        <span class="icon">${depth === 0 ? '🌳' : '🌿'}</span>
                        <strong class="title">${escapeHtml(title)}</strong>
                        <button type="button" data-copy="${escapeHtml(title)}" class="copy-btn copy-title" title="Başlığı kopyala">📋</button>
                        ${content ? `<button type="button" data-copy="${escapeHtml(content)}" class="copy-btn copy-content" title="İçeriği kopyala">📄</button>` : ''}
                    </div>
                    ${content ? `
                    <details class="node-details">
                        <summary>Detaylar</summary>
                        <div class="content">${escapeHtml(content)}</div>
                    </details>` : ''}
                    ${childrenHTML ? `<div class="children">${childrenHTML}</div>` : ''}
                </div>`;
            }).join('');
        };

        const gardensHTML = filtered.gardens.map(garden => {
            const gardenNodes = filtered.nodes.filter(n => n.garden_id === garden.id);
            const treesHTML = buildTreeHTML(gardenNodes, null, 0);
            return `
            <div class="garden">
                <h2>🏡 ${escapeHtml(garden.name)}</h2>
                ${treesHTML || '<p class="empty">Bu bahçede henüz not yok.</p>'}
            </div>`;
        }).join('');

        const html = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Not Bahçesi - Dışa Aktarım</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 860px; margin: 0 auto; padding: 40px 20px 64px;
            background: #f6f3ee; color: #1e1813; line-height: 1.55;
            -webkit-font-smoothing: antialiased;
        }
        h1 { color: #275939; text-align: center; margin-bottom: 6px; font-size: 30px; letter-spacing: -0.02em; }
        .subtitle { text-align: center; color: #7c7268; margin-bottom: 10px; font-size: 13px; }
        .ipucu {
            text-align: center; color: #7c7268; margin: 0 auto 34px; font-size: 12px;
            line-height: 1.5; max-width: 620px; background: #fdf8e9;
            border: 1px solid #f4dc94; border-radius: 10px; padding: 10px 14px;
        }
        .garden {
            margin-bottom: 24px; padding: 22px; background: #fff;
            border-radius: 16px; border: 1px solid #eae5de;
            box-shadow: 0 1px 3px rgba(29,21,16,0.05), 0 8px 24px -10px rgba(29,21,16,0.12);
        }
        .garden h2 { color: #275939; margin-bottom: 16px; font-size: 19px; letter-spacing: -0.01em; }
        .empty { color: #ada396; font-style: italic; }
        .node { padding: 6px 0; }
        .node-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .icon { font-size: 15px; }
        .title { color: #2c251d; font-size: 15px; font-weight: 600; }
        /* Kopyalama düğmeleri yalnızca JavaScript çalışıyorsa gösterilir.
           HTML Viewer gibi JavaScript çalıştırmayan görüntüleyicilerde
           çalışmayan düğme göstermek yerine metin seçilebilir bırakılır. */
        .copy-btn {
            display: none;
            padding: 3px 9px; font-size: 11px; font-weight: 600;
            background: #f0f7ef; border: 1px solid #bbdcc1; color: #306c47;
            border-radius: 7px; cursor: pointer; transition: background 0.18s, border-color 0.18s;
        }
        html.js-var .copy-btn { display: inline-block; }
        .copy-btn:hover { background: #deedda; }
        .copy-btn.copied { background: #44825b; color: #fff; border-color: #44825b; }
        /* Detaylar için JavaScript gerektirmeyen yerel açılır öğe */
        .node-details { margin: 8px 0 0 26px; }
        .node-details > summary {
            display: inline-block; padding: 4px 12px; font-size: 12px; font-weight: 600;
            background: #fdf8e9; border: 1px solid #f4dc94; color: #8c5210;
            border-radius: 7px; cursor: pointer; list-style: none;
        }
        .node-details > summary::-webkit-details-marker { display: none; }
        .node-details > summary::before { content: '▶ '; }
        .node-details[open] > summary::before { content: '▼ '; }
        .node-details[open] > summary { background: #c9841b; color: #fff; border-color: #c9841b; }
        .content {
            margin: 8px 0 0 0; padding: 12px 14px; background: #fbf9f6;
            border-radius: 10px; border: 1px solid #eae5de; color: #5b5348;
            white-space: pre-wrap; font-size: 14px;
            -webkit-user-select: text; user-select: text;
        }
        .title, .content { -webkit-user-select: text; user-select: text; }
        .children { margin-top: 10px; }
    </style>
</head>
<body>
    <h1>🌱 Not Bahçesi</h1>
    <p class="subtitle">Dışa aktarım tarihi: ${new Date().toLocaleDateString('tr-TR')}</p>
    <p class="ipucu">Detaylar bölümleri her cihazda açılır. Tek dokunuşla kopyalamak için dosyayı <strong>Chrome</strong> gibi bir tarayıcıda açın; diğer görüntüleyicilerde metni basılı tutup seçerek kopyalayabilirsiniz.</p>
    ${gardensHTML}
    <script>
        // JavaScript çalışıyorsa kopyalama düğmelerini görünür yap
        document.documentElement.classList.add('js-var');

        // Kopyalama: tarayıcı pano API'si file:// ile açılan sayfalarda
        // reddedilir (Chrome bu kaynağa izin vermez). Bu yüzden dosyadan
        // açıldığında doğrudan, her yerde çalışan yedek yöntem kullanılır;
        // diğer durumlarda önce pano API'si denenir, reddedilirse yedeğe
        // düşülür.
        function yedekKopyala(metin) {
            return new Promise(function (cozumle, reddet) {
                var alan = document.createElement('textarea');
                alan.value = metin;
                alan.setAttribute('readonly', '');
                alan.style.position = 'fixed';
                alan.style.top = '0';
                alan.style.left = '0';
                alan.style.width = '2em';
                alan.style.height = '2em';
                alan.style.padding = '0';
                alan.style.border = 'none';
                alan.style.outline = 'none';
                alan.style.boxShadow = 'none';
                alan.style.background = 'transparent';
                alan.style.opacity = '0';
                document.body.appendChild(alan);

                var secim = document.getSelection();
                var onceki = secim && secim.rangeCount > 0 ? secim.getRangeAt(0) : null;

                alan.focus();
                alan.select();
                try {
                    alan.setSelectionRange(0, alan.value.length);
                } catch (e) {
                    // bazı tarayıcılar readonly alanda bunu desteklemez
                }

                var basarili = false;
                try {
                    basarili = document.execCommand('copy');
                } catch (e) {
                    basarili = false;
                }

                document.body.removeChild(alan);
                if (onceki && secim) {
                    secim.removeAllRanges();
                    secim.addRange(onceki);
                }

                if (basarili) {
                    cozumle();
                } else {
                    reddet(new Error('Kopyalanamadı'));
                }
            });
        }

        function panoyaKopyala(metin) {
            var dosyadanAcildi = location.protocol === 'file:';

            if (!dosyadanAcildi && navigator.clipboard && window.isSecureContext) {
                return navigator.clipboard.writeText(metin).catch(function () {
                    return yedekKopyala(metin);
                });
            }

            return yedekKopyala(metin);
        }

        document.querySelectorAll('[data-copy]').forEach(function (dugme) {
            dugme.addEventListener('click', function () {
                var metin = dugme.getAttribute('data-copy') || '';
                var eski = dugme.textContent;

                panoyaKopyala(metin).then(function () {
                    dugme.classList.add('copied');
                    dugme.textContent = '✓';
                    setTimeout(function () {
                        dugme.classList.remove('copied');
                        dugme.textContent = eski;
                    }, 1500);
                }).catch(function () {
                    dugme.textContent = '✕';
                    setTimeout(function () {
                        dugme.textContent = eski;
                    }, 1500);
                });
            });
        });
    </script>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        void saveFile(blob, `not-bahcesi-${tarihDamgasi()}.html`);
        setShowExportOptions(false);
        setExportData(null);
    };

    // PDF olarak dışa aktar (tarayıcı print ile - Türkçe karakter desteği)
    const handleExportPDF = async () => {
        const filtered = getFilteredExportData();
        if (!filtered) return;

        const escapeHtml = (text: string) => {
            return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        };

        const buildTreeHTML = (nodes: any[], parentId: string | null = null, depth: number = 0): string => {
            const children = nodes.filter(n => n.parent_id === parentId);
            if (children.length === 0) return '';

            return children.map(node => {
                const title = node.content.split('\n')[0] || 'Başlıksız';
                const content = node.content.split('\n').slice(1).join('\n').trim();
                const childrenHTML = buildTreeHTML(nodes, node.id, depth + 1);
                const isRoot = depth === 0;

                return `
                <div class="node ${isRoot ? 'root' : 'child'}" style="margin-left: ${depth * 20}px;">
                    <div class="node-title">
                        <span class="bullet">${isRoot ? '●' : '○'}</span>
                        <span class="title-text">${escapeHtml(title)}</span>
                    </div>
                    ${content ? `<div class="node-content">${escapeHtml(content)}</div>` : ''}
                    ${childrenHTML}
                </div>`;
            }).join('');
        };

        const gardensHTML = filtered.gardens.map(garden => {
            const gardenNodes = filtered.nodes.filter(n => n.garden_id === garden.id);
            const treesHTML = buildTreeHTML(gardenNodes, null, 0);
            return `
            <div class="garden">
                <h2>${escapeHtml(garden.name)}</h2>
                ${treesHTML || '<p class="empty">Bu bahçede henüz not yok.</p>'}
            </div>`;
        }).join('');

        const printHTML = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Not Bahçesi</title>
    <style>
        @page { margin: 2cm; size: A4; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            color: #1c1917; 
            line-height: 1.6;
            font-size: 11pt;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            padding-bottom: 20px; 
            border-bottom: 2px solid #16a34a;
        }
        .header h1 { 
            color: #16a34a; 
            font-size: 24pt; 
            margin-bottom: 5px;
            font-weight: 600;
        }
        .header .date { 
            color: #78716c; 
            font-size: 10pt; 
        }
        .garden { 
            margin-bottom: 25px; 
            page-break-inside: avoid;
        }
        .garden h2 { 
            color: #16a34a; 
            font-size: 14pt; 
            margin-bottom: 12px;
            padding: 8px 12px;
            background: #f0fdf4;
            border-left: 4px solid #16a34a;
            border-radius: 0 8px 8px 0;
        }
        .node { 
            margin-bottom: 8px;
            page-break-inside: avoid;
        }
        .node.root { 
            margin-top: 12px;
        }
        .node-title { 
            display: flex; 
            align-items: flex-start; 
            gap: 8px;
        }
        .bullet { 
            color: #16a34a; 
            font-size: 8pt;
            margin-top: 4px;
        }
        .node.root .bullet { font-size: 10pt; }
        .title-text { 
            font-weight: 600; 
            color: #1c1917;
        }
        .node.root .title-text { 
            font-size: 12pt;
            color: #166534;
        }
        .node-content { 
            margin-left: 18px; 
            margin-top: 4px;
            padding: 8px 12px;
            background: #fafaf9;
            border-radius: 6px;
            color: #57534e;
            font-size: 10pt;
            white-space: pre-wrap;
            border-left: 2px solid #e7e5e4;
        }
        .empty { 
            color: #a8a29e; 
            font-style: italic; 
            padding: 10px;
        }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🌱 Not Bahçesi</h1>
        <p class="date">${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </div>
    ${gardensHTML}
</body>
</html>`;

        // PDF'i doğrudan dosya olarak üret.
        //
        // jsPDF'in gömülü Helvetica fontu Türkçeye özgü harfleri (ş, ğ, ı, İ)
        // içermediği için metni doğrudan PDF'e yazmak yerine tarayıcının kendi
        // çizim motoruyla (canvas) çizip sayfayı görüntü olarak PDF'e ekleriz.
        // Böylece Türkçe harfler eksiksiz görünür.
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });

        const sayfaGenisligi = doc.internal.pageSize.getWidth();
        const sayfaYuksekligi = doc.internal.pageSize.getHeight();
        const kenar = 48;
        const olcek = 2; // net görüntü için

        interface PdfSatiri { metin: string; boyut: number; kalin: boolean; girinti: number; }
        const satirlar: PdfSatiri[] = [];

        const ekle = (metin: string, boyut: number, kalin: boolean, girinti: number) => {
            satirlar.push({ metin, boyut, kalin, girinti });
        };

        ekle('Not Bahçesi', 24, true, 0);
        ekle(new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }), 11, false, 0);
        satirlar.push({ metin: '', boyut: 12, kalin: false, girinti: 0 });

        for (const garden of filtered.gardens) {
            ekle(garden.name, 17, true, 0);

            const gardenNodes = filtered.nodes.filter((n: any) => n.garden_id === garden.id);
            const gezin = (parentId: string | null, derinlik: number) => {
                const cocuklar = gardenNodes.filter((n: any) => n.parent_id === parentId);
                for (const node of cocuklar) {
                    const baslik = node.content.split('\n')[0] || 'Başlıksız';
                    const govde = node.content.split('\n').slice(1).join('\n').trim();
                    ekle(`${derinlik === 0 ? '•' : '–'} ${baslik}`, 12, derinlik === 0, 12 + derinlik * 16);
                    if (govde) ekle(govde, 10.5, false, 28 + derinlik * 16);
                    gezin(node.id, derinlik + 1);
                }
            };
            gezin(null, 0);
            satirlar.push({ metin: '', boyut: 10, kalin: false, girinti: 0 });
        }

        // Sayfa numarası ve alt bilgi için ayrılan alan
        const altBilgiAlani = 34;

        // Çizim alanı: satır kaydırma ölçümü ve sayfa çizimi için ortak kullanılır
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(sayfaGenisligi * olcek);
        canvas.height = Math.round(sayfaYuksekligi * olcek);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            alert('PDF oluşturulamadı: çizim alanı açılamadı.');
            return;
        }

        /** Bir satırın sayfa genişliğine sığacak biçimde bölünmüş hâli. */
        const sarilanSatirlar = (satir: PdfSatiri): string[] => {
            ctx.font = `${satir.kalin ? '600 ' : ''}${satir.boyut * olcek}px "Segoe UI", Roboto, Arial, sans-serif`;
            const enFazlaGenislik = canvas.width - (kenar * 2 + satir.girinti) * olcek;

            const parcalar: string[] = [];
            let birikim = '';

            for (const kelime of satir.metin.split(' ')) {
                const deneme = birikim ? `${birikim} ${kelime}` : kelime;
                if (ctx.measureText(deneme).width > enFazlaGenislik && birikim) {
                    parcalar.push(birikim);
                    birikim = kelime;
                } else {
                    birikim = deneme;
                }
            }
            if (birikim) parcalar.push(birikim);

            return parcalar.length > 0 ? parcalar : [''];
        };

        const sarilanSatirSayisi = (satir: PdfSatiri) => sarilanSatirlar(satir).length;

        // Satırları sayfalara böl (kaydırma ölçülerek yapılır)
        const sayfalar: PdfSatiri[][] = [];
        let aktif: PdfSatiri[] = [];
        let kullanilan = kenar;

        for (const satir of satirlar) {
            const yukseklik = satir.metin
                ? sarilanSatirSayisi(satir) * satir.boyut * 1.5
                : satir.boyut;

            if (
                kullanilan + yukseklik > sayfaYuksekligi - kenar - altBilgiAlani &&
                aktif.length > 0
            ) {
                sayfalar.push(aktif);
                aktif = [];
                kullanilan = kenar;
            }
            aktif.push(satir);
            kullanilan += yukseklik;
        }
        if (aktif.length > 0) sayfalar.push(aktif);

        sayfalar.forEach((sayfa, sayfaNo) => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            let y = kenar * olcek;

            for (const satir of sayfa) {
                if (!satir.metin) {
                    y += satir.boyut * olcek;
                    continue;
                }

                ctx.font = `${satir.kalin ? '600 ' : ''}${satir.boyut * olcek}px "Segoe UI", Roboto, Arial, sans-serif`;
                ctx.fillStyle = satir.girinti === 0 && satir.kalin ? '#1B3A28' : '#2C251D';

                for (const parca of sarilanSatirlar(satir)) {
                    ctx.fillText(parca, (kenar + satir.girinti) * olcek, y);
                    y += satir.boyut * 1.5 * olcek;
                }
            }

            // Alt bilgi
            ctx.font = `${10 * olcek}px "Segoe UI", Roboto, Arial, sans-serif`;
            ctx.fillStyle = '#7C7268';
            ctx.fillText(
                `Not Bahçesi · ${sayfaNo + 1} / ${sayfalar.length}`,
                kenar * olcek,
                (sayfaYuksekligi - altBilgiAlani / 2) * olcek
            );

            if (sayfaNo > 0) doc.addPage();
            doc.addImage(
                canvas.toDataURL('image/jpeg', 0.92),
                'JPEG',
                0,
                0,
                sayfaGenisligi,
                sayfaYuksekligi
            );
        });

        await saveFile(doc.output('blob'), `not-bahcesi-${tarihDamgasi()}.pdf`);

        setShowExportOptions(false);
        setExportData(null);
    };

    /** Blob'u base64'e çevirir (Capacitor Filesystem base64 bekler). */
    const blobToBase64 = (blob: Blob): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const sonuc = reader.result as string;
                resolve(sonuc.includes(',') ? sonuc.split(',')[1] : sonuc);
            };
            reader.onerror = () => reject(new Error('Dosya okunamadı.'));
            reader.readAsDataURL(blob);
        });

    /**
     * Dışa aktarılan dosyayı cihaza kaydeder.
     *
     * Android uygulamasında tarayıcı indirmesi çalışmadığı için dosya
     * Capacitor Filesystem ile Belgeler klasörüne yazılır ve paylaşım menüsü
     * açılır; kullanıcı dosyayı istediği uygulamaya gönderebilir. Tarayıcıda
     * ise normal indirme kullanılır.
     */
    const saveFile = async (blob: Blob, filename: string) => {
        if (Capacitor.isNativePlatform()) {
            try {
                const base64 = await blobToBase64(blob);
                const { Filesystem, Directory } = await import('@capacitor/filesystem');
                const { Share } = await import('@capacitor/share');

                const yazilan = await Filesystem.writeFile({
                    path: filename,
                    data: base64,
                    directory: Directory.Documents,
                    recursive: true
                });

                await Share.share({
                    title: filename,
                    text: 'Not Bahçesi dışa aktarma',
                    url: yazilan.uri,
                    dialogTitle: 'Dosyayı paylaş'
                });
                return;
            } catch (error) {
                console.error('Dışa aktarma hatası:', error);
                alert(
                    'Dosya kaydedilemedi: ' +
                        (error instanceof Error ? error.message : 'bilinmeyen hata')
                );
                return;
            }
        }

        // Tarayıcı: bağlantıyı DOM'a ekleyip tıklamak, bazı tarayıcılarda
        // indirmenin iptal edilmesini önler.
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    };

    /** Dosya adlarında kullanılan tarih damgası. */
    const tarihDamgasi = () => new Date().toISOString().split('T')[0];

    // Export seçeneklerini kapat
    const handleExportCancel = () => {
        setShowExportOptions(false);
        setExportData(null);
    };

    // JSON dosyasından içe aktar - dosya seçildiğinde modal aç
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const kullaniciId = await kullaniciIdAl();
        if (!kullaniciId) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.gardens || !data.nodes) {
                throw new Error('Geçersiz dosya formatı');
            }

            setImportData(data);
            setShowImportOptions(true);
            setShowExportOptions(false); // Diğerini kapat
        } catch (error) {
            console.error('File read error:', error);
            alert('Dosya okunamadı. Geçerli bir JSON dosyası seçtiğinizden emin olun.');
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Verileri değiştir (mevcut verileri sil, yenilerini ekle)
    const handleImportReplace = async () => {
        if (!importData) return;
        const kullaniciId = await kullaniciIdAl();
        if (!kullaniciId) return;
        setShowImportOptions(false);
        setIsImporting(true);

        try {
            // Mevcut bahçeleri al
            const { data: existingGardens, error: existingError } = await supabase
                .from('gardens')
                .select('id')
                .eq('user_id', kullaniciId)
                .is('deleted_at', null);
            if (existingError) throw existingError;

            // Silme bilgisini Drive senkronuna taşıyabilmek için kayıtları tombstone yap.
            if (existingGardens && existingGardens.length > 0) {
                const gardenIds = existingGardens.map(g => g.id);
                const deletedAt = new Date().toISOString();
                const nodeResult = await supabase
                    .from('nodes')
                    .update({ deleted_at: deletedAt, updated_at: deletedAt })
                    .in('garden_id', gardenIds);
                if (nodeResult.error) throw nodeResult.error;
                const gardenResult = await supabase
                    .from('gardens')
                    .update({ deleted_at: deletedAt, updated_at: deletedAt })
                    .in('id', gardenIds);
                if (gardenResult.error) throw gardenResult.error;
            }

            // Yeni verileri ekle
            await importGardenData(importData);

            alert('Veriler başarıyla değiştirildi!');
            await fetchGardens();
        } catch (error) {
            console.error('Import replace error:', error);
            alert('İçe aktarma sırasında hata oluştu.');
        } finally {
            setIsImporting(false);
            setImportData(null);
        }
    };

    // Verileri mevcut verilere ekle
    const handleImportAppend = async () => {
        if (!importData) return;
        const kullaniciId = await kullaniciIdAl();
        if (!kullaniciId) return;
        setShowImportOptions(false);
        setIsImporting(true);

        try {
            await importGardenData(importData);

            alert('Veriler başarıyla eklendi!');
            await fetchGardens();
        } catch (error) {
            console.error('Import append error:', error);
            alert('İçe aktarma sırasında hata oluştu.');
        } finally {
            setIsImporting(false);
            setImportData(null);
        }
    };

    // Ortak içe aktarma fonksiyonu - Tek tek insert ile güvenilir ID eşleştirmesi
    const importGardenData = async (data: { gardens: any[]; nodes: any[] }) => {
        const kullaniciId = await kullaniciIdAl();
        if (!kullaniciId) return;

        // ID eşleştirme için map
        const gardenIdMap: Record<string, string> = {};
        const nodeIdMap: Record<string, string> = {};

        // Bahçeleri tek tek ekle (sıralama garantisi için)
        for (const garden of data.gardens) {
            const { data: insertedGarden, error: gardenError } = await supabase
                .from('gardens')
                .insert({
                    name: garden.name,
                    user_id: kullaniciId,
                        view_state: garden.view_state,
                        deleted_at: null
                    })
                .select()
                .single();

            if (gardenError) {
                console.error('Garden insert error:', gardenError);
                throw gardenError;
            }

            if (insertedGarden) {
                gardenIdMap[garden.id] = insertedGarden.id;
            }
        }

        // Node'ları seviyelerine göre grupla
        const nodesByLevel: Map<number, any[]> = new Map();
        const nodeLevelCache: Map<string, number> = new Map();

        // Node seviyesini hesapla
        const getNodeLevel = (nodeId: string): number => {
            if (nodeLevelCache.has(nodeId)) {
                return nodeLevelCache.get(nodeId)!;
            }
            const node = data.nodes.find((n: any) => n.id === nodeId);
            if (!node || !node.parent_id) {
                nodeLevelCache.set(nodeId, 0);
                return 0;
            }
            const level = 1 + getNodeLevel(node.parent_id);
            nodeLevelCache.set(nodeId, level);
            return level;
        };

        // Tüm node'ları seviyelerine göre grupla
        for (const node of data.nodes) {
            const level = getNodeLevel(node.id);
            if (!nodesByLevel.has(level)) {
                nodesByLevel.set(level, []);
            }
            nodesByLevel.get(level)!.push(node);
        }

        // Seviyeleri sıralı şekilde işle (0, 1, 2, ...)
        const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);

        for (const level of sortedLevels) {
            const nodesAtLevel = nodesByLevel.get(level)!;

            // Bu seviyedeki node'ları tek tek ekle (sıralama garantisi için)
            for (const node of nodesAtLevel) {
                // Bahçe eşleşmesi yoksa atla
                if (!gardenIdMap[node.garden_id]) continue;

                const { data: insertedNode, error: nodeError } = await supabase
                    .from('nodes')
                    .insert({
                        garden_id: gardenIdMap[node.garden_id],
                        parent_id: node.parent_id ? nodeIdMap[node.parent_id] : null,
                        content: node.content,
                        position_x: node.position_x,
                        position_y: node.position_y,
                        is_expanded: node.is_expanded ?? true,
                        node_type: node.node_type ?? 'auto',
                        deleted_at: null
                    })
                    .select()
                    .single();

                if (nodeError) {
                    console.error('Node insert error:', nodeError);
                    throw nodeError;
                }

                if (insertedNode) {
                    nodeIdMap[node.id] = insertedNode.id;
                }
            }
        }
    };

    // Import seçeneklerini kapat
    const handleImportCancel = () => {
        setShowImportOptions(false);
        setImportData(null);
    };


    return (
                                        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-sand-50/60 p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:p-7">
                                            {/* Export Section */}
                                            <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-soft">
                                                <button
                                                    onClick={handleExportClick}
                                                    disabled={isExporting || gardens.length === 0}
                                                    className="flex w-full items-center justify-between gap-3 px-4 py-3 transition-colors duration-200 hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {isExporting ? (
                                                            <Loader2 size={18} className="text-moss-600 animate-spin" />
                                                        ) : (
                                                            <Download size={18} className="text-moss-600" />
                                                        )}
                                                        <div className="text-left">
                                                            <p className="font-medium text-sand-700 text-sm">Dışa Aktar</p>
                                                            <p className="text-xs text-sand-500">JSON, HTML veya PDF</p>
                                                        </div>
                                                    </div>
                                                    <motion.div
                                                        animate={{ rotate: showExportOptions ? 180 : 0 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        <ChevronDown size={16} className="text-sand-400" />
                                                    </motion.div>
                                                </button>

                                                <AnimatePresence>
                                                    {showExportOptions && exportData && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="px-4 pb-4 pt-2 border-t border-sand-200 space-y-3">
                                                                {exportStep === 'select' ? (
                                                                    <>
                                                                        <p className="text-xs text-sand-600">
                                                                            {selectedGardenIds.size} / {exportData.gardens.length} bahçe seçili
                                                                        </p>

                                                                        {/* Tümünü Seç */}
                                                                        <button
                                                                            onClick={() => { selectAllGardens(); setExportStep('format'); }}
                                                                            className="w-full flex items-center gap-2 px-3 py-2 bg-moss-50 hover:bg-moss-100 border border-moss-200 rounded-lg transition-all text-left"
                                                                        >
                                                                            <TreePine size={14} className="text-moss-600" />
                                                                            <span className="text-xs font-medium text-moss-700">Tümünü Seç ve Devam</span>
                                                                        </button>

                                                                        {/* Bahçe listesi */}
                                                                        <div className="max-h-32 overflow-y-auto space-y-1.5">
                                                                            {exportData.gardens.map(garden => {
                                                                                const nodeCount = exportData.nodes.filter(n => n.garden_id === garden.id).length;
                                                                                const isSelected = selectedGardenIds.has(garden.id);
                                                                                return (
                                                                                    <button
                                                                                        key={garden.id}
                                                                                        onClick={() => toggleGardenSelection(garden.id)}
                                                                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left text-xs ${isSelected
                                                                                            ? 'bg-moss-100 border border-moss-400'
                                                                                            : 'bg-white/80 border border-sand-200 hover:border-moss-300'
                                                                                            }`}
                                                                                    >
                                                                                        <div className={`w-4 h-4 rounded flex items-center justify-center ${isSelected ? 'bg-moss-500' : 'bg-sand-200'}`}>
                                                                                            {isSelected && <span className="text-white text-[10px]">✓</span>}
                                                                                        </div>
                                                                                        <span className="flex-1 truncate text-sand-700">{garden.name}</span>
                                                                                        <span className="text-sand-400">{nodeCount} not</span>
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>

                                                                        <button
                                                                            onClick={() => setExportStep('format')}
                                                                            disabled={selectedGardenIds.size === 0}
                                                                            className="w-full py-2 bg-moss-500 hover:bg-moss-600 text-white text-xs font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        >
                                                                            Devam
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <p className="text-xs text-sand-600">Format seçin:</p>

                                                                        <div className="grid grid-cols-3 gap-2">
                                                                            <button
                                                                                onClick={handleExportJSON}
                                                                                className="flex flex-col items-center gap-1 px-3 py-3 bg-clay-50 hover:bg-clay-100 border border-clay-200 rounded-lg transition-all"
                                                                            >
                                                                                <FileJson size={18} className="text-clay-600" />
                                                                                <span className="text-xs font-medium text-clay-700">JSON</span>
                                                                            </button>
                                                                            <button
                                                                                onClick={handleExportHTML}
                                                                                className="flex flex-col items-center gap-1 px-3 py-3 bg-moss-50 hover:bg-moss-100 border border-moss-200 rounded-lg transition-all"
                                                                            >
                                                                                <FileText size={18} className="text-moss-600" />
                                                                                <span className="text-xs font-medium text-moss-700">HTML</span>
                                                                            </button>
                                                                            <button
                                                                                onClick={handleExportPDF}
                                                                                className="flex flex-col items-center gap-1 px-3 py-3 bg-berry-50 hover:bg-berry-100 border border-berry-200 rounded-lg transition-all"
                                                                            >
                                                                                <FileType size={18} className="text-berry-600" />
                                                                                <span className="text-xs font-medium text-berry-700">PDF</span>
                                                                            </button>
                                                                        </div>

                                                                        <button
                                                                            onClick={() => setExportStep('select')}
                                                                            className="w-full py-2 bg-sand-100 hover:bg-sand-200 text-sand-600 text-xs font-medium rounded-lg transition-all"
                                                                        >
                                                                            ← Geri
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {/* Import Section */}
                                            <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-soft">
                                                <button
                                                    onClick={() => {
                                                        if (showImportOptions) {
                                                            handleImportCancel();
                                                        } else {
                                                            fileInputRef.current?.click();
                                                        }
                                                    }}
                                                    disabled={isImporting}
                                                    className="flex w-full items-center justify-between gap-3 px-4 py-3 transition-colors duration-200 hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {isImporting ? (
                                                            <Loader2 size={18} className="text-clay-600 animate-spin" />
                                                        ) : (
                                                            <Upload size={18} className="text-clay-600" />
                                                        )}
                                                        <div className="text-left">
                                                            <p className="font-medium text-sand-700 text-sm">İçe Aktar</p>
                                                            <p className="text-xs text-sand-500">JSON dosyasından yükle</p>
                                                        </div>
                                                    </div>
                                                    {showImportOptions && (
                                                        <motion.div
                                                            animate={{ rotate: 180 }}
                                                            transition={{ duration: 0.2 }}
                                                        >
                                                            <ChevronDown size={16} className="text-sand-400" />
                                                        </motion.div>
                                                    )}
                                                </button>

                                                <AnimatePresence>
                                                    {showImportOptions && importData && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="px-4 pb-4 pt-2 border-t border-sand-200 space-y-3">
                                                                <p className="text-xs text-sand-600">
                                                                    {importData.gardens.length} bahçe, {importData.nodes.length} not bulundu
                                                                </p>

                                                                <button
                                                                    onClick={handleImportAppend}
                                                                    className="w-full flex items-center gap-3 px-3 py-2.5 bg-moss-50 hover:bg-moss-100 border border-moss-200 rounded-lg transition-all text-left"
                                                                >
                                                                    <Upload size={16} className="text-moss-600" />
                                                                    <div>
                                                                        <p className="text-xs font-medium text-moss-700">Mevcut Verilere Ekle</p>
                                                                        <p className="text-[10px] text-moss-500">Verileriniz korunur</p>
                                                                    </div>
                                                                </button>

                                                                <button
                                                                    onClick={handleImportReplace}
                                                                    className="w-full flex items-center gap-3 px-3 py-2.5 bg-berry-50 hover:bg-berry-100 border border-berry-200 rounded-lg transition-all text-left"
                                                                >
                                                                    <Database size={16} className="text-berry-600" />
                                                                    <div>
                                                                        <p className="text-xs font-medium text-berry-700">Verileri Değiştir</p>
                                                                        <p className="text-[10px] text-berry-500">Mevcut veriler silinir</p>
                                                                    </div>
                                                                </button>

                                                                <button
                                                                    onClick={handleImportCancel}
                                                                    className="w-full py-2 bg-sand-100 hover:bg-sand-200 text-sand-600 text-xs font-medium rounded-lg transition-all"
                                                                >
                                                                    İptal
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
    );
}
