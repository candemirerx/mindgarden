import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { text, clientApiKey, provider = 'gemini', customUrl } = await request.json();

        if (!text || text.trim().length === 0) {
            return NextResponse.json({ correctedText: text });
        }

        const apiKey = clientApiKey || (provider === 'gemini' ? process.env.GEMINI_API_KEY : undefined);
        if (!apiKey) {
            return NextResponse.json(
                { error: 'API anahtarı bulunamadı. Lütfen Ayarlar bölümünden bir Model Provider ekleyin.' },
                { status: 400 }
            );
        }

        const prompt = `Sen bir Türkçe imla ve yazım düzeltici asistansın. Aşağıdaki metni düzelt:
- Sadece yazım ve imla hatalarını düzelt
- Noktalama işaretlerini düzelt
- Büyük/küçük harf kullanımını düzelt
- İçeriği, anlamı veya cümle yapısını DEĞİŞTİRME
- Yeni kelime veya cümle EKLEME
- Sadece düzeltilmiş metni döndür, açıklama yapma

Metin:
${text}`;

        let correctedText = text;

        if (provider === 'gemini') {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
                    })
                }
            );

            if (!response.ok) {
                // gemini-2.5-flash fallback if 2.5 is not available yet (just in case)
                const fallbackResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
                        })
                    }
                );
                
                if (!fallbackResponse.ok) {
                   throw new Error(await fallbackResponse.text());
                }
                const data = await fallbackResponse.json();
                correctedText = data.candidates?.[0]?.content?.parts?.[0]?.text || text;
            } else {
                const data = await response.json();
                correctedText = data.candidates?.[0]?.content?.parts?.[0]?.text || text;
            }

        } else if (provider === 'openai') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1
                })
            });
            if (!response.ok) throw new Error(await response.text());
            const data = await response.json();
            correctedText = data.choices?.[0]?.message?.content || text;

        } else if (provider === 'anthropic') {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 4096,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1
                })
            });
            if (!response.ok) throw new Error(await response.text());
            const data = await response.json();
            correctedText = data.content?.[0]?.text || text;

        } else if (provider === 'custom') {
            if (!customUrl) {
                return NextResponse.json({ error: 'Custom Base URL belirtilmedi.' }, { status: 400 });
            }
            
            // Custom provider genellikle OpenAI formatıyla uyumludur
            const baseUrl = customUrl.endsWith('/') ? customUrl.slice(0, -1) : customUrl;
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'default', // Model id esnek, genellikle default kabul edilir veya url den alınır
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1
                })
            });
            if (!response.ok) throw new Error(await response.text());
            const data = await response.json();
            correctedText = data.choices?.[0]?.message?.content || text;
        }

        return NextResponse.json({ correctedText: correctedText.trim() });
    } catch (error) {
        console.error('Spellcheck error:', error);
        return NextResponse.json(
            { error: 'Yapay Zeka servisine bağlanılamadı. Lütfen ayarlarınızı kontrol edin.' },
            { status: 500 }
        );
    }
}
