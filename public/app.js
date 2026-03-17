const docsInput = document.getElementById('docs');
const processBtn = document.getElementById('processBtn');
const resetBtn = document.getElementById('resetBtn');
const uploadResult = document.getElementById('uploadResult');
const askBtn = document.getElementById('askBtn');
const question = document.getElementById('question');
const answer = document.getElementById('answer');
const chunkCount = document.getElementById('chunkCount');

let chunks = [];

const refreshChunkCount = () => {
  chunkCount.textContent = `${chunks.length} chunks`;
};

const splitIntoChunks = (text, source, chunkSize = 700) => {
  const clean = text.replace(/\s+/g, ' ').trim();
  const out = [];
  for (let i = 0; i < clean.length; i += chunkSize) {
    out.push({ source, text: clean.slice(i, i + chunkSize) });
  }
  return out;
};

async function extractPdf(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((it) => it.str).join(' '));
  }
  return pages.join('\n');
}

async function extractDocx(file) {
  const buffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value || '';
}

async function extractSheet(file) {
  const buffer = await file.arrayBuffer();
  const workbook = window.XLSX.read(buffer, { type: 'array' });
  const lines = [];
  workbook.SheetNames.forEach((name) => {
    const rows = window.XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, blankrows: false });
    lines.push(`Sheet: ${name}`);
    rows.forEach((r) => lines.push(r.join(' | ')));
  });
  return lines.join('\n');
}

async function extractImage(file) {
  const worker = await window.Tesseract.createWorker('eng');
  const result = await worker.recognize(file);
  await worker.terminate();
  return result.data.text || '';
}

async function extractText(file) {
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'pdf') return extractPdf(file);
  if (ext === 'docx') return extractDocx(file);
  if (['xlsx', 'xls', 'csv'].includes(ext)) return extractSheet(file);
  if (['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(ext)) return extractImage(file);
  return '';
}

processBtn.addEventListener('click', async () => {
  if (!docsInput.files.length) {
    uploadResult.textContent = 'Please select files first.';
    return;
  }

  processBtn.disabled = true;
  processBtn.textContent = 'Processing...';
  const processed = [];

  for (const file of docsInput.files) {
    try {
      const text = await extractText(file);
      const c = splitIntoChunks(text, file.name);
      chunks.push(...c);
      processed.push({ file: file.name, chars: text.length, chunks: c.length });
    } catch (error) {
      processed.push({ file: file.name, error: error.message });
    }
  }

  uploadResult.textContent = JSON.stringify({ status: 'processed', processed, totalChunks: chunks.length }, null, 2);
  refreshChunkCount();
  processBtn.disabled = false;
  processBtn.textContent = 'Process files';
});

askBtn.addEventListener('click', () => {
  const q = question.value.trim();
  if (!q) {
    answer.textContent = 'Type a question first.';
    return;
  }
  if (!chunks.length) {
    answer.textContent = 'No document context yet. Process files first.';
    return;
  }

  const tokens = q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const ranked = chunks
    .map((chunk) => {
      let score = 0;
      const t = chunk.text.toLowerCase();
      tokens.forEach((token) => {
        if (t.includes(token)) score += 1;
      });
      return { ...chunk, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (!ranked.length) {
    answer.textContent = "I couldn't find relevant content in the uploaded files for that question.";
    return;
  }

  const summary = ranked
    .map((item, idx) => `${idx + 1}. [${item.source}] ${item.text.slice(0, 280)}...`)
    .join('\n\n');

  answer.textContent = `Best matching snippets:\n\n${summary}`;
});

resetBtn.addEventListener('click', () => {
  chunks = [];
  docsInput.value = '';
  question.value = '';
  uploadResult.textContent = 'Memory reset complete.';
  answer.textContent = '';
  refreshChunkCount();
});

refreshChunkCount();
