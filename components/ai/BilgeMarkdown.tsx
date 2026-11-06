'use client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { bilgeDestination, bilgeWebUrl } from '@/lib/bilgeLinks';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/** Raw HTML is deliberately disabled; model output is never executable markup. */
export default function BilgeMarkdown({ text, onNavigate }: { text: string; onNavigate?: (href: string) => void }) {
    return <div className="bilge-markdown min-w-0 break-words text-sm leading-7">
        <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
            a: ({ href, children }) => {
                const target = href ? bilgeDestination(href) : null;
                const style = 'mx-0.5 my-1 inline-flex max-w-full items-center gap-1 rounded-full border border-moss-200 bg-moss-50 px-3 py-1 text-xs font-medium leading-6 text-moss-800 no-underline align-middle hover:bg-moss-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500';
                if (target) return <button type="button" disabled={!onNavigate} onClick={() => onNavigate?.(href!)} className={style} aria-label={`${target.label} bölümünü aç`}>{target.label}<span aria-hidden="true"> →</span></button>;
                const url = href ? bilgeWebUrl(href) : null;
                if (!url) return <span>{children}</span>;
                // Bare/autolink URLs get a compact host label; named sources keep their label.
                const rawLabel = typeof children === 'string' ? children : Array.isArray(children) && children.every(c => typeof c === 'string') ? children.join('') : null;
                const label = rawLabel ? (/^(https?:\/\/|www\.)/i.test(rawLabel) ? url.hostname.replace(/^www\./, '') : rawLabel.slice(0, 70)) : children;
                return <a href={url.href} title={url.hostname} target="_blank" rel="noopener noreferrer" className={style} onClick={event => { if (Capacitor.isNativePlatform()) { event.preventDefault(); void Browser.open({ url: url.href }).catch(() => window.open(url.href, '_blank', 'noopener,noreferrer')); } }}>{label}<span aria-hidden="true"> ↗</span></a>;
            },
            img: ({ alt }) => <span>{alt || '[Görsel bağlantısı]'}</span>,
            pre: ({ children }) => <pre className="my-3 max-w-full overflow-x-auto rounded-xl bg-sand-100 p-3 font-mono text-xs leading-6">{children}</pre>,
            code: ({ children }) => <code className="rounded bg-sand-100 px-1 font-mono text-[.9em]">{children}</code>,
            h1: ({ children }) => <h3 className="mb-2 mt-4 text-lg font-semibold">{children}</h3>,
            h2: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold">{children}</h3>,
            h3: ({ children }) => <h4 className="mb-2 mt-3 font-semibold">{children}</h4>,
            p: ({ children }) => <p className="my-2 whitespace-pre-wrap">{children}</p>,
            ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
            ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
            blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-moss-400 pl-3 text-sand-600">{children}</blockquote>,
            table: ({ children }) => <div className="my-3 max-w-full overflow-x-auto"><table className="w-full border-collapse text-left text-xs">{children}</table></div>,
            th: ({ children }) => <th className="border border-sand-200 p-2 font-semibold">{children}</th>,
            td: ({ children }) => <td className="border border-sand-200 p-2">{children}</td>
        }}>{text}</ReactMarkdown>
    </div>;
}
