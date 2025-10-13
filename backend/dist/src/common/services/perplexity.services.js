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
exports.perplexitySearch = perplexitySearch;
const perplexity_ai_1 = __importDefault(require("@perplexity-ai/perplexity_ai"));
function perplexitySearch(queries) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = new perplexity_ai_1.default({
            apiKey: process.env.PERPLEXITY_API_KEY
        });
        // Single search
        const search = yield client.search.create({
            query: queries,
            max_results: 1
        });
        console.log(search);
        // Concurrent searches
        const tasks = Array.from({ length: 3 }, (_, i) => client.search.create({ query: `query ${i}` }));
        const results = yield Promise.all(tasks);
        console.log(`Completed ${results.length} searches`);
    });
}
