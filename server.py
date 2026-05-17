import http.server
import json
import os
import urllib.parse
import base64

class SaveHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/save':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)
            
            filename = data.get('filename', 'world.json')
            content = data.get('content')
            
            os.makedirs('saves', exist_ok=True)
            with open(os.path.join('saves', filename), 'w', encoding='utf-8') as f:
                json.dump(content, f, ensure_ascii=False, indent=4)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'success'}).encode())
        elif self.path == '/api/settings':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)
            
            os.makedirs('saves', exist_ok=True)
            
            player_skin = data.get('playerSkin', '')
            if player_skin and player_skin.startswith('data:image/png;base64,'):
                skin_data = base64.b64decode(player_skin.split(',')[1])
                skin_path = os.path.join('saves', 'skin.png')
                with open(skin_path, 'wb') as f:
                    f.write(skin_data)
                
            with open(os.path.join('saves', 'player_settings.json'), 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=4)
                
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'success'}).encode())
        else:
            self.send_error(404)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        if self.path.startswith('/api/load'):
            raw_filename = self.path.split('filename=')[-1] if 'filename=' in self.path else 'world.json'
            filename = urllib.parse.unquote(raw_filename)
            filepath = os.path.join('saves', filename)
            
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = json.load(f)
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'success', 'content': content}).encode())
            else:
                self.send_response(404)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'error', 'message': 'File not found'}).encode())
        elif self.path == '/api/settings':
            filepath = os.path.join('saves', 'player_settings.json')
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = json.load(f)
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'success', 'content': content}).encode())
            else:
                self.send_response(404)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'error', 'message': 'No settings'}).encode())
        elif self.path == '/api/list':
            os.makedirs('saves', exist_ok=True)
            files = [f for f in os.listdir('saves') if f.endswith('.json')]
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'success', 'files': files}).encode())
        elif self.path.startswith('/api/delete'):
            raw_filename = self.path.split('filename=')[-1] if 'filename=' in self.path else 'world.json'
            filename = urllib.parse.unquote(raw_filename)
            filepath = os.path.join('saves', filename)
            if os.path.exists(filepath):
                os.remove(filepath)
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'success'}).encode())
            else:
                self.send_response(404)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'error', 'message': 'File not found'}).encode())
        else:
            super().do_GET()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    print("Starting custom server on port 8000...")
    http.server.HTTPServer(('0.0.0.0', 8000), SaveHandler).serve_forever()
