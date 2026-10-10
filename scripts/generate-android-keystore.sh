#!/bin/bash
# Run only after owner authorization and signing-lineage review (#132/#249).
# Passwords stay out of keytool arguments and output. Never run with tracing.
set +x
set -euo pipefail
umask 077

fail() { printf '%s\n' "$1" >&2; exit 1; }

if [[ ${1:-} == --help ]]; then
  printf '%s\n' 'Usage: generate-android-keystore.sh /absolute/private/path/upload.jks' \
    'Creates a new Faithful Days upload key only; never replaces an existing file.' \
    'Requires owner approval. Supply KEYSTORE_PASSWORD and optional KEY_PASSWORD' \
    'through protected environment injection, or use the hidden terminal prompts.'
  exit 0
fi
[[ $# == 1 && $1 == /* ]] || fail 'Specify one absolute destination outside the repository.'
destination_name=$(basename -- "$1")
[[ $destination_name != . && $destination_name != .. && $destination_name != / ]] || fail 'Invalid destination filename.'
destination_dir=$(cd -- "$(dirname -- "$1")" 2>/dev/null && pwd -P) || fail 'Destination parent must already exist.'
repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
case "$destination_dir/" in
  "$repo_dir/"*) fail 'Destination must be outside the repository.' ;;
esac
destination="$destination_dir/$destination_name"
[[ ! -e $destination && ! -L $destination ]] || fail 'Destination already exists; it will not be replaced.'
command -v keytool >/dev/null 2>&1 || fail 'JDK keytool is required.'
command -v python3 >/dev/null 2>&1 || fail 'Python 3 is required for atomic destination creation.'

KEYSTORE_PASSWORD=${KEYSTORE_PASSWORD:-}
KEY_PASSWORD=${KEY_PASSWORD:-}
if [[ -z $KEYSTORE_PASSWORD ]]; then
  [[ -t 0 ]] || fail 'No password supplied; use a terminal prompt or protected environment injection.'
  read -r -s -p 'Keystore password: ' KEYSTORE_PASSWORD
  printf '\n' >&2
  read -r -s -p 'Key password (Enter = same as keystore): ' KEY_PASSWORD
  printf '\n' >&2
fi
KEY_PASSWORD=${KEY_PASSWORD:-$KEYSTORE_PASSWORD}
[[ ${#KEYSTORE_PASSWORD} -ge 6 && ${#KEY_PASSWORD} -ge 6 ]] || fail 'Both passwords must contain at least six characters.'
export KEYSTORE_PASSWORD KEY_PASSWORD

# Generate privately on the same filesystem, then publish with a hard link.
# os.link fails even if a directory/symlink appears at the destination meanwhile.
stage_dir=$(mktemp -d "$destination_dir/.faithful-days-key.XXXXXXXX") || fail 'Cannot create private staging directory.'
cleanup() { rm -rf -- "$stage_dir"; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
if ! keytool -genkeypair -storetype JKS \
  -keystore "$stage_dir/upload.jks" -alias habittracker \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -storepass:env KEYSTORE_PASSWORD -keypass:env KEY_PASSWORD \
  -dname 'CN=Faithful Days, OU=Ashbi, O=Ashbi, L=Toronto, ST=ON, C=CA' \
  >"$stage_dir/keytool.log" 2>&1; then
  fail 'Key generation failed; destination untouched. Check approved JDK configuration privately.'
fi
[[ -s $stage_dir/upload.jks && ! -L $stage_dir/upload.jks ]] || fail 'Keytool did not produce a regular nonempty keystore.'
[[ -f $stage_dir/upload.jks ]] || fail 'Keytool output is not a regular file.'
chmod 600 "$stage_dir/upload.jks"
unset KEYSTORE_PASSWORD KEY_PASSWORD
python3 - "$stage_dir/upload.jks" "$destination" 2>/dev/null <<'PY' || fail 'Cannot create destination; existing files are never replaced.'
import os
import sys
os.link(sys.argv[1], sys.argv[2])
PY
printf '%s\n' 'Upload keystore created with owner-only permissions.' \
  'Preserve it and its passwords in approved private recovery storage.' \
  'No Play enrollment, reset, signing or upload was performed.'
