import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { Types } from 'mongoose';

import mammoth from 'mammoth';
import Perplexity from '@perplexity-ai/perplexity_ai';
import ResumeModel from './resume.schema';
import { IResume } from './resume.dto';

export interface ResumeOptimizationRequest {
    resumeFile: Express.Multer.File;
    jobDescription: string;
    userId: Types.ObjectId;
}

export interface ResumeOptimizationResult {
    success: boolean;
    resume?: IResume;
    error?: string;
}

type ExtractedContacts = {
    email?: string;
    phone?: string;
    linkedin?: string;
    github?: string;
    leetcode?: string;
    website?: string;
    twitter?: string;
};

export class ResumeOptimizationService {
    private perplexityClient: Perplexity;
    private outputDir: string;
    private uploadsDir: string;
    private templateLatex?: string;

    constructor() {
        this.perplexityClient = new Perplexity({
            apiKey: process.env.PERPLEXITY_API_KEY
        });
        this.outputDir = path.join(process.cwd(), 'output');
        this.uploadsDir = path.join(process.cwd(), 'uploads');
        
        // Ensure directories exist
        this.ensureDirectoriesExist();

        // Load LaTeX template for stable structure (best-effort)
        this.templateLatex = this.loadOverleafTemplate();
    }

    /**
     * Ensures that output and uploads directories exist
     */
    private ensureDirectoriesExist(): void {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
        if (!fs.existsSync(this.uploadsDir)) {
            fs.mkdirSync(this.uploadsDir, { recursive: true });
        }
    }

    /**
     * Loads the Overleaf template content from src/template/overleafTemplate.ltx
     */
    private loadOverleafTemplate(): string | undefined {
        try {
            const templatePath = path.join(process.cwd(), 'src', 'template', 'overleafTemplate.ltx');
            if (fs.existsSync(templatePath)) {
                const raw = fs.readFileSync(templatePath, 'utf8');
                // Extract the template string between the first and last backticks
                const firstTick = raw.indexOf('`');
                const lastTick = raw.lastIndexOf('`');
                if (firstTick !== -1 && lastTick !== -1 && lastTick > firstTick) {
                    return raw.slice(firstTick + 1, lastTick);
                }
                return raw;
            }
        } catch (error) {
            console.warn('Failed to load Overleaf template:', error);
        }
        return undefined;
    }

    /**
     * Returns the preamble (from \\documentclass up to just before \\begin{document}) of the loaded template
     */
    private getTemplatePreamble(): string | undefined {
        if (!this.templateLatex) return undefined;
        const start = this.templateLatex.indexOf('\\documentclass');
        const beginDoc = this.templateLatex.indexOf('\\begin{document}');
        if (start !== -1 && beginDoc !== -1 && beginDoc > start) {
            return this.templateLatex.slice(start, beginDoc);
        }
        return undefined;
    }

    /**
     * Replace the AI output preamble with the template preamble to enforce structure
     */
    private applyTemplatePreamble(aiLatex: string): string {
        const templatePreamble = this.getTemplatePreamble();
        if (!templatePreamble) return aiLatex;
        const aiStart = aiLatex.indexOf('\\documentclass');
        const aiBegin = aiLatex.indexOf('\\begin{document}');
        if (aiStart === -1 || aiBegin === -1 || aiBegin <= aiStart) return aiLatex;
        const before = aiLatex.slice(0, aiStart);
        const after = aiLatex.slice(aiBegin);
        return `${before}${templatePreamble}${after}`;
    }

    /**
     * Extracts text content from uploaded resume file
     * Supports PDF and DOCX formats
     */
    async extractResumeText(file: Express.Multer.File): Promise<string> {
        const fileExtension = path.extname(file.originalname).toLowerCase();
        
        try {
            switch (fileExtension) {
                case '.pdf':
                    return await this.extractTextFromPDF(file.buffer);
                case '.docx':
                    return await this.extractTextFromDOCX(file.buffer);
                default:
                    throw new Error(`Unsupported file format: ${fileExtension}. Only PDF and DOCX files are supported.`);
            }
        } catch (error) {
            throw new Error(`Failed to extract text from resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Extracts additional URLs directly from file formats (annotations/anchors)
     * - PDF: link annotations via pdfjs if available
     * - DOCX: hyperlinks via mammoth HTML conversion
     */
    private async extractAdditionalUrls(file: Express.Multer.File): Promise<string[]> {
        const fileExtension = path.extname(file.originalname).toLowerCase();
        try {
            if (fileExtension === '.pdf') {
                return await this.extractUrlsFromPdfAnnotations(file.buffer);
            }
            if (fileExtension === '.docx') {
                return await this.extractUrlsFromDocxHtml(file.buffer);
            }
        } catch (err) {
            console.warn('extractAdditionalUrls failed:', err);
        }
        return [];
    }

    private async extractUrlsFromPdfAnnotations(buffer: Buffer): Promise<string[]> {
        try {
            const pdf = await PDFDocument.load(buffer);
            const context = (pdf as any).context;
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { PDFName, PDFString, PDFHexString } = require('pdf-lib');
            const urls: string[] = [];
            for (const page of pdf.getPages()) {
                const node = (page as any).node;
                const annotsRef = node.get(PDFName.of('Annots'));
                if (!annotsRef) continue;
                const annotsArray = context.lookup(annotsRef);
                const annotRefs = annotsArray.asArray ? annotsArray.asArray() : annotsArray;
                for (const ref of annotRefs) {
                    const annot = context.lookup(ref);
                    const subtype = annot.get(PDFName.of('Subtype'));
                    if (subtype && subtype.toString && subtype.toString() === '/Link') {
                        const A = annot.get(PDFName.of('A'));
                        if (A) {
                            const action = context.lookup(A);
                            const uri = action?.get?.(PDFName.of('URI'));
                            if (uri) {
                                if (uri instanceof PDFString || (PDFHexString && uri instanceof PDFHexString)) {
                                    const decoded = uri.decodeText ? uri.decodeText() : uri.asString ? uri.asString() : String(uri);
                                    urls.push(decoded);
                                } else if (uri.toString) {
                                    urls.push(uri.toString());
                                }
                            }
                        }
                        const uriDirect = annot.get(PDFName.of('URI'));
                        if (uriDirect) {
                            if (uriDirect instanceof PDFString || (PDFHexString && uriDirect instanceof PDFHexString)) {
                                const decoded = uriDirect.decodeText ? uriDirect.decodeText() : uriDirect.asString ? uriDirect.asString() : String(uriDirect);
                                urls.push(decoded);
                            } else if (uriDirect.toString) {
                                urls.push(uriDirect.toString());
                            }
                        }
                    }
                }
            }
            return Array.from(new Set(urls));
        } catch (_error) {
            return [];
        }
    }

    private async extractUrlsFromDocxHtml(buffer: Buffer): Promise<string[]> {
        try {
            const result = await mammoth.convertToHtml({ buffer });
            const html = result.value || '';
            const hrefs = Array.from(html.matchAll(/href\s*=\s*"([^"]+)"/gi)).map(m => m[1]);
            return Array.from(new Set(hrefs));
        } catch (error) {
            return [];
        }
    }

    /**
     * Extracts text from PDF buffer using a robust multi-strategy approach.
     * Order: pdf2json -> pdf.js legacy -> pdf-parse (last resort, text only)
     */
    private async extractTextFromPDF(buffer: Buffer): Promise<string> {
        const tryPdf2Json = async (): Promise<string> => {
            const PDFParser = require('pdf2json');
            return await new Promise<string>((resolve, reject) => {
                try {
                    const pdfParser = new PDFParser();
                    pdfParser.on('pdfParser_dataError', (errData: any) => {
                        reject(new Error(`pdf2json error: ${errData.parserError || 'Unknown error'}`));
                    });
                    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
                        try {
                            const pages = pdfData?.formImage?.Pages || [];
                            const texts: string[] = [];
                            for (const page of pages) {
                                for (const textItem of page.Texts || []) {
                                    for (const r of textItem.R || []) {
                                        const decoded = decodeURIComponent(r.T || '');
                                        texts.push(decoded);
                                    }
                                }
                                texts.push('\n');
                            }
                            resolve(texts.join(' '));
                        } catch (e) {
                            reject(new Error('Failed to parse pdf2json output'));
                        }
                    });
                    pdfParser.parseBuffer(buffer);
                } catch (e) {
                    reject(new Error('Failed to initialize pdf2json'));
                }
            });
        };

        const tryPdfJs = async (): Promise<string> => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                let pdfjsLib;
                try {
                    pdfjsLib = require('pdfjs-dist/legacy/build/pdf');
                    if (pdfjsLib.GlobalWorkerOptions) {
                        pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/legacy/build/pdf.worker.js');
                    }
                } catch (_e) {
                    pdfjsLib = require('pdfjs-dist/build/pdf.js');
                    if (pdfjsLib.GlobalWorkerOptions) {
                        pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/build/pdf.worker.js');
                    }
                }
                const loadingTask = pdfjsLib.getDocument({ data: buffer });
                const pdf = await loadingTask.promise;
                let text = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    const pageText = content.items.map((it: any) => it.str).join(' ');
                    text += pageText + '\n';
                }
                return text;
            } catch (_error) {
                return '';
            }
        };

        const tryPdfParse = async (): Promise<string> => {
            try {
                // Lazy require; only used as last resort for text
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const pdfParse = require('pdf-parse');
                const data = await pdfParse(buffer);
                return String(data?.text || '').trim();
            } catch (_error) {
                return '';
            }
        };

        // Try strategies in order
        const text1 = await tryPdf2Json().catch(() => '');
        if (text1 && text1.trim().length > 50) return text1;

        const text2 = await tryPdfJs();
        if (text2 && text2.trim().length > 50) return text2;

        const text3 = await tryPdfParse();
        return text3;
    }

    /**
     * Fallback PDF text extraction using pdf.js (legacy if available)
     */
    private async extractTextFromPDFViaPdfJs(buffer: Buffer): Promise<string> {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            let pdfjsLib;
            try {
                pdfjsLib = require('pdfjs-dist/legacy/build/pdf');
                if (pdfjsLib.GlobalWorkerOptions) {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/legacy/build/pdf.worker.js');
                }
            } catch (_e) {
                pdfjsLib = require('pdfjs-dist/build/pdf.js');
                if (pdfjsLib.GlobalWorkerOptions) {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/build/pdf.worker.js');
                }
            }
            const loadingTask = pdfjsLib.getDocument({ data: buffer });
            const pdf = await loadingTask.promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const pageText = content.items.map((it: any) => it.str).join(' ');
                text += pageText + '\n';
            }
            return text;
        } catch (_error) {
            return '';
        }
    }

    /**
     * Build a minimal fallback resume text using detected contacts
     */
    private buildFallbackResumeText(contacts: ExtractedContacts): string {
        const parts: string[] = [];
        if (contacts.email) parts.push(`Email: ${contacts.email}`);
        if (contacts.phone) parts.push(`Phone: ${contacts.phone}`);
        if (contacts.linkedin) parts.push(`LinkedIn: ${contacts.linkedin}`);
        if (contacts.github) parts.push(`GitHub: ${contacts.github}`);
        if (contacts.leetcode) parts.push(`LeetCode: ${contacts.leetcode}`);
        if (contacts.website) parts.push(`Website: ${contacts.website}`);
        return parts.join('\n');
    }

    /**
     * Extracts text from DOCX buffer using mammoth library
     */
    private async extractTextFromDOCX(buffer: Buffer): Promise<string> {
        try {
            const result = await mammoth.extractRawText({ buffer });
            return result.value;
        } catch (error) {
            throw new Error(`DOCX parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Extracts contact links/emails/phones from plain resume text using regexes
     */
    private extractContactsFromText(text: string, extraUrls: string[] = []): ExtractedContacts {
        const trimmed = text.replace(/\s+/g, ' ').trim();
        const contacts: ExtractedContacts = {};

        const emailMatch = trimmed.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        if (emailMatch) contacts.email = emailMatch[0];

        const phoneMatch = trimmed.match(/\+?\d[\d\s().-]{7,}\d/);
        if (phoneMatch) contacts.phone = phoneMatch[0].replace(/[^\d+]/g, '');

        const urlRegex = /https?:\/\/[\w.-]+(?:\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?/gi;
        const urls = [
            ...((trimmed.match(urlRegex) || []).map(u => u.trim())),
            ...extraUrls
        ];

        const findByHost = (host: RegExp) => urls.find(u => host.test(u));
        const normalize = (u?: string) => (u ? u.replace(/\)?\.$/, '') : undefined);

        contacts.linkedin = normalize(findByHost(/linkedin\.com\/in\//i));
        contacts.github = normalize(findByHost(/github\.com\//i));
        contacts.leetcode = normalize(findByHost(/leetcode\.com\//i));
        contacts.twitter = normalize(findByHost(/twitter\.com\//i));

        // Fallback generic website (portfolio) if there is a URL that isn't one of the above
        if (!contacts.website) {
            const specialHosts = [/linkedin\.com/i, /github\.com/i, /leetcode\.com/i, /twitter\.com/i];
            const other = urls.find(u => !specialHosts.some(h => h.test(u)));
            if (other) contacts.website = normalize(other);
        }

        return contacts;
    }

    /**
     * Builds a short note appended to the AI prompt to force exact link preservation
     */
    private buildContactPreservationNote(contacts: ExtractedContacts): string {
        const parts: string[] = [];
        if (contacts.email) parts.push(`Email=${contacts.email}`);
        if (contacts.phone) parts.push(`Phone=${contacts.phone}`);
        if (contacts.linkedin) parts.push(`LinkedIn=${contacts.linkedin}`);
        if (contacts.github) parts.push(`GitHub=${contacts.github}`);
        if (contacts.leetcode) parts.push(`LeetCode=${contacts.leetcode}`);
        if (contacts.website) parts.push(`Website=${contacts.website}`);
        if (contacts.twitter) parts.push(`Twitter=${contacts.twitter}`);
        if (parts.length === 0) return '';
        return `\n\nIMPORTANT: Preserve these original contact links/values EXACTLY as provided. Do not invent or change them. Use these as href targets in LaTeX, and display text may be simplified but hrefs must match exactly. Original Contacts -> ${parts.join(' | ')}`;
    }

    /**
     * Post-process LaTeX to enforce original contact hrefs where present
     */
    private enforceContactLinksInLatex(latex: string, contacts: ExtractedContacts): string {
        let out = latex;

        // If LaTeX lacks a visible contact header, inject one after \begin{document}
        const hasHeaderLinks = /\\href\{mailto:|\\href\{tel:|linkedin\.com|github\.com|leetcode\.com/i.test(out);
        if (!hasHeaderLinks) {
            const headerParts: string[] = [];
            const displayOr = (value?: string, fallback?: string) => value || fallback || '';
            if (contacts.phone) headerParts.push(`\\href{tel:${contacts.phone}}{${contacts.phone}}`);
            if (contacts.email) headerParts.push(`\\href{mailto:${contacts.email}}{${contacts.email}}`);
            if (contacts.linkedin) headerParts.push(`\\href{${contacts.linkedin}}{LinkedIn}`);
            if (contacts.github) headerParts.push(`\\href{${contacts.github}}{GitHub}`);
            if (contacts.leetcode) headerParts.push(`\\href{${contacts.leetcode}}{LeetCode}`);
            if (contacts.website) headerParts.push(`\\href{${contacts.website}}{Website}`);

            if (headerParts.length > 0) {
                const headerBlock = `\n\\begin{center}\n${headerParts.join(' \\mid ')}\n\\end{center}\n`;
                out = out.replace(/\\begin\{document\}\s*/i, match => `${match}${headerBlock}`);
            }
        }
        const replaceHref = (pattern: RegExp, href: string) => {
            out = out.replace(pattern, (m, before, display) => `${before}\\href{${href}}{${display || href}}`);
        };

        if (contacts.linkedin) {
            // Matches occurrences like: ... \href{https://linkedin.com/...}{...}
            replaceHref(/(\s|^)\\href\{https?:\\\/\\\/linkedin\.com[^}]*\}\{([^}]*)\}/i, contacts.linkedin);
        }
        if (contacts.github) {
            replaceHref(/(\s|^)\\href\{https?:\\\/\\\/github\.com[^}]*\}\{([^}]*)\}/i, contacts.github);
        }
        if (contacts.leetcode) {
            replaceHref(/(\s|^)\\href\{https?:\\\/\\\/leetcode\.com[^}]*\}\{([^}]*)\}/i, contacts.leetcode);
        }
        if (contacts.website) {
            // Generic website: replace first http(s) href not matching well-known hosts
            out = out.replace(/(\s|^)\\href\{https?:\\\/\\\/[^{]*\}\{([^}]*)\}/, (m: string, before: string, display: string) => {
                if (/linkedin\.com|github\.com|leetcode\.com/i.test(m)) return m;
                return `${before}\\href{${contacts.website}}{${display || contacts.website}}`;
            });
        }
        if (contacts.email) {
            // Fix mailto
            out = out.replace(/(\s|^)\\href\{mailto:[^}]*\}\{([^}]*)\}/i, (_, before: string, display: string) => `${before}\\href{mailto:${contacts.email}}{${display || contacts.email}}`);
        }
        if (contacts.phone) {
            out = out.replace(/(\s|^)\\href\{tel:[^}]*\}\{([^}]*)\}/i, (_, before: string, display: string) => `${before}\\href{tel:${contacts.phone}}{${display || contacts.phone}}`);
        }

        return out;
    }

    /**
     * Sanitizes LaTeX to avoid accidental extra pages in the final PDF
     */
    private sanitizeLatexForPagination(latex: string): string {
        let out = latex;

        // Collapse excessive blank lines
        out = out.replace(/\n{3,}/g, '\n\n');

        // Remove explicit page breaks near the end of the document
        out = out.replace(/(\\newpage|\\pagebreak|\\clearpage)\s*(?=\\end\{document\})/gi, '');

        // Remove trailing vertical fill/large vspace immediately before end
        out = out.replace(/(\\vfill|\\vspace\*?\{[^}]*\})\s*(?=\\end\{document\})/gi, '');

        // Ensure only one \end{document}
        const parts = out.split(/\\end\{document\}/i);
        if (parts.length > 2) {
            out = parts.slice(0, 2).join('\\end{document}');
        }

        // Trim whitespace before end{document}
        out = out.replace(/\s+(\\end\{document\})/i, '\n$1');

        return out;
    }

    /**
     * Sends resume text and job description to AI for optimization
     * Returns optimized LaTeX resume content
     */
    async optimizeResumeWithAI(resumeText: string, jobDescription: string, contacts: ExtractedContacts): Promise<string> {
        const templateHint = this.templateLatex ? `\nFollow this LaTeX template structure (use its preamble and sectioning style):\n${this.templateLatex.slice(0, 1200)}\n...` : '';
        const systemPrompt = `You are an expert ATS resume optimizer. I will provide the user's resume and the target job description. Generate a clean, professional LaTeX (.ltx) resume optimized for ATS — no explanations, no markdown.${templateHint}\nREQUIREMENTS:\n- Use a simple, compilable preamble with hyperref and geometry.\n- Organize with clear sections (SUMMARY, EDUCATION, TECHNICAL SKILLS, EXPERIENCE, PROJECTS, ACHIEVEMENTS).\n- Include a header (centered) with name and contact \\href links.\n- Avoid exotic packages and stick to those in the template.`;
        const userPrompt = `Resume Content:\n${resumeText}\n\nJob Description:\n${jobDescription}${this.buildContactPreservationNote(contacts)}`;

        // Try different model names in case one is not available
        const modelNames = [
            "sonar-pro",
            "sonar",
            "llama-3.1-sonar-large-128k-online",
            "llama-3.1-sonar-huge-128k-online"
        ];

        let lastError: Error | null = null;

        for (const modelName of modelNames) {
            try {
                console.log(`Trying model: ${modelName}`);
                
                // Use Perplexity's chat completion API
                const response = await this.perplexityClient.chat.completions.create({
                    model: modelName,
                    messages: [
                        {
                            role: "system",
                            content: systemPrompt
                        },
                        {
                            role: "user",
                            content: userPrompt
                        }
                    ],
                    max_tokens: 4000,
                    temperature: 0.3
                });

                const messageContent = response.choices[0]?.message?.content;
                
                if (!messageContent) {
                    throw new Error('No content received from AI model');
                }

                // Handle different content types
                let optimizedContent: string;
                if (typeof messageContent === 'string') {
                    optimizedContent = messageContent;
                } else if (Array.isArray(messageContent)) {
                    // Extract text from content chunks
                    optimizedContent = messageContent
                        .filter(chunk => chunk.type === 'text')
                        .map(chunk => chunk.text)
                        .join('');
                } else {
                    throw new Error('Unexpected content format from AI model');
                }

                console.log(`Successfully used model: ${modelName}`);
                return optimizedContent;
                
            } catch (error) {
                console.log(`Model ${modelName} failed:`, error instanceof Error ? error.message : 'Unknown error');
                lastError = error instanceof Error ? error : new Error('Unknown error');
                
                // If it's a model-specific error, try the next model
                if (error instanceof Error && error.message.includes('Invalid model')) {
                    continue;
                }
                
                // If it's not a model error, break and throw
                throw error;
            }
        }

        // If all models failed, throw the last error
        throw new Error(`All AI models failed. Last error: ${lastError?.message || 'Unknown error'}`);
    }

    /**
     * Validates that the AI output contains proper LaTeX structure
     */
    private validateLaTeXContent(content: string): boolean {
        const hasDocumentClass = content.includes('\\documentclass');
        const hasEndDocument = content.includes('\\end{document}');
        
        return hasDocumentClass && hasEndDocument;
    }

    /**
     * Saves LaTeX content to file and compiles it to PDF
     */
    async compileLaTeXToPDF(latexContent: string): Promise<string> {
        // Validate LaTeX content
        if (!this.validateLaTeXContent(latexContent)) {
            throw new Error('Invalid LaTeX content: Missing \\documentclass or \\end{document}');
        }

        // Generate unique filename
        const timestamp = Date.now();
        const latexFileName = `resume_optimized_${timestamp}.ltx`;
        const pdfFileName = `resume_optimized_${timestamp}.pdf`;
        
        const latexFilePath = path.join(this.outputDir, latexFileName);
        const pdfFilePath = path.join(this.outputDir, pdfFileName);

        try {
            // Save LaTeX content to file and return LaTeX path (skip PDF compilation for now)
            fs.writeFileSync(latexFilePath, latexContent, 'utf8');

                return latexFilePath;
        } catch (error) {
            // Clean up files on error
            this.cleanupLaTeXFiles(latexFilePath);
            
            // If compilation failed but LaTeX file exists, return LaTeX file
            if (fs.existsSync(latexFilePath)) {
                console.log('Returning LaTeX file (PDF compilation disabled)');
                return latexFilePath;
            }
            
            throw new Error(`LaTeX compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Cleans up LaTeX auxiliary files after compilation
     */
    private cleanupLaTeXFiles(latexFilePath: string): void {
        const baseName = path.basename(latexFilePath, '.ltx');
        const auxExtensions = ['.aux', '.log', '.out', '.toc', '.fdb_latexmk', '.fls', '.synctex.gz'];
        
        auxExtensions.forEach(ext => {
            const auxFilePath = path.join(this.outputDir, `${baseName}${ext}`);
            if (fs.existsSync(auxFilePath)) {
                try {
                    fs.unlinkSync(auxFilePath);
                } catch (error) {
                    console.warn(`Failed to delete auxiliary file ${auxFilePath}:`, error);
                }
            }
        });
    }

    /**
     * Main method to process resume optimization request
     */
    async processResumeOptimization(request: ResumeOptimizationRequest): Promise<ResumeOptimizationResult> {
        let resumeRecord: IResume | null = null;
        
        try {
            // Create initial resume record
            resumeRecord = await ResumeModel.create({
                user: request.userId,
                originalFileName: request.resumeFile.originalname,
                jobDescription: request.jobDescription,
                extractedText: '',
                extractedContacts: {},
                optimizedLatex: '',
                status: 'processing'
            });

            // Step 1: Extract text from resume file
            console.log('Extracting text from resume...');
            let resumeText = await this.extractResumeText(request.resumeFile);
            const additionalUrls = await this.extractAdditionalUrls(request.resumeFile);

            // If no text found, try fallback via pdf.js
            if (!resumeText.trim() && path.extname(request.resumeFile.originalname).toLowerCase() === '.pdf') {
                const fallbackText = await this.extractTextFromPDFViaPdfJs(request.resumeFile.buffer);
                if (fallbackText.trim()) {
                    resumeText = fallbackText;
                }
            }

            // Extract original contacts for exact preservation
            const contacts = this.extractContactsFromText(resumeText, additionalUrls);
            console.log('Contacts:', contacts);

            // If still empty text, build a minimal text from contacts so AI can proceed
            if (!resumeText.trim()) {
                resumeText = this.buildFallbackResumeText(contacts);
            }

            // Update resume record with extracted data
            await ResumeModel.findByIdAndUpdate(resumeRecord._id, {
                extractedText: resumeText,
                extractedContacts: contacts
            });

            // Step 2: Send to AI for optimization (with preservation note)
            console.log('Sending to AI for optimization...');
            let optimizedLaTeX = await this.optimizeResumeWithAI(resumeText, request.jobDescription, contacts);

            // Apply template preamble to stabilize structure
            optimizedLaTeX = this.applyTemplatePreamble(optimizedLaTeX);

            // Step 2.5: Enforce preserved contact hrefs in LaTeX and sanitize pagination
            optimizedLaTeX = this.enforceContactLinksInLatex(optimizedLaTeX, contacts);
            optimizedLaTeX = this.sanitizeLatexForPagination(optimizedLaTeX);

            // Update resume record with final LaTeX and mark as completed
            await ResumeModel.findByIdAndUpdate(resumeRecord._id, {
                optimizedLatex: optimizedLaTeX,
                status: 'completed'
            });
            
            // Fetch the updated record
            resumeRecord = await ResumeModel.findById(resumeRecord._id);

            console.log('Resume optimization completed successfully');
            return {
                success: true,
                resume: resumeRecord || undefined
            };

        } catch (error) {
            console.error('Resume optimization failed:', error);
            
            // Update resume record with error if it exists
            if (resumeRecord) {
                await ResumeModel.findByIdAndUpdate(resumeRecord._id, {
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error occurred'
                });
            }
            
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Get all resumes for a user
     */
    async getUserResumes(userId: Types.ObjectId): Promise<IResume[]> {
        return await ResumeModel.find({ user: userId })
            .sort({ createdAt: -1 })
            .lean();
    }

    /**
     * Get a specific resume by ID
     */
    async getResumeById(resumeId: string, userId: Types.ObjectId): Promise<IResume | null> {
        return await ResumeModel.findOne({ _id: resumeId, user: userId }).lean();
    }

    /**
     * Deletes old files from output directory to prevent storage buildup
     */
    cleanupOldFiles(maxAgeHours: number = 24): void {
        const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
        const now = Date.now();

        try {
            const files = fs.readdirSync(this.outputDir);
            
            files.forEach(file => {
                const filePath = path.join(this.outputDir, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted old file: ${file}`);
                }
            });
        } catch (error) {
            console.warn('Failed to cleanup old files:', error);
        }
    }
}
