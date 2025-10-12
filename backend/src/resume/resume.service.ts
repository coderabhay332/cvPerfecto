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
     * Post-processes LaTeX to remove obvious hallucinated content
     */
    private removeHallucinatedContent(latex: string, originalResume: string): string {
        let out = latex;
        
        // Extract original content for comparison
        const originalSections = this.extractResumeSections(originalResume);
        
        console.log('Original sections found:', Object.keys(originalSections));
        console.log('Original projects content length:', originalSections.projects?.length || 0);
        console.log('Original experience content length:', originalSections.experience?.length || 0);
        
        // Only remove sections if they are completely empty in original AND contain placeholder text
        const hasPlaceholderText = (text: string) => {
            const placeholderPatterns = [
                /project name/i,
                /company/i,
                /duration/i,
                /description:/i,
                /contribution:/i,
                /metrics:/i,
                /achievement \d+/i,
                /degree, institution/i
            ];
            return placeholderPatterns.some(pattern => pattern.test(text));
        };
        
        // If original resume has no projects section AND AI output has placeholder text, remove it
        if ((!originalSections.projects || originalSections.projects.trim().length === 0) && hasPlaceholderText(out)) {
            console.log('Removing projects section due to placeholder text');
            out = out.replace(/\\section\{[^}]*[Pp]rojects?[^}]*\}[\s\S]*?(?=\\section\{|\\end\{document\})/gi, '');
        }
        
        // If original resume has no experience section AND AI output has placeholder text, remove it
        if ((!originalSections.experience || originalSections.experience.trim().length === 0) && hasPlaceholderText(out)) {
            console.log('Removing experience section due to placeholder text');
            out = out.replace(/\\section\{[^}]*[Ee]xperience[^}]*\}[\s\S]*?(?=\\section\{|\\end\{document\})/gi, '');
        }
        
        // If original resume has no achievements section AND AI output has placeholder text, remove it
        if ((!originalSections.achievements || originalSections.achievements.trim().length === 0) && hasPlaceholderText(out)) {
            console.log('Removing achievements section due to placeholder text');
            out = out.replace(/\\section\{[^}]*[Aa]chievements?[^}]*\}[\s\S]*?(?=\\section\{|\\end\{document\})/gi, '');
        }
        
        return out;
    }

    /**
     * Sends resume text and job description to AI for optimization
     * Returns optimized LaTeX resume content
     */
    async optimizeResumeWithAI(resumeText: string, jobDescription: string, contacts: ExtractedContacts): Promise<string> {
        const templateHint = this.templateLatex ? `\nFollow this LaTeX template structure (use its preamble and sectioning style):\n${this.templateLatex.slice(0, 1200)}\n...` : '';
        const systemPrompt = `You are an expert ATS resume optimizer. I will provide the user's resume and the target job description. Generate a clean, professional LaTeX (.ltx) resume optimized for ATS — no explanations, no markdown.${templateHint}

CRITICAL CONTENT RULES:
- ONLY use information that is explicitly present in the provided resume content
- DO NOT add, invent, or hallucinate any projects, experiences, skills, or achievements
- DO NOT add any content that is not directly mentioned in the original resume
- If information is missing from the resume, leave that section empty or omit it entirely
- Focus on reorganizing and reformatting existing content for ATS optimization
- Use the job description only to guide which existing content to emphasize, not to add new content
- READ THE ACTUAL RESUME CONTENT CAREFULLY - extract real details like college names, project names, company names, job titles, etc.
- DO NOT use placeholder text like "Project Name", "Company", "Duration" - use the actual information provided

REQUIREMENTS:
- Use a simple, compilable preamble with hyperref and geometry
- Organize with clear sections (SUMMARY, EDUCATION, TECHNICAL SKILLS, EXPERIENCE, PROJECTS, ACHIEVEMENTS)
- Include a header (centered) with name and contact \\href links
- Avoid exotic packages and stick to those in the template
- Only include sections that have actual content from the original resume
- Extract and use REAL information from the resume content provided`;
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
                    temperature: 0.1,  // Lower temperature to reduce creativity and hallucination
                    top_p: 0.8,        // Focus on more likely tokens
                    frequency_penalty: 0.1  // Slight penalty for repetition (removed presence_penalty)
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
     * Validates that the AI output doesn't contain hallucinated content
     * by checking if major sections contain content that wasn't in the original resume
     */
    private validateContentFidelity(aiOutput: string, originalResume: string): boolean {
        // Extract key sections from AI output
        const aiSections = this.extractResumeSections(aiOutput);
        const originalSections = this.extractResumeSections(originalResume);
        
        // Check for major content additions that weren't in original
        for (const [section, aiContent] of Object.entries(aiSections)) {
            if (aiContent.trim().length === 0) continue;
            
            // For projects and experience sections, check if content is significantly different
            if (section === 'projects' || section === 'experience') {
                const originalContent = originalSections[section] || '';
                if (originalContent.trim().length === 0 && aiContent.trim().length > 100) {
                    console.warn(`Potential hallucination detected in ${section} section: content added where none existed`);
                    return false;
                }
            }
        }
        
        // Additional check: Look for common hallucination patterns
        const hallucinationPatterns = [
            /developed a \w+ application/i,
            /created a \w+ system/i,
            /built a \w+ platform/i,
            /designed and implemented/i,
            /led a team of \d+/i,
            /managed \d+ projects/i,
            /increased \w+ by \d+%/i
        ];
        
        for (const pattern of hallucinationPatterns) {
            if (pattern.test(aiOutput) && !pattern.test(originalResume)) {
                console.warn('Potential hallucination detected: AI-generated content pattern found');
                return false;
            }
        }
        
        return true;
    }

    /**
     * Extracts major sections from resume text for comparison
     */
    private extractResumeSections(text: string): Record<string, string> {
        console.log('=== EXTRACTING RESUME SECTIONS ===');
        console.log('Input text length:', text.length);
        console.log('Input text preview:', text.substring(0, 500));
        
        const sections: Record<string, string> = {};
        
        // More comprehensive section patterns
        const sectionPatterns = {
            projects: /(?:projects?|portfolio|work samples?|personal projects?)[:\s]*([\s\S]*?)(?=\n(?:experience|education|skills|achievements|work|employment|$))/i,
            experience: /(?:experience|work history|employment|professional experience|work experience|career)[:\s]*([\s\S]*?)(?=\n(?:education|projects|skills|achievements|$))/i,
            education: /(?:education|academic|qualifications?|university|college|degree)[:\s]*([\s\S]*?)(?=\n(?:experience|projects|skills|achievements|work|$))/i,
            skills: /(?:skills?|technical skills?|competencies|technologies?|programming languages?)[:\s]*([\s\S]*?)(?=\n(?:experience|education|projects|achievements|work|$))/i,
            achievements: /(?:achievements?|awards?|honors?|certifications?|certificates?)[:\s]*([\s\S]*?)(?=\n(?:experience|education|projects|skills|work|$))/i
        };
        
        for (const [section, pattern] of Object.entries(sectionPatterns)) {
            const match = text.match(pattern);
            if (match) {
                sections[section] = match[1].trim();
                console.log(`✅ Found ${section} section (${sections[section].length} chars):`, sections[section].substring(0, 200));
            } else {
                console.log(`❌ No ${section} section found with standard pattern`);
            }
        }
        
        // Also try to extract content without strict section headers
        if (!sections.projects && text.toLowerCase().includes('project')) {
            console.log('Looking for project mentions without section header...');
            const projectMatches = text.match(/(?:project|built|developed|created)[^.!?]*[.!?]/gi);
            if (projectMatches && projectMatches.length > 0) {
                sections.projects = projectMatches.join(' ').trim();
                console.log('✅ Found projects without section header:', sections.projects.substring(0, 200));
            } else {
                console.log('❌ No project mentions found');
            }
        }
        
        if (!sections.experience && (text.toLowerCase().includes('experience') || text.toLowerCase().includes('worked'))) {
            console.log('Looking for experience mentions without section header...');
            const expMatches = text.match(/(?:worked|experience|employed|job|position)[^.!?]*[.!?]/gi);
            if (expMatches && expMatches.length > 0) {
                sections.experience = expMatches.join(' ').trim();
                console.log('✅ Found experience without section header:', sections.experience.substring(0, 200));
            } else {
                console.log('❌ No experience mentions found');
            }
        }
        
        console.log('=== SECTION EXTRACTION SUMMARY ===');
        console.log('Total sections found:', Object.keys(sections).length);
        console.log('Sections:', Object.keys(sections));
        
        return sections;
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
            console.log('=== RESUME EXTRACTION DEBUG ===');
            console.log('File name:', request.resumeFile.originalname);
            console.log('File size:', request.resumeFile.size, 'bytes');
            console.log('File type:', request.resumeFile.mimetype);
            
            let resumeText = await this.extractResumeText(request.resumeFile);
            const additionalUrls = await this.extractAdditionalUrls(request.resumeFile);

            console.log('=== INITIAL EXTRACTION RESULTS ===');
            console.log('Initial extracted text length:', resumeText.length);
            console.log('Full extracted text:');
            console.log('----------------------------------------');
            console.log(resumeText);
            console.log('----------------------------------------');

            // If no text found, try fallback via pdf.js
            if (!resumeText.trim() && path.extname(request.resumeFile.originalname).toLowerCase() === '.pdf') {
                console.log('=== TRYING PDF.JS FALLBACK ===');
                const fallbackText = await this.extractTextFromPDFViaPdfJs(request.resumeFile.buffer);
                console.log('PDF.js fallback text length:', fallbackText.length);
                console.log('PDF.js fallback text:');
                console.log('----------------------------------------');
                console.log(fallbackText);
                console.log('----------------------------------------');
                
                if (fallbackText.trim()) {
                    resumeText = fallbackText;
                    console.log('PDF.js fallback successful, using fallback text');
                }
            }

            // Extract original contacts for exact preservation
            const contacts = this.extractContactsFromText(resumeText, additionalUrls);
            console.log('=== EXTRACTED CONTACTS ===');
            console.log('Contacts:', JSON.stringify(contacts, null, 2));
            console.log('Additional URLs:', additionalUrls);

            // If still empty text, build a minimal text from contacts so AI can proceed
            if (!resumeText.trim()) {
                console.log('=== NO TEXT EXTRACTED - BUILDING FALLBACK ===');
                resumeText = this.buildFallbackResumeText(contacts);
                console.log('Fallback text:', resumeText);
            }

            console.log('=== FINAL RESUME TEXT FOR AI ===');
            console.log('Final resume text length:', resumeText.length);
            console.log('Final resume text:');
            console.log('========================================');
            console.log(resumeText);
            console.log('========================================');
            
            // Additional validation: Check if we have meaningful content
            if (resumeText.length < 100) {
                console.warn('⚠️  VERY SHORT RESUME TEXT - EXTRACTION MIGHT HAVE FAILED');
            }
            
            // Check for common resume indicators
            const hasName = /[A-Z][a-z]+ [A-Z][a-z]+/.test(resumeText);
            const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(resumeText);
            const hasPhone = /\+?\d[\d\s().-]{7,}\d/.test(resumeText);
            
            console.log('=== RESUME CONTENT ANALYSIS ===');
            console.log('Has name pattern:', hasName);
            console.log('Has email:', hasEmail);
            console.log('Has phone:', hasPhone);
            console.log('Text contains "project":', /project/i.test(resumeText));
            console.log('Text contains "experience":', /experience/i.test(resumeText));
            console.log('Text contains "education":', /education/i.test(resumeText));
            console.log('Text contains "skill":', /skill/i.test(resumeText));

            // Update resume record with extracted data
            await ResumeModel.findByIdAndUpdate(resumeRecord._id, {
                extractedText: resumeText,
                extractedContacts: contacts
            });

            // Step 2: Send to AI for optimization (with preservation note)
            console.log('=== SENDING TO AI FOR OPTIMIZATION ===');
            console.log('Resume text length being sent to AI:', resumeText.length);
            console.log('Job description being sent to AI:', request.jobDescription);
            console.log('Contacts being sent to AI:', JSON.stringify(contacts, null, 2));
            
            let optimizedLaTeX = await this.optimizeResumeWithAI(resumeText, request.jobDescription, contacts);
            
            console.log('=== AI RESPONSE RECEIVED ===');
            console.log('AI response length:', optimizedLaTeX.length);
            console.log('AI response preview (first 1000 chars):');
            console.log('----------------------------------------');
            console.log(optimizedLaTeX.substring(0, 1000));
            console.log('----------------------------------------');

            // Step 2.5: Validate content fidelity to prevent hallucination
            console.log('Validating content fidelity...');
            const contentFidelityValid = this.validateContentFidelity(optimizedLaTeX, resumeText);
            if (!contentFidelityValid) {
                console.warn('Content fidelity validation failed - AI may have added hallucinated content');
                // For now, we'll continue but log the warning
                // In production, you might want to retry with different parameters or reject the result
            }

            // Step 2.6: Remove hallucinated content based on original resume
            console.log('=== REMOVING HALLUCINATED CONTENT ===');
            console.log('Original resume text for comparison:');
            console.log('----------------------------------------');
            console.log(resumeText);
            console.log('----------------------------------------');
            
            optimizedLaTeX = this.removeHallucinatedContent(optimizedLaTeX, resumeText);
            
            console.log('=== AFTER HALLUCINATION REMOVAL ===');
            console.log('Processed LaTeX length:', optimizedLaTeX.length);
            console.log('Processed LaTeX preview:');
            console.log('----------------------------------------');
            console.log(optimizedLaTeX.substring(0, 1000));
            console.log('----------------------------------------');
            
            // Step 2.6.5: Check if AI generated placeholder content and warn user
            const hasPlaceholderContent = /(?:project name|company|duration|description:|contribution:|metrics:|achievement \d+|degree, institution)/i.test(optimizedLaTeX);
            if (hasPlaceholderContent) {
                console.warn('⚠️  AI GENERATED PLACEHOLDER CONTENT - RESUME EXTRACTION MIGHT HAVE FAILED');
                console.log('Placeholder patterns found in AI output');
            } else {
                console.log('✅ No placeholder content detected in AI output');
            }

            // Apply template preamble to stabilize structure
            optimizedLaTeX = this.applyTemplatePreamble(optimizedLaTeX);

            // Step 2.7: Enforce preserved contact hrefs in LaTeX and sanitize pagination
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
