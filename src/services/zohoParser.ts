import JSZip from 'jszip';
import { NoteItem, DetectedObligation, ParsedImportResult, RecurrenceType, Commitment } from '../types';

export class ZohoParserService {
  /**
   * Main entry point: Parses any uploaded file (ZIP, JSON, HTML, CSV, TXT)
   */
  public async parseFile(
    file: File,
    existingNotes: NoteItem[],
    existingCommitments: Commitment[]
  ): Promise<ParsedImportResult> {
    const fileName = file.name.toLowerCase();
    let notes: NoteItem[] = [];
    let fileType = 'Unknown';

    if (fileName.endsWith('.zip')) {
      fileType = 'Zoho Notebook ZIP Archive';
      notes = await this.parseZipFile(file);
    } else if (fileName.endsWith('.json')) {
      fileType = 'Zoho Notebook JSON Export';
      const text = await file.text();
      notes = this.parseJsonContent(text, file.name);
    } else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
      fileType = 'Zoho Notebook HTML Export';
      const text = await file.text();
      notes = [this.parseHtmlContent(text, file.name)];
    } else if (fileName.endsWith('.csv')) {
      fileType = 'Zoho Notebook CSV Export';
      const text = await file.text();
      notes = this.parseCsvContent(text);
    } else {
      fileType = 'Text Document';
      const text = await file.text();
      notes = [
        {
          id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          content: text,
          tags: ['استيراد'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'zoho',
        },
      ];
    }

    // Run Intelligence Engine to detect monthly commitments
    const detectedObligations = this.detectObligations(notes);

    // Duplicate detection
    const duplicates: { note: NoteItem; existingNoteId: string }[] = [];
    for (const note of notes) {
      const match = existingNotes.find(
        (en) =>
          en.title.trim().toLowerCase() === note.title.trim().toLowerCase() ||
          (en.content && note.content && en.content.trim() === note.content.trim() && en.content.length > 20)
      );
      if (match) {
        duplicates.push({ note, existingNoteId: match.id });
      }
    }

    return {
      notes,
      detectedObligations,
      duplicates,
      fileType,
      fileName: file.name,
    };
  }

  /**
   * Parse Zoho ZIP Archive containing multiple notes
   */
  private async parseZipFile(file: File): Promise<NoteItem[]> {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    const notes: NoteItem[] = [];

    // Look for JSON or HTML notes inside the ZIP archive
    for (const [relativePath, zipEntry] of Object.entries(contents.files)) {
      if (zipEntry.dir) continue;
      const pathLower = relativePath.toLowerCase();

      // Skip internal hidden/system files
      if (pathLower.includes('__macosx') || pathLower.includes('.ds_store')) continue;

      if (pathLower.endsWith('.json')) {
        try {
          const text = await zipEntry.async('text');
          const parsed = this.parseJsonContent(text, relativePath);
          notes.push(...parsed);
        } catch (e) {
          console.warn('Error reading json from zip', e);
        }
      } else if (pathLower.endsWith('.html') || pathLower.endsWith('.htm')) {
        try {
          const text = await zipEntry.async('text');
          const note = this.parseHtmlContent(text, relativePath);
          notes.push(note);
        } catch (e) {
          console.warn('Error reading html from zip', e);
        }
      } else if (pathLower.endsWith('.txt') || pathLower.endsWith('.md')) {
        try {
          const text = await zipEntry.async('text');
          const cleanName = relativePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'ملاحظة';
          notes.push({
            id: `note-zip-${Math.random().toString(36).substr(2, 9)}`,
            title: cleanName,
            content: text,
            notebook: relativePath.includes('/') ? relativePath.split('/')[0] : 'عام',
            tags: ['Zoho ZIP'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: 'zoho',
          });
        } catch (e) {
          console.warn('Error reading txt from zip', e);
        }
      }
    }

    return notes;
  }

  /**
   * Parse JSON structure from Zoho Notebook
   */
  private parseJsonContent(text: string, filename: string): NoteItem[] {
    try {
      const data = JSON.parse(text);
      const notes: NoteItem[] = [];

      // Check if it's an array of notes or an object with notes/cards array
      const rawNotes = Array.isArray(data)
        ? data
        : data.notes || data.cards || data.data || data.items || [data];

      for (let i = 0; i < rawNotes.length; i++) {
        const item = rawNotes[i];
        if (!item || typeof item !== 'object') continue;

        const title = item.title || item.name || item.heading || `${filename.replace(/\.[^/.]+$/, '')} #${i + 1}`;
        let content = item.content || item.description || item.body || item.text || '';
        if (typeof content !== 'string') {
          content = JSON.stringify(content, null, 2);
        }

        // Tags
        const tags: string[] = Array.isArray(item.tags)
          ? item.tags
          : typeof item.tag === 'string'
          ? item.tag.split(',').map((t: string) => t.trim())
          : [];

        // Checklists
        let checklist: { id: string; text: string; done: boolean }[] | undefined;
        if (Array.isArray(item.checklist) || Array.isArray(item.tasks)) {
          const rawCheck = item.checklist || item.tasks;
          checklist = rawCheck.map((c: unknown, idx: number) => {
            if (typeof c === 'string') return { id: `chk-${idx}`, text: c, done: false };
            const obj = c as { id?: string; text?: string; title?: string; completed?: boolean; done?: boolean; status?: string };
            return {
              id: obj.id || `chk-${idx}`,
              text: obj.text || obj.title || 'مهمة',
              done: !!(obj.completed || obj.done || obj.status === 'completed'),
            };
          });
        }

        const createdAt = item.created_time || item.createdAt || item.date || new Date().toISOString();
        const updatedAt = item.modified_time || item.updatedAt || createdAt;

        notes.push({
          id: `zoho-json-${Date.now()}-${i}`,
          title: String(title).trim(),
          content: String(content).trim(),
          notebook: item.notebook_name || item.notebook || 'Zoho Notebook',
          tags: tags.filter(Boolean),
          checklist,
          createdAt: new Date(createdAt).toISOString(),
          updatedAt: new Date(updatedAt).toISOString(),
          source: 'zoho',
        });
      }

      return notes;
    } catch {
      // If not valid JSON, treat as raw text
      return [
        {
          id: `zoho-raw-${Date.now()}`,
          title: filename.replace(/\.[^/.]+$/, ''),
          content: text,
          tags: ['Zoho Text'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'zoho',
        },
      ];
    }
  }

  /**
   * Parse HTML format note exported by Zoho Notebook
   */
  private parseHtmlContent(html: string, filename: string): NoteItem {
    let title = filename.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'ملاحظة Zoho';
    let content = '';
    const checklist: { id: string; text: string; done: boolean }[] = [];
    const tags: string[] = [];

    if (typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Extract title
        const titleEl = doc.querySelector('title') || doc.querySelector('h1') || doc.querySelector('.note-title');
        if (titleEl && titleEl.textContent?.trim()) {
          title = titleEl.textContent.trim();
        }

        // Extract checklists if present
        const checkItems = doc.querySelectorAll('li, .checklist-item, input[type="checkbox"]');
        checkItems.forEach((el, index) => {
          if (el.tagName.toLowerCase() === 'input') {
            const isChecked = (el as HTMLInputElement).checked;
            const parentText = el.parentElement?.textContent?.trim() || '';
            if (parentText) {
              checklist.push({ id: `chk-${index}`, text: parentText, done: isChecked });
            }
          } else if (el.querySelector('input[type="checkbox"]')) {
            const cb = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
            const text = el.textContent?.trim() || '';
            checklist.push({ id: `chk-${index}`, text, done: cb.checked });
          }
        });

        // Clean body text
        const bodyEl = doc.body;
        if (bodyEl) {
          // Remove scripts and styles
          bodyEl.querySelectorAll('script, style').forEach((n) => n.remove());
          content = bodyEl.innerText || bodyEl.textContent || '';
        }
      } catch {
        content = html.replace(/<[^>]*>?/gm, ' ');
      }
    } else {
      content = html.replace(/<[^>]*>?/gm, ' ');
    }

    return {
      id: `zoho-html-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: title.trim(),
      content: content.trim(),
      notebook: filename.includes('/') ? filename.split('/')[0] : 'Zoho Notebook',
      tags: tags,
      checklist: checklist.length > 0 ? checklist : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'zoho',
    };
  }

  /**
   * Parse CSV content
   */
  private parseCsvContent(csv: string): NoteItem[] {
    const lines = csv.split('\n');
    const notes: NoteItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',');
      const title = parts[0]?.replace(/^"|"$/g, '') || `ملاحظة #${i}`;
      const content = parts[1]?.replace(/^"|"$/g, '') || '';
      const tags = parts[2]?.replace(/^"|"$/g, '') ? [parts[2].replace(/^"|"$/g, '')] : [];
      notes.push({
        id: `zoho-csv-${Date.now()}-${i}`,
        title,
        content,
        tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'zoho',
      });
    }

    return notes;
  }

  /**
   * Import Intelligence: analyzes notes to identify monthly commitments
   */
  public detectObligations(notes: NoteItem[]): DetectedObligation[] {
    const detected: DetectedObligation[] = [];

    const KEYWORD_PATTERNS = [
      {
        category: 'housing',
        icon: '🏠',
        keywords: ['إيجار', 'ايجار', 'شقة', 'سكن', 'ملحق', 'عقار', 'rent', 'flat', 'apartment'],
      },
      {
        category: 'services',
        icon: '💡',
        keywords: ['كهرباء', 'كهرماء', 'ماء', 'مياه', 'غاز', 'صيانة', 'electricity', 'water', 'kahramaa', 'utility'],
      },
      {
        category: 'telecom',
        icon: '📱',
        keywords: ['إنترنت', 'انترنت', 'هاتف', 'جوال', 'موبايل', 'أوريدو', 'فودافون', 'ooredoo', 'vodafone', 'internet', 'phone'],
      },
      {
        category: 'installments',
        icon: '💳',
        keywords: ['قسط', 'أقساط', 'اقساط', 'تمويل', 'سيارة', 'بنك', 'سلفه', 'قرض', 'installment', 'loan', 'finance'],
      },
      {
        category: 'education',
        icon: '🎓',
        keywords: ['مدرسة', 'مدارس', 'جامعة', 'تعليم', 'حضانة', 'روضة', 'باص', 'school', 'tuition', 'education'],
      },
      {
        category: 'family',
        icon: '👨‍👩‍👧',
        keywords: ['مصروف', 'عائلة', 'أسرة', 'خادمة', 'سائق', 'شغالة', 'تموين', 'جمعية', 'family', 'maid'],
      },
      {
        category: 'subscriptions',
        icon: '🔄',
        keywords: ['اشتراك', 'نتفلكس', 'شاهد', 'سبوتيفاي', 'يوتيوب', 'جيم', 'نادي', 'subscription', 'netflix', 'spotify', 'gym'],
      },
      {
        category: 'transfers',
        icon: '💸',
        keywords: ['تحويل', 'حوالة', 'راتب', 'شهري', 'transfer', 'salary'],
      },
    ];

    for (const note of notes) {
      const fullText = `${note.title} ${note.content} ${note.tags.join(' ')}`.toLowerCase();

      let matchedCategory = 'other';
      let matchedIcon = '📦';
      let confidence = 0;

      for (const pattern of KEYWORD_PATTERNS) {
        for (const kw of pattern.keywords) {
          if (fullText.includes(kw.toLowerCase())) {
            matchedCategory = pattern.category;
            matchedIcon = pattern.icon;
            confidence += 35;
            break;
          }
        }
      }

      // Check for financial payment markers
      const paymentMarkers = ['سداد', 'دفع', 'مبلغ', 'ريال', 'qar', 'qr', 'درهم', 'دينار', 'جنيه', 'دولار', '$', 'paid', 'due', 'amount'];
      for (const marker of paymentMarkers) {
        if (fullText.includes(marker)) {
          confidence += 20;
          break;
        }
      }

      // Extract amount
      const detectedAmount = this.extractAmount(fullText);
      if (detectedAmount > 0) {
        confidence += 30;
      }

      // Extract due day (1 - 31)
      const detectedDueDay = this.extractDueDay(fullText, note.createdAt);

      // Only qualify if confidence is at least 45 or amount + keyword found
      if (confidence >= 45 || (detectedAmount > 0 && matchedCategory !== 'other')) {
        detected.push({
          id: `det-${note.id}`,
          originalNote: note,
          detectedTitle: note.title,
          detectedAmount: detectedAmount || 500,
          detectedCurrency: 'QAR',
          detectedDueDay,
          detectedCategory: matchedCategory,
          detectedFrequency: 'monthly' as RecurrenceType,
          confidence: Math.min(confidence, 98),
          selected: true,
        });
      }
    }

    return detected;
  }

  /**
   * Helper to extract numeric amount from Arabic/English text
   */
  private extractAmount(text: string): number {
    // Patterns like: "2000 ريال", "QAR 2,000", "2000 QAR", "المبلغ: 1500", "500$"
    const regexList = [
      /(?:qar|qr|ريال|ر\.ق|درهم|د\.إ|aed|sar|\$)\s*[:=]?\s*([0-9,.]+)/i,
      /([0-9,.]+)\s*(?:qar|qr|ريال|ر\.ق|درهم|aed|sar|\$)/i,
      /(?:المبلغ|قيمة|بمبلغ|سداد)\s*[:=]?\s*([0-9,.]+)/i,
      /\b([1-9][0-9]{2,5})\b/, // 3 to 6 digits standalone number like 2000, 350
    ];

    for (const regex of regexList) {
      const match = text.match(regex);
      if (match && match[1]) {
        const cleaned = match[1].replace(/,/g, '');
        const num = parseFloat(cleaned);
        if (!isNaN(num) && num > 0 && num < 1000000) {
          return num;
        }
      }
    }

    return 0;
  }

  /**
   * Helper to extract due day of month
   */
  private extractDueDay(text: string, createdAtStr: string): number {
    const dayRegexes = [
      /(?:يوم|يستحق|بتاريخ|موعد)\s*[:=]?\s*([0-9]{1,2})\b/i,
      /(?:due|on|day)\s*[:=]?\s*([0-9]{1,2})(?:st|nd|rd|th)?\b/i,
      /\b([0-9]{1,2})\s*(?:من كل شهر|شهرياً)/i,
    ];

    for (const regex of dayRegexes) {
      const match = text.match(regex);
      if (match && match[1]) {
        const day = parseInt(match[1], 10);
        if (day >= 1 && day <= 31) return day;
      }
    }

    // Default to day of creation date or 1
    try {
      const date = new Date(createdAtStr);
      if (!isNaN(date.getDate())) {
        return Math.min(date.getDate(), 28);
      }
    } catch {
      // fallback
    }
    return 1;
  }
}

export const zohoParser = new ZohoParserService();
