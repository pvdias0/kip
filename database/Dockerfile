FROM postgres:17-alpine

COPY database/kip-backup-att.sql /docker-entrypoint-initdb.d/01-kip-backup.sql

EXPOSE 5432
