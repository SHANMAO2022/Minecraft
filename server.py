import http.server
import json
import os
import urllib.parse
import base64
import mimetypes

# Fix Windows Registry missing MIME type mapping for .ogg files
mimetypes.add_type('audio/ogg', '.ogg')

class SaveHandler(http.server.SimpleHTTPRequestHandler):
    def send_json(self, status_code, payload):
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode())

    def read_json_body(self):
        content_length = int(self.headers.get('Content-Length', '0'))
        if content_length <= 0:
            raise ValueError('Missing request body')
        return json.loads(self.rfile.read(content_length))

    def save_path(self, filename):
        filename = os.path.basename(filename or 'world.json')
        if not filename.endswith('.json'):
            filename += '.json'
        saves_dir = os.path.abspath('saves')
        filepath = os.path.abspath(os.path.join(saves_dir, filename))
        if os.path.commonpath([saves_dir, filepath]) != saves_dir:
            raise ValueError('Invalid filename')
        return filepath

    def do_POST(self):
        if self.path == '/api/save':
            try:
                data = self.read_json_body()
                filename = data.get('filename', 'world.json')
                content = data.get('content')
                os.makedirs('saves', exist_ok=True)
                with open(self.save_path(filename), 'w', encoding='utf-8') as f:
                    json.dump(content, f, ensure_ascii=False, indent=4)
                self.send_json(200, {'status': 'success'})
            except Exception as e:
                self.send_json(400, {'status': 'error', 'message': str(e)})
        elif self.path == '/api/settings':
            try:
                data = self.read_json_body()
                os.makedirs('saves', exist_ok=True)
                player_skin = data.get('playerSkin', '')
                if player_skin and player_skin.startswith('data:image/png;base64,'):
                    skin_data = base64.b64decode(player_skin.split(',')[1])
                    skin_path = os.path.join('saves', 'skin.png')
                    with open(skin_path, 'wb') as f:
                        f.write(skin_data)
                with open(os.path.join('saves', 'player_settings.json'), 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=4)
                self.send_json(200, {'status': 'success'})
            except Exception as e:
                self.send_json(400, {'status': 'error', 'message': str(e)})
        else:
            self.send_error(404)

    def serve_range(self, filepath):
        import re
        try:
            file_size = os.path.getsize(filepath)
            range_header = self.headers.get('Range')
            
            range_match = re.match(r'bytes=(\d+)-(\d*)', range_header)
            if not range_match:
                super().do_GET()
                return
                
            start = int(range_match.group(1))
            end = range_match.group(2)
            end = int(end) if end else file_size - 1
            
            if start >= file_size:
                self.send_response(416)
                self.send_header('Content-Range', f'bytes */{file_size}')
                self.end_headers()
                return
                
            length = end - start + 1
            
            self.send_response(206)
            self.send_header('Content-Type', self.guess_type(filepath))
            self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
            self.send_header('Content-Length', str(length))
            self.send_header('Accept-Ranges', 'bytes')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            with open(filepath, 'rb') as f:
                f.seek(start)
                self.wfile.write(f.read(length))
        except Exception as e:
            try:
                self.send_error(500, str(e))
            except:
                pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        # Support Range requests (HTTP 206) for static files to fix audio delays in Chrome/Edge
        filepath = self.translate_path(self.path)
        if os.path.isfile(filepath) and 'Range' in self.headers:
            self.serve_range(filepath)
            return

        if self.path.startswith('/api/load'):
            raw_filename = self.path.split('filename=')[-1] if 'filename=' in self.path else 'world.json'
            filename = urllib.parse.unquote(raw_filename)
            try:
                filepath = self.save_path(filename)
            except ValueError as e:
                self.send_json(400, {'status': 'error', 'message': str(e)})
                return
            
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = json.load(f)
                self.send_json(200, {'status': 'success', 'content': content})
            else:
                self.send_json(404, {'status': 'error', 'message': 'File not found'})
        elif self.path == '/api/settings':
            filepath = os.path.join('saves', 'player_settings.json')
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = json.load(f)
                self.send_json(200, {'status': 'success', 'content': content})
            else:
                self.send_json(404, {'status': 'error', 'message': 'No settings'})
        elif self.path == '/api/list':
            os.makedirs('saves', exist_ok=True)
            files = [f for f in os.listdir('saves') if f.endswith('.json')]
            self.send_json(200, {'status': 'success', 'files': files})
        elif self.path.startswith('/api/delete'):
            raw_filename = self.path.split('filename=')[-1] if 'filename=' in self.path else 'world.json'
            filename = urllib.parse.unquote(raw_filename)
            try:
                filepath = self.save_path(filename)
            except ValueError as e:
                self.send_json(400, {'status': 'error', 'message': str(e)})
                return
            if os.path.exists(filepath):
                os.remove(filepath)
                self.send_json(200, {'status': 'success'})
            else:
                self.send_json(404, {'status': 'error', 'message': 'File not found'})
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
