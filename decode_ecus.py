import base64
import zlib
import gzip

# Read the XML file
with open('d:/vnss_tms/ECUS5VNACCS2018_ToKhai__STT20694.xml', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract Body content
import re
match = re.search(r'<Body>(.*?)</Body>', content, re.DOTALL)
if match:
    body = match.group(1).strip()
    print(f"Body length: {len(body)}")
    print(f"Body first 100 chars: {body[:100]}")

    # Try Base64 decode
    try:
        decoded = base64.b64decode(body)
        print(f"\nDecoded length: {len(decoded)}")
        print(f"Decoded first 50 bytes (hex): {decoded[:50].hex()}")

        # Try to decompress with zlib
        try:
            decompressed = zlib.decompress(decoded)
            print(f"\nZlib decompressed: {decompressed[:500]}")
        except Exception as e:
            print(f"\nZlib decompress failed: {e}")

        # Try gzip
        try:
            import io
            with gzip.GzipFile(fileobj=io.BytesIO(decoded)) as gz:
                decompressed = gz.read()
                print(f"\nGzip decompressed: {decompressed[:500]}")
        except Exception as e:
            print(f"\nGzip decompress failed: {e}")

        # Try to decode as text with various encodings
        for enc in ['utf-8', 'utf-16', 'latin-1', 'ascii', 'cp1252']:
            try:
                text = decoded.decode(enc)
                print(f"\n{enc} decoded (first 200 chars): {text[:200]}")
                break
            except Exception as e:
                pass

    except Exception as e:
        print(f"Base64 decode failed: {e}")
else:
    print("No Body found")
