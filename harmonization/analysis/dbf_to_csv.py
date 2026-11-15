# AI-assisted code: written with the help of Claude (Anthropic) at the request of a project contributor.
# Review and test it before relying on it.
"""Convert a dBase (.dbf) table, such as the attribute table of a FIRMS shapefile, to CSV. Standard library only.
Usage: python3 dbf_to_csv.py <in.dbf> <out.csv>   (column names are lower-cased; deleted records are skipped)
"""
import sys, struct, csv

def convert(src, dst):
    with open(src, 'rb') as f:
        h = f.read(32)
        nrec, hlen, rlen = struct.unpack('<IHH', h[4:12])
        fields = []
        while True:
            d = f.read(32)
            if d[0] == 0x0D:
                break
            fields.append((d[:11].split(b'\0')[0].decode().lower(), d[11:12].decode(), d[16]))
        f.seek(hlen)
        n = 0
        with open(dst, 'w', newline='', encoding='utf-8') as out:
            w = csv.writer(out)
            w.writerow([x[0] for x in fields])
            for _ in range(nrec):
                rec = f.read(rlen)
                if len(rec) < rlen or rec[0] == 0x2A:  # truncated / deleted
                    continue
                pos, row = 1, []
                for name, typ, ln in fields:
                    row.append(rec[pos:pos+ln].decode('utf-8', 'replace').strip())
                    pos += ln
                w.writerow(row); n += 1
    print(dst, n, 'of', nrec, 'records;', [x[0] for x in fields])

if __name__ == '__main__':
    convert(sys.argv[1], sys.argv[2])
