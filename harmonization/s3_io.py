# AI-assisted code: written with the help of Claude (Anthropic) at the request of a project contributor.
# Review and test it before relying on it.
"""Download the FIRMS inputs from, and upload harmonized outputs to, the project's S3 bucket (boto3).

Credentials come from the standard AWS chain: environment variables AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY,
~/.aws/credentials, or an IAM role. NEVER hard-code them in code or notebooks.
The bucket name is read from the environment variable S3_BUCKET.

    export S3_BUCKET=<bucket>
    python3 s3_io.py download data/                      # the two FIRMS archive CSVs used by build_harmonized_dataset.py
    python3 s3_io.py upload harmonized_hotspots.csv harmonized/harmonized_hotspots.csv
"""
import os, sys

DEFAULT_KEYS = ["DL_FIRE_M-C61_848902/fire_archive_M-C61_848902.csv",   # MODIS C6.1 Terra+Aqua
                "DL_FIRE_SV-C2_842407/fire_archive_SV-C2_842407.csv"]    # VIIRS Suomi-NPP

def client():
    import boto3
    bucket = os.environ.get("S3_BUCKET")
    if not bucket:
        sys.exit("Set S3_BUCKET (and AWS credentials in the environment or ~/.aws).")
    return boto3.client("s3"), bucket

def download(dest, keys=None):
    s3, bucket = client(); os.makedirs(dest, exist_ok=True)
    for k in keys or DEFAULT_KEYS:
        out = os.path.join(dest, os.path.basename(k)); print(f"s3://{bucket}/{k} -> {out}"); s3.download_file(bucket, k, out)

def upload(path, key):
    s3, bucket = client(); print(f"{path} -> s3://{bucket}/{key}"); s3.upload_file(path, bucket, key)

if __name__ == "__main__":
    a = sys.argv[1:]
    if len(a) >= 2 and a[0] == "download": download(a[1], a[2:] or None)
    elif len(a) == 3 and a[0] == "upload": upload(a[1], a[2])
    else: sys.exit(__doc__)
