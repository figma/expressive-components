#!/usr/bin/env bash
set -euo pipefail

# Extract one release body, stopping at the next single-hash heading.
# Usage: bash scripts/changelog-section.sh CHANGELOG.md 0.1.0
file="${1:?missing changelog file}"
version="${2:?missing version}"
bash "$(dirname "$0")/validate-release-version.sh" "$version"

# Compare the version literally so prerelease dots cannot act as wildcards.
section="$(awk -v version="$version" '
  BEGIN { prefix = "# Expressive Components v" version }
  /^#[[:space:]]/ {
    if (found) exit
    if (index($0, prefix) == 1 &&
        (length($0) == length(prefix) ||
         substr($0, length(prefix) + 1, 1) ~ /[[:space:]]/)) found = 1
    next
  }
  found { print }
  END { if (!found) exit 1 }
' "$file")" || {
  echo "error: no CHANGELOG section found for version $version in $file" >&2
  exit 1
}

# Reject whitespace-only sections and sections containing only subsection headings.
if ! printf '%s\n' "$section" | awk '
  /[^[:space:]]/ && !/^#+[[:space:]]/ { content = 1 }
  END { if (!content) exit 1 }
'; then
  echo "error: CHANGELOG section for version $version is empty" >&2
  exit 1
fi

printf '%s\n' "$section" | awk '
  { lines[NR] = $0 }
  END {
    first = 1; last = NR
    while (first <= NR && lines[first] ~ /^[[:space:]]*$/) first++
    while (last >= first && lines[last] ~ /^[[:space:]]*$/) last--
    for (i = first; i <= last; i++) print lines[i]
  }
'
