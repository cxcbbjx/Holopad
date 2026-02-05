// Simple Cosine Similarity
function dotProduct(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}

function magnitude(a) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += a[i] * a[i];
    }
    return Math.sqrt(sum);
}

function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    const magA = magnitude(a);
    const magB = magnitude(b);
    if (magA === 0 || magB === 0) return 0;
    return dotProduct(a, b) / (magA * magB);
}

module.exports = { cosineSimilarity };