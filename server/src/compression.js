const gltfPipeline = require('gltf-pipeline');
const fs = require('fs');
const processGlb = gltfPipeline.processGlb;

/**
 * Compresses a GLB file using Draco compression.
 * @param {string} inputPath - Absolute path to the source GLB.
 * @param {string} outputPath - Absolute path for the compressed GLB.
 * @returns {Promise<boolean>} - True if compression succeeded, false otherwise.
 */
async function compressGLB(inputPath, outputPath) {
    try {
        if (!fs.existsSync(inputPath)) {
            console.error("Input GLB does not exist:", inputPath);
            return false;
        }

        const glb = fs.readFileSync(inputPath);
        const options = {
            dracoOptions: {
                compressionLevel: 7
            }
        };
        
        console.log(`Compressing GLB: ${inputPath}`);
        const results = await processGlb(glb, options);
        fs.writeFileSync(outputPath, results.glb);
        console.log(`Compression successful: ${outputPath}`);
        return true;
    } catch (err) {
        console.error("Draco Compression failed:", err);
        // If compression fails, ensure we at least copy the original if output != input
        if (inputPath !== outputPath) {
            fs.copyFileSync(inputPath, outputPath);
        }
        return false;
    }
}

module.exports = { compressGLB };
