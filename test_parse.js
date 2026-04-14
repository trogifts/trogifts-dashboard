const parseDesigns = (designStr) => {
    if (!designStr) return [];
    const lines = designStr.split('\n').filter(l => l.trim() !== '');
    const designs = [];
    let currentTitle = "Design";
    
    for (const line of lines) {
        if (line.startsWith('---') && line.endsWith('---')) {
            currentTitle = line.replace(/---/g, '').trim();
        } else if (line.startsWith('http')) {
            designs.push({ title: currentTitle, url: line.trim() });
            currentTitle = `Design ${designs.length + 1}`;
        }
    }
    if (designs.length === 0) {
        lines.forEach((l, i) => {
            if (l.startsWith('http')) designs.push({ title: `Design ${i + 1}`, url: l.trim() });
        });
    }
    return designs.length > 0 ? designs : [{ title: 'Design', url: designStr }];
};

console.log(parseDesigns(`--- Photo 1 (Unsorted) ---
https://ik.imagekit.io/2qsnrshbb/TroGifts_CompletedDesigns/image_aWfFofnO4.pdf?updatedAt=1713098363630`));
