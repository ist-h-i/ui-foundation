import { serializeTableMatrix } from './table-advanced-model';
/** App-side browser adapters. Return values confirm API completion, never a saved file or printed page. */
export async function copyTableMatrix(matrix: readonly (readonly string[])[], writer: (text: string) => Promise<void> = (text) => navigator.clipboard.writeText(text)): Promise<void> { await writer(serializeTableMatrix(matrix)); }
export function downloadTableCsv(matrix: readonly (readonly string[])[], filename: string, document: Document = globalThis.document): void {
    if (!filename.trim())
        throw new Error('CSVファイル名を指定してください。');
    const blob = new Blob(['\uFEFF', serializeTableMatrix(matrix, ',')], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.append(anchor);
    try {
        anchor.click();
    }
    finally {
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    }
}
/** The app owns the frame's lifetime, the print action and afterprint cleanup. Pass the token/profile scope explicitly when scoped below the document root. */
export function createTablePrintDocument(matrix: readonly (readonly string[])[], title: string, document: Document = globalThis.document, scope: Element = document.documentElement): {
    frame: HTMLIFrameElement;
    print: () => void;
    destroy: () => void;
} {
    if (!title.trim())
        throw new Error('印刷対象の表題を指定してください。');
    const frame = document.createElement('iframe');
    frame.title = title + 'の印刷';
    frame.hidden = true;
    document.body.append(frame);
    const target = frame.contentDocument;
    if (!target) {
        frame.remove();
        throw new Error('印刷領域を作成できませんでした。');
    }
    target.title = title;
    target.documentElement.lang = document.documentElement.lang;
    target.documentElement.dir = scope.ownerDocument.defaultView?.getComputedStyle(scope).direction ?? document.documentElement.dir;
    const sourceView = scope.ownerDocument.defaultView;
    const sourceStyle = sourceView?.getComputedStyle(scope);
    // Custom properties retain rem units in their computed token values. Preserve
    // the source document's rem base rather than the iframe's initial 16px base.
    const rootFontSize = sourceView?.getComputedStyle(scope.ownerDocument.documentElement).fontSize;
    if (rootFontSize)
        target.documentElement.style.fontSize = rootFontSize;
    for (const name of ['font-body', 'text-body', 'leading-body', 'weight-control', 'space-page', 'space-table-y', 'space-table-x', 'border-control', 'color-border', 'color-text', 'color-surface']) {
        const value = sourceStyle?.getPropertyValue('--ui-' + name).trim();
        if (value)
            target.documentElement.style.setProperty('--ui-' + name, value);
    }
    const style = target.createElement('style');
    style.textContent = 'body{margin:0;padding:var(--ui-space-page);font-family:var(--ui-font-body);font-size:var(--ui-text-body);line-height:var(--ui-leading-body);color:var(--ui-color-text);background:var(--ui-color-surface);}h1{font:inherit;font-weight:var(--ui-weight-control);overflow-wrap:anywhere;}table{border-collapse:collapse;inline-size:100%;}th,td{border:var(--ui-border-control) solid var(--ui-color-border);padding:var(--ui-space-table-y) var(--ui-space-table-x);text-align:start;vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere;}th{font-weight:var(--ui-weight-control);}';
    target.head.append(style);
    const heading = target.createElement('h1');
    heading.textContent = title;
    target.body.append(heading);
    const table = target.createElement('table');
    matrix.forEach((row, index) => {
        const tr = target.createElement('tr');
        row.forEach(value => {
            const cell = target.createElement(index === 0 ? 'th' : 'td');
            if (index === 0)
                cell.setAttribute('scope', 'col');
            cell.textContent = value;
            tr.append(cell);
        });
        table.append(tr);
    });
    target.body.append(table);
    let destroyed = false;
    return { frame, print: () => {
            if (destroyed || !frame.contentWindow)
                throw new Error('印刷領域が終了しています。');
            frame.contentWindow.print();
        }, destroy: () => { destroyed = true; frame.remove(); } };
}
