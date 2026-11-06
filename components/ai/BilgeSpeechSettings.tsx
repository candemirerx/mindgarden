'use client';
import { useEffect, useRef, useState } from 'react';
import { Volume2, Square, Download } from 'lucide-react';
import { bilgeVoices, DEFAULT_BILGE_SPEECH, installBilgeVoices, readBilgeSpeech, saveBilgeSpeech, speakBilge, stopBilgeSpeech, type BilgeSpeechPrefs, type BilgeVoice } from '@/lib/bilgeSpeech';

export default function BilgeSpeechSettings() {
    const [prefs, setPrefs] = useState(DEFAULT_BILGE_SPEECH);
    const [engines, setEngines] = useState<{ id: string; name: string }[]>([]);
    const [voices, setVoices] = useState<BilgeVoice[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [playing, setPlaying] = useState(false);
    const generation = useRef(0);
    const load = async (engine: string) => {
        const token = ++generation.current; setLoading(true); setError('');
        try { const data = await bilgeVoices(engine); if (token === generation.current) { setEngines(data.engines); setVoices(data.voices); } }
        catch (e) { if (token === generation.current) setError(e instanceof Error ? e.message : 'Sesler yüklenemedi.'); }
        finally { if (token === generation.current) setLoading(false); }
    };
    useEffect(() => {
        const token = generation;
        const p = readBilgeSpeech(); setPrefs(p); void load(p.engine);
        const focus = () => void load(readBilgeSpeech().engine); window.addEventListener('focus', focus);
        return () => { token.current++; window.removeEventListener('focus', focus); void stopBilgeSpeech().catch(() => {}); };
    }, []);
    const change = (p: BilgeSpeechPrefs) => { setPrefs(p); try { saveBilgeSpeech(p); } catch { setError('Ses tercihi kaydedilemedi.'); } };
    const sample = async () => {
        if (playing) { await stopBilgeSpeech(); setPlaying(false); return; }
        setPlaying(true); setError('');
        try { await speakBilge('Merhaba, ben Bilge Ağaç. Biraz bilgi, biraz merak; birlikte güzel fikirler yetiştirelim.', prefs); }
        catch (e) { setError(e instanceof Error ? e.message : 'Seslendirilemedi.'); }
        finally { setPlaying(false); }
    };
    return <fieldset className="space-y-3 rounded-2xl border border-sand-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-sand-900">Bilge’nin sesi · Türkçe</legend>
        <label className="block text-xs text-sand-600">Ses motoru<select aria-label="Ses motoru" disabled={loading || playing} value={prefs.engine} onChange={e => { change({ ...prefs, engine: e.target.value, voice: '' }); void load(e.target.value); }} className="mt-1 min-h-11 w-full rounded-xl border border-sand-200 bg-paper px-2 text-sm"><option value="">Sistem varsayılanı</option>{engines.filter(e => e.id).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
        <label className="block text-xs text-sand-600">Türkçe ses<select aria-label="Türkçe ses" disabled={loading || playing} value={prefs.voice} onChange={e => change({ ...prefs, voice: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-sand-200 bg-paper px-2 text-sm"><option value="">Otomatik · önce cihaz içi Türkçe</option>{voices.map(v => <option key={v.id} value={v.id}>{v.name}{v.network ? ' · çevrimiçi' : ' · cihaz içi'}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-4"><label className="text-xs text-sand-600">Hız · {prefs.rate.toFixed(2)}<input aria-label="Konuşma hızı" type="range" min="0.5" max="1.5" step="0.01" value={prefs.rate} onChange={e => change({ ...prefs, rate: Number(e.target.value) })} className="mt-2 min-h-8 w-full accent-moss-600" /></label><label className="text-xs text-sand-600">Ses tonu · {prefs.pitch.toFixed(2)}<input aria-label="Ses tonu" type="range" min="0.7" max="1.3" step="0.02" value={prefs.pitch} onChange={e => change({ ...prefs, pitch: Number(e.target.value) })} className="mt-2 min-h-8 w-full accent-moss-600" /></label></div>
        <p className="text-xs leading-5 text-sand-500">Varsayılan ton sakin ve hafif yavaş. Sesin karakteri kurulu motora bağlıdır. Çevrimiçi ses seçersen okunan metin ses sağlayıcısına gidebilir. Seslendirme kendiliğinden başlamaz.</p>
        {!loading && !voices.length && <p className="text-xs text-sand-600">Bu motorda Türkçe ses görünmüyor. Türkçe ses paketi yükleyin veya başka motor seçin.</p>}
        <div className="flex flex-wrap gap-2"><button type="button" disabled={loading} onClick={() => void sample()} className="btn btn-secondary min-h-11 text-xs">{playing ? <Square size={15} /> : <Volume2 size={15} />}{playing ? 'Durdur' : 'Sesi dene'}</button><button type="button" disabled={loading || playing} onClick={() => void installBilgeVoices(prefs.engine).catch(e => setError(e.message))} className="btn btn-ghost min-h-11 text-xs"><Download size={15} />Ses paketi yükle</button></div>
        {error && <p role="alert" className="text-xs text-berry-700">{error}</p>}
    </fieldset>;
}
