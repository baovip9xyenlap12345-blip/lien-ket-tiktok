#!/bin/sh
# Sao luu HANG NGAY: database (pg_dump -Fc) + thu muc uploads (tar).
# Ma hoa: dat BACKUP_GPG_PASSPHRASE de ma hoa file bang gpg (khuyen dung khi day len cloud).
# Retention: xoa ban cu hon BACKUP_RETENTION_DAYS (mac dinh 14 ngay).
set -e
STAMP=$(date +%Y%m%d-%H%M%S)
DIR=${BACKUP_DIR:-/backups}
HOST=${PGHOST:-db}
USER=${PGUSER:-erp}
DB=${PGDATABASE:-erp}
RETENTION=${BACKUP_RETENTION_DAYS:-14}
mkdir -p "$DIR"

echo "[backup] pg_dump $DB → $DIR/db-$STAMP.dump"
pg_dump -h "$HOST" -U "$USER" -Fc "$DB" > "$DIR/db-$STAMP.dump"

if [ -d "${UPLOADS_DIR:-/uploads}" ]; then
  echo "[backup] uploads → $DIR/uploads-$STAMP.tar.gz"
  tar -czf "$DIR/uploads-$STAMP.tar.gz" -C "${UPLOADS_DIR:-/uploads}" .
fi

if [ -n "$BACKUP_GPG_PASSPHRASE" ]; then
  echo "[backup] ma hoa gpg…"
  for f in "$DIR/db-$STAMP.dump" "$DIR/uploads-$STAMP.tar.gz"; do
    [ -f "$f" ] || continue
    gpg --batch --yes --passphrase "$BACKUP_GPG_PASSPHRASE" -c "$f" && rm "$f"
  done
fi

echo "[backup] don ban cu > $RETENTION ngay"
find "$DIR" -type f -mtime +"$RETENTION" -delete
echo "[backup] xong: $(ls -lh "$DIR" | tail -3)"
