import io
import os
from typing import Optional
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageFilter, ImageOps

app = FastAPI()

# Global output directory for generated assets
BASE_DIR = os.path.dirname(__file__)
DEFAULT_OUT_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "src", "public"))
OUT_DIR = os.environ.get("SAM_OUT", DEFAULT_OUT_DIR)
os.makedirs(OUT_DIR, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/public", StaticFiles(directory=OUT_DIR), name="public")

sam_model = None
depth_pipe = None

try:
    from segment_anything import sam_model_registry, SamPredictor
    import torch
    ckpt = os.environ.get("SAM_CKPT", "")
    if ckpt and os.path.exists(ckpt):
        sam_model = sam_model_registry["vit_h"](checkpoint=ckpt)
        device = "cuda" if torch.cuda.is_available() else "cpu"
        sam_model.to(device=device)
        predictor = SamPredictor(sam_model)
    else:
        sam_model = None
except Exception:
    sam_model = None

# Lazy load depth pipeline
def get_depth_pipe():
    global depth_pipe
    if depth_pipe is None:
        from transformers import pipeline
        # Using a small, fast model for depth estimation
        # Alternatives: "LiheYoung/depth-anything-small-hf" or "Intel/dpt-hybrid-midas"
        try:
            depth_pipe = pipeline("depth-estimation", model="Intel/dpt-hybrid-midas")
        except Exception as e:
            print(f"Failed to load depth model: {e}")
            depth_pipe = None
    return depth_pipe

def simple_mask(img: Image.Image) -> Image.Image:
    g = img.convert("L")
    g = ImageOps.autocontrast(g)
    e = g.filter(ImageFilter.FIND_EDGES)
    e = e.filter(ImageFilter.MaxFilter(3))
    e = ImageOps.invert(e)
    e = e.point(lambda p: 255 if p > 200 else 0)
    return e

@app.on_event("startup")
async def startup_event():
    print("Warming up Depth Model...")
    try:
        # Trigger lazy load
        pipe = get_depth_pipe()
        if pipe:
            # Run tiny inference
            dummy = Image.new('RGB', (64, 64), color='white')
            pipe(dummy)
            print("Depth Model Warmup Complete.")
    except Exception as e:
        print(f"Warmup failed: {e}")

@app.post("/segment")
async def segment(image: UploadFile = File(...)):
    content = await image.read()
    img = Image.open(io.BytesIO(content)).convert("RGB")
    mask = None
    if sam_model is not None:
        try:
            import numpy as np
            predictor.set_image(np.array(img))
            masks, _, _ = predictor.predict(point_coords=None, point_labels=None, multimask_output=False)
            if masks is not None and len(masks) > 0:
                m = (masks[0] * 255).astype("uint8")
                mask = Image.fromarray(m)
        except Exception:
            mask = None
    if mask is None:
        mask = simple_mask(img)
    out_dir = OUT_DIR
    base = f"sam_mask_{str(abs(hash(content)))[:10]}.png"
    out_path = os.path.join(out_dir, base)
    mask.save(out_path)
    return JSONResponse({"maskUrl": f"/public/{base}"})

@app.post("/analyze_view")
async def analyze_view(image: UploadFile = File(...)):
    # Placeholder for Vision LLM (GPT-4o / Gemini Pro Vision)
    # This endpoint receives the "Vision Pulse" image.
    
    # In a real implementation:
    # 1. Encode image to base64
    # 2. Call OpenAI/Google API with the prompt:
    #    "You are Meg. You just saw a screenshot of the user's desktop. 
    #     If you see something messy, like too many tabs or a distraction, scold them. 
    #     If you see they are working hard, give them a backhanded compliment."
    
    # For now, return a success status so the Node.js layer can handle the mock response
    # or return a specific analysis if we had local VQA.
    
    return JSONResponse({
        "status": "analyzed",
        "vision_context": "desktop_screenshot",
        "suggested_mood": "scolding" 
    })

@app.post("/to-glb")
async def to_glb(image: UploadFile = File(...)):
    import trimesh
    import cv2
    import numpy as np
    
    content = await image.read()
    img = Image.open(io.BytesIO(content)).convert("RGB")
    
    # 1. Generate Mask (Reuse logic)
    mask = None
    if sam_model is not None:
        try:
            predictor.set_image(np.array(img))
            masks, _, _ = predictor.predict(point_coords=None, point_labels=None, multimask_output=False)
            if masks is not None and len(masks) > 0:
                m = (masks[0] * 255).astype("uint8")
                mask = Image.fromarray(m)
        except Exception:
            pass
    if mask is None:
        mask = simple_mask(img)
    
    # 2. Find Contour
    mask_np = np.array(mask)
    # Ensure binary
    _, thresh = cv2.threshold(mask_np, 127, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return JSONResponse({"error": "No contour found"}, status_code=500)
        
    # Pick largest contour
    c = max(contours, key=cv2.contourArea)
    # Simplify (epsilon)
    epsilon = 0.002 * cv2.arcLength(c, True)
    approx = cv2.approxPolyDP(c, epsilon, True)
    polygon = approx.squeeze() # (N, 2)
    
    # Normalize polygon to centered coordinates (-0.5 to 0.5 range approx)
    # Map image coordinates (0..W, 0..H) to (0..1, 0..1)
    # Note: Image Y is top-down, 3D Y is bottom-up usually.
    w, h = img.size
    
    # Create 3D Mesh via Extrusion
    # Trimesh expects polygon in 2D. 
    # We want final height ~1.5m. 
    # Calculate scale factor
    scale_h = 1.5
    scale_w = scale_h * (w / h)
    
    # Normalize points to 0..1 then scale
    # Flip Y for 3D (0 at bottom)
    poly_3d = []
    for p in polygon:
        x = (p[0] / w) - 0.5 # Center X
        y = 0.5 - (p[1] / h) # Center Y and Flip
        poly_3d.append([x * scale_w, y * scale_h])
        
    try:
        mesh = trimesh.creation.extrude_polygon(poly_3d, height=0.1)
    except Exception as e:
        # Fallback if polygon is invalid
        print(f"Extrusion failed: {e}")
        mesh = trimesh.creation.box([scale_w, scale_h, 0.1])

    # 3. UV Mapping
    # Project vertices onto the image plane for Front face
    # Vertices are (x, y, z).
    # We want to map x,y back to u,v.
    # U = (x / scale_w) + 0.5
    # V = (y / scale_h) + 0.5 -> But y was flipped. So V = 0.5 - (y / scale_h)?
    # Let's re-derive:
    # y_3d = (0.5 - v_img) * scale_h
    # y_3d / scale_h = 0.5 - v_img
    # v_img = 0.5 - (y_3d / scale_h)
    
    uvs = []
    for v in mesh.vertices:
        # Z is depth. We only care about X,Y for planar mapping.
        # But sides will look streaked (which is fine/expected for cutouts).
        u = (v[0] / scale_w) + 0.5
        v_coord = 0.5 - (v[1] / scale_h)
        uvs.append([u, v_coord])
        
    mesh.visual = trimesh.visual.TextureVisuals(uv=uvs, image=img)
    
    # 4. Export
    out_dir = OUT_DIR
    base = f"holo_{str(abs(hash(content)))[:10]}.glb"
    out_path = os.path.join(out_dir, base)
    
    mesh.export(out_path)
    
    return JSONResponse({
        "modelUrl": f"/public/{base}",
        "maskUrl": "generated_internally"
    })

@app.post("/to-hologram-depth")
async def to_hologram_depth(image: UploadFile = File(...)):
    import trimesh
    import numpy as np
    
    content = await image.read()
    img = Image.open(io.BytesIO(content)).convert("RGB")
    
    # 1. Estimate Depth
    pipe = get_depth_pipe()
    if pipe is None:
        return JSONResponse({"error": "Depth model unavailable"}, status_code=500)
    
    # OPTIMIZATION 1: Resolution vs VRAM Strategy
    # Resize for inference (max 512px) to prevent VRAM spikes on 4K images.
    # We keep the original 'img' for the high-res texture.
    infer_size = (512, 512)
    img_infer = img.copy()
    img_infer.thumbnail(infer_size, Image.Resampling.LANCZOS)
    
    # Inference
    output = pipe(img_infer)
    depth_map = output["depth"] # PIL Image
    
    # 2. Downsample for Mesh Generation (High res = too heavy)
    # 256x256 is decent balance (65k vertices)
    target_size = (256, 256)
    depth_small = depth_map.resize(target_size)
    
    # No need to resize 'img' here for texture - we want high res texture!
    # But we do need 'img_small' if we wanted to bake vertex colors, 
    # but for UV mapping we use the original full-res 'img'.
    
    depth_array = np.array(depth_small).astype(np.float32)
    # Normalize depth 0..1
    depth_min = depth_array.min()
    depth_max = depth_array.max()
    
    if depth_max > depth_min:
        depth_array = (depth_array - depth_min) / (depth_max - depth_min)
    else:
        depth_array = np.zeros_like(depth_array)
    
    # FIX 2: Fix "Backwards" Depth
    # User feedback: "Background is pushing forward". MiDaS often outputs inverse depth.
    # We invert it so White (Close) -> High Z (Sticks out) ??
    # Actually user said: "vertices[:, 2] = (1.0 - normalized_depth) * max_z"
    # This implies the user wants to FLIP the depth map.
    depth_array = 1.0 - depth_array

    # OPTIMIZATION 4: Adaptive Smoothing (Bilateral Filter)
    # Apply smoothing to the depth map BEFORE mesh generation.
    # Bilateral filter preserves edges (high variance) while smoothing flat areas (low variance).
    # We convert to float32 image for OpenCV
    try:
        # cv2 requires float32 to be 0..1 or 0..255. 
        # depth_array is 0..1.
        depth_cv = depth_array
        # d=5 (diameter), sigmaColor=0.1 (depth variance), sigmaSpace=5 (spatial distance)
        depth_smooth = cv2.bilateralFilter(depth_cv, 5, 0.1, 5)
        depth_array = depth_smooth
    except Exception as e:
        print(f"Adaptive smoothing failed: {e}")

    # OPTIMIZATION: Alpha Masking (SAM)
    # Multiply depth map by SAM mask to clean up edges (hair, shoulders).
    # depth_final = depth_map * sam_mask
    mask = None
    if sam_model is not None:
        try:
            predictor.set_image(np.array(img))
            masks, _, _ = predictor.predict(point_coords=None, point_labels=None, multimask_output=False)
            if masks is not None and len(masks) > 0:
                m = (masks[0] * 255).astype("uint8")
                mask = Image.fromarray(m)
        except Exception:
            pass
    if mask is None:
        mask = simple_mask(img)
    
    # Resize mask to match depth_array size
    mask_small = mask.resize(target_size)
    mask_array = np.array(mask_small).astype(np.float32) / 255.0
    
    # Apply Mask
    depth_array = depth_array * mask_array

    variance = np.var(depth_array)

    # 3. Create Grid Mesh
    rows, cols = target_size
    # Create grid of coordinates
    # X: 0..1, Y: 0..1
    x = np.linspace(0, 1, cols)
    y = np.linspace(0, 1, rows)
    xx, yy = np.meshgrid(x, y)
    
    # Flatten
    # Note: Image Y is usually top-down. 3D Y is bottom-up.
    # So we invert Y for 3D coordinate, but keep UV Y consistent with image.
    
    # Vertices: (x, y, z)
    # Scale width/height to aspect ratio
    aspect = img.width / img.height
    scale_w = 1.0 * aspect
    scale_h = 1.0
    
    # OPTIMIZATION 1: Holographic Swing
    # Depth scaling factor (how much the mesh "sticks out").
    # Can be tuned via DEPTH_SCALE env var, defaults to a stronger 0.6 for more 3D pop.
    try:
        depth_scale_factor = float(os.environ.get("DEPTH_SCALE", "0.6"))
    except Exception:
        depth_scale_factor = 0.6
    scale_depth = scale_w * depth_scale_factor 
    
    # XX, YY are 0..1. Map to centered aspect ratio.
    vx = (xx - 0.5) * scale_w
    vy = (0.5 - yy) * scale_h # Flip Y so top of image is +Y
    vz = depth_array * scale_depth # Z is depth
    
    # --- MULTI-VIEW CONSISTENCY: Volumetric Hull Generation ---
    # 1. Create Front Vertices
    v_front = np.column_stack((vx.ravel(), vy.ravel(), vz.ravel()))
    
    # 2. Create Back Vertices (Mirror Z and apply a slight "taper" for thickness)
    # We assume the back is roughly 30% of the front's depth variation
    vz_back = - (depth_array * (scale_depth * 0.3)) 
    v_back = np.column_stack((vx.ravel(), vy.ravel(), vz_back.ravel()))
    
    # Combine all vertices
    vertices = np.vstack((v_front, v_back))
    
    # 3. Create Faces for Front and Back
    # Front faces (v0, v1, v2)
    f_front1 = np.column_stack((v0.ravel(), v1.ravel(), v2.ravel()))
    f_front2 = np.column_stack((v0.ravel(), v2.ravel(), v3.ravel()))
    
    # Back faces (need to flip winding order for inverted normals)
    offset = len(v_front)
    f_back1 = np.column_stack((v0.ravel() + offset, v2.ravel() + offset, v1.ravel() + offset))
    f_back2 = np.column_stack((v0.ravel() + offset, v3.ravel() + offset, v2.ravel() + offset))
    
    # 4. Bridge the Edges (Watertight Geometry)
    # We find boundary indices and create side-wall faces
    edge_faces = []
    # Top/Bottom edges
    for c in range(cols - 1):
        # Top edge
        v_f_top = 0 * cols + c
        v_b_top = v_f_top + offset
        next_f = 0 * cols + (c + 1)
        next_b = next_f + offset
        edge_faces.append([v_f_top, next_f, next_b])
        edge_faces.append([v_f_top, next_b, v_b_top])
        
        # Bottom edge
        v_f_bot = (rows - 1) * cols + c
        v_b_bot = v_f_bot + offset
        next_f = (rows - 1) * cols + (c + 1)
        next_b = next_f + offset
        edge_faces.append([v_f_bot, next_b, next_f])
        edge_faces.append([v_f_bot, v_b_bot, next_b])

    # Left/Right edges
    for r in range(rows - 1):
        # Left edge
        v_f_left = r * cols + 0
        v_b_left = v_f_left + offset
        next_f = (r + 1) * cols + 0
        next_b = next_f + offset
        edge_faces.append([v_f_left, next_f, next_b])
        edge_faces.append([v_f_left, next_b, v_b_left])
        
        # Right edge
        v_f_right = r * cols + (cols - 1)
        v_b_right = v_f_right + offset
        next_f = (r + 1) * cols + (cols - 1)
        next_b = next_f + offset
        edge_faces.append([v_f_right, next_b, next_f])
        edge_faces.append([v_f_right, v_b_right, next_b])

    # Combine all faces
    faces = np.vstack((f_front1, f_front2, f_back1, f_back2, np.array(edge_faces)))
    
    # 5. UV Mapping (Project front texture to both sides for consistency)
    u_crop = np.linspace(0.01, 0.99, cols)
    v_crop = np.linspace(0.01, 0.99, rows)
    xx_uv, yy_uv = np.meshgrid(u_crop, v_crop)
    u_flat = xx_uv.ravel()
    v_flat = 1.0 - yy_uv.ravel()
    
    uvs_front = np.column_stack((u_flat, v_flat))
    uvs_back = np.column_stack((u_flat, v_flat)) # Mirror UVs for the back
    uvs = np.vstack((uvs_front, uvs_back))
    
    # OPTIMIZATION 5: Normal Map Baking
    # Generate Normal Map from high-res depth (512px) to recover lost detail
    normal_map_img = None
    try:
        # Resize depth to 512 for normal calculation
        depth_high = depth_map.resize((512, 512))
        d_arr = np.array(depth_high).astype(np.float32)
        
        # Gradients
        dz_dx = np.gradient(d_arr, axis=1)
        dz_dy = np.gradient(d_arr, axis=0)
        
        # "Beat" Trellis 2: Increase normal strength for "edge sharpness"
        strength = 12.0 # Increased from 5.0
        norm = np.dstack((-dz_dx * strength, -dz_dy * strength, np.ones_like(d_arr)))
        
        # Normalize
        n = np.linalg.norm(norm, axis=2)
        norm[:, :, 0] /= n
        norm[:, :, 1] /= n
        norm[:, :, 2] /= n
        
        # Map -1..1 to 0..255
        norm_rgb = ((norm + 1.0) / 2.0 * 255.0).astype(np.uint8)
        normal_map_img = Image.fromarray(norm_rgb)
    except Exception as e:
        print(f"Normal baking failed: {e}")

    # OPTIMIZATION 6: "De-lighting" Heuristic
    # Separate baked shadows from albedo to improve dynamic lighting in the engine.
    # We increase brightness and contrast slightly to simulate a "delit" albedo.
    albedo = img
    try:
        from PIL import ImageEnhance
        enhancer = ImageEnhance.Contrast(albedo)
        albedo = enhancer.enhance(1.15)
        enhancer = ImageEnhance.Brightness(albedo)
        albedo = enhancer.enhance(1.05)
    except Exception:
        pass

    # 4. Create Mesh
    # We construct a PBR material with "commercial grade" albedo/normal maps.
    mat = trimesh.visual.material.PBRMaterial(
        name="HoloMaterial",
        baseColorTexture=albedo,
        normalTexture=normal_map_img,
        metallicFactor=0.0,
        roughnessFactor=0.5, # Slightly smoother than 0.6 for better speculars
        doubleSided=True
    )
    
    mesh = trimesh.Trimesh(
        vertices=vertices, 
        faces=faces, 
        visual=trimesh.visual.TextureVisuals(uv=uvs, material=mat)
    )
    
    # "Sandwich" Strategy: Post-Processing Mesh Refinement
    # Ensure watertight geometry and clean manifold surfaces.
    try:
        mesh.remove_duplicate_faces()
        mesh.remove_degenerate_faces()
        mesh.remove_infinite_values()
        mesh.remove_unreferenced_vertices()
        mesh.fix_normals()
    except Exception as e:
        print(f"Mesh cleaning failed: {e}")

    # OPTIMIZATION 2: Mesh Smoothing
    # We keep the Laplacian smooth on the geometry (low freq) 
    # while the Normal Map handles the high freq details.
    try:
        trimesh.smoothing.filter_laplacian(mesh, iterations=1) # Reduced iterations
    except Exception as e:
        print(f"Smoothing failed: {e}")

    # FIX 3: Centering the Pivot (Origin Adjustment)
    # User feedback: "Model rotates around its 'back wall'... wobble awkwardly."
    # Center the Z-axis so the 'middle' of the depth is at 0.
    try:
        center = mesh.bounding_box.center
        # We explicitly center the mesh on X, Y, and Z.
        mesh.apply_translation(-center)
    except Exception as e:
        print(f"Centering failed: {e}")

    # 5. Export
    out_dir = OUT_DIR
    base = f"holo_depth_{str(abs(hash(content)))[:10]}.glb"
    out_path = os.path.join(out_dir, base)
    
    mesh.export(out_path)
    
    return JSONResponse({
        "modelUrl": f"/public/{base}",
        "type": "depth_mesh"
    })
