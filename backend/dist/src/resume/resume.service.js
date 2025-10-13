"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeOptimizationService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pdf_lib_1 = require("pdf-lib");
const mammoth_1 = __importDefault(require("mammoth"));
const perplexity_ai_1 = __importDefault(require("@perplexity-ai/perplexity_ai"));
const resume_schema_1 = __importDefault(require("./resume.schema"));
class ResumeOptimizationService {
    constructor() {
        this.perplexityClient = new perplexity_ai_1.default({
            apiKey: process.env.PERPLEXITY_API_KEY
        });
        this.outputDir = path_1.default.join(process.cwd(), 'output');
        this.uploadsDir = path_1.default.join(process.cwd(), 'uploads');
        // Ensure directories exist
        this.ensureDirectoriesExist();
        // Load LaTeX template for stable structure (best-effort)
        this.templateLatex = this.loadOverleafTemplate();
    }
    /**
     * Ensures that output and uploads directories exist
     */
    ensureDirectoriesExist() {
        if (!fs_1.default.existsSync(this.outputDir)) {
            fs_1.default.mkdirSync(this.outputDir, { recursive: true });
        }
        if (!fs_1.default.existsSync(this.uploadsDir)) {
            fs_1.default.mkdirSync(this.uploadsDir, { recursive: true });
        }
    }
    /**
     * Loads the Overleaf template content from src/template/overleafTemplate.ltx
     */
    loadOverleafTemplate() {
        try {
            const templatePath = path_1.default.join(process.cwd(), 'src', 'template', 'overleafTemplate.ltx');
            if (fs_1.default.existsSync(templatePath)) {
                const raw = fs_1.default.readFileSync(templatePath, 'utf8');
                // Extract the template string between the first and last backticks
                const firstTick = raw.indexOf('`');
                const lastTick = raw.lastIndexOf('`');
                if (firstTick !== -1 && lastTick !== -1 && lastTick > firstTick) {
                    return raw.slice(firstTick + 1, lastTick);
                }
                return raw;
            }
        }
        catch (error) {
            console.warn('Failed to load Overleaf template:', error);
        }
        return undefined;
    }
    /**
     * Returns the preamble (from \\documentclass up to just before \\begin{document}) of the loaded template
     */
    getTemplatePreamble() {
        if (!this.templateLatex)
            return undefined;
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
    applyTemplatePreamble(aiLatex) {
        const templatePreamble = this.getTemplatePreamble();
        if (!templatePreamble)
            return aiLatex;
        const aiStart = aiLatex.indexOf('\\documentclass');
        const aiBegin = aiLatex.indexOf('\\begin{document}');
        if (aiStart === -1 || aiBegin === -1 || aiBegin <= aiStart)
            return aiLatex;
        const before = aiLatex.slice(0, aiStart);
        const after = aiLatex.slice(aiBegin);
        return `${before}${templatePreamble}${after}`;
    }
    /**
     * Extracts text content from uploaded resume file
     * Supports PDF and DOCX formats
     */
    extractResumeText(file) {
        return __awaiter(this, void 0, void 0, function* () {
            const fileExtension = path_1.default.extname(file.originalname).toLowerCase();
            try {
                switch (fileExtension) {
                    case '.pdf':
                        return yield this.extractTextFromPDF(file.buffer);
                    case '.docx':
                        return yield this.extractTextFromDOCX(file.buffer);
                    default:
                        throw new Error(`Unsupported file format: ${fileExtension}. Only PDF and DOCX files are supported.`);
                }
            }
            catch (error) {
                throw new Error(`Failed to extract text from resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Extracts additional URLs directly from file formats (annotations/anchors)
     * - PDF: link annotations via pdfjs if available
     * - DOCX: hyperlinks via mammoth HTML conversion
     */
    extractAdditionalUrls(file) {
        return __awaiter(this, void 0, void 0, function* () {
            const fileExtension = path_1.default.extname(file.originalname).toLowerCase();
            try {
                if (fileExtension === '.pdf') {
                    return yield this.extractUrlsFromPdfAnnotations(file.buffer);
                }
                if (fileExtension === '.docx') {
                    return yield this.extractUrlsFromDocxHtml(file.buffer);
                }
            }
            catch (err) {
                console.warn('extractAdditionalUrls failed:', err);
            }
            return [];
        });
    }
    extractUrlsFromPdfAnnotations(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const pdf = yield pdf_lib_1.PDFDocument.load(buffer);
                const context = pdf.context;
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { PDFName, PDFString, PDFHexString } = require('pdf-lib');
                const urls = [];
                for (const page of pdf.getPages()) {
                    const node = page.node;
                    const annotsRef = node.get(PDFName.of('Annots'));
                    if (!annotsRef)
                        continue;
                    const annotsArray = context.lookup(annotsRef);
                    const annotRefs = annotsArray.asArray ? annotsArray.asArray() : annotsArray;
                    for (const ref of annotRefs) {
                        const annot = context.lookup(ref);
                        const subtype = annot.get(PDFName.of('Subtype'));
                        if (subtype && subtype.toString && subtype.toString() === '/Link') {
                            const A = annot.get(PDFName.of('A'));
                            if (A) {
                                const action = context.lookup(A);
                                const uri = (_a = action === null || action === void 0 ? void 0 : action.get) === null || _a === void 0 ? void 0 : _a.call(action, PDFName.of('URI'));
                                if (uri) {
                                    if (uri instanceof PDFString || (PDFHexString && uri instanceof PDFHexString)) {
                                        const decoded = uri.decodeText ? uri.decodeText() : uri.asString ? uri.asString() : String(uri);
                                        urls.push(decoded);
                                    }
                                    else if (uri.toString) {
                                        urls.push(uri.toString());
                                    }
                                }
                            }
                            const uriDirect = annot.get(PDFName.of('URI'));
                            if (uriDirect) {
                                if (uriDirect instanceof PDFString || (PDFHexString && uriDirect instanceof PDFHexString)) {
                                    const decoded = uriDirect.decodeText ? uriDirect.decodeText() : uriDirect.asString ? uriDirect.asString() : String(uriDirect);
                                    urls.push(decoded);
                                }
                                else if (uriDirect.toString) {
                                    urls.push(uriDirect.toString());
                                }
                            }
                        }
                    }
                }
                return Array.from(new Set(urls));
            }
            catch (_error) {
                return [];
            }
        });
    }
    extractTextFromPdfLib(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('📄 PDF EXTRACTION: Using pdf-lib direct content extraction...');
                const pdf = yield pdf_lib_1.PDFDocument.load(buffer);
                const context = pdf.context;
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { PDFName, PDFString, PDFHexString, PDFStream } = require('pdf-lib');
                let extractedText = '';
                const pages = pdf.getPages();
                console.log('📄 PDF EXTRACTION: Processing', pages.length, 'pages with pdf-lib...');
                for (let i = 0; i < pages.length; i++) {
                    const page = pages[i];
                    const node = page.node;
                    console.log(`📄 PDF EXTRACTION: Processing page ${i + 1}...`);
                    try {
                        // Get page contents
                        const contentsRef = node.get(PDFName.of('Contents'));
                        if (contentsRef) {
                            const contents = context.lookup(contentsRef);
                            if (contents instanceof PDFStream) {
                                // Extract text from stream
                                const streamBytes = contents.decode();
                                const streamText = new TextDecoder('utf-8', { fatal: false }).decode(streamBytes);
                                // Parse PDF content stream for text
                                const textMatches = streamText.match(/BT[\s\S]*?ET/g);
                                if (textMatches) {
                                    for (const textBlock of textMatches) {
                                        // Extract text from text blocks
                                        const textOps = textBlock.match(/Tj\s+\((.*?)\)/g);
                                        if (textOps) {
                                            for (const op of textOps) {
                                                const match = op.match(/Tj\s+\((.*?)\)/);
                                                if (match && match[1]) {
                                                    extractedText += match[1] + ' ';
                                                }
                                            }
                                        }
                                        // Also try to extract text from TJ operations (arrays)
                                        const textArrayOps = textBlock.match(/TJ\s+\[(.*?)\]/g);
                                        if (textArrayOps) {
                                            for (const op of textArrayOps) {
                                                const match = op.match(/TJ\s+\[(.*?)\]/);
                                                if (match && match[1]) {
                                                    // Split by parentheses and extract text
                                                    const parts = match[1].split(/\(([^)]+)\)/);
                                                    for (let j = 1; j < parts.length; j += 2) {
                                                        if (parts[j]) {
                                                            extractedText += parts[j] + ' ';
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            else if (Array.isArray(contents)) {
                                // Multiple content streams
                                for (const contentRef of contents) {
                                    const content = context.lookup(contentRef);
                                    if (content instanceof PDFStream) {
                                        const streamBytes = content.decode();
                                        const streamText = new TextDecoder('utf-8', { fatal: false }).decode(streamBytes);
                                        const textMatches = streamText.match(/BT[\s\S]*?ET/g);
                                        if (textMatches) {
                                            for (const textBlock of textMatches) {
                                                const textOps = textBlock.match(/Tj\s+\((.*?)\)/g);
                                                if (textOps) {
                                                    for (const op of textOps) {
                                                        const match = op.match(/Tj\s+\((.*?)\)/);
                                                        if (match && match[1]) {
                                                            extractedText += match[1] + ' ';
                                                        }
                                                    }
                                                }
                                                const textArrayOps = textBlock.match(/TJ\s+\[(.*?)\]/g);
                                                if (textArrayOps) {
                                                    for (const op of textArrayOps) {
                                                        const match = op.match(/TJ\s+\[(.*?)\]/);
                                                        if (match && match[1]) {
                                                            const parts = match[1].split(/\(([^)]+)\)/);
                                                            for (let j = 1; j < parts.length; j += 2) {
                                                                if (parts[j]) {
                                                                    extractedText += parts[j] + ' ';
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        // Also try to extract from page resources
                        const resourcesRef = node.get(PDFName.of('Resources'));
                        if (resourcesRef) {
                            const resources = context.lookup(resourcesRef);
                            // This is where fonts and other resources are defined
                            // We could potentially extract more text information here
                        }
                    }
                    catch (pageError) {
                        console.log(`📄 PDF EXTRACTION: Error processing page ${i + 1}:`, pageError);
                    }
                }
                const result = extractedText.trim();
                console.log('✅ PDF EXTRACTION: pdf-lib content extraction completed, text length:', result.length);
                console.log('First 200 chars:', result.substring(0, 200));
                return result;
            }
            catch (error) {
                console.log('❌ PDF EXTRACTION: pdf-lib content extraction failed:', error instanceof Error ? error.message : 'Unknown error');
                return '';
            }
        });
    }
    extractUrlsFromDocxHtml(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield mammoth_1.default.convertToHtml({ buffer });
                const html = result.value || '';
                const hrefs = Array.from(html.matchAll(/href\s*=\s*"([^"]+)"/gi)).map(m => m[1]);
                return Array.from(new Set(hrefs));
            }
            catch (error) {
                return [];
            }
        });
    }
    /**
     * Extracts text from PDF buffer using a robust multi-strategy approach.
     * Order: pdf-parse -> pdf2json -> pdf.js legacy (last resort)
     */
    extractTextFromPDF(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🔍 PDF EXTRACTION: Starting PDF text extraction...');
            console.log('PDF buffer size:', buffer.length, 'bytes');
            const tryPdfParse = () => __awaiter(this, void 0, void 0, function* () {
                try {
                    console.log('📄 PDF EXTRACTION: Trying pdf-parse method...');
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    const pdfParseModule = require('pdf-parse');
                    // pdf-parse exports a default function, so we need to access it correctly
                    const pdfParse = pdfParseModule.default || pdfParseModule;
                    if (typeof pdfParse !== 'function') {
                        console.log('❌ PDF EXTRACTION: pdf-parse is not a function, available exports:', Object.keys(pdfParseModule));
                        throw new Error('pdf-parse is not a function');
                    }
                    const data = yield pdfParse(buffer);
                    const text = String((data === null || data === void 0 ? void 0 : data.text) || '').trim();
                    console.log('✅ PDF EXTRACTION: pdf-parse successful, text length:', text.length);
                    console.log('First 200 chars:', text.substring(0, 200));
                    return text;
                }
                catch (error) {
                    console.log('❌ PDF EXTRACTION: pdf-parse failed:', error instanceof Error ? error.message : 'Unknown error');
                    return '';
                }
            });
            const tryPdf2Json = () => __awaiter(this, void 0, void 0, function* () {
                try {
                    console.log('📄 PDF EXTRACTION: Trying pdf2json method...');
                    const PDFParser = require('pdf2json');
                    return yield new Promise((resolve, reject) => {
                        try {
                            const pdfParser = new PDFParser();
                            pdfParser.on('pdfParser_dataError', (errData) => {
                                console.log('❌ PDF EXTRACTION: pdf2json error:', errData.parserError || 'Unknown error');
                                reject(new Error(`pdf2json error: ${errData.parserError || 'Unknown error'}`));
                            });
                            pdfParser.on('pdfParser_dataReady', (pdfData) => {
                                var _a, _b;
                                try {
                                    console.log('📄 PDF EXTRACTION: pdf2json data received, analyzing...');
                                    console.log('PDF data structure:', Object.keys(pdfData || {}));
                                    // Try different possible data structures
                                    let pages = [];
                                    // Check for different possible page structures
                                    if ((_a = pdfData === null || pdfData === void 0 ? void 0 : pdfData.formImage) === null || _a === void 0 ? void 0 : _a.Pages) {
                                        pages = pdfData.formImage.Pages;
                                    }
                                    else if (pdfData === null || pdfData === void 0 ? void 0 : pdfData.Pages) {
                                        pages = pdfData.Pages;
                                    }
                                    else if (Array.isArray(pdfData)) {
                                        pages = pdfData;
                                    }
                                    else if ((_b = pdfData === null || pdfData === void 0 ? void 0 : pdfData.data) === null || _b === void 0 ? void 0 : _b.Pages) {
                                        pages = pdfData.data.Pages;
                                    }
                                    console.log('Number of pages found:', pages.length);
                                    const texts = [];
                                    for (let i = 0; i < pages.length; i++) {
                                        const page = pages[i];
                                        console.log(`Page ${i + 1} structure:`, Object.keys(page || {}));
                                        // Try different text extraction methods
                                        if (page === null || page === void 0 ? void 0 : page.Texts) {
                                            console.log(`Page ${i + 1} Texts:`, page.Texts.length);
                                            for (const textItem of page.Texts) {
                                                if (textItem.R) {
                                                    for (const r of textItem.R) {
                                                        const decoded = decodeURIComponent(r.T || '');
                                                        if (decoded.trim()) {
                                                            texts.push(decoded);
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        else if (page === null || page === void 0 ? void 0 : page.text) {
                                            // Direct text property
                                            texts.push(page.text);
                                        }
                                        else if (page === null || page === void 0 ? void 0 : page.content) {
                                            // Content property
                                            texts.push(page.content);
                                        }
                                        texts.push('\n');
                                    }
                                    const result = texts.join(' ').trim();
                                    console.log('✅ PDF EXTRACTION: pdf2json successful, text length:', result.length);
                                    console.log('First 200 chars:', result.substring(0, 200));
                                    resolve(result);
                                }
                                catch (e) {
                                    console.log('❌ PDF EXTRACTION: pdf2json parsing error:', e);
                                    reject(new Error('Failed to parse pdf2json output'));
                                }
                            });
                            // Add timeout to prevent hanging
                            const timeout = setTimeout(() => {
                                reject(new Error('pdf2json timeout'));
                            }, 10000);
                            pdfParser.on('pdfParser_dataReady', () => {
                                clearTimeout(timeout);
                            });
                            pdfParser.on('pdfParser_dataError', () => {
                                clearTimeout(timeout);
                            });
                            pdfParser.parseBuffer(buffer);
                        }
                        catch (e) {
                            console.log('❌ PDF EXTRACTION: pdf2json initialization error:', e);
                            reject(new Error('Failed to initialize pdf2json'));
                        }
                    });
                }
                catch (error) {
                    console.log('❌ PDF EXTRACTION: pdf2json method failed:', error instanceof Error ? error.message : 'Unknown error');
                    return '';
                }
            });
            const tryPdfJs = () => __awaiter(this, void 0, void 0, function* () {
                try {
                    console.log('📄 PDF EXTRACTION: Trying pdf.js method...');
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    let pdfjsLib;
                    try {
                        // Try different pdf.js paths
                        try {
                            pdfjsLib = require('pdfjs-dist/legacy/build/pdf');
                            console.log('📄 PDF EXTRACTION: Using pdfjs-dist/legacy/build/pdf');
                        }
                        catch (e1) {
                            try {
                                pdfjsLib = require('pdfjs-dist/build/pdf');
                                console.log('📄 PDF EXTRACTION: Using pdfjs-dist/build/pdf');
                            }
                            catch (e2) {
                                pdfjsLib = require('pdfjs-dist');
                                console.log('📄 PDF EXTRACTION: Using pdfjs-dist');
                            }
                        }
                        // Set worker source
                        if (pdfjsLib.GlobalWorkerOptions) {
                            try {
                                pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/legacy/build/pdf.worker.js');
                            }
                            catch (e1) {
                                try {
                                    pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/build/pdf.worker.js');
                                }
                                catch (e2) {
                                    // Use CDN as fallback
                                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
                                }
                            }
                        }
                    }
                    catch (e) {
                        console.log('❌ PDF EXTRACTION: pdf.js library loading failed:', e);
                        return '';
                    }
                    // Convert Buffer to Uint8Array for pdf.js
                    const uint8Array = new Uint8Array(buffer);
                    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
                    const pdf = yield loadingTask.promise;
                    console.log('📄 PDF EXTRACTION: PDF loaded, pages:', pdf.numPages);
                    let text = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = yield pdf.getPage(i);
                        const content = yield page.getTextContent();
                        const pageText = content.items.map((it) => it.str).join(' ');
                        text += pageText + '\n';
                        console.log(`📄 PDF EXTRACTION: Page ${i} text length:`, pageText.length);
                    }
                    console.log('✅ PDF EXTRACTION: pdf.js successful, total text length:', text.length);
                    return text;
                }
                catch (error) {
                    console.log('❌ PDF EXTRACTION: pdf.js failed:', error instanceof Error ? error.message : 'Unknown error');
                    return '';
                }
            });
            const tryPdfLib = () => __awaiter(this, void 0, void 0, function* () {
                try {
                    console.log('📄 PDF EXTRACTION: Trying pdf-lib method...');
                    const pdfDoc = yield pdf_lib_1.PDFDocument.load(buffer);
                    console.log('📄 PDF EXTRACTION: PDF loaded with pdf-lib, pages:', pdfDoc.getPageCount());
                    let text = '';
                    const pages = pdfDoc.getPages();
                    for (let i = 0; i < pages.length; i++) {
                        const page = pages[i];
                        console.log(`📄 PDF EXTRACTION: Processing page ${i + 1}`);
                        // Try to extract text from page annotations and content
                        try {
                            // This is a basic approach - pdf-lib is more for manipulation than text extraction
                            // But we can try to get some basic info
                            const pageSize = page.getSize();
                            console.log(`📄 PDF EXTRACTION: Page ${i + 1} size:`, pageSize);
                            // For now, just add a placeholder - pdf-lib is not ideal for text extraction
                            text += `[Page ${i + 1} - Text extraction not available with pdf-lib]\n`;
                        }
                        catch (e) {
                            console.log(`📄 PDF EXTRACTION: Page ${i + 1} processing error:`, e);
                        }
                    }
                    console.log('✅ PDF EXTRACTION: pdf-lib completed, text length:', text.length);
                    return text;
                }
                catch (error) {
                    console.log('❌ PDF EXTRACTION: pdf-lib failed:', error instanceof Error ? error.message : 'Unknown error');
                    return '';
                }
            });
            // Try strategies in order - pdf-lib direct extraction first (since link extraction works)
            console.log('🔄 PDF EXTRACTION: Trying extraction methods...');
            const text1 = yield this.extractTextFromPdfLib(buffer);
            if (text1 && text1.trim().length > 50) {
                console.log('✅ PDF EXTRACTION: pdf-lib direct extraction succeeded, using result');
                return text1;
            }
            const text2 = yield tryPdfParse();
            if (text2 && text2.trim().length > 50) {
                console.log('✅ PDF EXTRACTION: pdf-parse succeeded, using result');
                return text2;
            }
            const text3 = yield tryPdf2Json().catch(() => '');
            if (text3 && text3.trim().length > 50) {
                console.log('✅ PDF EXTRACTION: pdf2json succeeded, using result');
                return text3;
            }
            const text4 = yield tryPdfJs();
            if (text4 && text4.trim().length > 50) {
                console.log('✅ PDF EXTRACTION: pdf.js succeeded, using result');
                return text4;
            }
            const text5 = yield tryPdfLib();
            if (text5 && text5.trim().length > 50) {
                console.log('✅ PDF EXTRACTION: pdf-lib fallback succeeded, using result');
                return text5;
            }
            console.log('❌ PDF EXTRACTION: All methods failed, returning empty string');
            console.log('📊 PDF EXTRACTION SUMMARY:');
            console.log('  pdf-lib direct result length:', (text1 === null || text1 === void 0 ? void 0 : text1.length) || 0);
            console.log('  pdf-parse result length:', (text2 === null || text2 === void 0 ? void 0 : text2.length) || 0);
            console.log('  pdf2json result length:', (text3 === null || text3 === void 0 ? void 0 : text3.length) || 0);
            console.log('  pdf.js result length:', (text4 === null || text4 === void 0 ? void 0 : text4.length) || 0);
            console.log('  pdf-lib fallback result length:', (text5 === null || text5 === void 0 ? void 0 : text5.length) || 0);
            return '';
        });
    }
    /**
     * Fallback PDF text extraction using pdf.js (legacy if available)
     */
    extractTextFromPDFViaPdfJs(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                let pdfjsLib;
                try {
                    pdfjsLib = require('pdfjs-dist/legacy/build/pdf');
                    if (pdfjsLib.GlobalWorkerOptions) {
                        pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/legacy/build/pdf.worker.js');
                    }
                }
                catch (_e) {
                    pdfjsLib = require('pdfjs-dist/build/pdf.js');
                    if (pdfjsLib.GlobalWorkerOptions) {
                        pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/build/pdf.worker.js');
                    }
                }
                const loadingTask = pdfjsLib.getDocument({ data: buffer });
                const pdf = yield loadingTask.promise;
                let text = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = yield pdf.getPage(i);
                    const content = yield page.getTextContent();
                    const pageText = content.items.map((it) => it.str).join(' ');
                    text += pageText + '\n';
                }
                return text;
            }
            catch (_error) {
                return '';
            }
        });
    }
    /**
     * Simple text extraction fallback for Docker environments
     */
    extractTextFromPDFSimple(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('📄 PDF EXTRACTION: Trying simple text extraction...');
                // Convert buffer to string and look for text patterns
                const bufferString = buffer.toString('binary');
                // Look for common text patterns in PDF
                const textPatterns = [
                    /BT\s+([^E]+)ET/g, // Text objects
                    /\(([^)]+)\)/g, // Text in parentheses
                    /\[([^\]]+)\]/g, // Text in brackets
                    /\/[A-Za-z]+\s+([^\s]+)/g // Named objects
                ];
                let extractedText = '';
                for (const pattern of textPatterns) {
                    const matches = bufferString.match(pattern);
                    if (matches) {
                        extractedText += matches.join(' ') + ' ';
                    }
                }
                // Clean up the extracted text
                extractedText = extractedText
                    .replace(/[^\x20-\x7E]/g, ' ') // Remove non-printable characters
                    .replace(/\s+/g, ' ') // Normalize whitespace
                    .trim();
                console.log('✅ PDF EXTRACTION: Simple extraction result length:', extractedText.length);
                return extractedText;
            }
            catch (error) {
                console.log('❌ PDF EXTRACTION: Simple extraction failed:', error instanceof Error ? error.message : 'Unknown error');
                return '';
            }
        });
    }
    /**
     * Advanced text extraction using regex patterns for PDF content
     */
    extractTextFromPDFAdvanced(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('📄 PDF EXTRACTION: Trying advanced text extraction...');
                const bufferString = buffer.toString('binary');
                let extractedText = '';
                // More sophisticated patterns for text extraction
                const patterns = [
                    // Text in parentheses (most common)
                    /\(([^)]+)\)/g,
                    // Text in brackets
                    /\[([^\]]+)\]/g,
                    // Text between BT and ET (text objects)
                    /BT\s+([^E]+)ET/g,
                    // Text after Tj (text showing operator)
                    /([A-Za-z0-9\s@\.\-_]+)\s+Tj/g,
                    // Text after TJ (text showing operator for arrays)
                    /\[([^\]]+)\]\s+TJ/g,
                    // Text in strings
                    /"([^"]+)"/g,
                    // Text after /F (font) commands
                    /\/F\d+\s+([A-Za-z0-9\s@\.\-_]+)/g,
                    // Text in content streams
                    /stream\s+([\s\S]*?)\s+endstream/g
                ];
                for (const pattern of patterns) {
                    const matches = bufferString.match(pattern);
                    if (matches) {
                        for (const match of matches) {
                            // Clean the match
                            let cleanMatch = match
                                .replace(/[^\x20-\x7E]/g, ' ') // Remove non-printable
                                .replace(/\s+/g, ' ') // Normalize whitespace
                                .trim();
                            // Only add if it looks like real text
                            if (cleanMatch.length > 2 &&
                                /[A-Za-z]/.test(cleanMatch) && // Contains letters
                                !/^[0-9\s]+$/.test(cleanMatch) && // Not just numbers
                                !/^[\/\\]+$/.test(cleanMatch)) { // Not just slashes
                                extractedText += cleanMatch + ' ';
                            }
                        }
                    }
                }
                // Additional cleanup
                extractedText = extractedText
                    .replace(/\s+/g, ' ') // Normalize whitespace
                    .replace(/\b\w{1,2}\b/g, '') // Remove very short words
                    .replace(/\s+/g, ' ') // Normalize again
                    .trim();
                console.log('✅ PDF EXTRACTION: Advanced extraction result length:', extractedText.length);
                console.log('First 200 chars:', extractedText.substring(0, 200));
                return extractedText;
            }
            catch (error) {
                console.log('❌ PDF EXTRACTION: Advanced extraction failed:', error instanceof Error ? error.message : 'Unknown error');
                return '';
            }
        });
    }
    /**
     * Detects if extracted text is binary/garbled data
     */
    isBinaryOrGarbledText(text) {
        if (!text || text.length < 100)
            return false;
        // Check for high ratio of non-printable characters
        const printableChars = text.replace(/[^\x20-\x7E]/g, '').length;
        const totalChars = text.length;
        const printableRatio = printableChars / totalChars;
        // Check for common binary patterns
        const binaryPatterns = [
            /endstream endobj/g,
            /\/Filter \/FlateDecode/g,
            /\/Length \d+/g,
            /\/Type \/[A-Za-z]+/g,
            /\/Contents \d+ 0 R/g
        ];
        const binaryPatternCount = binaryPatterns.reduce((count, pattern) => {
            return count + (text.match(pattern) || []).length;
        }, 0);
        // If less than 30% printable characters or many binary patterns, it's likely garbled
        const isGarbled = printableRatio < 0.3 || binaryPatternCount > 10;
        console.log('🔍 TEXT ANALYSIS:');
        console.log('  Total characters:', totalChars);
        console.log('  Printable characters:', printableChars);
        console.log('  Printable ratio:', printableRatio.toFixed(3));
        console.log('  Binary patterns found:', binaryPatternCount);
        console.log('  Is garbled:', isGarbled);
        return isGarbled;
    }
    /**
     * Extracts readable text from PDF metadata and structure
     */
    extractTextFromPDFMetadata(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('📄 PDF EXTRACTION: Trying metadata extraction...');
                const bufferString = buffer.toString('binary');
                let extractedText = '';
                // Extract from PDF metadata
                const metadataPatterns = [
                    /\/Title\s*\(([^)]+)\)/g,
                    /\/Author\s*\(([^)]+)\)/g,
                    /\/Subject\s*\(([^)]+)\)/g,
                    /\/Keywords\s*\(([^)]+)\)/g,
                    /\/Creator\s*\(([^)]+)\)/g
                ];
                for (const pattern of metadataPatterns) {
                    const matches = bufferString.match(pattern);
                    if (matches) {
                        extractedText += matches.join(' ') + ' ';
                    }
                }
                // Look for readable text in PDF streams (more aggressive)
                const streamPatterns = [
                    /\(([A-Za-z0-9\s@\.\-_]+)\)/g, // Text in parentheses
                    /\[([A-Za-z0-9\s@\.\-_]+)\]/g, // Text in brackets
                    /([A-Za-z]{3,})/g // Words with 3+ letters
                ];
                for (const pattern of streamPatterns) {
                    const matches = bufferString.match(pattern);
                    if (matches) {
                        // Filter out obvious binary data
                        const filteredMatches = matches.filter(match => match.length > 2 &&
                            !match.includes('/') &&
                            !match.includes('\\') &&
                            match.match(/[A-Za-z]/) // Contains at least one letter
                        );
                        extractedText += filteredMatches.join(' ') + ' ';
                    }
                }
                // Clean up the extracted text
                extractedText = extractedText
                    .replace(/[^\x20-\x7E]/g, ' ') // Remove non-printable characters
                    .replace(/\s+/g, ' ') // Normalize whitespace
                    .replace(/\b\w{1,2}\b/g, '') // Remove very short words
                    .trim();
                console.log('✅ PDF EXTRACTION: Metadata extraction result length:', extractedText.length);
                return extractedText;
            }
            catch (error) {
                console.log('❌ PDF EXTRACTION: Metadata extraction failed:', error instanceof Error ? error.message : 'Unknown error');
                return '';
            }
        });
    }
    /**
     * Build a minimal fallback resume text using detected contacts
     */
    buildFallbackResumeText(contacts) {
        const parts = [];
        if (contacts.email)
            parts.push(`Email: ${contacts.email}`);
        if (contacts.phone)
            parts.push(`Phone: ${contacts.phone}`);
        if (contacts.linkedin)
            parts.push(`LinkedIn: ${contacts.linkedin}`);
        if (contacts.github)
            parts.push(`GitHub: ${contacts.github}`);
        if (contacts.leetcode)
            parts.push(`LeetCode: ${contacts.leetcode}`);
        if (contacts.website)
            parts.push(`Website: ${contacts.website}`);
        // Add a note about extraction failure
        parts.push('\nNOTE: PDF text extraction failed. Only contact information was extracted. Please provide a text-based resume for full optimization.');
        return parts.join('\n');
    }
    /**
     * Extracts text from DOCX buffer using mammoth library
     */
    extractTextFromDOCX(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield mammoth_1.default.extractRawText({ buffer });
                return result.value;
            }
            catch (error) {
                throw new Error(`DOCX parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Extracts contact links/emails/phones from plain resume text using regexes
     */
    extractContactsFromText(text, extraUrls = []) {
        const trimmed = text.replace(/\s+/g, ' ').trim();
        const contacts = {};
        const emailMatch = trimmed.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        if (emailMatch)
            contacts.email = emailMatch[0];
        const phoneMatch = trimmed.match(/\+?\d[\d\s().-]{7,}\d/);
        if (phoneMatch)
            contacts.phone = phoneMatch[0].replace(/[^\d+]/g, '');
        const urlRegex = /https?:\/\/[\w.-]+(?:\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?/gi;
        const urls = [
            ...((trimmed.match(urlRegex) || []).map(u => u.trim())),
            ...extraUrls
        ];
        const findByHost = (host) => urls.find(u => host.test(u));
        const normalize = (u) => (u ? u.replace(/\)?\.$/, '') : undefined);
        contacts.linkedin = normalize(findByHost(/linkedin\.com\/in\//i));
        contacts.github = normalize(findByHost(/github\.com\//i));
        contacts.leetcode = normalize(findByHost(/leetcode\.com\//i));
        contacts.twitter = normalize(findByHost(/twitter\.com\//i));
        // Fallback generic website (portfolio) if there is a URL that isn't one of the above
        if (!contacts.website) {
            const specialHosts = [/linkedin\.com/i, /github\.com/i, /leetcode\.com/i, /twitter\.com/i];
            const other = urls.find(u => !specialHosts.some(h => h.test(u)));
            if (other)
                contacts.website = normalize(other);
        }
        return contacts;
    }
    /**
     * Builds a short note appended to the AI prompt to force exact link preservation
     */
    buildContactPreservationNote(contacts) {
        const parts = [];
        if (contacts.email)
            parts.push(`Email=${contacts.email}`);
        if (contacts.phone)
            parts.push(`Phone=${contacts.phone}`);
        if (contacts.linkedin)
            parts.push(`LinkedIn=${contacts.linkedin}`);
        if (contacts.github)
            parts.push(`GitHub=${contacts.github}`);
        if (contacts.leetcode)
            parts.push(`LeetCode=${contacts.leetcode}`);
        if (contacts.website)
            parts.push(`Website=${contacts.website}`);
        if (contacts.twitter)
            parts.push(`Twitter=${contacts.twitter}`);
        if (parts.length === 0)
            return '';
        return `\n\nIMPORTANT: Preserve these original contact links/values EXACTLY as provided. Do not invent or change them. Use these as href targets in LaTeX, and display text may be simplified but hrefs must match exactly. Original Contacts -> ${parts.join(' | ')}

NOTE: If the resume content above is minimal (only contact information), this indicates PDF text extraction failed. In this case, create a minimal resume structure with the contact header and add a note about extraction issues. DO NOT generate fake resume content.`;
    }
    /**
     * Post-process LaTeX to enforce original contact hrefs where present
     */
    enforceContactLinksInLatex(latex, contacts) {
        let out = latex;
        // If LaTeX lacks a visible contact header, inject one after \begin{document}
        const hasHeaderLinks = /\\href\{mailto:|\\href\{tel:|linkedin\.com|github\.com|leetcode\.com/i.test(out);
        if (!hasHeaderLinks) {
            const headerParts = [];
            const displayOr = (value, fallback) => value || fallback || '';
            if (contacts.phone)
                headerParts.push(`\\href{tel:${contacts.phone}}{${contacts.phone}}`);
            if (contacts.email)
                headerParts.push(`\\href{mailto:${contacts.email}}{${contacts.email}}`);
            if (contacts.linkedin)
                headerParts.push(`\\href{${contacts.linkedin}}{LinkedIn}`);
            if (contacts.github)
                headerParts.push(`\\href{${contacts.github}}{GitHub}`);
            if (contacts.leetcode)
                headerParts.push(`\\href{${contacts.leetcode}}{LeetCode}`);
            if (contacts.website)
                headerParts.push(`\\href{${contacts.website}}{Website}`);
            if (headerParts.length > 0) {
                const headerBlock = `\n\\begin{center}\n${headerParts.join(' \\mid ')}\n\\end{center}\n`;
                out = out.replace(/\\begin\{document\}\s*/i, match => `${match}${headerBlock}`);
            }
        }
        const replaceHref = (pattern, href) => {
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
            out = out.replace(/(\s|^)\\href\{https?:\\\/\\\/[^{]*\}\{([^}]*)\}/, (m, before, display) => {
                if (/linkedin\.com|github\.com|leetcode\.com/i.test(m))
                    return m;
                return `${before}\\href{${contacts.website}}{${display || contacts.website}}`;
            });
        }
        if (contacts.email) {
            // Fix mailto
            out = out.replace(/(\s|^)\\href\{mailto:[^}]*\}\{([^}]*)\}/i, (_, before, display) => `${before}\\href{mailto:${contacts.email}}{${display || contacts.email}}`);
        }
        if (contacts.phone) {
            out = out.replace(/(\s|^)\\href\{tel:[^}]*\}\{([^}]*)\}/i, (_, before, display) => `${before}\\href{tel:${contacts.phone}}{${display || contacts.phone}}`);
        }
        return out;
    }
    /**
     * Sanitizes LaTeX to avoid accidental extra pages in the final PDF
     */
    sanitizeLatexForPagination(latex) {
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
    removeHallucinatedContent(latex, originalResume) {
        var _a, _b;
        let out = latex;
        // Extract original content for comparison
        const originalSections = this.extractResumeSections(originalResume);
        console.log('Original sections found:', Object.keys(originalSections));
        console.log('Original projects content length:', ((_a = originalSections.projects) === null || _a === void 0 ? void 0 : _a.length) || 0);
        console.log('Original experience content length:', ((_b = originalSections.experience) === null || _b === void 0 ? void 0 : _b.length) || 0);
        // Only remove sections if they are completely empty in original AND contain placeholder text
        const hasPlaceholderText = (text) => {
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
    optimizeResumeWithAI(resumeText, jobDescription, contacts) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
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

SPECIAL CASE - CONTACT ONLY RESUME:
- If only contact information is provided (like "Phone: 49, LinkedIn: https://..."), this means PDF text extraction failed
- In this case, create a minimal resume with:
  - Header with contact information using the provided links
  - A note: "Resume content could not be extracted from PDF. Please provide a text-based resume for full optimization."
  - Basic sections but leave them empty or with the note above
  - DO NOT generate fake content or placeholders

REQUIREMENTS:
- Use a simple, compilable preamble with hyperref and geometry
- Organize with clear sections (SUMMARY, EDUCATION, TECHNICAL SKILLS, EXPERIENCE, PROJECTS, ACHIEVEMENTS)
- Include a header (centered) with name and contact \\href links
- Avoid exotic packages and stick to those in the template
- Only include sections that have actual content from the original resume
- Extract and use REAL information from the resume content provided
- If resume content is minimal (only contacts), create a basic structure with appropriate notes about extraction issues`;
            // Check if this is a contact-only scenario
            const isContactOnly = resumeText.length < 200 &&
                (resumeText.includes('LinkedIn:') || resumeText.includes('GitHub:') || resumeText.includes('Phone:')) &&
                !resumeText.toLowerCase().includes('experience') &&
                !resumeText.toLowerCase().includes('education') &&
                !resumeText.toLowerCase().includes('project');
            let userPrompt = `Resume Content:\n${resumeText}\n\nJob Description:\n${jobDescription}${this.buildContactPreservationNote(contacts)}`;
            if (isContactOnly) {
                userPrompt += `\n\nCRITICAL: This is a CONTACT-ONLY scenario. The PDF text extraction failed and only contact information was extracted. Create a minimal resume with:
1. Header with contact information
2. A clear note: "Resume content could not be extracted from PDF. Please provide a text-based resume for full optimization."
3. Empty sections or sections with the extraction note
4. DO NOT generate fake content, projects, or experience`;
            }
            // Try different model names in case one is not available
            const modelNames = [
                "sonar-pro",
                "sonar",
                "llama-3.1-sonar-large-128k-online",
                "llama-3.1-sonar-huge-128k-online"
            ];
            let lastError = null;
            for (const modelName of modelNames) {
                try {
                    console.log(`Trying model: ${modelName}`);
                    // Use Perplexity's chat completion API
                    const response = yield this.perplexityClient.chat.completions.create({
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
                        temperature: 0.1, // Lower temperature to reduce creativity and hallucination
                        top_p: 0.8, // Focus on more likely tokens
                        frequency_penalty: 0.1 // Slight penalty for repetition (removed presence_penalty)
                    });
                    const messageContent = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
                    if (!messageContent) {
                        throw new Error('No content received from AI model');
                    }
                    // Handle different content types
                    let optimizedContent;
                    if (typeof messageContent === 'string') {
                        optimizedContent = messageContent;
                    }
                    else if (Array.isArray(messageContent)) {
                        // Extract text from content chunks
                        optimizedContent = messageContent
                            .filter(chunk => chunk.type === 'text')
                            .map(chunk => chunk.text)
                            .join('');
                    }
                    else {
                        throw new Error('Unexpected content format from AI model');
                    }
                    console.log(`Successfully used model: ${modelName}`);
                    return optimizedContent;
                }
                catch (error) {
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
            throw new Error(`All AI models failed. Last error: ${(lastError === null || lastError === void 0 ? void 0 : lastError.message) || 'Unknown error'}`);
        });
    }
    /**
     * Validates that the AI output contains proper LaTeX structure
     */
    validateLaTeXContent(content) {
        const hasDocumentClass = content.includes('\\documentclass');
        const hasEndDocument = content.includes('\\end{document}');
        return hasDocumentClass && hasEndDocument;
    }
    /**
     * Validates that the AI output doesn't contain hallucinated content
     * by checking if major sections contain content that wasn't in the original resume
     */
    validateContentFidelity(aiOutput, originalResume) {
        // Extract key sections from AI output
        const aiSections = this.extractResumeSections(aiOutput);
        const originalSections = this.extractResumeSections(originalResume);
        // Check for major content additions that weren't in original
        for (const [section, aiContent] of Object.entries(aiSections)) {
            if (aiContent.trim().length === 0)
                continue;
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
    extractResumeSections(text) {
        console.log('=== EXTRACTING RESUME SECTIONS ===');
        console.log('Input text length:', text.length);
        console.log('Input text preview:', text.substring(0, 500));
        const sections = {};
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
            }
            else {
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
            }
            else {
                console.log('❌ No project mentions found');
            }
        }
        if (!sections.experience && (text.toLowerCase().includes('experience') || text.toLowerCase().includes('worked'))) {
            console.log('Looking for experience mentions without section header...');
            const expMatches = text.match(/(?:worked|experience|employed|job|position)[^.!?]*[.!?]/gi);
            if (expMatches && expMatches.length > 0) {
                sections.experience = expMatches.join(' ').trim();
                console.log('✅ Found experience without section header:', sections.experience.substring(0, 200));
            }
            else {
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
    compileLaTeXToPDF(latexContent) {
        return __awaiter(this, void 0, void 0, function* () {
            // Validate LaTeX content
            if (!this.validateLaTeXContent(latexContent)) {
                throw new Error('Invalid LaTeX content: Missing \\documentclass or \\end{document}');
            }
            // Generate unique filename
            const timestamp = Date.now();
            const latexFileName = `resume_optimized_${timestamp}.ltx`;
            const pdfFileName = `resume_optimized_${timestamp}.pdf`;
            const latexFilePath = path_1.default.join(this.outputDir, latexFileName);
            const pdfFilePath = path_1.default.join(this.outputDir, pdfFileName);
            try {
                // Save LaTeX content to file and return LaTeX path (skip PDF compilation for now)
                fs_1.default.writeFileSync(latexFilePath, latexContent, 'utf8');
                return latexFilePath;
            }
            catch (error) {
                // Clean up files on error
                this.cleanupLaTeXFiles(latexFilePath);
                // If compilation failed but LaTeX file exists, return LaTeX file
                if (fs_1.default.existsSync(latexFilePath)) {
                    console.log('Returning LaTeX file (PDF compilation disabled)');
                    return latexFilePath;
                }
                throw new Error(`LaTeX compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Cleans up LaTeX auxiliary files after compilation
     */
    cleanupLaTeXFiles(latexFilePath) {
        const baseName = path_1.default.basename(latexFilePath, '.ltx');
        const auxExtensions = ['.aux', '.log', '.out', '.toc', '.fdb_latexmk', '.fls', '.synctex.gz'];
        auxExtensions.forEach(ext => {
            const auxFilePath = path_1.default.join(this.outputDir, `${baseName}${ext}`);
            if (fs_1.default.existsSync(auxFilePath)) {
                try {
                    fs_1.default.unlinkSync(auxFilePath);
                }
                catch (error) {
                    console.warn(`Failed to delete auxiliary file ${auxFilePath}:`, error);
                }
            }
        });
    }
    /**
     * Main method to process resume optimization request
     */
    processResumeOptimization(request) {
        return __awaiter(this, void 0, void 0, function* () {
            let resumeRecord = null;
            try {
                // Create initial resume record
                resumeRecord = yield resume_schema_1.default.create({
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
                let resumeText = yield this.extractResumeText(request.resumeFile);
                const additionalUrls = yield this.extractAdditionalUrls(request.resumeFile);
                console.log('=== INITIAL EXTRACTION RESULTS ===');
                console.log('Initial extracted text length:', resumeText.length);
                console.log('Full extracted text:');
                console.log('----------------------------------------');
                console.log(resumeText);
                console.log('----------------------------------------');
                // Check if extracted text is garbled/binary data
                if (resumeText.length > 0 && this.isBinaryOrGarbledText(resumeText)) {
                    console.log('⚠️  DETECTED GARBLED TEXT - Trying metadata extraction...');
                    const metadataText = yield this.extractTextFromPDFMetadata(request.resumeFile.buffer);
                    if (metadataText.trim().length > 50) {
                        resumeText = metadataText;
                        console.log('✅ Using metadata extraction result');
                    }
                    else {
                        console.log('❌ Metadata extraction also failed, will use contact fallback');
                    }
                }
                // If no text found, try fallback via pdf.js
                if (!resumeText.trim() && path_1.default.extname(request.resumeFile.originalname).toLowerCase() === '.pdf') {
                    console.log('=== TRYING PDF.JS FALLBACK ===');
                    const fallbackText = yield this.extractTextFromPDFViaPdfJs(request.resumeFile.buffer);
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
                // Additional fallback: Try to extract text using advanced text-based approach
                if (!resumeText.trim() && path_1.default.extname(request.resumeFile.originalname).toLowerCase() === '.pdf') {
                    console.log('=== TRYING ADVANCED TEXT EXTRACTION FALLBACK ===');
                    const advancedText = yield this.extractTextFromPDFAdvanced(request.resumeFile.buffer);
                    console.log('Advanced text extraction length:', advancedText.length);
                    if (advancedText.trim()) {
                        resumeText = advancedText;
                        console.log('Advanced text extraction successful, using result');
                    }
                    else {
                        console.log('=== TRYING SIMPLE TEXT EXTRACTION FALLBACK ===');
                        const simpleText = yield this.extractTextFromPDFSimple(request.resumeFile.buffer);
                        console.log('Simple text extraction length:', simpleText.length);
                        if (simpleText.trim()) {
                            resumeText = simpleText;
                            console.log('Simple text extraction successful, using result');
                        }
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
                    console.warn('⚠️  CRITICAL: PDF text extraction completely failed!');
                    console.warn('⚠️  This might be due to:');
                    console.warn('   - PDF is image-based (scanned document)');
                    console.warn('   - PDF is password protected');
                    console.warn('   - PDF libraries not working in Docker environment');
                    console.warn('   - PDF has complex formatting');
                    console.warn('⚠️  Only contact information will be used for resume generation');
                    resumeText = this.buildFallbackResumeText(contacts);
                    console.log('Fallback text:', resumeText);
                }
                else if (this.isBinaryOrGarbledText(resumeText)) {
                    console.log('=== GARBLED TEXT DETECTED - USING CONTACT FALLBACK ===');
                    console.warn('⚠️  PDF text extraction returned garbled/binary data');
                    console.warn('⚠️  This usually means the PDF is image-based or has complex formatting');
                    console.warn('⚠️  Falling back to contact information only');
                    resumeText = this.buildFallbackResumeText(contacts);
                    console.log('Fallback text:', resumeText);
                }
                console.log('=== FINAL RESUME TEXT FOR AI ===');
                console.log('Final resume text length:', resumeText.length);
                console.log('Final resume text:');
                console.log('========================================');
                console.log(resumeText);
                console.log('========================================');
                // Check if this is a contact-only scenario
                const isContactOnly = resumeText.length < 200 &&
                    (resumeText.includes('LinkedIn:') || resumeText.includes('GitHub:') || resumeText.includes('Phone:')) &&
                    !resumeText.toLowerCase().includes('experience') &&
                    !resumeText.toLowerCase().includes('education') &&
                    !resumeText.toLowerCase().includes('project');
                if (isContactOnly) {
                    console.log('⚠️  CONTACT-ONLY SCENARIO DETECTED - PDF extraction failed');
                    console.log('⚠️  AI will be instructed to create minimal resume with extraction note');
                }
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
                yield resume_schema_1.default.findByIdAndUpdate(resumeRecord._id, {
                    extractedText: resumeText,
                    extractedContacts: contacts
                });
                // Step 2: Send to AI for optimization (with preservation note)
                console.log('=== SENDING TO AI FOR OPTIMIZATION ===');
                console.log('Resume text length being sent to AI:', resumeText.length);
                console.log('Job description being sent to AI:', request.jobDescription);
                console.log('Contacts being sent to AI:', JSON.stringify(contacts, null, 2));
                let optimizedLaTeX = yield this.optimizeResumeWithAI(resumeText, request.jobDescription, contacts);
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
                }
                else {
                    console.log('✅ No placeholder content detected in AI output');
                }
                // Apply template preamble to stabilize structure
                optimizedLaTeX = this.applyTemplatePreamble(optimizedLaTeX);
                // Step 2.7: Enforce preserved contact hrefs in LaTeX and sanitize pagination
                optimizedLaTeX = this.enforceContactLinksInLatex(optimizedLaTeX, contacts);
                optimizedLaTeX = this.sanitizeLatexForPagination(optimizedLaTeX);
                // Update resume record with final LaTeX and mark as completed
                yield resume_schema_1.default.findByIdAndUpdate(resumeRecord._id, {
                    optimizedLatex: optimizedLaTeX,
                    status: 'completed'
                });
                // Fetch the updated record
                resumeRecord = yield resume_schema_1.default.findById(resumeRecord._id);
                console.log('Resume optimization completed successfully');
                return {
                    success: true,
                    resume: resumeRecord || undefined
                };
            }
            catch (error) {
                console.error('Resume optimization failed:', error);
                // Update resume record with error if it exists
                if (resumeRecord) {
                    yield resume_schema_1.default.findByIdAndUpdate(resumeRecord._id, {
                        status: 'failed',
                        error: error instanceof Error ? error.message : 'Unknown error occurred'
                    });
                }
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error occurred'
                };
            }
        });
    }
    /**
     * Get all resumes for a user
     */
    getUserResumes(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield resume_schema_1.default.find({ user: userId })
                .sort({ createdAt: -1 })
                .lean();
        });
    }
    /**
     * Get a specific resume by ID
     */
    getResumeById(resumeId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield resume_schema_1.default.findOne({ _id: resumeId, user: userId }).lean();
        });
    }
    /**
     * Deletes old files from output directory to prevent storage buildup
     */
    cleanupOldFiles(maxAgeHours = 24) {
        const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
        const now = Date.now();
        try {
            const files = fs_1.default.readdirSync(this.outputDir);
            files.forEach(file => {
                const filePath = path_1.default.join(this.outputDir, file);
                const stats = fs_1.default.statSync(filePath);
                if (now - stats.mtime.getTime() > maxAge) {
                    fs_1.default.unlinkSync(filePath);
                    console.log(`Deleted old file: ${file}`);
                }
            });
        }
        catch (error) {
            console.warn('Failed to cleanup old files:', error);
        }
    }
}
exports.ResumeOptimizationService = ResumeOptimizationService;
