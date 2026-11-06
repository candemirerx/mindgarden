"""AAB protobuf manifest sürümü ve ELF64 16 KB hizalaması; yalnız okur."""
import json
import re
import struct
import sys
import zipfile
from pathlib import Path


def fields(data):
    offset = 0

    def varint():
        nonlocal offset
        value, shift = 0, 0
        while True:
            byte = data[offset]
            offset += 1
            value |= (byte & 127) << shift
            if byte < 128:
                return value
            shift += 7
            if shift > 70:
                raise ValueError('Geçersiz protobuf')

    result = {}
    while offset < len(data):
        key = varint()
        wire, number = key & 7, key >> 3
        if wire == 0:
            value = varint()
        elif wire == 2:
            size = varint()
            value = data[offset:offset + size]
            offset += size
        elif wire in (1, 5):
            size = 8 if wire == 1 else 4
            value = data[offset:offset + size]
            offset += size
        else:
            raise ValueError('Desteklenmeyen protobuf alanı')
        result.setdefault(number, []).append(value)
    return result


root = Path(__file__).resolve().parent.parent
version = re.search(r"APP_VERSION\s*=\s*'([^']+)'", (root / 'lib/config.ts').read_text(encoding='utf-8'))[1]
code = int(re.search(r'\bversionCode\s+(\d+)', (root / 'android/app/build.gradle').read_text(encoding='utf-8'))[1])
bundle = Path(sys.argv[1]) if len(sys.argv) > 1 else root / f'play-store-paketi/uygulama/not-bahcesi-{version}.aab'
with zipfile.ZipFile(bundle) as archive:
    element = fields(fields(archive.read('base/manifest/AndroidManifest.xml'))[1][0])
    attrs = {}
    for raw in element.get(4, []):
        attr = fields(raw)
        name = attr[2][0].decode('utf-8')
        if 3 in attr:
            attrs[name] = attr[3][0].decode('utf-8')
    assert attrs.get('package') == 'com.notbahcesi.app', 'Yanlış paket'
    assert attrs.get('versionName') == version, f'Manifest sürümü yanlış: {attrs.get("versionName")}'
    assert attrs.get('versionCode') == str(code), f'Manifest kodu yanlış: {attrs.get("versionCode")}, beklenen {code}'
    native_count = 0
    for name in archive.namelist():
        if not name.startswith('base/lib/') or not name.endswith('.so'):
            continue
        data = archive.read(name)
        if data[:5] != b'\x7fELF\x02':
            continue
        assert data[5] == 1, 'Beklenmeyen ELF byte sırası'
        phoff = struct.unpack_from('<Q', data, 32)[0]
        phsize, phnum = struct.unpack_from('<HH', data, 54)
        for i in range(phnum):
            offset = phoff + i * phsize
            if struct.unpack_from('<I', data, offset)[0] == 1:
                alignment = struct.unpack_from('<Q', data, offset + 48)[0]
                assert alignment >= 16384, f'16 KB hizalaması eksik: {name}'
        native_count += 1
    assert native_count > 0, 'Beklenen native kitaplıklar bulunamadı'
    print(json.dumps({'package': attrs['package'], 'version': version, 'versionCode': code, 'elf64_16kb': native_count}))
