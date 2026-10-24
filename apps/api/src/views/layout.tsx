import type { Child } from 'hono/jsx';

const CSS = `
:root{--bg:#f6f7f6;--surface:#fff;--ink:#14211d;--ink-2:#3e4c48;--ink-3:#66746f;--line:#e2e7e5;--accent:#087f6d;--accent-soft:#e7f3f0;
--danger:#b42318;--danger-soft:#fdecea;--warn:#8a5a00;--warn-soft:#fdf3dc;--radius:14px;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#0f1513;--surface:#161e1b;--ink:#e8eeec;--ink-2:#b9c5c1;--ink-3:#8b9994;--line:#26312d;
--accent:#3fbfa6;--accent-soft:#16302a;--danger:#ff8a80;--danger-soft:#3a1d1b;--warn:#f2c46b;--warn-soft:#352a12;color-scheme:dark}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
main{max-width:860px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:24px;line-height:1.25;letter-spacing:-.01em;margin:0 0 4px}h2{font-size:17px;margin:32px 0 12px}h3{font-size:15px;margin:0}
p{margin:0}.muted{color:var(--ink-3)}.small{font-size:13px}
.bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:16px;border-bottom:1px solid var(--line);margin-bottom:20px}
.brand{font-weight:650;letter-spacing:-.01em;color:var(--accent)}
.notice{padding:12px 14px;border-radius:12px;background:var(--warn-soft);color:var(--warn);font-size:13px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:16px}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px 20px}
.fact dt{font-size:12px;color:var(--ink-3);margin:0}.fact dd{margin:2px 0 0;font-weight:560}
.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{padding:3px 10px;border-radius:999px;background:var(--accent-soft);color:var(--ink);font-size:13px}
.chip.alert{background:var(--danger-soft);color:var(--danger);font-weight:600}
.record{border-top:1px solid var(--line);padding:18px 0}.record:first-child{border-top:0;padding-top:4px}
.meta{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:13px;color:var(--ink-3);margin-top:4px}
.summary{margin-top:10px;color:var(--ink-2)}
table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line)}
th{font-weight:600;color:var(--ink-3)}.flag-high,.flag-low{color:var(--danger);font-weight:600}
.pages{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.pages a{display:block;border:1px solid var(--line);border-radius:10px;overflow:hidden;width:120px;height:150px;background:var(--bg)}
.pages img{width:100%;height:100%;object-fit:cover}.pages .pdf{display:flex;align-items:center;justify-content:center;height:100%;font-size:13px;color:var(--ink-2)}
.btn{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 14px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-weight:560;text-decoration:none;cursor:pointer}
.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.call{font-size:17px;min-height:52px;width:100%;justify-content:center}
footer{margin-top:40px;font-size:12px;color:var(--ink-3)}
@media print{.noprint{display:none!important}body{background:#fff;color:#000}.card{border-color:#ccc}main{max-width:none;padding:0}.pages{display:none}}
`;

export function Page(props: { title: string; children: Child; robots?: string }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content={props.robots ?? 'noindex, nofollow'} />
        <meta name="referrer" content="no-referrer" />
        <title>{props.title}</title>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </head>
      <body>
        <main>{props.children}</main>
      </body>
    </html>
  );
}

export function Notice(props: { title: string; message: string }) {
  return (
    <Page title={props.title}>
      <div class="bar">
        <span class="brand">MedRec</span>
      </div>
      <h1>{props.title}</h1>
      <p class="muted" style="margin-top:8px;max-width:52ch">{props.message}</p>
    </Page>
  );
}
