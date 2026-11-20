import {test, expect} from './catalog-test';
import type {Page} from '@playwright/test';
import type {} from './media-test-dom';

async function observePdfWorkers(page: Page) {
  await page.addInitScript(() => {
    const NativeWorker = Worker;
    window.mediaWorkerProbe = [];
    window.Worker = class extends NativeWorker {
      private readonly record = {terminated: 0};

      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        if (new URL(url, document.baseURI).pathname.endsWith('/pdf.worker.mjs')) {
          window.mediaWorkerProbe.push(this.record);
        }
      }

      override terminate() {
        this.record.terminated++;
        super.terminate();
      }
    };
  });
}

function terminations(page: Page) {
  return page.evaluate(() => window.mediaWorkerProbe.map(worker => worker.terminated));
}

test('clearing a pending PDF and destroying its replacement release the workers before either response arrives', async ({page}) => {
  await observePdfWorkers(page);
  await page.goto('/catalog/media');
  const pdf = page.getByTestId('pdf');
  await expect(pdf.locator('canvas')).toBeVisible();

  let requests = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/sample.pdf?held=*', async route => {
    requests++;
    await gate;
    await route.continue();
  });
  try {
    await page.evaluate(() => window.__mediaCatalog.pdfSrc.set('/assets/media/sample.pdf?held=first'));
    await expect.poll(() => requests).toBe(1);
    await expect(pdf.getByRole('status')).toContainText('PDFを読込み中です。');
    await expect(pdf.locator('canvas')).toBeHidden();
    await expect.poll(() => terminations(page)).toEqual([1, 0]);

    await page.evaluate(() => window.__mediaCatalog.pdfSrc.set(null));
    await expect(pdf.getByRole('status')).toContainText('PDFを選択してください。');
    await expect(pdf.getByRole('button', {name: 'PDFをダウンロード'})).toBeDisabled();
    await expect.poll(() => terminations(page)).toEqual([1, 1]);

    await page.evaluate(() => window.__mediaCatalog.pdfSrc.set('/assets/media/sample.pdf?held=second'));
    await expect.poll(() => requests).toBe(2);
    await page.getByRole('button', {name: '媒体を生成・破棄'}).click();
    await expect(pdf).toHaveCount(0);
    await expect.poll(() => terminations(page)).toEqual([1, 1, 1]);
  } finally {
    release();
    await page.unrouteAll({behavior: 'wait'});
  }
  await page.evaluate(() => window.__mediaCatalog.pdfSrc.set('/assets/media/sample.pdf'));
  await page.getByRole('button', {name: '媒体を生成・破棄'}).click();
  await expect(pdf.locator('canvas')).toBeVisible();
  await expect(pdf.getByRole('status')).toContainText('1 / 2');
  await expect(pdf.locator('.ui-media-error')).toHaveCount(0);
  await expect.poll(() => terminations(page)).toEqual([1, 1, 1, 0]);
});

test('retrying the same loaded PDF hides the old canvas and restores its selected page', async ({page}) => {
  await observePdfWorkers(page);
  await page.goto('/catalog/media');
  const pdf = page.getByTestId('pdf');
  await expect(pdf.locator('canvas')).toBeVisible();
  await pdf.getByRole('button', {name: '次のページ'}).click();
  await expect(pdf.locator('.ui-pdf-text')).toContainText('Second PDF page');

  const pageNumber = pdf.getByRole('spinbutton', {name: 'ページ', exact: true});
  await pageNumber.fill('99');
  await pageNumber.press('Tab');
  const retry = pdf.getByRole('button', {name: 'PDFを再取得'});
  await expect(retry).toBeVisible();

  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/assets/media/sample.pdf', async route => {
    await gate;
    await route.continue();
  });
  try {
    await retry.click();
    await expect(pdf.getByRole('status')).toContainText('PDFを読込み中です。');
    await expect(pdf.locator('canvas')).toBeHidden();
    await expect(pdf.locator('.ui-pdf-text')).toHaveCount(0);
    await expect(pageNumber).toBeDisabled();
    await expect(retry).toHaveCount(0);
    await expect.poll(() => terminations(page)).toEqual([1, 0]);
  } finally {
    release();
    await page.unrouteAll({behavior: 'wait'});
  }
  await expect(pdf.locator('canvas')).toBeVisible();
  await expect(pageNumber).toHaveValue('2');
  await expect(pdf.locator('.ui-pdf-text')).toContainText('Second PDF page');
  await expect(pdf.getByRole('status')).toContainText('2 / 2');
});

declare global {
  interface Window {
    heldPdfBlob: {reading: boolean; finish: () => void};
  }
}

test('replacing a pending Blob PDF releases its worker while the replacement byte array renders', async ({page}) => {
  await observePdfWorkers(page);
  await page.goto('/catalog/media');
  const pdf = page.getByTestId('pdf');
  await expect(pdf.locator('canvas')).toBeVisible();

  await page.evaluate(async () => {
    const bytes = await (await fetch('/assets/media/sample.pdf')).arrayBuffer();
    let finish!: () => void;
    const gate = new Promise<void>(resolve => { finish = resolve; });
    const probe: Window['heldPdfBlob'] = {reading: false, finish};
    window.heldPdfBlob = probe;
    class HeldPdf extends Blob {
      override async arrayBuffer(): Promise<ArrayBuffer> {
        probe.reading = true;
        await gate;
        return super.arrayBuffer();
      }
    }
    window.__mediaCatalog.pdfSrc.set(new HeldPdf([bytes], {type: 'application/pdf'}));
  });
  try {
    await expect.poll(() => page.evaluate(() => window.heldPdfBlob.reading)).toBe(true);
    await page.evaluate(async () => {
      const bytes = await (await fetch('/assets/media/sample.pdf')).arrayBuffer();
      window.__mediaCatalog.pdfSrc.set(new Uint8Array(bytes));
    });
    await expect(pdf.locator('canvas')).toBeVisible();
    await expect(pdf.locator('.ui-pdf-text')).toContainText('First PDF page');
    await expect.poll(() => terminations(page)).toEqual([1, 1, 0]);
  } finally {
    await page.evaluate(() => window.heldPdfBlob.finish());
  }
  await expect(pdf.getByRole('status')).toContainText('1 / 2');
  await expect(pdf.locator('.ui-media-error')).toHaveCount(0);
});
