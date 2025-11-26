import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { text } = await request.json();

        if (!text || text.trim().length === 0) {
            return NextResponse.json({ correctedText: text });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'API anahtarı yapılandırılmamış' },
                { status: 500 }
            );
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Sen bir Türkçe imla ve yazım düzeltici asistansın. Aşağıdaki metni düzelt:
- Sadece yazım ve imla hatalarını düzelt
- Noktalama işaretlerini düzelt
- Büyük/küçük harf kullanımını düzelt
- İçeriği, anlamı veya cümle yapısını DEĞİŞTİRME
- Yeni kelime veya cümle EKLEME
- Sadece düzeltilmiş metni döndür, açıklama yapma

Metin:
${text}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 8192,
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error('Gemini API error:', error);
            return NextResponse.json(
                { error: 'AI servisi hatası' },
                { status: 500 }
            );
        }

        const data = await response.json();
        const correctedText = data.candidates?.[0]?.content?.parts?.[0]?.text || text;

        return NextResponse.json({ correctedText: correctedText.trim() });
    } catch (error) {
        console.error('Spellcheck error:', error);
        return NextResponse.json(
            { error: 'İşlem sırasında hata oluştu' },
            { status: 500 }
        );
    }
}
