#!/usr/bin/env bash
set -euo pipefail

# Exact SemVer release/prerelease versions; ranges, tags, and build metadata
# are intentionally excluded from this release process.
version="${1:?missing version}"
number='(0|[1-9][0-9]*)'
identifier='(0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)'
pattern="^${number}\.${number}\.${number}(-${identifier}(\.${identifier})*)?$"
if [[ ! "$version" =~ $pattern ]]; then
  echo "error: '$version' is not an exact release or prerelease version" >&2
  exit 1
fi
