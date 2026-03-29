#!/usr/bin/env python3
"""
Download tsmc_vol_signal.json from Google Drive.

環境變數:
  GDRIVE_SERVICE_ACCOUNT_JSON  — Service Account 金鑰 JSON
  GDRIVE_TSMC_FOLDER_ID        — dashboard_output 資料夾 ID

用法:
  python download_tsmc_signal.py
"""

import os
import sys
import json
from pathlib import Path


def get_drive_service():
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    cred_json = os.environ.get("GDRIVE_SERVICE_ACCOUNT_JSON", "")
    if not cred_json:
        print("GDRIVE_SERVICE_ACCOUNT_JSON not set, skipping")
        return None

    cred_info = json.loads(cred_json)
    credentials = service_account.Credentials.from_service_account_info(
        cred_info, scopes=["https://www.googleapis.com/auth/drive.readonly"]
    )
    return build("drive", "v3", credentials=credentials)


def download_file(service, folder_id: str, filename: str, output_path: Path) -> bool:
    query = (
        f"'{folder_id}' in parents "
        f"and name = '{filename}' "
        f"and trashed = false"
    )
    results = service.files().list(
        q=query, fields="files(id, name, modifiedTime)", orderBy="modifiedTime desc"
    ).execute()
    files = results.get("files", [])

    if not files:
        print(f"File '{filename}' not found in folder {folder_id}")
        return False

    file_id = files[0]["id"]
    modified = files[0].get("modifiedTime", "")
    print(f"Found {filename} (modified: {modified})")

    content = service.files().get_media(fileId=file_id).execute()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(content)
    print(f"Downloaded to {output_path} ({len(content)} bytes)")
    return True


def main():
    folder_id = os.environ.get("GDRIVE_TSMC_FOLDER_ID", "")
    if not folder_id:
        print("GDRIVE_TSMC_FOLDER_ID not set, skipping TSMC signal download")
        return

    service = get_drive_service()
    if not service:
        return

    output = Path(__file__).parent.parent / "data" / "tsmc_vol_signal.json"
    ok = download_file(service, folder_id, "tsmc_vol_signal.json", output)

    if ok:
        data = json.loads(output.read_text(encoding="utf-8"))
        print(f"Data date: {data.get('資料日期', 'unknown')}")


if __name__ == "__main__":
    main()
