import os
import re

def bundle():
    # Define files and directories
    workspace_dir = r"d:\20250501-mc"
    index_path = os.path.join(workspace_dir, "index.html")
    style_path = os.path.join(workspace_dir, "style.css")
    output_path = os.path.join(workspace_dir, "完整的HTML.html")
    
    # List of scripts in exact sequential loading order
    scripts_list = [
        'js/texture_data.js',
        'js/1_globals.js',
        'js/2_items.js',
        'js/3_scene.js',
        'js/4_textures.js',
        'js/5_ui_state.js',
        'js/6_chat.js',
        'js/7_inventory.js',
        'js/8_models.js',
        'js/9_entities.js',
        'js/9_5_mob_spawning.js',
        'js/10_world.js',
        'js/11_save_menu.js',
        'js/12_network.js',
        'js/13_input.js',
        'js/15_achievements.js',
        'js/14_main_loop.js'
    ]
    
    print("Reading index.html...")
    with open(index_path, "r", encoding="utf-8") as f:
        index_content = f.read()
        
    print("Reading style.css...")
    with open(style_path, "r", encoding="utf-8") as f:
        style_content = f.read()
        
    # 1. Replace style.css link with inlined style block
    style_placeholder = '<link rel="stylesheet" href="style.css">'
    if style_placeholder in index_content:
        index_content = index_content.replace(
            style_placeholder,
            f"<style>\n{style_content}\n</style>"
        )
    else:
        index_content = re.sub(
            r'<link[^>]*href=["\']style\.css["\'][^>]*>',
            f"<style>\n{style_content}\n</style>",
            index_content
        )
        
    # 2. Find where the dynamic loader block starts
    loader_start_marker = "// Load all game scripts sequentially after imports are ready"
    
    parts = index_content.split(loader_start_marker)
    if len(parts) < 2:
        print("Error: Could not find the script loader marker in index.html!")
        return
        
    base_html = parts[0]
    rest = parts[1]
    
    # Locate the closing </script> in rest
    closing_script_idx = rest.find("</script>")
    if closing_script_idx == -1:
        print("Error: Could not find closing </script> after loader marker!")
        return
        
    after_script = rest[closing_script_idx + len("</script>"):]
    
    # Assemble the bundled scripts inside the SAME <script type="module"> tag (Flat loading)
    bundled_scripts_str = "\n    // ==================== BUNDLED GAME SCRIPTS START ====================\n"
    
    for script_rel_path in scripts_list:
        script_full_path = os.path.join(workspace_dir, script_rel_path)
        print(f"Reading and inlining {script_rel_path}...")
        with open(script_full_path, "r", encoding="utf-8") as sf:
            script_code = sf.read()
            
        bundled_scripts_str += f"\n    // --- START OF BUNDLED SCRIPT: {script_rel_path} ---\n"
        bundled_scripts_str += script_code
        bundled_scripts_str += f"\n    // --- END OF BUNDLED SCRIPT: {script_rel_path} ---\n\n"
        
    # Add the closing script tag
    bundled_scripts_str += "</script>"
    # Reassemble the final HTML content
    final_html = base_html + bundled_scripts_str + after_script

    # 3. Inline any CSS url('textures/...') references as Base64 data URIs
    import base64
    def inline_css_url(match):
        rel_path = match.group(1)  # e.g., textures/diamond_pickaxe.png
        full_path = os.path.join(workspace_dir, rel_path)
        if os.path.exists(full_path):
            ext = os.path.splitext(rel_path)[1].lower().replace(".", "")
            if ext == "jpg":
                ext = "jpeg"
            try:
                with open(full_path, "rb") as img_f:
                    b64_data = base64.b64encode(img_f.read()).decode("utf-8")
                print(f"Inlining HTML/CSS texture: {rel_path}")
                return f"url('data:image/{ext};base64,{b64_data}')"
            except Exception as e:
                print(f"Warning: Failed to inline {rel_path}: {e}")
        return match.group(0)

    final_html = re.sub(
        r"url\(['\"](textures/[^'\"]+\.[a-zA-Z0-9]+)['\"]\)",
        inline_css_url,
        final_html
    )

    # Write to final_html
    print(f"Writing to {output_path}...")
    with open(output_path, "w", encoding="utf-8") as out_f:
        out_f.write(final_html)
        
    print("SUCCESS! Bundling completed successfully.")

if __name__ == "__main__":
    bundle()
