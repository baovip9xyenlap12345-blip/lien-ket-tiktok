#!/bin/sh
# Khoi phuc tu ban sao luu: sh scripts/restore.sh /backups/db-YYYYmmdd-HHMMSS.dump [ten_db_dich]
# CANH BAO: ghi de toan bo du lieu cua database dich. Thu tren staging truoc (xem DISASTER_RECOVERY_TEST.md).
set -e
FILE=$1
DB=${2:-erp}
HOST=${PGHOST:-db}
USER=${PGUSER:-erp}
[ -f "$FILE" ] || { echo "Khong thay file: $FILE"; exit 1; }

case "$FILE" in
  *.gpg)
    [ -n "$BACKUP_GPG_PASSPHRASE" ] || { echo "Can BACKUP_GPG_PASSPHRASE de giai ma"; exit 1; }
    PLAIN=${FILE%.gpg}
    gpg --batch --yes --passphrase "$BACKUP_GPG_PASSPHRASE" -o "$PLAIN" -d "$FILE"
    FILE=$PLAIN ;;
esac

echo "[restore] tao lai database $DB va nap $FILE"
dropdb  -h "$HOST" -U "$USER" --if-exists "$DB"
createdb -h "$HOST" -U "$USER" "$DB"
pg_restore -h "$HOST" -U "$USER" -d "$DB" --no-owner "$FILE"
echo "[restore] XONG. Kiem tra: psql -h $HOST -U $USER $DB -c 'select count(*) from \"SalesOrder\";'"
