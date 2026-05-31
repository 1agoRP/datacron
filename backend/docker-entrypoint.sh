#!/bin/sh
set -e

storage_path="${PDF_STORAGE_PATH:-./pdfs_storage}"
case "$storage_path" in
  /*) resolved_storage="$storage_path" ;;
  *) resolved_storage="/app/$storage_path" ;;
esac

mkdir -p "$resolved_storage"
chown -R datacron:datacron "$resolved_storage"
chmod -R u+rwX,g+rwX "$resolved_storage"

exec gosu datacron "$@"
