import Perplexity from '@perplexity-ai/perplexity_ai';

export async function perplexitySearch(queries: string[]) {
    const client = new Perplexity({
        apiKey: process.env.PERPLEXITY_API_KEY
    });
    
    // Single search
    const search = await client.search.create({
        query: queries,
        max_results: 1
    });
    console.log(search);
    
    // Concurrent searches
    const tasks = Array.from({ length: 3 }, (_, i) =>
        client.search.create({ query: `query ${i}` })
    );
    
    const results = await Promise.all(tasks);
    console.log(`Completed ${results.length} searches`);
}

