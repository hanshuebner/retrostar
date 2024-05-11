#!/bin/bash
# Runs migrations on PostgreSQL

# Wow wow! are you editing this file? <3
# Contribute your edit to help the community and for a world fame!
# https://github.com/Schniz/migrate.sh/edit/master/migrate.sh

set -e
cd "$(dirname "$0")"

function check_env() {
    if [ -z "$PGDATABASE" ]
    then
        echo "$0: PGDATABASE environment variable not set"
        exit 1
    fi
}

function make_new_migration() {
  FILE_DESC=$(echo $@ | sed -E "s/[[:space:]]+/_/g" | awk '{print tolower($0)}')
  FILE_PATH=migrations/$(get_timestamp)_${FILE_DESC}.sql
  mkdir -p migrations
  touch $FILE_PATH
  echo "  --> touched $FILE_PATH"
}

function pending_migrations() {
  UP_MIGRATIONS=$(bash -c 'psql -t -c "select filename from public.migrations" | sed "s@[[:space:]]@@g" | grep . | cat' 2> /dev/null)
  ALL_MIGRATIONS=$(bash -c 'cd migrations && ls *.sql')
  STRINGIFIED_MIGRATIONS=" ${ALL_MIGRATIONS[*]} "
  for item in ${UP_MIGRATIONS[@]}; do
    STRINGIFIED_MIGRATIONS=${STRINGIFIED_MIGRATIONS/${item}/ }
  done
  MIGRATIONS_TO_RUN=( $STRINGIFIED_MIGRATIONS )
  for item in ${MIGRATIONS_TO_RUN[@]}; do
    echo $item
  done
}

function run_migrations() {
  PENDING_MIGRATIONS=$(pending_migrations)
  if [ "$PENDING_MIGRATIONS" == "" ]; then
    echo "  --> Nothing to migrate!"
  else
    echo "PENDING MIGRATIONS:"
    echo ${PENDING_MIGRATIONS[*]}
    echo "==================="
    for PENDING_MIGRATION in $PENDING_MIGRATIONS
     do
      echo "  --> Running $PENDING_MIGRATION"
         (
           cat migrations/$PENDING_MIGRATION
           echo "insert into public.migrations (filename) values ('$(basename $PENDING_MIGRATION)');"
         ) | psql -1
      psql -1 <<< $CONTENTS_WITH_MIGRATION_RESULT
    done
  fi
}

function dump_schema() {
  mkdir -p db

  export PGDATABASE=temp_migrate_$$
  createdb $PGDATABASE
  reset_db
  run_migrations
  pg_dump -xO --inserts | grep -v -e "---\?\( .\+\)\$" | grep -v -e "^--\$" | grep -v -e "^\$" > schema.sql
  dropdb $PGDATABASE

  echo "  --> Wrote schema.sql"
}

function reset_db() {
    set -e
    psql <<< "
    drop schema public cascade;
    create schema public;
    create table public.migrations (filename varchar primary key);
    "
}

function show_help() {
  echo "Usage:"
  echo "------"
  echo ""
  echo "$0 new add_something_table - create a new migration file"
  echo "$0 schema:dump             - dump db schema"
  echo "$0 schema:load             - load db schema"
  echo "$0 up                      - run migrations"
  echo "$0 danger:reset            - resets the database state"
  echo "$0 help                    - show this message"
}

function get_timestamp() {
  date +%Y%m%d%H%M%S
}

function main_migrate() {
  ACTION=${1-:"help"}
  shift
  case $ACTION in
    new)
      make_new_migration $@
      ;;
    schema:dump)
      dump_schema $@
      ;;
    schema:load)
      check_env
      psql -f schema.sql
      ;;
    danger:reset)
      check_env
      reset_db
      ;;
    up)
      check_env
      run_migrations $@
      ;;
    *)
      show_help
      exit 1
  esac
}

main_migrate $@
