import { useStore } from './store/useStore';
import { supabase } from './supabaseClient';

/** Serialized per tab so repeated taps cannot create parallel gardens. */
let exporting = false;
export async function exportBilgeTree(title: string, text: string) {
    if (exporting) throw new Error('Önceki aktarımın tamamlanmasını bekleyin.');
    if (!text.trim()) throw new Error('Aktarılacak metin boş.');
    exporting = true;
    try {
        const { data: session, error: authError } = await supabase.auth.getSession();
        if (authError || !session.session?.user) throw new Error('Bahçeye aktarabilmek için uygulamaya giriş yapın.');
        const userId = session.session.user.id;
        const result = await supabase.from('gardens').select('*').eq('user_id', userId).eq('name', 'Bilge Ağaç').is('deleted_at', null).order('created_at', { ascending: true });
        if (result.error) throw new Error('Bilge Ağaç bahçesi kontrol edilemedi. Tekrar deneyin.');
        let garden = result.data?.[0];
        if (!garden) {
            const created = await supabase.from('gardens').insert([{ name: 'Bilge Ağaç', user_id: userId, updated_at: new Date().toISOString(), deleted_at: null }]).select().single();
            if (created.error || !created.data) throw new Error('Bahçe oluşturulamadı. Metniniz editörde korunuyor.');
            garden = created.data;
        }
        const node = await useStore.getState().addNode(garden.id, `${title.trim() || 'Bilge Ağaç notu'}\n${text}`);
        if (!node) throw new Error('Ağaç kaydedilemedi. Metniniz editörde korunuyor; yeniden deneyin.');
        // The tree is already saved. A sidebar refresh failure must not invite
        // another transfer and create a duplicate tree.
        await useStore.getState().fetchGardens().catch(() => {});
        return node;
    } finally { exporting = false; }
}
