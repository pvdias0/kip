FROM postgres:17-alpine

COPY kip-backup-att.sql /docker-entrypoint-initdb.d/01-kip-backup.sql

EXPOSE 5432
