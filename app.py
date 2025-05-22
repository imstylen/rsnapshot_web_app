import os
from flask import Flask, render_template, request, jsonify, send_from_directory, abort
from pathlib import Path

# Allow override for local debugging via environment variable
BACKUP_ROOT = os.environ.get('BACKUP_ROOT', 'test_backup')

# Ensure Flask knows where to find templates and static files
base_dir = Path(__file__).parent.resolve()
app = Flask(
    __name__,
    template_folder=str(base_dir / 'templates'),
    static_folder=str(base_dir / 'static')
)


def get_snapshots():
    """
    Return a sorted list of snapshot directories under BACKUP_ROOT
    """
    base = Path(BACKUP_ROOT)
    if not base.exists() or not base.is_dir():
        return []
    return sorted([
        p.name for p in base.iterdir() if p.is_dir()
    ])


def get_directory_contents(snapshot, rel_path):
    """
    List contents (files & directories) for a given snapshot and relative path
    """
    snapshot_path = Path(BACKUP_ROOT) / snapshot
    abs_path = (snapshot_path / rel_path).resolve()

    # Prevent path traversal
    if not str(abs_path).startswith(str(snapshot_path.resolve())):
        abort(400, "Invalid path")

    if not abs_path.exists() or not abs_path.is_dir():
        abort(404, "Directory not found")

    entries = []
    for entry in abs_path.iterdir():
        stat = entry.stat()
        entries.append({
            'name': entry.name,
            'is_dir': entry.is_dir(),
            'size': stat.st_size,
            'mtime': stat.st_mtime,
        })

    # Sort: directories first, then files, both by name
    entries.sort(key=lambda e: (not e['is_dir'], e['name'].lower()))
    return entries


@app.route('/')
def index():
    snapshots = get_snapshots()
    return render_template('index.html', snapshots=snapshots)


@app.route('/list')
def list_dir():
    snapshot = request.args.get('snapshot', '')
    path = request.args.get('path', '')

    if snapshot not in get_snapshots():
        abort(404, "Snapshot not found")

    contents = get_directory_contents(snapshot, path)
    return jsonify(contents)


@app.route('/download')
def download_file():
    snapshot = request.args.get('snapshot', '')
    path = request.args.get('path', '')

    if not snapshot or not path:
        abort(400, "Missing parameters")

    snapshot_path = Path(BACKUP_ROOT) / snapshot
    abs_path = (snapshot_path / path).resolve()

    # Validate path and file
    if not str(abs_path).startswith(str(snapshot_path.resolve())) or not abs_path.is_file():
        abort(404, "File not found")

    # Use positional args to match Flask's send_from_directory signature
    return send_from_directory(
        str(abs_path.parent),
        abs_path.name,
        as_attachment=True
    )


if __name__ == '__main__':
    # For local Windows debugging, create 'test_backup' with subfolders/files
    os.makedirs(BACKUP_ROOT, exist_ok=True)
    app.run(host='0.0.0.0', port=5000, debug=True)