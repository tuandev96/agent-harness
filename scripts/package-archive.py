#!/usr/bin/env python3
"""Create a deterministic private archive from a byte-verified inventory.

The archive is an artifact, not an approval, signature, or product acceptance.
"""
from pathlib import Path, PurePosixPath
import hashlib
import json
import os
import sys
import tempfile
import zipfile


def build(root: Path, manifest: dict, destination: Path) -> dict:
    root = root.resolve(strict=True)
    if destination.exists():
        raise ValueError('DESTINATION_EXISTS')
    entries = manifest.get('files')
    if not isinstance(entries, list) or not entries:
        raise ValueError('EMPTY_INVENTORY')
    names = set()
    fd, temporary = tempfile.mkstemp(prefix='.harness-package-', suffix='.zip', dir=destination.parent)
    os.close(fd)
    try:
        with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for entry in entries:
                name = entry['path']
                path = PurePosixPath(name)
                if path.is_absolute() or '..' in path.parts or chr(92) in name or str(path) != name or name in names:
                    raise ValueError('UNSAFE_OR_DUPLICATE_ARCHIVE_PATH')
                names.add(name)
                source = root.joinpath(*path.parts)
                for parent in [source, *source.parents]:
                    if parent == root:
                        break
                    if parent.is_symlink():
                        raise ValueError('SYMLINK_SOURCE')
                if not source.resolve(strict=True).is_relative_to(root) or not source.is_file():
                    raise ValueError('SOURCE_OUTSIDE_ROOT')
                data = source.read_bytes()
                if len(data) != entry['bytes'] or hashlib.sha256(data).hexdigest() != entry['sha256']:
                    raise ValueError('SOURCE_CHANGED_SINCE_INVENTORY')
                info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                archive.writestr(info, data)
            info = zipfile.ZipInfo('PACKAGE-MANIFEST.json', date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, (json.dumps(manifest, sort_keys=True, indent=2) + '\n').encode())
        with open(temporary, 'rb') as handle:
            os.fsync(handle.fileno())
        with zipfile.ZipFile(temporary) as archive:
            if archive.testzip() is not None:
                raise ValueError('ARCHIVE_CRC_MISMATCH')
        # Hard-link publication is exclusive: it never replaces an existing destination.
        os.link(temporary, destination)
        digest = hashlib.sha256(destination.read_bytes()).hexdigest()
        return {'outcome': 'PRIVATE_ARCHIVE_CREATED', 'path': str(destination), 'sha256': digest,
                'bytes': destination.stat().st_size, 'releaseReady': False}
    finally:
        Path(temporary).unlink(missing_ok=True)


if __name__ == '__main__':
    try:
        if len(sys.argv) != 4:
            raise ValueError('USAGE: package-archive.py root manifest destination')
        print(json.dumps(build(Path(sys.argv[1]), json.loads(Path(sys.argv[2]).read_text()), Path(sys.argv[3]))))
    except (ValueError, OSError, KeyError, TypeError, zipfile.BadZipFile) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
