import mammoth from 'mammoth';

export interface ExtractedFileResult {
  fileName: string;
  fileType: string;
  fileSize: number;
  textContent: string;
  base64Data?: string;
  mimeType?: string;
}

export async function extractFileContent(file: File): Promise<ExtractedFileResult> {
  const fileName = file.name;
  const fileSize = file.size;
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  let textContent = '';
  let base64Data: string | undefined = undefined;
  let mimeType: string | undefined = file.type || undefined;

  if (extension === 'txt') {
    textContent = await file.text();
    mimeType = 'text/plain';
  } else if (extension === 'docx') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      textContent = result.value || '';
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } catch (err) {
      console.warn('Mammoth extraction failed:', err);
      textContent = `[DOCX Document: ${fileName}]`;
    }
  } else if (['jpg', 'jpeg', 'png', 'webp', 'pdf', 'ppt', 'pptx'].includes(extension)) {
    // For images, PDFs, PPTs, convert to base64 so Gemini API can process directly
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64Data = btoa(binary);

    if (['jpg', 'jpeg'].includes(extension)) mimeType = 'image/jpeg';
    else if (extension === 'png') mimeType = 'image/png';
    else if (extension === 'webp') mimeType = 'image/webp';
    else if (extension === 'pdf') mimeType = 'application/pdf';
    else mimeType = 'application/octet-stream';

    textContent = `[Binary Document ${fileName} - ${mimeType}]`;
  } else {
    // Default fallback read as text
    try {
      textContent = await file.text();
    } catch (e) {
      textContent = `[Document: ${fileName}]`;
    }
  }

  return {
    fileName,
    fileType: extension.toUpperCase(),
    fileSize,
    textContent,
    base64Data,
    mimeType,
  };
}
