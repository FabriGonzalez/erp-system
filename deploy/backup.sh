#!/usr/bin/env sh
# Backup de la base de producción en deploy/backups/, conservando los últimos 14 días.
# Se programa con cron en la VM (ver docs/deploy.md). Copiá los backups fuera de la VM: si la
# VM se pierde, los backups que quedaron adentro se pierden con ella.
set -eu

cd "$(dirname "$0")"
mkdir -p backups

file="backups/erp-$(date +%Y-%m-%d_%H%M).dump"
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U erp -d erp_db -Fc > "$file"
echo "Backup: $file ($(du -h "$file" | cut -f1))"

find backups -name 'erp-*.dump' -mtime +14 -delete
